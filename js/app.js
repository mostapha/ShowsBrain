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
            Drawer.open('show-info', show);
        }
    });
    
})


// load dexie
let db;

db = new Dexie("showsMemory");
db.version(1).stores({
    shows: "++id, type, status, userStatus, isFavorite",
    images: "&id",
    seasons: "++id, showId"
});

console.log('works');

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


// view show drawer
Drawer.register('show-info', function (show) {
    let self = this,
        $t = $(self);
    
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
    
    $t.on('click', '#show-edit', function () {
        // load mage
        
        // show edit fragment
        Fragment.select('show-editor').push(function () {
            let $t = $(this);
            $t.html(templates['show-edit-form'].cloneNode(1));
            let showId = $t.find('#edit-show-id'),
                showAdded = $t.find('#edit-show-added'),
                showName = $t.find('#edit-show-name'),
                showType = $t.find('#edit-show-type'),
                showAired = $t.find('#edit-show-aired'),
                showSummary = $t.find('#edit-show-summary'),
                showSeasonsCount = $t.find('#edit-show-seasons-count'),
                showStatus = $t.find('#edit-show-status'),
                $posterImg = $t.find('.global-poster img'),
                showPosterEdit = $t.find('#edit-show-poster');
            
            showId.val(show.id);
            showAdded.val(Helper.formatDate(show.added));
            showName.val(show.name);
            showType.val(show.type);
            showAired.val(Helper.formatDate(show.aired));
            showSummary.val(show.summary ?? "");
            showSeasonsCount.val(show.seasonsCount ?? "");
            showStatus.val(show.status ?? "");
            
            
            $posterImg.attr('data-poster', 'show-id-' + show.id);
            if (show.poster) {
                let objUrl = inflateAndGetObject(show.poster)
                $posterImg[0].onload = function () {
                    URL.revokeObjectURL(objUrl);
                }
                $posterImg[0].src = objUrl;
            }
            
            showPosterEdit.click(function () {
                Fragment.select('show-editor').push(function () {
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
                                            n.src = URL.createObjectURL(blob);
                                        });
                                        
                                        console.log('saved');
                                        URL.revokeObjectURL(objectUrl);
                                        
                                    } else {
                                        alert('unexpected reach');
                                    }
                                });
                            });
                        });
                    })
                    
                }, show.name + "'s poster");
            });
            
            
            $t.find('#show-edit-form').submit(function () {
                let changes = {
                    name: showName.val().trim() === show.name ? false : showName.val().trim(),
                    type: showType.val() === show.type ? false : showType.val(),
                    aired: new Date(showAired.val()).getTime() === show.aired.getTime() ? false : new Date(showAired.val()),
                    summary: showSummary.val().trim() === (show.summary ?? "") ? false : showSummary.val().trim(),
                    seasonsCount: isNaN(parseInt(showSeasonsCount.val())) || parseInt(showSeasonsCount.val()) === show.seasonsCount ? (showSeasonsCount.val().trim() === "" ? 0 : false) : parseInt(showSeasonsCount.val()),
                    status: showStatus.val() === (show.status ?? "") ? false : showStatus.val()
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
                                
                                if (key === 'seasonsCount') {
                                    console.log('old seasonsCount', show.seasonsCount);
                                    if (value === 0) {
                                        delete _show[key]
                                    } else {
                                        _show[key] = value;
                                        // first time we add this
                                        if (!show.seasonsCount) {
                                            console.log(Array(value).fill().map(() => ({
                                                showId: show.id,
                                                added: new Date()
                                            })));
                                        } else {
                                            console.log('already has seasons, handle it');
                                        }
                                    }
                                } else {
                                    _show[key] = value;
                                }
                                
                            });
                            console.log('final', _show);
                        })
                    }).then(changes => {
                        if (changes === 1) {
                            db.shows.get({id: show.id}).then(show => {
                                // Fragment.select('show-editor').back();
                                $t.prop('Fragment').back();
                                
                                let newCard = generateShowCard(show);
                                document.querySelectorAll('.show-card[data-show-id="' + show.id + '"]').forEach(c => {
                                    c.replaceWith(newCard);
                                })
                                
                                Drawer.open('show-info', show);
                            })
                        }
                    }).catch(err => {
                        
                        // Transaction aborted. NOT WITHIN ZONE!
                        console.log('err', err);
                    });
                    
                } else {
                    console.log('no changes');
                }
            });
        }, show.name);
        
    });
    
    $t.on('click', '#show-classify', function () {
        // load mage
        
        // show edit fragment
        Fragment.select('show-classifier').push(function () {
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
                        
                        
                        if(changes === 1){
                            db.shows.get({id: show.id}).then(show => {
                                $t.prop('Fragment').back();
                                
                                Drawer.open('show-info', show);
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
        
    });
    
    db.seasons.where({showId: show.id}).toArray().then(seasons => {
        
        console.log('seasons', seasons);
        
        let container = create('div', 'seasons hidden-scroll mx-n3 px-3');
        seasons.forEach((season, index) => {
            container.append(generateSeasonCard(season, index, show, posterUrl));
        });
        let titleElem = create('h2', 'title');
        titleElem.textContent = 'Seasons';
        self.append(titleElem, container);
        
    });
    
}, 1);


let inflateAndGetObject = (data) => {
    let inflatedImage = pako.inflate(data), // decompress image
        blob = new Blob([inflatedImage.buffer], {type: 'image/jpeg'});
    
    return URL.createObjectURL(blob);
}

// main page
function generateShowCard(show) {
    let showCard = create('div', 'show-card');
    
    showCard.dataset.showId = show.id;
    
    showCard.appendHTML('<div class="global-poster poster"><img alt="" class="posterImage" loading="lazy" data-poster="show-id-' + show.id + '" src="' + (show.poster ? inflateAndGetObject(show.poster) : "images/pixel.png") + '"/></div>');
    
    let cardContent = create('div');
    cardContent.appendHTML('<h3 class="show-title">' + show.name + (show.aired ? ' <span class="aired">(' + show.aired.getFullYear() + ')</span>' : '') + '</h3>')
    showCard.append(cardContent);
    
    return showCard
}

function generateSeasonCard(season, index, show, showPoster) {
    let showCard = create('div', 'season-card');
    
    showCard.dataset.seasonId = season.id;
    
    showCard.appendHTML('<div class="global-poster poster"><img alt="" class="posterImage" loading="lazy" data-poster="' + (!season.poster ? "show-id-" + show.id : "season-id-" + season.id) + '" src="' + (season.poster ? inflateAndGetObject(season.poster) : (showPoster ? showPoster : "images/pixel.png")) + '"/></div>');
    
    let cardContent = create('div');
    cardContent.appendHTML('<h3 class="season-title">' + (season.name || (show.name + ' S' + season.position)) + (season.aired ? ' <span class="aired">(' + season.aired.getFullYear() + ')</span>' : '') + '</h3>')
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