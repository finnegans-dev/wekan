Template.finnegBoardMenuPopup.events({
    'click .js-rename-board': Popup.open('finnegBoardChangeTitle'),
    'click .js-custom-fields' () {
        Sidebar.setView('customFields');
        Popup.close();
    },
    'click .js-open-archives' () {
        Sidebar.setView('archives');
        Popup.close();
    },
    'click .js-importer' () {
        Popup.close();
        Modal.open('finneg-import');
    },
    'click .js-change-board-color': Popup.open('finnegBoardChangeColor'),
    'click .js-change-language': Popup.open('finnegChangeLanguage'),
    'click .js-archive-board ': Popup.afterConfirm('finnegArchiveBoard', function() {
        const currentBoard = Boards.findOne(Session.get('finnegCurrentBoard'));
        currentBoard.archive();
        // XXX We should have some kind of notification on top of the page to
        // confirm that the board was successfully archived.
        FlowRouter.go('home');
    }),
    'click .js-delete-board': Popup.afterConfirm('finnegDeleteBoard', function() {
        const currentBoard = Boards.findOne(Session.get('finnegCurrentBoard'));
        Popup.close();
        Boards.remove(currentBoard._id);
        FlowRouter.go('home');
    }),
    'click .js-outgoing-webhooks': Popup.open('finnegOutgoingWebhooks'),
    'click .js-import-board': Popup.open('finnegChooseBoardSource'),
    'click .js-subtask-settings': Popup.open('finnegBoardSubtaskSettings'),
});

Template.finnegBoardMenuPopup.helpers({
    exportUrl() {
        const params = {
            boardId: Session.get('currentBoard'),
        };
        const queryParams = {
            authToken: Accounts._storedLoginToken(),
        };
        return FlowRouter.path('/api/boards/:boardId/export', params, queryParams);
    },
    exportFilename() {
        const boardId = Session.get('currentBoard');
        return `wekan-export-board-${boardId}.json`;
    },
});

Template.finnegViewMenuPopup.events({
    'click .js-view-all' () {
        const currentUser = Meteor.user();
        currentUser.setBoardStatusView('all');
        Popup.close();
    },
    'click .js-view-pending' () {
        const currentUser = Meteor.user();
        currentUser.setBoardStatusView('pending');
        Popup.close();
    },
    'click .js-view-finished' () {
        const currentUser = Meteor.user();
        currentUser.setBoardStatusView('finished');
        Popup.close();
    },
});

Template.finnegViewMenuPopup.helpers({
    isSelected(view) {
        return (!Meteor.user().profile.boardStatusView && view === 'pending') || view == Meteor.user().profile.boardStatusView
    },
});

Template.finnegAddListPopup.events({

});

Template.finnegAddSwimlanePopup.events({

});

Template.finnegBoardChangeTitlePopup.events({
    submit(evt, tpl) {
        const newTitle = tpl.$('.js-board-name').val().trim();
        const newDesc = tpl.$('.js-board-desc').val().trim();
        if (newTitle) {
            this.rename(newTitle);
            this.setDescription(newDesc);
            Popup.close();
        }
        evt.preventDefault();
    },
});

