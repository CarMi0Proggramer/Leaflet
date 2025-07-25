
import {Control} from './Control.js';
import {Map} from '../map/Map.js';
import * as DomUtil from '../dom/DomUtil.js';
import * as DomEvent from '../dom/DomEvent.js';

/*
 * @class Control.Zoom
 * @inherits Control
 *
 * A basic zoom control with two buttons (zoom in and zoom out). It is put on the map by default unless you set its [`zoomControl` option](#map-zoomcontrol) to `false`. Extends `Control`.
 */

// @namespace Control.Zoom
// @constructor Control.Zoom(options: Control.Zoom options)
// Creates a zoom control
export class Zoom extends Control {

	static {
		// @section
		// @aka Control.Zoom options
		this.setDefaultOptions({
			// @option position: String = 'topleft'
			// The position of the control (one of the map corners). Possible values are `'topleft'`,
			// `'topright'`, `'bottomleft'` or `'bottomright'`
			position: 'topleft',

			// @option zoomInText: String = '<span aria-hidden="true">+</span>'
			// The text set on the 'zoom in' button.
			zoomInText: '<span aria-hidden="true">+</span>',

			// @option zoomInTitle: String = 'Zoom in'
			// The title set on the 'zoom in' button.
			zoomInTitle: 'Zoom in',

			// @option zoomOutText: String = '<span aria-hidden="true">&#x2212;</span>'
			// The text set on the 'zoom out' button.
			zoomOutText: '<span aria-hidden="true">&#x2212;</span>',

			// @option zoomOutTitle: String = 'Zoom out'
			// The title set on the 'zoom out' button.
			zoomOutTitle: 'Zoom out'
		});
	}

	onAdd(map) {
		const zoomName = 'leaflet-control-zoom',
		    container = DomUtil.create('div', `${zoomName} leaflet-bar`),
		    options = this.options;

		this._zoomInButton  = this._createButton(options.zoomInText, options.zoomInTitle,
		        `${zoomName}-in`,  container, this._zoomIn);
		this._zoomOutButton = this._createButton(options.zoomOutText, options.zoomOutTitle,
		        `${zoomName}-out`, container, this._zoomOut);

		this._updateDisabled();
		map.on('zoomend zoomlevelschange', this._updateDisabled, this);

		return container;
	}

	onRemove(map) {
		map.off('zoomend zoomlevelschange', this._updateDisabled, this);
	}

	disable() {
		this._disabled = true;
		this._updateDisabled();
		return this;
	}

	enable() {
		this._disabled = false;
		this._updateDisabled();
		return this;
	}

	_zoomIn(e) {
		if (!this._disabled && this._map._zoom < this._map.getMaxZoom()) {
			this._map.zoomIn(this._map.options.zoomDelta * (e.shiftKey ? 3 : 1));
		}
	}

	_zoomOut(e) {
		if (!this._disabled && this._map._zoom > this._map.getMinZoom()) {
			this._map.zoomOut(this._map.options.zoomDelta * (e.shiftKey ? 3 : 1));
		}
	}

	_createButton(html, title, className, container, fn) {
		const link = DomUtil.create('a', className, container);
		link.innerHTML = html;
		link.href = '#';
		link.title = title;

		/*
		 * Will force screen readers like VoiceOver to read this as "Zoom in - button"
		 */
		link.setAttribute('role', 'button');
		link.setAttribute('aria-label', title);

		DomEvent.disableClickPropagation(link);
		DomEvent.on(link, 'click', DomEvent.stop);
		DomEvent.on(link, 'click', fn, this);
		DomEvent.on(link, 'click', this._refocusOnMap, this);

		return link;
	}

	_updateDisabled() {
		const map = this._map,
		    className = 'leaflet-disabled';

		this._zoomInButton.classList.remove(className);
		this._zoomOutButton.classList.remove(className);
		this._zoomInButton.setAttribute('aria-disabled', 'false');
		this._zoomOutButton.setAttribute('aria-disabled', 'false');

		if (this._disabled || map._zoom === map.getMinZoom()) {
			this._zoomOutButton.classList.add(className);
			this._zoomOutButton.setAttribute('aria-disabled', 'true');
		}
		if (this._disabled || map._zoom === map.getMaxZoom()) {
			this._zoomInButton.classList.add(className);
			this._zoomInButton.setAttribute('aria-disabled', 'true');
		}
	}
}

// @namespace Map
// @section Control options
// @option zoomControl: Boolean = true
// Whether a [zoom control](#control-zoom) is added to the map by default.
Map.mergeOptions({
	zoomControl: true
});

Map.addInitHook(function () {
	if (this.options.zoomControl) {
		// @section Controls
		// @property zoomControl: Control.Zoom
		// The default zoom control (only available if the
		// [`zoomControl` option](#map-zoomcontrol) was `true` when creating the map).
		this.zoomControl = new Zoom();
		this.addControl(this.zoomControl);
	}
});

