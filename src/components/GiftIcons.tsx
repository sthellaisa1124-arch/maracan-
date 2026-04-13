import React from 'react';

interface GiftIconProps {
  size?: number;
}

// ── BÁSICO ──────────────────────────────────────────────────────

export function HeartIcon({ size = 80 }: GiftIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id="hg1" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ff9ecf"/>
          <stop offset="40%" stopColor="#ff4d8d"/>
          <stop offset="100%" stopColor="#c0005b"/>
        </radialGradient>
        <radialGradient id="hg2" cx="30%" cy="20%" r="40%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.7)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
        </radialGradient>
        <filter id="hglow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      {/* Sombra */}
      <ellipse cx="50" cy="88" rx="22" ry="5" fill="rgba(180,0,80,0.3)"/>
      {/* Corpo do coração */}
      <path d="M50 80 C20 60 10 40 10 28 C10 16 20 10 30 10 C38 10 44 14 50 22 C56 14 62 10 70 10 C80 10 90 16 90 28 C90 40 80 60 50 80Z"
        fill="url(#hg1)" filter="url(#hglow)"/>
      {/* Reflexo de luz */}
      <path d="M30 18 C30 14 40 14 44 18 C40 20 30 22 30 18Z" fill="url(#hg2)"/>
      {/* Brilho neon */}
      <path d="M50 80 C20 60 10 40 10 28 C10 16 20 10 30 10 C38 10 44 14 50 22 C56 14 62 10 70 10 C80 10 90 16 90 28 C90 40 80 60 50 80Z"
        fill="none" stroke="rgba(255,100,180,0.4)" strokeWidth="1.5"/>
      {/* Brilhinho top */}
      <circle cx="35" cy="26" r="4" fill="rgba(255,255,255,0.5)"/>
      <circle cx="38" cy="22" r="2" fill="rgba(255,255,255,0.8)"/>
    </svg>
  );
}

export function RoseIcon({ size = 80 }: GiftIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id="rg1" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#ff8a8a"/>
          <stop offset="50%" stopColor="#e02020"/>
          <stop offset="100%" stopColor="#8b0000"/>
        </radialGradient>
        <radialGradient id="rg2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff5555"/>
          <stop offset="100%" stopColor="#aa0000"/>
        </radialGradient>
        <linearGradient id="stg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2d8a2d"/>
          <stop offset="100%" stopColor="#145214"/>
        </linearGradient>
        <filter id="rglow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {/* Sombra */}
      <ellipse cx="50" cy="90" rx="18" ry="4" fill="rgba(100,0,0,0.25)"/>
      {/* Caule */}
      <path d="M50 75 Q48 85 46 92" stroke="url(#stg)" strokeWidth="3.5" strokeLinecap="round"/>
      {/* Folha */}
      <path d="M48 82 Q38 78 36 70 Q44 72 48 82Z" fill="#2d8a2d"/>
      {/* Pétalas traseiras */}
      <ellipse cx="36" cy="55" rx="14" ry="10" fill="#ba0000" transform="rotate(-20 36 55)"/>
      <ellipse cx="64" cy="55" rx="14" ry="10" fill="#ba0000" transform="rotate(20 64 55)"/>
      <ellipse cx="50" cy="42" rx="14" ry="10" fill="#c00000"/>
      {/* Pétalas frontais */}
      <ellipse cx="38" cy="60" rx="13" ry="9" fill="url(#rg2)" transform="rotate(-10 38 60)"/>
      <ellipse cx="62" cy="60" rx="13" ry="9" fill="url(#rg2)" transform="rotate(10 62 60)"/>
      <ellipse cx="50" cy="52" rx="18" ry="20" fill="url(#rg1)" filter="url(#rglow)"/>
      {/* Centro */}
      <circle cx="50" cy="50" r="10" fill="#d40000"/>
      <circle cx="50" cy="50" r="7" fill="#b00000"/>
      {/* Reflexo */}
      <ellipse cx="44" cy="45" rx="5" ry="3" fill="rgba(255,200,200,0.5)" transform="rotate(-20 44 45)"/>
    </svg>
  );
}

