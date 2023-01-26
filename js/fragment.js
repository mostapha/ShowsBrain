const Fragment = (() => {
    const fragmentContainer = document.getElementById('fragments'),
        dim = document.querySelector('#fragment-dim');
    
    const colorOfStyle = {
        indigo600: "#520dc2",
        red500: "#dc3545"
    }
    
    window.onpopstate = (event) => {
        console.log('event', event, event.state);
        Fragment.getActiveFragment()?.back()
    }
    
    class FragmentGenerator {
        // used to save stacks
        #stack = [];
        
        constructor(id) {
            this.id = id;
            let frag = create('div', 'fragment');
            frag.dataset.id = id
            fragmentContainer.appendChild(frag);
            
            this.frag = frag
            this.showDim();
        }
        
        showDim() {
            dim.style.visibility = 'visible'
        }
        
        hideDim() {
            dim.style.visibility = 'hidden'
        }
        
        push(callback, title, navActions, style) {
    
            // check if the last view is available and notify with onPause
            this.#stack.at(-1)?.lastElementChild.onPause?.();
            
            
            history.pushState(null, '', null);
            
            let self = this;
            let template = templates['fragment-view'].cloneNode(1);
            
            if (title) {
                template.dataset.name = title;
            }
            
            this.frag.append(template);
            this.#stack.push(template);
            
            if (title) {
                template.querySelector('.fragment-title').textContent = title;
            }
            
            template.querySelector('.fragment-back').onclick = function () {
                self.back();
            }
            
            
            function setNavStyle(style) {
                template.querySelector('nav').classList.add(style);
                document.head.querySelector('[name="theme-color"]').content = colorOfStyle[style];
            }
            
            if (style) {
                setNavStyle(style)
            }
            
            function initNavActions(navActions) {
                let navActionsElem = template.querySelector('.nav-actions')
                navActions.forEach(navAction => {
                    let btn = create('button', {
                        className: 'btn',
                        innerHTML: '<i class="' + navAction.icon + '"></i>',
                        onclick: () => navAction.action.call(template.lastElementChild)
                    });
                    if (navAction.name) {
                        btn.dataset.bsTitle = navAction.name
                    }
                    
                    navActionsElem.insertAdjacentElement('beforeend', btn);
                    
                    let tooltip,
                        holdTimeout = -1;
                    btn.addEventListener("touchstart", function () {
                        holdTimeout = setTimeout(function () {
                            (tooltip || (tooltip = new bootstrap.Tooltip(btn, {
                                placement: 'bottom',
                                trigger: 'manual',
                                fallbackPlacements: ['bottom-start', 'bottom-end'],
                            }))).show();
                        }, 500);
                    }, {passive: true});
                    btn.addEventListener("touchend", function () {
                        clearTimeout(holdTimeout);
                        tooltip?.hide();
                    });
                });
            }
            
            if (navActions) {
                initNavActions(navActions)
            }
            template.lastElementChild.registerNavAction = function (navActions) {
                initNavActions(navActions)
            }
            template.lastElementChild.setNavStyle = function (style) {
                setNavStyle(style)
            }
            template.lastElementChild.setTitle = function (title) {
                template.querySelector('.fragment-title').textContent = title;
            }
            
            template.lastElementChild.reset = function () {
                $(template.lastElementChild).off().empty();
                template.querySelector('.nav-actions').innerHTML = "";
            }
            
            
            template.lastElementChild.Fragment = this;
            
            if (typeof callback === 'object') {
                if (plantedFunctions[callback.name] !== undefined) {
                    plantedFunctions[callback.name].call(template.lastElementChild, callback.params)
                } else throw callback.name + " is not planted";
            } else callback.call(template.lastElementChild);
            
            // // check if the last view is available and notify with onPause
            // this.#stack.at(-1)?.lastElementChild.onPause?.();
            //
        }
        
        // go the previous page
        back() {
            if (this.#stack.length > 0) {
                
                // remove the last element from stack, returns it then clear it
                let poppedItem = this.#stack.pop();
                poppedItem.lastElementChild.onDestroy?.();
                poppedItem.remove();
                
                if (this.#stack.length === 0) {
                    activities.delete(this.id);
                    this.frag.remove();
    
                    // hide the dim only if there are no other fragments
                    if (activities.size === 0) {
                        this.hideDim();
                    } else {
                        // find the active fragment and notify it
                        Fragment.getActiveFragment().stacks.at(-1).lastElementChild.onResume?.();
                    }
                    
                } else {
                    
                    // get the last view and
                    this.#stack.at(-1).lastElementChild.onResume?.();
                }
            }
        }
    
        destroy() {
            activities.delete(this.id);
        
            this.frag.remove();
            this.#stack.forEach(s => {
                s.lastElementChild.onDestroy?.();
                s.remove()
            })
            this.#stack = []
    
            // hide the dim only if there are no other fragments
            if (activities.size === 0) {
                this.hideDim();
            } else {
                
                // find the active fragment and notify it
                Fragment.getActiveFragment().stacks.at(-1).lastElementChild.onResume?.();
                
            }
        
        }
        
        // got the first page
        home() {
            if (this.#stack.length > 1) {
                // keeps the first item, returns the remaining items then removes them
                this.#stack.splice(1).forEach(n => {
                    n.lastElementChild.onDestroy?.();
                    n.remove();
                });
                this.#stack[0].lastElementChild.onResume?.();
            }
        }
        
        
        clear() {
            this.#stack.forEach(s => {
                s.lastElementChild.onDestroy?.();
                s.remove()
            });
            this.#stack = []
            console.log('after clear here is stack', this.#stack)
        }
        
        get stacks() {
            return this.#stack
        }
        
        get activities() {
            return activities
        }
    }
    
    // caches list of fragments
    let activities = new Map();
    
    let plantedFunctions = {};
    
    function selectFragment(id) {
        if(activities.has(id)){
            return activities.get(id);
        } else {
            return activities.set(id, new FragmentGenerator(id)).get(id)
        }
    }
    
    function getActiveFragment() {
        if (fragmentContainer.lastElementChild.id !== "fragment-dim") {
            return selectFragment(fragmentContainer.lastElementChild.dataset.id)
        } else return null;
    }
    
    dim.onclick = function () {
        Fragment.getActiveFragment()?.back();
    }
    
    return {
        select: selectFragment,
        register: () => {
        
        },
        getFragments() {
            return activities
        },
        getActiveFragment: getActiveFragment,
        
        plant(codeName, callback) {
            if (plantedFunctions[codeName] === undefined) {
                plantedFunctions[codeName] = callback;
            } else throw codeName + " is already planted";
        },
        getSavedData(){
            return {
                activities: activities,
                plantedFunctions: plantedFunctions,
                fragmentContainer: fragmentContainer
            }
        }
    }
})();


