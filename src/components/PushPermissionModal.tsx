import React from 'react';
import { Bell, X, ShieldCheck, Zap } from 'lucide-react';

interface PushPermissionModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

export function PushPermissionModal({ onAccept, onDecline }: PushPermissionModalProps) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999999,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem'
    }} onClick={onDecline}>
      <div 
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(145deg, #0f0f0f, #1a1a1a)',
          border: '1px solid rgba(168, 85, 247, 0.4)',
          borderRadius: '32px',
          padding: '2.5rem 2rem',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 25px 80px rgba(0,0,0,0.9), 0 0 40px rgba(168,85,247,0.15)',
          animation: 'fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div style={{
          width: '70px',
          height: '70px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #6C2BFF, #a855f7)',
          margin: '0 auto 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 30px rgba(108,43,255,0.4)'
        }}>
          <Bell size={32} color="#fff" />
        </div>

        <h3 style={{
          margin: '0 0 0.8rem',
          color: '#fff',
          fontWeight: 900,
          fontSize: '1.6rem',
          fontFamily: 'Outfit, sans-serif'
        }}>
          FICA POR DENTRO, CRIA! 🏙️
        </h3>

        <p style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: '1rem',
          margin: '0 0 2rem',
          lineHeight: 1.6,
          fontWeight: 500
        }}>
          Receba notificações de <span style={{ color: '#a855f7', fontWeight: 800 }}>curtidas</span>, <span style={{ color: '#a855f7', fontWeight: 800 }}>comentários</span> e <span style={{ color: '#a855f7', fontWeight: 800 }}>avisos do IAI CRIA</span> direto no seu celular.
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <button
            onClick={onAccept}
            style={{
              background: 'linear-gradient(135deg, #6C2BFF, #a855f7)',
              border: 'none',
              borderRadius: '20px',
              padding: '18px',
              color: '#fff',
              fontWeight: 900,
              fontSize: '1.1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 10px 30px rgba(108,43,255,0.3)',
              transition: 'transform 0.2s active'
            }}
          >
            <ShieldCheck size={22} /> SIM, ATIVAR VISÃO!
          </button>

          <button
            onClick={onDecline}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px',
              padding: '14px',
              color: 'rgba(255,255,255,0.4)',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s'
            }}
          >
            Agora não, vou no sapatinho
          </button>
        </div>

        <div style={{
          marginTop: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          opacity: 0.4
        }}>
          <Zap size={12} fill="#facb15" color="#facb15" />
          <span style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '1px' }}>
            TOTALMENTE GRATUITO
          </span>
        </div>
      </div>
    </div>
  );
}
