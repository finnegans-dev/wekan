Cards = new Mongo.Collection('cards');

// XXX To improve pub/sub performances a card document should include a
// de-normalized number of comments so we don't have to publish the whole list
// of comments just to display the number of them in the board view.
Cards.attachSchema(new SimpleSchema({
    title: {
        type: String,
        optional: true,
        defaultValue: '',
    },
    archived: {
        type: Boolean,
        autoValue() { // eslint-disable-line consistent-return
            if (this.isInsert && !this.isSet) {
                return false;
            }
        },
    },
    parentId: {
        type: String,
        optional: true,
        defaultValue: '',
    },
    listId: {
        type: String,
        optional: true,
        defaultValue: '',
    },
    swimlaneId: {
        type: String,
    },
    // The system could work without this `boardId` information (we could deduce
    // the board identifier from the card), but it would make the system more
    // difficult to manage and less efficient.
    boardId: {
        type: String,
        optional: true,
        defaultValue: '',
    },
    coverId: {
        type: String,
        optional: true,
        defaultValue: '',

    },
    createdAt: {
        type: Date,
        autoValue() { // eslint-disable-line consistent-return
            if (this.isInsert) {
                return new Date();
            } else {
                this.unset();
            }
        },
    },
    customFields: {
        type: [Object],
        optional: true,
        defaultValue: [],
    },
    'customFields.$': {
        type: new SimpleSchema({
            _id: {
                type: String,
                optional: true,
                defaultValue: '',
            },
            value: {
                type: Match.OneOf(String, Number, Boolean, Date),
                optional: true,
                defaultValue: '',
            },
        }),
    },
    dateLastActivity: {
        type: Date,
        autoValue() {
            return new Date();
        },
    },
    permission: {
        type: String,
        defaultValue: 'public',
        optional: true
    },
    description: {
        type: String,
        optional: true,
        defaultValue: '',
    },
    requestedBy: {
        type: String,
        optional: true,
        defaultValue: '',
    },
    assignedBy: {
        type: String,
        optional: true,
        defaultValue: '',
    },
    assignedTo: {
        type: String,
        optional: true
    },
    status: {
        type: String,
        optional: true
    },
    labelIds: {
        type: [String],
        optional: true,
        defaultValue: [],
    },
    members: {
        type: [String],
        optional: true,
        defaultValue: [],
    },
    receivedAt: {
        type: Date,
        optional: true,
    },
    startAt: {
        type: Date,
        optional: true,
    },
    dueAt: {
        type: Date,
        optional: true,
    },
    endAt: {
        type: Date,
        optional: true,
    },
    spentTime: {
        type: Number,
        decimal: true,
        optional: true,
        defaultValue: 0,
    },
    isOvertime: {
        type: Boolean,
        defaultValue: false,
        optional: true,
    },
    // XXX Should probably be called `authorId`. Is it even needed since we have
    // the `members` field?
    userId: {
        type: String,
        autoValue() { // eslint-disable-line consistent-return
            if (this.isInsert && !this.isSet) {
                return this.userId;
            }
        },
    },
    sort: {
        type: Number,
        decimal: true,
        defaultValue: '',
    },
    subtaskSort: {
        type: Number,
        decimal: true,
        defaultValue: -1,
        optional: true,
    },
    type: {
        type: String,
        defaultValue: '',
    },
    linkedId: {
        type: String,
        optional: true,
        defaultValue: '',
    },
}));

Cards.allow({
    insert(userId, doc) {
        return allowIsBoardMember(userId, Boards.findOne(doc.boardId));
    },
    update(userId, doc) {
        return allowIsBoardMember(userId, Boards.findOne(doc.boardId));
    },
    remove(userId, doc) {
        return allowIsBoardMember(userId, Boards.findOne(doc.boardId));
    },
    fetch: ['boardId'],
});