export function SparkleIcon({ size = 80 }: GiftIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id="sg1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#93c5fd"/>
          <stop offset="100%" stopColor="#1d4ed8"/>
        </radialGradient>
      </defs>
      {/* Estrela grande central */}
      <path d="M50 10 L57 40 L88 40 L63 58 L73 88 L50 70 L27 88 L37 58 L12 40 L43 40Z"
        fill="url(#sg1)"/>
      {/* Brilhos extras */}
      <circle cx="50" cy="50" r="8" fill="rgba(255,255,255,0.6)"/>
      <path d="M50 30 L52 46 L68 48 L52 50 L50 66 L48 50 L32 48 L48 46Z" fill="white" opacity="0.8"/>
      {/* Estrelinhas decorativas */}
      <path d="M20 20 L22 28 L30 30 L22 32 L20 40 L18 32 L10 30 L18 28Z" fill="#60a5fa" opacity="0.9"/>
      <path d="M75 15 L77 21 L83 23 L77 25 L75 31 L73 25 L67 23 L73 21Z" fill="#93c5fd" opacity="0.9"/>
      <path d="M80 70 L81 75 L86 76 L81 77 L80 82 L79 77 L74 76 L79 75Z" fill="#60a5fa" opacity="0.7"/>
    </svg>
  );
}

export function BalloonIcon({ size = 80 }: GiftIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id="balg1" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#7dd3fc"/>
          <stop offset="40%" stopColor="#0ea5e9"/>
          <stop offset="100%" stopColor="#0369a1"/>
        </radialGradient>
      </defs>
      <path d="M50 85 Q45 92 50 95 Q55 92 50 85" stroke="#fff" strokeWidth="1" opacity="0.4"/>
      <path d="M50 85 L44 80 L56 80 Z" fill="#0369a1"/>
      <ellipse cx="50" cy="45" rx="30" ry="35" fill="url(#balg1)"/>
      <ellipse cx="38" cy="30" rx="10" ry="12" fill="rgba(255,255,255,0.3)"/>
      <circle cx="35" cy="25" r="4" fill="white" opacity="0.5"/>
    </svg>
  );
}

export function TomatoIcon({ size = 80 }: GiftIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id="tomg1" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ff5555"/>
          <stop offset="70%" stopColor="#dc2626"/>
          <stop offset="100%" stopColor="#991b1b"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="55" r="32" fill="url(#tomg1)"/>
      <path d="M50 25 L55 15 L65 20 L50 25 L35 20 L45 15 Z" fill="#15803d"/>
      <circle cx="50" cy="25" r="5" fill="#166534"/>
      <ellipse cx="40" cy="45" rx="10" ry="6" fill="rgba(255,255,255,0.2)" transform="rotate(-20 40 45)"/>
    </svg>
  );
}

export function FireIcon({ size = 80 }: GiftIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id="fireg1" cx="50%" cy="80%" r="80%">
          <stop offset="0%" stopColor="#fef08a"/>
          <stop offset="30%" stopColor="#f59e0b"/>
          <stop offset="60%" stopColor="#ea580c"/>
          <stop offset="100%" stopColor="#7f1d1d"/>
        </radialGradient>
        <filter id="fgl"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {/* Faíscas flutuantes */}
      <circle cx="25" cy="40" r="2" fill="#fde68a" opacity="0.6">
        <animate attributeName="cy" values="40;20;40" dur="2s" repeatCount="indefinite"/>
      </circle>
      <circle cx="75" cy="30" r="1.5" fill="#fbbf24" opacity="0.5"/>
      <circle cx="45" cy="20" r="1" fill="#f59e0b" opacity="0.4"/>
      
      {/* Chama Externa */}
      <path d="M50 95 C10 95 10 60 30 40 C20 55 20 15 50 5 C80 15 80 55 70 40 C90 60 90 95 50 95Z" 
        fill="url(#fireg1)" filter="url(#fgl)"/>
      {/* Chama Média */}
      <path d="M50 90 C25 90 25 70 38 55 C30 65 35 35 50 25 C65 35 70 65 62 55 C75 70 75 90 50 90Z" 
        fill="#f97316" opacity="0.8"/>
      {/* Núcleo de Calor */}
      <path d="M50 85 C35 85 35 75 42 65 C40 70 45 50 50 45 C55 50 60 70 58 65 C65 75 65 85 50 85Z" 
        fill="#fef08a"/>
    </svg>
  );
}

