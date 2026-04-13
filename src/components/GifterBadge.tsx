import React from 'react';

// Tabela agressiva e restritiva de níveis
const LEVEL_THRESHOLDS = [
  0,        // Lvl 0
  50,       150,      300,      500,      800,      1200,     1700,     2300,     3000,     4000,     // Lvl 1 - 10
  6000,     8500,     11500,    15000,    19000,    24000,    30000,    37000,    45000,    55000,    // Lvl 11 - 20
  80000,    110000,   150000,   200000,   260000,   330000,   410000,   500000,   600000,   750000,   // Lvl 21 - 30
  1050000,  1400000,  1800000,  2300000,  2900000,  3600000,  4400000,  5300000,  6500000,  8000000   // Lvl 31 - 40
];

export function getGifterLevelDetails(donated: number): { level: number; nextThreshold: number; currentThreshold: number } {
  let level = 0;
  for (let i = 1; i <= 40; i++) {
    if (donated >= LEVEL_THRESHOLDS[i]) {
      level = i;
    } else {
      break;
    }
  }
  const currentThreshold = LEVEL_THRESHOLDS[level];
  const nextThreshold = level < 40 ? LEVEL_THRESHOLDS[level + 1] : LEVEL_THRESHOLDS[40];
  return { level, nextThreshold, currentThreshold };
}

export function getGifterLevel(donated: number): number {
  return getGifterLevelDetails(donated).level;
}

export function GifterBadge({ donatedAmount }: { donatedAmount: number }) {
  const level = getGifterLevel(donatedAmount);
  if (level === 0) return null;
  
  let bg = '#ccc';
  let color = '#000';
  let text = `Lvl ${level}`;
  let style: React.CSSProperties = { padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 };

  if (level >= 1 && level < 10) {
    bg = 'linear-gradient(135deg, #475569, #94a3b8)'; color = '#fff';
  } else if (level >= 10 && level < 20) {
    bg = 'linear-gradient(135deg, #00d2ff, #3a7bd5)'; color = '#fff';
    style.boxShadow = '0 0 10px rgba(0, 210, 255, 0.4)';
  } else if (level >= 20 && level < 30) {
    bg = 'linear-gradient(135deg, var(--primary), var(--secondary))'; color = '#fff';
    style.boxShadow = '0 0 12px rgba(108, 43, 255, 0.6)';
    style.transform = 'scale(1.05)';
  } else if (level >= 30 && level < 40) {
    bg = 'linear-gradient(135deg, #f43f5e, #be185d)'; color = '#fff';
    style.boxShadow = '0 0 15px rgba(244, 63, 94, 0.6)';
    style.transform = 'scale(1.1)';
  } else if (level === 40) {
    bg = 'linear-gradient(135deg, #fbbf24, #d97706)'; color = '#fff';
    style.boxShadow = '0 0 20px rgba(251, 191, 36, 0.8)';
    style.transform = 'scale(1.15)';
    style.border = '1.5px solid #fff';
    text = `🔥 Lvl ${level}`;
  }

  return <span style={{ ...style, background: bg, color }}>{text}</span>;
}
