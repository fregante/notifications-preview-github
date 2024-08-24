import OptionsSync from 'webext-options-sync';

const defaultOptions = {
    previewCount: true,
    markAllAsRead: true,
    dropdown: 'compact',
    participating: false,
    closeOnMouseleave: false,
};

const extensionOptions = new OptionsSync({
    defaults: defaultOptions,
});

export { extensionOptions };
export type ExtensionOptions = typeof defaultOptions;
