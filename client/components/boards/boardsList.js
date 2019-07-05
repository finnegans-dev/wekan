const subManager = new SubsManager();


// Template.boardList.onCreated(async function onCreated() {
//   Meteor.callPromise('getContext', (err, res) => {
//     if (err) {
//       console.log(err)
//     } else {
//       console.log(res)
//     }
//   })
// });
BlazeComponent.extendComponent({
  onCreated() {
    Meteor.subscribe('setting');
  },

  boards() {
    console.log("BOARD")
    // let url = this.url = Meteor.settings.public.ecoUrl;
    // url = "https://go-test.finneg.com/api/1/contexts?access_token=064f8ab8-8506-479d-9675-4d149411a7cf"
    // let contexts = []
    // HTTP.get(url, (err, data) => {
    //   if (err) {
    //     console.log(err)
    //     return Boards.find({
    //       archived: false,
    //       $or: [{
    //         'members.userId': Meteor.userId()
    //       }, {
    //         permission: 'public'
    //       }]

    //     }, {
    //         sort: ['title'],
    //       });
    //   } else {
    //     //console.log(data)

    //     contexts.push('1d77e9f4-3c75-4a54-9a71-3bf39a2812b1')
    //     contexts.push('contexto1')
    //     // data.data.forEach(element => {
    //     //   contexts.push(element.id)
    //     // });

    //     for (let i = 0; i < data.data.length; i++) {
    //       contexts.push(data.data[i].id)
    //     }

    //     console.log(contexts)
    //     let boards = Boards.find({ "context": { $in: contexts } }).fetch()
    //     console.log(boards)
    //     return boards;
    //     console.log()

    //   }
    // })



    // let board = Boards.find({});
    // console.log(Boards.find({}).fetch())
    // return board;



    return Boards.find({
      archived: false,
      $or: [{
        'members.userId': Meteor.userId()
      }, {
        permission: 'public'
      }]

    }, {
        sort: ['title'],
      });


  },

  isStarred() {
    const user = Meteor.user();
    return user && user.hasStarred(this.currentData()._id);
  },

  hasOvertimeCards() {
    subManager.subscribe('board', this.currentData()._id);
    return this.currentData().hasOvertimeCards();
  },

  hasSpentTimeCards() {
    subManager.subscribe('board', this.currentData()._id);
    return this.currentData().hasSpentTimeCards();
  },

  isInvited() {
    const user = Meteor.user();
    return user && user.isInvitedTo(this.currentData()._id);
  },

  events() {
    return [{
      'click .js-add-board': Popup.open('createBoard'),
      'click .js-star-board'(evt) {
        const boardId = this.currentData()._id;
        Meteor.user().toggleBoardStar(boardId);
        evt.preventDefault();
      },
      'click .js-accept-invite'() {
        const boardId = this.currentData()._id;
        Meteor.user().removeInvite(boardId);
      },
      'click .js-decline-invite'() {
        const boardId = this.currentData()._id;
        Meteor.call('quitBoard', boardId, (err, ret) => {
          if (!err && ret) {
            Meteor.user().removeInvite(boardId);
            FlowRouter.go('home');
          }
        });
      },
    }];
  },
}).register('boardList');

