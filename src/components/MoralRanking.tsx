import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, TrendingUp, Gem, Crown, ChevronDown, Heart, Clock } from 'lucide-react';
import { GifterBadge } from './GifterBadge';

// ── COMPONENTE DE MOLDURA ARTEFATO IMPERIAL (ESCULPIDO) ────────────────

function ExecutiveFrame({ rank, avatarUrl, username, score, labelColor }: any) {
  const isFirst = rank === 1;
  const isSecond = rank === 2;
  const isThird = rank === 3;
  
  const colors = {
    1: { base: '#d4af37', light: '#fdf3d0', dark: '#916d22', accent: '#fff', glow: 'rgba(212,175,55,0.4)' }, // Ouro Imperial
    2: { base: '#a8a8a8', light: '#ffffff', dark: '#5e5e5e', accent: '#fff', glow: 'rgba(168,168,168,0.3)' }, // Prata Polida
    3: { base: '#b87333', light: '#f9dcc4', dark: '#6e3e1a', accent: '#fff', glow: 'rgba(184,115,51,0.3)' }   // Bronze Nobre
  }[rank as 1|2|3] || { base: '#fff', light: '#fff', dark: '#fff', accent: '#fff', glow: 'transparent' };

  const size = isFirst ? 100 : 82;

  return (
    <div style={{ 
      display: 'flex', flexDirection: 'column', alignItems: 'center', 
      gap: '8px', flex: 1, position: 'relative',
      transform: isFirst ? 'translateY(-15px)' : 'none',
      zIndex: isFirst ? 2 : 1, transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
    }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        {/* Moldura de Artefato Esculpido (SVG Multi-Layer) */}
        <svg viewBox="0 0 120 120" style={{ 
          position: 'absolute', inset: -15, overflow: 'visible',
          filter: `drop-shadow(0 10px 20px rgba(0,0,0,0.7))` 
        }}>
          <defs>
            <linearGradient id={`metalGrad-${rank}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colors.dark} />
              <stop offset="25%" stopColor={colors.base} />
              <stop offset="50%" stopColor={colors.light} />
              <stop offset="75%" stopColor={colors.base} />
              <stop offset="100%" stopColor={colors.dark} />
            </linearGradient>
            
            <radialGradient id={`innerBezel-${rank}`} cx="50%" cy="50%" r="50%">
              <stop offset="85%" stopColor="transparent" />
              <stop offset="95%" stopColor="rgba(0,0,0,0.6)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.9)" />
            </radialGradient>
          </defs>

          {/* 1. Base do Medalhão (Forma Irregular Esculpida) */}
          <path 
            d="M60 5 C75 5 85 12 95 25 C108 35 115 45 115 60 C115 75 108 85 95 95 C85 108 75 115 60 115 C45 115 35 108 25 95 C12 85 5 75 5 60 C5 45 12 35 25 25 C35 12 45 5 60 5 Z" 
            fill={colors.dark} 
          />
          
          {/* 2. Camada Principal Metálica (Com ranhuras) */}
          <path 
            d="M60 10 C72 10 82 16 90 28 C102 38 108 48 108 60 C108 72 102 82 90 92 C82 104 72 110 60 110 C48 110 38 104 28 92 C16 82 10 72 10 60 C10 48 16 38 28 28 C38 16 48 10 60 10 Z" 
            fill={`url(#metalGrad-${rank})`} 
            stroke="rgba(0,0,0,0.2)" 
            strokeWidth="0.5"
          />

          {/* 3. Ornamentos Laterais (Filigranas Imperiais) */}
          <path d="M25 45 Q30 60 25 75 M95 45 Q90 60 95 75" fill="none" stroke={colors.light} strokeWidth="1" opacity="0.3" strokeLinecap="round" />
          <path d="M45 18 Q60 22 75 18 M45 102 Q60 98 75 102" fill="none" stroke={colors.light} strokeWidth="0.8" opacity="0.2" strokeLinecap="round" strokeDasharray="2 4" />

          {/* 4. Bezel de Encaixe Profundo */}
          <circle cx="60" cy="60" r="41" fill={`url(#innerBezel-${rank})`} />

          {/* 5. Shimmer Dinâmico (Metal Polido) */}
          <path d="M30 30 L90 90" stroke="#fff" strokeWidth="15" opacity="0" strokeLinecap="round">
            <animate attributeName="opacity" values="0;0.15;0" dur="4s" repeatCount="indefinite" />
            <animateTransform attributeName="transform" type="translate" from="-100 -100" to="100 100" dur="4s" repeatCount="indefinite" />
          </path>

          {/* 6. Coroa Integrada - Top 1 (Prestígio Real) */}
          {isFirst && (
            <g transform="translate(60, 2)">
              <path d="M-22 10 L-16 -5 L-8 6 L0 -12 L8 6 L16 -5 L22 10 Z" fill={`url(#metalGrad-${rank})`} stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
              <circle cx="0" cy="-12" r="2.5" fill="#fff" style={{ filter: 'drop-shadow(0 0 5px #fff)' }} />
            </g>
          )}

          {/* 7. Joia do Nº (Diamante no Topo) */}
          <g transform={`translate(60, ${isFirst ? 18 : 12})`}>
            <rect x="-10" y="-10" width="20" height="20" rx="3" transform="rotate(45)" fill="#111" stroke="#fff" strokeWidth="1.5" />
            <text x="0" y="5" textAnchor="middle" fill="#fff" style={{ fontSize: '12px', fontWeight: 900, fontFamily: 'Outfit', textShadow: '0 0 10px #fff' }}>
              {rank}
            </text>
          </g>
        </svg>

        {/* Avatar Circular (Efeito Joia de Encaixe) */}
        <div style={{ 
          position: 'absolute', inset: isFirst ? '9px' : '7.5px', 
          borderRadius: '50%', overflow: 'hidden', 
          background: '#000',
          boxShadow: 'inset 0 0 15px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.5)',
          zIndex: 1
        }}>
          <img
            src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`}
            alt={username}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      </div>

      {/* Info do Usuário */}
      <div style={{ textAlign: 'center', width: '100%', zIndex: 2 }}>
        <div style={{ 
          color: '#fff', fontSize: isFirst ? '0.9rem' : '0.75rem', fontWeight: 900,
          textShadow: '0 2px 8px rgba(0,0,0,1)', marginBottom: '2px', letterSpacing: '-0.2px'
        }}>
          {username}
        </div>
        <div style={{ 
          color: labelColor, fontWeight: 900, fontSize: isFirst ? '1.1rem' : '0.85rem',
          fontFamily: 'Outfit', textShadow: `0 0 10px ${labelColor}33`
        }}>
          {score.toLocaleString('pt-BR')}
        </div>
      </div>
    </div>
  );
}

// ── COMPONENTE PRINCIPAL (PRESERVANDO LOGICA) ───────────────────────────

export function MoralRanking({ onViewProfile }: { onViewProfile: (username: string) => void }) {
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'criadores' | 'patrocinadores'>('criadores');
  const [limit, setLimit] = useState<number>(10);
  const [daysLeft, setDaysLeft] = useState<number>(0);

  useEffect(() => {
    loadRanking();
  }, [activeTab, limit]);

  async function loadRanking() {
    const cacheKey = `moral_ranking_cache_${activeTab}_${limit}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp < 3600000) {
        processRankingData(data);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    let result: any[] = [];
    if (activeTab === 'criadores') {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, moral_balance, moral_season_received, total_donated, is_admin, last_reset_at')
        .order('moral_season_received', { ascending: false, nullsFirst: false })
        .limit(limit);
      result = data || [];
    } else {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, moral_balance, moral_season_received, moral_season_donated, is_admin, last_reset_at')
        .order('moral_season_donated', { ascending: false, nullsFirst: false })
        .limit(limit);
      result = data || [];
    }

    processRankingData(result);
    localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: result }));
    setLoading(false);
  }

  function processRankingData(data: any[]) {
    setRanking(data);
    if (data.length > 0 && data[0].last_reset_at) {
      const resetDate = new Date(data[0].last_reset_at).getTime();
      const nextReset = resetDate + (15 * 24 * 60 * 60 * 1000);
      const diff = nextReset - Date.now();
      setDaysLeft(Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))));
    }
  }

  const tabInfo = {
    criadores: { title: "ELITE CRIATIVA", desc: "TOP 100 VISIONÁRIOS DA CULTURA VELLAR.", color: 'var(--primary)', label: 'Impacto' },
    patrocinadores: { title: "LEGADO DE HONRA", desc: "TOP 100 DOADORES QUE APOIAM O SONHO.", color: '#ff007f', label: 'Doados' }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      <style>{`
        @keyframes stardust {
          0% { transform: translateY(0) scale(0); opacity: 0; }
          50% { opacity: 0.6; }
          100% { transform: translateY(-60px) scale(1.5); opacity: 0; }
        }
        @keyframes floating {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
      
      {/* Header Contextual */}
      <div style={{ padding: '0 0.5rem', marginBottom: '4px' }}>
        <h2 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.25rem', color: '#fff', marginBottom: '2px' }}>
          {tabInfo[activeTab].title}
        </h2>
        <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {tabInfo[activeTab].desc}
        </p>
      </div>

      {/* Banner de Temporada - Compactado */}
      <div style={{ 
        background: 'rgba(255,255,255,0.03)', padding: '0.6rem 0.8rem', borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '8px'
      }}>
        <Clock size={14} color={tabInfo[activeTab].color} />
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff' }}>
          Reset Global em <span style={{ color: tabInfo[activeTab].color }}>{daysLeft} dias</span>
        </div>
      </div>

      {/* Tabs Menu Premium */}
      <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
        {(['criadores', 'patrocinadores'] as const).map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setLimit(10); }}
            style={{
              flex: 1, padding: '0.6rem 0.2rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: activeTab === tab ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.25)',
              fontWeight: 800, fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem',
              transition: 'all 0.2s'
            }}>
            {tab === 'criadores' ? <Crown size={12} color={activeTab === tab ? 'var(--primary)' : 'currentColor'} /> :
                                   <Heart size={12} color={activeTab === tab ? '#ff007f' : 'currentColor'} />}
            {tab.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }}>
        {loading && limit === 10 ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <Loader2 size={24} className="animate-spin" color={tabInfo[activeTab].color} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            
            {/* PÓDIO ARTEFATO COMPACTADO (TOP 3) */}
            {ranking.length > 0 && (
              <div style={{ 
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center', 
                gap: '8px', padding: '1.2rem 0 0.8rem', position: 'relative',
                background: `radial-gradient(ellipse at 50% 50%, ${tabInfo[activeTab].color}08 0%, transparent 70%)`
              }}>
                {/* Partículas Star Dust Sutil */}
                {[...Array(6)].map((_, i) => (
                  <div key={i} style={{
                    position: 'absolute', bottom: '20%', left: `${25 + i * 10}%`,
                    width: '1px', height: '1px', background: '#fff', borderRadius: '50%',
                    opacity: 0, animation: `stardust 4s linear infinite`, animationDelay: `${i * 0.5}s`
                  }} />
                ))}

                {[1, 0, 2].map((idx) => {
                  const user = ranking[idx];
                  if (!user) return <div key={idx} style={{ flex: 1 }} />;
                  return (
                    <ExecutiveFrame 
                      key={user.id} rank={idx + 1} 
                      avatarUrl={user.avatar_url} username={user.username} 
                      score={activeTab === 'criadores' ? (user.moral_season_received ?? 0) : (user.moral_season_donated ?? 0)}
                      labelColor={tabInfo[activeTab].color}
                    />
                  );
                })}
              </div>
            )}

            {/* Divisor High-End */}
            <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)', margin: '0.5rem 0' }} />

            {/* Resto do Ranking */}
            {ranking.slice(3).map((user, i) => (
              <div key={user.id} onClick={() => onViewProfile(user.username)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.7rem 1rem',
                  borderRadius: '12px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)',
                  border: '1px solid transparent', transition: 'all 0.2s'
                }}>
                <div style={{ width: '24px', textAlign: 'center', fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.2)' }}>
                  {i + 4}
                </div>
                <img src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)' }} alt="" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.8rem' }}>{user.username}</div>
                  <div style={{ transform: 'scale(0.75)', transformOrigin: 'left' }}>
                    <GifterBadge donatedAmount={user.total_donated} />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', fontWeight: 800 }}>{tabInfo[activeTab].label}</div>
                  <div style={{ color: tabInfo[activeTab].color, fontWeight: 900, fontSize: '0.85rem', fontFamily: 'Outfit' }}>
                    {activeTab === 'criadores' ? (user.moral_season_received?.toLocaleString('pt-BR') ?? 0)
                      : (user.moral_season_donated?.toLocaleString('pt-BR') ?? 0)}
                  </div>
                </div>
              </div>
            ))}

            {limit < 100 && ranking.length === limit && (
              <button onClick={() => setLimit(100)}
                style={{
                  width: '100%', marginTop: '0.8rem', background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)',
                  padding: '0.8rem', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 800,
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                EXPANDIR HALL DA FAMA <ChevronDown size={12} style={{ marginLeft: '4px' }} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
