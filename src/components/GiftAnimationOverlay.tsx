import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { Gift } from './GiftPanel';

// ─────────────────────────────────────────────────────────────
// Configuração visual por presente (tema da animação CSS)
// ─────────────────────────────────────────────────────────────
interface GiftTheme {
  bg: string;
  particles: string[];
  flashColor: string;
  ringColors: string[];
  lines: string[];
  label: string;
}

const GIFT_THEMES: Record<string, GiftTheme> = {
  gold_meteor: {
    bg: 'radial-gradient(ellipse at 50% 60%, #3d2800 0%, #1a0f00 50%, #000 100%)',
    particles: ['#fbbf24', '#f59e0b', '#fde68a', '#ff9500', '#fff'],
    flashColor: '#fde68a',
    ringColors: ['#fbbf24', '#f59e0b', '#ff9500'],
    lines: ['#fbbf24', '#fde68a'],
    label: '☄ METEORO DOURADO',
  },
  imp_dragon: {
    bg: 'radial-gradient(ellipse at 50% 60%, #3d0000 0%, #1a0000 50%, #000 100%)',
    particles: ['#f43f5e', '#fb7185', '#fda4af', '#ff4500', '#f97316'],
    flashColor: '#f43f5e',
    ringColors: ['#f43f5e', '#fb7185', '#f97316'],
    lines: ['#f43f5e', '#fda4af'],
    label: '☯ DRAGÃO IMPERIAL',
  },
  gold_storm: {
    bg: 'radial-gradient(ellipse at 50% 60%, #2d2800 0%, #111000 50%, #000 100%)',
    particles: ['#fde047', '#facc15', '#fef08a', '#fff', '#a3e635'],
    flashColor: '#fef9c3',
    ringColors: ['#fde047', '#facc15', '#a3e635'],
    lines: ['#fde047', '#fff'],
    label: '⚡ TEMPESTADE DE OURO',
  },
  fire_phoenix: {
    bg: 'radial-gradient(ellipse at 50% 60%, #3d1500 0%, #1a0800 50%, #000 100%)',
    particles: ['#fb923c', '#f97316', '#fde68a', '#ef4444', '#fbbf24'],
    flashColor: '#fde68a',
    ringColors: ['#fb923c', '#f97316', '#ef4444'],
    lines: ['#fb923c', '#fde68a'],
    label: '🔥 FÊNIX DE FOGO',
  },
  diamond_lion: {
    bg: 'radial-gradient(ellipse at 50% 60%, #3d1000 0%, #1a0800 50%, #000 100%)',
    particles: ['#fb923c', '#f97316', '#ef4444', '#fde68a', '#ff4500'],
    flashColor: '#f97316',
    ringColors: ['#fb923c', '#ef4444', '#f97316'],
    lines: ['#fb923c', '#fde68a'],
    label: '🦁 LEÃO DE FOGO',
  },
  eagle: {
    bg: 'radial-gradient(ellipse at 50% 0%, #3d2200 0%, #1a0f00 50%, #000 100%)',
    particles: ['#fbbf24', '#f59e0b', '#d97706', '#fff', '#713f12', '#b45309'],
    flashColor: '#fde68a',
    ringColors: ['#fbbf24', '#f59e0b', '#b45309'],
    lines: ['#fbbf24', '#fde68a'],
    label: '🦅 ÁGUIA REAL',
  },
  park: {
    bg: 'radial-gradient(ellipse at 50% 50%, #001a2d 0%, #000d1a 50%, #000 100%)',
    particles: ['#38bdf8', '#facc15', '#f472b6', '#fff', '#67e8f9', '#fbbf24'],
    flashColor: '#38bdf8',
    ringColors: ['#38bdf8', '#facc15', '#f472b6'],
    lines: ['#38bdf8', '#facc15'],
    label: '🎡 PARQUE MÁGICO',
  },
  royal_throne: {
    bg: 'radial-gradient(ellipse at 50% 60%, #1a0028 0%, #0d0015 50%, #000 100%)',
    particles: ['#e879f9', '#d946ef', '#a855f7', '#fbbf24', '#f0abfc', '#fff'],
    flashColor: '#e879f9',
    ringColors: ['#e879f9', '#a855f7', '#fbbf24'],
    lines: ['#e879f9', '#fbbf24'],
    label: '👑 TRONO REAL',
  },
  diamond_boom: {
    bg: 'radial-gradient(ellipse at 50% 50%, #001a2d 0%, #000d1a 50%, #000 100%)',
    particles: ['#67e8f9', '#38bdf8', '#e0f2fe', '#fff', '#bae6fd', '#a5f3fc', '#7dd3fc'],
    flashColor: '#e0f2fe',
    ringColors: ['#67e8f9', '#38bdf8', '#a5f3fc'],
    lines: ['#67e8f9', '#fff'],
    label: '💎 EXPLOSÃO DIAMANTES',
  },
  supreme_king: {
    bg: 'radial-gradient(ellipse at 50% 40%, #3d1800 0%, #1a0a00 60%, #000 100%)',
    particles: ['#ff9500', '#facc15', '#fbbf24', '#fff', '#fb923c', '#fef08a', '#f59e0b'],
    flashColor: '#fff7e0',
    ringColors: ['#ff9500', '#facc15', '#fb923c'],
    lines: ['#ff9500', '#fff', '#facc15'],
    label: '✶ COROA SUPREMA DO REI',
  },
};

