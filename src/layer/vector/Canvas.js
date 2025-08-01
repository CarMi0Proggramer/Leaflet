import {Renderer} from './Renderer.js';
import * as DomEvent from '../../dom/DomEvent.js';
import * as Util from '../../core/Util.js';
import {Bounds} from '../../geometry/Bounds.js';

/*
 * @class Canvas
 * @inherits Renderer
 *
 * Allows vector layers to be displayed with [`<canvas>`](https://developer.mozilla.org/docs/Web/API/Canvas_API).
 * Inherits `Renderer`.
 *
 * @example
 *
 * Use Canvas by default for all paths in the map:
 *
 * ```js
 * const map = new Map('map', {
 * 	renderer: new Canvas()
 * });
 * ```
 *
 * Use a Canvas renderer with extra padding for specific vector geometries:
 *
 * ```js
 * const map = new Map('map');
 * const myRenderer = new Canvas({ padding: 0.5 });
 * const line = new Polyline( coordinates, { renderer: myRenderer } );
 * const circle =  new Circle( center, { renderer: myRenderer, radius: 100 } );
 * ```
 */

// @constructor Canvas(options?: Renderer options)
// Creates a Canvas renderer with the given options.
export class Canvas extends Renderer {

	static {
		// @section
		// @aka Canvas options
		this.setDefaultOptions({
			// @option tolerance: Number = 0
			// How much to extend the click tolerance around a path/object on the map.
			tolerance: 0
		});
	}

	getEvents() {
		const events = Renderer.prototype.getEvents.call(this);
		events.viewprereset = this._onViewPreReset;
		return events;
	}

	_onViewPreReset() {
		// Set a flag so that a viewprereset+moveend+viewreset only updates&redraws once
		this._postponeUpdatePaths = true;
	}

	onAdd(map) {
		Renderer.prototype.onAdd.call(this, map);

		// Redraw vectors since canvas is cleared upon removal,
		// in case of removing the renderer itself from the map.
		this._draw();
	}

	onRemove() {
		Renderer.prototype.onRemove.call(this);

		clearTimeout(this._pointerHoverThrottleTimeout);
	}

	_initContainer() {
		const container = this._container = document.createElement('canvas');

		DomEvent.on(container, 'pointermove', this._onPointerMove, this);
		DomEvent.on(container, 'click dblclick pointerdown pointerup contextmenu', this._onClick, this);
		DomEvent.on(container, 'pointerout', this._handlePointerOut, this);
		container['_leaflet_disable_events'] = true;

		this._ctx = container.getContext('2d');
	}

	_destroyContainer() {
		cancelAnimationFrame(this._redrawRequest);
		this._redrawRequest = null;
		delete this._ctx;
		Renderer.prototype._destroyContainer.call(this);
	}

	_resizeContainer() {
		const size = Renderer.prototype._resizeContainer.call(this);
		const m = this._ctxScale = window.devicePixelRatio;

		// set canvas size (also clearing it); use double size on retina
		this._container.width = m * size.x;
		this._container.height = m * size.y;
	}

	_updatePaths() {
		if (this._postponeUpdatePaths) { return; }

		this._redrawBounds = null;
		for (const layer of Object.values(this._layers)) {
			layer._update();
		}
		this._redraw();
	}

	_update() {
		if (this._map._animatingZoom && this._bounds) { return; }

		const b = this._bounds,
		s = this._ctxScale;

		// translate so we use the same path coordinates after canvas element moves
		this._ctx.setTransform(
			s, 0, 0, s,
			-b.min.x * s,
			-b.min.y * s);

		// Tell paths to redraw themselves
		this.fire('update');
	}

	_reset() {
		Renderer.prototype._reset.call(this);

		if (this._postponeUpdatePaths) {
			this._postponeUpdatePaths = false;
			this._updatePaths();
		}
	}

	_initPath(layer) {
		this._updateDashArray(layer);
		this._layers[Util.stamp(layer)] = layer;

		const order = layer._order = {
			layer,
			prev: this._drawLast,
			next: null
		};
		if (this._drawLast) { this._drawLast.next = order; }
		this._drawLast = order;
		this._drawFirst ??= this._drawLast;
	}

	_addPath(layer) {
		this._requestRedraw(layer);
	}