export function CapIcon({ size = 80 }: GiftIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="capg1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e293b"/>
          <stop offset="100%" stopColor="#0f172a"/>
        </linearGradient>
      </defs>
      <path d="M20 70 Q20 30 50 30 Q80 30 80 70 Z" fill="url(#capg1)"/>
      <path d="M80 70 L95 75 Q95 85 80 85 L20 85 Q5 85 5 75 L20 70 Z" fill="#0f172a"/>
      <circle cx="50" cy="30" r="4" fill="#334155"/>
      <rect x="35" y="45" width="30" height="15" rx="2" fill="var(--primary)" opacity="0.8"/>
      <path d="M40 52 L60 52" stroke="white" strokeWidth="2" opacity="0.5"/>
    </svg>
  );
}

export function SneakerIcon({ size = 80 }: GiftIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="snkg1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc"/>
          <stop offset="50%" stopColor="#cbd5e1"/>
          <stop offset="100%" stopColor="#94a3b8"/>
        </linearGradient>
        <filter id="sneakerglow"><feGaussianBlur stdDeviation="2"/><feComposite in="SourceGraphic"/></filter>
      </defs>
      {/* Sola / Entressola */}
      <path d="M12 78 L88 78 Q95 78 95 70 L92 65 L15 65 Q10 65 10 72 Z" fill="#fff"/>
      <path d="M12 82 L88 82 Q95 82 95 76 L10 76 Z" fill="#1e293b"/>
      
      {/* Corpo Principal (Cano Alto) */}
      <path d="M15 65 L35 25 Q45 20 55 25 L65 35 L88 45 L92 65 Z" fill="url(#snkg1)"/>
      
      {/* Detalhes de Costura / Design */}
      <path d="M38 30 L45 55 L85 65" stroke="var(--primary)" strokeWidth="3" opacity="0.4" fill="none"/>
      <path d="M18 60 Q40 55 55 65" stroke="#64748b" strokeWidth="1" opacity="0.5" fill="none"/>
      
      {/* Cadarços */}
      <line x1="42" y1="35" x2="52" y2="30" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="45" y1="42" x2="55" y2="37" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="48" y1="49" x2="58" y2="44" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
      
      {/* Neon Sola */}
      <path d="M15 74 L85 74" stroke="var(--primary)" strokeWidth="2" opacity="0.8" filter="url(#sneakerglow)"/>
      
      {/* Badge de Marca */}
      <circle cx="32" cy="45" r="4" fill="var(--primary)"/>
    </svg>
  );
}

// ── INTERMEDIÁRIO ──────────────────────────────────────────────