const DEFAULT_ULTRA_THEME: GiftTheme = {
  bg: 'radial-gradient(ellipse at 50% 60%, #1a0b36 0%, #0A0A0F 85%)',
  particles: ['#6C2BFF', '#9D6BFF', '#a78bfa', '#fff', '#facc15'],
  flashColor: '#9D6BFF',
  ringColors: ['#6C2BFF', '#9D6BFF', '#facc15'],
  lines: ['#6C2BFF', '#9D6BFF'],
  label: '💎 PRESENTE ULTRA RARO',
};

// ─────────────────────────────────────────────────────────────
// Gerador de partículas (usado pelo modo CSS)
// ─────────────────────────────────────────────────────────────
interface Particle {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  color: string;
  opacity: number;
  life: number;
  maxLife: number;
  type: 'circle' | 'star' | 'spark';
}

function createParticles(colors: string[], count = 80): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6;
    return {
      id: i,
      x: 50 + (Math.random() - 0.5) * 10,
      y: 50 + (Math.random() - 0.5) * 10,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      size: 4 + Math.random() * 12,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: 1, life: 0,
      maxLife: 60 + Math.floor(Math.random() * 60),
      type: (['circle', 'star', 'spark'] as const)[Math.floor(Math.random() * 3)],
    };
  });
}

// ─────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────
interface GiftAnimationOverlayProps {
  gift: Gift;
  recipientName: string;
  senderName?: string; // quem enviou o presente
  onComplete: () => void;
  isBattle?: boolean; // quando true, usa apenas card compacto (não toma tela cheia)
}

