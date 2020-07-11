import doma from 'doma';
import select from 'select-dom';
import delegate from 'delegate-it';
import elementReady from 'element-ready';
import postForm from './libs/post-form';
import {empty, setTimeoutUntilVisible} from './libs/utils';

let options;
let notifications;

class Notifications {
	constructor() {
		try {
			// Firefox bug requires location.origin
			// https://github.com/sindresorhus/refined-github/issues/489
			const url = new URL('notifications', location.origin);
			if (options.participating) {
				url.searchParams.set('query', 'is:unread reason:participating');
			} else {
				url.searchParams.set('query', 'is:unread');
			}

			this.dom = fetch(url).then(r => r.text()).then(doma);
		} catch (err) {/* Ignore network failures */}
	}

	async getList() {
		if (!this.list) {
			this.list = select.all('.notifications-list .boxed-group, .js-active-navigation-container', await this.dom);

			// Change tooltip direction
			for (const group of this.list) {
				for (const {classList} of select.all('.tooltipped-s', group)) {
					classList.replace('tooltipped-s', 'tooltipped-n');
				}
			}
		}
		return this.list;
	}
}

function getRefinedGitHubUnreadCount() {
	const element = select('[data-rgh-unread]');
	if (!element) {
		return 0;
	}
	return Number(element.dataset.rghUnread);
}

// Is the dropdown open? Is it opening?
function isOpen(el) {
	return select.exists('.NPG-container[open], .NPG-loading', el);
}

async function updateUnreadCount() {
	const latestStatusEl = select('.notification-indicator .mail-status', await notifications.dom);
	const latestCount = select('.js-notification-inboxes .selected .count', await notifications.dom).textContent;
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

function createNotificationsDropdown() {
	const indicators = select.all('a.notification-indicator');
	const participating = options.participating ? 'participating' : '';

	for (const indicator of indicators) {
		const dropdown = doma(`
			<details class="NPG-container details-overlay details-reset">
				<summary>
					<div class="NPG-opener js-menu-target"></div>
				</summary>
				<details-menu class="NPG-dropdown dropdown-menu dropdown-menu-sw notifications-list ${participating} type-${options.dropdown}">
				</details-menu>
			</details>
		`);
		indicator.parentElement.classList.add('position-relative');
		indicator.parentElement.prepend(dropdown);

		// Close dropdown if a link is clicked
		// https://github.com/tanmayrajani/notifications-preview-github/issues/50
		dropdown.addEventListener('click', event => {
			if (!event.metaKey && !event.ctrlKey && !event.shiftKey && event.target.closest('a[href]')) {
				select('.modal-backdrop').click();
			}
		});
		indicator.addEventListener('mouseenter', openDropdown);
		indicator.addEventListener('click', visitNotificationsPage);
	}
}

async function openDropdown({currentTarget: indicator}) {
	const dropdown = indicator.parentNode;
	indicator.classList.add('NPG-loading');
	const list = await notifications.getList();
	indicator.classList.remove('NPG-loading');

	if (!isOpen(dropdown) && list.length > 0) {
		const container = select('.NPG-dropdown', dropdown);
		empty(container);
		container.append(...list);

		delegate('.NPG-dropdown button', 'click', async event => {
			event.preventDefault();
			const button = event.delegateTarget;
			const form  = button.closest('form');
			await postForm(form);

			const notification = form.closest('.js-notifications-list-item');
			const group = form.closest('.js-notifications-group');
			const notifs = select.all('.js-notifications-list-item', group);
			if (notification) {
				// Mark as read
				if (form.matches('[data-status="archived"]')) {
					notification.classList.replace('notification-unread', 'notification-read');
					notification.remove()
				}

				// Remove group if last notification
				if (!select.all('.js-notifications-list-item', group).length) {
          group.remove()
				}
			} else {
				form.classList.add('mark-all-as-read-confirmed');
				form.append(doma(`
					<label>&nbsp;Marked ${notifs.length} notifications as read</label>
				`));
				select.all('.js-notifications-list-item', group).forEach(item => item.remove())
			}
		});

		// Improve style when they're grouped by repo
		container.classList.toggle(
			'npg-has-groups',
			select.exists('.js-notifications-group', container)
		);

		select('.NPG-opener', dropdown).click(); // Open modal
	}
}

// When the dropdown is open, GitHub's modal blocks all links outside the dropdown.
// This handler lets the user visit /notifications while retaining any cmd/ctrl click modifier
function visitNotificationsPage(event) {
	if (isOpen() && event.isTrusted) {
		event.currentTarget.dispatchEvent(new MouseEvent('click', event));
	}
}

async function updateLoop() {
	if (!isOpen()) {
		const latest = new Notifications();
		// On the first run, set it asap so they can be awaited
		if (!notifications) {
			notifications = latest;
		}
		await latest.dom;
		notifications = latest;
		updateUnreadCount();
	}

	setTimeoutUntilVisible(updateLoop, 3000);
}

async function init() {
	options = await window.optionsStorage.getAll();
	await elementReady('.notification-indicator');
	updateLoop();

	if (!location.pathname.startsWith('/notifications') && options.dropdown !== 'no') {
		createNotificationsDropdown();
	}
}

init();
