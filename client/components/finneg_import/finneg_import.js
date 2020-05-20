import { FinnegWekanUser, FinnegWekanSwimlane, FinnegWekanCard } from '../../../models/finnegImportData'
import XLSX from 'xlsx';

BlazeComponent.extendComponent({
    onCreated() {
        this.error = new ReactiveVar('');
        this.cards = [];
        this.currentBoard = Boards.findOne({
            archived: false,
            'members.userId': Meteor.userId(),
            _id: { $eq: Session.get('currentBoard') },
        });
    },

    importData(evt) {
        evt.preventDefault();
        try {
            this.importSwimlanes();
            this.importCards();
        } catch (e) {
            this.error.set('error-json-malformed');
        }
    },

    onFileChange(files, isDrop) {
        console.log(files, isDrop)

        if (files.length === 0 || files.length > 1) {
            return;
        }

        const name = files[0].name;

        const reader = new FileReader();
        reader.onload = (e) => {
            /* read workbook */
            const bstr = e.target.result;
            const wb = XLSX.read(bstr, { type: 'binary' });

            /* grab first sheet */
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            /* save data */
            this.data = XLSX.utils.sheet_to_json(ws, { header: 1 });
            if (this.data.length <= 0) {
                return;
            }

            //genero el usuario
            let user = new FinnegWekanUser();

            //busco las listas (columnas)
            const dbLists = Lists.find({ boardId: this.currentBoard._id }).map(function(doc) {
                return {
                    _id: doc._id,
                    title: doc.title,
                };
            });

            //busco los titulos en el excel para generar los swimlanes (filas)
            let swimlanesTitles = [];
            for (let i = 0; i < this.data.length; i++) {
                if (this.data[i][1] != null && swimlanesTitles.indexOf(this.data[i][1].toLowerCase()) == -1) {
                    swimlanesTitles.push(this.data[i][1].toLowerCase());
                }
            }

            //busco los swimlanes existentes
            let dbSwimlanes = Swimlanes.find({ boardId: this.currentBoard._id, archived: false }).map(function(doc) {
                return {
                    _id: doc._id,
                    title: doc.title,
                    sort: doc.sort
                };
            });

            //quito los swimlanes que me pasaron en el excel y ya existen en la db
            let swimlanesMerged = [];
            let swimlanes = [];
            let swimlane;

            for (let dbSwimlane of dbSwimlanes) {
                let index = swimlanesTitles.indexOf(dbSwimlane.title.toLowerCase())
                if (index != -1) {
                    //agrrego los swimlanes de la db a la lista que usaré con los cards
                    swimlane = new FinnegWekanSwimlane(dbSwimlane._id,
                        this.currentBoard._id,
                        dbSwimlane.title,
                        dbSwimlane.sort);
                    swimlanesMerged.push(swimlane);

                    //lo quito de la lista de nombres para no agregarlo mas adelante
                    swimlanesTitles.splice(index, 1);
                }
            }

            //agrrego los swimlanes del excel a la lista que usaré con los cards
            for (let i = 0; i < swimlanesTitles.length; i++) {
                swimlane = new FinnegWekanSwimlane('',
                    this.currentBoard._id,
                    swimlanesTitles[i],
                    dbSwimlanes.length + i);

                swimlanes.push(swimlane);
                swimlanesMerged.push(swimlane);
            }

            let cards = [];
            for (let i = 0; i < this.data.length; i++) {
                if (this.data[i][0] == null) {
                    continue
                }

                const preProcessedTitle = this.data[i][0];
                let indexNewLine = preProcessedTitle.indexOf('\n')
                let title;
                let description;

                if (indexNewLine > -1) {
                    title = preProcessedTitle.slice(0, indexNewLine);
                    description = preProcessedTitle.slice(indexNewLine, preProcessedTitle.length);
                } else {
                    title = preProcessedTitle;
                }

                let swimlaneName = '';
                let swimlaneId;

                if (this.data[i][1] != null && this.data[i][1].toLowerCase() != 'default') {
                    swimlaneName = this.data[i][1].toLowerCase();
                }

                let dbCardsOnDefaultSwimlane = Cards
                    .find({
                        boardId: this.currentBoard._id,
                        swimlaneId: this.currentBoard.getDefaultSwimline()._id,
                        listId: dbLists[0]._id
                    })
                    .map(function(doc) {
                        return {
                            _id: doc._id,
                            title: doc.title,
                        };
                    });

                let sort;
                if (swimlaneName) {
                    swimlaneId = swimlanesMerged.filter((item) => {
                        return item.title === swimlaneName && item._id;
                    })[0]._id;
                    sort = 0;
                } else {
                    swimlaneId = this.currentBoard.getDefaultSwimline()._id;
                    sort = dbCardsOnDefaultSwimlane.length;
                }

                //busco si no existe un card en el swimline para poner orden
                for (let i = 0; i < cards.length; i++) {
                    if (cards[i].swimlaneId == swimlaneId) {
                        sort = cards[i].sort++;
                    }
                }

                let card = new FinnegWekanCard(title,
                    description,
                    this.currentBoard._id,
                    swimlaneId,
                    dbLists[0]._id,
                    user._id,
                    sort);

                card.description = description;
                cards.push(card);
            }

            this.cards = cards;
            this.swimlanes = swimlanes;

            document.getElementById('lstFiles').innerHTML = '';
            document.getElementById('selected-file').value = '';
            let icon = document.createElement('i');
            icon.classList.add('fa');
            icon.classList.add('fa-file');
            document.getElementById('lstFiles').append(icon);
            icon.append(' ' + name);
        };
        reader.readAsBinaryString(files[0]);
    },

    importSwimlanes() {
        if (this.swimlanes.length == 0)
            return;

        let dbSwimlanesTitles = this.currentBoard.swimlanes().map(function(doc) {
            return doc.title;
        })

        for (let i = 0; i < this.swimlanes.length; i++) {
            let swimlaneTitle = this.swimlanes[i].title;
            if (dbSwimlanesTitles.indexOf(swimlaneTitle.trim()) == -1) {
                const newId = Swimlanes.direct.insert({
                    archived: false,
                    title: this.swimlanes[i].title,
                    boardId: this.swimlanes[i].boardId,
                    sort: this.swimlanes[i].sort,
                    createdAt: Date.now(),
                });
                Swimlanes.direct.update(newId, { $set: { 'updatedAt': Date.now() } });

                for (let j = 0; j < this.cards.length; j++) {
                    if (this.cards[j].swimlaneId == this.swimlanes[i]._id) {
                        this.cards[j].swimlaneId = newId;
                    }
                }

                this.swimlanes[i]._id = newId;
            }
        }
    },

    importCards() {
        let dbCardsTitles = this.currentBoard.cards().map(function(doc) {
            return doc.title.toLowerCase();
        })

        for (let card of this.cards) {
            let cardTitle = card.title;

            if (dbCardsTitles.indexOf(cardTitle.trim().toLowerCase()) == -1) {
                Cards.direct.insert({
                    title: card.title,
                    description: card.description,
                    listId: card.listId,
                    boardId: card.boardId,
                    sort: card.sort,
                    swimlaneId: card.swimlaneId,
                    type: card.type
                });
            } else {
                Cards.direct.update(card._id, { $set: { 'archived': false } });
            }
        }
    },

    onSubmit(e) {
        this.importData(e);
        Modal.close();
    },

    events() {
        return [{
            'click .js-upload-file': function(e, t) {
                document.getElementById('selected-file').click();
            },
            'click .js-modal-import': function(e, t) {
                this.onSubmit(e);
            },
            'click .js-modal-cancel': function(e, t) {
                Modal.close();
            },
            'drop .js-upload-drop-zone': function(e, t) {
                e.preventDefault();
                e.stopPropagation();
                this.onFileChange(e.originalEvent.dataTransfer.files, true);
                document.getElementsByClassName('js-upload-drop-zone')[0].classList.remove('hover');
            },
            'dragover .js-upload-drop-zone': function(e, t) {
                e.preventDefault();
                e.stopPropagation();
            },
            'dragenter .js-upload-drop-zone': function(e, t) {
                e.preventDefault();
                document.getElementsByClassName('js-upload-drop-zone')[0].classList.add('hover');
            },
            'dragleave .js-upload-drop-zone': function(e, t) {
                document.getElementsByClassName('js-upload-drop-zone')[0].classList.remove('hover');
            },
            'change [type="file"]': function(e, t) {
                this.onFileChange(e.target.files, false);
            },
        }];
    },
}).register('finneg-import');