// ═════════════════════════════════════════════════════════════
// SUB-COMPONENTE: Overlay CSS (animação original)
// ═════════════════════════════════════════════════════════════
function CssOverlay({
  gift,
  recipientName,
  onComplete,
}: GiftAnimationOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const startTimeRef = useRef<number>(Date.now());

  const [phase, setPhase] = useState<'flash' | 'reveal' | 'hold' | 'fadeout'>('flash');
  const [visible, setVisible] = useState(true);

  const theme = GIFT_THEMES[gift.id] ?? DEFAULT_ULTRA_THEME;
  const DURATION = 5000;

  const finish = useCallback(() => {
    setVisible(false);
    onComplete();
  }, [onComplete]);

  // Fases da animação
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('reveal'),  400);
    const t2 = setTimeout(() => setPhase('hold'),   1800);
    const t3 = setTimeout(() => setPhase('fadeout'), 4000);
    const t4 = setTimeout(finish, DURATION);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [finish]);

  // Canvas de partículas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    function resize() {
      canvas!.width  = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    particlesRef.current = createParticles(theme.particles, 100);
    let extraBurst = 0;

    function tick() {
      const elapsed = Date.now() - startTimeRef.current;
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      if (elapsed < 2000 && Math.floor(elapsed / 500) > extraBurst) {
        extraBurst++;
        particlesRef.current.push(...createParticles(theme.particles, 40));
      }

      particlesRef.current = particlesRef.current.filter(p => p.life < p.maxLife);

      for (const p of particlesRef.current) {
        p.x  += p.vx * 0.6;
        p.y  += p.vy * 0.6;
        p.vy += 0.15;
        p.life++;
        p.opacity = 1 - p.life / p.maxLife;

        const cx = (p.x / 100) * canvas!.width;
        const cy = (p.y / 100) * canvas!.height;

        ctx!.save();
        ctx!.globalAlpha = p.opacity;

        if (p.type === 'star') {
          ctx!.fillStyle = p.color;
          ctx!.shadowColor = p.color;
          ctx!.shadowBlur = 12;
          ctx!.beginPath();
          const s = p.size;
          ctx!.moveTo(cx, cy - s);
          ctx!.lineTo(cx + s * 0.3, cy - s * 0.3);
          ctx!.lineTo(cx + s, cy);
          ctx!.lineTo(cx + s * 0.3, cy + s * 0.3);
          ctx!.lineTo(cx, cy + s);
          ctx!.lineTo(cx - s * 0.3, cy + s * 0.3);
          ctx!.lineTo(cx - s, cy);
          ctx!.lineTo(cx - s * 0.3, cy - s * 0.3);
          ctx!.closePath();
          ctx!.fill();
        } else if (p.type === 'spark') {
          ctx!.strokeStyle = p.color;
          ctx!.shadowColor = p.color;
          ctx!.shadowBlur = 8;
          ctx!.lineWidth = p.size * 0.3;
          ctx!.beginPath();
          ctx!.moveTo(cx, cy);
          ctx!.lineTo(cx - p.vx * 6, cy - p.vy * 6);
          ctx!.stroke();
        } else {
          ctx!.fillStyle = p.color;
          ctx!.shadowColor = p.color;
          ctx!.shadowBlur = 15;
          ctx!.beginPath();
          ctx!.arc(cx, cy, p.size * 0.5, 0, Math.PI * 2);
          ctx!.fill();
        }

        ctx!.restore();
      }

      animFrameRef.current = requestAnimationFrame(tick);
    }

    const startDelay = setTimeout(() => {
      animFrameRef.current = requestAnimationFrame(tick);
    }, 400);

    return () => {
      clearTimeout(startDelay);
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [theme]);

  if (!visible) return null;

  const rings = [
    { size: 120, delay: '0s',    color: theme.ringColors[0] },
    { size: 220, delay: '0.15s', color: theme.ringColors[1] },
    { size: 340, delay: '0.3s',  color: theme.ringColors[2 % theme.ringColors.length] },
    { size: 480, delay: '0.45s', color: theme.ringColors[0] },
  ];

  return createPortal(
    <div
      className={`gao-overlay gao-phase-${phase}`}
      style={{ background: theme.bg }}
      onClick={finish}
    >
      <style>{`
        .gao-overlay {
          position: fixed; inset: 0; z-index: 2000000000;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; cursor: pointer;
          transition: opacity 0.6s ease;
        }
        .gao-overlay.gao-phase-flash .gao-flash { opacity: 1; }
        .gao-overlay.gao-phase-fadeout { opacity: 0; }
        .gao-canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1; }
        .gao-flash {
          position: absolute; inset: 0; opacity: 0; z-index: 2;
          transition: opacity 0.15s ease-out;
          mix-blend-mode: screen;
        }
        .gao-rings {
          position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          z-index: 3; pointer-events: none;
        }
        .gao-ring {
          position: absolute; border-radius: 50%; border: 2px solid;
          opacity: 0; animation: gaoRingExpand 1.2s cubic-bezier(0.2, 0.8, 0.4, 1) forwards;
        }
        .gao-energy-lines {
          position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          z-index: 3; pointer-events: none;
        }
        .gao-energy-line {
          position: absolute; width: 2px; height: 45vh; bottom: 50%;
          transform-origin: bottom center; opacity: 0;
          animation: gaoLineShoot 0.8s ease-out forwards;
        }
        .gao-center { position: relative; z-index: 10; display: flex; flex-direction: column; align-items: center; gap: 1rem; text-align: center; padding: 2rem; }
        .gao-symbol-wrap { opacity: 0; transform: scale(0.3); animation: gaoSymbolReveal 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.4s forwards; }
        .gao-symbol { font-size: 8rem; line-height: 1; display: block; }
        .gao-text-block { opacity: 0; transform: translateY(20px); animation: gaoTextReveal 0.5s ease 1s forwards; }
        .gao-tier-label { font-size: 0.75rem; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; opacity: 0.8; }
        .gao-gift-name { font-size: 2rem; font-weight: 900; color: #fff; text-shadow: 0 2px 20px rgba(0,0,0,0.8); margin: 0.3rem 0; }
        .gao-recipient { font-size: 1rem; color: rgba(255,255,255,0.7); }
        .gao-price { font-size: 1.1rem; font-weight: 900; margin-top: 0.5rem; }
        .gao-tap-hint { font-size: 0.75rem; color: rgba(255,255,255,0.3); margin-top: 1rem; letter-spacing: 1px; text-transform: uppercase; }
        .gao-progress-bar { position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: rgba(255,255,255,0.1); z-index: 10; }
        .gao-progress-fill { height: 100%; width: 0; animation: gaoProgress linear forwards; border-radius: 0 2px 2px 0; }
        .gao-video-overlay {
          position: fixed; inset: 0; z-index: 2000000000; background: #000;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          transition: opacity 0.5s ease;
        }
        .gao-video-overlay.gao-video-ending { opacity: 0; }
        .gao-video-player { width: 100%; height: 100%; object-fit: cover; }
        .gao-video-info { position: absolute; bottom: 80px; left: 0; right: 0; text-align: center; padding: 1rem; z-index: 5; }
        .gao-video-gift-name { font-size: 1.8rem; font-weight: 900; text-shadow: 0 0 30px currentColor; }
        .gao-video-recipient { font-size: 1rem; color: rgba(255,255,255,0.7); margin: 0.3rem 0; }
        .gao-video-price { font-size: 1rem; font-weight: 900; }
        .gao-video-skip-btn {
          position: absolute; top: 1rem; right: 1rem; z-index: 10;
          background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.3);
          color: #fff; padding: 0.5rem 1rem; border-radius: 20px; cursor: pointer;
          font-weight: 800; font-size: 0.85rem; backdrop-filter: blur(6px);
        }
        .gao-video-progress-fill { height: 100%; width: 0; border-radius: 0 2px 2px 0; }
        @keyframes gaoRingExpand {
          0% { transform: scale(0.1); opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes gaoLineShoot {
          0% { opacity: 0; transform: rotate(var(--r, 0deg)) scaleY(0); }
          30% { opacity: 0.8; }
          100% { opacity: 0; transform: rotate(var(--r, 0deg)) scaleY(1); }
        }
        @keyframes gaoSymbolReveal {
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes gaoTextReveal {
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gaoProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
      <canvas ref={canvasRef} className="gao-canvas" />

      <div className="gao-flash" style={{ background: theme.flashColor }} />

      <div className="gao-rings">
        {rings.map((r, i) => (
          <div
            key={i}
            className="gao-ring"
            style={{
              width: r.size,
              height: r.size,
              borderColor: r.color,
              boxShadow: `0 0 30px ${r.color}88, inset 0 0 20px ${r.color}44`,
              animationDelay: r.delay,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="gao-energy-lines">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="gao-energy-line"
            style={{
              transform: `rotate(${i * 30}deg)`,
              background: `linear-gradient(to top, transparent, ${theme.lines[i % theme.lines.length]}, transparent)`,
              animationDelay: `${i * 0.05}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="gao-center">
        <div
          className="gao-symbol-wrap"
          style={{
            color: gift.color,
            filter: `drop-shadow(0 0 60px ${gift.glow}) drop-shadow(0 0 120px ${gift.glow})`,
          }}
        >
          <span className="gao-symbol">{gift.symbol}</span>
        </div>

        <div className="gao-text-block">
          <div className="gao-tier-label" style={{ color: gift.color }}>
            {theme.label}
          </div>
          <div className="gao-gift-name">{gift.name}</div>
          <div className="gao-recipient">
            enviado para <strong style={{ color: gift.color }}>@{recipientName}</strong>
          </div>
          <div className="gao-price" style={{ color: gift.color }}>
            🪙 {gift.price.toLocaleString('pt-BR')} Moral
          </div>
        </div>

      </div>

      <div className="gao-progress-bar">
        <div
          className="gao-progress-fill"
          style={{ background: gift.color, animationDuration: `${DURATION}ms` }}
        />
      </div>
    </div>,
    document.body,
  );
}

