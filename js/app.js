$(document).on('submit', 'form', function (e) {
    e.preventDefault();
    e.stopPropagation();
}).on('click', '.show-card', function () {
    
    console.log('card clicked', this.dataset.showId);
    let showId = Number(this.dataset.showId);
    console.log('showId', showId);
    Fragment.select('show-info').push({
        name: "show-interface",
        params: {showId: showId}
    });
    
}).on('click', '.season-card', function () {
    console.log('season card clicked', this.dataset.seasonId);
    
    let seasonId = this.dataset.seasonId;
    console.log('seasonId', seasonId);
    db.seasons.get({id: Number(seasonId)}).then(season => {
        if (season) {
            console.log('season:', season)
            db.shows.get({id: season.showId}).then(show => {
                
                
                Fragment.select('season-info').push({
                    name: "season-interface",
                    params: {
                        season: season,
                        show: show
                    }
                });
                
            })
        } else throw "season not found";
        
        
    });
})

// load dexie
const db = new Dexie("showsMemory");


var url = new URL(document.location.href);
var c = url.searchParams.get("old");
if(c === "1"){
    db.version(2).stores({
        shows: "++id, type, status, userStatus, *prequel, *sequel, *related",
        images: "&id",
        seasons: "++id, showId"
    });
} else {
    db.version(4).stores({
        shows: "++id, type, status, userStatus, *prequel, *sequel, *related",
        seasons: "++id, showId",
        test: "++id"
    });
}



const reverseRelation = {
    sequel: 'prequel',
    prequel: 'sequel',
    related: 'related'
}
const validDateFormat = /^(?:(?:(?<Day>(?:3[0-1]|[1-2]\d|0?[1-9]))(?:[\s/-]))?(?<Month>(?:(?:1[0-2]|0?[1-9])|jan(?:uary|\.)?|feb(?:ruary|\.)?|mar(?:ch|\.)?|apr(?:il|\.)?|may.?|june?\.?|july?\.?|aug(?:ust)?\.?|sep(?:t|tember)?\.?|Oct(?:ober)?\.?|nov(?:ember)?\.?|dec(?:ember)?\.?))(?:[\s/-]))?(?<Year>\d{4})$/i


document.querySelector('.add-show').addEventListener('click', function () {
    Fragment.select('shows-adder').push(function () {
        let self = this,
            $t = $(self);
        
        let addShowForm = templates['add-show-screen'].cloneNode(1),
            $addShowForm = $(addShowForm);
        
        $t.off().html(addShowForm);
        
        let $showName = $t.find('#new-show-name'),
            $showAired = $t.find('#new-show-air-date'),
            $showType = $t.find('#new-show-type'),
            $showSeasonsCount = $t.find('#new-show-seasons-count');
        
        let addedShowId;
        $addShowForm.on('submit', function () {
            db.transaction('rw', db.shows, db.seasons, () => {
                let dataAdded = {
                    name: $showName.val().trim(),
                    ...($showAired.val().trim() !== "" && {aired: parseDate($showAired.val())}),
                    type: $showType.val(),
                    seasonsCount: parseInt($showSeasonsCount.val()),
                    added: new Date()
                };
                
                return db.shows.add(dataAdded).then(showId => {
                    
                    addedShowId = showId;
                    
                    console.log('show added, now let\'s add seasons');
                    
                    let seasonsToAdd = Array(dataAdded.seasonsCount).fill(undefined).map((elem, index) => ({
                        showId: showId,
                        position: index + 1,
                        added: new Date()
                    }));
                    
                    console.log('seasonsToAdd', seasonsToAdd);
                    
                    return db.seasons.bulkAdd(seasonsToAdd);
                })
                
            }).then(n => {
                console.log('all succeed', n);
                console.log('addedShowId', addedShowId);
                
                self.Fragment.destroy();
                db.shows.get({id: addedShowId}).then(show => {
                    $('.show-list-inner').append(generateShowCard(show))
                    
                    console.log('open show-info-interface');
                    Fragment.select('show-info').push({
                        name: "show-interface",
                        params: {
                            showId: show.id
                        }
                    });
                });
            }).catch(err => {
                console.log('found errors');
                console.error(err);
            })
            
        })
    }, 'Add new show');
});

