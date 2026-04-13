import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX, Loader2, Trash2, Heart, Eye, ChevronUp, User } from 'lucide-react';
import { UserBadges } from './Badges';

interface Status {
  id: string;
  user_id: string;
  content?: string;
  media_url?: string;
  media_type: 'text' | 'image' | 'video';
  created_at: string;
}

interface StatusGroup {
  user_id: string;
  username: string;
  avatar_url: string;
  badges?: string[];
  total_donated?: number;
  status_list: Status[];
  all_viewed: boolean;
}

export function StatusViewer({ group, onClose, viewerId, onRefresh }: { 
  group: StatusGroup, 
  onClose: () => void, 
  viewerId: string | undefined,
  onRefresh: () => void
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const currentStatus = group.status_list[currentIndex] || null;
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressTimer = useRef<any>(null);

  // Estados de Interação
  const [likesCount, setLikesCount] = useState(0);
  const [viewsCount, setViewsCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  useEffect(() => {
    if (!currentStatus) return;
    setProgress(0);
    markAsViewed(currentStatus.id);
    fetchStatusStats(currentStatus.id);
    setShowViewers(false); // Resetar gaveta ao mudar story
    if (!isPaused) startProgress();
    return () => clearInterval(progressTimer.current);
  }, [currentIndex, isPaused, currentStatus]);

  async function fetchStatusStats(statusId: string) {
    // 1. Contar Likes
    const { count: lCount } = await supabase
      .from('status_likes')
      .select('id', { count: 'exact' })
      .eq('status_id', statusId);
    
    setLikesCount(lCount || 0);

    // 2. Verificar se eu curti
    if (viewerId) {
      const { data: myLike } = await supabase
        .from('status_likes')
        .select('id')
        .eq('status_id', statusId)
        .eq('user_id', viewerId)
        .single();
      setIsLiked(!!myLike);
    }

    // 3. Contar Visualizações Únicas
    const { count: vCount } = await supabase
      .from('status_views')
      .select('id', { count: 'exact' })
      .eq('status_id', statusId);
    
    setViewsCount(vCount || 0);
  }

  async function fetchViewers() {
    if (!currentStatus || !viewerId || viewerId !== currentStatus.user_id) return;
    setLoadingViewers(true);
    const { data } = await supabase
      .from('status_views')
      .select('viewer_id, profiles!viewer_id(username, avatar_url, badges, total_donated)')
      .eq('status_id', currentStatus.id);
    
    // Mapear para facilitar uso
    const mappedViewers = (data || []).map((v: any) => ({
        id: v.viewer_id,
        username: v.profiles?.username,
        avatar_url: v.profiles?.avatar_url,
        badges: v.profiles?.badges,
        total_donated: v.profiles?.total_donated
    }));

    setViewers(mappedViewers);
    setLoadingViewers(false);
  }

  async function toggleLike() {
    if (!viewerId || !currentStatus) return;

    if (isLiked) {
      const { error } = await supabase
        .from('status_likes')
        .delete()
        .eq('status_id', currentStatus.id)
        .eq('user_id', viewerId);
      
      if (!error) {
        setIsLiked(false);
        setLikesCount(prev => prev - 1);
      }
    } else {
      const { error } = await supabase
        .from('status_likes')
        .insert([{ status_id: currentStatus.id, user_id: viewerId }]);
      
      if (!error) {
        setIsLiked(true);
        setLikesCount(prev => prev + 1);

        // Notificar o dono do story
        if (currentStatus.user_id !== viewerId) {
            await supabase.from('notifications').insert({
                user_id: currentStatus.user_id,
                from_user_id: viewerId,
                type: 'status_like',
                post_id: currentStatus.id // Reaproveitamos post_id para o story
            });
        }
      }
    }
  }

  async function markAsViewed(statusId: string) {
    if (!viewerId) return;
    try {
      await supabase
        .from('status_views')
        .upsert({ status_id: statusId, viewer_id: viewerId }, { onConflict: 'status_id,viewer_id' });
    } catch (e) {
      console.warn("⚠️ StatusView RLS:", e);
    }
  }

  async function handleDeleteStatus() {
    if (!currentStatus || !viewerId) return;
    setDeleting(true);
    try {
      const { error: dbError } = await supabase
        .from('status_posts')
        .delete()
        .match({ id: currentStatus.id, user_id: viewerId });

      if (dbError) throw dbError;

      if (currentStatus.media_url) {
        try {
          const urlParts = currentStatus.media_url.split('/status-media/');
          if (urlParts.length > 1) {
            const fileName = urlParts[1].split('?')[0];
            await supabase.storage.from('status-media').remove([fileName]);
          }
        } catch (storageErr) {
          console.warn("⚠️ Falha ao remover arquivo do storage:", storageErr);
        }
      }

      onRefresh();
      setShowDeleteConfirm(false);
      onClose();
      
    } catch (err: any) {
      console.error("❌ Erro ao apagar story:", err);
      alert("Erro ao apagar story.");
    } finally {
      setDeleting(false);
    }
  }

  function startProgress() {
    clearInterval(progressTimer.current);
    if (isPaused || !currentStatus) return;

    const duration = currentStatus.media_type === 'video' ? 0 : 5000;
    if (duration > 0) {
      const step = 30;
      const increment = (step / duration) * 100;
      progressTimer.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            handleNext();
            return 100;
          }
          return prev + increment;
        });
      }, step);
    }
  }

  function handleVideoProgress() {
    if (videoRef.current && !isPaused) {
      const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(pct);
    }
  }

  function handlePressStart() {
    setIsPaused(true);
    if (videoRef.current) videoRef.current.pause();
  }

  function handlePressEnd() {
    setIsPaused(false);
    if (videoRef.current) videoRef.current.play();
  }

  function handleNext() {
    if (currentIndex < group.status_list.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }

  const isOwner = viewerId === (currentStatus?.user_id);

  return createPortal(
    <div className="status-viewer-overlay" onClick={onClose}>
      <div className="status-viewer-container" onClick={e => e.stopPropagation()}>
        {/* Barras de Progresso */}
        <div className="status-progress-container">
          {group.status_list.map((_, idx) => (
            <div key={idx} className="progress-bg">
              <div 
                className="progress-fill" 
                style={{ 
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' 
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <header className="status-viewer-header">
          <div className="status-author">
            <img src={group.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + group.user_id} alt="Avatar" />
            <div className="status-meta">
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <span className="username">@{group.username}</span>
                 <UserBadges badges={group.badges} donatedAmount={group.total_donated} size={14} />
               </div>
               {currentStatus && (
                 <span className="time">{new Date(currentStatus.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
               )}
            </div>
          </div>
          <div className="status-header-actions">
            {isOwner && currentStatus && (
              <button 
                className="icon-btn-status" 
                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                disabled={deleting}
                style={{ color: '#ef4444' }}
              >
                {deleting ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={24} />}
              </button>
            )}
            {currentStatus && currentStatus.media_type === 'video' && (
              <button className="icon-btn-status" onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}>
                {muted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>
            )}
            <button className="icon-btn-status" onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ marginLeft: '1rem' }}>
              <X size={32} />
            </button>
          </div>
        </header>

        {/* Conteúdo Centralizado */}
        <div 
          className="status-content"
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
        >
          {currentStatus?.media_type === 'text' && (
            <div className="status-text-content" style={{ background: 'linear-gradient(135deg, var(--primary), #854d0e)' }}>
              <h1>{currentStatus.content}</h1>
            </div>
          )}
          {currentStatus?.media_type === 'image' && currentStatus.media_url && (
            <img src={currentStatus.media_url} alt="Status" className="status-media-full" />
          )}
          {currentStatus?.media_type === 'video' && currentStatus.media_url && (
            <video 
              ref={videoRef}
              src={currentStatus.media_url} 
              autoPlay 
              playsInline
              muted={muted}
              onTimeUpdate={handleVideoProgress}
              onEnded={handleNext}
              className="status-media-full"
            />
          )}

          {(currentStatus && !currentStatus.media_url && currentStatus.media_type !== 'text') && (
             <div className="status-error-placeholder">
                <Loader2 className="animate-spin" size={32} color="rgba(255,255,255,0.2)" />
                <p style={{ fontSize: '0.9rem', opacity: 0.5 }}>Carregando...</p>
             </div>
          )}
        </div>

        {/* Cliques de Navegação Invisíveis */}
        <div className="status-nav-left" onClick={(e) => { e.stopPropagation(); handlePrev(); }} />
        <div className="status-nav-right" onClick={(e) => { e.stopPropagation(); handleNext(); }} />

        {/* Rodapé de Interação */}
        <footer className="status-viewer-footer" style={{ 
          position: 'absolute', bottom: 0, left: 0, right: 0, 
          padding: '2rem 1.5rem', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1000 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <button 
              className="icon-btn-status" 
              onClick={(e) => { e.stopPropagation(); toggleLike(); }}
              style={{ color: isLiked ? 'var(--primary)' : '#fff', transform: isLiked ? 'scale(1.2)' : 'scale(1)', transition: 'all 0.2s' }}
            >
              <Heart size={28} fill={isLiked ? "currentColor" : "none"} />
              <span style={{ marginLeft: '0.4rem', fontSize: '0.9rem', fontWeight: 900 }}>{likesCount}</span>
            </button>
          </div>

          {/* Contador de Visualizações (SÓ PARA O DONO) */}
          {isOwner && (
            <div 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    setShowViewers(true); 
                    fetchViewers();
                    handlePressStart(); // Pausar o story ao ver lista
                }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', color: '#fff', cursor: 'pointer', animation: 'bounce 2s infinite' }}
            >
                <ChevronUp size={20} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.5)', padding: '0.4rem 0.8rem', borderRadius: '1rem' }}>
                    <Eye size={18} /> <span style={{ fontWeight: 800 }}>{viewsCount}</span>
                </div>
            </div>
          )}
        </footer>

        {/* GAVETA DE VISUALIZADORES (Bottom Sheet) */}
        {showViewers && (
            <div 
                className="status-viewers-drawer animate-fade-up" 
                onClick={(e) => { e.stopPropagation(); setShowViewers(false); handlePressEnd(); }}
                style={{ 
                    position: 'absolute', inset: 0, zIndex: 5000, 
                    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                    background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)'
                }}
            >
                <div 
                    className="drawer-content" 
                    onClick={e => e.stopPropagation()}
                    style={{ 
                        background: '#121214', borderTopLeftRadius: '2rem', borderTopRightRadius: '2rem',
                        padding: '2rem', maxHeight: '70vh', overflowY: 'auto', borderTop: '2px solid var(--primary)'
                    }}
                >
                    <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', margin: '0 auto 1.5rem' }} />
                    <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.8rem', fontWeight: 900 }}>
                        <Eye color="var(--primary)" /> VISUALIZAÇÕES ({viewsCount})
                    </h3>

                    {loadingViewers ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}><Loader2 className="animate-spin" /></div>
                    ) : viewers.length === 0 ? (
                        <p style={{ textAlign: 'center', opacity: 0.5, padding: '2rem' }}>Ninguém viu ainda... Manda pros crias! 📣</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {viewers.map(v => (
                                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem', borderRadius: '1rem', background: 'rgba(255,255,255,0.03)' }}>
                                    <img src={v.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + v.id} style={{ width: '42px', height: '42px', borderRadius: '50%' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span style={{ fontWeight: 700 }}>@{v.username}</span>
                                      <UserBadges badges={v.badges} donatedAmount={v.total_donated} size={12} />
                                    </div>
                                    <div style={{ marginLeft: 'auto', color: 'var(--primary)' }}><User size={16} /></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Botões de Navegação */}
        {currentIndex > 0 && (
          <button className="btn-nav-status left" onClick={(e) => { e.stopPropagation(); handlePrev(); }}>
            <ChevronLeft size={30} />
          </button>
        )}
        <button className="btn-nav-status right" onClick={(e) => { e.stopPropagation(); handleNext(); }}>
          <ChevronRight size={30} />
        </button>

        {/* Modal de Confirmação */}
        {showDeleteConfirm && (
          <div className="modal-overlay-urban" style={{ zIndex: 10000 }} onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}>
            <div className="urbano-card" style={{ width: '100%', maxWidth: '280px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 1.5rem 0', fontWeight: 900 }}>APAGAR STORY? 🗑️</h3>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn-logout-urban" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: '#fff' }} onClick={() => setShowDeleteConfirm(false)}>NÃO</button>
                <button className="btn-logout-urban" style={{ flex: 1, background: 'var(--primary)', color: '#000' }} onClick={handleDeleteStatus}>SIM</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
