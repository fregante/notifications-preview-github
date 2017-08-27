(function ($, window, document) {
	var unreadNotificationsAvailable = false;
	var notificationHeight;

	function addNotificationsDropdown() {
		notificationHeight = $(window).height() * 2 / 3;
		unreadNotificationsAvailable = true;
		$('#NPG').remove();
		$('a.notification-indicator').addClass('js-menu-target-ext');
		$('a.notification-indicator').parent().append(`
		<div id="NPG" class="dropdown-menu-content js-menu-content">
			<ul id="NPG-dropdown" class="dropdown-menu dropdown-menu-sw">
				<div id="NPG-item" class="dropdown-item"
					 style="max-height: ${notificationHeight}px; overflow-y: auto">
				</div>
			</ul>
    	</div>
		`);
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
			let notificationList = $('#NPG-item');

			if ($('a.notification-indicator').has('span.mail-status.unread').length && !$('#NPG').is(':visible')) {
				notificationList.append(`<div class="loading-notification" style="margin: 3px 0px">Loading notifications...</div>`)
				if (!$('a.notification-indicator').hasClass('js-menu-target-ext')) {
					addNotificationsDropdown();
				}
				notificationList.load('/notifications .notifications-list', () => {
					$('#NPG-item .loading-notification').remove();
					$('#NPG').show();
					notificationList.find('.paginate-container').remove();
					if (notificationList[0].scrollHeight === notificationList[0].offsetHeight) {
						notificationList.css("overflow-y", "hidden");
					} else {
						notificationList.css("overflow-y", "auto");
					}
				})
			}
		});

		$(document).mouseup((e) => {
			let container = $("#NPG");

			if (!container.is(e.target) && container.has(e.target).length === 0) {
				container.hide();
			}
		});
	});

}(window.jQuery, window, document));