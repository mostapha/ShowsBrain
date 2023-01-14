

const Fragment = (() => {
    const fragmentContainer = document.getElementById('fragments'),
        dim = document.querySelector('#fragment-dim');
    
    // caches list of fragments
    let activities = {};
    
    
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
        
        showDim(){
            dim.style.visibility = 'visible'
        }
        
        hideDim(){
            dim.style.visibility = 'hidden'
        }
        
        push(callback, title, params){
            let self = this;
            
            let template = templates['_fragment-view'].cloneNode(1);
            template.removeAttribute('id');
            this.frag.append(template);
            this.#stack.push(template);
    
            template.querySelector('.fragment-title').textContent = title || "";
            
            template.querySelector('.fragment-back').onclick = function(){
                self.back();
            }
            template.lastElementChild.Fragment = this;
            
            callback.call(template.lastElementChild);
        }
        
        back(){
            if(this.#stack.length > 0){
                this.#stack.pop().remove();
        
                if(this.#stack.length === 0){
                    delete activities[this.id];
                    this.frag.remove();
                    this.hideDim();
                }
            }
        }
        
        get stacks(){
            return this.#stack
        }
    }
    

    return {
        select(id){
            if(activities[id]){
                // return activity
                return activities[id]
            } else {
                // create activity
                return activities[id] = new FragmentGenerator(id);
            }
        },
        
        getFragments(){
            return activities;
        }
    }
})();