// ═════════════════════════════════════════════════════════════
// SUB-COMPONENTE: Card flutuante (presentes SEM vídeo)
// Aparece centralizado, sem fundo de tela cheia, glassmorphism
// ═════════════════════════════════════════════════════════════
function SimpleFloatingOverlay({
  gift,
  recipientName,
  senderName,
  onComplete,
  isBattle,
}: GiftAnimationOverlayProps) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');
  const [mounted, setMounted] = useState(true);
  const DURATION = 2000;

  const finish = useCallback(() => {
    setPhase('exit');
    setTimeout(() => { setMounted(false); onComplete(); }, 450);
  }, [onComplete]);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 500);
    const t2 = setTimeout(finish, DURATION);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [finish]);

  if (!mounted) return null;

  const c = gift.color;
  const SPARKLES = ['✦', '✧', '⋆', '·', '✦', '✧'];

  return createPortal(
    <div
      style={{
        position: 'fixed',
        // Em batalha, posiciona no painel inferior (55% para baixo)
        top: isBattle ? '55%' : '0',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2000000000,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: isBattle ? 'flex-start' : 'center',
        justifyContent: 'center',
      }}
    >
      <style>{`
        @keyframes sfoIn {
          0%   { opacity: 0; transform: scale(0.6) translateY(40px); }
          60%  { opacity: 1; transform: scale(1.06) translateY(-6px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes sfoOut {
          to { opacity: 0; transform: scale(0.82) translateY(-22px); }
        }
        @keyframes sfoPop {
          0%   { transform: scale(0) rotate(-15deg); }
          65%  { transform: scale(1.28) rotate(4deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes sfoBar {
          from { width: 100%; }
          to   { width: 0%; }
        }
        @keyframes sfoBlink {
          0%, 100% { opacity: 0.2; }
          50%      { opacity: 0.6; }
        }
        @keyframes sfoFloat {
          0%   { transform: translate(0, 0) scale(1);  opacity: 0.8; }
          100% { transform: translate(var(--ftx), var(--fty)) scale(0); opacity: 0; }
        }
        .sfo-wrap {
          pointer-events: auto;
          cursor: pointer;
          animation: sfoIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .sfo-wrap.sfo-exiting {
          animation: sfoOut 0.45s ease forwards;
        }
        .sfo-inner {
          background: rgba(0, 0, 0, 0.50);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-radius: 28px;
          padding: 2.2rem 2.8rem 1.6rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
          min-width: 260px;
          max-width: 320px;
          text-align: center;
          position: relative;
          overflow: hidden;
          font-family: 'Outfit', sans-serif;
        }
        .sfo-emoji-wrap {
          line-height: 1;
          margin-bottom: 0.5rem;
          animation: sfoPop 0.55s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.18s both;
        }
        .sfo-spark {
          position: absolute;
          pointer-events: none;
          animation: sfoFloat var(--fdur) ease-out infinite;
          animation-delay: var(--fdel);
        }
        .sfo-bar {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 3px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 0 0 28px 28px;
          overflow: hidden;
        }
        .sfo-bar-fill {
          height: 100%;
          animation: sfoBar ${DURATION}ms linear forwards;
        }
        .sfo-hint {
          font-size: 0.62rem;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          margin-top: 0.6rem;
          animation: sfoBlink 2s infinite;
          color: rgba(255,255,255,0.22);
        }
      `}</style>

      <div
        className={`sfo-wrap${phase === 'exit' ? ' sfo-exiting' : ''}`}
        onClick={finish}
      >
        <div
          className="sfo-inner"
          style={{
            border: `1.5px solid ${c}44`,
            boxShadow: `0 20px 60px ${gift.glow}44, 0 0 0 1px ${c}18, inset 0 0 40px ${c}08`,
          }}
        >
          {/* Sparkles flutuantes */}
          {SPARKLES.map((s, i) => (
            <span
              key={i}
              className="sfo-spark"
              style={{
                top: `${8 + (i * 14) % 80}%`,
                left: `${6 + (i * 17) % 86}%`,
                fontSize: `${0.55 + (i % 3) * 0.25}rem`,
                color: c,
                opacity: 0.7,
                '--fdur': `${1.6 + i * 0.22}s`,
                '--fdel': `${i * 0.28}s`,
                '--ftx': `${(i % 2 === 0 ? -1 : 1) * (8 + i * 4)}px`,
                '--fty': `-${38 + i * 7}px`,
              } as React.CSSProperties}
            >
              {s}
            </span>
          ))}

          {/* Emoji */}
          <div className="sfo-emoji-wrap">
            <span
              style={{
                fontSize: '4.5rem',
                display: 'block',
                filter: `drop-shadow(0 0 28px ${gift.glow}) drop-shadow(0 0 12px ${gift.glow})`,
              }}
            >
              {gift.symbol}
            </span>
          </div>

          {/* Nome do presente */}
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>
            {gift.name}
          </div>

          {/* Remetente → Destinatário */}
          <div style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
            {senderName ? (
              <>
                <strong style={{ color: c, fontWeight: 800 }}>@{senderName}</strong>
                {' '}presenteou{' '}
                <strong style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 800 }}>@{recipientName}</strong>
              </>
            ) : (
              <>para <strong style={{ color: c, fontWeight: 800 }}>@{recipientName}</strong></>
            )}
          </div>

          {/* Preço */}
          <div style={{ fontSize: '0.95rem', fontWeight: 900, color: c, marginTop: '0.15rem' }}>
            🪙 {gift.price.toLocaleString('pt-BR')} Moral
          </div>

          {/* Barra de progresso */}
          <div className="sfo-bar">
            <div className="sfo-bar-fill" style={{ background: c }} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ═════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL — decide qual modo usar
