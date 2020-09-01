BlazeComponent.extendComponent({
    editTitle(evt) {
        evt.preventDefault();
        const newTitle = this.childComponents('inlinedForm')[0].getValue().trim();
        const swimlane = this.currentData();
        if (newTitle) {
            swimlane.rename(newTitle.trim());
        }
    },

    events() {
        return [{
            'click .js-open-swimlane-menu': Popup.open('swimlaneAction'),
            'keydown .list-name-input' (evt) {
                switch (evt.keyCode) {
                    case 13:
                        {
                            this.submit;
                            break;
                        }
                    case 27:
                        {
                            break;
                        }
                }
            },
            submit: this.editTitle,
        }];
    },
}).register('finnegSwimlaneHeader');

Template.swimlaneActionPopup.events({
    'click .js-close-swimlane' (evt) {
        evt.preventDefault();
        this.archive();
        Popup.close();
    },
});