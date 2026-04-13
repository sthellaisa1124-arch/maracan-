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
    <div className="absolute top-16 left-0 right-0 z-50 px-4 md:px-12 flex justify-center">
      <div className="w-full max-w-2xl relative">
        
        {/* Avatares Pequenos nas Pontas */}
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 z-10">
          <img src={hostAvatar || `https://ui-avatars.com/api/?name=Você&background=random`} alt="Host" className="w-10 h-10 rounded-full border-2 border-blue-500 shadow-lg object-cover" />
        </div>
        <div className="absolute -right-2 top-1/2 -translate-y-1/2 z-10">
          <img src={opponentAvatar || `https://ui-avatars.com/api/?name=Oponente&background=random`} alt="Oponente" className="w-10 h-10 rounded-full border-2 border-red-500 shadow-lg object-cover" />
        </div>

        {/* Barra de Progresso (Cabo de Guerra) */}
        <div className="h-6 w-full bg-gray-800 rounded-full overflow-hidden flex relative shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-white/10">
          
          {/* Lado Azul (Host) */}
          <div 
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300 ease-out flex items-center px-6"
            style={{ width: `${percentA}%` }}
          >
            <span className="text-white text-xs font-bold drop-shadow-md">{scoreA} pts</span>
          </div>

          {/* Lado Vermelho (Oponente) */}
          <div 
            className="h-full bg-gradient-to-l from-red-600 to-orange-500 transition-all duration-300 ease-out flex items-center justify-end px-6 flex-1"
          >
            <span className="text-white text-xs font-bold drop-shadow-md">{scoreB} pts</span>
          </div>

          {/* Indicador Central (Espadas) */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-300 ease-out z-20 flex flex-col items-center justify-center"
            style={{ left: `${percentA}%` }}
          >
            <div className="bg-yellow-500 w-8 h-8 rounded-full border-2 border-yellow-200 flex items-center justify-center shadow-[0_0_10px_rgba(234,179,8,0.8)]">
              <Swords className="w-4 h-4 text-black" />
            </div>
          </div>
        </div>

        {/* Timer embaixo */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-0.5 rounded-full backdrop-blur-sm border border-white/10">
          <span className="text-yellow-400 font-mono text-xs font-bold tracking-widest">{formatTime(timeRemainingSec)}</span>
        </div>

      </div>
    </div>
  );
}
