// Template.cards.events({
//   'click .member': Popup.open('cardMember')
// });

BlazeComponent.extendComponent({
  template() {
    return 'minicard';
  },

  events() {
    return [{
      'click .js-linked-link' () {
        if (this.data().isLinkedCard())
          Utils.goCardId(this.data().linkedId);
        else if (this.data().isLinkedBoard())
          Utils.goBoardId(this.data().linkedId);
      },
      'click .js-archive-card': Popup.afterConfirm('cardArchived', (action) => {
        Popup.close();
        const card = this.currentData().dataContext;
        card.archive();
      }),
      'click .js-card-finished' : Popup.afterConfirm('cardFinished', (action) => {
        Popup.close();
        const card = this.currentData().dataContext;
        if (card.isFinished()) {
          Cards.update(card._id, {
            $set: {
              status : null,
              endAt : null
            }
          });
        } else {
          Cards.update(card._id, {
            $set: {
              status : 'finished',
              endAt : new Date()
            }
          });
        }
      }),
      'drop .js-minicard'(evt) {
        const htmlElement = evt.handleObj.handler.arguments[1].draggable.context;
        const titleHtmlElement = htmlElement.getAttribute("title");
        if (titleHtmlElement) {
          const username = titleHtmlElement.replace(/[()]/g, '').trim();
          const user = Users.findOne({ username });
          const currentCard = this.currentData();
          Cards.update({ _id: currentCard._id }, { $set: { assignedTo: user._id } });
        }
      },
    }];
  },

}).register('minicard');
