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
	const dom = new DOMParser().parseFromString(html, 'text/html');
	return sanitizeDOM(dom);
}

function empty(el) {
	el.textContent = '';
}

// Wait for the timeout, but don't run if tab is not visible
function setTimeoutUntilVisible(cb, ms) {
	return setTimeout(requestAnimationFrame, ms, cb);
}

function copyAttributes(elFrom, elTo) {
	if (elFrom && elTo) {
		for (const attr of elFrom.getAttributeNames()) {
			if (elTo.getAttribute(attr) !== elFrom.getAttribute(attr)) {
				elTo.setAttribute(attr, elFrom.getAttribute(attr));
			}
		}
	}
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

/**
 * Extension
 */
let notifications;
let firstUpdate;
let options;
function getOptions() {
	const defaults = {
		previewCount: true,
		compactUI: true,
		participating: false
	};
	return new Promise(resolve => {
		chrome.storage.sync.get({options: defaults}, response => {
			options = response.options;
			resolve(options);
		});
	});
}

// Is the popup open? Is it opening?
function isOpen(el) {
	return select.exists('#NPG-opener[aria-expanded="true"], .NPG-loading', el);
}

function updateUnreadIndicator() {
	for (const indicator of select.all('a.notification-indicator')) {
		copyAttributes(
			select('.notification-indicator', notifications),
			indicator
		);
	}

	for (const indicatorMailStatus of select.all('.notification-indicator .mail-status')) {
		copyAttributes(
			select('.notification-indicator .mail-status', notifications),
			indicatorMailStatus
		);
	}
}

function updateUnreadCount() {
	if (options.previewCount) {
		const countEl = select('.notification-center .selected .count', notifications);

		for (const status of select.all('.notification-indicator .mail-status')) {
			const statusText = countEl.textContent || '';
			if (status.textContent !== statusText) {
				status.textContent = statusText;
			}
		}
	}
}

function addNotificationsDropdown() {
	const indicators = select.all('a.notification-indicator');
	const compact = options.compactUI ? 'compact' : '';
	const participating = options.participating ? 'participating' : '';

	for (const indicator of indicators) {
		indicator.parentNode.insertAdjacentHTML('afterbegin', `
			<div id="NPG-container" class="js-menu-container">
				<div id="NPG-opener" class="js-menu-target"></div>
				<div id="NPG" class="dropdown-menu-content js-menu-content">
					<div id="NPG-dropdown" class="dropdown-menu dropdown-menu-sw notifications-list ${participating} ${compact}">
					</div>
				</div>
			</div>
		`);
	}
}

function fillNotificationsDropdown(parentNode) {
	const boxes = select.all('.notifications-list .boxed-group', notifications);
	if (boxes.length > 0) {
		const container = select('#NPG-dropdown', parentNode);
		empty(container);
		container.append(...boxes);
		// Change tooltip direction
		for (const {classList} of select.all('.tooltipped-s', container)) {
			classList.remove('tooltipped-s');
			classList.add('tooltipped-n');
		}
	}
}

async function openPopup(indicator) {
	// Make sure that the first load has been completed
	try {
		indicator.classList.add('NPG-loading');
		await firstUpdate;
	} finally {
		indicator.classList.remove('NPG-loading');
	}

	if (!isOpen(indicator.parentNode) && select.exists('.mail-status.unread')) {
		fillNotificationsDropdown(indicator.parentNode);
		select('#NPG-opener', indicator.parentNode).click(); // Open modal
	}
}

async function updateLoop() {
	// Don't fetch while it's open
	if (!isOpen()) {
		const url = options.participating ? '/notifications/participating' : '/notifications';

		// Firefox bug requires location.origin
		// https://github.com/sindresorhus/refined-github/issues/489
		notifications = await fetch(location.origin + url, {
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

	for (const indicator of select.all('a.notification-indicator')) {
		indicator.addEventListener('mouseenter', () => openPopup(indicator));
		indicator.addEventListener('click', () => {
			// GitHub's modal blocks all links outside the popup
			// so this way we let the user visit /notifications
			location.href = indicator.href;
		});
	}
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
