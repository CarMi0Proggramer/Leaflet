
import {Class} from '../core/Class.js';
import {Map} from '../map/Map.js';
import * as Util from '../core/Util.js';
import * as DomUtil from '../dom/DomUtil.js';

/*
 * @class Control
 * @inherits Class
 *
 * Control is a base class for implementing map controls. Handles positioning.
 * All other controls extend from this class.
 */

export class Control extends Class {

	static {
		// @section
		// @aka Control Options
		this.setDefaultOptions({
			// @option position: String = 'topright'
			// The position of the control (one of the map corners). Possible values are `'topleft'`,
			// `'topright'`, `'bottomleft'` or `'bottomright'`
			position: 'topright'
		});
	}

	static {
		// @section
		// @aka Control Options
		this.setDefaultOptions({
			// @option position: String = 'topright'
			// The position of the control (one of the map corners). Possible values are `'topleft'`,
			// `'topright'`, `'bottomleft'` or `'bottomright'`
			position: 'topright'
		});
	}

	initialize(options) {
		Util.setOptions(this, options);
	}

	/* @section
	 * Classes extending Control will inherit the following methods:
	 *
	 * @method getPosition: string
	 * Returns the position of the control.
	 */
	getPosition() {
		return this.options.position;
	}

	// @method setPosition(position: string): this
	// Sets the position of the control.
	setPosition(position) {
		const map = this._map;

		map?.removeControl(this);

		this.options.position = position;

		map?.addControl(this);

		return this;
	}

	// @method getContainer: HTMLElement
	// Returns the HTMLElement that contains the control.
	getContainer() {
		return this._container;
	}

	// @method addTo(map: Map): this
	// Adds the control to the given map.
	addTo(map) {
		this.remove();
		this._map = map;

		const container = this._container = this.onAdd(map),
		pos = this.getPosition(),
		corner = map._controlCorners[pos];

		container.classList.add('leaflet-control');

		if (pos.includes('bottom')) {
			corner.insertBefore(container, corner.firstChild);
		} else {
			corner.appendChild(container);
		}

		this._map.on('unload', this.remove, this);

		return this;
	}

	// @method remove: this
	// Removes the control from the map it is currently active on.
	remove() {
		if (!this._map) {
			return this;
		}

		this._container.remove();

		if (this.onRemove) {
			this.onRemove(this._map);
		}

		this._map.off('unload', this.remove, this);
		this._map = null;

		return this;
	}

	_refocusOnMap(e) {
		// We exclude keyboard-click event to keep the focus on the control for accessibility.
		// The position of keyboard-click events are x=0 and y=0.
		if (this._map && e && !(e.screenX === 0 && e.screenY === 0)) {
			this._map.getContainer().focus();
		}
	}
}

/* @section Extension methods
 * @uninheritable
 *
 * Every control should extend from `Control` and (re-)implement the following methods.
 *
 * @method onAdd(map: Map): HTMLElement
 * Should return the container DOM element for the control and add listeners on relevant map events. Called on [`control.addTo(map)`](#control-addTo).
 *
 * @method onRemove(map: Map)
 * Optional method. Should contain all clean up code that removes the listeners previously added in [`onAdd`](#control-onadd). Called on [`control.remove()`](#control-remove).
 */

/* @namespace Map
 * @section Methods for Layers and Controls
 */
Map.include({
	// @method addControl(control: Control): this
	// Adds the given control to the map
	addControl(control) {
		control.addTo(this);
		return this;
	},

	// @method removeControl(control: Control): this
	// Removes the given control from the map
	removeControl(control) {
		control.remove();
		return this;
	},

	_initControlPos() {
		const corners = this._controlCorners = {},
		l = 'leaflet-',
		container = this._controlContainer =
		            DomUtil.create('div', `${l}control-container`, this._container);

		function createCorner(vSide, hSide) {
			const className = `${l + vSide} ${l}${hSide}`;

			corners[vSide + hSide] = DomUtil.create('div', className, container);
		}

		createCorner('top', 'left');
		createCorner('top', 'right');
		createCorner('bottom', 'left');
		createCorner('bottom', 'right');
	},

	_clearControlPos() {
		for (const c of Object.values(this._controlCorners)) {
			c.remove();
		}
		this._controlContainer.remove();
		delete this._controlCorners;
		delete this._controlContainer;
	}
});
