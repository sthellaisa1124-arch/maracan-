import { X, Clock } from 'lucide-react';

interface LiveSummaryModalProps {
  host: {
    username: string;
    avatar_url: string;
  };
  stats: {
    duration: string;
    viewers: number;
    likes: number;
    gifts: number;
    followers: number;
  };
  onClose: () => void;
}

export function LiveSummaryModal({ host, stats, onClose }: LiveSummaryModalProps) {
  return (
    <div 
      className="live-summary-overlay" 
      style={{ 
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 999999, background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(25px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
      }}
    >
      <div className="avista-creator-modal animate-fade-up" style={{ 
        width: '100%', 
        maxWidth: '400px', 
        background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)', 
        border: '1px solid rgba(255,255,255,0.1)', 
        borderRadius: '35px', 
        padding: '3rem 2rem 2.5rem',
        boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
        textAlign: 'center',
        position: 'relative'
      }}>
        
        {/* BOTÃO FECHAR ESCANTEADO */}
        <button 
          onClick={onClose} 
          style={{ 
            position: 'absolute', right: '20px', top: '20px', 
            background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', 
            cursor: 'pointer', padding: '10px', borderRadius: '50%',
            transition: 'all 0.2s'
          }}
        >
          <X size={20} />
        </button>

        {/* PROFILE HEADER */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1rem' }}>
            <img 
              src={host.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${host.username}`} 
              style={{ 
                width: '90px', height: '90px', borderRadius: '50%', 
                border: '4px solid var(--primary)', padding: '4px',
                boxShadow: '0 0 25px rgba(108, 43, 255, 0.4)'
              }}
              alt="Avatar"
            />
            <div style={{ 
              position: 'absolute', bottom: '0', right: '0', 
              background: 'var(--primary)', color: '#fff', 
              fontSize: '0.65rem', fontWeight: 900, padding: '4px 8px', 
              borderRadius: '10px', border: '2px solid #111'
            }}>YOU</div>
          </div>
          <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>@{host.username}</h3>
          <div style={{ 
            display: 'inline-block', marginTop: '0.5rem', padding: '4px 12px', 
            background: 'rgba(255,255,255,0.05)', borderRadius: '20px',
            fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase', letterSpacing: '1px'
          }}>Resumo da Transmissão</div>
        </div>

        {/* GRADIENT TITLE */}
        <h2 style={{ 
          fontSize: '2.4rem', fontWeight: 950, margin: '0 0 0.5rem',
          background: 'linear-gradient(135deg, #fff 30%, var(--primary) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          lineHeight: 1.1
        }}>
          LIVE<br/>ENCERRADA
        </h2>
        
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginBottom: '2.5rem', fontWeight: 500 }}>
          Sua live foi um sucesso na pista! 🔥
        </p>

        {/* DYNAMIC STATS GRID */}
        <div style={{ 
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '3rem'
        }}>
          {/* Item */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.03)' }}>
            <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: 900, color: '#fff' }}>{stats.viewers}</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Views</span>
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.03)' }}>
            <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: 900, color: '#fbbf24' }}>{stats.gifts}</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Moral</span>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.03)' }}>
            <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: 900, color: '#ef4444' }}>{stats.likes}</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Likes</span>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.03)' }}>
            <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: 900, color: '#10b981' }}>{stats.followers}</span>
            <span style={{ fontSize: '0.7rem', opacity: 0.4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fãs</span>
          </div>

          {/* DURATION */}
          <div style={{ 
            background: 'rgba(108, 43, 255, 0.08)', 
            padding: '1.1rem', 
            borderRadius: '24px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.8rem',
            gridColumn: 'span 2',
            border: '1px solid rgba(108, 43, 255, 0.15)'
          }}>
            <Clock size={18} color="var(--primary)" />
            <span style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>Duração: {stats.duration}</span>
          </div>
        </div>

        {/* BOTTOM ACTION */}
        <button 
           onClick={onClose}
           style={{ 
             width: '100%', 
             padding: '1.4rem', 
             fontSize: '1.1rem', 
             background: 'var(--primary)', 
             color: '#fff',
             borderRadius: '20px',
             fontWeight: 900,
             boxShadow: '0 15px 30px rgba(108, 43, 255, 0.4)',
             border: 'none',
             cursor: 'pointer',
             letterSpacing: '1px',
             transition: 'all 0.2s'
           }}
        >
           CONCLUIR
        </button>

      </div>
    </div>
  );
}
