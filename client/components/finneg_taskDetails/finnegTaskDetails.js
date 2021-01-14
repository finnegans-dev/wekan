const subManager = new SubsManager();

BlazeComponent.extendComponent({
  onCreated() {
      this.isBoardReady = new ReactiveVar(false);

      this.autorun(() => {
          const currentBoardId = Session.get('currentBoard');
          if (!currentBoardId)
              return;
          const handle = subManager.subscribe('board', currentBoardId);
          Tracker.nonreactive(() => {
              Tracker.autorun(() => {
                  this.isBoardReady.set(handle.ready());
              });
          });
      });
  }
}).register('task');
