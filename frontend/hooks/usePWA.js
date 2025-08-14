'use client';
import { useEffect, useState } from 'react';

export function usePWA() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Registrar Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('✅ SW registrado:', registration);
        })
        .catch((error) => {
          console.log('❌ SW error:', error);
        });
    }

    // Manejar prompt de instalación
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('📱 PWA instalable detectada');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`Usuario ${outcome} la instalación`);
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  return { isInstallable, installPWA };
}