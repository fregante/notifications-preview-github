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

/**
 * Utilities
 */
function domify(html) {
	return new DOMParser().parseFromString(html, 'text/html');
}

function empty(el) {
	el.textContent = '';
}

function setTimeoutUntilVisible(cb, ms) {
	return setTimeout(requestAnimationFrame, ms, cb);
}

// Is the popup open? Is it opening?
function isOpen() {
	return select.exists('#NPG-opener[aria-expanded="true"], .NPG-loading');
}

/**
 * Extension
 */
let notifications;
let firstFetch;
let options;

// Chrome 60- polyfill
function getAttributeNames(el) {
	if (el.getAttributeNames) {
		return el.getAttributeNames();
	}
	return [...el.attributes].map(attr => attr.name);
}

function copyAttributes(elFrom, elTo) {
	if (elFrom && elTo) {
		for (const attr of getAttributeNames(elFrom)) {
			if (elTo.getAttribute(attr) !== elFrom.getAttribute(attr)) {
				elTo.setAttribute(attr, elFrom.getAttribute(attr));
			}
		}
	}
}
function getOptions() {
	const defaults = {
		previewCount: true // Default value
	};
	return new Promise(resolve => {
		chrome.storage.sync.get({options: defaults}, response => {
			options = response.options;
			resolve(options);
		});
	});
}


function updateUnreadIndicator() {
	copyAttributes(
		select('.notification-indicator', notifications),
		select('.notification-indicator')
	);
	copyAttributes(
		select('.notification-indicator .mail-status', notifications),
		select('.notification-indicator .mail-status')
	);

	if (options.previewCount) {
		const status = select('.notification-indicator .mail-status');
		const countEl = select('.notification-center .count', notifications);
		const statusText = countEl.textContent || '';
		if (status.textContent !== statusText) {
			status.textContent = statusText;
		}
	}
}

function addNotificationsDropdown() {
	if (select.exists('#NPG')) {
		return;
	}
	const indicator = select('.notification-indicator');
	indicator.parentNode.insertAdjacentHTML('beforeend', `
		<div id="NPG-opener" class="js-menu-target"></div>
		<div id="NPG" class="dropdown-menu-content js-menu-content">
			<div id="NPG-dropdown" class="dropdown-menu dropdown-menu-sw notifications-list">
			</div>
		</div>
	`);
}

function fillNotificationsDropdown() {
	const boxes = select.all('.notifications-list .boxed-group', notifications);
	if (boxes.length > 0) {
		const container = select('#NPG-dropdown');
		empty(container);
		container.append(...boxes);

		// Change tooltip direction
		for (const {classList} of select.all('.tooltipped-s', container)) {
			classList.remove('tooltipped-s');
			classList.add('tooltipped-n');
		}
	}
}

async function openPopup() {
	// Make sure that the first load has been completed
	const indicator = select('.notification-indicator');
	try {
		indicator.classList.add('NPG-loading');
		await firstFetch;
	} finally {
		indicator.classList.remove('NPG-loading');
	}

	if (!isOpen() && select.exists('.mail-status.unread')) {
		fillNotificationsDropdown();
		select('#NPG-opener').click(); // Open modal
	}
}

async function fetchNotifications() {
	// Don't fetch while it's open
	if (!isOpen()) {
		// Firefox bug requires location.origin
		// https://github.com/sindresorhus/refined-github/issues/489
		notifications = await fetch(location.origin + '/notifications', {
			credentials: 'include'
		}).then(r => r.text()).then(domify);

		updateUnreadIndicator();
	}

	// Wait three seconds, but don't run if tab is not visible
	setTimeoutUntilVisible(fetchNotifications, 3000);
}

function init() {
	addNotificationsDropdown();
	firstFetch = fetchNotifications();

	const indicator = select('.notification-indicator');
	indicator.addEventListener('mouseenter', openPopup);

	// Restore link after it's disabled by the modal
	indicator.addEventListener('click', () => {
		location.href = indicator.href;
	});
}

Promise.all([
	elementReady('.notification-indicator'),
	getOptions()
]).then(() => {
	if (!location.pathname.startsWith('/notifications')) {
		init();
	}
});
