import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallAvailable, setIsInstallAvailable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detectar se já está instalado (standalone)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');
    
    setIsStandalone(isStandaloneMode);

    // Detectar iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(ios);

    const handler = (e: Event) => {
      // Previne o mini-infobar padrão do Chrome no mobile
      e.preventDefault();
      // Guarda o evento para disparar depois
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallAvailable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Limpar se o app for instalado por outros meios
    const appInstalledHandler = () => {
      setDeferredPrompt(null);
      setIsInstallAvailable(false);
      setIsStandalone(true);
    };

    window.addEventListener('appinstalled', appInstalledHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', appInstalledHandler);
    };
  }, []);

  const installPwa = async () => {
    if (!deferredPrompt) return;

    // Mostra o prompt nativo
    deferredPrompt.prompt();

    // Aguarda a escolha do usuário
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallAvailable(false);
    }
  };

  return {
    installPwa,
    isInstallAvailable,
    isStandalone,
    isIOS,
    deferredPrompt
  };
}
