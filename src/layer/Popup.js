import {DivOverlay} from './DivOverlay.js';
import * as DomEvent from '../dom/DomEvent.js';
import * as DomUtil from '../dom/DomUtil.js';
import {Point} from '../geometry/Point.js';
import {Map} from '../map/Map.js';
import {Layer} from './Layer.js';
import {Path} from './vector/Path.js';
import {FeatureGroup} from './FeatureGroup.js';

/*
 * @class Popup
 * @inherits DivOverlay
 * Used to open popups in certain places of the map. Use [Map.openPopup](#map-openpopup) to
 * open popups while making sure that only one popup is open at one time
 * (recommended for usability), or use [Map.addLayer](#map-addlayer) to open as many as you want.
 *
 * @example
 *
 * If you want to just bind a popup to marker click and then open it, it's really easy:
 *
 * ```js
 * marker.bindPopup(popupContent).openPopup();
 * ```
 * Path overlays like polylines also have a `bindPopup` method.
 *
 * A popup can be also standalone:
 *
 * ```js
 * const popup = new Popup()
 * 	.setLatLng(latlng)
 * 	.setContent('<p>Hello world!<br />This is a nice popup.</p>')
 * 	.openOn(map);
 * ```
 * or
 * ```js
 * const popup = new Popup(latlng, {content: '<p>Hello world!<br />This is a nice popup.</p>'})
 * 	.openOn(map);
 * ```
 */


// @namespace Popup
// @constructor Popup(options?: Popup options, source?: Layer)
// Instantiates a `Popup` object given an optional `options` object that describes its appearance and location and an optional `source` object that is used to tag the popup with a reference to the Layer to which it refers.
// @alternative
// @constructor Popup(latlng: LatLng, options?: Popup options)
// Instantiates a `Popup` object given `latlng` where the popup will open and an optional `options` object that describes its appearance and location.
export class Popup extends DivOverlay {

	static {
		// @section
		// @aka Popup options
		this.setDefaultOptions({
			// @option pane: String = 'popupPane'
			// `Map pane` where the popup will be added.
			pane: 'popupPane',

			// @option offset: Point = Point(0, 7)
			// The offset of the popup position.
			offset: [0, 7],

			// @option maxWidth: Number = 300
			// Max width of the popup, in pixels.
			maxWidth: 300,

			// @option minWidth: Number = 50
			// Min width of the popup, in pixels.
			minWidth: 50,

			// @option maxHeight: Number = null
			// If set, creates a scrollable container of the given height
			// inside a popup if its content exceeds it.
			// The scrollable container can be styled using the
			// `leaflet-popup-scrolled` CSS class selector.
			maxHeight: null,

			// @option autoPan: Boolean = true
			// Set it to `false` if you don't want the map to do panning animation
			// to fit the opened popup.
			autoPan: true,

			// @option autoPanPaddingTopLeft: Point = null
			// The margin between the popup and the top left corner of the map
			// view after autopanning was performed.
			autoPanPaddingTopLeft: null,

			// @option autoPanPaddingBottomRight: Point = null
			// The margin between the popup and the bottom right corner of the map
			// view after autopanning was performed.
			autoPanPaddingBottomRight: null,

			// @option autoPanPadding: Point = Point(5, 5)
			// Equivalent of setting both top left and bottom right autopan padding to the same value.
			autoPanPadding: [5, 5],

			// @option keepInView: Boolean = false
			// Set it to `true` if you want to prevent users from panning the popup
			// off of the screen while it is open.
			keepInView: false,

			// @option closeButton: Boolean = true
			// Controls the presence of a close button in the popup.
			closeButton: true,

			// @option closeButtonLabel: String = 'Close popup'
			// Specifies the 'aria-label' attribute of the close button.
			closeButtonLabel: 'Close popup',

			// @option autoClose: Boolean = true
			// Set it to `false` if you want to override the default behavior of
			// the popup closing when another popup is opened.
			autoClose: true,

			// @option closeOnEscapeKey: Boolean = true
			// Set it to `false` if you want to override the default behavior of
			// the ESC key for closing of the popup.
			closeOnEscapeKey: true,

			// @option closeOnClick: Boolean = *
			// Set it if you want to override the default behavior of the popup closing when user clicks
			// on the map. Defaults to the map's [`closePopupOnClick`](#map-closepopuponclick) option.

			// @option className: String = ''
			// A custom CSS class name to assign to the popup.
			className: '',

			// @option trackResize: Boolean = true
			// Whether the popup shall react to changes in the size of its contents
			// (e.g. when an image inside the popup loads) and reposition itself.
			trackResize: true,
		});
	}

