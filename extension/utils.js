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

function getOptions(defaults) {
	return new Promise(resolve => {
		chrome.storage.sync.get({options: defaults}, response => {
			resolve(response.options);
		});
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