Fragment.plant('show-interface', function (params) {
    
    const showsObservable = Dexie.liveQuery(() => db.shows.get({id: params.showId}));
    const subscription = showsObservable.subscribe({
        next: show => {
            console.log('subscription next');
            this.reset();
            console.log("Got result:", show);
            
            // const show = params.show;
            let self = this,
                $t = $(self);
            
            console.log('self', self);
            
            // handle gear function
            self.setTitle(show.name);
            self.registerNavAction([{
                name: 'User preferences',
                icon: 'fa-regular fa-user-gear',
                action: function () {
                    
                    // show edit fragment
                    
                    Fragment.select('show-info').push({
                        name: "show-classifier-plant",
                        params: {show: show}
                    });
                    
                }
            }, {
                name: 'Preferences',
                icon: 'fa-regular fa-bars-progress',
                action: function () {
                    const MoreOptionsFragment = Fragment.select('show-info');
                    MoreOptionsFragment.push(function () {
                        let $t = $(this);
                        $t.html(templates['show-more-options-list'].cloneNode(1));
                        
                        $t.on('click', 'button', function () {
                            // to prevent creating a lot of ids that we will only use once, we added data-action instead to button
                            // this way we can just check which action is performed
                            const action = $(this).data('action');
                            switch (action) {
                                case 'manage-related-shows': {
                                    console.log('manage-related-shows');
                                    MoreOptionsFragment.push(async function () {
                                        
                                        let $t = $(this);
                                        
                                        // related shows
                                        const relatedShows = [show.prequel, show.sequel, show.related].flat().filter(e => e !== undefined);
                                        console.log('relatedShows', relatedShows);
                                        if (relatedShows.length > 0) {
                                            $t.on('click', '.separate-shows', function () {
                                                let self = this,
                                                    thatShowId = Number(self.dataset.showId),
                                                    relation = self.dataset.relation.toLowerCase();
                                                
                                                let relatedShowName = self.previousElementSibling.textContent;
                                                if (confirm('do you really want to unmark ' + relatedShowName + ' as a ' + relation + '?')) {
                                                    
                                                    db.transaction('rw', db.shows, () => {
                                                        let editOrigin = db.shows.where({id: show.id}).modify(thisShow => {
                                                            console.log('thisShow', thisShow);
                                                            console.log('origin relation', thisShow[relation]);
                                                            
                                                            if (thisShow[relation] && thisShow[relation].includes(thatShowId)) {
                                                                thisShow[relation].splice(thisShow[relation].indexOf(thatShowId), 1);
                                                                if (thisShow[relation].length === 0) {
                                                                    delete thisShow[relation];
                                                                }
                                                            } else {
                                                                throw 'not found'
                                                            }
                                                            
                                                            console.log('origin result', thisShow);
                                                        });
                                                        let editRelated = db.shows.where({id: thatShowId}).modify(relatedShow => {
                                                            console.log('related relation', relatedShow[reverseRelation[relation]]);
                                                            
                                                            if (relatedShow[reverseRelation[relation]] && relatedShow[reverseRelation[relation]].includes(show.id)) {
                                                                relatedShow[reverseRelation[relation]].splice(relatedShow[reverseRelation[relation]].indexOf(show.id), 1);
                                                                if (relatedShow[reverseRelation[relation]].length === 0) {
                                                                    delete relatedShow[reverseRelation[relation]];
                                                                }
                                                            } else {
                                                                throw 'not found'
                                                            }
                                                            
                                                            console.log('related result', relatedShow);
                                                        });
                                                        
                                                        return Promise.all([editOrigin, editRelated]).then(r => {
                                                            if (r[0] !== 1 || r[1] !== 1) {
                                                                throw "This looks suspicious, one of 'changes' is not 1";
                                                            }
                                                        });
                                                    }).then(() => {
                                                        
                                                        let item = self.closest('li')
                                                        if (item.parentElement.childElementCount === 1) {
                                                            let parent = item.parentElement;
                                                            
                                                            if (parent.parentElement.childElementCount === 2) {
                                                                $t.html('<div class="fs-5 fs-6 p-5 text-center text-muted">No related shows found</div>');
                                                            } else {
                                                                [parent.previousElementSibling, parent].forEach(n => n.remove());
                                                            }
                                                            
                                                        } else {
                                                            item.remove();
                                                        }
                                                        
                                                        
                                                    }).catch(err => {
                                                        console.warn("no commit");
                                                        console.error(err);
                                                        alert(err.message || err);
                                                    })
                                                    
                                                }
                                                
                                                console.log(thatShowId, relation);
                                                
                                            });
                                            
                                            console.log('relatedShows', relatedShows);
                                            
                                            db.shows.where('id').anyOf(relatedShows).toArray().then(n => {
                                                console.log('n', n);
                                                
                                                let prequels = n.filter(e => e.sequel?.includes(show.id)),
                                                    sequels = n.filter(e => e.prequel?.includes(show.id)),
                                                    related = n.filter(e => e.related?.includes(show.id));
                                                
                                                console.log('prequels', prequels);
                                                console.log('sequels', sequels);
                                                console.log('related', related);
                                                
                                                const content = [prequels, sequels, related],
                                                    contentType = ["Prequel", "Sequel", "Related"];
                                                
                                                console.log('content', content);
                                                
                                                content.forEach((relatedShows, contentIndex) => {
                                                    if (relatedShows.length > 0) {
                                                        let listGroup = create('ul', 'list-group mb-4'),
                                                            heading = create('h2', 'fs-6 fw-bold mb-3');
                                                        
                                                        heading.textContent = contentType[contentIndex];
                                                        relatedShows.forEach((rShow) => {
                                                            console.log('rShow', rShow);
                                                            
                                                            let item = templates['show-related'].cloneNode(1);
                                                            item.querySelector('.show-name').textContent = rShow.name;
                                                            
                                                            let separateBtn = item.querySelector('.separate-shows');
                                                            
                                                            separateBtn.dataset.showId = rShow.id;
                                                            separateBtn.dataset.relation = contentType[contentIndex].toLowerCase();
                                                            
                                                            console.log(item);
                                                            listGroup.append(item);
                                                            // <li class="align-items-center d-flex justify-content-between list-group-item pe-2">    <div class="fw-semibold">Contextual classes</div><button class="btn"><i class="fa-regular fa-trash"></i></button></li>
                                                        });
                                                        $t.append(heading, listGroup);
                                                    }
                                                })
                                                
                                                
                                            })
                                        } else {
                                            $t.html('<div class="fs-5 fs-6 p-5 text-center text-muted">No related shows found</div>');
                                        }
                                        
                                    }, "related shows to " + show.name, [{
                                        name: 'Add related show',
                                        icon: 'fa-regular fa-plus',
                                        action: function () {
                                            MoreOptionsFragment.push(async function () {
                                                let $t = $(this);
                                                let setRelatedShowsElem = templates['set-related-shows'].cloneNode(1)
                                                $t.html(setRelatedShowsElem);
                                                
                                                let $searchQuery = $t.find('#search-shows'),
                                                    $resetBtn = $t.find('.reset-selected-show'),
                                                    $submitBtn = $t.find('button[type="submit"]');
                                                
                                                let showsResults = $t.find('.shows-search-results');
                                                let parent = create('div', 'list-group', 'search-entries');
                                                
                                                showsResults.append(parent);
                                                
                                                let allShows = await db.shows.toArray();
                                                let timeout = -1;
                                                $searchQuery.on('input', function () {
                                                    clearTimeout(timeout);
                                                    let value = $(this).val().trim();
                                                    
                                                    console.log(value);
                                                    timeout = setTimeout(() => {
                                                        parent.innerHTML = "";
                                                        
                                                        if (value === "") return;
                                                        allShows.filter(e => e.name.toLowerCase().includes(value.toLowerCase()) && e.id !== show.id)
                                                            .forEach(show => {
                                                                let holder = templates['shows-search-item'].cloneNode(1);
                                                                holder.removeAttribute('id');
                                                                holder.dataset.showId = show.id;
                                                                holder.querySelector('.card-title').textContent = show.name + (show.aired ? ' (' + show.aired.getFullYear() + ')' : '');
                                                                if (show.poster) {
                                                                    let imgParent = holder.querySelector('.poster'),
                                                                        img = create('img');
                                                                    
                                                                    let objUrl = inflateAndGetObject(show.poster)
                                                                    img.onload = () => URL.revokeObjectURL(objUrl);
                                                                    img.src = objUrl;
                                                                    imgParent.append(img);
                                                                }
                                                                
                                                                
                                                                parent.append(holder);
                                                            });
                                                        
                                                        
                                                    }, 200);
                                                });
                                                
                                                showsResults.one('click', '.card', function () {
                                                    let $self = $(this),
                                                        chosenId = $self.data('show-id');
                                                    
                                                    db.shows.get({
                                                        id: chosenId
                                                    }).then(selectedShow => {
                                                        
                                                        $self.siblings().remove();
                                                        
                                                        console.log($searchQuery);
                                                        
                                                        $searchQuery
                                                            .prop('disabled', true)
                                                            .prop('readonly', true)
                                                            .val(selectedShow.name)
                                                            .data('selected-show-id', selectedShow.id);
                                                        
                                                        $submitBtn.prop('disabled', false);
                                                        $resetBtn.prop('disabled', false);
                                                        
                                                    })
                                                });
                                                $resetBtn.click(function () {
                                                    $searchQuery
                                                        .prop('disabled', false)
                                                        .prop('readonly', false)
                                                        .val("")
                                                        .removeData('selected-show-id');
                                                    
                                                    $submitBtn.prop('disabled', true);
                                                    $resetBtn.prop('disabled', true);
                                                });
                                                
                                                let $relation = $t.find('#show-relation');
                                                $(setRelatedShowsElem).submit(function () {
                                                    const relatedShowId = $searchQuery.data('selected-show-id'),
                                                        relation = $relation.val();
                                                    
                                                    db.transaction('rw', db.shows, () => {
                                                        return new Dexie.Promise(async (resolve, reject) => {
                                                            
                                                            // this is used to avoid duplicate code, with this helper we can handle both prequel and sequel with single code
                                                            if (relation === 'sequel' || relation === 'prequel' || relation === 'related') {
                                                                const updateOrigin = db.shows.where({id: show.id}).modify(thisShow => {
                                                                    // because we marked the first as sequel, we will mark this as prequel/sequel
                                                                    if (thisShow[relation]) {
                                                                        if (thisShow[relation].includes(relatedShowId)) {
                                                                            return reject('this show is already marked as ' + relation);
                                                                        } else {
                                                                            thisShow[relation].push(relatedShowId);
                                                                        }
                                                                    } else {
                                                                        thisShow[relation] = [relatedShowId]
                                                                    }
                                                                });
                                                                
                                                                const updateRelated = db.shows.where({id: relatedShowId}).modify(relatedShow => {
                                                                    // mark as sequel/prequel and find the related show and mark this as its prequel/sequel
                                                                    if (relatedShow[reverseRelation[relation]]) {
                                                                        if (relatedShow[reverseRelation[relation]].includes(show.id)) {
                                                                            return reject('the related is already marked as ' + relation);
                                                                        } else {
                                                                            relatedShow[reverseRelation[relation]].push(show.id);
                                                                        }
                                                                    } else {
                                                                        relatedShow[reverseRelation[relation]] = [show.id]
                                                                    }
                                                                });
                                                                
                                                                console.log('promise all is hit');
                                                                Promise.all([
                                                                    updateOrigin,
                                                                    updateRelated
                                                                ]).then(x => {
                                                                    return resolve();
                                                                })
                                                            }
                                                            
                                                        });
                                                    }).then(() => {
                                                        console.log('commit');
                                                        $t.prop('Fragment').home();
                                                    }).catch(err => {
                                                        console.warn('no commit');
                                                        alert(err.message || err);
                                                    })
                                                    
                                                    
                                                });
                                            }, 'Add related show to ' + show.name)
                                        }
                                    }]);
                                    break;
                                }
                                case 'delete-show': {
                                    // todo when we delete a show, we should check its prequels and sequels and update them
                                    // todo when we delete a show we should delete its seasons
                                    if (confirm("Are you sure you want to delete “" + show.name + "” and all its related data, this action cannot be undone")) {
                                        console.log('delete-show');
                                        const relationKeys = ["prequel", "sequel", "related"];
                                        db.transaction('rw', db.shows, db.seasons, () => {
                                            
                                            // get fresh info about the show we going to delete
                                            return db.shows.get({id: show.id}).then(s => {
                                                
                                                // find the related shows
                                                let modifyRelatedShows = db.shows.where("prequel").equals(s.id).or('sequel').equals(s.id).or('related').equals(s.id).modify(related_show => {
                                                    console.log('related_show before', structuredClone(related_show));
                                                    // loop through all relation keys and remove the show id
                                                    relationKeys.forEach(key => {
                                                        if (related_show[key] && related_show[key].includes(s.id)) {
                                                            related_show[key].splice(related_show[key].indexOf(s.id), 1);
                                                            if (related_show[key].length === 0) {
                                                                delete related_show[key];
                                                            }
                                                        }
                                                    })
                                                    console.log('related_show after', structuredClone(related_show));
                                                    
                                                });
                                                
                                                // after we updated the related shows we going to delete the seasons
                                                let deleteSeasons = db.seasons.where('showId').equals(s.id).delete()
                                                
                                                // after we deleted the seasons, finally we will delete the show
                                                let deleteShow = db.shows.where('id').equals(s.id).delete();
                                                
                                                return Promise.all([modifyRelatedShows, deleteSeasons, deleteShow]).then(n => {
                                                    let [modifyRelatedShows, deleteSeasons, deleteShow] = n;
                                                    
                                                    console.log('modifyRelatedShows', modifyRelatedShows);
                                                    console.log('deleteSeasons', deleteSeasons);
                                                    console.log('deleteShow', deleteShow);
                                                    
                                                    console.log('promise all result', n);
                                                });
                                            })
                                        }).then(() => {
                                            console.log('commit, show deleted');
                                            
                                            $t.prop('Fragment').destroy();
                                            document.querySelectorAll('div[data-show-id="' + show.id + '"]').forEach(elem => elem.remove());
                                            
                                        }).catch(err => {
                                            console.warn('no commit');
                                            alert(err.message || err);
                                            console.error(err);
                                        })
                                    }
                                    break;
                                }
                                case 'manage-poster': {
                                    Fragment.select('show-info').push({
                                        name: "show-poster-manager-plant",
                                        params: {show: show}
                                    });
                                    break;
                                }
                                case 'edit-show': {
                                    Fragment.select('show-info').push({
                                        name: "show-edit-plant",
                                        params: {
                                            show: show
                                        }
                                    });
                                    break;
                                }
                                default: {
                                    alert('action not found');
                                }
                            }
                        });
                    }, "More options");
                }
            }])
            
            self.setNavStyle('red500');
            self.id = "show-interface";
            
            let showViewer = templates['showViewer'].cloneNode(1);
            $t.off().html(showViewer);
            
            $t.append('<div class="cover"></div>');
            
            let $posterImg = $t.find('.poster img');
            
            let posterUrl;
            $posterImg.attr('data-poster', 'show-id-' + show.id);
            if (show.poster) {
                let objUrl = inflateAndGetObject(show.poster)
                $posterImg[0].onload = function () {
                    // URL.revokeObjectURL(objUrl);
                }
                posterUrl = objUrl
                $posterImg[0].src = objUrl;
            }
            
            $t.find('.show-name').html(show.name + (show.aired ? ' <span class="aired">(' + show.aired.getFullYear() + ')</span>' : ''));
            $t.find('.show-type').text(show.type);
            
            console.log('show', show);
            
            
            let userPrefs = templates['user-prefs'].cloneNode(1);
            self.append(userPrefs);
            
            if (show.rating !== undefined) {
                let rHelper = userPrefs.querySelector(".rating .icon-helper");
                
                rHelper.classList.add('fw-bolder');
                rHelper.textContent = show.rating + "/10"
                
                userPrefs.querySelector(".rating .icon").classList.add('active-star');
                
            }
            
            if (show.userStatus) {
                userPrefs.querySelector(".user-status .icon").classList.add(show.userStatus.toLowerCase().split(/\s+/).join('-'));
                userPrefs.querySelector(".user-status .icon-helper").textContent = show.userStatus;
            }
            if (show.status) {
                userPrefs.querySelector(".status .icon").classList.add(show.status.toLowerCase().split(/\s+/).join('-'));
                userPrefs.querySelector(".status .icon-helper").textContent = show.status;
            }
            
            if (show.notes) {
                let summaryElem = create('p', 'personal-note fst-italic m-0 p-3 personal-note text-muted');
                summaryElem.innerHTML = '<i class="fa-2x fa-comment-lines fa-light fa-pull-left" style="--fa-pull-margin: 1rem;"></i>' + show.notes;
                self.append(summaryElem);
            }
            
            if (show.summary) {
                let titleElem = create('h2', 'title fs-4');
                titleElem.textContent = 'Summary';
                
                let summaryElem = create('p', 'summary');
                summaryElem.textContent = show.summary;
                self.append(titleElem, summaryElem);
            }
            
            
            const relatedShows = [show.prequel, show.sequel, show.related].flat().filter(e => e !== undefined);
            
            let getSeasons = db.seasons.where({showId: show.id}).toArray(),
                getRelatedShows = relatedShows.length > 0 ? db.shows.where('id').anyOf(relatedShows).toArray() : null;
            
            Promise.all([getSeasons, getRelatedShows]).then(result => {
                let [seasons, relatedShows] = result;
                
                
                let container = create('div', 'stacks-in hidden-scroll mx-n3 px-3 mb-4');
                seasons.forEach((season) => {
                    container.append(generateInternalCard('season', season, show, posterUrl, seasons.length));
                });
                let titleElem = create('h2', 'title fs-4');
                
                if (show.type === "Movie") {
                    titleElem.textContent = 'Movie list';
                } else if (show.type === "Anime") {
                    titleElem.textContent = 'Anime parts';
                } else {
                    titleElem.textContent = 'Show seasons' + (show.seasonsCount !== undefined ? " (" + show.seasonsCount + ")" : "");
                }
                
                self.append(titleElem, container);
                
                if (relatedShows) {
                    console.log('relatedShows', relatedShows);
                    // we use reverse because we are using related show's data
                    let prequels = relatedShows.filter(e => e.sequel?.includes(show.id)),
                        sequels = relatedShows.filter(e => e.prequel?.includes(show.id)),
                        related = relatedShows.filter(e => e.related?.includes(show.id));
                    
                    console.log('prequels', prequels);
                    console.log('sequels', sequels);
                    console.log('related', related);
                    
                    const content = [prequels, sequels, related],
                        contentType = ["Prequel", "Sequel", "Related"];
                    
                    let container = create('div', 'stacks-in hidden-scroll mx-n3 px-3 mb-4');
                    let titleElem = create('h2', 'title fs-4');
                    titleElem.textContent = 'Related shows';
                    
                    content.forEach((relatedShows, contentIndex) => {
                        if (relatedShows.length > 0) {
                            relatedShows.forEach((rShow) => {
                                let generated = generateInternalCard('show', rShow)
                                generated.querySelector('h3').insertAdjacentHTML('afterend', '<span class="show-relation-badge">' + contentType[contentIndex] + '</span>');
                                container.append(generated);
                            });
                        }
                    })
                    
                    self.append(titleElem, container);
                }
            })
            
            $t.find('img[src="images/pixel.png"]').click(function () {
                $t.prop('Fragment').push({
                    name: "show-poster-manager-plant",
                    params: {show: show}
                });
            });
            
            $t.find('#quick-show-status').click(function () {
                console.log('found frag', $t.prop('Fragment'), $t);
                $t.prop('Fragment').push({
                    name: 'show-edit-plant',
                    params: {show: show}
                })
            });
            
            $t.find('#quick-user-status').click(function () {
                $t.prop('Fragment').push({
                    name: 'show-classifier-plant',
                    params: {show: show}
                })
            });
            
        },
        complete: cm => {
            console.log('subscription complete', cm);
        },
        error: error => console.error(error)
    });
    
    this.onDestroy = function () {
        console.log('show unsubscribe');
        subscription.unsubscribe();
    }
    
    this.onResume = function () {
        this.setNavStyle('red500');
    }
});
Fragment.plant('season-interface', function (params) {
    const season = params.season,
        show = params.show;
    
    const seasonObservable = Dexie.liveQuery(() => db.seasons.get({id: params.season.id}));
    const seasonSubscription = seasonObservable.subscribe({
        next: season => {
            console.log('seasonObservable next', season);
            this.reset();
            
            let self = this,
                $t = $(self);
            
            self.id = "season-interface";
            self.registerNavAction([{
                name: 'User preferences',
                icon: 'fa-regular fa-user-gear',
                action: function () {
                    
                    // show edit fragment
                    
                    
                    Fragment.select('season-info').push({
                        name: "season-classifier-plant",
                        params: {season: season}
                    }, "soon's user preferences");
                    
                }
            }, {
                name: "Add details",
                icon: "fa-regular fa-bars-progress",
                action: function () {
                    Fragment.select('season-info').push(function () {
                        let self = this,
                            $self = $(self);
                        
                        
                        $self.html(templates['season-edit-menu'].cloneNode(1));
                        
                        $self.on('click', 'button', function () {
                            let $btn = $(this);
                            switch ($btn.data('action')) {
                                case "edit-season": {
                                    console.log('edit season');
                                    
                                    self.Fragment.push({
                                        name: 'season-edit-plant',
                                        params: {
                                            season: season,
                                            show: show
                                        }
                                    });
                                    
                                    break;
                                }
                                case "edit-season-poster": {
                                    Fragment.select('season-info').push(function () {
                                        let self = this,
                                            $t = $(self);
                                        
                                        self.registerNavAction([{
                                            name: 'Apply as show poster',
                                            id: 'make-as-show-poster',
                                            icon: 'fa-regular fa-arrow-up-from-bracket',
                                            action: function () {
                                                if (season.poster) {
                                                    console.log('seasons id', season.showId);
                                                    console.log('season poster', season.poster);
                                                    console.log('show poster', show.poster)
                                                    if (confirm('apply this season poster as the show poster? you can\'t undo this change')) {
                                                        db.shows.where({id: season.showId}).modify(s => {
                                                            s.poster = season.poster
                                                        }).then(n => {
                                                            if (n === 1) {
                                                                alert('Applied successfully');
                                                            }
                                                        })
                                                    }
                                                } else {
                                                    alert('poster is not found');
                                                }
                                            },
                                            disabled: true
                                        }, {
                                            name: 'search Google for poster',
                                            icon: 'fa-regular fa-g',
                                            action: function () {
                                                window.open("https://www.google.com/search?hl=en&tbm=isch&q=" + encodeURIComponent(show.name + ' ' + (season.name ? season.name : "S" + season.position) + (season.aired ? " (" + season.aired.getFullYear() + ")" : "") + ' official poster'));
                                            }
                                        }]);
                                        
                                        $t.html(templates['upload-image'].cloneNode(1));
                                        
                                        let $imageUrl = $t.find('#set-image-url'),
                                            $posterImg = $t.find('.poster img');
                                        
                                        let $getImage = $t.find('#get-image'),
                                            $saveBtn = $t.find('#save-image');
                                        
                                        $posterImg.attr('data-poster', 'season-id-' + season.id);
                                        
                                        if (season.poster) {
                                            
                                            self.previousElementSibling.querySelector('#make-as-show-poster').disabled = false
                                            
                                            let objUrl = inflateAndGetObject(season.poster)
                                            $posterImg[0].onload = function () {
                                                URL.revokeObjectURL(objUrl);
                                            }
                                            $posterImg[0].src = objUrl;
                                        }
                                        
                                        let objectUrl;
                                        
                                        $imageUrl[0].addEventListener("paste", () => {
                                            console.log('paste');
                                            navigator.clipboard.read().then(items => {
                                                let imagesItems = items.filter(e => e.types.some(type => type.startsWith("image/")));
                                                console.log('imagesItems', imagesItems);
                                                if (imagesItems.length !== 0) {
                                                    let imageType = imagesItems[0].types.find(type => type.startsWith("image/"));
                                                    imagesItems[0].getType(imageType).then(blob => {
                                                        
                                                        let imageUrl = URL.createObjectURL(blob)
                                                        objectUrl = imageUrl;
                                                        
                                                        $saveBtn.prop('disabled', false);
                                                        $posterImg[0].src = imageUrl
                                                        
                                                    })
                                                } else {
                                                    alert('available types are: ' + Array.from(new Set(items.flatMap(e => e.types))).join(', '));
                                                }
                                            }).catch((err) => {
                                                console.error(err);
                                                alert(err.message);
                                            });
                                        });
                                        
                                        $getImage.click(function () {
                                            let self = this,
                                                $self = $(self);
                                            
                                            let val = $imageUrl.val();
                                            if (val.trim() === "") {
                                                alert('add image url');
                                            } else {
                                                $self.prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>');
                                                $saveBtn.prop('disabled', true);
                                                
                                                console.log('valid url', val);
                                                
                                                if (objectUrl) {
                                                    URL.revokeObjectURL(objectUrl);
                                                    objectUrl = null;
                                                }
                                                
                                                Helper.getImage(val, true).then(blob => {
                                                    // save it, we will use it when we confirm adding image
                                                    
                                                    let imageUrl = URL.createObjectURL(blob)
                                                    
                                                    objectUrl = imageUrl;
                                                    
                                                    console.log('blob', blob);
                                                    console.log('objectUrl', imageUrl);
                                                    
                                                    $saveBtn.prop('disabled', false);
                                                    $self.text('Get').prop('disabled', false);
                                                    
                                                    $posterImg[0].src = imageUrl
                                                }).catch(n => {
                                                    console.error(n);
                                                    $posterImg[0].attr('src', 'images/pixel.png');
                                                    $saveBtn.prop('disabled', true);
                                                    $self.text('Get').prop('disabled', false);
                                                });
                                                
                                            }
                                        })
                                        
                                        $saveBtn.click(function () {
                                            console.log('set image to:', 'season' + season.id);
                                            console.log('objectUrl', objectUrl)
                                            
                                            Helper.resizePoster(objectUrl).then(blob => {
                                                blob.arrayBuffer().then(buffer => {
                                                    let arrayBuffer = new Uint8Array(buffer);
                                                    db.seasons.where({id: season.id}).modify(season => {
                                                        season.poster = pako.deflate(arrayBuffer);
                                                    }).then(n => {
                                                        if (n === 1) {
                                                            document.querySelectorAll('img[data-poster="season-id-' + season.id + '"]').forEach(n => {
                                                                let obj = URL.createObjectURL(blob);
                                                                n.onload = function () {
                                                                    URL.revokeObjectURL(obj);
                                                                }
                                                                n.src = obj
                                                            });
                                                            URL.revokeObjectURL(objectUrl);
                                                            console.log('saved');
                                                            
                                                            $t.prop('Fragment').home();
                                                        } else {
                                                            alert('unexpected reach');
                                                        }
                                                    });
                                                });
                                            });
                                        })
                                        
                                        
                                        if (undefined !== season.poster) {
                                            let $removePoster = $t.find('#remove-poster');
                                            $removePoster.prop('disabled', false);
                                            $removePoster.click(function () {
                                                if (confirm('remove this season poster?')) {
                                                    db.seasons.where({id: season.id}).modify(n => {
                                                        delete n.poster;
                                                    }).then(n => {
                                                        console.log('poster removed', n);
                                                        $posterImg[0].src = "images/pixel.png"
                                                    })
                                                }
                                            });
                                        }
                                        
                                        
                                    }, (season.name || (show.name + " " + appendOrdinalSuffix(season.position) + " season")) + "'s poster");
                                    
                                    break;
                                }
                                default: {
                                    console.log('action not found');
                                }
                            }
                        })
                        
                    }, "Edit season's information");
                }
            }]);
            self.setNavStyle('indigo600');
            self.setTitle(season.name || (show.name + " " + appendOrdinalSuffix(season.position) + ' part'))
            
            let drawing = $(templates['season-header'].cloneNode(true));
            
            drawing.find('.season-name').text(season.name || show.name);
            
            if (!season.name) {
                drawing.find('.season-name-prefix').text("Season " + season.position);
            } else {
                drawing.find('.season-name-prefix').text(show.name + '\'s');
            }
            
            if (season.aired) {
                drawing.find('.season-name-extend small').text(season.aired.getFullYear());
            }
            
            $t.html(drawing);
            
            $t.append('<div class="cover"></div>');
            
            
            let $posterImg = $t.find('.poster img');
            $posterImg.attr('data-poster', 'season-id-' + season.id);
            if (season.poster || show.poster) {
                let objUrl = inflateAndGetObject(season.poster || show.poster);
                $posterImg[0].onload = function () {
                    // URL.revokeObjectURL(objUrl);
                }
                $posterImg[0].src = objUrl;
                
                if (!season.poster) {
                    $posterImg[0].insertAdjacentHTML('beforebegin', '<span class="ribbon" style="background: #520dc2;box-shadow: 0 0 0 30px #520dc2;color: white;">show poster</span>')
                }
            }
            
            
            let userPrefs = templates['user-prefs'].cloneNode(1);
            $t.append(userPrefs);
            
            if (season.rating !== undefined) {
                let rHelper = userPrefs.querySelector(".rating .icon-helper");
                
                rHelper.classList.add('fw-bolder');
                rHelper.textContent = season.rating + "/10"
                
                userPrefs.querySelector(".rating .icon").classList.add('active-star');
                
            }
            
            if (season.userStatus) {
                console.log('set user-status');
                console.log(userPrefs.querySelector(".user-status .icon"));
                userPrefs.querySelector(".user-status .icon").classList.add(season.userStatus.toLowerCase().split(/\s+/).join('-'));
                userPrefs.querySelector(".user-status .icon-helper").textContent = season.userStatus;
            }
            if (season.status) {
                userPrefs.querySelector(".status .icon").classList.add(season.status.toLowerCase().split(/\s+/).join('-'));
                userPrefs.querySelector(".status .icon-helper").textContent = season.status;
            }
            
            
            if (season.notes) {
                let summaryElem = create('p', 'personal-note fst-italic m-0 p-3 personal-note text-muted');
                summaryElem.innerHTML = '<i class="fa-2x fa-comment-lines fa-light fa-pull-left" style="--fa-pull-margin: 1rem;"></i>' + season.notes;
                self.append(summaryElem);
            }
            
            if (season.summary) {
                let titleElem = create('h2', 'title fs-4');
                titleElem.textContent = 'Summary';
                
                let summaryElem = create('p', 'summary');
                summaryElem.textContent = season.summary;
                self.append(titleElem, summaryElem);
            }
            
            
            $t.find('#quick-show-status').click(function () {
                $t.prop('Fragment').push({
                    name: 'season-edit-plant',
                    params: {
                        season: season,
                        show: show
                    }
                })
            });
            
            $t.find('#quick-user-status').click(function () {
                $t.prop('Fragment').push({
                    name: 'season-classifier-plant',
                    params: {show: show, season: season}
                })
            });
        },
        error: error => console.error(error)
    })
    
    this.onDestroy = function () {
        console.log('season unsubscribe');
        seasonSubscription.unsubscribe();
    }
})
Fragment.plant('show-classifier-plant', function (params) {
    
    const show = params.show;
    
    let $t = $(this);
    
    this.setTitle('User preferences');
    
    $t.html(templates['classify-show'].cloneNode(1));
    
    let showUserStatus = $t.find('#edit-show-userStatus'),
        showRating = $t.find('#edit-show-rating'),
        showNotes = $t.find('#edit-show-notes');
    
    showUserStatus.val(show.userStatus ?? "");
    showRating.val(show.rating ?? "");
    showNotes.val(show.notes ?? "");
    
    
    $t.find('#classify-show').submit(function () {
        let changes = {
            userStatus: showUserStatus.val() === show.userStatus || (showUserStatus.val().trim() === "" && !show.userStatus) ? false : showUserStatus.val(),
            rating: isNaN(parseInt(showRating.val())) || parseInt(showRating.val()) === show.rating ? (showRating.val().trim() === "" && show.rating !== undefined ? 0 : false) : parseInt(showRating.val()),
            notes: showNotes.val().trim() === (show.notes ?? "") ? false : showNotes.val().trim(),
        }
        console.log(changes)
        
        let checkChanges = Object.entries(changes).filter(n => n[1] !== false);
        if (checkChanges.length !== 0) {
            db.transaction('rw', db.shows, () => {
                return db.shows.where({id: show.id}).modify(_show => {
                    checkChanges.forEach(n => {
                        let key = n[0],
                            value = n[1];
                        
                        console.log(key, value);
                        if ((key === "rating" && value === 0) || (key === "notes" && value === "")) {
                            delete _show[key]
                        } else {
                            _show[key] = value;
                        }
                        
                    });
                    console.log('final', _show);
                })
            }).then(changes => {
                console.log('changes commit', changes);
                
                
                if (changes === 1) {
                    
                    $t.prop('Fragment').home();
                    
                } else alert('unexpected results, changes is not 1');
                
                
            }).catch(err => {
                console.log('err', err);
            });
            
        } else {
            $t.prop('Fragment').back();
        }
        
    });
    
    
});
Fragment.plant('season-classifier-plant', function (params) {
    
    const season = params.season;
    
    let $t = $(this);
    $t.html(templates['classify-season'].cloneNode(1));
    
    let seasonUserStatus = $t.find('#edit-season-userStatus'),
        seasonRating = $t.find('#edit-season-rating'),
        seasonNotes = $t.find('#edit-season-notes');
    
    seasonUserStatus.val(season.userStatus ?? "");
    seasonRating.val(season.rating ?? "");
    seasonNotes.val(season.notes ?? "");
    
    
    $t.find('#classify-season').submit(function () {
        let changes = {
            userStatus: seasonUserStatus.val() === season.userStatus || (seasonUserStatus.val().trim() === "" && !season.userStatus) ? false : seasonUserStatus.val(),
            rating: isNaN(parseInt(seasonRating.val())) || parseInt(seasonRating.val()) === season.rating ? (seasonRating.val().trim() === "" && season.rating !== undefined ? 0 : false) : parseInt(seasonRating.val()),
            notes: seasonNotes.val().trim() === (season.notes ?? "") ? false : seasonNotes.val().trim(),
        }
        console.log(changes)
        
        let checkChanges = Object.entries(changes).filter(n => n[1] !== false);
        
        if (checkChanges.length !== 0) {
            db.transaction('rw', db.seasons, () => {
                return db.seasons.where({id: season.id}).modify(_season => {
                    checkChanges.forEach(n => {
                        let key = n[0],
                            value = n[1];
                        
                        console.log(key, value);
                        if ((key === "rating" && value === 0) || (key === "notes" && value === "")) {
                            delete _season[key]
                        } else {
                            _season[key] = value;
                        }
                        
                    });
                    console.log('final', _season);
                })
            }).then(changes => {
                console.log('changes commit', changes);
                
                if (changes === 1) {
                    
                    console.log('changes 1, go home');
                    Fragment.select('season-info').home();
                    
                    // Promise.all([db.shows.get({id: season.showId}), db.seasons.get({id: season.id})]).then(result => {
                    //     let [show, season] = result;
                    //
                    //     Fragment.select('season-info').destroy();
                    //
                    //     console.log("season after update", structuredClone(season))
                    //     Fragment.select('season-info').push({
                    //         name: "season-interface",
                    //         params: {
                    //             season: season,
                    //             show: show
                    //         }
                    //     }, season.name);
                    // })
                    
                } else alert('unexpected results, changes is not 1');
            }).catch(err => {
                // Transaction aborted. NOT WITHIN ZONE!
                console.log('err', err);
            });
            
        } else {
            console.log('no changes');
        }
    });
    
});
Fragment.plant("show-edit-plant", function (params) {
    const show = params.show;
    
    let $t = $(this);
    
    this.setTitle("Edit " + show.name);
    
    $t.html(templates['show-edit-form'].cloneNode(1));
    
    let showId = $t.find('#edit-show-id'),
        showAdded = $t.find('#edit-show-added'),
        showName = $t.find('#edit-show-name'),
        showType = $t.find('#edit-show-type'),
        showAired = $t.find('#edit-show-aired'),
        showSummary = $t.find('#edit-show-summary'),
        showSeasonsCount = $t.find('#edit-show-seasons-count'),
        showStatus = $t.find('#edit-show-status'),
        showLanguage = $t.find('#edit-show-language'),
        showIMDbId = $t.find('#edit-show-imdb-id');
    
    showId.val(show.id);
    showAdded.val(Helper.formatDate(show.added));
    showName.val(show.name);
    showType.val(show.type);
    showAired.val(show.aired ? Helper.formatDate(show.aired) : "");
    showSummary.val(show.summary ?? "");
    showSeasonsCount.val(show.seasonsCount ?? "");
    showStatus.val(show.status ?? "");
    
    showLanguage.val(show.language ?? "");
    showIMDbId.val(show.IMDbId ?? "");
    
    
    $t.find('#show-edit-form').submit(function () {
        
        console.log('current show', show);
        
        let changes = {
            name: showName.val().trim() === show.name ? false : showName.val().trim(),
            
            type: showType.val() === show.type ? false : showType.val(),
            
            aired: showAired.val() === "" ? (show.aired ? 0 : false) : parseDate(showAired.val()).getTime() === show.aired?.getTime() ? false : parseDate(showAired.val()),
            
            summary: showSummary.val().trim() === "" ? (show.summary ? 0 : false) : (showSummary.val() === show.summary ? false : showSummary.val().trim()),
            
            seasonsCount: showSeasonsCount.val() === "" ? (show.seasonsCount !== undefined ? 0 : false) : (parseInt(showSeasonsCount.val()) === show.seasonsCount ? false : parseInt(showSeasonsCount.val())),
            
            status: showStatus.val() === "" ? (show.status ? 0 : false) : (showStatus.val() === show.status ? false : showStatus.val()),
            language: showLanguage.val() === "" ? (show.language ? 0 : false) : (showLanguage.val() === show.language ? false : showLanguage.val()),
            IMDbId: showIMDbId.val() === "" ? (show.IMDbId ? 0 : false) : (showIMDbId.val() === show.IMDbId ? false : showIMDbId.val())
        }
        
        console.log("CHANGES:===============")
        console.log(changes)
        
        let checkChanges = Object.entries(changes).filter(n => n[1] !== false);
        if (checkChanges.length !== 0) {
            db.transaction('rw', db.shows, db.seasons, () => {
                return new Dexie.Promise(async (resolve, reject) => {
                    
                    // WARNING: this type of modification only works when we know that we are editing single item
                    
                    let _show = await db.shows.get({id: show.id});
                    
                    // we use for of loop because it does support async waiting
                    // in this loop we do the async work and edit other tables
                    for (const n of checkChanges) {
                        console.log('loop', n[0]);
                        let key = n[0],
                            value = n[1];
                        
                        console.log(key, value);
                        
                        if (key === 'seasonsCount') {
                            console.log('old episodesCount', show.seasonsCount);
                            if (value === 0) {
                                delete _show[key]
                            } else if (value > show.seasonsCount) {
                                let collection = db.seasons.where({showId: show.id}),
                                    numOfCollectionsFound = await collection.count();
                                
                                // check if data are accurate
                                if (numOfCollectionsFound === show.seasonsCount) {
                                    console.log('data are accurate (add)');
                                    
                                    let addCount = value - show.seasonsCount;
                                    console.log("we added seasons, old: " + show.seasonsCount + ' new: ' + value);
                                    console.log('number of added seasons', addCount)
                                    
                                    let itemsToAdd = Array(addCount).fill(undefined).map((elem, index) => ({
                                        showId: show.id,
                                        position: show.seasonsCount + (index + 1),
                                        added: new Date()
                                    }));
                                    console.log(itemsToAdd);
                                    let addingSeasons = await db.seasons.bulkAdd(itemsToAdd);
                                    
                                    console.log('addingSeasons', addingSeasons);
                                    
                                    _show[key] = value;
                                    
                                } else {
                                    return reject('The number of the show\'s seasons is not same as stated in its details');
                                }
                            } else if (value < show.seasonsCount) {
                                let deleteCount = show.seasonsCount - value;
                                
                                if (confirm('by saving the changes you going to delete last ' + deleteCount + ' seasons of "' + show.name + '"')) {
                                    console.log('it is ok to delete');
                                    
                                    
                                    let collection = db.seasons.where({showId: show.id}).offset(value),
                                        numOfCollectionsFoundUsingOffset = await collection.count();
                                    
                                    
                                    // check if data are accurate
                                    if (numOfCollectionsFoundUsingOffset === deleteCount) {
                                        console.log('data are accurate (delete)');
                                        
                                        let deletingItems = await collection.delete();
                                        
                                        console.log('deletingItems', deletingItems);
                                        _show[key] = value;
                                    } else {
                                        return reject('The number of the show\'s seasons is not same as stated in its details');
                                    }
                                } else {
                                    return reject("changes are not saved, canceled on episodesCount")
                                }
                            } else {
                                return reject("unexpected outcome")
                            }
                        } else {
                            if (value === 0) {
                                delete _show[key]
                            } else _show[key] = value;
                            
                        }
                    }
                    
                    // The logic here is to wait for the previous loop to do all the changes needed to other tables
                    // and do other async work, then if it did not face any error we commit using resolve function
                    // This is because Dexie.modify does not support async jobs
                    resolve(db.shows.where({id: show.id}).modify(s => {
                        for (const [key, value] of checkChanges) {
                            
                            console.log('saving', key, value);
                            if (value === 0) {
                                delete s[key]
                            } else s[key] = value
                            
                        }
                    }));
                    
                });
            }).then(changes => {
                
                console.log("Then is hit");
                
                // changes should always be 1 because we editing one item
                if (changes === 1) {
                    $t.prop('Fragment').home();
                } else alert('changes is not 1 as expected');
                
            }).catch(err => {
                // Transaction aborted. NOT WITHIN ZONE!
                console.warn('err', err);
                console.log([err]);
                alert('not saved: ' + (err.message || err));
            });
        } else {
            console.log('no changes');
            $t.prop('Fragment').back();
        }
    });
    
})
Fragment.plant("season-edit-plant", function (params) {
    const season = params.season,
        show = params.show;
    
    let self = this,
        $t = $(self);
    
    self.setTitle('Edit season\'s details');
    
    $t.html(templates['season-edit-form'].cloneNode(1));
    
    
    let seasonName = $t.find('#edit-season-name'),
        seasonAired = $t.find('#edit-season-aired'),
        seasonSummary = $t.find('#edit-season-summary'),
        seasonEpisodesCount = $t.find('#edit-season-episodes-count'),
        seasonEpisodesRangeFrom = $t.find('#episodesRangeFrom'),
        seasonEpisodesRangeTo = $t.find('#episodesRangeTo'),
        seasonLastWatchedEpisode = $t.find('#edit-season-last-watched-episode'),
        seasonStatus = $t.find('#edit-season-status');
    
    seasonName.val(season.name ?? "");
    seasonAired.val(season.aired ? Helper.formatDate(season.aired) : "");
    seasonSummary.val(season.summary ?? "");
    seasonEpisodesCount.val(season.episodesCount ?? "");
    seasonEpisodesRangeFrom.val(season.episodesRangeFrom ?? "");
    seasonEpisodesRangeTo.val(season.episodesRangeTo ?? "");
    seasonLastWatchedEpisode.val(season.lastWatchedEpisode ?? "");
    seasonStatus.val(season.status ?? "");
    
    
    $t.find('#season-edit-form').submit(function () {
        
        let changes = {
            name: seasonName.val().trim() === "" ? (season.name ? 0 : false) : (seasonName.val() === season.name ? false : seasonName.val().trim()),
            aired: seasonAired.val() === "" ? (season.aired ? 0 : false) : parseDate(seasonAired.val()).getTime() === season.aired?.getTime() ? false : parseDate(seasonAired.val()),
            summary: seasonSummary.val().trim() === "" ? (season.summary ? 0 : false) : (seasonSummary.val() === season.summary ? false : seasonSummary.val().trim()),
            episodesCount: seasonEpisodesCount.val() === "" ? (season.episodesCount !== undefined ? 0 : false) : (parseInt(seasonEpisodesCount.val()) === season.episodesCount ? false : parseInt(seasonEpisodesCount.val())),
            episodesRangeFrom: seasonEpisodesRangeFrom.val() === "" ? (season.episodesRangeFrom !== undefined ? 0 : false) : (parseInt(seasonEpisodesRangeFrom.val()) === season.episodesRangeFrom ? false : parseInt(seasonEpisodesRangeFrom.val())),
            episodesRangeTo: seasonEpisodesRangeTo.val() === "" ? (season.episodesRangeTo !== undefined ? 0 : false) : (parseInt(seasonEpisodesRangeTo.val()) === season.episodesRangeTo ? false : parseInt(seasonEpisodesRangeTo.val())),
            lastWatchedEpisode: seasonLastWatchedEpisode.val() === "" ? (season.lastWatchedEpisode !== undefined ? 0 : false) : (parseInt(seasonLastWatchedEpisode.val()) === season.lastWatchedEpisode ? false : parseInt(seasonLastWatchedEpisode.val())),
            status: seasonStatus.val() === "" ? (season.status ? 0 : false) : (seasonStatus.val() === season.status ? false : seasonStatus.val())
        }
        
        console.log(changes)
        
        let checkChanges = Object.entries(changes).filter(n => n[1] !== false);
        
        console.log('checkChanges', checkChanges);
        if (checkChanges.length !== 0) {
            db.seasons.where({id: season.id}).modify(_season => {
                for (const [key, value] of checkChanges) {
                    if (value === 0) {
                        console.log('deleting', key);
                        delete _season[key]
                    } else {
                        console.log('saving', key, value);
                        _season[key] = value;
                    }
                }
            }).then(changes => {
                
                console.log("Then is hit, changes", changes);
                console.log('go home');
                $t.prop('Fragment').home();
                
                // db.seasons.get({id: season.id}).then(season => {
                //     $t.prop('Fragment').clear();
                //     console.log('cleared');
                //     $t.prop('Fragment').push({
                //         name: "season-interface",
                //         params: {
                //             season: season,
                //             show: show
                //         }
                //     });
                // })
            }).catch(err => {
                // Transaction aborted. NOT WITHIN ZONE!
                console.warn('err', err);
                console.log([err]);
                alert('not saved: ' + (err.message || err));
            });
            
        } else {
            console.log('no changes');
            $t.prop('Fragment').back();
        }
        
    });
    
});
Fragment.plant('show-poster-manager-plant', function (params) {
    const show = params.show;
    
    let self = this,
        $t = $(self);
    
    self.setTitle(show.name + "'s poster");
    self.registerNavAction([{
        name: 'search Google for poster',
        icon: 'fa-regular fa-g',
        action: function () {
            window.open("https://www.google.com/search?hl=en&tbm=isch&q=" + encodeURIComponent(show.name + (show.aired ? (" (" + show.aired.getFullYear() + ")") : "") + " official poster"));
        }
    }]);
    
    
    $t.html(templates['upload-image'].cloneNode(1));
    
    let $imageUrl = $t.find('#set-image-url'),
        $posterImg = $t.find('.poster img');
    
    
    let $getImage = $t.find('#get-image'),
        $saveBtn = $t.find('#save-image');
    
    $posterImg.attr('data-poster', 'show-id-' + show.id);
    if (show.poster) {
        let objUrl = inflateAndGetObject(show.poster)
        
        $posterImg[0].onload = function () {
            URL.revokeObjectURL(objUrl);
        }
        $posterImg[0].src = objUrl;
    }
    
    let objectUrl;
    $imageUrl[0].addEventListener("paste", () => {
        console.log('paste');
        navigator.clipboard.read().then(items => {
            let imagesItems = items.filter(e => e.types.some(type => type.startsWith("image/")));
            console.log('imagesItems', imagesItems);
            if (imagesItems.length !== 0) {
                let imageType = imagesItems[0].types.find(type => type.startsWith("image/"));
                imagesItems[0].getType(imageType).then(blob => {
                    
                    let imageUrl = URL.createObjectURL(blob)
                    objectUrl = imageUrl;
                    
                    $saveBtn.prop('disabled', false);
                    $posterImg[0].src = imageUrl
                    
                })
            } else {
                alert('available types are: ' + Array.from(new Set(items.flatMap(e => e.types))).join(', '));
            }
        }).catch((err) => {
            console.error(err);
            alert(err.message);
        });
    });
    
    $getImage.click(function () {
        let self = this,
            $self = $(self);
        
        let val = $imageUrl.val();
        if (val.trim() === "") {
            alert('add image url');
        } else {
            $self.prop('disabled', true).html('<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>');
            $saveBtn.prop('disabled', true);
            
            console.log('valid url', val);
            
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
                objectUrl = null;
            }
            
            
            Helper.getImage(val, true).then(blob => {
                // save it, we will use it when we confirm adding image
                
                let imageUrl = URL.createObjectURL(blob)
                objectUrl = imageUrl;
                console.log('blob', blob);
                console.log('objectUrl', imageUrl);
                $saveBtn.prop('disabled', false);
                $self.text('Get').prop('disabled', false);
                $posterImg[0].src = imageUrl
                
            }).catch(n => {
                console.error(n);
                $posterImg[0].attr('src', 'images/pixel.png');
                $saveBtn.prop('disabled', true);
                $self.text('Get').prop('disabled', false);
            });
            
        }
    })
    
    $saveBtn.click(function () {
        console.log('set image to:', 'show' + show.id);
        console.log('objectUrl', objectUrl)
        
        Helper.resizePoster(objectUrl).then(blob => {
            blob.arrayBuffer().then(buffer => {
                let arrayBuffer = new Uint8Array(buffer);
                db.shows.where({id: show.id}).modify(show => {
                    show.poster = pako.deflate(arrayBuffer);
                }).then(n => {
                    if (n === 1) {
                        URL.revokeObjectURL(objectUrl);
                        console.log('saved');
                        $t.prop('Fragment').home();
                    } else {
                        alert('unexpected reach');
                    }
                });
            });
        });
    })
    
    if (undefined !== show.poster) {
        let $removePoster = $t.find('#remove-poster');
        $removePoster.prop('disabled', false);
        $removePoster.click(function () {
            if (confirm('remove this season poster?')) {
                db.shows.where({id: show.id}).modify(n => {
                    delete n.poster;
                }).then(n => {
                    console.log('poster removed', n);
                    $posterImg[0].src = "images/pixel.png"
                })
            }
        });
    }
    
})


