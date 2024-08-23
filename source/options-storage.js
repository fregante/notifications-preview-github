import OptionsSync from 'webext-options-sync';

const optionsStorage = new OptionsSync({
	defaults: {
		previewCount: true,
		markAllAsRead: true,
		dropdown: 'compact',
		participating: false,
		closeOnMouseleave: false,
	},
});

export default optionsStorage;