Cards.helpers({
    list() {
        return Lists.findOne(this.listId);
    },

    board() {
        return Boards.findOne(this.boardId);
    },

    labels() {
        const boardLabels = this.board().labels;
        const cardLabels = _.filter(boardLabels, (label) => {
            return _.contains(this.labelIds, label._id);
        });
        return cardLabels;
    },

    hasLabel(labelId) {
        return _.contains(this.labelIds, labelId);
    },

    user() {
        return Users.findOne(this.userId);
    },

    isAssigned(memberId) {
        return _.contains(this.getMembers(), memberId);
    },

    activities() {
        if (this.isLinkedCard()) {
            return Activities.find({ cardId: this.linkedId }, { sort: { createdAt: -1 } });
        } else if (this.isLinkedBoard()) {
            return Activities.find({ boardId: this.linkedId }, { sort: { createdAt: -1 } });
        } else {
            return Activities.find({ cardId: this._id }, { sort: { createdAt: -1 } });
        }
    },

    comments() {
        if (this.isLinkedCard()) {
            return CardComments.find({ cardId: this.linkedId }, { sort: { createdAt: -1 } });
        } else {
            return CardComments.find({ cardId: this._id }, { sort: { createdAt: -1 } });
        }
    },

    attachments() {
        if (this.isLinkedCard()) {
            return Attachments.find({ cardId: this.linkedId }, { sort: { uploadedAt: -1 } });
        } else {
            return Attachments.find({ cardId: this._id }, { sort: { uploadedAt: -1 } });
        }
    },

    cover() {
        const cover = Attachments.findOne(this.coverId);
        // if we return a cover before it is fully stored, we will get errors when we try to display it
        // todo XXX we could return a default "upload pending" image in the meantime?
        return cover && cover.url() && cover;
    },

    isFinished() {
        return this.status === 'finished';
    },

    checklists() {
        if (this.isLinkedCard()) {
            return Checklists.find({ cardId: this.linkedId }, { sort: { sort: 1 } });
        } else {
            return Checklists.find({ cardId: this._id }, { sort: { sort: 1 } });
        }
    },

    checklistItemCount() {
        const checklists = this.checklists().fetch();
        return checklists.map((checklist) => {
            return checklist.itemCount();
        }).reduce((prev, next) => {
            return prev + next;
        }, 0);
    },

    checklistFinishedCount() {
        const checklists = this.checklists().fetch();
        return checklists.map((checklist) => {
            return checklist.finishedCount();
        }).reduce((prev, next) => {
            return prev + next;
        }, 0);
    },

    checklistFinished() {
        return this.hasChecklist() && this.checklistItemCount() === this.checklistFinishedCount();
    },

    hasChecklist() {
        return this.checklistItemCount() !== 0;
    },

    isPublic() {
        return this.permission == 'public' || !this.permission
    },

    isPrivate() {
        return !this.isPublic();
    },

    subtasks() {
        return Cards.find({
            parentId: this._id,
            archived: false,
        }, { sort: { sort: 1 } });
    },

    allSubtasks() {
        return Cards.find({
            parentId: this._id,
            archived: false,
        }, { sort: { sort: 1 } });
    },

    subtasksCount() {
        return Cards.find({
            parentId: this._id,
            archived: false,
        }).count();
    },

    subtasksFinishedCount() {
        return Cards.find({
            parentId: this._id,
            archived: true
        }).count();
    },

    subtasksFinished() {
        const finishCount = this.subtasksFinishedCount();
        return finishCount > 0 && this.subtasksCount() === finishCount;
    },

    allowsSubtasks() {
        return this.subtasksCount() !== 0;
    },

    customFieldIndex(customFieldId) {
        return _.pluck(this.customFields, '_id').indexOf(customFieldId);
    },

    // customFields with definitions
    customFieldsWD() {

        // get all definitions
        const definitions = CustomFields.find({
            boardId: this.boardId,
        }).fetch();

        // match right definition to each field
        if (!this.customFields) return [];
        return this.customFields.map((customField) => {
            const definition = definitions.find((definition) => {
                return definition._id === customField._id;
            });
            //search for "True Value" which is for DropDowns other then the Value (which is the id)
            let trueValue = customField.value;
            if (definition.settings.dropdownItems && definition.settings.dropdownItems.length > 0) {
                for (let i = 0; i < definition.settings.dropdownItems.length; i++) {
                    if (definition.settings.dropdownItems[i]._id === customField.value) {
                        trueValue = definition.settings.dropdownItems[i].name;
                    }
                }
            }
            return {
                _id: customField._id,
                value: customField.value,
                trueValue,
                definition,
            };
        });

    },

    absoluteUrl() {
        const board = this.board();
        return FlowRouter.url('card', {
            boardId: board._id,
            slug: board.slug,
            cardId: this._id,
        });
    },

    canBeRestored() {
        const list = Lists.findOne({ _id: this.listId });
        if (!list.getWipLimit('soft') && list.getWipLimit('enabled') && list.getWipLimit('value') === list.cards().count()) {
            return false;
        }
        return true;
    },

    parentCard() {
        if (this.parentId === '') {
            return null;
        }
        return Cards.findOne(this.parentId);
    },

    parentCardName() {
        let result = '';
        if (this.parentId !== '') {
            const card = Cards.findOne(this.parentId);
            if (card) {
                result = card.title;
            }
        }
        return result;
    },

    parentListId() {
        const result = [];
        let crtParentId = this.parentId;
        while (crtParentId !== '') {
            const crt = Cards.findOne(crtParentId);
            if ((crt === null) || (crt === undefined)) {
                // maybe it has been deleted
                break;
            }
            if (crtParentId in result) {
                // circular reference
                break;
            }
            result.unshift(crtParentId);
            crtParentId = crt.parentId;
        }
        return result;
    },

    parentList() {
        const resultId = [];
        const result = [];
        let crtParentId = this.parentId;
        while (crtParentId !== '') {
            const crt = Cards.findOne(crtParentId);
            if ((crt === null) || (crt === undefined)) {
                // maybe it has been deleted
                break;
            }
            if (crtParentId in resultId) {
                // circular reference
                break;
            }
            resultId.unshift(crtParentId);
            result.unshift(crt);
            crtParentId = crt.parentId;
        }
        return result;
    },

    parentString(sep) {
        return this.parentList().map(function(elem) {
            return elem.title;
        }).join(sep);
    },

    isTopLevel() {
        return this.parentId === '';
    },

    isLinkedCard() {
        return this.type === 'cardType-linkedCard';
    },

    isLinkedBoard() {
        return this.type === 'cardType-linkedBoard';
    },

    isLinked() {
        return this.isLinkedCard() || this.isLinkedBoard();
    },

    setDescription(description) {
        if (this.isLinkedCard()) {
            return Cards.update({ _id: this.linkedId }, { $set: { description } });
        } else if (this.isLinkedBoard()) {
            return Boards.update({ _id: this.linkedId }, { $set: { description } });
        } else {
            return Cards.update({ _id: this._id }, { $set: { description } });
        }
    },

    getDescription() {
        if (this.isLinkedCard()) {
            const card = Cards.findOne({ _id: this.linkedId });
            if (card && card.description)
                return card.description;
            else
                return null;
        } else if (this.isLinkedBoard()) {
            const board = Boards.findOne({ _id: this.linkedId });
            if (board && board.description)
                return board.description;
            else
                return null;
        } else if (this.description) {
            return this.description;
        } else {
            return null;
        }
    },

    getMembers() {
        if (this.isLinkedCard()) {
            const card = Cards.findOne({ _id: this.linkedId });
            return card.members;
        } else if (this.isLinkedBoard()) {
            const board = Boards.findOne({ _id: this.linkedId });
            return board.activeMembers().map((member) => {
                return member.userId;
            });
        } else {
            return this.members;
        }
    },

    getAssignedTo() {
        let user = Users.findOne({ _id: this.assignedTo });
        return user ? user.username : null;
    },

    removeAssignedTo() {
        return Cards.update(this._id, {
            $set: {
                'assignedTo': null
            }
        })
    },

    isNotAssigned() {
        return !this.getAssignedTo();
    },

    assignMember(memberId) {
        if (this.isLinkedCard()) {
            return Cards.update({ _id: this.linkedId }, { $addToSet: { members: memberId } });
        } else if (this.isLinkedBoard()) {
            const board = Boards.findOne({ _id: this.linkedId });
            return board.addMember(memberId);
        } else {
            return Cards.update({ _id: this._id }, { $addToSet: { members: memberId } });
        }
    },

    unassignMember(memberId) {
        if (this.isLinkedCard()) {
            return Cards.update({ _id: this.linkedId }, { $pull: { members: memberId } });
        } else if (this.isLinkedBoard()) {
            const board = Boards.findOne({ _id: this.linkedId });
            return board.removeMember(memberId);
        } else {
            return Cards.update({ _id: this._id }, { $pull: { members: memberId } });
        }
    },

    toggleMember(memberId) {
        if (this.getMembers() && this.getMembers().indexOf(memberId) > -1) {
            return this.unassignMember(memberId);
        } else {
            return this.assignMember(memberId);
        }
    },

    setAssignedTo(assignedTo) {
        let user = Users.findOne({ _id: localStorage.getItem('Meteor.userId:/:/wekan') });
        let userAssigned = Users.findOne({ _id: assignedTo });
        let board = this.board();
        let prefix = Meteor.settings.public.ecoUrl;

        let token = sessionStorage.getItem('token');
        let domain = sessionStorage.getItem('currentdomain');
        let notifyUrl = `${prefix}api/1/notifications/notify?access_token=${token}`;
        let userUrl = `${prefix}api/1/users/${domain}/${user.username}?access_token=${token}`;

        let notificationData = {
            product: "ecoTasks",
            event: "assignment",
            subject: "",
            message: "",
            destination: "",
            redirect: `tareas;boardId=${board._id};boardTitle=${board.title};cardId=${this._id}`
        };

        if (!!userAssigned) {
            HTTP.get(userUrl, (error, response) => {
                if (!error) {
                    notificationData.destination = userAssigned.username;
                    notificationData.message = response.data.firstName + ' ' + response.data.lastName + ' te asignó una nueva tarea'

                    HTTP.post(notifyUrl, { data: notificationData }, function(err, data) {
                        if (err) {
                            console.log(err);
                        }
                    });
                }
            });
        }

        return Cards.update({ _id: this._id }, { $set: { assignedTo } });
    },

    isAssigned(userID) {
        return userID === this.assignedTo;
    },

    getReceived() {
        if (this.isLinkedCard()) {
            const card = Cards.findOne({ _id: this.linkedId });
            return card.receivedAt;
        } else {
            return this.receivedAt;
        }
    },

    setReceived(receivedAt) {
        if (this.isLinkedCard()) {
            return Cards.update({ _id: this.linkedId }, { $set: { receivedAt } });
        } else {
            return Cards.update({ _id: this._id }, { $set: { receivedAt } });
        }
    },

    getStart() {
        if (this.isLinkedCard()) {
            const card = Cards.findOne({ _id: this.linkedId });
            return card.startAt;
        } else if (this.isLinkedBoard()) {
            const board = Boards.findOne({ _id: this.linkedId });
            return board.startAt;
        } else {
            return this.startAt;
        }
    },

    setStart(startAt) {
        if (this.isLinkedCard()) {
            return Cards.update({ _id: this.linkedId }, { $set: { startAt } });
        } else if (this.isLinkedBoard()) {
            return Boards.update({ _id: this.linkedId }, { $set: { startAt } });
        } else {
            return Cards.update({ _id: this._id }, { $set: { startAt } });
        }
    },

    getDue() {
        if (this.isLinkedCard()) {
            const card = Cards.findOne({ _id: this.linkedId });
            return card.dueAt;
        } else if (this.isLinkedBoard()) {
            const board = Boards.findOne({ _id: this.linkedId });
            return board.dueAt;
        } else {
            return this.dueAt;
        }
    },

    setDue(dueAt) {
        if (this.isLinkedCard()) {
            return Cards.update({ _id: this.linkedId }, { $set: { dueAt } });
        } else if (this.isLinkedBoard()) {
            return Boards.update({ _id: this.linkedId }, { $set: { dueAt } });
        } else {
            return Cards.update({ _id: this._id }, { $set: { dueAt } });
        }
    },

    getEnd() {
        if (this.isLinkedCard()) {
            const card = Cards.findOne({ _id: this.linkedId });
            return card.endAt;
        } else if (this.isLinkedBoard()) {
            const board = Boards.findOne({ _id: this.linkedId });
            return board.endAt;
        } else {
            return this.endAt;
        }
    },

    setEnd(endAt) {
        if (this.isLinkedCard()) {
            return Cards.update({ _id: this.linkedId }, { $set: { endAt } });
        } else if (this.isLinkedBoard()) {
            return Boards.update({ _id: this.linkedId }, { $set: { endAt } });
        } else {
            return Cards.update({ _id: this._id }, { $set: { endAt } });
        }
    },

    getIsOvertime() {
        if (this.isLinkedCard()) {
            const card = Cards.findOne({ _id: this.linkedId });
            return card.isOvertime;
        } else if (this.isLinkedBoard()) {
            const board = Boards.findOne({ _id: this.linkedId });
            return board.isOvertime;
        } else {
            return this.isOvertime;
        }
    },

    setIsOvertime(isOvertime) {
        if (this.isLinkedCard()) {
            return Cards.update({ _id: this.linkedId }, { $set: { isOvertime } });
        } else if (this.isLinkedBoard()) {
            return Boards.update({ _id: this.linkedId }, { $set: { isOvertime } });
        } else {
            return Cards.update({ _id: this._id }, { $set: { isOvertime } });
        }
    },

    getSpentTime() {
        if (this.isLinkedCard()) {
            const card = Cards.findOne({ _id: this.linkedId });
            return card.spentTime;
        } else if (this.isLinkedBoard()) {
            const board = Boards.findOne({ _id: this.linkedId });
            return board.spentTime;
        } else {
            return this.spentTime;
        }
    },

    setSpentTime(spentTime) {
        if (this.isLinkedCard()) {
            return Cards.update({ _id: this.linkedId }, { $set: { spentTime } });
        } else if (this.isLinkedBoard()) {
            return Boards.update({ _id: this.linkedId }, { $set: { spentTime } });
        } else {
            return Cards.update({ _id: this._id }, { $set: { spentTime } });
        }
    },

    getId() {
        if (this.isLinked()) {
            return this.linkedId;
        } else {
            return this._id;
        }
    },

    getTitle() {
        if (this.isLinkedCard()) {
            const card = Cards.findOne({ _id: this.linkedId });
            return card.title;
        } else if (this.isLinkedBoard()) {
            const board = Boards.findOne({ _id: this.linkedId });
            return board.title;
        } else {
            return this.title;
        }
    },

    getBoardTitle() {
        if (this.isLinkedCard()) {
            const card = Cards.findOne({ _id: this.linkedId });
            const board = Boards.findOne({ _id: card.boardId });
            return board.title;
        } else if (this.isLinkedBoard()) {
            const board = Boards.findOne({ _id: this.linkedId });
            return board.title;
        } else {
            const board = Boards.findOne({ _id: this.boardId });
            return board.title;
        }
    },

    setTitle(title) {
        if (this.isLinkedCard()) {
            return Cards.update({ _id: this.linkedId }, { $set: { title } });
        } else if (this.isLinkedBoard()) {
            return Boards.update({ _id: this.linkedId }, { $set: { title } });
        } else {
            let card = Cards.findOne({ _id: this._id });
            let userAssigned = Users.findOne({ _id: card.assignedTo });
            let user = Users.findOne({ _id: localStorage.getItem('Meteor.userId:/:/wekan') });
            let board = this.board();

            let prefix = Meteor.settings.public.ecoUrl;
            let token = sessionStorage.getItem('token');
            let domain = sessionStorage.getItem('currentdomain');

            let notifyUrl = `${prefix}api/1/notifications/notify?access_token=${token}`;
            let userUrl = `${prefix}api/1/users/${domain}/${user.username}?access_token=${token}`;

            let notificationData = {
                product: "ecoTasks",
                event: "modification",
                subject: "",
                message: "",
                destination: "",
                redirect: `tareas;boardId=${board._id};boardTitle=${board.title};cardId=${this._id}`
            };

            if (!!userAssigned) {
                HTTP.get(userUrl, (error, response) => {
                    if (!error) {
                        notificationData.destination = userAssigned.username;
                        notificationData.message = response.data.firstName + ' ' + response.data.lastName + ' modificó una tarea que tenés asignada'

                        HTTP.post(notifyUrl, { data: notificationData }, function(err, data) {
                            if (err) {
                                console.log(err);
                            }
                        });
                    }
                });
            }

            return Cards.update({ _id: this._id }, { $set: { title } });
        }
    },

    getArchived() {
        if (this.isLinkedCard()) {
            const card = Cards.findOne({ _id: this.linkedId });
            return card.archived;
        } else if (this.isLinkedBoard()) {
            const board = Boards.findOne({ _id: this.linkedId });
            return board.archived;
        } else {
            return this.archived;
        }
    },

    setRequestedBy(requestedBy) {
        if (this.isLinkedCard()) {
            return Cards.update({ _id: this.linkedId }, { $set: { requestedBy } });
        } else {
            return Cards.update({ _id: this._id }, { $set: { requestedBy } });
        }
    },

    getRequestedBy() {
        return Users.findOne({ _id: this.userId }).username;
        /*if (this.isLinkedCard()) {
          const card = Cards.findOne({ _id: this.linkedId });
          return card.requestedBy;
        } else  {
          return this.userId;
        }*/
    },

    setAssignedBy(assignedBy) {
        if (this.isLinkedCard()) {
            return Cards.update({ _id: this.linkedId }, { $set: { assignedBy } });
        } else {
            return Cards.update({ _id: this._id }, { $set: { assignedBy } });
        }
    },

    getAssignedBy() {
        if (this.isLinkedCard()) {
            const card = Cards.findOne({ _id: this.linkedId });
            return card.assignedBy;
        } else {
            return this.assignedBy;
        }
    },
});

