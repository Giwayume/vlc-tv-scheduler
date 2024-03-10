import en from './en.js';

const { createI18n } = VueI18n;

const i18n = createI18n({
    legacy: false,
    locale: 'en',
    warnHtmlMessage: false,
    messages: {
        en,
    },
});

export default i18n;
