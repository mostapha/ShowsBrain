$(document).on('submit', 'form', function (e) {
    e.preventDefault();
    e.stopPropagation();
}).on('click', '.show-card', function () {
    console.log('card clicked', this.dataset.showId);
    
    let showId = this.dataset.showId;
    
    console.log('showId', showId);
    db.shows.get({id: Number(showId)}).then(show => {
        console.log('showw', show)
        if (show) {
            
            Fragment.select('show-info').push({
                name: "show-interface",
                params: {show: show}
            }, show.name);
        }
    });
    
}).on('click', '.season-card', function () {
    console.log('season card clicked', this.dataset.seasonId);
    
    let seasonId = this.dataset.seasonId;
    console.log('seasonId', seasonId);
    db.seasons.get({id: Number(seasonId)}).then(season => {
        if (season) {
            console.log('season:', season)
            db.shows.get({id: season.showId}).then(show => {
                Fragment.select('season-info').push(function () {
                    let $t = $(this);
                    
                    let drawing = $(templates['season-header'].cloneNode(true));
                    
                    if (!season.name) {
                        drawing.find('.season-name-prefix').text("Season " + season.position);
                    } else {
                        drawing.find('.season-name-prefix').text(show.name + '\'s');
                    }
                    drawing.find('.season-name').text(season.name || show.name)
                    
                    $t.html(drawing);
                    
                }, season.name || (show.name + " " + appendOrdinalSuffix(season.position) + ' part'), null, "indigo600");
            })
        } else throw "season not found";
        
        
    });
})

// load dexie
let db;
db = new Dexie("showsMemory");
db.version(2).stores({
    shows: "++id, type, status, userStatus, *prequel, *sequel, *related",
    images: "&id",
    seasons: "++id, showId"
});

console.log('works');

const reverseRelation = {
    sequel: 'prequel',
    prequel: 'sequel',
    related: 'related'
}


document.querySelector('.add-show').addEventListener('click', function () {
    
    Fragment.select('shows-adder').push(function () {
        let self = this,
            $t = $(self);
        
        let form = templates['add-show-screen'].cloneNode(1),
            $form = $(form);
        
        $t.off().html(form);
        
        let $showName = $t.find('#new-show-name'),
            $showAired = $t.find('#new-show-air-date'),
            $showType = $t.find('#new-show-type'),
            $showSeasonsCount = $t.find('#new-show-seasons-count');
        
        $form.on('submit', function (e) {
            db.transaction('rw', db.shows, db.seasons, () => {
                let dataAdded = {
                    name: $showName.val().trim(),
                    ...($showAired.val().trim() !== "" && {aired: new Date($showAired.val())}),
                    type: $showType.val(),
                    seasonsCount: parseInt($showSeasonsCount.val()),
                    added: new Date()
                };
                
                return db.shows.add(dataAdded).then(showId => {
                    
                    console.log('show added, now let\'s add seasons');
                    
                    let seasonsToAdd = Array(dataAdded.seasonsCount).fill().map((elem, index) => ({
                        showId: showId,
                        position: index + 1,
                        added: new Date()
                    }));
                    
                    console.log('seasonsToAdd', seasonsToAdd);
                    
                    db.seasons.bulkAdd(seasonsToAdd).then(n => {
                        console.log('n', n);
                        
                        self.Fragment.back();
                        db.shows.get({id: showId}).then(show => {
                            $('.show-list-inner').append(generateShowCard(show))
                            
                            
                            Fragment.select('show-info').push({
                                name: "show-interface",
                                params: {show: show}
                            }, show.name);
                            
                        });
                    })
                })
                
            }).then(n => {
                console.log('all succeed', n);
            }).catch(err => {
                console.log('found errors');
                console.error(err);
            })
            
        })
    }, 'Add new show');
});




// Fragment.select('beta-show-info').push(function(){
//     let self = this,
//         $t = $(self);
//
//     $t.text('fine');
// }, "title");


