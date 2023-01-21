const Fragment = (() => {
    const fragmentContainer = document.getElementById('fragments'),
        dim = document.querySelector('#fragment-dim');
    
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
            if(Object.keys(activities).length === 0){
                dim.style.visibility = 'hidden'
            }
        }

        push(callback, title, navActions) {
            
            let self = this;
            
            let template = templates['_fragment-view'].cloneNode(1);
            template.removeAttribute('id');
            this.frag.append(template);
            this.#stack.push(template);
            
            template.querySelector('.fragment-title').textContent = title || "";
            template.querySelector('.fragment-back').onclick = function () {
                self.back();
            }
            if(navActions){
                let navActionsElem = template.querySelector('.nav-actions')
                navActions.forEach(navAction => {
                    console.log('navAction', navAction);
                    let btn = create('button', {
                        className: 'btn',
                        innerHTML: '<i class="'+navAction.icon+'"></i>',
                        onclick: () => navAction.action.call(template.lastElementChild)
                    });
                    if(navAction.name){
                        btn.dataset.bsTitle = navAction.name
                    }
                    
                    navActionsElem.insertAdjacentElement('afterbegin', btn);
                });
            }
            
            const tooltipTriggerList = template.querySelectorAll('[data-bs-title]');
            tooltipTriggerList.forEach(tooltipTriggerEl => {
                let tooltip;
                let holdTimeout = -1;
                tooltipTriggerEl.addEventListener("touchstart", function () {
                    holdTimeout = setTimeout(function () {
                        (tooltip || (tooltip = new bootstrap.Tooltip(tooltipTriggerEl, {
                            placement: 'bottom',
                            trigger: 'manual',
                            fallbackPlacements: ['bottom-start', 'bottom-end'],
                        }))).show();
                    }, 500);
                }, {passive: true});
                tooltipTriggerEl.addEventListener("touchend", function () {
                    clearTimeout(holdTimeout);
                    tooltip?.hide();
                });
            })
            
            
            template.lastElementChild.Fragment = this;
            
            if(typeof callback === 'object'){
                if(plantedFunctions[callback.name] !== undefined){
                    plantedFunctions[callback.name].call(template.lastElementChild, callback.params)
                } else throw callback.name + " is not planted";
            } else callback.call(template.lastElementChild);
        }
        
        back() {
            if (this.#stack.length > 0) {
                this.#stack.pop().remove();
                if (this.#stack.length === 0) {
                    delete activities[this.id];
                    this.frag.remove();
                    this.hideDim();
                }
            }
        }
        
        destroy() {
            delete activities[this.id];
            this.frag.remove();
            this.#stack.forEach(s => s.remove())
            this.hideDim();
        }
        
        get stacks() {
            return this.#stack
        }
        get activities() {
            return activities
        }
    }
    
    // caches list of fragments
    let activities = {};
    
    let plantedFunctions = {};
    
    function selectFragment(id){
        if (activities[id]) {
            // return activity
            return activities[id]
        } else {
            // create activity
            return activities[id] = new FragmentGenerator(id);
        }
    }
    
    function getActiveFragment(){
        if(fragmentContainer.lastElementChild.id !== "fragment-dim"){
            return selectFragment(fragmentContainer.lastElementChild.dataset.id)
        } else return null;
    }

    dim.onclick = function(){
        Fragment.getActiveFragment().back();
    }
    
    return {
        select: selectFragment,
        register: () => {
        
        },
        getFragments() {
            return activities;
        },
        getActiveFragment: getActiveFragment,
        
        plant(codeName, callback) {
            if(plantedFunctions[codeName] === undefined){
                plantedFunctions[codeName] = callback;
                console.log(codeName + ' is planted successfully');
            } else throw codeName + " is already planted";
        },
        
        getActivities: () => activities
    }
})();