let inflateAndGetObject = (data) => {
    let inflatedImage = pako.inflate(data), // decompress image
        blob = new Blob([inflatedImage.buffer], {type: 'image/jpeg'});
    
    return URL.createObjectURL(blob);
}

// main page
function generateShowCard(show) {
    let showCard = create('div', 'show-card');
    
    showCard.dataset.showId = show.id;
    
    showCard.appendHTML('<div class="global-poster poster"><img draggable="false" alt="" class="posterImage" loading="lazy" data-poster="show-id-' + show.id + '" src="' + (show.poster ? inflateAndGetObject(show.poster) : "images/pixel.png") + '"/></div>');
    
    let cardContent = create('div');
    cardContent.appendHTML('<h3 class="show-title">' + show.name + (show.aired ? ' <span class="aired">(' + show.aired.getFullYear() + ')</span>' : '') + '</h3>')
    showCard.append(cardContent);
    
    return showCard
}

function generateInternalCard(type, item, seasonShow, showPoster, numberOfSeasons) {
    let showCard = create('div', (type === 'season' ? 'season-card ' : 'show-card ') + 'stacks-in-card' + (item.status === "Upcoming" ? ' upcoming' : ""));
    
    if (type === 'season') {
        showCard.dataset.seasonId = item.id;
    } else {
        showCard.dataset.showId = item.id;
    }
    
    if (type === "season") {
        showCard.appendHTML('<div class="global-poster poster">' + (item.status === "Upcoming" ? '<span class="ribbon">Upcoming</span>' : "") + '<img draggable="false" alt="" class="posterImage" loading="lazy" data-poster="' + ('season-id-' + item.id) + '" src="' + (item.poster ? inflateAndGetObject(item.poster) : (showPoster ? showPoster : "images/pixel.png")) + '"/></div>');
    } else {
        showCard.appendHTML('<div class="global-poster poster"><img draggable="false" alt="" class="posterImage" loading="lazy" data-poster="show-id-' + item.id + '" src="' + (item.poster ? inflateAndGetObject(item.poster) : "images/pixel.png") + '"/></div>');
    }
    
    
    let cardContent = create('div');
    if (type === 'season') {
        cardContent.appendHTML('<h3 class="stack-in-card-title">' + ((item.name || seasonShow.name) + (item.aired ? ' <span class="aired">(' + item.aired.getFullYear() + ')</span>' : '')) + '</h3>')
        
        let moreInfo = create('div', 'season-more-info');
        moreInfo.appendHTML((numberOfSeasons > 1 ? ' <span class="season-position">(' + item.position + '/' + numberOfSeasons + ')</span>' : ''))
        cardContent.append(moreInfo);
    } else {
        cardContent.appendHTML('<h3 class="stack-in-card-title">' + item.name + (item.aired ? ' <span class="aired">(' + item.aired.getFullYear() + ')</span>' : '') + '</h3>')
    }
    
    showCard.append(cardContent);
    return showCard
}