// ═════════════════════════════════════════════════════════════
export function GiftAnimationOverlay(props: GiftAnimationOverlayProps) {
  const { gift, isBattle } = props;
  const [videoFailed, setVideoFailed] = useState(false);

  // Durante batalha: nunca tomar tela toda, sempre usar card compacto
  const hasVideo = !!gift.animationVideo && !videoFailed && !isBattle;

  if (hasVideo) {
    return (
      <VideoOverlayWithFallback
        {...props}
        onVideoError={() => setVideoFailed(true)}
      />
    );
  }

  return <SimpleFloatingOverlay key="simple-overlay" {...props} isBattle={isBattle} />;
}

// ─────────────────────────────────────────────────────────────
// Wrapper que gerencia o fallback se o vídeo falhar
// ─────────────────────────────────────────────────────────────
function VideoOverlayWithFallback({
  gift,
  recipientName,
  senderName,
  onComplete,
  onVideoError,
}: GiftAnimationOverlayProps & { onVideoError: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ended, setEnded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // começa mudo para autoplay funcionar

  function handleError(e: any) {
    console.error("Erro ao carregar vídeo de presente:", gift.animationVideo, e);
    setFailed(true);
    onVideoError();
  }

  function handleCanPlay() {
    const video = videoRef.current;
    if (!video) return;
    // Tenta dar play com som
    video.muted = false;
    video.volume = 1.0;
    video.play()
      .then(() => {
        setIsMuted(false); // Som funcionou!
      })
      .catch(() => {
        // Bloqueado pelo navegador → mantém mudo
        video.muted = true;
        video.play().catch(() => {});
        setIsMuted(true);
      });
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }

  // Se falhou → renderiza nada (pai vai mostrar CssOverlay agora)
  if (failed) return null;

  return createPortal(
    <div
      className={`gao-video-overlay ${ended ? 'gao-video-ending' : ''}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000000000,
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 0.5s ease',
        opacity: ended ? 0 : 1,
      }}
    >
      <video
        ref={videoRef}
        src={gift.animationVideo}
        autoPlay
        muted
        playsInline
        preload="auto"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        onEnded={() => { setEnded(true); onComplete(); }}
        onError={handleError}
        onCanPlay={handleCanPlay}
        onWaiting={() => {
          const v = videoRef.current;
          if (v) v.play().catch(() => {});
        }}
      />

      {/* Info do presente — centralizado na parte inferior do vídeo */}
      <div style={{
        position: 'absolute', bottom: '80px', left: 0, right: 0,
        textAlign: 'center', padding: '1rem', zIndex: 5,
        pointerEvents: 'none',
      }}>
        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: gift.color, textShadow: `0 0 20px ${gift.glow}`, lineHeight: 1.2 }}>
          {gift.name}
        </div>
        <div style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.7)', margin: '0.3rem 0' }}>
          {senderName ? (
            <><strong style={{ color: gift.color }}>@{senderName}</strong>{' '}presenteou{' '}<strong>@{recipientName}</strong></>
          ) : (
            <>enviado para <strong style={{ color: gift.color }}>@{recipientName}</strong></>
          )}
        </div>
        <div style={{ fontSize: '1rem', fontWeight: 900, color: gift.color }}>
          🪙 {gift.price.toLocaleString('pt-BR')} Moral
        </div>
      </div>

      {/* Botão mute/unmute */}
      <button
        onClick={(e) => { e.stopPropagation(); toggleMute(); }}
        style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          background: 'rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '50%',
          width: '42px',
          height: '42px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '1.2rem',
          backdropFilter: 'blur(6px)',
          zIndex: 10,
          transition: 'all 0.2s',
        }}
        title={isMuted ? 'Ativar som' : 'Silenciar'}
      >
        {isMuted ? '🔇' : '🔊'}
      </button>


      {/* Botão PULAR REMOVIDO — o vídeo roda até o fim obrigatoriamente */}

      {/* Barra sincronizada com o vídeo */}
      <div className="gao-progress-bar">
        <div
          className="gao-video-progress-fill"
          style={{ background: gift.color }}
          ref={(el) => {
            if (!el || !videoRef.current) return;
            let raf: number;
            function update() {
              const v = videoRef.current;
              if (!v || !el) return;
              const pct = v.duration ? (v.currentTime / v.duration) * 100 : 0;
              el.style.width = `${pct}%`;
              raf = requestAnimationFrame(update);
            }
            raf = requestAnimationFrame(update);
            return () => cancelAnimationFrame(raf);
          }}
        />
      </div>
    </div>,
    document.body,
  );
}
