// Mini version of select-dom
const select = (sel, el) => (el || document).querySelector(sel);
select.all = (sel, el) => (el || document).querySelectorAll(sel);
select.exists = (sel, el) => Boolean(select(sel, el));

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

function addNotificationsDropdown() {
	if (select.exists('#NPG')) {
		return;
	}
	const indicator = select('a.notification-indicator');
	indicator.parentNode.insertAdjacentHTML('beforeend', `
		<div id="NPG" class="dropdown-menu-content js-menu-content">
			<ul id="NPG-dropdown" class="dropdown-menu dropdown-menu-sw">
				<li id="NPG-item" class="dropdown-item"></li>
			</ul>
		</div>
	`);
}

async function openPopup() {
	// The [data] attribute selector will not conflict with Refined GitHub
	const hasUnread = select.exists('.notification-indicator[data-ga-click$=":unread"]');
	const popup = select('#NPG');
	if (!hasUnread || !isHidden(popup)) {
		return;
	}

	const container = select('#NPG-item');
	empty(container);
	show(popup);

	// Fetch the notifications
	const notificationsPage = await fetch('/notifications', {
		credentials: 'include'
	}).then(r => r.text()).then(domify);
	const notificationsList = select('.notifications-list', notificationsPage);
	container.append(notificationsList);

	// Change tooltip direction
	const classes = select('.tooltipped-s', container).classList;
	classes.remove('tooltipped-s');
	classes.add('tooltipped-n');

	// Remove unused elements
	for (const uselessEl of select.all('.paginate-container', container)) {
		uselessEl.remove();
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
	// Automatically run at dom-ready thanks to run_at:document_idle in manifest.json
	// https://developer.chrome.com/extensions/content_scripts#run_at
	init();
}
