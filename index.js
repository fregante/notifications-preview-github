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

// Is the popup open? Is it opening?
function isOpen() {
	return select.exists('#NPG-opener[aria-expanded="true"], .NPG-loading');
}

/**
 * Extension
 */
function addNotificationsDropdown() {
	if (select.exists('#NPG')) {
		return;
	}
	const indicator = select('a.notification-indicator');
	indicator.parentNode.insertAdjacentHTML('beforeend', `
		<div id="NPG-opener" class="js-menu-target"></div>
		<div id="NPG" class="dropdown-menu-content js-menu-content">
			<ul id="NPG-dropdown" class="dropdown-menu dropdown-menu-sw">
				<li id="NPG-item" class="notifications-list"></li>
			</ul>
		</div>
	`);
}

async function openPopup() {
	// The [data] attribute selector will not conflict with Refined GitHub
	const indicator = select('.notification-indicator[data-ga-click$=":unread"]');
	if (!indicator || isOpen()) {
		return;
	}

	// Fetch the notifications
	indicator.classList.add('NPG-loading');
	const notificationsPage = await fetch('/notifications', {
		credentials: 'include'
	}).then(r => r.text()).then(domify);
	indicator.classList.remove('NPG-loading');

	const notificationsList = select.all('.boxed-group', notificationsPage);
	if (notificationsList.length === 0) {
		return;
	}

	const container = select('#NPG-item');
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

function init() {
	const indicator = select('a.notification-indicator');
	addNotificationsDropdown();

	// Restore link after it's disabled by the modal
	indicator.addEventListener('click', function () {
		window.location = this.href;
	});

	indicator.addEventListener('mouseenter', openPopup);
}

// Init everywhere but on the notifications page
if (!location.pathname.startsWith('/notifications')) {
	elementReady('.notification-indicator', init);
}
