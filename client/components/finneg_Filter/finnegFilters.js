BlazeComponent.extendComponent({
    onCreated() {
        this.menuSelected = new ReactiveVar("tags");
        this.tagsSelected = new ReactiveVar("(0/0)");
        this.memebersSelected = new ReactiveVar("(0/0)");
        this.assingToSelected = new ReactiveVar("(0/0)");
        this.isBeginView = new ReactiveVar(true);
        this.currentBoard = Boards.findOne(Session.get('currentBoard'));
        if (!Filter.isActive()) {
            Filter.reset()
            this.setAllFiltersSelected()
        }
        this.getFiltersInfo()
    },
    getMenuSelected(menu) {
        return this.menuSelected.get() == menu;
    },
    getFiltersInfo() {
        let num = Filter.labelIds._selectedElements.length;
        let den = this.currentBoard.labels.length + 1;
        this.tagsSelected.set("(" + num.toString() + "/" + den.toString() + ")")

        num = Filter.members._selectedElements.length;
        den = this.currentBoard.members.length;
        this.memebersSelected.set("(" + num.toString() + "/" + den.toString() + ")")

        num = Filter.assignedTo._selectedElements.length + Filter.userId._selectedElements.length;
        den = this.currentBoard.members.length + 2;
        this.assingToSelected.set("(" + num.toString() + "/" + den.toString() + ")")

        if (this.currentBoard.labels.length + 1 == Filter.labelIds._selectedElements.length &&
            this.currentBoard.members.length == Filter.members._selectedElements.length &&
            this.currentBoard.members.length + 2 == Filter.assignedTo._selectedElements.length +
            Filter.userId._selectedElements.length)
            Filter.isAllSelected = true;
        else
            Filter.isAllSelected = false;
        console.log(Filter)
        Filter.resetExceptions();
    },
    setAllFiltersSelected() {
        Filter.labelIds.toggle(undefined);
        for (let i = 0; i < this.currentBoard.labels.length; i++) {
            if (!Filter.labelIds.isSelected(this.currentBoard.labels[i]._id)) {
                Filter.labelIds.toggle(this.currentBoard.labels[i]._id);
                Filter.resetExceptions();
            }
        }
        for (let i = 0; i < this.currentBoard.members.length; i++) {
            if (!Filter.members.isSelected(this.currentBoard.members[i].userId)) {
                Filter.members.toggle(this.currentBoard.members[i].userId);
                Filter.resetExceptions();
            }
        }
        Filter.assignedTo.toggle(undefined);
        Filter.userId.toggle(Meteor.userId());
        for (let i = 0; i < this.currentBoard.members.length; i++) {
            if (!Filter.assignedTo.isSelected(this.currentBoard.members[i].userId)) {
                Filter.assignedTo.toggle(this.currentBoard.members[i].userId);
                Filter.resetExceptions();
            }
        }
        this.getFiltersInfo()
    },
    events() {
        return [{
            'click .js-toggle-label-filter' (evt) {
                evt.preventDefault();
                Filter.labelIds.toggle(this.currentData()._id);
                Filter.resetExceptions();
                this.getFiltersInfo()
            },
            'click .js-toggle-member-filter' (evt) {
                evt.preventDefault();
                Filter.members.toggle(this.currentData()._id);
                Filter.resetExceptions();
                this.getFiltersInfo()
            },
            'click .js-toggle-assignedTo-filter' (evt) {
                evt.preventDefault();
                Filter.assignedTo.toggle(this.currentData()._id);
                Filter.resetExceptions();
                this.getFiltersInfo()
            },
            'click .js-toggle-assigned-filter' (evt) {
                evt.preventDefault();
                //Filter.members.toggle(this.currentData()._id);
                Filter.userId.toggle(Meteor.userId());
                Filter.resetExceptions();
                this.getFiltersInfo()
            },
            'click .js-toggle-custom-fields-filter' (evt) {
                evt.preventDefault();
                Filter.customFields.toggle(this.currentData()._id);
                Filter.resetExceptions();
            },
            'change .js-field-advanced-filter' (evt) {
                evt.preventDefault();
                Filter.advanced.set(this.find('.js-field-advanced-filter').value.trim());
                Filter.resetExceptions();
            },
            'click .js-clear-all' (evt) {
                evt.preventDefault();
                Filter.reset();
            },
            'click .js-filter-to-selection' (evt) {
                evt.preventDefault();
                const selectedCards = Cards.find(Filter.mongoSelector()).map((c) => {
                    return c._id;
                });
                MultiSelection.add(selectedCards);
            },
            'click .js-select-filter-tags' () {
                this.menuSelected.set("tags")
            },
            'click .js-select-filter-privacy' () {
                this.menuSelected.set("privacy")
            },
            'click .js-select-filter-assignedto' () {
                this.menuSelected.set("assignedto")
            },
            'click .js-select-filter-view' () {
                this.menuSelected.set("view")
            },
            'click .js-close-modal' () {
                Modal.close()
            }
        }];
    },
}).register('finnegFilter');

