import {Icon} from './Icon.js';
import {Point} from '../../geometry/Point.js';

/*
 * @class DivIcon
 * @inherits Icon
 *
 * Represents a lightweight icon for markers that uses a simple `<div>`
 * element instead of an image. Inherits from `Icon` but ignores the `iconUrl` and shadow options.
 *
 * @example
 * ```js
 * const myIcon = new DivIcon({className: 'my-div-icon'});
 * // you can set .my-div-icon styles in CSS
 *
 * new Marker([50.505, 30.57], {icon: myIcon}).addTo(map);
 * ```
 *
 * By default, it has a 'leaflet-div-icon' CSS class and is styled as a little white square with a shadow.
 */

// @constructor DivIcon(options: DivIcon options)
// Creates a `DivIcon` instance with the given options.
export class DivIcon extends Icon {

	static {
		this.setDefaultOptions({
			// @section
			// @aka DivIcon options
			iconSize: [12, 12], // also can be set through CSS

			// iconAnchor: (Point),
			// popupAnchor: (Point),

			// @option html: String|HTMLElement = ''
			// Custom HTML code to put inside the div element, empty by default. Alternatively,
			// an instance of `HTMLElement`.
			html: false,

			// @option bgPos: Point = [0, 0]
			// Optional relative position of the background, in pixels
			bgPos: null,

			className: 'leaflet-div-icon'
		});
	}

	createIcon(oldIcon) {
		const div = (oldIcon && oldIcon.tagName === 'DIV') ? oldIcon : document.createElement('div'),
		    options = this.options;

		if (options.html instanceof Element) {
			div.replaceChildren();
			div.appendChild(options.html);
		} else {
			div.innerHTML = options.html !== false ? options.html : '';
		}

		if (options.bgPos) {
			const bgPos = new Point(options.bgPos);
			div.style.backgroundPosition = `${-bgPos.x}px ${-bgPos.y}px`;
		}
		this._setIconStyles(div, 'icon');

		return div;
	}

	createShadow() {
		return null;
	}
}
