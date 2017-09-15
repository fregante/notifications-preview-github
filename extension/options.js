// Default values
const options = {
	previewCount: true,
	compactUI: true
};

chrome.storage.sync.get({options}, ({options}) => {
	Object.keys(options).forEach((option, value) => {
		const field = document.querySelector(`[name=${option}]`);
		field.checked = value;
		field.addEventListener('change', () => {
			chrome.storage.sync.set({
				options: Object.assign(options, {
					[option]: field.checked
				})
			});
		});
	});
});