Cards.mutations({
    applyToChildren(funct) {
        Cards.find({ parentId: this._id }).forEach((card) => {
            funct(card);
        });
    },

    archive() {
        this.applyToChildren((card) => { return card.archive(); });
        return { $set: { archived: true } };
    },

    restore() {
        this.applyToChildren((card) => { return card.restore(); });
        return { $set: { archived: false } };
    },

    move(swimlaneId, listId, sortIndex) {
        const list = Lists.findOne(listId);
        const mutatedFields = {
            swimlaneId,
            listId,
            boardId: list.boardId,
            sort: sortIndex,
        };

        return { $set: mutatedFields };
    },

    addLabel(labelId) {
        return { $addToSet: { labelIds: labelId } };
    },

    removeLabel(labelId) {
        return { $pull: { labelIds: labelId } };
    },

    toggleLabel(labelId) {
        if (this.labelIds && this.labelIds.indexOf(labelId) > -1) {
            return this.removeLabel(labelId);
        } else {
            return this.addLabel(labelId);
        }
    },

    assignCustomField(customFieldId) {
        return { $addToSet: { customFields: { _id: customFieldId, value: null } } };
    },

    unassignCustomField(customFieldId) {
        return { $pull: { customFields: { _id: customFieldId } } };
    },

    toggleCustomField(customFieldId) {
        if (this.customFields && this.customFieldIndex(customFieldId) > -1) {
            return this.unassignCustomField(customFieldId);
        } else {
            return this.assignCustomField(customFieldId);
        }
    },

    setCustomField(customFieldId, value) {
        // todo
        const index = this.customFieldIndex(customFieldId);
        if (index > -1) {
            const update = { $set: {} };
            update.$set[`customFields.${index}.value`] = value;
            return update;
        }
        // TODO
        // Ignatz 18.05.2018: Return null to silence ESLint. No Idea if that is correct
        return null;
    },

    setCover(coverId) {
        return { $set: { coverId } };
    },

    unsetCover() {
        return { $unset: { coverId: '' } };
    },

    setParentId(parentId) {
        return { $set: { parentId } };
    },
});