function mutateSelectedCards(mutationName, ...args) {
    Cards.find(MultiSelection.getMongoSelector()).forEach((card) => {
        card[mutationName](...args);
    });
}

BlazeComponent.extendComponent({
    mapSelection(kind, _id) {
        return Cards.find(MultiSelection.getMongoSelector()).map((card) => {
            const methodName = kind === 'label' ? 'hasLabel' : 'isAssigned';
            return card[methodName](_id);
        });
    },

    allSelectedElementHave(kind, _id) {
        if (MultiSelection.isEmpty())
            return false;
        else
            return _.every(this.mapSelection(kind, _id));
    },

    someSelectedElementHave(kind, _id) {
        if (MultiSelection.isEmpty())
            return false;
        else
            return _.some(this.mapSelection(kind, _id));
    },

    events() {
        return [{
            'click .js-toggle-label-multiselection' (evt) {
                const labelId = this.currentData()._id;
                const mappedSelection = this.mapSelection('label', labelId);

                if (_.every(mappedSelection)) {
                    mutateSelectedCards('removeLabel', labelId);
                } else if (_.every(mappedSelection, (bool) => !bool)) {
                    mutateSelectedCards('addLabel', labelId);
                } else {
                    const popup = Popup.open('finnegDisambiguateMultiLabel');
                    // XXX We need to have a better integration between the popup and the
                    // UI components systems.
                    popup.call(this.currentData(), evt);
                }
            },
            'click .js-toggle-member-multiselection' (evt) {
                const memberId = this.currentData()._id;
                const mappedSelection = this.mapSelection('member', memberId);
                if (_.every(mappedSelection)) {
                    mutateSelectedCards('unassignMember', memberId);
                } else if (_.every(mappedSelection, (bool) => !bool)) {
                    mutateSelectedCards('assignMember', memberId);
                } else {
                    const popup = Popup.open('finnegDisambiguateMultiMember');
                    // XXX We need to have a better integration between the popup and the
                    // UI components systems.
                    popup.call(this.currentData(), evt);
                }
            },
            'click .js-move-selection': Popup.open('finnegMoveSelection'),
            'click .js-archive-selection' () {
                mutateSelectedCards('archive');
                EscapeActions.executeUpTo('multiselection');
            },
        }];
    },
}).register('finnegMultiselectionPopupFilter');

Template.finnegDisambiguateMultiLabelPopup.events({
    'click .js-remove-label' () {
        mutateSelectedCards('removeLabel', this._id);
    },
    'click .js-add-label' () {
        mutateSelectedCards('addLabel', this._id);
    },
});

Template.finnegDisambiguateMultiLabelPopup.events({
    'click .js-unassign-member' () {
        mutateSelectedCards('assignMember', this._id);
    },
    'click .js-assign-member' () {
        mutateSelectedCards('unassignMember', this._id);
    },
});

Template.finnegMoveSelectionPopup.events({
    'click .js-select-list' () {
        mutateSelectedCards('move', this._id);
        EscapeActions.executeUpTo('multiselection');
    },
});

Template.finnegViewMenuPopup.events({
    'click .js-view-all' () {
        const currentUser = Meteor.user();
        currentUser.setBoardStatusView('all');
    },
    'click .js-view-pending' () {
        const currentUser = Meteor.user();
        currentUser.setBoardStatusView('pending');
    },
    'click .js-view-finished' () {
        const currentUser = Meteor.user();
        currentUser.setBoardStatusView('finished');
    },
});