export function GoldCrownIcon({ size = 80 }: GiftIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="cg1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a"/>
          <stop offset="40%" stopColor="#f59e0b"/>
          <stop offset="100%" stopColor="#b45309"/>
        </linearGradient>
        <linearGradient id="cg2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef3c7"/>
          <stop offset="100%" stopColor="#fbbf24"/>
        </linearGradient>
        <filter id="cglow"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <ellipse cx="50" cy="90" rx="22" ry="4" fill="rgba(180,120,0,0.3)"/>
      {/* Corpo da coroa */}
      <path d="M15 75 L15 55 L25 25 L35 50 L50 15 L65 50 L75 25 L85 55 L85 75Z"
        fill="url(#cg1)" filter="url(#cglow)"/>
      {/* Banda interna */}
      <rect x="15" y="65" width="70" height="10" rx="2" fill="url(#cg2)"/>
      {/* Gemas */}
      <circle cx="50" cy="40" r="7" fill="#f43f5e"/>
      <circle cx="50" cy="40" r="5" fill="#fb7185"/>
      <circle cx="50" cy="40" r="2" fill="white" opacity="0.7"/>
      <circle cx="27" cy="62" r="5" fill="#60a5fa"/>
      <circle cx="27" cy="62" r="3" fill="#93c5fd"/>
      <circle cx="73" cy="62" r="5" fill="#34d399"/>
      <circle cx="73" cy="62" r="3" fill="#6ee7b7"/>
      {/* Reflexos */}
      <path d="M20 60 L30 55 L30 58 L20 63Z" fill="rgba(255,255,255,0.3)"/>
      <path d="M70 55 L80 60 L80 63 L70 58Z" fill="rgba(255,255,255,0.3)"/>
      <ellipse cx="40" cy="35" rx="6" ry="3" fill="rgba(255,255,255,0.35)" transform="rotate(-30 40 35)"/>
    </svg>
  );
}

export function VipRingIcon({ size = 80 }: GiftIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="rng1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fde68a"/>
          <stop offset="50%" stopColor="#d97706"/>
          <stop offset="100%" stopColor="#92400e"/>
        </linearGradient>
        <radialGradient id="dmnd" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#e0f2fe"/>
          <stop offset="30%" stopColor="#7dd3fc"/>
          <stop offset="70%" stopColor="#0284c7"/>
          <stop offset="100%" stopColor="#075985"/>
        </radialGradient>
        <filter id="dfx"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <ellipse cx="50" cy="90" rx="20" ry="4" fill="rgba(120,80,0,0.2)"/>
      {/* Anel 3D */}
      <ellipse cx="50" cy="65" rx="28" ry="12" fill="#b45309" opacity="0.5"/>
      <ellipse cx="50" cy="62" rx="28" ry="12" fill="url(#rng1)"/>
      <ellipse cx="50" cy="58" rx="28" ry="12" fill="url(#rng1)"/>
      <ellipse cx="50" cy="58" rx="18" ry="6" fill="#1c1008"/>
      {/* Diamante */}
      <polygon points="50,18 70,38 50,52 30,38" fill="url(#dmnd)" filter="url(#dfx)"/>
      <polygon points="50,18 70,38 50,30" fill="rgba(255,255,255,0.5)"/>
      <polygon points="50,18 30,38 50,30" fill="rgba(100,200,255,0.3)"/>
      <polygon points="50,52 70,38 50,44" fill="rgba(0,80,160,0.6)"/>
      <polygon points="50,52 30,38 50,44" fill="rgba(0,60,140,0.4)"/>
      {/* Brilho topo */}
      <circle cx="44" cy="26" r="3" fill="rgba(255,255,255,0.9)"/>
      <circle cx="47" cy="22" r="1.5" fill="white"/>
    </svg>
  );
}

