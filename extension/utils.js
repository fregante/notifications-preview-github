/* eslint-disable no-unused-vars */

// Mini version of select-dom
const select = (sel, el) => (el || document).querySelector(sel);
select.all = (sel, el) => (el || document).querySelectorAll(sel);
select.exists = (sel, el) => Boolean(select(sel, el));

// Mini version of element-ready
function elementReady(selector) {
	return new Promise(resolve => {
		(function check() {
			if (select.exists(selector)) {
				resolve();
			} else {
				requestAnimationFrame(check);
			}
		})();
	});
}

function parseHTML(html) {
	const dom = new DOMParser().parseFromString(html, 'text/html');
	return sanitizeDOM(dom);
}

function domify(html) {
	const template = document.createElement('template');
	template.innerHTML = html;
	return template.content;
}

function empty(el) {
	el.textContent = '';
}

// Wait for the timeout, but don't run if tab is not visible
function setTimeoutUntilVisible(cb, ms) {
	return setTimeout(requestAnimationFrame, ms, cb);
}

function sanitizeDOM(dom) {
	for (const el of dom.querySelectorAll('script,[href^="data:"],[href^="javascript:"]')) {
		el.remove();
	}
	for (const el of dom.querySelectorAll('*')) {
		for (const attr of el.getAttributeNames()) {
			if (attr.startsWith('on')) {
				el.removeAttribute(attr);
			}
		}
	}
	return dom;
}

async function postForm(form) {
	// `content.fetch` is Firefox’s way to make fetches from the page instead of from a different context
	// This will set the correct `origin` header without having to use XMLHttpRequest
	// https://stackoverflow.com/questions/47356375/firefox-fetch-api-how-to-omit-the-origin-header-in-the-request
	// https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts#XHR_and_Fetch
	const contentFetch = typeof window.content === 'object' ? window.content.fetch : window.fetch;
	const formData = new FormData();
	formData.append('utf8', '✓');
	formData.append('authenticity_token', select('input[name="authenticity_token"]', form).value);

	const response = await contentFetch(form.action, {
		// TODO: drop `as` after https://github.com/microsoft/TSJS-lib-generator/issues/741
		body: new URLSearchParams(formData),
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded'
		}
	});

	if (!response.ok) {
		throw new Error(response.statusText);
	}

	return response;
}

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
