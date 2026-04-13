import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { X, Swords, Globe, Loader2, Trophy, Zap } from 'lucide-react';

interface GlobalBattleMatchmakerProps {
  isOpen: boolean;
  onClose: () => void;
  currentHostId: string;
  currentChannelId: string; // agora_channel do host
  onMatchFound: (opponent: any) => void;
}

type MatchState = 'idle' | 'searching' | 'found' | 'cancelled';

export function GlobalBattleMatchmaker({
  isOpen,
  onClose,
  currentHostId,
  currentChannelId,
  onMatchFound,
}: GlobalBattleMatchmakerProps) {
  const [state, setState] = useState<MatchState>('idle');
  const [waitTime, setWaitTime] = useState(0);
  const [matchEntry, setMatchEntry] = useState<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) return;
    return () => {
      cancelSearch();
    };
  }, [isOpen]);

  // Timer de espera
  useEffect(() => {
    if (state === 'searching') {
      timerRef.current = setInterval(() => setWaitTime(prev => prev + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (state !== 'found') setWaitTime(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  async function startSearch() {
    setState('searching');
    setWaitTime(0);

    // 1. Inserir na fila do banco
    const { data: entry, error } = await supabase
      .from('battle_queue')
      .insert({
        host_id: currentHostId,
        agora_channel: currentChannelId,
        status: 'waiting',
      })
      .select()
      .single();

    if (error || !entry) {
      console.error('Erro ao entrar na fila:', error);
      setState('idle');
      return;
    }

    setMatchEntry(entry);

    // 2. Escutar mudanças na fila — alguém vai nos escolher como oponente
    channelRef.current = supabase
      .channel(`battle_queue_${currentHostId}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'battle_queue',
          filter: `id=eq.${entry.id}`,
        },
        async (payload: any) => {
          const updated = payload.new;
          if (updated.status === 'matched' && updated.opponent_id) {
            // Fomos encontrados por alguém!
            const { data: opponentProfile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', updated.opponent_id)
              .single();

            const { data: opponentSession } = await supabase
              .from('live_sessions')
              .select('agora_channel, id')
              .eq('host_id', updated.opponent_id)
              .eq('is_live', true)
              .single();

            setState('found');
            onMatchFound({
              host_id: updated.opponent_id,
              profiles: opponentProfile,
              agora_channel: opponentSession?.agora_channel,
            });
          }
        }
      )
      .subscribe();

    // 3. Procurar alguém esperando agora (exceto nós mesmos)
    const { data: waiting } = await supabase
      .from('battle_queue')
      .select('*, host_profile:host_id(username, avatar_url)')
      .eq('status', 'waiting')
      .neq('host_id', currentHostId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (waiting) {
      // Há alguém esperando → fazemos o match!
      await supabase
        .from('battle_queue')
        .update({ status: 'matched', opponent_id: currentHostId })
        .eq('id', waiting.id);

      // Marca nosso próprio registro como matched
      await supabase
        .from('battle_queue')
        .update({ status: 'matched', opponent_id: waiting.host_id })
        .eq('id', entry.id);

      setState('found');
      onMatchFound({
        host_id: waiting.host_id,
        profiles: waiting.host_profile,
        agora_channel: waiting.agora_channel,
      });
    }
  }

  async function cancelSearch() {
    setState('cancelled');
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    if (matchEntry) {
      await supabase
        .from('battle_queue')
        .delete()
        .eq('id', matchEntry.id);
      setMatchEntry(null);
    }
    setState('idle');
  }

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      {/* Overlay */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
        onClick={state !== 'searching' ? onClose : undefined}
      />

      {/* Modal */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: '480px',
        background: 'linear-gradient(180deg, #0f0f12 0%, #09090b 100%)',
        borderRadius: '2rem 2rem 0 0',
        border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none',
        boxShadow: '0 -20px 60px rgba(220,38,38,0.15)',
        padding: '1.5rem',
        animation: 'slideUpSheet 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, #dc2626, #ea580c)',
              padding: '0.6rem', borderRadius: '1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Globe size={22} color="#fff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: '#fff', letterSpacing: '0.05em' }}>
                CONFRONTO GLOBAL
              </h2>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                Desafie qualquer criador ao vivo
              </p>
            </div>
          </div>
          <button
            onClick={state === 'searching' ? cancelSearch : onClose}
            style={{
              background: 'rgba(255,255,255,0.06)', border: 'none',
              borderRadius: '50%', width: '36px', height: '36px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {state === 'idle' && (
          <div style={{ textAlign: 'center', padding: '1rem 0 2rem' }}>
            {/* Arena icon */}
            <div style={{
              width: '100px', height: '100px', borderRadius: '50%', margin: '0 auto 1.5rem',
              background: 'radial-gradient(circle, rgba(220,38,38,0.15) 0%, rgba(0,0,0,0) 70%)',
              border: '1px solid rgba(220,38,38,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              <Swords size={42} color="#ef4444" />
              <div style={{
                position: 'absolute', inset: '-8px', borderRadius: '50%',
                border: '1px dashed rgba(220,38,38,0.2)',
                animation: 'spin 12s linear infinite',
              }} />
            </div>

            <h3 style={{ margin: '0 0 0.5rem', color: '#fff', fontSize: '1.15rem', fontWeight: 800 }}>
              Entre na Arena Global
            </h3>
            <p style={{ margin: '0 0 2rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', lineHeight: 1.5, maxWidth: '260px', marginInline: 'auto' }}>
              Você será colocado em fila e conectado com o próximo criador disponível que também estiver procurando um oponente.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '2rem' }}>
              {[['⚔️', '3 min de batalha'], ['🎁', 'Pontos por presentes'], ['👑', 'Vencedor revelado']].map(([icon, text]) => (
                <div key={text} style={{
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '1rem', padding: '0.75rem 0.5rem', flex: 1, textAlign: 'center',
                }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>{icon}</div>
                  <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600, lineHeight: 1.2 }}>{text}</div>
                </div>
              ))}
            </div>

            <button
              onClick={startSearch}
              style={{
                width: '100%', padding: '1rem',
                background: 'linear-gradient(135deg, #dc2626, #ea580c)',
                border: 'none', borderRadius: '1.2rem', color: '#fff',
                fontWeight: 900, fontSize: '1rem', cursor: 'pointer',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                boxShadow: '0 8px 30px rgba(220,38,38,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                transition: 'all 0.2s',
              }}
            >
              <Zap size={20} />
              Procurar Oponente
            </button>
          </div>
        )}

        {state === 'searching' && (
          <div style={{ textAlign: 'center', padding: '1rem 0 2.5rem' }}>
            {/* Radar Animation */}
            <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 2rem' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  border: '2px solid rgba(220,38,38,0.4)',
                  animation: `radarPing 2s ease-out infinite`,
                  animationDelay: `${i * 0.66}s`,
                }} />
              ))}
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(220,38,38,0.1)', borderRadius: '50%',
                border: '2px solid rgba(220,38,38,0.3)',
              }}>
                <Swords size={36} color="#ef4444" />
              </div>
            </div>

            <h3 style={{ margin: '0 0 0.4rem', color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>
              Procurando oponente...
            </h3>
            <p style={{ margin: '0 0 2rem', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
              Tempo de espera: <strong style={{ color: '#ef4444' }}>{formatTime(waitTime)}</strong>
            </p>

            <style>{`
              @keyframes radarPing {
                0% { transform: scale(0.3); opacity: 0.8; }
                100% { transform: scale(2.2); opacity: 0; }
              }
              @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
              }
            `}</style>

            <button
              onClick={cancelSearch}
              style={{
                padding: '0.85rem 2rem',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '1rem', color: 'rgba(255,255,255,0.6)',
                fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
              }}
            >
              Cancelar Busca
            </button>
          </div>
        )}

        {state === 'found' && (
          <div style={{ textAlign: 'center', padding: '1rem 0 2rem' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🔥</div>
            <h3 style={{ margin: '0 0 0.5rem', color: '#fff', fontWeight: 900, fontSize: '1.2rem' }}>
              Oponente Encontrado!
            </h3>
            <p style={{ margin: '0 0 1.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
              O CONFRONTO está começando...
            </p>
            <div style={{
              background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.2)',
              borderRadius: '1rem', padding: '1rem',
            }}>
              <Loader2 size={24} color="#ef4444" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