	_removePath(layer) {
		const order = layer._order;
		const next = order.next;
		const prev = order.prev;

		if (next) {
			next.prev = prev;
		} else {
			this._drawLast = prev;
		}
		if (prev) {
			prev.next = next;
		} else {
			this._drawFirst = next;
		}

		delete layer._order;

		delete this._layers[Util.stamp(layer)];

		this._requestRedraw(layer);
	}

	_updatePath(layer) {
		// Redraw the union of the layer's old pixel
		// bounds and the new pixel bounds.
		this._extendRedrawBounds(layer);
		layer._project();
		layer._update();
		// The redraw will extend the redraw bounds
		// with the new pixel bounds.
		this._requestRedraw(layer);
	}

	_updateStyle(layer) {
		this._updateDashArray(layer);
		this._requestRedraw(layer);
	}

	_updateDashArray(layer) {
		if (typeof layer.options.dashArray === 'string') {
			const parts = layer.options.dashArray.split(/[, ]+/);
			// Ignore dash array containing invalid lengths
			layer.options._dashArray = parts.map(n => Number(n)).filter(n => !isNaN(n));
		} else {
			layer.options._dashArray = layer.options.dashArray;
		}
	}

	_requestRedraw(layer) {
		if (!this._map) { return; }

		this._extendRedrawBounds(layer);
		this._redrawRequest ??= requestAnimationFrame(this._redraw.bind(this));
	}

	_extendRedrawBounds(layer) {
		if (layer._pxBounds) {
			const padding = (layer.options.weight ?? 0) + 1;
			this._redrawBounds ??= new Bounds();
			this._redrawBounds.extend(layer._pxBounds.min.subtract([padding, padding]));
			this._redrawBounds.extend(layer._pxBounds.max.add([padding, padding]));
		}
	}

	_redraw() {
		this._redrawRequest = null;

		if (this._redrawBounds) {
			this._redrawBounds.min._floor();
			this._redrawBounds.max._ceil();
		}

		this._clear(); // clear layers in redraw bounds
		this._draw(); // draw layers

		this._redrawBounds = null;
	}

	_clear() {
		const bounds = this._redrawBounds;
		if (bounds) {
			const size = bounds.getSize();
			this._ctx.clearRect(bounds.min.x, bounds.min.y, size.x, size.y);
		} else {
			this._ctx.save();
			this._ctx.setTransform(1, 0, 0, 1, 0, 0);
			this._ctx.clearRect(0, 0, this._container.width, this._container.height);
			this._ctx.restore();
		}
	}

	_draw() {
		let layer;
		const bounds = this._redrawBounds;
		this._ctx.save();
		if (bounds) {
			const size = bounds.getSize();
			this._ctx.beginPath();
			this._ctx.rect(bounds.min.x, bounds.min.y, size.x, size.y);
			this._ctx.clip();
		}

		this._drawing = true;

		for (let order = this._drawFirst; order; order = order.next) {
			layer = order.layer;
			if (!bounds || (layer._pxBounds && layer._pxBounds.intersects(bounds))) {
				layer._updatePath();
			}
		}

		this._drawing = false;

		this._ctx.restore();  // Restore state before clipping.
	}

	_updatePoly(layer, closed) {
		if (!this._drawing) { return; }

		const parts = layer._parts,
		ctx = this._ctx;

		if (!parts.length) { return; }

		ctx.beginPath();

		parts.forEach((p0) => {
			 p0.forEach((p, j) => {
				ctx[j ? 'lineTo' : 'moveTo'](p.x, p.y);
			});
			if (closed) {
				ctx.closePath();
			}
		});

		this._fillStroke(ctx, layer);

		// TODO optimization: 1 fill/stroke for all features with equal style instead of 1 for each feature
	}

	_updateCircle(layer) {

		if (!this._drawing || layer._empty()) { return; }

		const p = layer._point,
		ctx = this._ctx,
		r = Math.max(Math.round(layer._radius), 1),
		s = (Math.max(Math.round(layer._radiusY), 1) || r) / r;

		if (s !== 1) {
			ctx.save();
			ctx.scale(1, s);
		}

		ctx.beginPath();
		ctx.arc(p.x, p.y / s, r, 0, Math.PI * 2, false);

		if (s !== 1) {
			ctx.restore();
		}

		this._fillStroke(ctx, layer);
	}