const $showcase = $('.showcase'),
    tt = Helper.domFromHTML('<div class="stack"><h2 class="stack-title"></h2><div class="shows-list"><div class="show-list-inner"></div></div></div>'),
    collections = [
        ["Unclassified titles", show => !show.userStatus],
        ["I'm watching", show => show.userStatus === "Watching"],
        ["I Paused", show => show.userStatus === "On-Hold"],
        ["I'm waiting", show => show.userStatus === "Pending"],
        ["I Plan to watch", show => show.userStatus === "Plan to Watch"],
        ["Completed", show => show.userStatus === "Completed"],
        ["Dropped shows", show => show.userStatus === "Dropped"],
    ];


const observable = Dexie.liveQuery(() => db.shows.toArray());
const observingFunction = {
    next: shows => {
        console.log('shows', shows);
        
        $showcase.empty();
        
        //
        // {
        //     let elem = tt.cloneNode(1),
        //         titles_container = elem.querySelector('.show-list-inner');
        //
        //     elem.querySelector('h2').textContent = "All titles";
        //     shows.forEach(show => {
        //         titles_container.append(generateShowCard(show))
        //     })
        //     $showcase.append(elem)
        // }
        
        collections.forEach(([name, f]) => {
            let elem = tt.cloneNode(1),
                titles_container = elem.querySelector('.show-list-inner');
            
            elem.querySelector('h2').textContent = name;
            shows.filter(f).forEach(show => {
                titles_container.append(generateShowCard(show))
            })
            $showcase.append(elem)
        });
        
        
    }
}
let subscription = observable.subscribe(observingFunction)

