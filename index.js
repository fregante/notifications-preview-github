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
	return setTimeout(() => requestAnimationFrame(cb), ms);
}

// Is the popup open? Is it opening?
function isOpen() {
	return select.exists('#NPG-opener[aria-expanded="true"], .NPG-loading');
}

/**
 * Extension
 */

let rawNotifications; // Unparsed notification page request

function restoreUnreadIndicator() {
	const indicator = select('.notification-indicator');
	const status = select('.mail-status', indicator);
	if (!status.classList.contains('unread')) {
		status.classList.add('unread');
		indicator.dataset.gaClick = indicator.dataset.gaClick.replace(':read', ':unread');
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
	const indicator = select('.notification-indicator');
	if (isOpen()) {
		return;
	}

	// Fetch the notifications
	let notificationsList;
	indicator.classList.add('NPG-loading');
	try {
		const notificationsPage = await rawNotifications.then(r => r.text()).then(domify);

		notificationsList = select.all('.boxed-group', notificationsPage);
		if (notificationsList.length === 0) {
			return;
		}
	} catch (err) {
		return;
	} finally {
		indicator.classList.remove('NPG-loading');
	}

	restoreUnreadIndicator();
	const container = select('#NPG-dropdown');
	empty(container);
	container.append(...notificationsList);

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
		rawNotifications = fetch('/notifications', {
			credentials: 'include'
		});
	}

	// Wait for request to be done first, so they don't overlap
	await rawNotifications;

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