BlazeComponent.extendComponent({
    onCreated() {
        const currentUser = Meteor.user();
        this.showAddSwimlaneInput = new ReactiveVar(false);
        this.showAddListInput = new ReactiveVar(false);
        // currentUser.setBoardView('board-view-swimlanes');
    },
    watchLevel() {
        const currentBoard = Boards.findOne(Session.get('currentBoard'));
        return currentBoard && currentBoard.getWatchLevel(Meteor.userId());
    },

    isStarred() {
        const boardId = Session.get('currentBoard');
        const user = Meteor.user();
        return user && user.hasStarred(boardId);
    },

    // Only show the star counter if the number of star is greater than 2
    showStarCounter() {
        const currentBoard = Boards.findOne(Session.get('currentBoard'));
        return currentBoard && currentBoard.stars >= 2;
    },

    events() {
        return [{
            'click .js-edit-board-title': Popup.open('finnegBoardChangeTitle'),
            'click .js-star-board' () {
                Meteor.user().toggleBoardStar(Session.get('finnegCurrentBoard'));
            },
            'click .js-open-board-menu': Popup.open('finnegBoardMenu'),
            'click .js-open-view-menu': Popup.open('finnegViewMenu'),
            'click .js-open-add-list' () {
                this.showAddListInput.set(true);
            },
            'click .js-open-add-swimlane' () {
                this.showAddSwimlaneInput.set(true);
            },
            'click .js-change-visibility': Popup.open('finnegBoardChangeVisibility'),
            'click .js-watch-board': Popup.open('finnegBoardChangeWatch'),
            'click .js-open-archived-board' () {
                Modal.open('finnegArchivedBoards');
            },
            'click .js-toggle-board-view' () {
                const currentUser = Meteor.user();
                if (currentUser.profile.boardView === 'board-view-swimlanes') {
                    currentUser.setBoardView('board-view-cal');
                } else if (currentUser.profile.boardView === 'board-view-lists') {
                    currentUser.setBoardView('board-view-swimlanes');
                } else if (currentUser.profile.boardView === 'board-view-cal') {
                    currentUser.setBoardView('board-view-lists');
                }
            },
            'click .js-open-filter-view' () {
                Sidebar.setView('filter');
            },
            'click .js-filter-reset' (evt) {
                evt.stopPropagation();
                Sidebar.setView();
                Filter.reset();
            },
            'click .js-open-search-view' () {
                Sidebar.setView('search');
            },
            'click .js-multiselection-activate' () {
                const currentCard = Session.get('currentCard');
                MultiSelection.activate();
                if (currentCard) {
                    MultiSelection.add(currentCard);
                }
            },
            'click .js-multiselection-reset' (evt) {
                evt.stopPropagation();
                MultiSelection.disable();
            },
            'click .js-log-in' () {
                FlowRouter.go('atSignIn');
            },
            'keydown .swimlane-name-input' (evt) {
                switch (evt.keyCode) {
                    case 13:
                        {
                            const newTitle = $('.swimlane-name-input').val().trim();
                            if (newTitle) {
                                Swimlanes.insert({
                                    title: newTitle,
                                    boardId: Session.get('currentBoard'),
                                    sort: $('.swimlane').length,
                                });
                            }
                            this.showAddSwimlaneInput.set(false)
                            break;
                        }
                    case 27:
                        {
                            this.showAddSwimlaneInput.set(false)
                            break;
                        }
                }
            },
            'focusout .swimlane-name-input' () {
                this.showAddSwimlaneInput.set(false)
            },
            'keydown .list-name-input' (evt) {
                switch (evt.keyCode) {
                    case 13:
                        {
                            const newTitle = $('.list-name-input').val().trim();
                            if (newTitle) {
                                Lists.insert({
                                    title: newTitle,
                                    boardId: Session.get('currentBoard'),
                                    sort: $('.list').length,
                                });
                            }
                            this.showAddListInput.set(false);
                            break;
                        }
                    case 27:
                        {
                            this.showAddListInput.set(false);
                            break;
                        }
                }
            },
            'focusout .list-name-input' () {
                this.showAddListInput.set(false)
            },
        }];
    },
}).register('finnegBoardHeaderBar');

Template.finnegBoardHeaderBar.helpers({
    canModifyBoard() {
        return Meteor.user() && Meteor.user().isBoardMember() && !Meteor.user().isCommentOnly();
    },

    isSwimlaneBoardView() {
        return Meteor.user().isSwimlaneBoardView();
    },

    isAdmin() {
        return Meteor.user().isBoardAdmin();
    }
});

BlazeComponent.extendComponent({
    backgroundColors() {
        return Boards.simpleSchema()._schema.color.allowedValues;
    },

    isSelected() {
        const currentBoard = Boards.findOne(Session.get('currentBoard'));
        return currentBoard.color === this.currentData().toString();
    },

    events() {
        return [{
            'click .js-select-background' (evt) {
                const currentBoard = Boards.findOne(Session.get('currentBoard'));
                const newColor = this.currentData().toString();
                currentBoard.setColor(newColor);
                evt.preventDefault();
            },
        }];
    },
}).register('finnegBoardChangeColorPopup');

