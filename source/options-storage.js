import OptionsSync from 'webext-options-sync';

window.optionsStorage = new OptionsSync({
	defaults: {
		previewCount: true,
		dropdown: 'compact',
		participating: false
	}
});
