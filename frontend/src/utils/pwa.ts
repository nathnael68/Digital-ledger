/**
 * Registers the progressive web app service worker in production environments.
 * Structured for future offline caching and counter synchronization (Phase 6).
 */
export function registerPWA(): void {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] ServiceWorker registered successfully with scope:', registration.scope);
        })
        .catch((error) => {
          console.log('[PWA] ServiceWorker registration skipped/failed:', error);
        });
    });
  }
}
