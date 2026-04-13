import React from 'react';

// Mesma tabela agressiva de níveis do Gifter, mas para o Criador
const LEVEL_THRESHOLDS = [
  0,        // Lvl 0
  100,      300,      600,      1000,     1500,     2200,     3000,     4000,     5500,     7500,     // Lvl 1 - 10
  10000,    15000,    22000,    30000,    40000,    55000,    75000,    100000,   130000,   170000,   // Lvl 11 - 20
  250000,   350000,   500000,   750000,   1100000,  1500000,  2000000,  2800000,  3800000,  5000000,  // Lvl 21 - 30
  7000000,  10000000, 14000000, 19000000, 25000000, 32000000, 40000000, 50000000, 65000000, 80000000  // Lvl 31 - 40
];

export function getCreatorLevel(received: number): { level: number; nextThreshold: number; currentThreshold: number } {
  let level = 0;
  for (let i = 1; i <= 40; i++) {
    if (received >= LEVEL_THRESHOLDS[i]) {
      level = i;
    } else {
      break;
    }
  }
  const currentThreshold = LEVEL_THRESHOLDS[level];
  const nextThreshold = level < 40 ? LEVEL_THRESHOLDS[level + 1] : LEVEL_THRESHOLDS[40];
  return { level, nextThreshold, currentThreshold };
}

export function CreatorBadge({ receivedAmount }: { receivedAmount: number }) {
  const { level } = getCreatorLevel(receivedAmount);
  if (level === 0) return null;
  
  let bg = '#475569';
  let color = '#fff';
  let text = `Cria Lvl ${level}`;
  let style: React.CSSProperties = { 
    padding: '2px 8px', 
    borderRadius: '4px', 
    fontSize: '0.65rem', 
    fontWeight: 900, 
    display: 'inline-flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    lineHeight: 1,
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  if (level >= 1 && level < 10) {
    bg = 'linear-gradient(135deg, #1e293b, #475569)';
  } else if (level >= 10 && level < 20) {
    bg = 'linear-gradient(135deg, #818cf8, #4f46e5)';
    style.boxShadow = '0 0 10px rgba(79, 70, 229, 0.4)';
  } else if (level >= 20 && level < 30) {
    bg = 'linear-gradient(135deg, #a855f7, #7c3aed)';
    style.boxShadow = '0 0 12px rgba(124, 58, 237, 0.6)';
    style.transform = 'scale(1.05)';
  } else if (level >= 30 && level < 40) {
    bg = 'linear-gradient(135deg, #fb7185, #e11d48)';
    style.boxShadow = '0 0 15px rgba(225, 29, 72, 0.6)';
    style.transform = 'scale(1.1)';
  } else if (level === 40) {
    bg = 'linear-gradient(135deg, #60a5fa, #2563eb)';
    style.boxShadow = '0 0 20px rgba(37, 99, 235, 0.8)';
    style.transform = 'scale(1.15)';
    style.border = '1.5px solid #fff';
    text = `👑 LENDA Lvl ${level}`;
  }

  return <span style={{ ...style, background: bg, color }} title={`Rank de Criador: Lvl ${level}`}>{text}</span>;
}
