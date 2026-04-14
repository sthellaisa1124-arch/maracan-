import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { 
  Image as ImageIcon,
  Loader2, 
  MessageCircle, 
  Heart, 
  Share2, 
  MoreHorizontal,
  Compass,
  Users,
  X,
  Eye,
  Bell,
  Zap,
  ShoppingCart,
  Bot
} from 'lucide-react';
import { StatusRail } from '../components/StatusRail';
import { StatusViewer } from '../components/StatusViewer';
import { StatusCreator } from '../components/StatusCreator';
import { UserBadges } from '../components/Badges';

const POST_COST = 10000; // 10mil moral por post

export function Community({ profile, session, unreadCount = 0, onViewProfile, onTabChange, isCreateModalOpen, onCloseCreateModal, onJoinLive }: { profile: any, session: any, unreadCount?: number, onViewProfile: (username: string) => void, onTabChange: (tab: string) => void, isCreateModalOpen?: boolean, onCloseCreateModal?: () => void, onJoinLive?: (live: any) => void }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isSocialFeed, setIsSocialFeed] = useState(false);
  const [toast, setToast] = useState<{msg: string; typ: string} | null>(null);
  const [activeStatusGroup, setActiveStatusGroup] = useState<any>(null);
  const [isCreatingStatus, setIsCreatingStatus] = useState(false);
  const [statusRefreshKey, setStatusRefreshKey] = useState(0);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [moralBalance, setMoralBalance] = useState<number>(profile?.moral_balance ?? 0);
  const [noSaldoModal, setNoSaldoModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (window as any).openStatusCreator = () => setIsCreatingStatus(true);
  }, []);

  useEffect(() => {
    fetchPosts();
    if (session?.user?.id) fetchMoralBalance();
  }, [session?.user?.id]);

  // Sincroniza quando o modal de post externo abre
  useEffect(() => {
    if (isCreateModalOpen) {
      openModal();
      if (onCloseCreateModal) onCloseCreateModal();
    }
  }, [isCreateModalOpen]);

  // Lock/unlock scroll do body quando modal abre/fecha
  function openModal() {
    setIsPostModalOpen(true);
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    setIsPostModalOpen(false);
    document.body.style.overflow = '';
  }
  function openNoSaldo() {
    setNoSaldoModal(true);
    document.body.style.overflow = 'hidden';
  }
  function closeNoSaldo() {
    setNoSaldoModal(false);
    document.body.style.overflow = '';
  }

  async function fetchMoralBalance() {
    if (!session?.user?.id) return;
    const { data } = await supabase
      .from('profiles')
      .select('moral_balance')
      .eq('id', session.user.id)
      .single();
    if (data) setMoralBalance(data.moral_balance ?? 0);
  }

  async function fetchPosts() {
    setLoading(true);
    let finalPosts = [];
    
    if (!session?.user?.id) {
        const { data } = await supabase
          .from('user_posts')
          .select('*, author:profiles(username, first_name, avatar_url, badges, total_donated)')
          .order('created_at', { ascending: false })
          .limit(20);
        finalPosts = data || [];
        setIsSocialFeed(false);
    } else {
        const { data: followingData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', session.user.id);

        const followingIds = followingData?.map(f => f.following_id) || [];

        if (followingIds.length > 0) {
            const { data: socialPosts } = await supabase
              .from('user_posts')
              .select('*, author:profiles(username, first_name, avatar_url, badges, total_donated)')
              .in('user_id', followingIds)
              .order('created_at', { ascending: false })
              .limit(30);
            
            if (socialPosts && socialPosts.length > 0) {
                finalPosts = socialPosts;
                setIsSocialFeed(true);
            }
        }

        if (finalPosts.length === 0) {
            const { data: globalPosts } = await supabase
              .from('user_posts')
              .select('*, author:profiles(username, first_name, avatar_url, badges, total_donated)')
              .order('created_at', { ascending: false })
              .limit(20);
            finalPosts = globalPosts || [];
            setIsSocialFeed(false);
        }
    }

    const postsWithStats = await Promise.all((finalPosts || []).map(async (post: any) => {
      const { count: likesCount } = await supabase
        .from('user_post_likes')
        .select('id', { count: 'exact' })
        .eq('post_id', post.id);

      const { count: commsCount } = await supabase
        .from('user_post_comments')
        .select('id', { count: 'exact' })
        .eq('post_id', post.id);

      const { count: viewsCount } = await supabase
        .from('user_post_views')
        .select('id', { count: 'exact' })
        .eq('post_id', post.id);

      let isLiked = false;
      if (session?.user?.id) {
        const { data: myLike } = await supabase
          .from('user_post_likes')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', session.user.id)
          .maybeSingle();
        isLiked = !!myLike;

        if (post.user_id !== session.user.id) {
          await supabase.from('user_post_views').insert({ 
            post_id: post.id, 
            user_id: session.user.id 
          });
        }
      }

      const { data: commentsList } = await supabase
        .from('user_post_comments')
        .select('*, author:profiles(username, avatar_url, badges, total_donated)')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      return { 
        ...post, 
        likes_count: likesCount || 0, 
        comments_count: commsCount || 0,
        views_count: (viewsCount || 0) + (post.user_id !== session?.user?.id ? 1 : 0),
        is_liked: isLiked,
        comments_list: commentsList || []
      };
    }));

    setPosts(postsWithStats);
    setLoading(false);
  }

  const notify = (msg: string, typ = 'success') => {
    setToast({ msg, typ });
    setTimeout(() => setToast(null), 3500);
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      return notify("Pô cria, o vídeo tá muito pesado! Máximo 30MB pra não travar a pista. 🛡️", "error");
    }

    setUploading(true);
    const isVideo = file.type.startsWith('video/');
    const fileExt = file.name.split('.').pop();
    const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
    const filePath = `community/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, file);

    if (uploadError) {
      notify("Erro no upload: " + uploadError.message, "error");
    } else {
      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
      setMediaUrl(publicUrl);
      setMediaType(isVideo ? 'video' : 'image');
      notify("Mídia preparada! 📸🎥");
    }
    setUploading(false);
  };

  const handleCreatePost = async () => {
    if (!content.trim() && !mediaUrl) return notify("Diz alguma coisa pro mundo, cria! 🎤", "error");
    if (!session) return notify("Loga aí pra largar o aço! 🔐", "error");

    // VERIFICAR SALDO DE MORAL
    await fetchMoralBalance();
    const freshBalance = moralBalance;
    
    if (freshBalance < POST_COST) {
      closeModal();
      openNoSaldo();
      return;
    }

    setUploading(true);

    // 1. DEBITAR O MORAL
    const { error: debitError } = await supabase
      .from('profiles')
      .update({ moral_balance: freshBalance - POST_COST })
      .eq('id', session.user.id);

    if (debitError) {
      setUploading(false);
      return notify("Erro ao debitar moral: " + debitError.message, "error");
    }

    // 2. REGISTRAR TRANSAÇÃO
    await supabase.from('moral_transactions').insert({
      user_id: session.user.id,
      amount: -POST_COST,
      type: 'post_divulgacao',
      description: 'Divulgação na tela inicial - PAPO RETO NO VELLAR'
    }).then(() => {});

    // 3. CRIAR O POST
    const { error } = await supabase
      .from('user_posts')
      .insert([{
        user_id: session.user.id,
        content: content,
        image_url: mediaType === 'image' ? mediaUrl : null,
        video_url: mediaType === 'video' ? mediaUrl : null
      }]);

    if (error) {
      notify("Erro ao postar: " + error.message, "error");
    } else {
      setContent('');
      setMediaUrl(null);
      setMediaType(null);
      setMoralBalance(prev => prev - POST_COST);
      closeModal();
      notify("Papo reto largado na pista! 🔥🏙️ (-10.000 Moral)");
      fetchPosts();
    }
    setUploading(false);
  };

  async function handleLike(post: any) {
    if (!session) return notify("Loga aí pra mostrar que gostou! ❤️", "error");

    if (post.is_liked) {
      const { error } = await supabase
        .from('user_post_likes')
        .delete()
        .eq('user_id', session.user.id)
        .eq('post_id', post.id);

      if (!error) {
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_liked: false, likes_count: p.likes_count - 1 } : p));
      }
    } else {
      const { error } = await supabase
        .from('user_post_likes')
        .insert([{ user_id: session.user.id, post_id: post.id }]);

      if (!error) {
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_liked: true, likes_count: p.likes_count + 1 } : p));
        notify("Curtiu o papo reto! ❤️🔥");
        
        if (post.user_id !== session.user.id) {
          await supabase.from('notifications').insert({
            user_id: post.user_id,
            from_user_id: session.user.id,
            type: 'like',
            post_id: post.id
          });
        }
      }
    }
  }

  const [commentingOn, setCommentingOn] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  async function handleSendComment(postId: string, authorId: string) {
    if (!commentText.trim() || !session) return;
    
    const { data: newComment, error } = await supabase
      .from('user_post_comments')
      .insert([{
        user_id: session.user.id,
        post_id: postId,
        content: commentText.trim()
      }])
      .select('*, author:profiles(username, avatar_url, badges, total_donated)')
      .single();

    if (!error && newComment) {
      setPosts(prev => prev.map(p => p.id === postId ? { 
        ...p, 
        comments_count: (p.comments_count || 0) + 1,
        comments_list: [...(p.comments_list || []), newComment]
      } : p));
      setCommentText('');
      notify("Comentário largado na pista! 🎤");

      if (authorId !== session.user.id) {
        await supabase.from('notifications').insert({
          user_id: authorId,
          from_user_id: session.user.id,
          type: 'comment',
          post_id: postId
        });
      }
    }
  }

  return (
    <div className="community-page animate-fade-up">
      {toast && <div className={`toast-notification ${toast.typ}`}>{toast.msg}</div>}

      {/* ── MODAL SEM SALDO (via Portal — fora do scroll) ── */}
      {noSaldoModal && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999999,
          background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
        }} onClick={closeNoSaldo}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'linear-gradient(145deg, #0f0f0f, #1a1a1a)',
            border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: '28px', padding: '2rem', maxWidth: '360px', width: '100%',
            textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
          }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>💸</div>
            <h3 style={{ margin: '0 0 0.5rem', color: '#ef4444', fontWeight: 900, fontSize: '1.4rem' }}>
              Saldo Insuficiente!
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.95rem', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
              Você precisa de <strong style={{ color: '#facc15' }}>10.000 Moral</strong> para divulgar na pista.<br />
              Seu saldo atual: <strong style={{ color: '#ef4444' }}>{moralBalance.toLocaleString('pt-BR')} Moral</strong>
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => { closeNoSaldo(); onTabChange('profile'); }}
                style={{
                  background: 'linear-gradient(135deg, #6C2BFF, #9D6BFF)',
                  border: 'none', borderRadius: '16px', padding: '14px',
                  color: '#fff', fontWeight: 900, fontSize: '1rem',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: '0 8px 25px rgba(108,43,255,0.4)'
                }}
              >
                <ShoppingCart size={20} /> RECARREGAR MORAL
              </button>
              <button
                onClick={closeNoSaldo}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '16px', padding: '12px', color: 'rgba(255,255,255,0.6)',
                  fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem'
                }}
              >
                Agora não
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── MODAL DE DIVULGAÇÃO (via Portal — fora do scroll) ── */}
      {isPostModalOpen && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 999998,
            background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(15px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
          }}
          onClick={() => { if (!uploading) closeModal(); }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '540px',
              background: 'linear-gradient(180deg, #0f0f0f 0%, #0a0a0a 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '32px 32px 0 0', padding: '1.5rem 1.5rem 2.5rem',
              maxHeight: '92vh', overflowY: 'auto', scrollbarWidth: 'none',
              animation: 'slideUp 0.4s cubic-bezier(0.16,1,0.3,1)'
            }}
          >
            {/* Handle */}
            <div style={{ width: '36px', height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '2px', margin: '0 auto 1.5rem' }} />
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', color: '#fff', fontWeight: 900, fontSize: '1.3rem', fontFamily: 'Outfit' }}>
                  📣 Divulgação no Vellar
                </h3>
                <p style={{ margin: 0, fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Tela Inicial · Visível para todos
                </p>
              </div>
              <button
                onClick={closeModal}
                style={{ background: 'rgba(255,255,255,0.07)', border: 'none', color: '#fff', width: '34px', height: '34px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Badge de Promoção */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(250,204,21,0.12), rgba(251,146,60,0.12))',
              border: '1px solid rgba(250,204,21,0.3)',
              borderRadius: '20px', padding: '1rem 1.2rem',
              marginBottom: '1.5rem', position: 'relative', overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute', top: '8px', right: '10px',
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#fff', fontSize: '0.65rem', fontWeight: 900,
                padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.5px'
              }}>
                🔥 PROMOÇÃO
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '2rem' }}>🎉</span>
                <div>
                  <div style={{ color: '#facc15', fontWeight: 900, fontSize: '0.95rem' }}>
                    Desconto de Inauguração!
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', marginTop: '2px' }}>
                    <span style={{ textDecoration: 'line-through', color: 'rgba(255,255,255,0.3)' }}>20.000 Moral</span>
                    {' '}→{' '}
                    <span style={{ color: '#facc15', fontWeight: 900, fontSize: '1rem' }}>10.000 Moral</span>
                    <span style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e', fontSize: '0.7rem', fontWeight: 800, padding: '2px 7px', borderRadius: '8px', marginLeft: '6px' }}>
                      50% OFF
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: '0.8rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
                💼 Sua divulgação aparece para <strong style={{ color: 'rgba(255,255,255,0.7)' }}>todos os usuários</strong> na tela inicial do Vellar
              </div>
            </div>

            {/* Saldo */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: '16px', padding: '0.8rem 1.2rem', marginBottom: '1.4rem'
            }}>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>SEU SALDO</span>
              <span style={{ fontWeight: 900, fontSize: '1rem', color: moralBalance >= POST_COST ? '#22c55e' : '#ef4444' }}>
                🪙 {moralBalance.toLocaleString('pt-BR')} Moral
              </span>
            </div>

            {/* Campo Título */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 900, color: '#facc15', letterSpacing: '2px', marginBottom: '8px', opacity: 0.7 }}>
                TÍTULO / DESCRIÇÃO
              </label>
              <textarea
                placeholder="O que você quer divulgar? Manda o papo reto! 🎤"
                value={content}
                onChange={e => setContent(e.target.value)}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '18px',
                  padding: '1rem 1.2rem', color: '#fff', fontSize: '1rem',
                  fontFamily: 'Outfit, sans-serif', lineHeight: 1.5,
                  outline: 'none', resize: 'none', minHeight: '100px',
                  boxSizing: 'border-box', transition: 'border-color 0.3s'
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#facc15'}
                onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            {/* Preview */}
            {mediaUrl && (
              <div style={{ marginBottom: '1rem', borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(250,204,21,0.3)', position: 'relative' }}>
                {mediaType === 'image' ? (
                  <img src={mediaUrl} style={{ width: '100%', display: 'block', maxHeight: '300px', objectFit: 'cover' }} alt="Preview" />
                ) : (
                  <video src={mediaUrl} style={{ width: '100%', display: 'block', maxHeight: '300px' }} controls />
                )}
                <button
                  onClick={() => { setMediaUrl(null); setMediaType(null); }}
                  style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Galeria */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '1.2rem' }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.05)',
                  border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '16px',
                  padding: '14px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  fontWeight: 700, fontSize: '0.9rem'
                }}
              >
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <><ImageIcon size={20} /> Galeria</>}
              </button>
              <input type="file" hidden ref={fileInputRef} accept="image/*,video/*" onChange={handleMediaUpload} />
            </div>

            {/* Botão Publicar */}
            <button
              onClick={handleCreatePost}
              disabled={uploading || (!content.trim() && !mediaUrl)}
              style={{
                width: '100%', height: '60px', borderRadius: '20px', border: 'none',
                background: uploading || (!content.trim() && !mediaUrl)
                  ? 'rgba(255,255,255,0.08)'
                  : 'linear-gradient(135deg, #facc15 0%, #fb923c 100%)',
                color: uploading || (!content.trim() && !mediaUrl) ? 'rgba(255,255,255,0.3)' : '#000',
                fontFamily: 'Outfit', fontWeight: 900, fontSize: '1.1rem',
                cursor: uploading || (!content.trim() && !mediaUrl) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                boxShadow: uploading || (!content.trim() && !mediaUrl) ? 'none' : '0 12px 35px rgba(250,204,21,0.3)',
                transition: 'all 0.3s'
              }}
            >
              {uploading ? (
                <><Loader2 size={22} className="animate-spin" /> Publicando...</>
              ) : (
                <><Zap size={22} fill="currentColor" /> PUBLICAR · 10.000 Moral</>
              )}
            </button>
            <p style={{ textAlign: 'center', fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', marginTop: '1rem', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Ao publicar, os 10.000 moral serão debitados do seu saldo
            </p>
          </div>
        </div>,
        document.body
      )}

      {/* --- HEADER FIXO MODERNO --- */}
      <div className="header-feed-urban" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'default', gap: '8px' }}>
        <h3 className="vellar-neon-logo" style={{ margin: 0, flexShrink: 0 }}>
          <span className="logo-v">V</span>ELLΛ<span className="logo-r">R</span>
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
          <button
            onClick={() => onTabChange('chat')}
            style={{
              background: 'linear-gradient(135deg, #6C2BFF 0%, #a855f7 100%)',
              border: 'none', borderRadius: '50%', width: '38px', height: '38px',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0, boxShadow: '0 4px 15px rgba(108,43,255,0.4)',
              animation: 'criaPulse 3s ease-in-out infinite'
            }}
          >
            <Bot size={20} />
          </button>

          <button 
            onClick={() => onTabChange('notifications')}
            style={{ 
              background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative', padding: '0.4rem', flexShrink: 0,
              color: unreadCount > 0 ? 'var(--primary)' : 'rgba(255,255,255,0.7)'
            }}
          >
            <Bell size={24} strokeWidth={unreadCount > 0 ? 3 : 2} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: 0, right: 0, width: '10px', height: '10px',
                backgroundColor: '#ef4444', borderRadius: '50%',
                border: '2px solid #000', boxShadow: '0 0 5px rgba(239, 68, 68, 0.4)'
              }} />
            )}
          </button>
        </div>
      </div>

      {/* --- SISTEMA SOLTA NA PISTA (STORIES) --- */}
      <div style={{ marginBottom: '1rem', padding: '0 0.5rem' }}>
        <StatusRail 
          key={statusRefreshKey} 
          session={session} 
          profile={profile}
          onOpenStatus={(group) => {
            if (group.is_live && onJoinLive) {
              onJoinLive({ 
                id: group.live_id, 
                host_id: group.user_id, 
                agora_channel: group.agora_channel,
                goal_type: group.goal_type,
                goal_title: group.goal_title,
                goal_target: group.goal_target,
                goal_current: group.goal_current,
                goal_gift_id: group.goal_gift_id,
                profiles: { 
                  username: group.username, 
                  avatar_url: group.avatar_url,
                  badges: group.badges,
                  total_donated: group.total_donated
                } 
              });
            } else {
              setActiveStatusGroup(group);
            }
          }} 
        />
      </div>

      {/* --- BOTÃO "PAPO RETO NO VELLAR" + LABEL DE SEÇÃO --- */}
      <div style={{
        margin: '0 0.75rem 1rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        {/* Label feed */}
        <div style={{ opacity: 0.6, fontSize: '0.82rem', fontStyle: 'italic', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {isSocialFeed ? (
            <><Users size={16} /> OS CRIA TÃO LANÇANDO</>
          ) : (
            <><Compass size={16} /> EM ALTA NO VELLAR</>
          )}
        </div>

        {/* Botão PAPO RETO NO VELLAR */}
        <button
          className="papo-reto-btn"
          onClick={() => {
            fetchMoralBalance();
            setContent('');
            setMediaUrl(null);
            setMediaType(null);
            setIsPostModalOpen(true);
          }}
          style={{
            border: 'none',
            borderRadius: '24px', padding: '9px 18px',
            color: '#fff', fontWeight: 900, fontSize: '0.8rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            fontFamily: 'Outfit', letterSpacing: '0.5px',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 15px rgba(108,43,255,0.4)',
            textTransform: 'uppercase'
          }}
        >
          <Zap size={16} fill="currentColor" /> PAPO RETO NO VELLAR
        </button>
      </div>

      {/* --- FEED DE POSTS (COLUNA VERTICAL) --- */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem' }}><Loader2 className="animate-spin" /></div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>A pista tá quieta... solta o papo você! 🎤🔇</div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="feed-post-card" style={{ display: 'flex', flexDirection: 'column', width: '100%', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '1.5rem', marginBottom: '1.5rem' }}>
              {/* Header do Post */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', padding: '0 1.25rem' }}>
                <img 
                  src={post.author?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + post.user_id} 
                  style={{ width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer', objectFit: 'cover', flexShrink: 0 }}
                  onClick={() => onViewProfile(post.author?.username)}
                  alt="Avatar"
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span 
                      style={{ fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer' }}
                      onClick={() => onViewProfile(post.author?.username)}
                    >
                      @{post.author?.username}
                    </span>
                    <UserBadges badges={post.author?.badges} donatedAmount={post.author?.total_donated} size={14} />
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>• {new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
                  <MoreHorizontal size={18} />
                </button>
              </div>

              {/* Conteúdo */}
              <div style={{ marginBottom: '0.75rem', width: '100%' }}>
                {post.content && (
                  <p style={{ fontSize: '1.05rem', lineHeight: 1.6, marginBottom: post.image_url || post.video_url ? '0.75rem' : 0, padding: '0 1.25rem', margin: 0, color: 'rgba(255,255,255,0.95)' }}>
                    {post.content}
                  </p>
                )}
                {post.image_url && (
                  <div style={{ marginTop: post.content ? '0.75rem' : 0 }}>
                    <img src={post.image_url} alt="Post" style={{ width: '100%', maxHeight: '500px', objectFit: 'cover', display: 'block' }} />
                  </div>
                )}
                {post.video_url && (
                  <div style={{ marginTop: post.content ? '0.75rem' : 0 }}>
                    <video src={post.video_url} preload="none" controls style={{ width: '100%', maxHeight: '500px', display: 'block' }} />
                  </div>
                )}
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', gap: '1.5rem', paddingTop: '0.75rem', paddingLeft: '1.25rem', paddingRight: '1.25rem', flexWrap: 'wrap' }}>
                <button 
                  style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', color: post.is_liked ? 'var(--primary)' : 'rgba(255,255,255,0.7)', cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem' }}
                  onClick={() => handleLike(post)}
                >
                  <Heart size={18} fill={post.is_liked ? "currentColor" : "none"} /> <span>{post.likes_count || 0}</span>
                </button>
                <button 
                  style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem', color: commentingOn === post.id ? 'var(--primary)' : 'rgba(255,255,255,0.7)', cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem' }}
                  onClick={() => setCommentingOn(commentingOn === post.id ? null : post.id)}
                >
                  <MessageCircle size={18} /> <span>{post.comments_count || 0}</span>
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700 }}>
                   <Eye size={16} /> <span>{post.views_count || 0}</span>
                </div>
                <button style={{ background: 'transparent', border: 'none', marginLeft: 'auto', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                  <Share2 size={18} />
                </button>
              </div>

              {/* Comentários */}
              {commentingOn === post.id && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '1rem', animation: 'fadeUp 0.3s ease', padding: '1rem' }}>
                  <div style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '1rem' }}>
                    {post.comments_list && post.comments_list.length > 0 ? (
                      post.comments_list.map((c: any) => (
                        <div key={c.id} style={{ display: 'flex', gap: '0.7rem', marginBottom: '0.8rem' }}>
                           <img 
                             src={c.author?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + c.user_id} 
                             style={{ width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0 }}
                             alt="Avatar"
                           />
                           <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '0.5rem 0.9rem', borderRadius: '14px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                   <strong style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>@{c.author?.username}</strong>
                                   <UserBadges badges={c.author?.badges} donatedAmount={c.author?.total_donated} size={12} />
                                 </div>
                                 <span style={{ fontSize: '0.65rem', opacity: 0.4 }}>{new Date(c.created_at).toLocaleDateString()}</span>
                              </div>
                              <p style={{ fontSize: '0.88rem', margin: 0, color: '#fff', opacity: 0.9 }}>{c.content}</p>
                           </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ textAlign: 'center', opacity: 0.4, fontSize: '0.82rem', padding: '0.5rem' }}>Nenhum comentário ainda. Seja o primeiro! 🎤</p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.7rem' }}>
                     <input 
                      type="text" 
                      placeholder="Manda seu comentário..."
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendComment(post.id, post.user_id)}
                      style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--separator)', borderRadius: '14px', padding: '0.6rem 1rem', color: '#fff', fontSize: '0.88rem', outline: 'none' }}
                     />
                     <button 
                      onClick={() => handleSendComment(post.id, post.user_id)}
                      disabled={!commentText.trim()}
                      style={{ background: 'var(--primary)', color: '#000', border: 'none', padding: '0.6rem 1rem', borderRadius: '14px', fontWeight: 800, cursor: 'pointer', fontSize: '0.85rem' }}
                     >
                       ENVIAR
                     </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* MODAIS DE STATUS */}
      {activeStatusGroup && (
        <StatusViewer 
          group={activeStatusGroup} 
          viewerId={session?.user?.id}
          onRefresh={() => setStatusRefreshKey(prev => prev + 1)}
          onClose={() => setActiveStatusGroup(null)} 
        />
      )}

      {isCreatingStatus && (
        <StatusCreator 
          session={session} 
          onClose={() => setIsCreatingStatus(false)}
          onRefresh={() => setStatusRefreshKey(prev => prev + 1)}
        />
      )}


    </div>
  );
}
