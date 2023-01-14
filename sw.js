self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open('my-store').then((cache) => cache.addAll([
            '/ShowsBrain/',
            '/ShowsBrain/index.html',
            '/ShowsBrain/css/style.css',
            '/ShowsBrain/js/app.js',
        ])),
    );
});

self.addEventListener('fetch', (e) => {
    console.log(e.request.url);
    e.respondWith(
        caches.match(e.request).then((response) => response || fetch(e.request)),
    );
});