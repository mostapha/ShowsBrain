self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open('my-store').then((cache) => cache.addAll([
            '/ShowsBrain/',
            '/ShowsBrain/index.html',
            
            '/ShowsBrain/css/normalize.css',
            '/ShowsBrain/libraries/bootstrap/css/bootstrap.css',
            '/ShowsBrain/css/style.css',
            
            '/ShowsBrain/libraries/jQuery/jquery.js',
            '/ShowsBrain/libraries/Dexie.js-3.2.2/dist/dexie.js',
            '/ShowsBrain/libraries/pako/2.0.4/pako.min.js',
            '/ShowsBrain/libraries/bootstrap/js/bootstrap.bundle.js',
            '/ShowsBrain/js/helper.js',
            '/ShowsBrain/js/fragment.js',
            '/ShowsBrain/js/drawer.js',
            '/ShowsBrain/js/app.js'
        ])),
    );
});

self.addEventListener('fetch', (e) => {
    console.log(e.request.url);
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request)),
    );
});