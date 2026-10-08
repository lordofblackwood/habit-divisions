import { useEffect, useState } from 'react';
export function usePwa() {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone);
  const [update, setUpdate] = useState(null);
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const beforeInstall = event => { event.preventDefault(); setPrompt(event); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    const network = () => setOffline(!navigator.onLine);
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    window.addEventListener('online', network); window.addEventListener('offline', network);
    let registration;
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register(new URL('sw.js', document.baseURI), { scope: './', updateViaCache: 'none' }).then(reg => {
        registration = reg;
        if (reg.waiting) setUpdate(reg.waiting);
        reg.addEventListener('updatefound', () => {
          const worker = reg.installing;
          worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) setUpdate(reg.waiting); });
        });
      }).catch(() => {});
    }
    const checkUpdate = () => { if (document.visibilityState === 'visible') registration?.update().catch(() => {}); };
    document.addEventListener('visibilitychange', checkUpdate);
    return () => { window.removeEventListener('beforeinstallprompt', beforeInstall); window.removeEventListener('appinstalled', onInstalled); window.removeEventListener('online', network); window.removeEventListener('offline', network); document.removeEventListener('visibilitychange', checkUpdate); };
  }, []);
  async function install() {
    if (!prompt) return false;
    await prompt.prompt(); await prompt.userChoice; setPrompt(null); return true;
  }
  function applyUpdate() {
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    update?.postMessage({ type: 'SKIP_WAITING' });
  }
  return { installed, offline, install, update, applyUpdate };
}
