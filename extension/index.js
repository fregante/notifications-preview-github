// Mini version of select-dom
const select = (sel, el) => (el || document).querySelector(sel);
select.all = (sel, el) => (el || document).querySelectorAll(sel);
select.exists = (sel, el) => Boolean(select(sel, el));

// Mini version of element-ready
function elementReady(selector, fn) {
	(function check() {
		const el = document.querySelector(selector);

		if (el) {
			fn();
		} else {
			requestAnimationFrame(check);
		}
	})();
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
let options = {
	previewCount: true // Default value
};

function copyAttributes(elFrom, elTo) {
	for (const attr of elFrom.getAttributeNames()) {
		if (elTo.getAttribute(attr) !== elFrom.getAttribute(attr)) {
			elTo.setAttribute(attr, elFrom.getAttribute(attr));
		}
	}
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
		const statusText = select.all('.js-notification', notifications).length || '';
		if (status.textContent !== statusText) {
			status.textContent = statusText;
		}
	}
}

function addNotificationsDropdown() {
	if (select.exists('#NPG')) {
		return;
	}
	const indicator = select('a.notification-indicator');
	indicator.parentNode.insertAdjacentHTML('beforeend', `
		<div id="NPG-opener" class="js-menu-target"></div>
		<div id="NPG" class="dropdown-menu-content js-menu-content">
			<div id="NPG-dropdown" class="dropdown-menu dropdown-menu-sw notifications-list">
			</div>
		</div>
	`);
}

async function openPopup() {
	// Make sure that the first load has been completed
	const indicator = select('a.notification-indicator');
	indicator.classList.add('NPG-loading');
	await firstFetch;
	indicator.classList.remove('NPG-loading');

	const boxes = select.all('.notifications-list .boxed-group', notifications);
	if (isOpen() || boxes.length === 0) {
		return;
	}

	const container = select('#NPG-dropdown');
	empty(container);
	container.append(...boxes);

	// Open
	select('#NPG-opener').click();

	// Change tooltip direction
	for (const {classList} of select.all('.tooltipped-s', container)) {
		classList.remove('tooltipped-s');
		classList.add('tooltipped-n');
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

	const indicator = select('a.notification-indicator');
	indicator.addEventListener('mouseenter', openPopup);

	// Restore link after it's disabled by the modal
	indicator.addEventListener('click', () => {
		location.href = indicator.href;
	});

	// Get options
	chrome.storage.sync.get({options}, response => {
		options = response.options;
	});
}

// Init everywhere but on the notifications page
if (!location.pathname.startsWith('/notifications')) {
	elementReady('.notification-indicator', init);
}
