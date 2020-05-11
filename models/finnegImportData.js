export class FinnegWekanBoard {
    _format = 'wekan-board-1.0.0';
    _id = '';
    title = '';
    permission = 'private';
    slug = '';
    archived = false;
    createdAt = new Date();
    labels = [];
    members = [];
    color = 'belize';
    subtasksDefaultBoardId = null;
    subtasksDefaultListId = null;
    allowsSubtasks = true;
    presentParentTask = 'no-parent';
    isOvertime = false;
    cards = [];
    lists = [];
    swimlanes = [];
    activities = [];
    customFields = [];
    comments = [];
    checklists = [];
    checklistItems = [];
    subtaskItems = [];
    attachments = [];
    users = [];

    constructor(title, users, members, swimlanes, lists, cards, labels) {
        const currentBoard = Boards.findOne(Session.get('currentBoard'));

        this.users = users;
        this.title = title;
        this.members = members;
        this.swimlanes = swimlanes;
        this.lists = lists;
        this.cards = cards;
        this.labels = labels ? labels : this.getDefaultLabels();
        this.slug = this.title.toLowerCase().replace(' ', '-');

        this.title = currentBoard.title;
        this._id = 'asd1i2jm3i912j3i9';
    }

    getDefaultLabels() {
        const colors = ['yellow', 'orange', 'red', 'purple', 'blue']
        let defaultLabels = [];

        for (let i = 0; i < colors.length; i++) {
            let label = new FinnegWekanLabel(colors[i])
            defaultLabels.push(label);
        }
        return defaultLabels;
    }
}

export class FinnegWekanMember {
    userId = '';
    isAdmin = true;
    isActive = true;
    isNoComments = false;
    isCommentOnly = false;

    constructor(userId) {
        this.userId = userId;
    }
}

export class FinnegWekanUser {
    _id = Meteor.user()._id;
    username = Meteor.user().username;
    profile = {};
}

export class FinnegWekanSwimlane {
    _id = Random.id();
    boardId = '';
    title = '';
    sort = 0;
    archived = false;
    createdAt = new Date();

    constructor(id, boardId, title, sort) {
        this.title = title;
        this.sort = sort;
        this.boardId = boardId;
        if (id != '') {
            this._id = id;
        }
    }
}

export class FinnegWekanList {
    _id = Random.id();
    title = '';
    sort = 0;
    archived = false;
    createdAt = new Date();
    wipLimit = {
        value: 1,
        enabled: false,
        soft: false
    };
    constructor(title, sort) {
        this.title = title;
        this.sort = sort;
    }
}

export class FinnegWekanCard {
    _id = Random.id();
    boardId = '';
    title = '';
    members = [];
    labelIds = [];
    customFields = [];
    listId = '';
    sort = 0;
    swimlaneId = '';
    type = 'cardType-card';
    archived = false;
    parentId = '';
    coverId = '';
    createdAt = new Date();
    dateLastActivity = new Date();
    permission = 'public';
    description = '';
    requestedBy = '';
    assignedBy = '';
    spentTime = 0;
    isOvertime = false;
    userId = '';
    subtaskSort = -1;
    linkedId = '';

    constructor(title, description, boardId, swimlaneId, listId, userId, sort) {
        this.title = title;
        this.description = description;
        this.boardId = boardId;
        this.swimlaneId = swimlaneId;
        this.listId = listId;
        this.userId = userId;
        this.sort = sort;
    }
}

export class FinnegWekanLabel {
    color = '';
    _id = Random.id([6]);
    name = ''

    constructor(color) {
        if (this.isValidLabelColorName(color)) {
            this.color = color
        } else {
            return null;
        }
    }

    isValidLabelColorName(color) {
        let names = Boards.simpleSchema()._schema['labels.$.color'].allowedValues
        return names.indexOf(color) > -1
    }

}