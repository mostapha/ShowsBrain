self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open('my-store').then((cache) => cache.addAll([
            // html
            '/ShowsBrain/',
            '/ShowsBrain/index.html',
            
            // css
            "/ShowsBrain/css/normalize.css",
            "/ShowsBrain/css/style.css",
    
            // font awesome
            "/ShowsBrain/css/fontawesome-6.2.1/all.min.css",
            "/ShowsBrain/css/fontawesome-6.2.1/webfonts/fa-regular-400.woff2",
            "/ShowsBrain/css/fontawesome-6.2.1/webfonts/fa-light-300.woff2",
            "/ShowsBrain/css/fontawesome-6.2.1/webfonts/fa-brands-400.woff2",
            "/ShowsBrain/css/fontawesome-6.2.1/webfonts/fa-duotone-900.woff2",
            "/ShowsBrain/css/fontawesome-6.2.1/webfonts/fa-sharp-solid-900.woff2",
            "/ShowsBrain/css/fontawesome-6.2.1/webfonts/fa-solid-900.woff2",
            "/ShowsBrain/css/fontawesome-6.2.1/webfonts/fa-thin-100.woff2",
            "/ShowsBrain/css/fontawesome-6.2.1/webfonts/fa-v4compatibility.woff2",
    
            // bootstrap
            "/ShowsBrain/libraries/bootstrap/css/bootstrap.css",
    
            // JS codes
            "/ShowsBrain/js/init-sw.js",
            "/ShowsBrain/libraries/jQuery/jquery.js",
            "/ShowsBrain/libraries/Dexie.js-3.2.2/dist/dexie.js",
            "/ShowsBrain/libraries/pako/2.0.4/pako.min.js",
            "/ShowsBrain/libraries/bootstrap/js/bootstrap.bundle.js",
            "/ShowsBrain/js/helper.js",
            "/ShowsBrain/js/fragment.js",
            "/ShowsBrain/js/drawer.js",
            "/ShowsBrain/js/app.js"
        ])),
    );
});

// self.addEventListener('fetch', (e) => {
//     console.log(e.request.url);
//     e.respondWith(
//         caches.match(e.request).then((response) => response || fetch(e.request)),
//     );
// });

// Establish a cache name
const cacheName = 'my-store';
self.addEventListener('fetch', (event) => {
    // Check if this is a navigation request
    console.log(e.request.url, event);
    if (event.request.mode === 'navigate') {
        // Open the cache
        event.respondWith(caches.open(cacheName).then((cache) => {
            // Go to the network first
            return fetch(event.request.url).then((fetchedResponse) => {
                cache.put(event.request, fetchedResponse.clone());
                
                return fetchedResponse;
            }).catch(() => {
                // If the network is unavailable, get
                return cache.match(event.request.url);
            });
        }));
    } else {
        return;
    }
});