const $body = $('body');
$showcase.on('active', function () {
    subscription = observable.subscribe(observingFunction);
    $body.removeClass('no-scroll');
}).on('inactive', function () {
    subscription.unsubscribe();
    $body.addClass('no-scroll');
});


let $drawer = $('.drawer'),
    $drawerContainer = $('.drawer-container'),
    $drawerDim = $('.drawer-dim'),
    drawerOpen = false;

function closeDrawer() {
    return new Promise(resolve => {
        $drawerContainer.removeClass('open');
        drawerOpen = false;
        setTimeout(function () {
            resolve();
        }, 300);
    })
}

$('#toggle-drawer').click(function () {
    if (drawerOpen) {
        closeDrawer();
    } else {
        $drawerContainer.addClass('open');
        drawerOpen = true;
    }
})

$drawerDim.click(function () {
    closeDrawer();
})

let importDBinput = document.getElementById("file-selector");

importDBinput.addEventListener("change", function () {
    let file = importDBinput.files[0];
    let reader = new FileReader();
    reader.onload = function () {
        let blob = new Blob([reader.result], {type: file.type});
        // Do something with the blob here
        console.log('blob', blob);
        
        Dexie.import(blob, {
            acceptNameDiff: false,
            acceptChangedPrimaryKey: false,
            acceptMissingTables: false,
            overwriteValues: true,
        }).then(e => {
            alert('imported successfully');
        }).catch(e => {
            console.error(e);
        })
        
    };
    reader.readAsArrayBuffer(file);
});


