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

// Wait for the timeout, but don't run if tab is not visible
function setTimeoutUntilVisible(cb, ms) {
	return setTimeout(requestAnimationFrame, ms, cb);
}
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

/**
 * Extension
 */
let notifications;
let firstUpdate;
let options;
function getOptions() {
	const defaults = {
		previewCount: true,
	  compactUI: true
	};
	return new Promise(resolve => {
		chrome.storage.sync.get({options: defaults}, response => {
			options = response.options;
      if (options.compactUI) {
		  	select('#NPG-dropdown').classList.add('compact');
		  }
			resolve(options);
		});
	});
}

// Is the popup open? Is it opening?
function isOpen() {
	return select.exists('#NPG-opener[aria-expanded="true"], .NPG-loading');
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
}

function updateUnreadCount() {
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
		await firstUpdate;
	} finally {
		indicator.classList.remove('NPG-loading');
	}

	if (!isOpen() && select.exists('.mail-status.unread')) {
		fillNotificationsDropdown();
		select('#NPG-opener').click(); // Open modal
	}
}

async function updateLoop() {
	// Don't fetch while it's open
	if (!isOpen()) {
		// Firefox bug requires location.origin
		// https://github.com/sindresorhus/refined-github/issues/489
		notifications = await fetch(location.origin + '/notifications', {
			credentials: 'include'
		}).then(r => r.text()).then(domify);

		updateUnreadIndicator();
		updateUnreadCount();
	}

	setTimeoutUntilVisible(updateLoop, 3000);
}

function init() {
	addNotificationsDropdown();
	firstUpdate = updateLoop();

	const indicator = select('.notification-indicator');
	indicator.addEventListener('mouseenter', openPopup);
	indicator.addEventListener('click', () => {
		// GitHub's modal blocks all links outside the popup
		// so this way we let the user visit /notifications
		location.href = indicator.href;
	});
}

Promise.all([
	elementReady('.notification-indicator'),
	getOptions()
]).then(() => {
	if (location.pathname.startsWith('/notifications')) {
		updateUnreadCount();
	} else {
		init();
	}
});