	// @namespace Popup
	// @method openOn(map: Map): this
	// Alternative to `map.openPopup(popup)`.
	// Adds the popup to the map and closes the previous one.
	openOn(map) {
		map = arguments.length ? map : this._source._map; // experimental, not the part of public api

		if (!map.hasLayer(this) && map._popup && map._popup.options.autoClose) {
			map.removeLayer(map._popup);
		}
		map._popup = this;

		return DivOverlay.prototype.openOn.call(this, map);
	}

	onAdd(map) {
		DivOverlay.prototype.onAdd.call(this, map);

		// @namespace Map
		// @section Popup events
		// @event popupopen: PopupEvent
		// Fired when a popup is opened in the map
		map.fire('popupopen', {popup: this});

		if (this._source) {
			// @namespace Layer
			// @section Popup events
			// @event popupopen: PopupEvent
			// Fired when a popup bound to this layer is opened
			this._source.fire('popupopen', {popup: this}, true);
			// For non-path layers, we toggle the popup when clicking
			// again the layer, so prevent the map to reopen it.
			if (!(this._source instanceof Path)) {
				this._source.on('preclick', DomEvent.stopPropagation);
			}
		}
	}

	onRemove(map) {
		DivOverlay.prototype.onRemove.call(this, map);

		// @namespace Map
		// @section Popup events
		// @event popupclose: PopupEvent
		// Fired when a popup in the map is closed
		map.fire('popupclose', {popup: this});

		if (this._source) {
			// @namespace Layer
			// @section Popup events
			// @event popupclose: PopupEvent
			// Fired when a popup bound to this layer is closed
			this._source.fire('popupclose', {popup: this}, true);
			if (!(this._source instanceof Path)) {
				this._source.off('preclick', DomEvent.stopPropagation);
			}
		}
	}

	getEvents() {
		const events = DivOverlay.prototype.getEvents.call(this);

		if (this.options.closeOnClick ?? this._map.options.closePopupOnClick) {
			events.preclick = this.close;
		}

		if (this.options.keepInView) {
			events.moveend = this._adjustPan;
		}

		return events;
	}

	_initLayout() {
		const prefix = 'leaflet-popup',
		    container = this._container = DomUtil.create('div', `${prefix} ${this.options.className || ''} leaflet-zoom-animated`);

		const wrapper = this._wrapper = DomUtil.create('div', `${prefix}-content-wrapper`, container);
		this._contentNode = DomUtil.create('div', `${prefix}-content`, wrapper);

		DomEvent.disableClickPropagation(container);
		DomEvent.disableScrollPropagation(this._contentNode);
		DomEvent.on(container, 'contextmenu', DomEvent.stopPropagation);

		this._tipContainer = DomUtil.create('div', `${prefix}-tip-container`, container);
		this._tip = DomUtil.create('div', `${prefix}-tip`, this._tipContainer);

		if (this.options.closeButton) {
			const closeButton = this._closeButton = DomUtil.create('a', `${prefix}-close-button`, container);
			closeButton.setAttribute('role', 'button'); // overrides the implicit role=link of <a> elements #7399
			closeButton.setAttribute('aria-label', this.options.closeButtonLabel);

			closeButton.href = '#close';
			closeButton.innerHTML = '<span aria-hidden="true">&#215;</span>';

			DomEvent.on(closeButton, 'click', (ev) => {
				DomEvent.preventDefault(ev);
				this.close();
			});
		}


		if (this.options.trackResize) {
			this._resizeObserver = new ResizeObserver(((entries) => {
				if (!this._map) { return; }
				this._containerWidth = entries[0]?.contentRect?.width;
				this._containerHeight = entries[0]?.contentRect?.height;

				this._updateLayout();
				this._updatePosition();
				this._adjustPan();
			}));

			this._resizeObserver.observe(this._contentNode);
		}
	}

