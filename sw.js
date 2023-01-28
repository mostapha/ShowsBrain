
const cacheName = "brain-cache-v8";

let appShellFiles = [
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
    "/ShowsBrain/libraries/Dexie.js-3.2.2/dist/dexie-export-import.js",
    "/ShowsBrain/libraries/downloadjs-1.4.8/download.min.js",
    "/ShowsBrain/libraries/pako/2.0.4/pako.min.js",
    "/ShowsBrain/libraries/bootstrap/js/bootstrap.bundle.js",
    "/ShowsBrain/js/helper.js",
    "/ShowsBrain/js/fragment.js",
    "/ShowsBrain/js/app.js",
    
    // images
    "/ShowsBrain/favicon.ico",
    "/ShowsBrain/images/pixel.png"
]

self.addEventListener("install", (e) => {
    // progress into the activating state
    self.skipWaiting();
    
    console.log("[Service Worker] Install");
    e.waitUntil(
        (async () => {
            const cache = await caches.open(cacheName);
            console.log("[Service Worker] Caching all: app shell and content");
            await cache.addAll(appShellFiles);
        })()
    );
});

// Establish a cache name
self.addEventListener('fetch', (event) => {
    event.respondWith(caches.open(cacheName).then((cache) => {
        // Go to the network first
        return fetch(event.request.url).then((fetchedResponse) => {
            console.log('update (put)', event.request.clone());
            cache.put(event.request, fetchedResponse.clone());
            return fetchedResponse;
        }).catch(() => {
            console.log('no network, get ', event.request.clone());
            // If the network is unavailable, get
            return cache.match(event.request);
        });
    }));
});

// used to clear out the old cache we don't need anymore
self.addEventListener("activate", (e) => {
    console.log('[Service Worker] Activate')
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key === cacheName) {
                        return;
                    }
                    return caches.delete(key);
                })
            );
        })
    );
});


self.onmessage = async (event) => {
    let data = event.data,
        message = data.message;
    
    if(message === "test-fetch"){
        console.log('test-fetch called');
    
        
        const request = new Request('https://betterlinks.io/wp-content/uploads/2022/05/How-to-Prevent-Hotlinking-in-WordPress2022_1280_720-1.jpg', {
            mode: 'cors'
        });
    
        fetch(request)
            .then(response => response.json())
            .then(data => console.log(data))
            .catch(error => console.error(error))
    
        
    }
};