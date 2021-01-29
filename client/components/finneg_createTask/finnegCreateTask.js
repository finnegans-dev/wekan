const subManager = new SubsManager();

BlazeComponent.extendComponent({
    onCreated() {
        const currentBoardId = Session.get('currentBoard');

        swimlanes = Swimlanes.find({}).map(swimlane => {
            return swimlane;
        });

        lists = Lists.find({}).map(list => {
            return list;
        });

        // Si ambos tienen longitud cero la condicion es false
        if (swimlanes.length && lists.length) {
            const cardId = Cards.insert({
                title: 'Sin título',
                listId: lists[0]._id,
                boardId: currentBoardId,
                sort: 0,
                swimlaneId: swimlanes[0]._id,
                type: 'cardType-card',
            });

            Session.set('currentCard', cardId);
        }
    }
}).register('createTask');