//FUNCTIONS FOR creation of Activities

function cardMove(userId, doc, fieldNames, oldListId, oldSwimlaneId) {
    if ((_.contains(fieldNames, 'listId') && doc.listId !== oldListId) ||
        (_.contains(fieldNames, 'swimlaneId') && doc.swimlaneId !== oldSwimlaneId)) {
        Activities.insert({
            userId,
            oldListId,
            activityType: 'moveCard',
            listId: doc.listId,
            boardId: doc.boardId,
            cardId: doc._id,
            swimlaneId: doc.swimlaneId,
            oldSwimlaneId,
        });
    }
}

function cardState(userId, doc, fieldNames) {
    if (_.contains(fieldNames, 'archived')) {
        if (doc.archived) {
            Activities.insert({
                userId,
                activityType: 'archivedCard',
                boardId: doc.boardId,
                listId: doc.listId,
                cardId: doc._id,
            });
        } else {
            Activities.insert({
                userId,
                activityType: 'restoredCard',
                boardId: doc.boardId,
                listId: doc.listId,
                cardId: doc._id,
            });
        }
    }
}

function cardMembers(userId, doc, fieldNames, modifier) {
    if (!_.contains(fieldNames, 'members'))
        return;
    let memberId;
    // Say hello to the new member
    if (modifier.$addToSet && modifier.$addToSet.members) {
        memberId = modifier.$addToSet.members;
        if (!_.contains(doc.members, memberId)) {
            Activities.insert({
                userId,
                memberId,
                activityType: 'joinMember',
                boardId: doc.boardId,
                cardId: doc._id,
            });
        }
    }

    // Say goodbye to the former member
    if (modifier.$pull && modifier.$pull.members) {
        memberId = modifier.$pull.members;
        // Check that the former member is member of the card
        if (_.contains(doc.members, memberId)) {
            Activities.insert({
                userId,
                memberId,
                activityType: 'unjoinMember',
                boardId: doc.boardId,
                cardId: doc._id,
            });
        }
    }
}

