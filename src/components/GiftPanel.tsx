import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Coins } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GiftIconRenderer, GIFT_ICON_MAP } from './GiftIcons';
import { GIFT_CATALOG, type Gift, TIER_CONFIG } from '../lib/gifts';
export type { Gift };

// ── ANIMAÇÃO DE FLUTUAÇÃO INLINE ──
const floatKeyframes = `
  @keyframes floatGift {
    0% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
    100% { transform: translateY(0px); }
  }
`;
interface GiftPanelProps {
  recipientId: string;
  recipientName: string;
  postId?: string;
  postType?: string;
  senderId: string;
  onClose: () => void;
  onGiftSent: (gift: Gift) => void;
}

export function GiftPanel({
  recipientId,
  recipientName,
  postId,
  postType = 'avista_post',
  senderId,
  onClose,
  onGiftSent,
}: GiftPanelProps) {
  const [selected, setSelected] = useState<Gift | null>(null);
  const [sending, setSending] = useState(false);
  const [balance, setBalance] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<Gift['tier'] | 'all'>('all');
  const [successGift, setSuccessGift] = useState<Gift | null>(null);

  useEffect(() => {
    if (!senderId) return;

    // Carregar saldo do usuário
    supabase
      .from('profiles')
      .select('moral_balance')
      .eq('id', senderId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setBalance(data.moral_balance ?? 0);
      });
  }, [senderId]);

  const filteredGifts = activeTab === 'all' 
    ? [...GIFT_CATALOG].sort((a, b) => a.price - b.price)
    : GIFT_CATALOG.filter(g => g.tier === activeTab);

  function formatPrice(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'k';
    return String(n);
  }

  async function handleSend() {
    if (!selected || sending) return;
    if (balance < selected.price) {
      alert(`Sem Moral suficiente! Você tem 🪙 ${balance} mas precisa de 🪙 ${selected.price}.`);
      return;
    }
    if (recipientId === senderId) {
      alert('Você não pode mandar presente pra si mesmo!');
      return;
    }

    setSending(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('send_moral', {
        p_sender_id: senderId,
        p_receiver_id: recipientId,
        p_amount: selected.price,
        p_reference_id: postId || null,
        p_reference_type: postType,
        p_description: `🎁 Presente "${selected.name}" enviado`,
      });

      if (rpcError) {
        alert(`Erro de Sistema (RPC): ${rpcError.message}`);
        setSending(false);
        return;
      }

      if (data?.success) {
        // Registrar transação
        await supabase.from('gift_transactions').insert({
          sender_id: senderId,
          recipient_id: recipientId,
          gift_id: selected.id,
          gift_name: selected.name,
          gift_price: selected.price,
          gift_tier: selected.tier,
          post_id: postId || null,
        }).then(() => {/* ignora erro se tabela não existir ainda */});

        // Notificação
        await supabase.from('notifications').insert({
          user_id: recipientId,
          from_user_id: senderId,
          type: 'gift_received',
          post_id: postId || null,
          message: `te enviou um presente: ${selected.symbol} ${selected.name} (${selected.price} Moral)`
        });

        setBalance(prev => Math.max(0, prev - selected.price));
        setSuccessGift(selected);
        onGiftSent(selected);
        setTimeout(() => {
          setSuccessGift(null);
          onClose();
        }, 1500);
      } else {
        alert(data?.error || 'Erro ao enviar presente.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro ao enviar presente: ' + (err.message || 'Desconhecido'));
    } finally {
      setSending(false);
    }
  }

  const content = (
    <div className="gift-panel-overlay" onClick={onClose} style={{ zIndex: 999999999 }}>
      <style>{`
        ${floatKeyframes}
        .gift-panel-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(10px);
          display: flex; flex-direction: column; justify-content: flex-end; z-index: 999999999;
        }
        .gift-panel-sheet {
          background: rgba(15,15,20,0.95); backdrop-filter: blur(25px); border-top: 1px solid rgba(255,255,255,0.1);
          border-radius: 24px 24px 0 0; padding: 1rem; padding-bottom: 2rem; height: 85vh; display: flex; flex-direction: column;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); position: relative;
        }
        .gift-panel-handle { width: 40px; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; margin: 0 auto 1rem; flex-shrink: 0; }
        .gift-panel-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; flex-shrink: 0; }
        .gift-panel-title { display: flex; align-items: center; gap: 0.8rem; }
        .gift-panel-title-icon { font-size: 2rem; }
        .gift-panel-title h2 { font-size: 1.2rem; font-weight: 900; color: #fff; margin: 0; }
        .gift-panel-title p { font-size: 0.8rem; color: rgba(255,255,255,0.5); font-weight: 700; margin: 0; }
        .gift-panel-balance { display: flex; flex-direction: column; align-items: center; background: rgba(255,255,255,0.05); padding: 0.4rem 1rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); }
        .gift-panel-balance span { font-weight: 900; color: #fbbf24; font-size: 1.1rem; line-height: 1; }
        .gift-panel-balance .gift-balance-label { font-size: 0.6rem; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1px; }
        .gift-panel-close { background: none; border: none; color: #fff; opacity: 0.5; padding: 0.5rem; cursor: pointer; }
        .gift-tier-tabs { display: flex; gap: 0.4rem; overflow-x: auto; padding-bottom: 0.5rem; margin-bottom: 1rem; scrollbar-width: none; flex-shrink: 0; }
        .gift-tier-tab { flex: 1; min-width: max-content; padding: 0.6rem 1rem; border-radius: 1rem; font-weight: 900; font-size: 0.8rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); cursor: pointer; transition: all 0.2s; white-space: nowrap; }
        .gift-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; overflow-y: auto; padding-bottom: 8rem; }
        .gift-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 1rem 0.5rem; display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: all 0.2s; position: relative; }
        .gift-card.selected { background: rgba(255,255,255,0.1); border-color: var(--gift-color); box-shadow: 0 0 20px rgba(255,255,255,0.1) inset; filter: drop-shadow(0 0 10px var(--gift-glow)); }
        .gift-icon-wrap { width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; margin-bottom: 0.5rem; position: relative; }
        .gift-icon-wrap.premium, .gift-icon-wrap.ultra { width: 80px; height: 80px; }
        .gift-panel-footer { position: absolute; bottom: 0; left: 0; right: 0; padding: 1rem 1.5rem 2rem; background: linear-gradient(to top, rgba(10,10,12,1) 70%, transparent); display: flex; flex-direction: column; gap: 1rem; pointer-events: none; z-index: 10; }
        .gift-panel-footer * { pointer-events: auto; }
        .gift-selected-preview { display: flex; align-items: center; gap: 1rem; background: rgba(255,255,255,0.1); padding: 0.8rem; border-radius: 16px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2); }
        .gs-info { display: flex; flex-direction: column; }
        .gs-name { font-weight: 900; color: #fff; font-size: 1.1rem; }
        .gs-cost { font-weight: 800; font-size: 0.85rem; }
        .gift-no-selection { text-align: center; color: rgba(255,255,255,0.4); font-weight: 800; padding: 1rem; background: rgba(255,255,255,0.02); border-radius: 12px; }
        .gift-send-btn { padding: 1rem; border-radius: 20px; font-size: 1.2rem; font-weight: 900; color: #fff; border: none; background: rgba(255,255,255,0.1); opacity: 0.5; cursor: not-allowed; transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
        .gift-send-btn.ready { opacity: 1; cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.3); text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
        .gift-success-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(10px); border-radius: 24px 24px 0 0; z-index: 100; display: flex; align-items: center; justify-content: center; }
        .gift-success-inner { display: flex; flex-direction: column; align-items: center; text-align: center; }
        .gift-success-icon { font-size: 6rem; animation: successPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .gift-success-inner h3 { font-size: 1.8rem; font-weight: 900; color: #fff; margin: 1rem 0 0.5rem; }
        .gift-success-inner p { font-size: 1rem; color: rgba(255,255,255,0.7); }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes successPop { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
      `}</style>
      <div className="gift-panel-sheet" onClick={e => e.stopPropagation()}>

        {/* ── Topo da gaveta ── */}
        <div className="gift-panel-handle" />

        {/* ── Header ── */}
        <div className="gift-panel-header">
          <div className="gift-panel-title">
            <span className="gift-panel-title-icon">🎁</span>
            <div>
              <h2>Presentear</h2>
              <p>@{recipientName}</p>
            </div>
          </div>
          <div className="gift-panel-balance">
            <Coins size={16} />
            <span>{balance.toLocaleString('pt-BR')}</span>
            <span className="gift-balance-label">Moral</span>
          </div>
          <button className="gift-panel-close" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        {/* ── Tabs de Categoria ── */}
        <div className="gift-tier-tabs">
          {(Object.keys(TIER_CONFIG) as (Gift['tier'] | 'all')[]).map(tier => {
            const cfg = TIER_CONFIG[tier];
            const isActive = activeTab === tier;
            return (
              <button
                key={tier}
                className={`gift-tier-tab ${isActive ? 'active' : ''}`}
                style={isActive ? { color: cfg.color, borderColor: cfg.color, background: cfg.bg } : {}}
                onClick={() => { setActiveTab(tier); setSelected(null); }}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* ── Grade de Presentes ── */}
        <div className="gift-grid">
          {filteredGifts.map(gift => {
            const canAfford = balance >= gift.price;
            const isSelected = selected?.id === gift.id;
            return (
              <button
                key={gift.id}
                className={`gift-card ${isSelected ? 'selected' : ''} ${!canAfford ? 'cant-afford' : ''}`}
                style={{
                  '--gift-color': gift.color,
                  '--gift-glow': gift.glow,
                  opacity: !canAfford ? 0.4 : 1,
                  transform: isSelected ? 'scale(1.1) translateY(-5px)' : 'scale(1)',
                } as React.CSSProperties}
                onClick={() => canAfford && setSelected(isSelected ? null : gift)}
              >
                <div
                  className={`gift-icon-wrap ${gift.tier}`}
                  style={{
                    filter: isSelected ? `drop-shadow(0 0 20px ${gift.glow})` : `drop-shadow(0 0 8px ${gift.color}66)`,
                    animation: `floatGift ${2.5 + Math.random()}s ease-in-out infinite`
                  } as React.CSSProperties}
                >
                  {gift.image ? (
                    <img 
                      src={gift.image} 
                      alt={gift.name} 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain', 
                        mixBlendMode: 'screen',
                        borderRadius: '50%',
                        filter: gift.id === 'diamond_lion' ? 'hue-rotate(180deg) saturate(1.5)' : 'none'
                      }} 
                    />
                  ) : GIFT_ICON_MAP[gift.id] ? (
                    <GiftIconRenderer giftId={gift.id} size={60} />
                  ) : (
                    <span className="gift-symbol" style={{ color: gift.color, fontSize: '3rem' }}>
                      {gift.symbol}
                    </span>
                  )}
                  {gift.tier === 'ultra' && <div className="gift-shine" />}
                  {isSelected && <div style={{ position:'absolute', inset: -6, borderRadius: '50%', border: `2px dashed ${gift.color}`, animation: 'spin 10s linear infinite', opacity: 0.5 }} />}
                </div>

                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', textAlign: 'center', marginBottom: '4px' }}>
                  {gift.name}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: gift.color, fontSize: '0.85rem', fontWeight: 800 }}>
                  <span>🪙</span>
                  <span>{formatPrice(gift.price)}</span>
                </div>

                {!canAfford && (
                  <div style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '4px' }}>
                    <span style={{ fontSize: '12px' }}>🔒</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Painel de selecionado + Botão Enviar ── */}
        <div className="gift-panel-footer" style={{ paddingBottom: '90px' }}>
          {selected ? (
            <div className="gift-selected-preview">
              <div className="gs-icon-mini" style={{ filter: `drop-shadow(0 0 12px ${selected.glow})`, width: '48px', height: '48px' }}>
                {selected.image ? (
                  <img src={selected.image} alt={selected.name} style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'screen', filter: selected.id === 'diamond_lion' ? 'hue-rotate(180deg) saturate(1.5)' : 'none' }} />
                ) : GIFT_ICON_MAP[selected.id] ? (
                  <GiftIconRenderer giftId={selected.id} size={50} />
                ) : (
                  <span style={{ color: selected.color, textShadow: `0 0 12px ${selected.glow}`, fontSize: '2.5rem' }}>
                    {selected.symbol}
                  </span>
                )}
              </div>
              <div className="gs-info">
                <span className="gs-name">{selected.name}</span>
                <span className="gs-cost" style={{ color: selected.color }}>
                  🪙 {selected.price.toLocaleString('pt-BR')} Moral
                </span>
              </div>
            </div>
          ) : (
            <div className="gift-no-selection">
              Selecione um presente para enviar ✨
            </div>
          )}

          <button
            className={`gift-send-btn ${selected ? 'ready' : ''} ${sending ? 'sending' : ''}`}
            style={selected ? { background: `linear-gradient(135deg, ${selected.color}cc, ${selected.color}88)` } : {}}
            onClick={handleSend}
            disabled={!selected || sending}
          >
            {sending ? (
              <><Loader2 size={20} className="animate-spin" /> Enviando...</>
            ) : (
              <>🎁 Enviar Presente</>
            )}
          </button>
        </div>

        {/* ── Tela de Sucesso ── */}
        {successGift && (
          <div className="gift-success-overlay">
            <div className="gift-success-inner">
              <div
                className="gift-success-icon"
                style={{ color: successGift.color, textShadow: `0 0 40px ${successGift.glow}` }}
              >
                {successGift.symbol}
              </div>
              <h3>Presente enviado!</h3>
              <p>
                <strong style={{ color: successGift.color }}>{successGift.name}</strong> foi para{' '}
                <strong>@{recipientName}</strong>
              </p>
              <div className="gift-success-particles">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="gift-particle" style={{ '--delay': `${i * 0.1}s`, '--ang': `${i * 30}deg`, '--color': successGift.color } as React.CSSProperties} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
