/* globals select, empty, domify, setTimeoutUntilVisible, elementReady */

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

function getRefinedGitHubUnreadCount() {
	const element = select('[data-rgh-unread]');
	if (!element) {
		return 0;
	}
	return Number(element.dataset.rghUnread);
}

// Is the popup open? Is it opening?
function isOpen(el) {
	return select.exists('#NPG-opener[aria-expanded="true"], .NPG-loading', el);
}

function updateUnreadCount() {
	const latestStatusEl = select('.notification-indicator .mail-status', notifications);
	const latestCount = select('.notification-center .selected .count', notifications).textContent;
	const rghCount = getRefinedGitHubUnreadCount();

	for (const statusEl of select.all('.notification-indicator .mail-status')) {
		if (options.previewCount && statusEl.textContent !== latestCount) {
			statusEl.textContent = Number(latestCount) + rghCount || ''; // Don't show 0
		}
		statusEl.classList.toggle('unread', rghCount || latestStatusEl.classList.contains('unread'));
		statusEl.parentNode.dataset.gaClick = latestStatusEl.parentNode.dataset.gaClick;
		statusEl.parentNode.setAttribute('aria-label', latestStatusEl.parentNode.getAttribute('aria-label'));
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
		try {
			const url = options.participating ? '/notifications/participating' : '/notifications';

			// Firefox bug requires location.origin
			// https://github.com/sindresorhus/refined-github/issues/489
			notifications = await fetch(location.origin + url, {
				credentials: 'include'
			}).then(r => r.text()).then(domify);

			updateUnreadCount();
		} catch (error) {/* Ignore network failures */}
	}

	setTimeoutUntilVisible(updateLoop, 3000);
}

async function init() {
	await getOptions();
	await elementReady('.notification-indicator');
	addNotificationsDropdown();
	firstUpdate = updateLoop();

	// Don’t show the popup on the notifications page
	if (location.pathname.startsWith('/notifications')) {
		return;
	}
	for (const indicator of select.all('a.notification-indicator')) {
		indicator.addEventListener('mouseenter', () => openPopup(indicator));
		indicator.addEventListener('click', event => {
			// When the popup is open, GitHub's modal blocks all links outside the popup.
			// This handler lets the user visit /notifications while retaining any cmd/ctrl click modifier
			if (isOpen() && event.isTrusted) {
				indicator.dispatchEvent(new MouseEvent('click', event));
			}
		});
	}
}

init();