export function MysteryBoxIcon({ size = 80 }: GiftIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="mbg1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7c3aed"/>
          <stop offset="100%" stopColor="#4c1d95"/>
        </linearGradient>
        <linearGradient id="mbg2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#8b5cf6"/>
          <stop offset="100%" stopColor="#6d28d9"/>
        </linearGradient>
        <linearGradient id="mbg3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa"/>
          <stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
        <filter id="mbglow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <ellipse cx="50" cy="88" rx="20" ry="5" fill="rgba(80,0,180,0.3)"/>
      {/* Caixa */}
      <rect x="20" y="50" width="60" height="38" rx="3" fill="url(#mbg1)" filter="url(#mbglow)"/>
      {/* Lado direito sombra */}
      <path d="M80 50 L80 88 L84 84 L84 46Z" fill="rgba(0,0,50,0.3)"/>
      {/* Tampa */}
      <rect x="16" y="40" width="68" height="16" rx="3" fill="url(#mbg3)"/>
      {/* Laço vertical */}
      <rect x="46" y="40" width="8" height="48" rx="3" fill="#fbbf24" opacity="0.9"/>
      {/* Laço horizontal */}
      <rect x="16" y="46" width="68" height="8" rx="3" fill="#fbbf24" opacity="0.9"/>
      {/* Laço topo */}
      <path d="M50 40 C40 28 28 28 30 38 C32 44 44 42 50 40Z" fill="#f59e0b"/>
      <path d="M50 40 C60 28 72 28 70 38 C68 44 56 42 50 40Z" fill="#fbbf24"/>
      {/* Brilho da caixa */}
      <rect x="22" y="52" width="20" height="8" rx="2" fill="rgba(255,255,255,0.15)"/>
      {/* Pontos de luz */}
      <circle cx="80" cy="30" r="3" fill="#c4b5fd" opacity="0.8"/>
      <circle cx="86" cy="22" r="2" fill="#a78bfa" opacity="0.6"/>
      <circle cx="15" cy="35" r="2" fill="#ddd6fe" opacity="0.7"/>
    </svg>
  );
}

export function DiamondLionIcon({ size = 80 }: GiftIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id="dlg1" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#bae6fd"/>
          <stop offset="40%" stopColor="#38bdf8"/>
          <stop offset="100%" stopColor="#0369a1"/>
        </radialGradient>
        <radialGradient id="dlg2" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#e0f2fe"/>
          <stop offset="100%" stopColor="#0284c7"/>
        </radialGradient>
        <filter id="dlglow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <ellipse cx="50" cy="90" rx="20" ry="4" fill="rgba(0,80,160,0.2)"/>
      {/* Juba */}
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => (
        <ellipse key={i} cx="50" cy="50" rx="28" ry="10"
          fill={i % 2 === 0 ? '#0284c7' : '#0369a1'}
          transform={`rotate(${deg} 50 50)`} opacity="0.8"/>
      ))}
      {/* Corpo da cabeça */}
      <circle cx="50" cy="52" r="22" fill="url(#dlg1)" filter="url(#dlglow)"/>
      {/* Facetas do diamante */}
      <path d="M34 40 L50 32 L66 40 L60 55 L50 58 L40 55Z" fill="rgba(255,255,255,0.25)"/>
      <path d="M50 32 L66 40 L60 55 L50 42Z" fill="rgba(255,255,255,0.15)"/>
      {/* Olhos */}
      <circle cx="42" cy="50" r="5" fill="#0c4a6e"/>
      <circle cx="58" cy="50" r="5" fill="#0c4a6e"/>
      <circle cx="42" cy="50" r="3" fill="#1e3a5f"/>
      <circle cx="58" cy="50" r="3" fill="#1e3a5f"/>
      <circle cx="43" cy="49" r="1.5" fill="white" opacity="0.7"/>
      <circle cx="59" cy="49" r="1.5" fill="white" opacity="0.7"/>
      {/* Nariz */}
      <path d="M47 57 L50 60 L53 57 Q50 55 47 57Z" fill="#075985"/>
      {/* Reflexos */}
      <ellipse cx="40" cy="40" rx="7" ry="4" fill="rgba(255,255,255,0.4)" transform="rotate(-20 40 40)"/>
      <circle cx="62" cy="38" r="2" fill="rgba(255,255,255,0.7)"/>
    </svg>
  );
}

