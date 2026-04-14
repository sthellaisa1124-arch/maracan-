import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, Share } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallAvailable, installPwa, isStandalone, isIOS } = usePWAInstall();
  const [isVisible, setIsVisible] = useState(true);

  // Se já estiver instalado ou o usuário fechou o banner, não mostra nada
  if (!isVisible || isStandalone) return null;

  // Se for Android/Desktop e a instalação estiver disponível
  if (isInstallAvailable) {
    return (
      <div className="pwa-install-banner animate-fade-up">
        <div className="pwa-content">
          <div className="pwa-icon-wrapper">
            <img src="/vellar-icon-512.png" alt="Vellar" className="pwa-main-icon" style={{ width: '40px', height: '40px', borderRadius: '12px', objectFit: 'cover' }} />
            <div className="pwa-pulse"></div>
          </div>
          <div className="pwa-text">
            <h3>Vellar no seu Celular</h3>
            <p>Instale para ter acesso rápido e notificações exclusivas.</p>
          </div>
          <button className="pwa-install-btn" onClick={installPwa}>
            <Download size={18} />
            <span>INSTALAR</span>
          </button>
          <button className="pwa-close-btn" onClick={() => setIsVisible(false)}>
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  // Se for iOS, mostramos instrução (pois iOS não permite disparar prompt via JS)
  if (isIOS) {
    return (
      <div className="pwa-install-banner ios animate-fade-up">
        <div className="pwa-content">
          <div className="pwa-icon-wrapper">
            <img src="/vellar-icon-512.png" alt="Vellar" className="pwa-main-icon" style={{ width: '40px', height: '40px', borderRadius: '12px', objectFit: 'cover' }} />
          </div>
          <div className="pwa-text">
            <h3>Instalar no iPhone</h3>
            <p>Clique em <Share size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> e depois em <b>"Adicionar à Tela de Início"</b>.</p>
          </div>
          <button className="pwa-close-btn" onClick={() => setIsVisible(false)}>
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  return null;
};