	_fillStroke(ctx, layer) {
		const options = layer.options;

		if (options.fill) {
			ctx.globalAlpha = options.fillOpacity;
			ctx.fillStyle = options.fillColor ?? options.color;
			ctx.fill(options.fillRule || 'evenodd');
		}

		if (options.stroke && options.weight !== 0) {
			if (ctx.setLineDash) {
				ctx.lineDashOffset = Number(options.dashOffset ?? 0);
				ctx.setLineDash(options._dashArray ?? []);
			}
			ctx.globalAlpha = options.opacity;
			ctx.lineWidth = options.weight;
			ctx.strokeStyle = options.color;
			ctx.lineCap = options.lineCap;
			ctx.lineJoin = options.lineJoin;
			ctx.stroke();
		}
	}

	// Canvas obviously doesn't have pointer events for individual drawn objects,
	// so we emulate that by calculating what's under the pointer on pointermove/click manually

	_onClick(e) {
		const point = this._map.pointerEventToLayerPoint(e);
		let layer, clickedLayer;

		for (let order = this._drawFirst; order; order = order.next) {
			layer = order.layer;
			if (layer.options.interactive && layer._containsPoint(point)) {
				if (!(e.type === 'click' || e.type === 'preclick') || !this._map._draggableMoved(layer)) {
					clickedLayer = layer;
				}
			}
		}
		this._fireEvent(clickedLayer ? [clickedLayer] : false, e);
	}

	_onPointerMove(e) {
		if (!this._map || this._map.dragging.moving() || this._map._animatingZoom) { return; }

		const point = this._map.pointerEventToLayerPoint(e);
		this._handlePointerHover(e, point);
	}


	_handlePointerOut(e) {
		const layer = this._hoveredLayer;
		if (layer) {
			// if we're leaving the layer, fire pointerout
			this._container.classList.remove('leaflet-interactive');
			this._fireEvent([layer], e, 'pointerout');
			this._hoveredLayer = null;
			this._pointerHoverThrottled = false;
		}
	}

	_handlePointerHover(e, point) {
		if (this._pointerHoverThrottled) {
			return;
		}

		let layer, candidateHoveredLayer;

		for (let order = this._drawFirst; order; order = order.next) {
			layer = order.layer;
			if (layer.options.interactive && layer._containsPoint(point)) {
				candidateHoveredLayer = layer;
			}
		}

		if (candidateHoveredLayer !== this._hoveredLayer) {
			this._handlePointerOut(e);

			if (candidateHoveredLayer) {
				this._container.classList.add('leaflet-interactive'); // change cursor
				this._fireEvent([candidateHoveredLayer], e, 'pointerover');
				this._hoveredLayer = candidateHoveredLayer;
			}
		}

		this._fireEvent(this._hoveredLayer ? [this._hoveredLayer] : false, e);

		this._pointerHoverThrottled = true;
		this._pointerHoverThrottleTimeout = setTimeout((() => {
			this._pointerHoverThrottled = false;
		}), 32);
	}

	_fireEvent(layers, e, type) {
		this._map._fireDOMEvent(e, type || e.type, layers);
	}

	_bringToFront(layer) {
		const order = layer._order;

		if (!order) { return; }

		const next = order.next;
		const prev = order.prev;

		if (next) {
			next.prev = prev;
		} else {
			// Already last
			return;
		}
		if (prev) {
			prev.next = next;
		} else if (next) {
			// Update first entry unless this is the
			// single entry
			this._drawFirst = next;
		}

		order.prev = this._drawLast;
		this._drawLast.next = order;

		order.next = null;
		this._drawLast = order;

		this._requestRedraw(layer);
	}

	_bringToBack(layer) {
		const order = layer._order;

		if (!order) { return; }

		const next = order.next;
		const prev = order.prev;

		if (prev) {
			prev.next = next;
		} else {
			// Already first
			return;
		}
		if (next) {
			next.prev = prev;
		} else if (prev) {
			// Update last entry unless this is the
			// single entry
			this._drawLast = prev;
		}

		order.prev = null;

		order.next = this._drawFirst;
		this._drawFirst.prev = order;
		this._drawFirst = order;

		this._requestRedraw(layer);
	}
}