function cardCreation(userId, doc) {
    Activities.insert({
        userId,
        activityType: 'createCard',
        boardId: doc.boardId,
        listId: doc.listId,
        cardId: doc._id,
        swimlaneId: doc.swimlaneId,
    });
}

function cardRemover(userId, doc) {
    Activities.remove({
        cardId: doc._id,
    });
    Checklists.remove({
        cardId: doc._id,
    });
    Subtasks.remove({
        cardId: doc._id,
    });
    CardComments.remove({
        cardId: doc._id,
    });
    Attachments.remove({
        cardId: doc._id,
    });
}

function getDueAtHTML(dueAt) {
    if (!dueAt || dueAt === 'Sin Fecha') {
        return `<div class="tag tag-green">Sin fecha</div>`;
    }

    const dueDate = changeDateFormat(dueAt, 'yyyy-mm-dd');

    const differenceInTime = new Date(dueDate).getTime() - new Date().getTime();
    const differenceInDays = Math.ceil(differenceInTime / getOneDayInMilliseconds());

    dueAt = changeDateFormat(dueAt, 'dd-mm-yyyy');

    if (differenceInDays > 2) {
        return `<div class="tag tag-green">${ dueAt }</div>`;
    }

    if (differenceInDays > -1 ) {
        return `<div class="tag tag-yellow">${ dueAt }</div>`;
    }

    return `<div class="tag tag-red">${ dueAt }</div>`;
}

function getOneDayInMilliseconds() {
    return 1000 * 60 * 60 * 24;
}

function changeDateFormat(date, format) {
    let day = date.getDate();
    // Los meses arrancan desde 0
    let month = date.getMonth() + 1;
    let year = date.getFullYear();

    if (day < 10) {
        day = '0' + day;
    }

    if (month < 10) {
        month = '0' + month;
    }

    switch (format) {
        case 'dd-mm-yyyy':
            return `${ day }-${ month }-${ year }`;
        case 'yyyy-mm-dd':
            return `${ year }-${ month }-${ day }`;;
    }

    return null;
}

function getUserHTML(userId) {
    let userHTML;

    if (userId) {

        const user = Users.findOne({ _id: userId });

        let prefix = Meteor.settings.public.ecoUrl;

        // Esto es para probarlo en localhost
        if (!prefix)
            prefix = 'https://go-test.finneg.com/';

        const url = `${prefix}api/1/users/go/profile/picture/${user.username}`;

        if (user.profilePicture) {
            userHTML = `<img class="noAvatar avatarStyles" src="${ url }" alt="${ user.username }">`;
        } else {
            const initials = getUserInitials(user.username);
            userHTML = `<div id="profile" class="noAvatar avatarStyles color0">${ initials }</div>`;
        }

    } else {
        userHTML = 'No asignado';
    }

    return userHTML;
}

function getUserInitials(username) {
    let initials = 'NN';
    const firstInitial = username.charAt(0);
    const secondInitial = username.charAt(1);

    if (firstInitial && secondInitial)
        initials = firstInitial.toUpperCase() + secondInitial.toUpperCase();

    return initials;
}

if (Meteor.isServer) {
    // Cards are often fetched within a board, so we create an index to make these
    // queries more efficient.
    Meteor.startup(() => {
        Cards._collection._ensureIndex({ boardId: 1, createdAt: -1 });
        // https://github.com/wekan/wekan/issues/1863
        // Swimlane added a new field in the cards collection of mongodb named parentId.
        // When loading a board, mongodb is searching for every cards, the id of the parent (in the swinglanes collection).
        // With a huge database, this result in a very slow app and high CPU on the mongodb side.
        // To correct it, add Index to parentId:
        Cards._collection._ensureIndex({ parentId: 1 });
    });

    Cards.after.insert((userId, doc) => {
        cardCreation(userId, doc);
    });

    // New activity for card (un)archivage
    Cards.after.update((userId, doc, fieldNames) => {
        cardState(userId, doc, fieldNames);
    });

    //New activity for card moves
    Cards.after.update(function(userId, doc, fieldNames) {
        const oldListId = this.previous.listId;
        const oldSwimlaneId = this.previous.swimlaneId;
        cardMove(userId, doc, fieldNames, oldListId, oldSwimlaneId);
    });

    // Add a new activity if we add or remove a member to the card
    Cards.before.update((userId, doc, fieldNames, modifier) => {
        cardMembers(userId, doc, fieldNames, modifier);
    });

    // Remove all activities associated with a card if we remove the card
    // Remove also card_comments / checklists / attachments
    Cards.after.remove((userId, doc) => {
        cardRemover(userId, doc);
    });
}

