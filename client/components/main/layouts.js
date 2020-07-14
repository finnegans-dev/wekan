BlazeLayout.setRoot('body');

const i18nTagToT9n = (i18nTag) => {
    // t9n/i18n tags are same now, see: https://github.com/softwarerero/meteor-accounts-t9n/pull/129
    // but we keep this conversion function here, to be aware that that they are different system.
    return i18nTag;
};

Template.userFormsLayout.onRendered(() => {
    const i18nTag = navigator.language;
    if (i18nTag) {
        T9n.setLanguage(i18nTagToT9n(i18nTag));
    }
    let url = window.location.href;
    url = new URL(url);
    let id = url.searchParams.get("id");
    let token = url.searchParams.get("token");
    let expires = url.searchParams.get("expires");
    let ecoToken = url.searchParams.get("ecoToken");
    if (token) localStorage.setItem('Meteor.loginToken', token);
    if (id) localStorage.setItem('Meteor.userId', id);
    if (expires) localStorage.setItem('Meteor.loginTokenExpires', expires);
    if (ecoToken) sessionStorage.setItem('token', ecoToken);
    if (token || id || expires) setTimeout(() => { document.location.href = "/"; }, 500);
});

Template.userFormsLayout.helpers({
    languages() {
        return _.map(TAPi18n.getLanguages(), (lang, code) => {
            const tag = code;
            let name = lang.name;
            if (lang.name === 'br') {
                name = 'Brezhoneg';
            } else if (lang.name === 'ig') {
                name = 'Igbo';
            }
            return { tag, name };
        }).sort(function(a, b) {
            if (a.name === b.name) {
                return 0;
            } else {
                return a.name > b.name ? 1 : -1;
            }
        });
    },

    isCurrentLanguage() {
        const t9nTag = i18nTagToT9n(this.tag);
        const curLang = T9n.getLanguage() || 'es';
        return t9nTag === curLang;
    },

    isCas() {
        return Meteor.settings.public &&
            Meteor.settings.public.cas &&
            Meteor.settings.public.cas.loginUrl;
    },

    casSignInLabel() {
        return TAPi18n.__('casSignIn', {}, T9n.getLanguage() || 'es');
    },
});

Template.userFormsLayout.events({
    'change .js-userform-set-language' (evt) {
        const i18nTag = $(evt.currentTarget).val();
        T9n.setLanguage(i18nTagToT9n(i18nTag));
        evt.preventDefault();
    },
    'click button#cas' () {
        Meteor.loginWithCas(function() {
            if (FlowRouter.getRouteName() === 'atSignIn') {
                FlowRouter.go('/');
            }
        });
    },
});

Template.defaultLayout.events({
    'click .js-close-modal': () => {
        Modal.close();
    },
});