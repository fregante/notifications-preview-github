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
	const temp = document.createElement('template');
	temp.innerHTML = html;
	return temp.content;
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

let notifications = {};

function copyAttributes(elFrom, elTo) {
	for (const attr of elFrom.getAttributeNames()) {
		if (elTo.getAttribute(attr) !== elFrom.getAttribute(attr)) {
			elTo.setAttribute(attr, elFrom.getAttribute(attr));
		}
	}
}

function updateUnreadIndicator() {
	copyAttributes(
		select('.notification-indicator', notifications.full),
		select('.notification-indicator')
	);
	copyAttributes(
		select('.notification-indicator .mail-status', notifications.full),
		select('.notification-indicator .mail-status')
	);
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
	if (isOpen() || notifications.list.length === 0) {
		return;
	}

	const container = select('#NPG-dropdown');
	empty(container);
	container.append(...notifications.list);

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
		const dom = await fetch(location.origin + '/notifications', {
			credentials: 'include'
		}).then(r => r.text()).then(domify);

		notifications = {
			full: dom,
			list: select.all('.boxed-group', dom)
		};

		updateUnreadIndicator();
	}

	// Wait three seconds, but don't run if tab is not visible
	setTimeoutUntilVisible(fetchNotifications, 3000);
}

function init() {
	addNotificationsDropdown();
	fetchNotifications();

	const indicator = select('a.notification-indicator');
	indicator.addEventListener('mouseenter', openPopup);

	// Restore link after it's disabled by the modal
	indicator.addEventListener('click', () => {
		location.href = indicator.href;
	});
}

// Init everywhere but on the notifications page
if (!location.pathname.startsWith('/notifications')) {
	elementReady('.notification-indicator', init);
}
