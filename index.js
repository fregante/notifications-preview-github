(function ($, window, document) {
	var unreadNotificationsAvailable = false;
	var notificationHeight;

	function addNotificationsDropdown() {
		const $indicator = $('a.notification-indicator');
		notificationHeight = $(window).height() * 2 / 3;
		unreadNotificationsAvailable = true;
		$('.notification-dropdown-ext-parent').remove();
		$indicator.addClass('js-menu-target-ext');
		$indicator.parent().append(`
		<div class="dropdown-menu-content js-menu-content notification-dropdown-ext-parent">
			<ul class="dropdown-menu dropdown-menu-sw">
				<div class="dropdown-item" id="my-github-notification-list" 
					 style="max-height: ${notificationHeight}px; overflow-y: auto">
				</div>
			</ul>
    	</div>
		`);
		
		// Disable native tooltip
		$indicator.removeAttr('aria-label');
		$indicator.removeClass('tooltipped tooltipped-s');
	}

	function createMutationOberserver(selector, callback) {
		let observer = new MutationObserver(function (mutations) {
			mutations.forEach(function (mutation) {
				if (mutation.attributeName === "class") {
					let classNames = $(mutation.target).prop(mutation.attributeName).split(" ");
					callback(classNames);
				}
			});
		});

		observer.observe($(selector)[0], {
			attributes: true
		});
	}

	function handleMarkAsRead(classNames) {
		if (classNames.indexOf("unread") === -1) {
			unreadNotificationsAvailable = false;
			$('a.notification-indicator').removeClass('js-menu-target-ext');
		} else if (!$('a.notification-indicator').hasClass('js-menu-target-ext')) {
			addNotificationsDropdown();
		}
	}

	function handleCloseDropdown(classNames) {
		if (classNames.indexOf("selected") === -1) {
			$('.notification-dropdown-ext-parent').remove();
			if (unreadNotificationsAvailable) {
				addNotificationsDropdown();
			}
		}
	}

	$(() => {
		if ($('a.notification-indicator').has('span.mail-status.unread').length) {
			addNotificationsDropdown();
			createMutationOberserver("a.notification-indicator span.mail-status", handleMarkAsRead);
			createMutationOberserver("a.notification-indicator", handleCloseDropdown)
		}

		$(document).on('mouseenter', 'a.notification-indicator', () => {
			let notificationList = $('#my-github-notification-list');

			if ($('a.notification-indicator').has('span.mail-status.unread').length && !$('.notification-dropdown-ext-parent').is(':visible')) {
				notificationList.append(`<div class="loading-notification" style="margin: 3px 0px">Loading notifications...</div>`)
				if (!$('a.notification-indicator').hasClass('js-menu-target-ext')) {
					addNotificationsDropdown();
				}
				notificationList.load('/notifications .notifications-list', () => {
					$('#my-github-notification-list .loading-notification').remove();
					$('.notification-dropdown-ext-parent').show();
					if (notificationList[0].scrollHeight === notificationList[0].offsetHeight) {
						notificationList.css("overflow-y", "hidden");
					} else {
						notificationList.css("overflow-y", "auto");
					}
				})
			}
		});

		$(document).mouseup((e) => {
			let container = $(".notification-dropdown-ext-parent");

			if (!container.is(e.target) && container.has(e.target).length === 0) {
				container.hide();
			}
		});
	});

}(window.jQuery, window, document));
