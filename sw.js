self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  // Cache essential files
  event.waitUntil(
    caches.open('fwf-cache').then((cache) => {
      return cache.addAll([
        '/',           // Home page
        'index.html',  // Main page
        'login.html',  // Login page
        'manifest.json', // Manifest file
        'fruit.png',    // Icon image
        // Add any other assets you want to cache
      ]);
    })
  );
  self.skipWaiting(); // Force the waiting service worker to become active
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(self.clients.claim()); // Immediately take control of the page
});

self.addEventListener('fetch', (event) => {
  console.log(`Fetching: ${event.request.url}`);
  
  // Try to fetch from cache first, then network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Return from cache if found
      } else {
        return fetch(event.request); // Otherwise, fetch from network
      }
    })
  );
});
