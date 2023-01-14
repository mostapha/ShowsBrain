console.log('check', "serviceWorker" in navigator);
if ("serviceWorker" in navigator) {
    console.log('register')
    navigator.serviceWorker.register("sw.js")
        .then(() => {
            console.log('Service Worker Registered');
        });
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
});