Fragment.plant('show-interface', function (params) {
    const show = params.show;
    let self = this,
        $t = $(self);
    
    // handle gear function
    self.registerNavAction([{
        name: 'User preferences',
        icon: 'fa-regular fa-user-gear',
        action: function () {
            
            // show edit fragment
            Fragment.select('show-info').push(function () {
                let $t = $(this);
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
                                db.shows.get({id: show.id}).then(show => {
                                    $t.prop('Fragment').back();
                                    
                                    
                                    Fragment.select('show-info').push({
                                        name: "show-interface",
                                        params: {show: show}
                                    }, show.name);
                                })
                            } else alert('unexpected results, changes is not 1');
                            
                            
                        }).catch(err => {
                            // Transaction aborted. NOT WITHIN ZONE!
                            console.log('err', err);
                        });
                        
                    } else {
                        console.log('no changes');
                    }
                });
                
            }, show.name + "'s user preferences");
            
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
                                                        ;
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
                                                            console.log('promise all then is hit');
                                                            console.log('x', x);
                                                            return resolve();
                                                        })
                                                    }
                                                    
                                                });
                                            }).then(n => {
                                                console.log('commit');
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
                                }).then(t => {
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
                            Fragment.select('show-info').push(function () {
                                let self = this,
                                    $t = $(self);
                                
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
                                        
                                        let imgElem = create('img');
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
                                                    document.querySelectorAll('img[data-poster="show-id-' + show.id + '"]').forEach(n => {
                                                        let obj = URL.createObjectURL(blob);
                                                        n.onload = function () {
                                                            URL.revokeObjectURL(obj);
                                                        }
                                                        n.src = obj
                                                    });
                                                    URL.revokeObjectURL(objectUrl);
                                                    console.log('saved');
                                                    
                                                    $t.prop('Fragment').back();
                                                } else {
                                                    alert('unexpected reach');
                                                }
                                            });
                                        });
                                    });
                                })
                                
                            }, show.name + "'s poster");
                            break;
                        }
                        case 'edit-show': {
                            Fragment.select('show-info').push(function () {
                                let $t = $(this);
                                $t.html(templates['show-edit-form'].cloneNode(1));
                                let showId = $t.find('#edit-show-id'),
                                    showAdded = $t.find('#edit-show-added'),
                                    showName = $t.find('#edit-show-name'),
                                    showType = $t.find('#edit-show-type'),
                                    showAired = $t.find('#edit-show-aired'),
                                    showSummary = $t.find('#edit-show-summary'),
                                    showSeasonsCount = $t.find('#edit-show-seasons-count'),
                                    showStatus = $t.find('#edit-show-status');
                                
                                showId.val(show.id);
                                showAdded.val(Helper.formatDate(show.added));
                                showName.val(show.name);
                                showType.val(show.type);
                                showAired.val(show.aired ? Helper.formatDate(show.aired) : "");
                                showSummary.val(show.summary ?? "");
                                showSeasonsCount.val(show.seasonsCount ?? "");
                                showStatus.val(show.status ?? "");
                                
                                
                                $t.find('#show-edit-form').submit(function () {
                                    let changes = {
                                        name: showName.val().trim() === show.name ? false : showName.val().trim(),
                                        type: showType.val() === show.type ? false : showType.val(),
                                        aired: new Date(showAired.val()).getTime() === show.aired?.getTime() ? false : new Date(showAired.val()),
                                        summary: showSummary.val().trim() === (show.summary ?? "") ? false : showSummary.val().trim(),
                                        seasonsCount: isNaN(parseInt(showSeasonsCount.val())) || parseInt(showSeasonsCount.val()) === show.seasonsCount ? (showSeasonsCount.val().trim() === "" ? 0 : false) : parseInt(showSeasonsCount.val()),
                                        status: showStatus.val() === (show.status ?? "") ? false : showStatus.val()
                                    }
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
                                                        console.log('old seasonsCount', show.seasonsCount);
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
                                                                
                                                                let itemsToAdd = Array(addCount).fill().map((elem, index) => ({
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
                                                                return reject("changes are not saved, canceled on seasonsCount")
                                                            }
                                                        } else {
                                                            return reject("unexpected outcome")
                                                        }
                                                    } else {
                                                        _show[key] = value;
                                                    }
                                                }
                                                
                                                // The logic here is to wait for the previous loop to do all the changes needed to other tables
                                                // and do other async work, then if it did not face any error we commit using resolve function
                                                // This is because Dexie.modify does not support async jobs
                                                resolve(db.shows.where({id: show.id}).modify(s => {
                                                    for (const n of checkChanges) {
                                                        let key = n[0];
                                                        console.log('saving', key, n[1]);
                                                        s[key] = n[1];
                                                    }
                                                }));
                                                
                                            });
                                        }).then(changes => {
                                            
                                            console.log("Then is hit");
                                            
                                            // changes should always be 1 because we editing one item
                                            if (changes === 1) {
                                                db.shows.get({id: show.id}).then(show => {
                                                    // Fragment.select('show-editor').back();
                                                    $t.prop('Fragment').back();
                                                    
                                                    let newCard = generateShowCard(show);
                                                    document.querySelectorAll('.show-card[data-show-id="' + show.id + '"]').forEach(c => {
                                                        c.replaceWith(newCard);
                                                    })
                                                    
                                                    
                                                    Fragment.select('show-info').push({
                                                        name: "show-interface",
                                                        params: {show: show}
                                                    }, show.name);
                                                    
                                                })
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
                            }, show.name);
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
    
    if (show.summary) {
        let titleElem = create('h2', 'title fs-4');
        titleElem.textContent = 'Summary';
        
        let summaryElem = create('p', 'summary');
        summaryElem.textContent = show.summary;
        self.append(titleElem, summaryElem);
    }
    
    
    db.seasons.where({showId: show.id}).toArray().then(seasons => {
        
        console.log('seasons', seasons);
        
        let container = create('div', 'stacks-in hidden-scroll mx-n3 px-3 mb-4');
        seasons.forEach((season, index) => {
            container.append(generateInternalCard('season', season, show, posterUrl));
        });
        let titleElem = create('h2', 'title fs-4');
        titleElem.textContent = 'Parts';
        self.append(titleElem, container);
        
    });
    
    
    // related shows
    const relatedShows = [show.prequel, show.sequel, show.related].flat().filter(e => e !== undefined);
    
    console.log('relatedShows', relatedShows);
    if (relatedShows.length > 0) {
        db.shows.where('id').anyOf(relatedShows).toArray().then(n => {
            console.log('n', n);
            
            // we use reverse because we are using related show's data
            let prequels = n.filter(e => e.sequel?.includes(show.id)),
                sequels = n.filter(e => e.prequel?.includes(show.id)),
                related = n.filter(e => e.related?.includes(show.id));
            
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
        })
    }
    
    // if (show.prequel) {
    //     let container = create('div', 'stacks-in hidden-scroll mx-n3 px-3');
    //
    //     db.shows.where('id').anyOf(show.prequel).toArray().then(shows => {
    //         shows.forEach((prequel, index) => {
    //             container.append(generateInternalCard('show', prequel));
    //         });
    //         let titleElem = create('h2', 'title');
    //         titleElem.textContent = 'Prequel';
    //         self.append(titleElem, container);
    //     })
    // }
    // if (show.sequel) {
    //     console.log(('has sequel'));
    //     console.log('show.sequel', show.sequel);
    //
    //     let container = create('div', 'stacks-in hidden-scroll mx-n3 px-3');
    //
    //     db.shows.where('id').anyOf(show.sequel).toArray().then(shows => {
    //         shows.forEach((sequel, index) => {
    //             container.append(generateInternalCard('show', sequel));
    //         });
    //         let titleElem = create('h2', 'title');
    //         titleElem.textContent = 'Sequel';
    //         self.append(titleElem, container);
    //     })
    // }
    //
    
    
});



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

