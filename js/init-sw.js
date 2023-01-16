console.log('check', "serviceWorker" in navigator);
if ("serviceWorker" in navigator) {
    console.log('register')
    navigator.serviceWorker.register("sw.js")
        .then(() => {
            console.log('Service Worker Registered');
        });
}


window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
});