// ── NUVEM DOS SONHOS ────────────────────────────────────────
export function CloudIcon({ size = 80 }: GiftIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id="clg1" cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#f0f9ff"/>
          <stop offset="50%" stopColor="#bae6fd"/>
          <stop offset="100%" stopColor="#7dd3fc"/>
        </radialGradient>
        <radialGradient id="clg2" cx="30%" cy="20%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.9)"/>
          <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
        </radialGradient>
        <filter id="clglow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {/* Sombra */}
      <ellipse cx="50" cy="84" rx="28" ry="5" fill="rgba(100,180,220,0.2)"/>
      {/* Nuvem corpo — bolinhas encaixadas */}
      <circle cx="30" cy="58" r="18" fill="url(#clg1)" filter="url(#clglow)"/>
      <circle cx="50" cy="50" r="24" fill="url(#clg1)" filter="url(#clglow)"/>
      <circle cx="70" cy="58" r="18" fill="url(#clg1)" filter="url(#clglow)"/>
      <circle cx="62" cy="65" r="14" fill="url(#clg1)"/>
      <circle cx="38" cy="65" r="14" fill="url(#clg1)"/>
      {/* Parte de baixo plana */}
      <rect x="12" y="62" width="76" height="18" rx="4" fill="url(#clg1)"/>
      {/* Reflexo topo */}
      <ellipse cx="42" cy="44" rx="10" ry="5" fill="url(#clg2)" transform="rotate(-20 42 44)"/>
      <circle cx="55" cy="38" r="4" fill="rgba(255,255,255,0.6)"/>
      {/* Estrelinhas */}
      <circle cx="22" cy="42" r="2" fill="#e0f2fe" opacity="0.8"/>
      <circle cx="78" cy="38" r="2" fill="#bae6fd" opacity="0.7"/>
      <circle cx="50" cy="28" r="2.5" fill="white" opacity="0.5"/>
    </svg>
  );
}

// ── PREMIUM ───────────────────────────────────────────────────

export function FirePhoenixIcon({ size = 80 }: GiftIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id="fpg1" cx="50%" cy="70%" r="60%">
          <stop offset="0%" stopColor="#fef08a"/>
          <stop offset="30%" stopColor="#fb923c"/>
          <stop offset="70%" stopColor="#dc2626"/>
          <stop offset="100%" stopColor="#7f1d1d"/>
        </radialGradient>
        <radialGradient id="fpg2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fde68a"/>
          <stop offset="100%" stopColor="#f97316"/>
        </radialGradient>
        <filter id="fpglow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {/* Cauda de fogo */}
      <path d="M50 85 Q30 70 20 80 Q35 60 30 45 Q45 65 50 85Z" fill="url(#fpg1)" opacity="0.7"/>
      <path d="M50 85 Q70 70 80 80 Q65 60 70 45 Q55 65 50 85Z" fill="url(#fpg1)" opacity="0.7"/>
      {/* Asas */}
      <path d="M50 50 Q20 30 5 45 Q20 20 40 35Z" fill="#ea580c" filter="url(#fpglow)"/>
      <path d="M50 50 Q80 30 95 45 Q80 20 60 35Z" fill="#dc2626" filter="url(#fpglow)"/>
      {/* Brilho das asas */}
      <path d="M50 50 Q20 30 5 45 Q15 32 35 38Z" fill="#fb923c" opacity="0.5"/>
      <path d="M50 50 Q80 30 95 45 Q85 32 65 38Z" fill="#f97316" opacity="0.5"/>
      {/* Corpo */}
      <ellipse cx="50" cy="48" rx="16" ry="20" fill="url(#fpg2)" filter="url(#fpglow)"/>
      {/* Cabeça */}
      <circle cx="50" cy="28" r="13" fill="#fbbf24" filter="url(#fpglow)"/>
      {/* Crista */}
      <path d="M45 16 L50 5 L55 16 Q50 18 45 16Z" fill="#f97316"/>
      <path d="M38 18 L42 8 L47 18 Q42 20 38 18Z" fill="#dc2626"/>
      {/* Olho */}
      <circle cx="50" cy="28" r="5" fill="#1c0a00"/>
      <circle cx="48" cy="27" r="2" fill="rgba(255,200,0,0.6)"/>
      {/* Bico */}
      <path d="M47 34 L50 40 L53 34 Q50 32 47 34Z" fill="#d97706"/>
      {/* Faíscas */}
      <circle cx="18" cy="25" r="2" fill="#fde68a" opacity="0.9"/>
      <circle cx="82" cy="20" r="2.5" fill="#fef08a" opacity="0.8"/>
      <circle cx="12" cy="50" r="1.5" fill="#fb923c" opacity="0.7"/>
      <circle cx="88" cy="48" r="1.5" fill="#fbbf24" opacity="0.7"/>
    </svg>
  );
}