function generateInternalCard(type, item, seasonShow, showPoster) {
    let showCard = create('div', (type === 'season' ? 'season-card ' : 'show-card ') + 'stacks-in-card');
    
    if (type === 'season') {
        showCard.dataset.seasonId = item.id;
    } else {
        showCard.dataset.showId = item.id;
    }
    
    if (type === "season") {
        showCard.appendHTML('<div class="global-poster poster"><img draggable="false" alt="" class="posterImage" loading="lazy" data-poster="' + (!item.poster ? "show-id-" + seasonShow.id : "season-id-" + item.id) + '" src="' + (item.poster ? inflateAndGetObject(item.poster) : (showPoster ? showPoster : "images/pixel.png")) + '"/></div>');
    } else {
        showCard.appendHTML('<div class="global-poster poster"><img draggable="false" alt="" class="posterImage" loading="lazy" data-poster="show-id-' + item.id + '" src="' + (item.poster ? inflateAndGetObject(item.poster) : "images/pixel.png") + '"/></div>');
    }
    
    let cardContent = create('div');
    if (type === 'season') {
        cardContent.appendHTML('<h3 class="stack-in-card-title">' + (item.name || (seasonShow.name + (' S' + item.position))) + (item.aired ? ' <span class="aired">(' + item.aired.getFullYear() + ')</span>' : '') + '</h3>')
    } else {
        cardContent.appendHTML('<h3 class="stack-in-card-title">' + item.name + (item.aired ? ' <span class="aired">(' + item.aired.getFullYear() + ')</span>' : '') + '</h3>')
    }
    
    showCard.append(cardContent);
    return showCard
}


db.shows.toArray().then(shows => {
    console.log('shows', shows);
    
    let stack = create('div', 'stack');
    stack.appendHTML('<h2 class="stack-title">Shows in Database</h2><div class="shows-list"><div class="show-list-inner"></div></div>');
    
    let container = stack.querySelector('.show-list-inner');
    
    shows.forEach(show => {
        container.append(generateShowCard(show))
    })
    
    $('.showcase').append(stack)
    
})