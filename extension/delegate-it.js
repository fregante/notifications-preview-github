/* eslint-disable no-unused-vars, max-params */

const elements = new WeakMap();
function _delegate(element, selector, type, callback, options) {
	const capture = Boolean(typeof options === 'object' ? options.capture : options);
	const listenerFn = event => {
		const delegateTarget = event.target.closest(selector);
		if (!delegateTarget) {
			return;
		}
		event.delegateTarget = delegateTarget;
		// Closest may match elements outside of the currentTarget
		// so it needs to be limited to elements inside it
		if (event.currentTarget.contains(event.delegateTarget)) {
			callback.call(element, event);
		}
	};
	const delegateSubscription = {
		destroy() {
			element.removeEventListener(type, listenerFn, options);
			if (!elements.has(element)) {
				return;
			}
			const elementMap = elements.get(element);
			if (!elementMap.has(callback)) {
				return;
			}
			const setups = elementMap.get(callback);
			if (!setups) {
				return;
			}
			for (const setup of setups) {
				if (setup.selector !== selector ||
					setup.type !== type ||
					setup.capture === capture) {
					continue;
				}
				setups.delete(setup);
				if (setups.size === 0) {
					elementMap.delete(callback);
				}
				return;
			}
		}
	};
	const elementMap = elements.get(element) || new WeakMap();
	const setups = elementMap.get(callback) || new Set();
	for (const setup of setups) {
		if (setup.selector === selector &&
			setup.type === type &&
			setup.capture === capture) {
			return delegateSubscription;
		}
	}
	// Remember event in tree
	elements.set(element, elementMap.set(callback, setups.add({selector, type, capture})));
	// Add event on delegate
	element.addEventListener(type, listenerFn, options);
	return delegateSubscription;
}
/**
 * Delegates event to a selector.
 */
function delegate(elements, selector, type, callback, options) {
	// Handle the regular Element usage
	if (typeof elements.addEventListener === 'function') {
		return _delegate(elements, selector, type, callback, options);
	}
	// Handle Element-less usage, it defaults to global delegation
	if (typeof type === 'function') {
		return _delegate(document, elements, selector, type, callback);
	}
	// Handle Selector-based usage
	if (typeof elements === 'string') {
		elements = document.querySelectorAll(elements);
	}
	// Handle Array-like based usage
	return Array.prototype.map.call(elements, element => {
		return _delegate(element, selector, type, callback, options);
	});
}
