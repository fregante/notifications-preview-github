// Mini version of select-dom
const select = (sel, el) => (el || document).querySelector(sel);
select.all = (sel, el) => (el || document).querySelectorAll(sel);
select.exists = (sel, el) => Boolean(select(sel, el));

const fetchDocument = url => new Promise((resolve, reject) => {
	const r = new XMLHttpRequest();
	r.open('GET', url, true);
	r.responseType = 'document';
	r.onerror = reject;
	r.onload = () => {
		if (r.status >= 200 && r.status < 400) {
			resolve(r.response);
		} else {
			reject(r.status);
		}
	};
	r.send();
});

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

function init() {
	const indicator = select('a.notification-indicator');
	addNotificationsDropdown();

	indicator.addEventListener('mouseenter', async () => {
		const container = select('#NPG-item');

		// The [data] attribute selector will not conflict with Refined GitHub
		if (indicator.matches('[data-ga-click$=":unread"]') && isHidden(select('#NPG'))) {
			empty(container);
			show(select('#NPG'));

			const notificationsPage = await fetchDocument('/notifications');
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
	});

	document.addEventListener('click', ({target}) => {
		const container = select('#NPG');
		if (!container.contains(target)) {
			hide(container);
		}
	});
}

// Init everywhere but on the notifications page
if (!location.pathname.startsWith('/notifications')) {
	// Automatically run at dom-ready thanks to run_at:document_idle in manifest.json
	// https://developer.chrome.com/extensions/content_scripts#run_at
	init();
}
