
const Drawer = (() => {
    const $drawer = $('.drawer'),
        $dim = $('.drawer-dim');
    
    
    let isDrawerOpen = false;
    
    
    let openDrawer = () => {
        isDrawerOpen = true;
        $drawer.addClass('open');
        $dim.fadeIn(300);
        
    }
    const closeDrawer = () => {
        $drawer.children().first().empty()
        isDrawerOpen = false;
        $drawer.removeClass('open');
        $dim.fadeOut(300);
        $drawer.children().first().empty()
    }
    
    $dim.on('click', function () {
        closeDrawer()
    })
    
    let registeredFunctions = {},
        elementsCache = {},
        uniqueCache = {};
    
    return {
        open(id, params) {
            if (!isDrawerOpen) openDrawer();
            
            if (id) {
                if (elementsCache[id]) {
                    if (elementsCache[id].previousElementSibling) {
                        $drawer[0].prepend(elementsCache[id]);
                    }
                    
                    console.log('show', id);
                    console.log('show elem', elementsCache[id]);
                    if (registeredFunctions[id]) {
                        console.log('function found', registeredFunctions[id]);
                        registeredFunctions[id].call(elementsCache[id], params, uniqueCache[id]);
                    }
                } else throw id + " is not registered";
            } else console.log('open without id');
        },
        close() {
            closeDrawer();
        },
        isOpen() {
            return isDrawerOpen
        },
        register(id, fx, rewrite, openOnRegister) {
            if (elementsCache[id]) {
                if (rewrite) elementsCache[id].remove();
                else throw id + " is already registered";
            }
            
            let holder = create('div', null, id);
            $drawer.prepend(holder);
            elementsCache[id] = holder;
            uniqueCache[id] = {};
            if (fx) registeredFunctions[id] = fx;
            
            if(openOnRegister) this.open(id, typeof openOnRegister === "object" ? openOnRegister : null);
        }
    }
})()
