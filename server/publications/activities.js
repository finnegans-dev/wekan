// We use activities fields at two different places:
// 1. The board sidebar
// 2. The card activity tab
// We use this publication to paginate for these two publications.

Meteor.publish('activities', (kind, id, limit, hideSystem) => {
  check(kind, Match.Where((x) => {
    return ['board', 'card'].indexOf(x) !== -1;
  }));
  check(id, String);
  check(limit, Number);
  check(hideSystem, Boolean);


  const selector = (hideSystem) ? {$and: [{activityType: 'addComment'}, {[`${kind}Id`]: id}]} : {[`${kind}Id`]: id};
  if(kind === 'board') {
    const query = { boardId : id}
    const currentBoard = Boards.findOne({_id : id});
    const user = currentBoard.members.find(mb => mb.userId === Meteor.userId());
    if(user && !user.isAdmin) {
      query.$or = [
        {
          members : {
            $in : [Meteor.userId()]
          }
        },
        {
          userId : Meteor.userId()
        }
      ]
    }
    const cards = Cards.find(query);
    const cardsIds = [];
    cards.forEach(e => {
      cardsIds.push(e._id);
    });
    selector.$or = [
      {
        cardId : {
          $exists : true,
          $in : cardsIds
        },
      },
      {
        cardId : {
          $exists : false
        }
      }
    ]
    return Activities.find(selector, {
      limit,
      sort: {createdAt: -1},
    });
  }
  return Activities.find(selector, {
    limit,
    sort: {createdAt: -1},
  });
});