	_updateLayout() {
		const container = this._contentNode,
		    style = container.style;

		style.maxWidth = `${this.options.maxWidth}px`;
		style.minWidth = `${this.options.minWidth}px`;

		const height = this._containerHeight ?? container.offsetHeight,
		    maxHeight = this.options.maxHeight,
		    scrolledClass = 'leaflet-popup-scrolled';

		if (maxHeight && height > maxHeight) {
			style.height = `${maxHeight}px`;
			container.classList.add(scrolledClass);
		} else {
			container.classList.remove(scrolledClass);
		}

		this._containerWidth = this._container.offsetWidth;
		this._containerHeight = this._container.offsetHeight;
	}

	_animateZoom(e) {
		const pos = this._map._latLngToNewLayerPoint(this._latlng, e.zoom, e.center),
		    anchor = this._getAnchor();
		DomUtil.setPosition(this._container, pos.add(anchor));
	}

	_adjustPan() {
		if (!this.options.autoPan) { return; }
		this._map._panAnim?.stop();

		// We can endlessly recurse if keepInView is set and the view resets.
		// Let's guard against that by exiting early if we're responding to our own autopan.
		if (this._autopanning) {
			this._autopanning = false;
			return;
		}

		const map = this._map,
		    marginBottom = parseInt(getComputedStyle(this._container).marginBottom, 10) || 0,
		    containerHeight = this._containerHeight + marginBottom,
		    containerWidth = this._containerWidth,
		    layerPos = new Point(this._containerLeft, -containerHeight - this._containerBottom);

		layerPos._add(DomUtil.getPosition(this._container));

		const containerPos = map.layerPointToContainerPoint(layerPos),
		      padding = new Point(this.options.autoPanPadding),
		      paddingTL = new Point(this.options.autoPanPaddingTopLeft ?? padding),
		      paddingBR = new Point(this.options.autoPanPaddingBottomRight ?? padding),
		      size = map.getSize();
		let dx = 0,
		    dy = 0;

		if (containerPos.x + containerWidth + paddingBR.x > size.x) { // right
			dx = containerPos.x + containerWidth - size.x + paddingBR.x;
		}
		if (containerPos.x - dx - paddingTL.x < 0) { // left
			dx = containerPos.x - paddingTL.x;
		}
		if (containerPos.y + containerHeight + paddingBR.y > size.y) { // bottom
			dy = containerPos.y + containerHeight - size.y + paddingBR.y;
		}
		if (containerPos.y - dy - paddingTL.y < 0) { // top
			dy = containerPos.y - paddingTL.y;
		}

		// @namespace Map
		// @section Popup events
		// @event autopanstart: Event
		// Fired when the map starts autopanning when opening a popup.
		if (dx || dy) {
			// Track that we're autopanning, as this function will be re-ran on moveend
			if (this.options.keepInView) {
				this._autopanning = true;
			}

			map
			    .fire('autopanstart')
			    .panBy([dx, dy]);
		}
	}

	_getAnchor() {
		// Where should we anchor the popup on the source layer?
		return new Point(this._source?._getPopupAnchor ? this._source._getPopupAnchor() : [0, 0]);
	}

}


/* @namespace Map
 * @section Interaction Options
 * @option closePopupOnClick: Boolean = true
 * Set it to `false` if you don't want popups to close when user clicks the map.
 */
Map.mergeOptions({
	closePopupOnClick: true
});


