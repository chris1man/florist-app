if('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    console.log('Registering service worker...');
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(registration => {
        console.log('SW registered successfully:', registration);
        
        // Handle updates
        registration.addEventListener('updatefound', () => {
          console.log('Service worker update found');
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed') {
                console.log('New service worker installed');
                if (navigator.serviceWorker.controller) {
                  console.log('New content available, please refresh');
                } else {
                  console.log('Content cached for offline use');
                }
              }
            });
          }
        });
      })
      .catch(err => {
        console.error('SW registration failed:', err);
      });
  });
} else {
  console.log('Service workers not supported');
}