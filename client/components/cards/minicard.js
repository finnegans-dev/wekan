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
    }];
  },

}).register('minicard');
