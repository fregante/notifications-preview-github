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
function hide(el) {
	el.style.display = 'none';
}
function show(el) {
	el.style.display = 'block';
}
function isHidden(el) {
	return el.style.display !== 'block';
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
	const popup = select('#NPG');
	if (!indicator || !isHidden(popup)) {
		return;
	}

	// Fetch the notifications
	let notificationsList;
	indicator.classList.add('NPG-loading');
	try {
		const notificationsPage = await fetch('/notifications', {
			credentials: 'include'
		}).then(r => r.text()).then(domify);

		notificationsList = select.all('.boxed-group', notificationsPage);
		if (notificationsList.length === 0) {
			return;
		}
	} catch (e) {
		return;
	} finally {
		indicator.classList.remove('NPG-loading');
	}

	const container = select('#NPG-item');
	empty(container);
	show(popup);
	container.append(...notificationsList);

	// Change tooltip direction
	for (const {classList} of select.all('.tooltipped-s', container)) {
		classList.remove('tooltipped-s');
		classList.add('tooltipped-n');
	}
}

function closePopup({target}) {
	const container = select('#NPG');
	if (!container.contains(target)) {
		hide(container);
	}
}

function init() {
	const indicator = select('a.notification-indicator');
	addNotificationsDropdown();

	indicator.addEventListener('mouseenter', openPopup);
	document.addEventListener('click', closePopup);
}

// Init everywhere but on the notifications page
if (!location.pathname.startsWith('/notifications')) {
	elementReady('.notification-indicator', init);
}
