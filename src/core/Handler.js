import {Class} from './Class.js';

/*
	Handler is a base class for handler classes that are used internally to inject
	interaction features like dragging to classes like Map and Marker.
*/

// @class Handler
// Abstract class for map interaction handlers

export class Handler extends Class {
	initialize(map) {
		this._map = map;
	}

	// @method enable(): this
	// Enables the handler
	enable() {
		if (this._enabled) { return this; }

		this._enabled = true;
		this.addHooks();
		return this;
	}

	// @method disable(): this
	// Disables the handler
	disable() {
		if (!this._enabled) { return this; }

		this._enabled = false;
		this.removeHooks();
		return this;
	}

	// @method enabled(): Boolean
	// Returns `true` if the handler is enabled
	enabled() {
		return !!this._enabled;
	}

	// @section Extension methods
	// Classes inheriting from `Handler` must implement the two following methods:
	// @method addHooks()
	// Called when the handler is enabled, should add event hooks.
	// @method removeHooks()
	// Called when the handler is disabled, should remove the event hooks added previously.
}

// @section There is static function which can be called without instantiating Handler:
// @function addTo(map: Map, name: String): this
// Adds a new Handler to the given map with the given name.
Handler.addTo = function (map, name) {
	map.addHandler(name, this);
	return this;
};