export function RoyalThroneIcon({ size = 80 }: GiftIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="tg1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c084fc"/>
          <stop offset="50%" stopColor="#9333ea"/>
          <stop offset="100%" stopColor="#581c87"/>
        </linearGradient>
        <linearGradient id="tgg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a"/>
          <stop offset="100%" stopColor="#b45309"/>
        </linearGradient>
        <filter id="tglow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <ellipse cx="50" cy="92" rx="25" ry="5" fill="rgba(80,0,120,0.25)"/>
      {/* Pernas */}
      <rect x="25" y="72" width="8" height="20" rx="2" fill="url(#tgg)"/>
      <rect x="67" y="72" width="8" height="20" rx="2" fill="url(#tgg)"/>
      {/* Assento */}
      <rect x="20" y="60" width="60" height="16" rx="4" fill="url(#tg1)" filter="url(#tglow)"/>
      {/* Almofada */}
      <ellipse cx="50" cy="64" rx="24" ry="7" fill="#d946ef" opacity="0.5"/>
      <ellipse cx="50" cy="63" rx="20" ry="5" fill="#e879f9" opacity="0.5"/>
      {/* Encosto */}
      <rect x="22" y="18" width="56" height="46" rx="6" fill="url(#tg1)" filter="url(#tglow)"/>
      {/* Almofada encosto */}
      <rect x="28" y="24" width="44" height="35" rx="4" fill="#a855f7" opacity="0.5"/>
      {/* Moldura dourada */}
      <rect x="22" y="18" width="56" height="46" rx="6" fill="none" stroke="url(#tgg)" strokeWidth="2.5"/>
      {/* Ornamentos do topo */}
      <circle cx="22" cy="18" r="5" fill="url(#tgg)"/>
      <circle cx="78" cy="18" r="5" fill="url(#tgg)"/>
      <circle cx="50" cy="15" r="6" fill="url(#tgg)"/>
      {/* Gemas */}
      <circle cx="50" cy="15" r="4" fill="#f43f5e"/>
      <circle cx="22" cy="18" r="3" fill="#60a5fa"/>
      <circle cx="78" cy="18" r="3" fill="#34d399"/>
      {/* Reflexo encosto */}
      <rect x="30" y="25" width="16" height="8" rx="2" fill="rgba(255,255,255,0.2)"/>
    </svg>
  );
}

export function EagleIcon({ size = 80 }: GiftIconProps) {
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img 
        src="/gifts/eagle.png" 
        alt="Águia" 
        style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
        onError={(e) => {
          // Fallback se a imagem não existir
          e.currentTarget.style.display = 'none';
          const parent = e.currentTarget.parentElement;
          if (parent) parent.innerHTML = '<span style="font-size: 2rem">🦅</span>';
        }}
      />
    </div>
  );
}

