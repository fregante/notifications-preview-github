// Default values
const options = {
	previewCount: true
};

chrome.storage.sync.get({options}, ({options}) => {
	const field = document.querySelector('[name=previewCount]');
	if (options.previewCount) {
		field.checked = true;
	}
	field.addEventListener('change', () => {
		chrome.storage.sync.set({
			options: {
				previewCount: field.checked
			}
		});
	});
});