BlazeComponent.extendComponent({
    onCreated() {
        this.currentBoard = Boards.findOne(Session.get('currentBoard'));
    },

    allowsSubtasks() {
        return this.currentBoard.allowsSubtasks;
    },

    isBoardSelected() {
        return this.currentBoard.subtasksDefaultBoardId === this.currentData()._id;
    },

    isNullBoardSelected() {
        return (this.currentBoard.subtasksDefaultBoardId === null) || (this.currentBoard.subtasksDefaultBoardId === undefined);
    },

    boards() {
        console.log('boards');
        return Boards.find({
            archived: false,
            'members.userId': Meteor.userId(),
            domains: { '$in': [Meteor.user().currentDomain] }
        }, {
            sort: ['title'],
        });
    },

    lists() {
        return Lists.find({
            boardId: this.currentBoard._id,
            archived: false,
        }, {
            sort: ['title'],
        });
    },

    hasLists() {
        return this.lists().count() > 0;
    },

    isListSelected() {
        return this.currentBoard.subtasksDefaultBoardId === this.currentData()._id;
    },

    presentParentTask() {
        let result = this.currentBoard.presentParentTask;
        if ((result === null) || (result === undefined)) {
            result = 'no-parent';
        }
        return result;
    },

    events() {
        return [{
            'click .js-field-has-subtasks' (evt) {
                evt.preventDefault();
                this.currentBoard.allowsSubtasks = !this.currentBoard.allowsSubtasks;
                this.currentBoard.setAllowsSubtasks(this.currentBoard.allowsSubtasks);
                $('.js-field-has-subtasks .materialCheckBox').toggleClass('is-checked', this.currentBoard.allowsSubtasks);
                $('.js-field-has-subtasks').toggleClass('is-checked', this.currentBoard.allowsSubtasks);
                $('.js-field-deposit-board').prop('disabled', !this.currentBoard.allowsSubtasks);
            },
            'change .js-field-deposit-board' (evt) {
                let value = evt.target.value;
                if (value === 'null') {
                    value = null;
                }
                this.currentBoard.setSubtasksDefaultBoardId(value);
                evt.preventDefault();
            },
            'change .js-field-deposit-list' (evt) {
                this.currentBoard.setSubtasksDefaultListId(evt.target.value);
                evt.preventDefault();
            },
            'click .js-field-show-parent-in-minicard' (evt) {
                const value = evt.target.id || $(evt.target).parent()[0].id || $(evt.target).parent()[0].parent()[0].id;
                const options = [
                    'prefix-with-full-path',
                    'prefix-with-parent',
                    'subtext-with-full-path',
                    'subtext-with-parent',
                    'no-parent'
                ];
                options.forEach(function(element) {
                    if (element !== value) {
                        $(`#${element} .materialCheckBox`).toggleClass('is-checked', false);
                        $(`#${element}`).toggleClass('is-checked', false);
                    }
                });
                $(`#${value} .materialCheckBox`).toggleClass('is-checked', true);
                $(`#${value}`).toggleClass('is-checked', true);
                this.currentBoard.setPresentParentTask(value);
                evt.preventDefault();
            },
        }];
    },
}).register('finnegBoardSubtaskSettingsPopup');

const CreateBoard = BlazeComponent.extendComponent({
    template() {
        return 'finnegCreateBoard';
    },

    onCreated() {
        this.visibilityMenuIsOpen = new ReactiveVar(false);
        this.visibility = new ReactiveVar('private');
        this.boardId = new ReactiveVar('');
        this.visibilityProjects = new ReactiveVar(false);
        this.projectsData = new ReactiveVar([]);
        this.url = Meteor.settings.public.ecoUrl;

        //this.projects =
        HTTP.get(this.url + '/api/1/teamplace/filters?diccAlias=PROYECTO&filtroString=TransaccionCategoria:-6&access_token=' + sessionStorage.getItem('token'),
            (error, response) => {
                if (!error) {
                    this.projectsData.set(response ? response.data ? response.data : [] : []);
                }
            });
    },

    getCaption(v) {
        if (v && v.startsWith('<') && v.indexOf("072C3E1X-9G8C-27IG-9A6C-99DEN6A173B3") != -1) {
            let start = v.indexOf("alt=\"");
            let aux = v.substr(v.indexOf("alt=") + "alt=\"".length);
            v = aux.substr(0, aux.indexOf("\""));
        }
        return v;
    },

    visibilityCheck() {
        return this.currentData() === this.visibility.get();
    },

    setVisibility(visibility) {
        this.visibility.set(visibility);
        this.visibilityMenuIsOpen.set(false);
    },

    toggleVisibilityMenu() {
        this.visibilityMenuIsOpen.set(!this.visibilityMenuIsOpen.get());
    },

    onSubmit(evt) {
        evt.preventDefault();
        const title = this.find('.js-new-board-title').value;
        const visibility = this.visibility.get();
        const template = this.find('.js-new-board-template').value;

        this.boardId.set(Boards.insert({
            title,
            permission: visibility,
        }));

        switch (template) {
            case 'kanban':
                this.createKanbanLists();
                Utils.goBoardId(this.boardId.get());
                break;
            case 'simple':
                this.createSimpleLists();
                Utils.goBoardId(this.boardId.get());
                break;
            case 'proyecto':
                this.createProjectLists();
                break;
            default:
                this.createDefaultSwimlane();
                Utils.goBoardId(this.boardId.get());
        }

    },

    createKanbanLists() {
        this.createDefaultSwimlane();
        this.createPendienteList(0);
        this.createEnCuersoList(1);
        this.createHechoList(2);
    },

    createSimpleLists() {
        this.createDefaultSwimlane();
        this.createPendienteList(0);
    },

    createProjectLists() {
        const project = this.find('.js-project-teamplace').value;
        this.createPendienteList(0);
        this.createEnCuersoList(1);
        this.createHechoList(2);
        HTTP.get(this.url + '/api/1/teamplace/filters?diccAlias=PROYECTOITEM&filtroString=ProyectoID:' + project + '&access_token=' + localStorage.getItem('token'),
            (error, response) => {
                if (error) {
                    this.createDefaultSwimlane();
                } else {
                    const items = response ? response.data ? response.data : [] : [];
                    if (items.length > 0) {
                        items.forEach(item => {
                            this.createSwimlane(this.getCaption(item.caption));
                        });
                    } else {
                        this.createDefaultSwimlane();
                    }
                }
                Utils.goBoardId(this.boardId.get());
            })
    },

    createPendienteList(order) {
        this.createList('PENDIENTE', order);
    },

    createEnCuersoList(order) {
        this.createList('EN CURSO', order);
    },

    createHechoList(order) {
        this.createList('HECHO', order);
    },

    createDefaultSwimlane() {
        this.createSwimlane('Default');
    },

    createList(list, order) {
        Lists.insert({
            title: list,
            boardId: this.boardId.get(),
            sort: order,
        });
    },

    createSwimlane(swimlane) {
        Swimlanes.insert({
            title: swimlane,
            boardId: this.boardId.get(),
        });
    },

    events() {
        return [{
            'click .js-select-visibility' () {
                this.setVisibility(this.currentData());
            },
            'click .js-change-visibility': this.toggleVisibilityMenu,
            'click .js-import': Popup.open('boardImportBoard'),
            submit: this.onSubmit,
            'click .js-import-board': Popup.open('chooseBoardSource'),
            'change .js-new-board-template' () {
                const template = this.find('.js-new-board-template').value;
                if (template == 'proyecto') {
                    const item = this.projectsData.get()[0];
                    if (item) {
                        this.find('.js-new-board-title').value = this.getCaption(item.caption);
                    }
                    this.visibilityProjects.set(true);

                } else {
                    this.visibilityProjects.set(false);
                }
            },
            'change .js-project-teamplace' () {
                const project = this.find('.js-project-teamplace').value;
                const item = this.projectsData.get().find(i => i.id == project);
                if (item) {
                    this.find('.js-new-board-title').value = this.getCaption(item.caption);
                }
            }
        }];
    },
}).register('finnegCreateBoardPopup');

