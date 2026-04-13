import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Swords, User, Loader2 } from 'lucide-react';

interface LiveBattleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentHostId: string;
  onInvite: (opponent: any) => void;
  onGlobalSearch?: () => void;
}

export function LiveBattleModal({ isOpen, onClose, currentHostId, onInvite, onGlobalSearch }: LiveBattleModalProps) {
  const [loading, setLoading] = useState(true);
  const [liveCreators, setLiveCreators] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    fetchLiveOpponents();
  }, [isOpen]);

  async function fetchLiveOpponents() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('live_sessions')
        .select(`id, host_id, agora_channel, title, viewer_count, profiles:host_id(username, avatar_url, name)`)
        .eq('is_live', true)
        .neq('host_id', currentHostId)
        .order('viewer_count', { ascending: false });

      if (data && !error) setLiveCreators(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      {/* Overlay */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: '480px',
        background: 'linear-gradient(180deg, #18181b 0%, #09090b 100%)',
        borderRadius: '2rem 2rem 0 0',
        border: '1px solid rgba(255,255,255,0.08)',
        borderBottom: 'none',
        boxShadow: '0 -20px 60px rgba(0,0,0,0.7)',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        animation: 'slideUpSheet 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>

        {/* Header */}
        <div style={{
          padding: '1.2rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(0,0,0,0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #dc2626, #ea580c)',
              padding: '0.5rem', borderRadius: '0.75rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Swords size={20} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#fff', letterSpacing: '0.05em' }}>
                CONFRONTO
              </h2>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                Desafie um criador ao vivo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)', border: 'none',
              borderRadius: '50%', width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1rem 1.5rem', flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0', gap: '0.75rem' }}>
              <Loader2 size={32} color="rgba(255,255,255,0.3)" style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', margin: 0 }}>Buscando criadores ao vivo...</p>
            </div>
          ) : liveCreators.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0', gap: '1rem', textAlign: 'center' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <User size={32} color="rgba(255,255,255,0.2)" />
              </div>
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 700 }}>
                Nenhum criador ao vivo
              </h3>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', maxWidth: '260px' }}>
                Para desafiar, outro criador precisa estar numa live ao mesmo tempo que você.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {liveCreators.map((creator) => {
                const profile = creator.profiles;
                if (!profile) return null;
                return (
                  <div key={creator.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '1.2rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{ position: 'relative' }}>
                        <img
                          src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.username}`}
                          alt={profile.username}
                          style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(239,68,68,0.4)' }}
                        />
                        <div style={{
                          position: 'absolute', bottom: '-2px', right: '-2px',
                          background: '#22c55e', border: '2px solid #09090b',
                          width: '14px', height: '14px', borderRadius: '50%',
                        }} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
                          @{profile.username}
                        </h4>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                          {creator.viewer_count || 0} assistindo
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onInvite(creator)}
                      style={{
                        background: 'linear-gradient(135deg, #dc2626, #ea580c)',
                        border: 'none', color: '#fff', fontWeight: 800, fontSize: '0.8rem',
                        padding: '0.6rem 1.1rem', borderRadius: '0.85rem',
                        cursor: 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase',
                        boxShadow: '0 4px 15px rgba(220,38,38,0.4)',
                        transition: 'all 0.2s',
                      }}
                    >
                      Desafiar
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Botão de Busca Global Opcional */}
          {onGlobalSearch && !loading && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                onClick={() => {
                  onClose();
                  onGlobalSearch();
                }}
                style={{
                  width: '100%', padding: '1rem',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '1.2rem', color: '#fff',
                  fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  transition: 'all 0.2s'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>🌍</span> Procurar Oponente Global
              </button>
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                Conecte-se com qualquer criador disponível
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