let peer = null,
    conn = null,
    lastPeerId = null;

$('.drawer button').click(function () {
    switch ($(this).data('action')) {
        case 'import-database': {
            
            importDBinput.click();
            
            break;
        }
        case 'export-database': {
            console.log('export-database');
            
            db.export().then(blob => {
                let date = new Date(),
                    daySecond = ((date.getUTCHours() * 3600) + (date.getUTCMinutes() * 60) + date.getUTCSeconds() + "").padStart(5, 0);
                
                let fileName = "ShowsBrain-" + date.toISOString().substring(0, 10) + ";" + daySecond;
                download(blob, fileName + ".json", "application/json");
            });
            
            break;
        }
        case 'send-database': {
            closeDrawer().then(() => {
                Fragment.select('db-transfer').push(function () {
                    
                    this.onDestroy = function () {
                        peer?.destroy();
                    }
                    
                    let self = this,
                        $self = $(self);
                    
                    $self.html(templates.sender.cloneNode(1));
                    
                    function initialize() {
                        // Create own peer object with connection to shared PeerJS server
                        peer = new Peer(null, {
                            debug: 2
                        });
                        
                        // Emitted when a connection to the PeerServer is established
                        peer.on('open', function () {
                            console.log('open');
                            console.log('ID: ' + peer.id);
                        });
                        
                        // Emitted when a new data connection is established from a remote peer.
                        peer.on('connection', function (c) {
                            console.log('connection');
                            // Disallow incoming connections
                            c.on('open', function () {
                                c.send("Sender does not accept incoming connections");
                                setTimeout(function () {
                                    c.close();
                                }, 500);
                            });
                        });
                        
                        peer.on('disconnected', function () {
                            
                            console.log('disconnected');
                            console.log('Connection lost. Please reconnect');
                            
                            // Workaround for peer.reconnect deleting previous id
                            // peer.id = lastPeerId;
                            // peer._lastServerId = lastPeerId;
                            peer.reconnect();
                        });
                        
                        peer.on('close', function () {
                            console.log('close');
                            conn = null;
                            console.log('Connection destroyed');
                        });
                        
                        peer.on('error', function (err) {
                            if (err.type === "peer-unavailable") {
                                
                                $connectBtn.text("Connect").prop('disabled', false);
                                alert('the reveiver is not found or unreachable');
                                
                            } else {
                                console.error(err);
                                console.log(err.message)
                                console.log([err])
                                console.log('type', err.type);
                                alert(err.type);
                            }
                        });
                    }
                    
                    initialize();
                    
                    let $connectBtn = $self.find('#connect'),
                        $sendBtn = $self.find('#send-db');
                    
                    
                    /**
                     * Create the connection between the two Peers.
                     *
                     * Sets up callbacks that handle any events related to the
                     * connection and data received on it.
                     */
                    function join() {
                        
                        // Close old connection
                        if (conn) conn.close();
                        
                        // Connects to the remote peer specified by id and returns a data connection.
                        // Be sure to listen on the error event in case the connection fails.
                        conn = peer.connect("receiver", {
                            reliable: true
                        });
                        
                        // Emitted when a connection to the PeerServer is established.
                        // You may use the peer before this is emitted, but messages to the server will be queued.
                        conn.on('open', function () {
                            console.log("Connected to: " + conn.peer);
                            $connectBtn.text("Connected")
                                .prop('disabled', true)
                                .removeClass('btn-light')
                                .addClass('btn-success');
                            
                            $sendBtn.prop('disabled', false);
                            
                        });
                        
                        conn.on('close', function () {
                            
                            console.log("Connection closed");
                            $connectBtn.text("Connect")
                                .prop('disabled', false)
                                .removeClass('btn-success')
                                .addClass('btn-light');
                            
                            $sendBtn.prop('disabled', true);
                        });
                        
                        conn.on('error', function (err) {
                            console.error(err);
                            console.log(err.message)
                            console.log([err])
                        });
                    }
                    
                    $connectBtn.click(function () {
                        $connectBtn
                            .text('connecting...')
                            .prop('disabled', true);
                        
                        join();
                    })
                    
                    $sendBtn.click(function () {

                        db.export().then(blob => {
    
                            console.log(blob);
                            conn.send(blob);
                            
                        });
                        
                    });
                    
                }, "Send db");
            })
            break;
        }
        case 'receive-database': {
            
            closeDrawer().then(() => {
                Fragment.select('db-transfer').push(function () {
                    this.onDestroy = function () {
                        peer?.destroy();
                        peer = null;
                    }
                    
                    let self = this,
                        $self = $(self);
                    
                    $self.html(templates.receiver.cloneNode(1));
                    
                    
                    let $receiveBtn = $self.find('#receive');
                    
                    
                    /**
                     * Create the Peer object for our end of the connection.
                     *
                     * Sets up callbacks that handle any events related to our
                     * peer object.
                     */
                    let initialize = function () {
                        
                        peer?.destroy();
                        
                        // Create own peer object with connection to shared PeerJS server
                        peer = new Peer('receiver', {
                            debug: 2
                        });
                        
                        // Emitted when a connection to the PeerServer is established
                        peer.on('open', function (id) {
                            // // Workaround for peer.reconnect deleting previous id
                            if (peer.id === null) {
                                console.log('Received null id from peer open');
                                peer.id = "receiver";
                            }
                            
                            console.log('ID: ' + peer.id);
                            console.log("Awaiting connection...");
                            
                            
                            $receiveBtn.text('awaiting...')
                                .removeClass(['btn-primary', 'btn-success'])
                                .addClass('btn-light')
                                .prop('disabled', true);
                        });
                        
                        peer.on('connection', function (c) {
                            // Allow only a single connection
                            if (conn && conn.open) {
                                c.on('open', function () {
                                    c.send("Already connected to another client");
                                    setTimeout(function () {
                                        c.close();
                                    }, 500);
                                });
                                return;
                            }
                            
                            conn = c;
                            console.log("Connected to: " + conn.peer);
                            
                            $receiveBtn.text('Receivable')
                                .removeClass('btn-light')
                                .addClass('btn-success')
                                .prop('disabled', true);
                            
                            ready();
                        });
                        
                        peer.on('disconnected', function () {
                            console.log('Connection lost. Please reconnect');
                            
                            // // Workaround for peer.reconnect deleting previous id
                            peer.id = "receiver";
                            // peer._lastServerId = lastPeerId;
                            
                            peer.reconnect();
                        });
                        
                        peer.on('close', function () {
                            conn = null;
                            console.log('Connection destroyed');
                        });
                        peer.on('error', function (err) {
                            console.log(err);
                            if (err.type === "unavailable-id") {
                                alert('the "receive" id is taken, try again later');
                            } else {
                                console.error(err.type);
                            }
                        });
                    };
                    
                    let $receivedChanges = $('#received-changes');
                    
                    /**
                     * Triggered once a connection has been achieved.
                     * Defines callbacks to handle incoming data and connection events.
                     */
                    function ready() {
                        conn.on('data', async function (data) {
                            
                            console.log("Data received", data);
    
                            let currentDb = [];
                            for(table of db.tables){
                                currentDb.push({name: table.name, rowCount: await table.count()});
                            }
                            
                            let blob = await Dexie.peek(new Blob([data], { type: 'text/json' }));
                            
                            console.log(blob);
                            
                            // rows changes
    
                            $receivedChanges.empty();
                            $receivedChanges.append('<h5 class="card-title">Changes</h5>');
    
                            if(blob.data.databaseVersion !== db.verno){
                                $receivedChanges.append('<small class="d-block mb-2 mt-3 text-card">version change:</small>');
                                $receivedChanges.append('<table class="table table-bordered"><thead class="table-light"><tr><th scope="col">current version</th><th scope="col">received version</th></tr></thead><tbody><tr><td>'+db.verno+'</td><td>'+blob.data.databaseVersion+'</td></tr></tbody></table>')
                            }
                            
                            $receivedChanges.append('<small class="d-block mb-2 mt-3 text-card">updates rows:</small>');
                            $receivedChanges.append('<table class="table table-bordered"><thead class="table-light"><tr><th scope="col">rows</th><th scope="col">before</th><th scope="col">after</th></tr></thead><tbody>' + blob.data.tables.map(toImportTable => {
                                let dtInCurrent = currentDb.find(e => e.name === toImportTable.name);
                                return `<tr><th>${toImportTable.name}</th><td>${dtInCurrent ? dtInCurrent.rowCount : "not found (new table)"}</td><td class="fw-bold${toImportTable.rowCount < dtInCurrent?.rowCount ? ' text-danger' : toImportTable.rowCount > dtInCurrent?.rowCount ? ' text-success' : ''}">${toImportTable.rowCount}</td></tr>`
                            }).join('') + '</tbody></table>');
                            
                            // deleted tables
                            let deletedTables = currentDb.filter(cdn => !blob.data.tables.some(e => e.name == cdn.name));
                            if(deletedTables.length > 0){
                                $receivedChanges.append('<small class="d-block mb-2 mt-3 text-card">deleted tables:</small>');
                                $receivedChanges.append('<table class="table table-bordered"><thead class="table-light"><tr><th scope="col">#</th><th scope="col">current rows</th></tr></thead><tbody>'+ deletedTables.map(deelted_table => {
                                    return `<tr><th>${deelted_table.name}</th><td>${deelted_table.rowCount}</td></tr>`
                                }).join('') +'</tbody></table>')
                            }
                            
                            $receivedChanges.append('<button class="btn btn-danger mt-3" id="accept-changes">Apply this database</button>');
    
                            $receivedChanges.find('#accept-changes').click(function(){
                               if(confirm('Apply this database? this action is irreversible. It\'s advisable to export the current database before applying the new one')){
                                   alert('apply');
                               }
                            });
                            
                        });
                        
                        conn.on('close', function () {
                            console.log("Connection reset, Awaiting connection...");
                            conn = null;
                            
                            $receiveBtn.text('awaiting...')
                                .removeClass(['btn-primary', 'btn-success'])
                                .addClass('btn-light')
                                .prop('disabled', true);
                        });
                    }
                    
                    
                    $receiveBtn.click(function () {
                        initialize();
                    })
                    
                    
                }, 'receive file');
            });
            
            
            break;
        }
        case 'open-google': {
            window.open("https://www.google.com/");
            break;
        }
    }
})