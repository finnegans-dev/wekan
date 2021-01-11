Template.userAvatar.helpers({
    userData() {
        // We need to handle a special case for the search results provided by the
        // `matteodem:easy-search` package. Since these results gets published in a
        // separate collection, and not in the standard Meteor.Users collection as
        // expected, we use a component parameter ("property") to distinguish the
        // two cases.
        const userCollection = this.esSearch ? ESSearchResults : Users;
        return userCollection.findOne(this.userId, {
            fields: {
                profile: 1,
                username: 1,
            },
        });
    },

    memberType() {
        const user = Users.findOne(this.userId);
        return user && user.isBoardAdmin() ? 'admin' : 'normal';
    },

    presenceStatusClassName() {
        const user = Users.findOne(this.userId);
        const userPresence = presences.findOne({ userId: this.userId });
        if (user && user.isInvitedTo(Session.get('currentBoard')))
            return 'pending';
        else if (!userPresence)
            return 'disconnected';
        else if (Session.equals('currentBoard', userPresence.state.currentBoardId))
            return 'active';
        else
            return 'idle';
    },
});

Template.userAvatar.events({
    'click .js-change-avatar': Popup.open('changeAvatar'),
});

Template.userAvatarInitials.helpers({
    initials() {
        const user = Users.findOne(this.userId);
        return user && user.getInitials();
    },

    viewPortWidth() {
        const user = Users.findOne(this.userId);
        return (user && user.getInitials().length || 1) * 12;
    },
});

BlazeComponent.extendComponent({
    onCreated() {
        this.hasProfilePicture = new ReactiveVar(false);
        this.hasAvatar = new ReactiveVar(false);
        this.profilePicture = new ReactiveVar('');
        this.url = new ReactiveVar('');
        Meteor.subscribe('my-avatars');

        this.profilePictureURL();
    },

    profilePictureURL() {
        const user = Users.findOne(Meteor.userId());
        const token = sessionStorage.getItem('token');
        let prefix = Meteor.settings.public.ecoUrl;

        // Esto es para probarlo en localhost
        if (!prefix)
            prefix = 'https://go-test.finneg.com';

        this.url = `${prefix}/api/1/users/go/profile/picture/${user.username}?access_token=${token}`;

        const self = this;
        const request = new XMLHttpRequest();
        request.open('GET', this.url, true);
        request.responseType = 'blob';
        request.contentType = 'image/jpeg';
        request.onload = function() {
            if (request.status === 200) {
                const reader = new FileReader();
                reader.readAsDataURL(request.response);
                reader.onload = function(event) {
                    self.hasProfilePicture.set(true);
                    self.hasAvatar.set(false);
                    // const base64 = event.target.result.split(';')[1];
                    // self.profilePicture.set('data:image/jpeg;' + base64);
                    self.profilePicture.set(event.target.result);
                };
            } else {
                self.showAvatar();
            }
        };
        request.error = function(error) {
            self.showAvatar();
        };
        request.send();
    },

    showAvatar() {
        this.hasProfilePicture.set(false);
        this.hasAvatar.set(true);
    },
}).register('userAvatar');

BlazeComponent.extendComponent({
    onCreated() {
        this.error = new ReactiveVar('');
        Meteor.subscribe('my-avatars');
    },

    avatarUrlOptions() {
        return {
            auth: false,
            brokenIsFine: true,
        };
    },

    uploadedAvatars() {
        return Avatars.find({ userId: Meteor.userId() });
    },

    isSelected() {
        const userProfile = Meteor.user().profile;
        const avatarUrl = userProfile && userProfile.avatarUrl;
        const currentAvatarUrl = this.currentData().url(this.avatarUrlOptions());
        return avatarUrl === currentAvatarUrl;
    },

    noAvatarUrl() {
        const userProfile = Meteor.user().profile;
        const avatarUrl = userProfile && userProfile.avatarUrl;
        return !avatarUrl;
    },

    setAvatar(avatarUrl) {
        Meteor.user().setAvatarUrl(avatarUrl);
    },

    setError(error) {
        this.error.set(error);
    },

    events() {
        return [{
            'click .js-upload-avatar' () {
                this.$('.js-upload-avatar-input').click();
            },
            'change .js-upload-avatar-input' (evt) {
                let file, fileUrl;

                FS.Utility.eachFile(evt, (f) => {
                    try {
                        file = Avatars.insert(new FS.File(f));
                        fileUrl = file.url(this.avatarUrlOptions());
                    } catch (e) {
                        this.setError('avatar-too-big');
                    }
                });

                if (fileUrl) {
                    this.setError('');
                    const fetchAvatarInterval = window.setInterval(() => {
                        $.ajax({
                            url: fileUrl,
                            success: () => {
                                this.setAvatar(file.url(this.avatarUrlOptions()));
                                window.clearInterval(fetchAvatarInterval);
                            },
                        });
                    }, 100);
                }
            },
            'click .js-select-avatar' () {
                const avatarUrl = this.currentData().url(this.avatarUrlOptions());
                this.setAvatar(avatarUrl);
            },
            'click .js-select-initials' () {
                this.setAvatar('');
            },
            'click .js-delete-avatar' () {
                Avatars.remove(this.currentData()._id);
            },
        }];
    },
}).register('changeAvatarPopup');

Template.finnegCardMembersPopup.helpers({
    isCardMember() {
        const card = Template.parentData();
        const cardMembers = card.getMembers();

        return _.contains(cardMembers, this.userId);
    },

    user() {
        return Users.findOne(this.userId);
    },
});

Template.finnegCardMembersPopup.events({
    'click .js-select-member' (evt) {
        const card = Cards.findOne(Session.get('currentCard'));
        const memberId = this.userId;
        card.toggleMember(memberId);
        evt.preventDefault();
    },
});

Template.finnegCardAssignedPopup.helpers({
    isAssigned() {
        const card = Template.parentData();

        return card.assignedTo === this._id;
    },

    user() {
        return Users.findOne(this._id);
    },
});

Template.finnegCardAssignedPopup.events({
    'click .js-select-member' (evt) {

        const card = Cards.findOne(Session.get('currentCard'));
        const memberId = this._id;
        //card.toggleMember(memberId);
        card.setAssignedTo(memberId);
        Popup.close();
        evt.preventDefault();
    },
});

Template.cardMemberPopup.helpers({
    user() {
        return Users.findOne(this.userId);
    },
});

Template.cardMemberPopup.events({
    'click .js-remove-member' () {
        Cards.findOne(this.cardId).unassignMember(this.userId);
        Popup.close();
    },
    'click .js-edit-profile': Popup.open('editProfile'),
});
