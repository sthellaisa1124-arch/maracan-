import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { X, ChevronLeft, ChevronRight, Volume2, VolumeX, Loader2, Trash2, Heart, Eye, ChevronUp, User, Tag } from 'lucide-react';
import { UserBadges } from './Badges';

interface Status {
  id: string;
  user_id: string;
  content?: string;
  media_url?: string;
  media_type: 'text' | 'image' | 'video';
  created_at: string;
}

interface StatusTag {
  id: string;
  tagged_user_id: string;
  position_x: number;
  position_y: number;
  profile: {
    username: string;
    avatar_url: string;
  };
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

export function StatusViewer({ group, onClose, viewerId, onRefresh, onViewProfile, initialStatusId }: { 
  group: StatusGroup, 
  onClose: () => void, 
  viewerId: string | undefined,
  onRefresh: () => void,
  onViewProfile?: (username: string) => void,
  initialStatusId?: string | null
}) {
  const initIndex = initialStatusId ? Math.max(0, group.status_list.findIndex(s => s.id === initialStatusId)) : 0;
  const [currentIndex, setCurrentIndex] = useState(initIndex);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [tags, setTags] = useState<StatusTag[]>([]);
  const [showTags, setShowTags] = useState(true);

  // Guarda de segurança: se não há stories, fechar imediatamente
  const safeStatusList = group.status_list || [];
  const currentStatus = safeStatusList[currentIndex] || null;

  const videoRef = useRef<HTMLVideoElement>(null);
  const progressTimer = useRef<any>(null);

  // Estados de Interação
  const [likesCount, setLikesCount] = useState(0);
  const [viewsCount, setViewsCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewers, setViewers] = useState<any[]>([]);
  const [loadingViewers, setLoadingViewers] = useState(false);

  // Se não há stories, fechar automaticamente (fora do ciclo de render com timeout)
  useEffect(() => {
    if (safeStatusList.length === 0) {
      const t = setTimeout(() => onClose(), 0);
      return () => clearTimeout(t);
    }
  }, [safeStatusList.length]);

  useEffect(() => {
    if (!currentStatus) return;
    setProgress(0);
    setTags([]);
    setShowTags(true);
    markAsViewed(currentStatus.id);
    fetchStatusStats(currentStatus.id);
    fetchTags(currentStatus.id);
    setShowViewers(false);
    if (!isPaused) startProgress();
    return () => clearInterval(progressTimer.current);
  }, [currentIndex, isPaused, currentStatus?.id]);

  async function fetchTags(statusId: string) {
    try {
      const { data, error } = await supabase
        .from('status_tags')
        .select('id, tagged_user_id, position_x, position_y, profile:profiles!tagged_user_id(username, avatar_url)')
        .eq('status_id', statusId);
      
      if (!error && data) {
        const mapped = data.map((t: any) => ({
          id: t.id,
          tagged_user_id: t.tagged_user_id,
          position_x: t.position_x,
          position_y: t.position_y,
          profile: {
            username: t.profile?.username || 'usuário',
            avatar_url: t.profile?.avatar_url || ''
          }
        }));
        setTags(mapped);
      }
    } catch (e) {
      // Silently fail - tags não são críticas
    }
  }

  async function fetchStatusStats(statusId: string) {
    const { count: lCount } = await supabase
      .from('status_likes')
      .select('id', { count: 'exact' })
      .eq('status_id', statusId);
    
    setLikesCount(lCount || 0);

    if (viewerId) {
      const { data: myLike } = await supabase
        .from('status_likes')
        .select('id')
        .eq('status_id', statusId)
        .eq('user_id', viewerId)
        .single();
      setIsLiked(!!myLike);
    }

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

        if (currentStatus.user_id !== viewerId) {
            await supabase.from('notifications').insert({
                user_id: currentStatus.user_id,
                from_user_id: viewerId,
                type: 'status_like',
                post_id: currentStatus.id
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

  useEffect(() => {
    if (progress >= 100) {
      handleNext();
    }
  }, [progress]);

  function startProgress() {
    clearInterval(progressTimer.current);
    if (isPaused || !currentStatus) return;

    const duration = currentStatus.media_type === 'video' ? 0 : 5000;
    if (duration > 0) {
      const step = 30;
      const increment = (step / duration) * 100;
      progressTimer.current = setInterval(() => {
        setProgress(prev => Math.min(prev + increment, 100));
      }, step);
    }
  }

  function handleVideoProgress() {
    if (videoRef.current && !isPaused) {
      const duration = videoRef.current.duration;
      if (!isNaN(duration) && duration > 0) {
        const pct = (videoRef.current.currentTime / duration) * 100;
        setProgress(pct);
      }
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
    clearInterval(progressTimer.current);
    if (currentIndex < safeStatusList.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setTimeout(() => onClose(), 0);
    }
  }

  function handlePrev() {
    clearInterval(progressTimer.current);
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }

  const isOwner = viewerId === (currentStatus?.user_id);

  if (safeStatusList.length === 0) return null;

  return createPortal(
    <div 
      className="status-viewer-overlay" 
      style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div 
        className="status-viewer-container" 
        onClick={e => e.stopPropagation()}
        style={{ position: 'relative', width: '100%', maxWidth: '430px', height: '100dvh', maxHeight: '100dvh', background: '#000', overflow: 'hidden' }}
      >
        {/* Barras de Progresso */}
        <div className="status-progress-container" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, display: 'flex', gap: '4px', padding: 'calc(env(safe-area-inset-top, 8px) + 8px) 12px 8px' }}>
          {safeStatusList.map((_, idx) => (
            <div key={idx} className="progress-bg" style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.3)', borderRadius: '2px', overflow: 'hidden' }}>
              <div 
                className="progress-fill" 
                style={{ 
                  height: '100%',
                  background: '#fff',
                  borderRadius: '2px',
                  transition: 'width 0.05s linear',
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' 
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <header className="status-viewer-header" style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'calc(env(safe-area-inset-top, 8px) + 36px) 16px 12px' }}>
          <div className="status-author" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img 
              src={group.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + group.user_id} 
              alt="Avatar"
              style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.8)', objectFit: 'cover' }}
            />
            <div className="status-meta">
               <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 <span className="username" style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>@{group.username}</span>
                 <UserBadges badges={group.badges} donatedAmount={group.total_donated} size={14} />
               </div>
               {currentStatus && (
                 <span className="time" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>{new Date(currentStatus.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
               )}
            </div>
          </div>
          <div className="status-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isOwner && currentStatus && (
              <button 
                className="icon-btn-status" 
                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                disabled={deleting}
                style={{ color: '#ef4444', background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                {deleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
              </button>
            )}
            {/* Botão de toggle tags */}
            {tags.length > 0 && (
              <button 
                onClick={(e) => { e.stopPropagation(); setShowTags(p => !p); }}
                style={{ background: showTags ? 'rgba(168,85,247,0.6)' : 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
                title="Mostrar/ocultar marcações"
              >
                <Tag size={16} />
              </button>
            )}
            {currentStatus && currentStatus.media_type === 'video' && (
              <button 
                className="icon-btn-status" 
                onClick={(e) => { e.stopPropagation(); setMuted(!muted); }}
                style={{ background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
              >
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            )}
            <button 
              className="icon-btn-status" 
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              style={{ background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', marginLeft: '4px' }}
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Conteúdo Centralizado */}
        <div 
          className="status-content"
          style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
        >
          {currentStatus?.media_type === 'text' && (
            <div className="status-text-content" style={{ background: 'linear-gradient(135deg, var(--primary, #a855f7), #854d0e)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
              <h1 style={{ color: '#fff', textAlign: 'center', fontSize: '2rem', fontWeight: 900, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>{currentStatus.content}</h1>
            </div>
          )}
          {currentStatus?.media_type === 'image' && currentStatus.media_url && (
            <img src={currentStatus.media_url} alt="Status" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
          {currentStatus?.media_type === 'video' && currentStatus.media_url && (
            <video 
              ref={videoRef}
              src={currentStatus.media_url} 
              autoPlay 
              playsInline
              muted={muted}
              onEnded={() => setProgress(100)}
              onError={() => setProgress(100)}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}

          {!currentStatus && (
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <Loader2 className="animate-spin" size={32} color="rgba(255,255,255,0.4)" />
                <p style={{ fontSize: '0.9rem', opacity: 0.5, color: '#fff' }}>Carregando...</p>
             </div>
          )}
        </div>

        {/* MARCAÇÕES DE USUÁRIO sobre a mídia */}
        {showTags && tags.length > 0 && currentStatus && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 15, pointerEvents: 'none' }}>
            {tags.map(tag => (
              <button
                key={tag.id}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onViewProfile) onViewProfile(tag.profile.username);
                }}
                style={{
                  pointerEvents: 'all',
                  position: 'absolute',
                  left: `${tag.position_x * 100}%`,
                  top: `${tag.position_y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(8px)',
                  border: '1.5px solid rgba(168,85,247,0.8)',
                  borderRadius: '20px',
                  padding: '5px 10px 5px 6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#fff',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                  animation: 'tagPulse 2s ease-in-out infinite',
                  whiteSpace: 'nowrap'
                }}
              >
                <img 
                  src={tag.profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${tag.tagged_user_id}`}
                  alt={tag.profile.username}
                  style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }}
                />
                @{tag.profile.username}
              </button>
            ))}
          </div>
        )}

        {/* Cliques de Navegação Invisíveis */}
        <div 
          style={{ position: 'absolute', left: 0, top: '10%', bottom: '20%', width: '35%', zIndex: 10, cursor: 'pointer' }}
          onClick={(e) => { e.stopPropagation(); handlePrev(); }} 
        />
        <div 
          style={{ position: 'absolute', right: 0, top: '10%', bottom: '20%', width: '35%', zIndex: 10, cursor: 'pointer' }}
          onClick={(e) => { e.stopPropagation(); handleNext(); }} 
        />

        {/* Rodapé de Interação */}
        <footer style={{ 
          position: 'absolute', bottom: 0, left: 0, right: 0, 
          padding: '2rem 1.5rem calc(env(safe-area-inset-bottom, 16px) + 1.5rem)', 
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 20 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <button 
              onClick={(e) => { e.stopPropagation(); toggleLike(); }}
              style={{ 
                background: 'none', border: 'none', cursor: 'pointer',
                color: isLiked ? '#f43f5e' : '#fff', 
                display: 'flex', alignItems: 'center', gap: '6px',
                transform: isLiked ? 'scale(1.2)' : 'scale(1)', 
                transition: 'all 0.2s',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))'
              }}
            >
              <Heart size={28} fill={isLiked ? "currentColor" : "none"} />
              <span style={{ fontSize: '0.9rem', fontWeight: 900 }}>{likesCount}</span>
            </button>
          </div>

          {/* Contador de Visualizações (SÓ PARA O DONO) */}
          {isOwner && (
            <div 
                onClick={(e) => { 
                    e.stopPropagation(); 
                    setShowViewers(true); 
                    fetchViewers();
                    handlePressStart();
                }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem', color: '#fff', cursor: 'pointer' }}
            >
                <ChevronUp size={20} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)', padding: '0.4rem 0.8rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.15)' }}>
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
                                    <img src={v.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + v.id} style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} alt={v.username} />
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

        {/* Botões de Navegação Visíveis */}
        {currentIndex > 0 && (
          <button 
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 25, background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
            onClick={(e) => { e.stopPropagation(); handlePrev(); }}
          >
            <ChevronLeft size={22} />
          </button>
        )}
        {currentIndex < safeStatusList.length - 1 && (
          <button 
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 25, background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
            onClick={(e) => { e.stopPropagation(); handleNext(); }}
          >
            <ChevronRight size={22} />
          </button>
        )}

        {/* Modal de Confirmação */}
        {showDeleteConfirm && (
          <div 
            style={{ position: 'absolute', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
            onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
          >
            <div 
              style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '2rem', maxWidth: '280px', width: '100%', textAlign: 'center' }}
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 1.5rem 0', fontWeight: 900 }}>APAGAR STORY? 🗑️</h3>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button style={{ flex: 1, padding: '0.8rem', borderRadius: '14px', background: 'rgba(255,255,255,0.07)', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer' }} onClick={() => setShowDeleteConfirm(false)}>NÃO</button>
                <button style={{ flex: 1, padding: '0.8rem', borderRadius: '14px', background: 'var(--primary)', border: 'none', color: '#000', fontWeight: 800, cursor: 'pointer' }} onClick={handleDeleteStatus}>SIM</button>
              </div>
            </div>
          </div>
        )}

        {/* CSS das animações de tag */}
        <style>{`
          @keyframes tagPulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(168,85,247,0.4); }
            50% { box-shadow: 0 0 0 6px rgba(168,85,247,0); }
          }
        `}</style>
      </div>
    </div>,
    document.body
  );
}
