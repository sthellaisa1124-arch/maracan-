import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Image as ImageIcon,
  Send, 
  Loader2, 
  MessageCircle, 
  Heart, 
  Share2, 
  MoreHorizontal,
  Compass,
  Users,
  Crown,
  X,
  Eye,
  Bell
} from 'lucide-react';
import { StatusRail } from '../components/StatusRail';
import { StatusViewer } from '../components/StatusViewer';
import { StatusCreator } from '../components/StatusCreator';
import { UserBadges } from '../components/Badges';

import { LiveRoom } from '../components/LiveRoom';


export function Community({ profile, session, unreadCount = 0, onViewProfile, onTabChange, isCreateModalOpen, onCloseCreateModal }: { profile: any, session: any, unreadCount?: number, onViewProfile: (username: string) => void, onTabChange: (tab: string) => void, isCreateModalOpen?: boolean, onCloseCreateModal?: () => void }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isSocialFeed, setIsSocialFeed] = useState(false);
  const [postsCountToday, setPostsCountToday] = useState(0);
  const [toast, setToast] = useState<{msg: string; typ: string} | null>(null);
  const [activeStatusGroup, setActiveStatusGroup] = useState<any>(null);
  const [isCreatingStatus, setIsCreatingStatus] = useState(false);
  const [statusRefreshKey, setStatusRefreshKey] = useState(0);
  const [activeLive, setActiveLive] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (window as any).openStatusCreator = () => setIsCreatingStatus(true);
  }, []);

  useEffect(() => {
    fetchPosts();
    if (session?.user?.id) fetchDailyCount();
  }, [session?.user?.id]);

  async function fetchDailyCount() {
    if (!session || (profile?.plan === 'premium' || profile?.plan === 'gold')) return;
    
    if (!session?.user?.id) return;
    
    const { count } = await supabase
      .from('user_posts')
      .select('id', { count: 'exact' })
      .eq('user_id', session.user.id)
      .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    setPostsCountToday(count || 0);
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

    // Buscar contagens e interações para cada post
    const postsWithStats = await Promise.all((finalPosts || []).map(async (post: any) => {
      // Likes
      const { count: likesCount } = await supabase
        .from('user_post_likes')
        .select('id', { count: 'exact' })
        .eq('post_id', post.id);

      // Comentários
      const { count: commsCount } = await supabase
        .from('user_post_comments')
        .select('id', { count: 'exact' })
        .eq('post_id', post.id);

      // Visualizações
      const { count: viewsCount } = await supabase
        .from('user_post_views')
        .select('id', { count: 'exact' })
        .eq('post_id', post.id);

      // Verificar se eu curto
      let isLiked = false;
      if (session?.user?.id) {
        const { data: myLike } = await supabase
          .from('user_post_likes')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', session.user.id)
          .maybeSingle();
        isLiked = !!myLike;

        // Registrar minha visualização se não for meu post
        if (post.user_id !== session.user.id) {
          await supabase.from('user_post_views').insert({ 
            post_id: post.id, 
            user_id: session.user.id 
          });
        }
      }

      // Comentários Detalhados (para exibição)
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

    // LIMITE DE 30MB SOLICITADO
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

    setUploading(true);

    // TRAVA DE MONETIZAÇÃO
    if (profile?.plan !== 'premium' && profile?.plan !== 'gold') {
      if (postsCountToday >= 2) {
        setUploading(false);
        return notify("Limite de 2 posts atingido! Vire PREMIUM pra soltar o papo sem limites! 👑💎", "error");
      }
    }
    const { error } = await supabase
      .from('user_posts')
      .insert([
        {
          user_id: session.user.id,
          content: content,
          image_url: mediaType === 'image' ? mediaUrl : null,
          video_url: mediaType === 'video' ? mediaUrl : null
        }
      ]);

    if (error) {
      notify("Erro ao postar: " + error.message, "error");
    } else {
      setContent('');
      setMediaUrl(null);
      setMediaType(null);
      notify("Papo reto largado na pista! 🔥🏙️");
      if (onCloseCreateModal) onCloseCreateModal();
      fetchPosts();
    }
    setUploading(false);
  };

  async function handleLike(post: any) {
    if (!session) return notify("Loga aí pra mostrar que gostou! ❤️", "error");

    if (post.is_liked) {
      // Traduzir para descurtir
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
        
        // Gerar notificação para o autor
        if (post.user_id !== session.user.id) {
          const { error: notifErr } = await supabase.from('notifications').insert({
            user_id: post.user_id,
            from_user_id: session.user.id,
            type: 'like',
            post_id: post.id
          });
          if (notifErr) notify("Erro Notif Like: " + notifErr.message, "error");
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

      // Notificar autor
      if (authorId !== session.user.id) {
        const { error: notifErr } = await supabase.from('notifications').insert({
          user_id: authorId,
          from_user_id: session.user.id,
          type: 'comment',
          post_id: postId
        });
        if (notifErr) notify("Erro Notif Comment: " + notifErr.message, "error");
      }

    }
  }

  return (
    <div className="community-page animate-fade-up">
      {toast && <div className={`toast-notification ${toast.typ}`}>{toast.msg}</div>}
      
      {/* --- HEADER FIXO MODERNO --- */}
      <div className="header-feed-urban" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'default' }}>
        <h3 className="vellar-neon-logo" style={{ margin: 0 }}>
          <span className="logo-v">V</span>ELLΛ<span className="logo-r">R</span>
        </h3>
        <button 
          onClick={() => onTabChange('notifications')}
          style={{ 
            background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative', padding: '0.4rem',
            color: unreadCount > 0 ? 'var(--primary)' : 'rgba(255,255,255,0.7)'
          }}
        >
          <Bell size={22} strokeWidth={unreadCount > 0 ? 3 : 2} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: 0, right: 0, width: '10px', height: '10px',
              backgroundColor: '#ef4444', borderRadius: '50%',
              border: '2px solid #000', boxShadow: '0 0 5px rgba(239, 68, 68, 0.4)'
            }} />
          )}
        </button>
      </div>

      {/* --- SISTEMA SOLTA NA PISTA (STORIES) --- */}
      <div style={{ marginBottom: '1.5rem', padding: '0 0.5rem' }}>
        <StatusRail 
          key={statusRefreshKey} 
          session={session} 
          profile={profile}
          onOpenStatus={(group) => {
            if (group.is_live) {
              setActiveLive({ 
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

      {/* --- MODAL DE CRIAÇÃO (SUBSTITUI CAIXA FIXA) --- */}
      {isCreateModalOpen && (
        <div className="modal-overlay-urban" onClick={onCloseCreateModal}>
          <div className="urbano-card animate-fade-up" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
               <h3 style={{ margin: 0, color: 'var(--primary)', fontWeight: 900 }}>LANÇAR UM PAPO RETO 🎤🔥</h3>
               <button onClick={onCloseCreateModal} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '2rem' }}>
              <img 
                src={profile?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + session?.user?.id} 
                style={{ width: '56px', height: '56px', borderRadius: '50%', border: '2px solid var(--primary)', padding: '2px' }} 
                alt="Avatar"
              />
              <textarea 
                placeholder="Qual é o papo de hoje, cria? 🤙🏙️"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                style={{ 
                  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--separator)', color: '#fff', 
                  fontSize: '1.2rem', fontWeight: '500', outline: 'none', width: '100%',
                  padding: '1.25rem', borderRadius: '1.5rem', minHeight: '150px', resize: 'none'
                }}
              />
            </div>

            {(profile?.plan !== 'premium' && profile?.plan !== 'gold') && (
              <div style={{ 
                background: postsCountToday >= 2 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(250, 204, 21, 0.05)', 
                color: postsCountToday >= 2 ? 'var(--danger)' : 'var(--primary)',
                padding: '1rem', borderRadius: '1rem', marginBottom: '1.5rem',
                fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem',
                border: '1px solid currentColor'
              }}>
                <Crown size={18} />
                {postsCountToday >= 2 
                  ? "Limite diário atingido! Posts ilimitados só no plano PREMIUM. ✨" 
                  : `Você já usou ${postsCountToday}/2 posts gratuitos hoje.`}
              </div>
            )}
            
            {mediaUrl && (
              <div className="media-preview" style={{ marginBottom: '2rem', borderRadius: '1.5rem', overflow: 'hidden', border: '1px solid var(--primary)', position: 'relative' }}>
                {mediaType === 'image' ? (
                  <img src={mediaUrl} style={{ width: '100%', display: 'block' }} alt="Preview" />
                ) : (
                  <video src={mediaUrl} style={{ width: '100%', display: 'block' }} controls />
                )}
                <button 
                  onClick={() => setMediaUrl(null)}
                  style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.5rem', borderTop: '1px solid var(--separator)' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="icon-btn" onClick={() => fileInputRef.current?.click()} title="Adicionar Mídia">
                  <ImageIcon size={22} />
                </button>
                <input 
                  type="file" 
                  hidden 
                  ref={fileInputRef} 
                  accept="image/*,video/*" 
                  onChange={handleMediaUpload} 
                />
              </div>
              <button 
                className="gold-button" 
                onClick={handleCreatePost}
                disabled={uploading || (!content.trim() && !mediaUrl)}
              >
                {uploading ? <Loader2 className="animate-spin" /> : <><Send size={20} /> LANÇAR NA PISTA</>}
              </button>
            </div>
          </div>
        </div>
      )}


      <div style={{ margin: '1.5rem 0.75rem 1rem', opacity: 0.6, fontSize: '0.85rem', fontStyle: 'italic', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {isSocialFeed ? (
          <><Users size={18} /> OS CRIA TÃO LANÇANDO</>
        ) : (
          <><Compass size={18} /> PAPO RETO NO VELLAR</>
        )}
      </div>

      <div className="community-feed">
        {loading ? (
          <div style={{textAlign: 'center', padding: '4rem'}}><Loader2 className="animate-spin" /></div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>A pista tá quieta... solta o papo você! 🎤🔇</div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="feed-post-card">
              {/* Header do Post */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', padding: '0 1rem' }}>
                <img 
                  src={post.author?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + post.user_id} 
                  style={{ width: '48px', height: '48px', borderRadius: '50%', cursor: 'pointer' }}
                  onClick={() => onViewProfile(post.author?.username)}
                  alt="Avatar"
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span 
                      style={{ fontWeight: 800, fontSize: '1.05rem', cursor: 'pointer' }}
                      onClick={() => onViewProfile(post.author?.username)}
                    >
                      @{post.author?.username}
                    </span>
                    <UserBadges badges={post.author?.badges} donatedAmount={post.author?.total_donated} size={16} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>• {new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <MoreHorizontal size={20} />
                </button>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <p style={{ fontSize: '1.05rem', lineHeight: 1.5, marginBottom: post.image_url || post.video_url ? '0.75rem' : 0, padding: '0 1rem' }}>
                  {post.content}
                </p>
                {post.image_url && (
                  <div style={{ borderTop: '1px solid var(--separator)', borderBottom: '1px solid var(--separator)', background: '#000' }}>
                    <img src={post.image_url} alt="Post" style={{ width: '100%', maxHeight: '550px', objectFit: 'contain', display: 'block' }} />
                  </div>
                )}
                {post.video_url && (
                  <div style={{ borderTop: '1px solid var(--separator)', borderBottom: '1px solid var(--separator)', background: '#000' }}>
                    <video src={post.video_url} preload="none" controls style={{ width: '100%', maxHeight: '550px', display: 'block' }} />
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', paddingTop: '0.75rem', paddingLeft: '1rem', paddingRight: '1rem', flexWrap: 'wrap' }}>
                <button 
                  style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', color: post.is_liked ? 'var(--primary)' : 'rgba(255,255,255,0.7)', cursor: 'pointer', fontWeight: 800 }}
                  onClick={() => handleLike(post)}
                >
                  <Heart size={20} fill={post.is_liked ? "currentColor" : "none"} /> <span>{post.likes_count || 0}</span>
                </button>
                <button 
                  style={{ background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem', color: commentingOn === post.id ? 'var(--primary)' : 'rgba(255,255,255,0.7)', cursor: 'pointer', fontWeight: 800 }}
                  onClick={() => setCommentingOn(commentingOn === post.id ? null : post.id)}
                >
                  <MessageCircle size={20} /> <span>{post.comments_count || 0}</span>
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 800 }}>
                   <Eye size={18} /> <span>{post.views_count || 0}</span>
                </div>
                <button style={{ background: 'transparent', border: 'none', marginLeft: 'auto', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                  <Share2 size={20} />
                </button>
              </div>

              {/* SEÇÃO DE COMENTÁRIOS (Visível apenas se clicar no ícone) */}
              {commentingOn === post.id && (
                <div className="comments-section-wrapper" style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '1rem', animation: 'fadeUp 0.3s ease' }}>
                  
                  {/* LISTA DE COMENTÁRIOS COM SCROLL */}
                  <div className="comments-scroll-area" style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1.5rem', paddingRight: '0.5rem' }}>
                    {post.comments_list && post.comments_list.length > 0 ? (
                      post.comments_list.map((c: any) => (
                        <div key={c.id} style={{ display: 'flex', gap: '0.8rem', marginBottom: '1rem' }}>
                           <img 
                             src={c.author?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + c.user_id} 
                             style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                             alt="Avatar"
                           />
                           <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '0.6rem 1rem', borderRadius: '1rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                   <strong style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>@{c.author?.username}</strong>
                                   <UserBadges badges={c.author?.badges} donatedAmount={c.author?.total_donated} size={14} />
                                 </div>
                                 <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{new Date(c.created_at).toLocaleDateString()}</span>
                              </div>
                              <p style={{ fontSize: '0.9rem', margin: 0, color: '#fff', opacity: 0.9 }}>{c.content}</p>
                           </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ textAlign: 'center', opacity: 0.4, fontSize: '0.85rem', padding: '1rem' }}>Nenhum comentário ainda. Seja o primeiro a mandar o papo! 🎤</p>
                    )}
                  </div>

                  {/* INPUT DE COMENTÁRIO (AGORA ABAIXO DA LISTA) */}
                  <div className="comment-input-area" style={{ display: 'flex', gap: '0.8rem' }}>
                     <input 
                      type="text" 
                      placeholder="Manda seu comentário..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendComment(post.id, post.user_id)}
                      style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--separator)', borderRadius: '1rem', padding: '0.6rem 1rem', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                     />
                     <button 
                      onClick={() => handleSendComment(post.id, post.user_id)}
                      disabled={!commentText.trim()}
                      style={{ background: 'var(--primary)', color: '#000', border: 'none', padding: '0.6rem 1rem', borderRadius: '1rem', fontWeight: 800, cursor: 'pointer' }}
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

      {/* OVERLAY DE LIVE */}
      {activeLive && (
        <LiveRoom 
          session={session}
          userProfile={profile}
          role="audience"
          room={activeLive}
          onClose={() => setActiveLive(null)}
        />
      )}
    </div>
  );
}
