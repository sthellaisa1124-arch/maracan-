import { useEffect, useState } from 'react';
import { Swords } from 'lucide-react';

interface BattleScoreBarProps {
  scoreA: number; // Você
  scoreB: number; // Oponente
  hostAvatar: string | undefined;
  opponentAvatar: string | undefined;
  timeRemainingSec: number;
}

export function BattleScoreBar({ scoreA, scoreB, hostAvatar, opponentAvatar, timeRemainingSec }: BattleScoreBarProps) {
  const total = scoreA + scoreB;
  
  // Se total = 0, divide 50/50.
  // Barra A cresce da esquerda pra direita. Barra B da direita pra esquerda.
  const percentA = total === 0 ? 50 : Math.max(10, Math.min(90, (scoreA / total) * 100));

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      position: 'absolute', top: '70px', left: 0, right: 0, zIndex: 100000,
      padding: '0 1rem', display: 'flex', justifyContent: 'center'
    }}>
      <div style={{ width: '100%', maxWidth: '600px', position: 'relative' }}>
        
        {/* Avatares Pequenos nas Pontas */}
        <div style={{ position: 'absolute', left: '-10px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
          <img 
            src={hostAvatar || `https://ui-avatars.com/api/?name=Você&background=random`} 
            alt="Host" 
            style={{ width: '42px', height: '42px', borderRadius: '50%', border: '2px solid #3b82f6', objectFit: 'cover', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }} 
          />
        </div>
        
        <div style={{ position: 'absolute', right: '-10px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
          <img 
            src={opponentAvatar || `https://ui-avatars.com/api/?name=Op&background=random`} 
            alt="Oponente" 
            style={{ width: '42px', height: '42px', borderRadius: '50%', border: '2px solid #ef4444', objectFit: 'cover', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }} 
          />
        </div>

        {/* Barra de Progresso (Cabo de Guerra) */}
        <div style={{
          height: '24px', width: '100%', background: '#1f2937', borderRadius: '999px',
          overflow: 'hidden', display: 'flex', position: 'relative',
          boxShadow: '0 0 15px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)'
        }}>
          
          {/* Lado Azul (Host) */}
          <div style={{
            height: '100%', background: 'linear-gradient(to right, #2563eb, #60a5fa)',
            transition: 'width 0.3s ease-out', display: 'flex', alignItems: 'center', padding: '0 1.5rem',
            width: `${percentA}%`
          }}>
            <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
              {scoreA} pts
            </span>
          </div>

          {/* Lado Vermelho (Oponente) */}
          <div style={{
            height: '100%', background: 'linear-gradient(to left, #dc2626, #f97316)',
            transition: 'width 0.3s ease-out', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 1.5rem',
            flex: 1
          }}>
            <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
              {scoreB} pts
            </span>
          </div>

          {/* Indicador Central (Espadas) */}
          <div style={{
            position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)',
            transition: 'left 0.3s ease-out', zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            left: `${percentA}%`
          }}>
            <div style={{
              background: '#eab308', width: '32px', height: '32px', borderRadius: '50%',
              border: '2px solid #fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 10px rgba(234,179,8,0.8)'
            }}>
              <Swords size={16} color="#000" />
            </div>
          </div>
        </div>

        {/* Timer embaixo */}
        <div style={{
          position: 'absolute', bottom: '-24px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.6)', padding: '2px 12px', borderRadius: '999px',
          backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <span style={{ color: '#facc15', fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '0.1em' }}>
            {formatTime(timeRemainingSec)}
          </span>
        </div>

      </div>
    </div>
  );
}