BlazeComponent.extendComponent({
    template() {
        return 'finnegChooseBoardSource';
    },
}).register('finnegChooseBoardSourcePopup');

(class HeaderBarCreateBoard extends CreateBoard {
    onSubmit(evt) {
        super.onSubmit(evt);
        // Immediately star boards crated with the headerbar popup.
        Meteor.user().toggleBoardStar(this.boardId.get());
    }
}).register('finnegHeaderBarCreateBoardPopup');

BlazeComponent.extendComponent({
    visibilityCheck() {
        const currentBoard = Boards.findOne(Session.get('currentBoard'));
        return this.currentData() === currentBoard.permission;
    },

    selectBoardVisibility() {
        const currentBoard = Boards.findOne(Session.get('currentBoard'));
        const visibility = this.currentData();
        currentBoard.setVisibility(visibility);
        Popup.close();
    },

    events() {
        return [{
            'click .js-select-visibility': this.selectBoardVisibility,
        }];
    },
}).register('finnegBoardChangeVisibilityPopup');

BlazeComponent.extendComponent({
    watchLevel() {
        const currentBoard = Boards.findOne(Session.get('currentBoard'));
        return currentBoard.getWatchLevel(Meteor.userId());
    },

    watchCheck() {
        return this.currentData() === this.watchLevel();
    },

    events() {
        return [{
            'click .js-select-watch' () {
                const level = this.currentData();
                Meteor.call('watch', 'board', Session.get('currentBoard'), level, (err, ret) => {
                    if (!err && ret) Popup.close();
                });
            },
        }];
    },
}).register('finnegBoardChangeWatchPopup');

BlazeComponent.extendComponent({
    integrations() {
        const boardId = Session.get('currentBoard');
        return Integrations.find({ boardId: `${boardId}` }).fetch();
    },

    integration(id) {
        const boardId = Session.get('currentBoard');
        return Integrations.findOne({ _id: id, boardId: `${boardId}` });
    },

    events() {
        return [{
            'submit' (evt) {
                evt.preventDefault();
                const url = evt.target.url.value;
                const boardId = Session.get('currentBoard');
                let id = null;
                let integration = null;
                if (evt.target.id) {
                    id = evt.target.id.value;
                    integration = this.integration(id);
                    if (url) {
                        Integrations.update(integration._id, {
                            $set: {
                                url: `${url}`,
                            },
                        });
                    } else {
                        Integrations.remove(integration._id);
                    }
                } else if (url) {
                    Integrations.insert({
                        userId: Meteor.userId(),
                        enabled: true,
                        type: 'outgoing-webhooks',
                        url: `${url}`,
                        boardId: `${boardId}`,
                        activities: ['all'],
                    });
                }
                Popup.close();
            },
        }];
    },
}).register('finnegOutgoingWebhooksPopup');