// @namespace Map
// @section Methods for Layers and Controls
Map.include({
	// @method openPopup(popup: Popup): this
	// Opens the specified popup while closing the previously opened (to make sure only one is opened at one time for usability).
	// @alternative
	// @method openPopup(content: String|HTMLElement, latlng: LatLng, options?: Popup options): this
	// Creates a popup with the specified content and options and opens it in the given point on a map.
	openPopup(popup, latlng, options) {
		this._initOverlay(Popup, popup, latlng, options)
		  .openOn(this);

		return this;
	},

	// @method closePopup(popup?: Popup): this
	// Closes the popup previously opened with [openPopup](#map-openpopup) (or the given one).
	closePopup(popup) {
		popup = arguments.length ? popup : this._popup;
		popup?.close();
		return this;
	}
});

/*
 * @namespace Layer
 * @section Popup methods example
 *
 * All layers share a set of methods convenient for binding popups to it.
 *
 * ```js
 * const layer = new Polygon(latlngs).bindPopup('Hi There!').addTo(map);
 * layer.openPopup();
 * layer.closePopup();
 * ```
 *
 * Popups will also be automatically opened when the layer is clicked on and closed when the layer is removed from the map or another popup is opened.
 */

// @section Popup methods
Layer.include({

	// @method bindPopup(content: String|HTMLElement|Function|Popup, options?: Popup options): this
	// Binds a popup to the layer with the passed `content` and sets up the
	// necessary event listeners. If a `Function` is passed it will receive
	// the layer as the first argument and should return a `String` or `HTMLElement`.
	bindPopup(content, options) {
		this._popup = this._initOverlay(Popup, this._popup, content, options);
		if (!this._popupHandlersAdded) {
			this.on({
				click: this._openPopup,
				keypress: this._onKeyPress,
				remove: this.closePopup,
				move: this._movePopup
			});
			this._popupHandlersAdded = true;
		}

		return this;
	},

	// @method unbindPopup(): this
	// Removes the popup previously bound with `bindPopup`.
	unbindPopup() {
		if (this._popup) {
			this.off({
				click: this._openPopup,
				keypress: this._onKeyPress,
				remove: this.closePopup,
				move: this._movePopup
			});
			this._popupHandlersAdded = false;
			this._popup = null;
		}
		return this;
	},

	// @method openPopup(latlng?: LatLng): this
	// Opens the bound popup at the specified `latlng` or at the default popup anchor if no `latlng` is passed.
	openPopup(latlng) {
		if (this._popup) {
			if (!(this instanceof FeatureGroup)) {
				this._popup._source = this;
			}
			if (this._popup._prepareOpen(latlng || this._latlng)) {
				// open the popup on the map
				this._popup.openOn(this._map);
			}
		}
		return this;
	},

	// @method closePopup(): this
	// Closes the popup bound to this layer if it is open.
	closePopup() {
		this._popup?.close();
		return this;
	},

	// @method togglePopup(): this
	// Opens or closes the popup bound to this layer depending on its current state.
	togglePopup() {
		this._popup?.toggle(this);
		return this;
	},

	// @method isPopupOpen(): boolean
	// Returns `true` if the popup bound to this layer is currently open.
	isPopupOpen() {
		return this._popup?.isOpen() ?? false;
	},

	// @method setPopupContent(content: String|HTMLElement|Popup): this
	// Sets the content of the popup bound to this layer.
	setPopupContent(content) {
		this._popup?.setContent(content);
		return this;
	},

	// @method getPopup(): Popup
	// Returns the popup bound to this layer.
	getPopup() {
		return this._popup;
	},

	_openPopup(e) {
		if (!this._popup || !this._map) {
			return;
		}
		// prevent map click
		DomEvent.stop(e);

		const target = e.propagatedFrom ?? e.target;
		if (this._popup._source === target && !(target instanceof Path)) {
			// treat it like a marker and figure out
			// if we should toggle it open/closed
			if (this._map.hasLayer(this._popup)) {
				this.closePopup();
			} else {
				this.openPopup(e.latlng);
			}
			return;
		}
		this._popup._source = target;
		this.openPopup(e.latlng);
	},

	_movePopup(e) {
		this._popup.setLatLng(e.latlng);
	},

	_onKeyPress(e) {
		if (e.originalEvent.code === 'Enter') {
			this._openPopup(e);
		}
	}
});