export function DiamondBoomIcon({ size = 80 }: GiftIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <radialGradient id="dbg1" cx="35%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#e0f7ff"/>
          <stop offset="30%" stopColor="#67e8f9"/>
          <stop offset="70%" stopColor="#0891b2"/>
          <stop offset="100%" stopColor="#164e63"/>
        </radialGradient>
        <filter id="dbglow"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {/* Raios de explosão */}
      {[0,45,90,135,180,225,270,315].map((deg, i) => (
        <line key={i} x1="50" y1="50" x2={50 + 45 * Math.cos(deg * Math.PI / 180)} y2={50 + 45 * Math.sin(deg * Math.PI / 180)}
          stroke="#67e8f9" strokeWidth="2" opacity={0.3 + i * 0.05}/>
      ))}
      {/* Diamantes espalhados */}
      <polygon points="20,20 28,10 36,20 28,32" fill="url(#dbg1)" opacity="0.9"/>
      <polygon points="72,15 80,5 88,15 80,27" fill="url(#dbg1)" opacity="0.8"/>
      <polygon points="10,60 18,50 26,60 18,72" fill="url(#dbg1)" opacity="0.8"/>
      <polygon points="74,72 82,62 90,72 82,84" fill="url(#dbg1)" opacity="0.9"/>
      {/* Diamante central GRANDE */}
      <polygon points="50,10 72,38 50,60 28,38" fill="url(#dbg1)" filter="url(#dbglow)"/>
      <polygon points="50,10 72,38 50,30" fill="rgba(255,255,255,0.5)"/>
      <polygon points="50,10 28,38 50,30" fill="rgba(150,230,255,0.3)"/>
      <polygon points="50,60 72,38 56,46" fill="rgba(0,100,150,0.5)"/>
      <polygon points="50,60 28,38 44,46" fill="rgba(0,80,130,0.4)"/>
      {/* Brilho topo */}
      <ellipse cx="43" cy="22" rx="6" ry="3" fill="rgba(255,255,255,0.7)" transform="rotate(-30 43 22)"/>
      <circle cx="46" cy="18" r="2" fill="white"/>
    </svg>
  );
}

export function ParkIcon({ size = 80 }: GiftIconProps) {
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img 
        src="/gifts/park.png" 
        alt="Parque" 
        style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
        onError={(e) => {
          e.currentTarget.style.display = 'none';
          const parent = e.currentTarget.parentElement;
          if (parent) parent.innerHTML = '<span style="font-size: 2rem">🎡</span>';
        }}
      />
    </div>
  );
}

export function GorillaIcon({ size = 80 }: GiftIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="gg1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#94a3b8"/>
          <stop offset="50%" stopColor="#475569"/>
          <stop offset="100%" stopColor="#1e293b"/>
        </linearGradient>
        <filter id="gglow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <ellipse cx="50" cy="90" rx="25" ry="6" fill="rgba(0,0,0,0.4)"/>
      <path d="M20 80 Q20 40 50 35 Q80 40 80 80" fill="url(#gg1)" filter="url(#gglow)"/>
      <circle cx="50" cy="38" r="18" fill="url(#gg1)"/>
      <path d="M42 35 Q45 32 48 35" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <path d="M52 35 Q55 32 58 35" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="45" cy="40" r="3" fill="#000"/>
      <circle cx="55" cy="40" r="3" fill="#000"/>
      <path d="M40 52 Q50 58 60 52" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" fill="none"/>
      <path d="M35 55 Q50 50 65 55" stroke="rgba(255,255,255,0.1)" strokeWidth="4" strokeLinecap="round"/>
    </svg>
  );
}

// Mapa de ID para componente
export const GIFT_ICON_MAP: Record<string, React.FC<GiftIconProps>> = {
  neon_heart:   HeartIcon,
  rose:         RoseIcon,
  sparkle_like: SparkleIcon,
  diamond_lion: DiamondLionIcon,
  fire_phoenix: FirePhoenixIcon,
  royal_throne: RoyalThroneIcon,
  eagle:        EagleIcon,
  wild_gorilla: GorillaIcon,
  balloon:      BalloonIcon,
  tomato:       TomatoIcon,
  fire_basic:   FireIcon,
  cap:          CapIcon,
  sneaker:      SneakerIcon,
  park:         ParkIcon,
};

export function GiftIconRenderer({ giftId, size = 64 }: { giftId: string; size?: number }) {
  const Icon = GIFT_ICON_MAP[giftId];
  if (!Icon) return null;
  return <Icon size={size} />;
}
