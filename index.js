(function ($, window, document) {
	var unreadNotificationsAvailable = false;

	function addNotificationsDropdown() {
		unreadNotificationsAvailable = true;
		$('.notification-dropdown-ext-parent').remove();
		$('a.notification-indicator').addClass('js-menu-target');
		$('a.notification-indicator').parent().append(`
		<div class="dropdown-menu-content js-menu-content notification-dropdown-ext-parent">
			<ul class="dropdown-menu dropdown-menu-sw">
				<div class="dropdown-item" id="my-github-notification-list"></div>	
			</ul>
    	</div>
		`);

		// $('#my-github-notification-list').load('/notifications .notifications-list')
	}

	function createMutationOberserver(selector, callback) {
		var observer = new MutationObserver(function (mutations) {
			mutations.forEach(function (mutation) {
				if (mutation.attributeName === "class") {
					var classNames = $(mutation.target).prop(mutation.attributeName).split(" ");
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
			$('a.notification-indicator').removeClass('js-menu-target');
		} else if (!$('a.notification-indicator').hasClass('js-menu-target')) {
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

	$(function () {
		if ($('a.notification-indicator').has('span.mail-status.unread').length) {
			addNotificationsDropdown();
			createMutationOberserver("a.notification-indicator span.mail-status", handleMarkAsRead);
			createMutationOberserver("a.notification-indicator", handleCloseDropdown)
		}

		$(document).on('click', 'a.notification-indicator', function () {
			$('#my-github-notification-list').append(`<div style="margin: 5px 0px">Loading notifications...</div>`)
			$('#my-github-notification-list').load('/notifications .notifications-list')
		});
	});

}(window.jQuery, window, document));