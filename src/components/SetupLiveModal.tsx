import { useState } from 'react';
import { X, Video, ShieldAlert, Loader2, Coins } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GIFT_CATALOG } from '../lib/gifts';
import { Image as ImageIcon, Plus } from 'lucide-react';

interface SetupLiveModalProps {
  session: any;
  onClose: () => void;
  onStartLive: (liveData: any) => void;
}

export function SetupLiveModal({ session, onClose, onStartLive }: SetupLiveModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [is18Plus, setIs18Plus] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState('RESENHA');
  const [loading, setLoading] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  // Metas de Presentes
  const [enableGiftGoal, setEnableGiftGoal] = useState(false);
  const [giftGoalTitle, setGiftGoalTitle] = useState('');
  const [giftGoalTarget, setGiftGoalTarget] = useState<number | ''>('');
  const [giftGoalId, setGiftGoalId] = useState<string | null>(null);

  // Metas de Seguidores
  const [enableFollowerGoal, setEnableFollowerGoal] = useState(false);
  const [followerGoalTitle, setFollowerGoalTitle] = useState('');
  const [followerGoalTarget, setFollowerGoalTarget] = useState<number | ''>('');

  const [isGiftPickerOpen, setIsGiftPickerOpen] = useState(false);

  async function handleStart() {
    if (!title.trim() || !session?.user?.id) return;
    setLoading(true);
    onClose(); // FECHAR IMEDIATAMENTE PARA NÃO OBSTRUIR A TELA

    const fullDescription = `${selectedVibe ? `[${selectedVibe}] ` : ''}${description.trim()}`;

    let coverUrl = null;
    try {
      if (coverFile) {
        const fileExt = coverFile.name.split('.').pop();
        const fileName = `live_covers/${session.user.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, coverFile);
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(fileName);
          
        coverUrl = publicUrl;
      }

      const channelName = `live_${session.user.id}_${Date.now()}`;
      const { data, error } = await supabase
        .from('live_sessions')
        .insert([{
          host_id: session.user.id,
          title: title.trim(),
          description: fullDescription,
          cover_url: coverUrl,
          is_18plus: is18Plus,
          agora_channel: channelName,
          is_live: false, 
          viewer_count: 0,
          started_at: new Date().toISOString(),
          
          // Meta Presentes
          gift_goal_title: enableGiftGoal ? (giftGoalTitle.trim() || (giftGoalId ? `Meta: ${GIFT_CATALOG.find(g => g.id === giftGoalId)?.name}` : 'Meta de Presentes')) : null,
          gift_goal_target: enableGiftGoal ? (Number(giftGoalTarget) || 0) : 0,
          gift_goal_current: 0,
          gift_goal_id: enableGiftGoal ? giftGoalId : null,

          // Meta Seguidores
          follower_goal_title: enableFollowerGoal ? (followerGoalTitle.trim() || 'Meta de Seguidores') : null,
          follower_goal_target: enableFollowerGoal ? (Number(followerGoalTarget) || 0) : 0,
          follower_goal_current: 0,
          
          category: selectedVibe,
        }])
        .select('*')
        .single();

      if (error) throw error;
      if (data) {
        onStartLive(data);
        
        // Notificações serão disparadas no LiveRoom após o 'Go Live'
      }
      
    } catch (err: any) {
      console.error("Erro ao iniciar Live:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="setup-live-vellar-overlay">
      <style>{`
        .setup-live-vellar-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.9); 
          backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px);
          display: flex; align-items: flex-end; justify-content: center; z-index: 100000;
          animation: modalFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .vellar-modal-content {
          width: 100%; max-width: 500px; background: #0a0a0a;
          border-top: 1px solid rgba(255,255,255,0.1);
          border-radius: 40px 40px 0 0; padding: 1.5rem; padding-bottom: 2.5rem;
          box-shadow: 0 -20px 50px rgba(0,0,0,0.5);
          position: relative; animation: modalSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          max-height: 92vh; overflow-y: auto; scrollbar-width: none;
        }
        .vellar-modal-content::-webkit-scrollbar { display: none; }
        .vellar-modal-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 1.2rem;
        }
        .header-main { display: flex; align-items: center; gap: 14px; }
        .icon-box { 
          background: linear-gradient(135deg, #a855f7 0%, #6C2BFF 100%);
          width: 44px; height: 44px; border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 15px rgba(168,85,247,0.25);
        }
        .modal-title-text h3 { margin: 0; font-family: 'Outfit'; font-weight: 900; color: #fff; font-size: 1.25rem; letter-spacing: -0.5px; }
        .modal-title-text p { margin: 0; font-size: 0.7rem; color: rgba(255,255,255,0.4); font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }

        .close-circle {
          background: rgba(255,255,255,0.05); border: none; color: #fff;
          width: 36px; height: 36px; border-radius: 50%; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.3s;
        }
        .close-circle:hover { background: rgba(255,255,255,0.1); transform: rotate(90deg); }

        .vellar-form { display: flex; flex-direction: column; gap: 1.5rem; }
        
        .vellar-input-wrap { position: relative; }
        .vellar-input-wrap label { 
          display: block; font-size: 0.6rem; font-weight: 900; color: #a855f7;
          margin-bottom: 10px; letter-spacing: 2px; opacity: 0.8;
        }
        .vellar-field {
          width: 100%; background: transparent; border: none;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding: 8px 0; color: #fff; font-size: 1.05rem; font-weight: 500;
          transition: all 0.4s;
        }
        .vellar-field:focus {
          outline: none; border-bottom-color: #a855f7;
          background: linear-gradient(transparent 80%, rgba(168,85,247,0.03));
        }

        /* Estilo YouTube Description Box - Reforçado */
        .yt-desc-box {
          background: #161616; border: 1.5px solid rgba(255,255,255,0.06);
          border-radius: 16px; padding: 1rem; transition: all 0.3s;
        }
        .yt-desc-box:focus-within {
          background: #1a1a1a; border-color: #a855f7;
          box-shadow: 0 8px 25px rgba(0,0,0,0.4);
        }
        .yt-textarea {
          width: 100%; background: transparent; border: none; outline: none;
          color: #fff; font-size: 0.95rem; font-family: inherit; line-height: 1.4;
          min-height: 90px;
        }

        /* Tags de Status */
        .vibe-selector { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 5px; scrollbar-width: none; }
        .vibe-selector::-webkit-scrollbar { display: none; }
        .vibe-tag {
          padding: 8px 16px; border-radius: 20px; background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05); color: rgba(255,255,255,0.6);
          font-size: 0.75rem; font-weight: 700; white-space: nowrap; cursor: pointer;
          transition: all 0.2s;
        }
        .vibe-tag.active {
          background: rgba(168,85,247,0.15); border-color: #a855f7; color: #fff;
          box-shadow: 0 4px 12px rgba(168,85,247,0.2);
        }

        .toggle-card {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.5rem; background: rgba(255,255,255,0.03);
          border-radius: 24px; border: 1px solid rgba(255,255,255,0.05);
          cursor: pointer; transition: all 0.3s;
        }
        .toggle-card:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
        .toggle-text { display: flex; align-items: center; gap: 16px; }
        .toggle-label-main { display: block; color: #fff; font-weight: 800; font-size: 1rem; }
        .toggle-label-sub { display: block; color: rgba(255,255,255,0.4); font-size: 0.75rem; margin-top: 2px; }

        .vellar-switch {
          width: 52px; height: 28px; background: rgba(255,255,255,0.1);
          border-radius: 20px; position: relative; transition: all 0.4s;
        }
        .vellar-switch.active { background: #ef4444; box-shadow: 0 0 15px rgba(239, 68, 68, 0.4); }
        .switch-knob {
          position: absolute; top: 4px; left: 4px; width: 20px; height: 20px;
          background: #fff; border-radius: 50%; transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }
        .vellar-switch.active .switch-knob { left: 28px; }

        .vellar-launch-btn {
          width: 100%; height: 64px; border-radius: 20px; border: none;
          background: linear-gradient(135deg, #a855f7 0%, #6C2BFF 100%); color: #fff; font-family: 'Outfit';
          font-weight: 900; font-size: 1.25rem; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 12px;
          box-shadow: 0 15px 35px rgba(168,85,247,0.35);
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .vellar-launch-btn:disabled { 
          background: #222; color: #555; box-shadow: none; cursor: not-allowed;
        }
        .vellar-launch-btn:not(:disabled):hover {
          transform: translateY(-5px); filter: brightness(1.1);
        }
        .vellar-launch-btn:active { transform: translateY(0); }

        @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>

      <div className="vellar-modal-content">
        <header className="vellar-modal-header">
          <div className="header-main">
            <div className="icon-box">
              <Video size={24} color="#fff" />
            </div>
            <div className="modal-title-text">
              <h3>Nova Live</h3>
              <p>Ambiente de Elite</p>
            </div>
          </div>
          <button onClick={onClose} className="close-circle"><X size={24} /></button>
        </header>

        <div className="vellar-form">
          <div className="vellar-input-wrap">
            <label>TÍTULO DA LIVE</label>
            <input 
              type="text" 
              maxLength={40}
              placeholder="Sobre o que vamos falar?"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="vellar-field"
              autoFocus
            />
          </div>

          <div className="vellar-input-wrap">
            <label>FOTO DE CAPA (OPCIONAL)</label>
            <div 
              onClick={() => document.getElementById('cover-input')?.click()}
              style={{
                width: '100%',
                height: '140px',
                borderRadius: '20px',
                background: coverPreview ? `url(${coverPreview}) center/cover no-repeat` : 'rgba(255,255,255,0.03)',
                border: '1.5px dashed rgba(168,85,247,0.3)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                overflow: 'hidden',
                position: 'relative',
                transition: 'all 0.3s'
              }}
            >
              {!coverPreview ? (
                <>
                  <ImageIcon size={32} color="#a855f7" style={{ opacity: 0.5, marginBottom: '8px' }} />
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>ESCOLHER FOTO DA CAPA</span>
                </>
              ) : (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <div style={{ background: '#a855f7', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                      <Plus size={24} color="#fff" />
                   </div>
                </div>
              )}
              <input 
                id="cover-input"
                type="file" 
                accept="image/*" 
                hidden 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setCoverFile(file);
                    setCoverPreview(URL.createObjectURL(file));
                  }
                }}
              />
            </div>
            <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '8px', textAlign: 'center' }}>
              Dica: Use fotos verticais para ficar brabo no Explorer! 🔥
            </p>
          </div>

          <div className="vellar-input-wrap">
            <label>METAS DA TRANSMISSÃO</label>
            
            {/* PAINEL DE PRESENTES */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '1.2rem', marginBottom: '1rem', border: enableGiftGoal ? '1px solid #fbbf24' : '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: '#fbbf24', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Coins size={18} color="#000" />
                  </div>
                  <span style={{ color: '#fff', fontWeight: 800 }}>Meta de Presentes</span>
                </div>
                <div 
                  onClick={() => setEnableGiftGoal(!enableGiftGoal)}
                  className={`vellar-switch ${enableGiftGoal ? 'active' : ''}`}
                  style={{ width: '44px', height: '24px', background: enableGiftGoal ? '#fbbf24' : 'rgba(255,255,255,0.1)' }}
                >
                  <div className="switch-knob" style={{ width: '16px', height: '16px', top: '4px', left: enableGiftGoal ? '24px' : '4px' }} />
                </div>
              </div>

              {enableGiftGoal && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', animation: 'fadeIn 0.3s' }}>
                  <div 
                    onClick={() => setIsGiftPickerOpen(true)}
                    className="vellar-field"
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', cursor: 'pointer', border: '1px dashed rgba(251,191,36,0.3)' }}
                  >
                     {giftGoalId ? (
                       <>
                         <div style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {GIFT_CATALOG.find(g => g.id === giftGoalId)?.image ? (
                               <img src={GIFT_CATALOG.find(g => g.id === giftGoalId)?.image} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                               <span style={{ fontSize: '1.2rem' }}>{GIFT_CATALOG.find(g => g.id === giftGoalId)?.symbol}</span>
                            )}
                         </div>
                         <span style={{ fontWeight: 800, fontSize: '0.8rem', color: '#fff' }}>{GIFT_CATALOG.find(g => g.id === giftGoalId)?.name}</span>
                       </>
                     ) : (
                       <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>✨ Todos os presentes (Morais)...</span>
                     )}
                  </div>
                  <input type="text" placeholder="Título (ex: Para a Mansão!)" value={giftGoalTitle} onChange={e => setGiftGoalTitle(e.target.value)} className="vellar-field" style={{ fontSize: '0.9rem' }} />
                  <input type="number" placeholder={giftGoalId ? "Quantidade de itens" : "Total de Morais"} value={giftGoalTarget} onChange={e => setGiftGoalTarget(e.target.value === '' ? '' : Number(e.target.value))} className="vellar-field" style={{ fontSize: '0.9rem' }} />
                </div>
              )}
            </div>

            {/* PAINEL DE SEGUIDORES */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '1.2rem', border: enableFollowerGoal ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ background: '#a855f7', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={18} color="#fff" />
                  </div>
                  <span style={{ color: '#fff', fontWeight: 800 }}>Meta de Seguidores</span>
                </div>
                <div 
                  onClick={() => setEnableFollowerGoal(!enableFollowerGoal)}
                  className={`vellar-switch ${enableFollowerGoal ? 'active' : ''}`}
                  style={{ width: '44px', height: '24px', background: enableFollowerGoal ? '#a855f7' : 'rgba(255,255,255,0.1)' }}
                >
                  <div className="switch-knob" style={{ width: '16px', height: '16px', top: '4px', left: enableFollowerGoal ? '24px' : '4px' }} />
                </div>
              </div>

              {enableFollowerGoal && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', animation: 'fadeIn 0.3s' }}>
                  <input type="text" placeholder="Título (ex: Rumo ao Topo!)" value={followerGoalTitle} onChange={e => setFollowerGoalTitle(e.target.value)} className="vellar-field" style={{ fontSize: '0.9rem' }} />
                  <input type="number" placeholder="Objetivo de Novos Seguidores" value={followerGoalTarget} onChange={e => setFollowerGoalTarget(e.target.value === '' ? '' : Number(e.target.value))} className="vellar-field" style={{ fontSize: '0.9rem' }} />
                </div>
              )}
            </div>
          </div>

          {/* GIFT PICKER OVERLAY */}
          {isGiftPickerOpen && (
            <div 
              style={{ position: 'fixed', inset: 0, zIndex: 1000005, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.3s' }}
              onClick={() => setIsGiftPickerOpen(false)}
            >
               <div 
                 style={{ marginTop: 'auto', background: '#0a0a0a', borderTop: '1px solid rgba(255,255,255,0.1)', borderRadius: '40px 40px 0 0', padding: '1.5rem', maxHeight: '80vh', overflowY: 'auto' }}
                 onClick={e => e.stopPropagation()}
               >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, color: '#fbbf24' }}>Escolher Presente 🎁</h3>
                    <button onClick={() => setIsGiftPickerOpen(false)} style={{ background: '#222', border: 'none', color: '#fff', borderRadius: '50%', width: '32px', height: '32px' }}>✕</button>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {GIFT_CATALOG.map(gift => (
                      <div 
                        key={gift.id}
                        onClick={() => { setGiftGoalId(gift.id); setIsGiftPickerOpen(false); }}
                        style={{ 
                          background: giftGoalId === gift.id ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)', 
                          border: giftGoalId === gift.id ? '1px solid #d4af37' : '1px solid rgba(255,255,255,0.05)',
                          borderRadius: '16px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer'
                        }}
                      >
                        <div style={{ width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                           {gift.image ? (
                              <img src={gift.image} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                           ) : (
                              <span style={{ fontSize: '2rem' }}>{gift.symbol}</span>
                           )}
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fff', textAlign: 'center' }}>{gift.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#fbbf24', fontSize: '0.65rem', fontWeight: 800 }}>
                           <Coins size={10} /> {gift.price}
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          )}

          <div className="vellar-input-wrap">
            <label>CATEGORIA DA LIVE</label>
            <div className="vibe-selector">
              {['RESENHA', 'TALENTO', 'CONFRONTO', 'CONVERSA'].map(vibe => (
                <div 
                  key={vibe} 
                  className={`vibe-tag ${selectedVibe === vibe ? 'active' : ''}`}
                  onClick={() => setSelectedVibe(vibe)}
                >
                  {vibe}
                </div>
              ))}
            </div>
          </div>

          <div className="vellar-input-wrap">
            <label>DESCRIÇÃO</label>
            <div className="yt-desc-box">
              <textarea 
                placeholder="Conte para o seu público o que vai rolar..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="yt-textarea"
                style={{ minHeight: '80px', resize: 'none' }}
              />
            </div>
          </div>

          <div className="toggle-card" onClick={() => setIs18Plus(!is18Plus)}>
            <div className="toggle-text">
              <div style={{ color: is18Plus ? '#ef4444' : 'rgba(255,255,255,0.4)', transition: 'all 0.3s' }}>
                <ShieldAlert size={28} />
              </div>
              <div>
                <span className="toggle-label-main">Conteúdo de Elite +18</span>
                <span className="toggle-label-sub">Restrito a maiores de idade</span>
              </div>
            </div>
            <div className={`vellar-switch ${is18Plus ? 'active' : ''}`}>
              <div className="switch-knob" />
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <button 
              className="vellar-launch-btn"
              onClick={handleStart}
              disabled={loading || !title.trim()}
            >
              {loading ? (
                <Loader2 size={32} className="animate-spin" />
              ) : (
                <>
                  <Video size={24} fill="currentColor" />
                  <span>ABRIR PRÉVIA DA LIVE</span>
                </>
              )}
            </button>
            <p style={{ 
              textAlign: 'center', fontSize: '0.6rem', color: 'rgba(255,255,255,0.2)', 
              marginTop: '1.5rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px' 
            }}>
              Respeite as diretrizes da comunidade Vellar
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