//LISTS REST API
if (Meteor.isServer) {

    JsonRoutes.add('GET', '/api/boards/:boardId/cards', function(req, res) {
        try {
            const paramBoardId = req.params.boardId;

            if (!req.query.userId) {
                return JsonRoutes.sendResult(res, {
                    code: 403,
                    data: {
                        status: 'Forbidden'
                    }
                });
            }

            const tasks = [];

            const board = Boards.findOne({ _id: paramBoardId, archived: false });

            const lists = Lists.find({ boardId: paramBoardId, archived: false }).map(lists => {
                return {
                    lists
                }
            });

            const cardsByList = [];

            for (const list of lists) {
                const documentList = list.lists;
                const cards = Cards.find({ boardId: paramBoardId,  listId: documentList._id, archived: false }).map(cards => {
                    return {
                        cards
                    }
                });

                for (const card of cards) {
                    card.cards.listTitle = documentList.title;
                    cardsByList.push(card);
                }

            }

            for (const card of cardsByList) {
                const documentCard = card.cards;
                const swimlane = Swimlanes.findOne({ _id: documentCard.swimlaneId, boardId: paramBoardId, archived: false });

                documentCard.swimlaneTitle = swimlane.title;

                documentCard.dueAt = getDueAtHTML(documentCard.dueAt);

                documentCard.assignedTo = getUserHTML(documentCard.assignedTo);

                const currentCardBoard = Boards.findOne({ _id: documentCard.boardId });

                let labels = '<div class="container-tags">';

                if (currentCardBoard.labels && documentCard.labelIds) {
                    for (const label of currentCardBoard.labels) {
                        if (documentCard.labelIds.indexOf(label._id) != -1) {
                            labels += '<div class="tags tags-' + label.color + '">' + label.name + '</div>';
                        }
                    }
                }

                labels += '</div>';

                tasks.push({
                    boardId: documentCard.boardId,
                    boardTitle: board.title,
                    cardId: documentCard._id,
                    cardTitle: documentCard.title,
                    cardDescription: documentCard.description,
                    topicId: documentCard.swimlaneId,
                    topicTitle: documentCard.swimlaneTitle,
                    phaseId: documentCard.listId,
                    phaseTitle: documentCard.listTitle,
                    assignedTo: documentCard.assignedTo,
                    status: documentCard.status,
                    dueAt: documentCard.dueAt,
                    labels: labels
                });
            }

            JsonRoutes.sendResult(res, {
                code: 200,
                data: tasks
            });
        }
        catch (error) {
            JsonRoutes.sendResult(res, {
                code: 500,
                data: error,
            });
        }
    });

    JsonRoutes.add('GET', '/api/report/cards/week', function(req, res) {

        if (!req.userId) {
            return JsonRoutes.sendResult(res, {
                code: 403,
                data: {
                    status: 'forbidden'
                }
            });
        }

        const boards = Boards.find({
            archived: false,
            domains: { '$in': [Users.findOne(req.userId).currentDomain] },
            $or: [
                { members: { $elemMatch: { userId: req.userId, isActive: true } } },
            ],
        }).map(doc => {
            return {
                _id: doc._id,
                title: doc.title,
                labels: doc.labels,
                context: doc.context
            }
        });

        let boardIds = [];
        boards.forEach(b => {
            boardIds.push(b._id);
        })

        let query = {
            boardId: {
                $in: boardIds
            },
            status: {
                $not: {
                    $eq: 'finished'
                }
            },
            assignedTo: req.userId
        };

        if (req.query.assignedBy) {
            let user = Users.findOne({ username: req.query.assignedBy });
            if (user) {
                query.userId = user._id;
            }
        }
        let parseDate = function(date) {
            let object = {};
            try {
                let currStart = new Date();
                currStart.setHours(0, 0, 0, 0);
                let currEnd = new Date();
                currEnd.setHours(23, 59, 59);
                let firstWeekCurrDay = currStart.getDate() - currStart.getDay();
                let lastWeekCurrDay = firstWeekCurrDay + 6;
                let firstDayWeek = new Date();
                firstDayWeek.setDate(firstWeekCurrDay);
                let lastDayWeek = new Date();
                lastDayWeek.setDate(lastWeekCurrDay);
                let firstDayMonth = new Date();
                firstDayMonth.setDate(1);
                let lastDayMonth = new Date();
                lastDayMonth.setMonth(lastDayMonth.getMonth() + 1);
                lastDayMonth.setDate(0);
                lastDayMonth.setHours(23, 59, 59);


                switch (date) {
                    case 'today':
                        object = {
                            $gte: currStart,
                            $lt: currEnd
                        }
                        return object
                    case 'thisweek':
                        object = {
                            $gte: firstDayWeek,
                            $lt: lastDayWeek
                        }
                        return object
                    case 'nextweek':
                        firstDayWeek.setDate(firstDayWeek.getDate() + 7);
                        lastDayWeek.setDate(lastDayWeek.getDate() + 7);
                        object = {
                            $gte: firstDayWeek,
                            $lt: lastDayWeek
                        }
                        return object
                    case 'lastweek':
                        firstDayWeek.setDate(firstDayWeek.getDate() - 7);
                        lastDayWeek.setDate(lastDayWeek.getDate() - 7);
                        object = {
                            $gte: firstDayWeek,
                            $lt: lastDayWeek
                        }
                        return object
                    case 'thismonth':
                        object = {
                            $gte: firstDayMonth,
                            $lt: lastDayMonth
                        }
                        return object
                    case 'nextmonth':
                        firstDayMonth.setMonth(firstDayMonth.getMonth() + 1);
                        lastDayMonth.setMonth(lastDayMonth.getMonth() + 1);
                        object = {
                            $gte: firstDayMonth,
                            $lt: lastDayMonth
                        }
                        return object
                    case 'lastmonth':
                        firstDayMonth.setMonth(firstDayMonth.getMonth() - 1);
                        lastDayMonth.setMonth(lastDayMonth.getMonth() - 1);
                        object = {
                            $gte: firstDayMonth,
                            $lt: lastDayMonth
                        }
                        return object
                }
            } catch (ex) {
                console.log(ex);
            }
            return;
        }

        if (req.query.startAt && req.query.startAt !== '[null]' && req.query.startAt !== 'without') {
            let condition = parseDate(req.query.startAt);
            if (condition) {
                query.startAt = condition;
            }
        } else if (req.query.startAt === 'without') {
            let nullField = {
                startAt: {
                    $type: 10
                }
            };
            let existsField = {
                startAt: {
                    $exists: false
                }
            };
            if (query.$or) {
                query.$or.push(nullField);
                query.$or.push(existsField);
            } else {
                query.$or = [
                    nullField,
                    existsField
                ]
            }
        }

        if (req.query.dueAt && req.query.dueAt !== '[null]' && req.query.dueAt !== 'without') {
            let condition = parseDate(req.query.dueAt);
            if (condition) {
                query.dueAt = condition;
            }
        } else if (req.query.dueAt === 'without') {
            let nullField = {
                dueAt: {
                    $type: 10
                }
            };
            let existsField = {
                dueAt: {
                    $exists: false
                }
            };
            if (query.$or) {
                query.$or.push(nullField);
                query.$or.push(existsField);
            } else {
                query.$or = [
                    nullField,
                    existsField
                ]
            }
        }

        let cards = Cards.find(query).map(doc => {
            let board = boards.find((e) => e._id === doc.boardId);
            let tags = '<div class="containter-tags">';
            if (board.labels && doc.labelIds) {
                board.labels.forEach(lb => {
                    if (doc.labelIds.indexOf(lb._id) != -1) {
                        tags += '<div class=\"tags tags-' + lb.color + '\">' + lb.name + '</div>';
                        //tags += (lb.name ? lb.name : lb.color) + ', '
                    }
                });
            }
            tags += '</div>';
            /*if(tags.length > 0) {
              tags = tags.substr(0, tags.length - 1);
            }*/
            let swimlane = Swimlanes.findOne(doc.swimlaneId);
            return {
                _id: doc._id,
                title: doc.title,
                boardId: doc.boardId,
                description: doc.description,
                boardTitle: board.title,
                context: board.context,
                startAt: doc.startAt,
                listId: doc.listId,
                listTitle: Lists.findOne({ _id: doc.listId }).title,
                swimlaneId: doc.swimlaneId,
                swimlaneTitle: swimlane ? swimlane.title : '',
                tags: tags,
                dueAt: doc.dueAt,
                status: doc.status,
                assignedBy: Users.findOne(doc.userId).username
            }
        });

        JsonRoutes.sendResult(res, {
            code: 200,
            data: cards
        })
    });

    //Boards de Admins

    JsonRoutes.add('GET', '/api/report/cards/weekAdmin', function(req, res) {
        if (!req.userId) {
            return JsonRoutes.sendResult(res, {
                code: 403,
                data: {
                    status: 'forbidden'
                }
            });
        }

        //console.log(Users.findOne(req.userId).currentDomain)

        const boards = Boards.find({
            archived: false,
            domains: { '$in': [Users.findOne(req.userId).currentDomain] },
            members: { $elemMatch: { userId: req.userId, isActive: true, isAdmin: true } }
        }).fetch().map(doc => {
            return {
                _id: doc._id,
                title: doc.title,
                labels: doc.labels,
                context: doc.context
            }
        });

        let boardIds = [];
        boards.forEach(b => {
                boardIds.push(b._id);
            })
            //console.log(boards)
        let query = {
            boardId: {
                $in: boardIds
            },
            status: {
                $not: {
                    $eq: 'finished'
                }
            }
        };


        let parseDate = function(date) {
            let object = {};
            try {
                let currStart = new Date();
                currStart.setHours(0, 0, 0, 0);
                let currEnd = new Date();
                currEnd.setHours(23, 59, 59);
                let firstWeekCurrDay = currStart.getDate() - currStart.getDay();
                let lastWeekCurrDay = firstWeekCurrDay + 6;
                let firstDayWeek = new Date();
                firstDayWeek.setDate(firstWeekCurrDay);
                let lastDayWeek = new Date();
                lastDayWeek.setDate(lastWeekCurrDay);
                let firstDayMonth = new Date();
                firstDayMonth.setDate(1);
                let lastDayMonth = new Date();
                lastDayMonth.setMonth(lastDayMonth.getMonth() + 1);
                lastDayMonth.setDate(0);
                lastDayMonth.setHours(23, 59, 59);


                switch (date) {
                    case 'today':
                        object = {
                            $gte: currStart,
                            $lt: currEnd
                        }
                        return object
                    case 'thisweek':
                        object = {
                            $gte: firstDayWeek,
                            $lt: lastDayWeek
                        }
                        return object
                    case 'nextweek':
                        firstDayWeek.setDate(firstDayWeek.getDate() + 7);
                        lastDayWeek.setDate(lastDayWeek.getDate() + 7);
                        object = {
                            $gte: firstDayWeek,
                            $lt: lastDayWeek
                        }
                        return object
                    case 'lastweek':
                        firstDayWeek.setDate(firstDayWeek.getDate() - 7);
                        lastDayWeek.setDate(lastDayWeek.getDate() - 7);
                        object = {
                            $gte: firstDayWeek,
                            $lt: lastDayWeek
                        }
                        return object
                    case 'thismonth':
                        object = {
                            $gte: firstDayMonth,
                            $lt: lastDayMonth
                        }
                        return object
                    case 'nextmonth':
                        firstDayMonth.setMonth(firstDayMonth.getMonth() + 1);
                        lastDayMonth.setMonth(lastDayMonth.getMonth() + 1);
                        object = {
                            $gte: firstDayMonth,
                            $lt: lastDayMonth
                        }
                        return object
                    case 'lastmonth':
                        firstDayMonth.setMonth(firstDayMonth.getMonth() - 1);
                        lastDayMonth.setMonth(lastDayMonth.getMonth() - 1);
                        object = {
                            $gte: firstDayMonth,
                            $lt: lastDayMonth
                        }
                        return object
                }
            } catch (ex) {
                console.log(ex);
            }
            return;
        }

        if (req.query.startAt && req.query.startAt !== '[null]' && req.query.startAt !== 'without') {
            let condition = parseDate(req.query.startAt);
            if (condition) {
                query.startAt = condition;
            }
        } else if (req.query.startAt === 'without') {
            let nullField = {
                startAt: {
                    $type: 10
                }
            };
            let existsField = {
                startAt: {
                    $exists: false
                }
            };
            if (query.$or) {
                query.$or.push(nullField);
                query.$or.push(existsField);
            } else {
                query.$or = [
                    nullField,
                    existsField
                ]
            }
        }

        if (req.query.dueAt && req.query.dueAt !== '[null]' && req.query.dueAt !== 'without') {
            let condition = parseDate(req.query.dueAt);
            if (condition) {
                query.dueAt = condition;
            }
        } else if (req.query.dueAt === 'without') {
            let nullField = {
                dueAt: {
                    $type: 10
                }
            };
            let existsField = {
                dueAt: {
                    $exists: false
                }
            };
            if (query.$or) {
                query.$or.push(nullField);
                query.$or.push(existsField);
            } else {
                query.$or = [
                    nullField,
                    existsField
                ]
            }
        }

        let cards = Cards.find(query).map(doc => {
            let board = boards.find((e) => e._id === doc.boardId);
            let tags = '<div class="containter-tags">';
            if (board.labels && doc.labelIds) {
                board.labels.forEach(lb => {
                    if (doc.labelIds.indexOf(lb._id) != -1) {
                        tags += '<div class=\"tags tags-' + lb.color + '\">' + lb.name + '</div>';
                        //tags += (lb.name ? lb.name : lb.color) + ', '
                    }
                });
            }
            tags += '</div>';
            /*if(tags.length > 0) {
              tags = tags.substr(0, tags.length - 1);
            }*/
            let swimlane = Swimlanes.findOne(doc.swimlaneId);

            let assigned = "";
            if (doc.assignedTo) {
                assigned = user = Users.findOne(doc.assignedTo).username;
            } else {
                assigned = "";
            }

            return {
                _id: doc._id,
                title: doc.title,
                boardId: doc.boardId,
                description: doc.description,
                boardTitle: board.title,
                context: board.context,
                startAt: doc.startAt,
                listId: doc.listId,
                listTitle: Lists.findOne({ _id: doc.listId }).title,
                swimlaneId: doc.swimlaneId,
                swimlaneTitle: swimlane ? swimlane.title : '',
                tags: tags,
                dueAt: doc.dueAt,
                status: doc.status,
                assignedBy: Users.findOne(doc.userId).username,
                assignedTo: assigned
            }
        });

        JsonRoutes.sendResult(res, {
            code: 200,
            data: cards
        })
    });




    JsonRoutes.add('GET', '/api/boards/:boardId/lists/:listId/cards', function(req, res) {
        const paramBoardId = req.params.boardId;
        const paramListId = req.params.listId;
        Authentication.checkBoardAccess(req.userId, paramBoardId);
        JsonRoutes.sendResult(res, {
            code: 200,
            data: Cards.find({ boardId: paramBoardId, listId: paramListId, archived: false }).map(function(doc) {
                return {
                    _id: doc._id,
                    title: doc.title,
                    description: doc.description,
                };
            }),
        });
    });

    JsonRoutes.add('GET', '/api/boards/:boardId/lists/:listId/cards/:cardId', function(req, res) {
        const paramBoardId = req.params.boardId;
        const paramListId = req.params.listId;
        const paramCardId = req.params.cardId;
        Authentication.checkBoardAccess(req.userId, paramBoardId);
        JsonRoutes.sendResult(res, {
            code: 200,
            data: Cards.findOne({ _id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false }),
        });
    });

    JsonRoutes.add('POST', '/api/boards/:boardId/lists/:listId/cards', function(req, res) {
        Authentication.checkUserId(req.userId);
        const paramBoardId = req.params.boardId;
        const paramListId = req.params.listId;
        const check = Users.findOne({ _id: req.body.authorId });
        const members = req.body.members || [req.body.authorId];
        if (typeof check !== 'undefined') {
            const id = Cards.direct.insert({
                title: req.body.title,
                boardId: paramBoardId,
                listId: paramListId,
                description: req.body.description,
                userId: req.body.authorId,
                swimlaneId: req.body.swimlaneId,
                sort: 0,
                members,
            });
            JsonRoutes.sendResult(res, {
                code: 200,
                data: {
                    _id: id,
                },
            });

            const card = Cards.findOne({ _id: id });
            cardCreation(req.body.authorId, card);

        } else {
            JsonRoutes.sendResult(res, {
                code: 401,
            });
        }
    });

    JsonRoutes.add('PUT', '/api/boards/:boardId/lists/:listId/cards/:cardId', function(req, res) {
        Authentication.checkUserId(req.userId);
        const paramBoardId = req.params.boardId;
        const paramCardId = req.params.cardId;
        const paramListId = req.params.listId;

        if (req.body.hasOwnProperty('title')) {
            const newTitle = req.body.title;
            Cards.direct.update({ _id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false }, { $set: { title: newTitle } });
        }
        if (req.body.hasOwnProperty('listId')) {
            const newParamListId = req.body.listId;
            Cards.direct.update({ _id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false }, { $set: { listId: newParamListId } });

            const card = Cards.findOne({ _id: paramCardId });
            cardMove(req.body.authorId, card, { fieldName: 'listId' }, paramListId);

        }
        if (req.body.hasOwnProperty('description')) {
            const newDescription = req.body.description;
            Cards.direct.update({ _id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false }, { $set: { description: newDescription } });
        }
        if (req.body.hasOwnProperty('labelIds')) {
            const newlabelIds = req.body.labelIds;
            Cards.direct.update({ _id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false }, { $set: { labelIds: newlabelIds } });
        }
        if (req.body.hasOwnProperty('requestedBy')) {
            const newrequestedBy = req.body.requestedBy;
            Cards.direct.update({ _id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false }, { $set: { requestedBy: newrequestedBy } });
        }
        if (req.body.hasOwnProperty('assignedBy')) {
            const newassignedBy = req.body.assignedBy;
            Cards.direct.update({ _id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false }, { $set: { assignedBy: newassignedBy } });
        }
        if (req.body.hasOwnProperty('receivedAt')) {
            const newreceivedAt = req.body.receivedAt;
            Cards.direct.update({ _id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false }, { $set: { receivedAt: newreceivedAt } });
        }
        if (req.body.hasOwnProperty('startAt')) {
            const newstartAt = req.body.startAt;
            Cards.direct.update({ _id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false }, { $set: { startAt: newstartAt } });
        }
        if (req.body.hasOwnProperty('dueAt')) {
            const newdueAt = req.body.dueAt;
            Cards.direct.update({ _id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false }, { $set: { dueAt: newdueAt } });
        }
        if (req.body.hasOwnProperty('endAt')) {
            const newendAt = req.body.endAt;
            Cards.direct.update({ _id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false }, { $set: { endAt: newendAt } });
        }
        if (req.body.hasOwnProperty('spentTime')) {
            const newspentTime = req.body.spentTime;
            Cards.direct.update({ _id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false }, { $set: { spentTime: newspentTime } });
        }
        if (req.body.hasOwnProperty('isOverTime')) {
            const newisOverTime = req.body.isOverTime;
            Cards.direct.update({ _id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false }, { $set: { isOverTime: newisOverTime } });
        }
        if (req.body.hasOwnProperty('customFields')) {
            const newcustomFields = req.body.customFields;
            Cards.direct.update({ _id: paramCardId, listId: paramListId, boardId: paramBoardId, archived: false }, { $set: { customFields: newcustomFields } });
        }
        JsonRoutes.sendResult(res, {
            code: 200,
            data: {
                _id: paramCardId,
            },
        });
    });

    JsonRoutes.add('DELETE', '/api/boards/:boardId/cards/deleteUntitledCards', function(req, res) {
        const cards = Cards.find({}).map(cards => {
            return cards;
        });

        for (let card of cards) {
            if (card.title === 'Sin título') {
                Activities.remove({ cardId: card._id });
                Checklists.remove({ cardId: card._id });
                Attachments.remove({ cardId: card._id });
                Cards.direct.remove({ _id: card._id });
            }
        }

        JsonRoutes.sendResult(res, {
            code: 200,
            data: {
                message: 'OK'
            }
        });
    });

    JsonRoutes.add('DELETE', '/api/boards/:boardId/lists/:listId/cards/:cardId', function(req, res) {
        Authentication.checkUserId(req.userId);
        const paramBoardId = req.params.boardId;
        const paramListId = req.params.listId;
        const paramCardId = req.params.cardId;

        Cards.direct.remove({ _id: paramCardId, listId: paramListId, boardId: paramBoardId });
        const card = Cards.find({ _id: paramCardId });
        cardRemover(req.body.authorId, card);
        JsonRoutes.sendResult(res, {
            code: 200,
            data: {
                _id: paramCardId,
            },
        });

    });
}
