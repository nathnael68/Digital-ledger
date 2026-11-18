/**
 * Delgone Digital Sales Ledger - PWA utilities
 * Delgone Trading PLC - Addis Ababa, Ethiopia
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<(canInstall: boolean) => void>();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    // Prevent default mini-infobar on mobile
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    installListeners.forEach((listener) => listener(true));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installListeners.forEach((listener) => listener(false));
    console.log('[PWA] Delgone Digital Sales Ledger installed to home screen successfully.');
  });
}

export function registerPWA(): void {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && (import.meta.env.PROD || process.env.NODE_ENV === 'production')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[PWA] ServiceWorker registered with scope:', registration.scope);
        })
        .catch((error) => {
          console.log('[PWA] ServiceWorker registration skipped/failed:', error);
        });
    });
  }
}

export function onInstallAvailabilityChange(callback: (canInstall: boolean) => void): () => void {
  installListeners.add(callback);
  callback(deferredPrompt !== null);
  return () => installListeners.delete(callback);
}

export async function promptPWAInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    return false;
  }
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  installListeners.forEach((listener) => listener(false));
  return outcome === 'accepted';
}

export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  const hasMatchMedia = typeof window.matchMedia === 'function';
  return (
    (hasMatchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    (window.navigator as any).standalone === true ||
    (typeof document !== 'undefined' && document.referrer ? document.referrer.includes('android-app://') : false)
  );
}
