import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Heart, MessageCircle, Eye, Loader2, Trash2, Send, X, MoreVertical, Trophy, ArrowLeft, Radio, Video, BarChart2, UserPlus, Search, Users } from 'lucide-react';
import { GiftPanel, type Gift } from '../components/GiftPanel';
import { UserBadges } from '../components/Badges';
import { GiftIconRenderer, GIFT_ICON_MAP } from '../components/GiftIcons';
import { GiftAnimationOverlay } from '../components/GiftAnimationOverlay';
import { LiveRoom } from '../components/LiveRoom';
import { SetupLiveModal } from '../components/SetupLiveModal';
import { MoralRanking } from '../components/MoralRanking';

export function Avista({ 
  session, 
  onViewProfile, 
  filterUserId, 
  initialPostId, 
  onClose,
  onBackToCommunity
}: { 
  session: any, 
  onViewProfile: (username: string) => void,
  filterUserId?: string,
  initialPostId?: string,
  onClose?: () => void,
  onBackToCommunity?: () => void
}) {
  const [currentTab, setCurrentTab] = useState<'avista' | 'lives'>('avista');
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [activeLiveId, setActiveLiveId] = useState<string | null>(null);
  const [activeLiveRoom, setActiveLiveRoom] = useState<any | null>(null);
  const [showSetupLive, setShowSetupLive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('TUDO');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const [giftTarget, setGiftTarget] = useState<any | null>(null);
  const [showAnalysis, setShowAnalysis] = useState<any | null>(null);
  const [showAnalysisTab, setShowAnalysisTab] = useState<'ranking' | 'likes'>('ranking');
  const [showStats, setShowStats] = useState<any | null>(null);
  const [followingMap, setFollowingMap] = useState<Set<string>>(new Set());
  const [showRanking, setShowRanking] = useState(false);
  const [giftAnimation, setGiftAnimation] = useState<{id: string; gift: Gift} | null>(null);
  const [bigGiftAnim, setBigGiftAnim] = useState<{gift: Gift, username: string} | null>(null);
  const [hostLive, setHostLive] = useState<any | null>(null); // Live ativa do criador
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const viewTimers = useRef<Map<string, any>>(new Map());
  const lastViewCall = useRef<Map<string, number>>(new Map());
  const [topDonorsMap, setTopDonorsMap] = useState<Map<string, any[]>>(new Map());
  const [showShareModal, setShowShareModal] = useState<any | null>(null);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [shareSearch, setShareSearch] = useState('');
  const [showLikeBurst, setShowLikeBurst] = useState<string | null>(null);
  const lastClickRef = useRef<number>(0);

  useEffect(() => {
    fetchAvistaPosts();
    runPassiveCleanup();
    fetchActiveLives(true);
  }, [filterUserId]);

  const filteredLives = liveSessions.filter(live => {
    const searchLower = searchTerm.toLowerCase();
    const titleOrUserMatches = (
      live.host_profile?.username?.toLowerCase().includes(searchLower) ||
      live.title?.toLowerCase().includes(searchLower)
    );
    
    if (selectedCategory === 'TUDO') return titleOrUserMatches;
    return titleOrUserMatches && live.category === selectedCategory;
  });

  const renderLiveHub = () => {
    return (
      <div className="live-hub-container" style={{ position: 'relative', height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="live-hub-header">
          <h1 className="live-hub-title">Explorar Lives</h1>
          <div className="live-hub-search-wrapper">
            <Search className="live-hub-search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar criador ou título..." 
              className="live-hub-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="live-hub-categories">
          {['TUDO', 'RESENHA', 'TALENTO', 'CONFRONTO', 'CONVERSA'].map(cat => (
            <button 
              key={cat} 
              className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {filteredLives.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.5, padding: '2rem', textAlign: 'center' }}>
            <Radio size={48} style={{ marginBottom: '1rem' }} />
            <p style={{ fontWeight: 600 }}>{searchTerm ? 'Nenhuma live encontrada para sua busca' : 'Nenhuma live rolando no momento'}</p>
          </div>
        ) : (
          <div className="live-hub-grid" style={{ flex: 1 }}>
            {filteredLives.map((live) => (
              <div 
                key={live.id} 
                className="live-card-elite"
                onClick={() => {
                  setActiveLiveId(live.id);
                  setActiveLiveRoom(live);
                }}
              >
                <img 
                  src={live.cover_url || live.host_profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${live.user_id}`} 
                  className="live-card-thumb"
                  alt={live.host_profile?.username}
                />
                
                <div className="live-card-overlay">
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <div className="live-card-badge-live">
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} /> AO VIVO
                    </div>
                    <div className="live-card-viewers">
                      <Users size={10} /> {live.viewer_count || 0}
                    </div>
                  </div>

                  <div className="live-card-info">
                    <div className="live-card-host">
                      <img src={live.host_profile?.avatar_url} className="live-card-avatar" />
                      <span className="live-card-username">@{live.host_profile?.username}</span>
                    </div>
                    {live.title && <p className="live-card-title">{live.title}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000005 }}>
          {renderNavigationTabsHUD()}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (session?.user?.id) fetchFollowingList();

    // Radar Realtime: Atualiza a lista de lives instantaneamente
    const channel = supabase.channel('live_sessions_avista')
      .on(
        'postgres_changes' as any,
        { event: '*', table: 'live_sessions', schema: 'public' },
        () => {
          fetchActiveLives(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterUserId]);

  async function fetchActiveLives(isInitial = false) {
    try {
      const { data } = await supabase
        .from('live_sessions')
        .select(`
          *,
          host_profile:profiles(username, avatar_url, badges, total_donated)
        `)
        .eq('is_live', true)
        .is('ended_at', null)
        .order('started_at', { ascending: false });
      
      if (data && data.length > 0) {
         setLiveSessions(prev => {
           if (prev.length === 0 || isInitial) {
             const shuffled = [...data].sort(() => Math.random() - 0.5);
             return shuffled;
           } else {
             const updated = prev.map(existing => data.find(d => d.id === existing.id)).filter(Boolean);
             const novos = data.filter(d => !prev.find(p => p.id === d.id));
             return [...updated, ...novos];
           }
         });
      } else {
         setLiveSessions([]);
         setActiveLiveId(null);
         setActiveLiveRoom(null);
      }
    } catch (e) { console.error('Erro fetching lives:', e); }
  }

  async function fetchFollowingList() {
    const { data } = await supabase
      .from('follows')
      .select('following_id, profiles!following_id(id, username, avatar_url, badges)')
      .eq('follower_id', session.user.id);
    if (data) {
      setFollowingMap(new Set(data.map((f: any) => f.following_id)));
      setFollowingList(data.map((f: any) => f.profiles));
    }
  }

  async function handleVideoClick(post: any) {
    const now = Date.now();
    const video = videoRefs.current.get(post.id);
    
    // Detecção de Clique Duplo (Double Click to Like)
    if (now - lastClickRef.current < 300) {
      if (!post.is_liked) {
        toggleLike(post);
      }
      setShowLikeBurst(post.id);
      setTimeout(() => setShowLikeBurst(null), 800);
      lastClickRef.current = 0; // Reset para evitar triplo clique
      return;
    }

    lastClickRef.current = now;

    // Clique Simples: Play/Pause (com delay para não conflitar com double click)
    setTimeout(() => {
      if (Date.now() - lastClickRef.current >= 300 && lastClickRef.current !== 0) {
        if (video) {
          video.paused ? video.play() : video.pause();
        }
      }
    }, 300);
  }

  async function shareInternally(targetUserId: string, post: any) {
    if (!session) return;
    
    const shareMsg = `🔥 Se liga nesse conteúdo que achei no AVISTA! \n\nhttps://vellar-teal.vercel.app/?id=${post.id}`;
    
    const { error } = await supabase.from('direct_messages').insert({
      sender_id: session.user.id,
      receiver_id: targetUserId,
      content: shareMsg,
      is_forwarded: true
    });

    if (!error) {
      alert("Enviado com sucesso! 🚀");
    } else {
      console.error("Erro ao compartilhar:", error);
    }
  }

  const handleExternalShare = async (post: any) => {
    const shareData = {
      title: 'Vellar Elite',
      text: `Se liga nesse conteúdo no Vellar! A única plataforma de elite 🏙️🔥`,
      url: `https://vellar-teal.vercel.app/?id=${post.id}`
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert('Link copiado! Chame os crias pro Vellar! 🔥');
      }
    } catch (err) {
      console.error('Erro ao compartilhar:', err);
    }
  };

  async function toggleFollow(targetUserId: string) {
    if (!session) return;
    if (followingMap.has(targetUserId)) {
      await supabase.from('follows').delete()
        .eq('follower_id', session.user.id)
        .eq('following_id', targetUserId);
      setFollowingMap(prev => { const s = new Set(prev); s.delete(targetUserId); return s; });
    } else {
      await supabase.from('follows').insert({ follower_id: session.user.id, following_id: targetUserId });
      setFollowingMap(prev => new Set([...prev, targetUserId]));
    }
  }

  async function runPassiveCleanup() {
    try {
      // 1. Buscar posts expirados
      const { data: expired } = await supabase
        .from('avista_posts')
        .select('id, video_url')
        .lt('expires_at', new Date().toISOString())
        .limit(20);

      if (expired && expired.length > 0) {
        console.log(`🧹 Limpando ${expired.length} vídeos expirados do AVISTA...`);
        
        for (const post of expired) {
          // 2. Tentar deletar arquivo do storage (bucket 'media')
          const path = post.video_url.split('/public/media/')[1];
          if (path) {
            await supabase.storage.from('media').remove([path]);
          }
          // 3. Deletar do banco
          await supabase.from('avista_posts').delete().eq('id', post.id);
        }
        console.log("✅ Faxina do AVISTA concluída.");
      }
    } catch (err) {
      console.warn("⚠️ Erro na limpeza passiva do AVISTA:", err);
    }
  }

  useEffect(() => {
    if (initialPostId && posts.length > 0) {
      // Pequeno delay para garantir que o DOM renderizou os vídeos
      setTimeout(() => {
        const el = document.getElementById(initialPostId);
        if (el) {
          el.scrollIntoView({ behavior: 'auto' });
          setActiveVideoId(initialPostId);
        }
      }, 100);
    }
  }, [posts, initialPostId]);

  useEffect(() => {
    let animationFrameId: number;

    const checkVideoLoops = () => {
      if (currentTab === 'avista' && activeVideoId) {
        const video = videoRefs.current.get(activeVideoId);
        const post = posts.find(p => p.id === activeVideoId);
        if (video && post && post.metadata && !video.paused) {
          const { startTime = 0, endTime = 0 } = post.metadata;
          if (endTime > 0) {
            if (video.currentTime < startTime) video.currentTime = startTime;
            if (video.currentTime >= endTime) {
              video.currentTime = startTime;
              video.play();
            }
          }
        }
      }
      animationFrameId = requestAnimationFrame(checkVideoLoops);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const postId = entry.target.id;
          
          if (entry.isIntersecting) {
            if (currentTab === 'avista') {
               setActiveVideoId(postId);
               const video = videoRefs.current.get(postId);
               const post = posts.find(p => p.id === postId);
               if (video) {
                 // Aplicar volume e zoom iniciais do metadata
                 if (post?.metadata) {
                   video.volume = post.metadata.volume ?? 1;
                   video.currentTime = post.metadata.startTime ?? 0;
                 }
                 video.play().catch(() => {
                   video.muted = true;
                   video.play();
                 });
               }
               // Analytcs Avista View
               const now = Date.now();
               const lastCall = lastViewCall.current.get(postId) || 0;
               if (now - lastCall > 30000) {
                 const storedViews = JSON.parse(localStorage.getItem('avista_views') || '[]');
                 if (!storedViews.includes(postId)) {
                   const timer = setTimeout(() => {
                     incrementView(postId);
                     const updated = [...storedViews, postId];
                     localStorage.setItem('avista_views', JSON.stringify(updated));
                     lastViewCall.current.set(postId, Date.now());
                   }, 2000); 
                   viewTimers.current.set(postId, timer);
                 }
               }
            } else if (currentTab === 'lives') {
               setActiveLiveId(postId);
            }
          } else {
            if (currentTab === 'avista') {
               const video = videoRefs.current.get(postId);
               if (video) video.pause();
               if (viewTimers.current.has(postId)) {
                 clearTimeout(viewTimers.current.get(postId));
                 viewTimers.current.delete(postId);
               }
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    const items = document.querySelectorAll('.avista-item');
    items.forEach(item => observer.observe(item));
    animationFrameId = requestAnimationFrame(checkVideoLoops);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, [posts, liveSessions, currentTab, activeVideoId]);

  async function fetchAvistaPosts() {
    setLoading(true);
    
    let query = supabase
      .from('avista_posts')
      .select('*, profiles(username, avatar_url, badges, total_donated)');

    if (filterUserId) {
      // No perfil do usuário, mostramos todos os posts dele (mesmo expirados se ele quiser ver, ou mantemos a regra de ativos)
      // O usuário pediu "mostra somente o que o usuario postou", vamos focar no user_id.
      query = query.eq('user_id', filterUserId);
    } else {
      query = query.gt('expires_at', new Date().toISOString());
    }

    const { data } = await query
      .order('created_at', { ascending: false })
      .limit(filterUserId ? 100 : 30);

    if (data) {
      const shuffledData = [...data].sort(() => Math.random() - 0.5);
      const postsWithStats = await Promise.all(shuffledData.map(async (post) => {
        const { count: likesCount } = await supabase
          .from('avista_likes')
          .select('id', { count: 'exact' })
          .eq('avista_id', post.id);

        const { count: commentsCount } = await supabase
          .from('avista_comments')
          .select('id', { count: 'exact' })
          .eq('avista_id', post.id);

        let isLiked = false;
        if (session?.user?.id) {
          const { data: myLike } = await supabase
            .from('avista_likes')
            .select('id')
            .eq('avista_id', post.id)
            .eq('user_id', session.user.id)
            .maybeSingle();
          isLiked = !!myLike;
        }

        return { 
          ...post, 
          likes_count: likesCount || 0, 
          comments_count: commentsCount || 0,
          is_liked: isLiked 
        };
      }));
      setPosts(postsWithStats);
      // Buscar Top 3 doadores para os posts carregados
      const ids = data.map(p => p.id);
      fetchTopDonorsForBatch(ids);
    }
    setLoading(false);
  }

  async function fetchTopDonorsForBatch(postIds: string[]) {
    if (postIds.length === 0) return;
    const { data } = await supabase
      .from('gift_transactions')
      .select('post_id, sender_id, gift_price, profiles:sender_id(username, avatar_url)')
      .in('post_id', postIds);
    
    if (data) {
      const map = new Map<string, any[]>();
      const grouped: any = {};

      data.forEach((curr: any) => {
        const pid = curr.post_id;
        if (!pid) return;
        if (!grouped[pid]) grouped[pid] = {};
        const sid = curr.sender_id;
        if (!grouped[pid][sid]) {
          grouped[pid][sid] = { 
            id: sid, 
            username: curr.profiles?.username || 'cria', 
            avatar: curr.profiles?.avatar_url, 
            total: 0 
          };
        }
        grouped[pid][sid].total += curr.gift_price;
      });

      Object.keys(grouped).forEach(pid => {
        const ranking = Object.values(grouped[pid]).sort((a: any, b: any) => b.total - a.total).slice(0, 3);
        map.set(pid, ranking);
      });
      setTopDonorsMap(new Map(map));
    }
  }

  async function incrementView(postId: string) {
    await supabase.rpc('increment_avista_view', { post_id: postId });
  }

  async function toggleLike(post: any) {
    if (!session) return alert("Loga aí pra curtir, cria! ❤️");

    if (post.is_liked) {
      const { error } = await supabase
        .from('avista_likes')
        .delete()
        .eq('avista_id', post.id)
        .eq('user_id', session.user.id);
      
      if (!error) {
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_liked: false, likes_count: p.likes_count - 1 } : p));
      }
    } else {
      const { error } = await supabase
        .from('avista_likes')
        .insert([{ avista_id: post.id, user_id: session.user.id }]);
      
      if (!error) {
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_liked: true, likes_count: p.likes_count + 1 } : p));
        
        if (post.user_id !== session.user.id) {
          await supabase.from('notifications').insert({
            user_id: post.user_id,
            from_user_id: session.user.id,
            type: 'avista_like',
            post_id: post.id
          });
        }
      }
    }
  }

  async function fetchComments(postId: string) {
    const { data } = await supabase
      .from('avista_comments')
      .select('*, profiles(username, avatar_url, badges, total_donated)')
      .eq('avista_id', postId)
      .order('created_at', { ascending: true });
    
    if (data) setComments(data);
  }

  async function handleSendComment() {
    if (!newComment.trim() || !session || !showComments) return;
    setSendingComment(true);

    const { data, error } = await supabase
      .from('avista_comments')
      .insert([{
        avista_id: showComments,
        user_id: session.user.id,
        content: newComment.trim()
      }])
      .select('*, profiles(username, avatar_url, badges, total_donated)')
      .single();

    if (!error && data) {
      setComments(prev => [...prev, data]);
      setNewComment('');
      setPosts(prev => prev.map(p => p.id === showComments ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p));

      const postOwner = posts.find(p => p.id === showComments)?.user_id;
      if (postOwner && postOwner !== session.user.id) {
        await supabase.from('notifications').insert({
          user_id: postOwner,
          from_user_id: session.user.id,
          type: 'avista_comment',
          post_id: showComments
        });
      }
    }
    setSendingComment(false);
  }

  function formatCount(num: number) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  }

  async function handleDelete(post: any) {
    if (!session || post.user_id !== session.user.id) return;
    if (!confirm("Remover esse vídeo da pista, cria?")) return;

    try {
      const path = post.video_url.split('/public/media/')[1];
      if (path) await supabase.storage.from('media').remove([path]);
      await supabase.from('avista_posts').delete().eq('id', post.id);
      setPosts(prev => prev.filter(p => p.id !== post.id));
    } catch (err) {
      console.error("Erro deletar:", err);
    }
  }

  // Callback quando presente é enviado com sucesso pelo GiftPanel
  function handleGiftSent(post: any, gift: Gift) {
    setPosts(prev => prev.map(p => p.id === post.id 
      ? { ...p, moral_received: (p.moral_received || 0) + gift.price } 
      : p
    ));
    
    // Se tem vídeo de animação → dispara o overlay fullscreen (GiftAnimationOverlay)
    if (gift.animationVideo) {
      setBigGiftAnim({ gift, username: post.profiles?.username || 'cria' });
    } else {
      // Sem vídeo → animação pequena flutuante no feed
      setGiftAnimation({ id: post.id, gift });
      const duration = gift.tier === 'premium' ? 4200 : gift.tier === 'mid' ? 3000 : 2400;
      setTimeout(() => setGiftAnimation(null), duration);
    }

    setGiftTarget(null);
  }

  if (loading) return <div className="avista-loading-full"><Loader2 className="animate-spin" color="var(--primary)" size={40} /></div>;

  const renderNavigationTabsHUD = (post?: any) => (
    <div className="avista-in-video-tabs">
        {onBackToCommunity && (
            <button className="avista-back-arrow" onClick={onBackToCommunity} style={{ position: 'absolute', left: '1rem', top: '-40px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', padding: '0.5rem' }}>
                <ArrowLeft size={24} strokeWidth={2} />
            </button>
        )}

        {/* BOTAO DE INICIAR LIVE FLUTUANTE EXCLUSIVO DA ABA LIVES */}
        {currentTab === 'lives' && (
            <button 
               onClick={() => setShowSetupLive(true)}
               style={{
                   position: 'absolute',
                   right: '1.5rem',
                   top: '-60px',
                   background: 'linear-gradient(135deg, #a855f7 0%, #6C2BFF 100%)',
                   color: '#fff',
                   border: 'none',
                   borderRadius: '50%',
                   width: '56px',
                   height: '56px',
                   display: 'flex',
                   justifyContent: 'center',
                   alignItems: 'center',
                   boxShadow: '0 0 20px rgba(168, 85, 247, 0.7), 0 0 40px rgba(108, 43, 255, 0.4)',
                   cursor: 'pointer',
                   zIndex: 100
               }}
            >
                <Video size={28} />
                <span className="live-plus-icon">+</span>
            </button>
        )}

        <div className="avista-tabs-central">
           <button className={`avista-tab-btn ${currentTab === 'lives' ? 'active' : ''}`} onClick={() => setCurrentTab('lives')}>
             LIVES {liveSessions.length > 0 && <span className="live-indicator-dot" />}
           </button>
           <button className={`avista-tab-btn ${currentTab === 'avista' ? 'active' : ''}`} onClick={() => setCurrentTab('avista')}>
             AVISTA
           </button>
        </div>

        {post && currentTab === 'avista' && (
           <div style={{ position: 'absolute', right: '1.5rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.7)' }}>
              <Eye size={22} strokeWidth={2.5} />
              <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>{formatCount(post.views_count || 0)}</span>
           </div>
        )}
    </div>
  );

  return (
    <>

      <div 
        className={`avista-container ${onClose ? 'is-modal' : ''}`}
        style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999,
          height: '100dvh', width: '100vw', 
          overflowY: 'scroll', overflowX: 'hidden', 
          scrollSnapType: currentTab === 'avista' ? 'y mandatory' : 'none', 
          scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
          backgroundColor: '#000'
        }}
      >
        {currentTab === 'lives' && renderLiveHub()}

        {/* Modal de Live Selecionada */}
        {activeLiveRoom && currentTab === 'lives' && (
          <LiveRoom 
             session={session}
             userProfile={null}
             role="audience"
             room={activeLiveRoom}
             inline={false}
             isActive={true}
             onClose={() => {
                setActiveLiveId(null);
                setActiveLiveRoom(null);
                fetchActiveLives();
             }}
          />
        )}
        {currentTab === 'avista' && (
           posts.length === 0 ? (
             <div className="avista-empty-state" style={{ position: 'relative', height: '100%', width: '100%' }}>
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                 <Eye size={64} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                 <h2>NADA NA VISTA...</h2>
                 <p>Seja o primeiro a soltar o papo em vídeo! Use o botão +.</p>
               </div>
               {renderNavigationTabsHUD()}
             </div>
           ) : (
           posts.map((post, index) => {
             const isNext = posts[index - 1]?.id === activeVideoId;
             return (
            <div key={post.id} id={post.id} className="avista-item" style={{ position: 'relative', height: '100dvh', width: '100%', scrollSnapAlign: 'start', flexShrink: 0, backgroundColor: '#000', margin: 0, padding: 0 }}>
              <div className="avista-skeleton">
                <Loader2 className="animate-spin" color="rgba(255,255,255,0.1)" size={48} />
              </div>

              <video 
                ref={el => { if (el) videoRefs.current.set(post.id, el); }}
                src={post.video_url} 
                className={`avista-video ${activeVideoId === post.id ? 'active' : ''}`}
                style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover', 
                  zIndex: 0,
                  transform: post.metadata?.zoom ? `scale(${post.metadata.zoom})` : 'none',
                  transition: 'transform 0.3s'
                }}
                loop 
                playsInline
                preload={activeVideoId === post.id || isNext ? "auto" : "none"}
                onPlay={(e) => (e.target as HTMLVideoElement).parentElement?.classList.add('loaded')}
                onClick={() => handleVideoClick(post)}
              />

              {/* ANIMAÇÃO DE LIKE (CORAÇÃO PULSANTE) */}
              {showLikeBurst === post.id && (
                <div className="avista-like-animation">
                  <Heart size={120} fill="#fff" stroke="none" />
                </div>
              )}

              {/* TOP APOIADORES IN-VIDEO FOI MOVIDO PARA AVISTA-ACTIONS */}

              {/* ÍCONE RANKING — TOPO ESQUERDO DO VÍDEO */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowRanking(true); }}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  left: '1rem',
                  zIndex: 60,
                  background: 'rgba(0,0,0,0.45)',
                  border: '1px solid rgba(251,191,36,0.3)',
                  borderRadius: '50%',
                  width: '38px',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(8px)',
                  cursor: 'pointer',
                }}
              >
                <Trophy size={20} color="#fbbf24" />
              </button>

              {/* BOTÃO 3 PONTINHOS — TOPO DIREITO DO VÍDEO (APENAS DONO) */}
              {session?.user?.id === post.user_id && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowStats(post); }}
                  style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    zIndex: 60,
                    background: 'rgba(0,0,0,0.45)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '38px',
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(8px)',
                    cursor: 'pointer',
                  }}
                >
                  <MoreVertical size={22} color="#fff" />
                </button>
              )}

            <div className="avista-overlay" style={{ bottom: 0, paddingBottom: '80px', background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.15) 25%, transparent 40%)' }}>
              <div className="avista-info">
                {/* LINHA 1: avatar + username + badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <img
                    src={post.profiles?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + post.user_id}
                    className="mini-avatar"
                    onClick={() => onViewProfile(post.profiles?.username)}
                    style={{ cursor: 'pointer', width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.4)', flexShrink: 0 }}
                  />
                  <span
                    onClick={() => onViewProfile(post.profiles?.username)}
                    style={{ cursor: 'pointer', fontWeight: 900, fontSize: '0.95rem', color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
                  >
                    @{post.profiles?.username || 'cria'}
                  </span>
                  <UserBadges badges={post.profiles?.badges} donatedAmount={post.profiles?.total_donated} size={14} />

                  {/* BOTÃO SEGUIR — só aparece quando NÃO está seguindo e não é o próprio criador */}
                  {session && session.user.id !== post.user_id && !followingMap.has(post.user_id) && (
                    <button
                      onClick={() => toggleFollow(post.user_id)}
                      style={{
                        background: 'var(--primary)',
                        border: 'none', borderRadius: '20px',
                        color: '#fff', fontSize: '0.65rem', fontWeight: 800,
                        padding: '4px 12px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '3px',
                        whiteSpace: 'nowrap', letterSpacing: '0.5px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                      }}
                    >
                      <UserPlus size={11} />
                      Seguir
                    </button>
                  )}
                </div>

                {/* DESCRIÇÃO */}
                {post.description && <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', opacity: 0.85 }}>{post.description}</p>}
              </div>
            </div>

            <div className="avista-actions">
              <button className={`avista-action-btn ${post.is_liked ? 'liked' : ''}`} onClick={() => toggleLike(post)}>
                <Heart size={38} fill={post.is_liked ? "var(--primary)" : "none"} strokeWidth={2.5} />
                <span>{formatCount(post.likes_count || 0)}</span>
              </button>
              
              <button className="avista-action-btn" onClick={() => { setShowComments(post.id); fetchComments(post.id); }}>
                <MessageCircle size={38} strokeWidth={2.5} />
                <span>{formatCount(post.comments_count || 0)}</span>
              </button>

              <button className="avista-action-btn" onClick={() => setShowShareModal(post)}>
                <Send size={38} strokeWidth={2.5} />
                <span style={{ fontSize: '0.7rem', marginTop: '2px' }}>SHARE</span>
              </button>



              {/* Botão Presente Premium */}
              {session && (
                <button
                  className={`avista-gift-btn ${session.user.id === post.user_id ? 'is-owner' : ''}`}
                  onClick={() => {
                    if (session.user.id === post.user_id) {
                      // Criador: abre lista de donatários
                      setShowAnalysisTab('ranking');
                      setShowAnalysis(post);
                    } else {
                      setGiftTarget(giftTarget?.id === post.id ? null : post);
                    }
                  }}
                >
                  <span className="avista-gift-icon">🎁</span>
                  {session.user.id === post.user_id && (
                    <span className="avista-gift-count">{formatCount(post.moral_received || 0)}</span>
                  )}
                </button>
              )}

              {session?.user?.id === post.user_id && (
                <button className="avista-action-btn delete" onClick={() => handleDelete(post)}>
                  <Trash2 size={32} />
                </button>
              )}

              {/* TOP APOIADORES IN-VIDEO RATIO VERTICAL NA LATERAL */}
              {topDonorsMap.get(post.id) && topDonorsMap.get(post.id)!.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.2rem', alignItems: 'center' }}>
                   {topDonorsMap.get(post.id)?.slice(0, 3).map((donor, i) => (
                     <div key={donor.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' }} onClick={() => onViewProfile(donor.username)}>
                         <div style={{ 
                             position: 'absolute', top: '-8px', background: i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : '#b45309', 
                             color: '#000', fontSize: '0.55rem', fontWeight: 900, padding: '1px 4px', borderRadius: '8px', zIndex: 10,
                             border: '1px solid #fff', whiteSpace: 'nowrap'
                         }}>
                             TOP {i+1}
                         </div>
                         <img 
                           src={donor.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${donor.id}`} 
                           style={{ 
                               width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', 
                               border: `2px solid ${i === 0 ? '#fbbf24' : i === 1 ? '#9ca3af' : '#b45309'}`,
                               boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
                           }}
                         />
                     </div>
                   ))}
                </div>
              )}

            </div>

            {/* ANIMAÇÃO DE PRESENTE POR TIER (OCULTAR SE TIVER VÍDEO FULLSCREEN) */}
            {giftAnimation?.id === post.id && giftAnimation && !giftAnimation.gift.animationVideo && (
              <div className={`avista-gift-floating tier-${giftAnimation.gift.tier}`}>
                <span className="avista-gift-floating-symbol" style={{ color: giftAnimation.gift.color }}>
                  {GIFT_ICON_MAP[giftAnimation.gift.id] ? (
                    <GiftIconRenderer
                      giftId={giftAnimation.gift.id}
                      size={giftAnimation.gift.tier === 'premium' ? 160 : giftAnimation.gift.tier === 'mid' ? 100 : 72}
                    />
                  ) : (
                    giftAnimation.gift.symbol
                  )}
                </span>
                <span className="avista-gift-floating-label" style={{ color: giftAnimation.gift.color }}>
                  {giftAnimation.gift.name}
                </span>
              </div>
            )}

            {/* GAVETA DE COMENTÁRIOS (ESTILO REELS) */}
            {showComments === post.id && (
              <div className="avista-comments-drawer">
                <div className="drawer-handle" onClick={() => setShowComments(null)} />
                <header>
                  <h3>Comentários ({post.comments_count})</h3>
                  <button onClick={() => setShowComments(null)}><X size={20} opacity={0.5} /></button>
                </header>
                
                <div className="comments-list">
                  {comments.length === 0 ? (
                    <p className="no-comments">Ninguém mandou o papo ainda... 🎤</p>
                  ) : (
                    comments.map(c => (
                      <div key={c.id} className="comment-item">
                        <img src={c.profiles?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + c.user_id} />
                        <div className="comment-body">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <strong>@{c.profiles?.username}</strong>
                            <UserBadges badges={c.profiles?.badges} donatedAmount={c.profiles?.total_donated} size={14} />
                          </div>
                          <p>{c.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="comment-footer">
                  <input 
                    type="text" 
                    placeholder="Manda seu papo..." 
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendComment()}
                  />
                  <button onClick={handleSendComment} disabled={sendingComment || !newComment.trim()}>
                    {sendingComment ? <Loader2 className="animate-spin" size={18} /> : <Send size={20} />}
                  </button>
                </div>
              </div>
            )}

            {renderNavigationTabsHUD(post)}

          </div>
          );
           })
           )
        )}
      </div>

      {/* DRAWER DE RANKING — BOTTOM SHEET COM GESTOS */}
      {showRanking && (
        <RankingBottomSheet
          onClose={() => setShowRanking(false)}
          onViewProfile={(username) => { setShowRanking(false); onViewProfile(username); }}
        />
      )}

      <style>{`
        .avista-overlay { bottom: 0 !important; pointer-events: none; }
        .avista-overlay * { pointer-events: auto; }
        .avista-actions {
          position: absolute; right: 12px; bottom: 120px;
          display: flex; flex-direction: column; gap: 1.2rem; align-items: center;
          z-index: 150 !important; pointer-events: auto;
        }
        .avista-action-btn {
          background: transparent; border: none; color: #fff;
          display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
          cursor: pointer; transition: transform 0.2s; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
        }
        .avista-action-btn:hover { transform: scale(1.15); }
        .avista-action-btn span { font-size: 0.85rem; font-weight: 800; text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
        .avista-action-btn.liked svg { fill: var(--primary); stroke: var(--primary); }
        .avista-gift-btn {
          position: relative; background: linear-gradient(135deg, #facc15, #fbbf24);
          width: 56px; height: 56px; border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.3);
          display: flex; align-items: center; justify-content: center;
          font-size: 2.2rem; line-height: 1;
          box-shadow: 0 4px 15px rgba(251, 191, 36, 0.4);
          animation: giftPulse 2s infinite; cursor: pointer; transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes giftPulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(251, 191, 36, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
        }
        .avista-gift-btn:hover { transform: scale(1.1) rotate(5deg); filter: brightness(1.1); }
        .avista-in-video-tabs {
           position: absolute;
           bottom: 10px;
           left: 0; right: 0;
           display: flex;
           justify-content: center;
           align-items: center;
           z-index: 1000; /* Reduzido radicalmente para não cobrir a live do Portal */
           pointer-events: auto;
        }
        .live-plus-icon {
           position: absolute; bottom: 8px; right: 8px; font-weight: 900; font-size: 1.2rem; line-height: 1; text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }
        .avista-tabs-central {
           display: flex; gap: 2rem; align-items: center;
           background: radial-gradient(circle, rgba(0,0,0,0.4) 0%, transparent 80%);
           padding: 10px 40px; border-radius: 50%;
        }
        .avista-tab-btn {
           background: transparent; border: none;
           color: rgba(255,255,255,0.7);
           font-size: 1.15rem; font-weight: 900; cursor: pointer;
           transition: all 0.2s;
           position: relative;
           text-shadow: 0 2px 8px rgba(0,0,0,0.9), 0 0 4px #000;
           letter-spacing: 1px;
        }
        .avista-tab-btn.active {
           color: #fff; text-shadow: 0 0 15px rgba(255,255,255,0.4), 0 2px 8px rgba(0,0,0,0.9), 0 0 4px #000;
           font-size: 1.25rem;
        }
        .avista-tab-btn.active::after {
           content: ''; position: absolute; bottom: -8px; left: 35%; right: 35%;
           height: 3px; background: #fff; border-radius: 2px;
           box-shadow: 0 0 5px #fff;
        }
        .live-indicator-dot {
           width: 8px; height: 8px; background: #ef4444; border-radius: 50%;
           position: absolute; top: -2px; right: -12px;
           animation: pulse 1.5s infinite;
           box-shadow: 0 0 8px #ef4444;
        }
      `}</style>

      {/* Painel de Análise do Criador */}
      {showAnalysis && (
        <VideoAnalysisModal 
          post={showAnalysis}
          initialTab={showAnalysisTab}
          onClose={() => { setShowAnalysis(null); }}
          onViewProfile={onViewProfile}
          session={session}
        />
      )}

      {showStats && (
        <VideoStatsModal
          post={showStats}
          onClose={() => setShowStats(null)}
        />
      )}

      {giftTarget && session?.user?.id && (
        <GiftPanel 
          recipientId={giftTarget.user_id}
          recipientName={giftTarget.profiles?.username || 'cria'}
          postId={giftTarget.id}
          postType="avista_post"
          senderId={session.user.id}
          onClose={() => setGiftTarget(null)}
          onGiftSent={(gift) => handleGiftSent(giftTarget, gift)}
        />
      )}

      {/* ANIMAÇÃO DE VÍDEO FULLSCREEN (Fênix, Leão, Ultra) */}
      {bigGiftAnim && (
        <GiftAnimationOverlay
          gift={bigGiftAnim.gift}
          recipientName={bigGiftAnim.username}
          onComplete={() => setBigGiftAnim(null)}
        />
      )}

      {showSetupLive && (
        <SetupLiveModal 
          session={session}
          onClose={() => setShowSetupLive(false)}
          onStartLive={(liveData) => {
             setShowSetupLive(false);
             // Abre o LiveRoom como host diretamente sem reload
             setHostLive(liveData);
             setCurrentTab('lives');
          }}
        />
      )}

      {/* LIVE ROOM DO HOST (quando o criador inicia a própria live) */}
      {hostLive && session && (
        <LiveRoom
          session={session}
          role="host"
          room={hostLive}
          inline={false}
          onClose={() => {
            setHostLive(null);
            fetchActiveLives(true);
          }}
        />
      )}

      {/* MODAL DE COMPARTILHAMENTO (AMIGOS E EXTERNO) */}
      {showShareModal && (
        <ShareModal 
          post={showShareModal}
          friends={followingList}
          onClose={() => setShowShareModal(null)}
          onShareInternal={(uId) => shareInternally(uId, showShareModal)}
          onShareExternal={() => handleExternalShare(showShareModal)}
        />
      )}
    </>
  );
}

// ── COMPONENTE: VideoAnalysisModal ──────────────────────────────────────

function VideoAnalysisModal({ post, onClose, onViewProfile, initialTab }: { post: any, onClose: () => void, session?: any, onViewProfile?: (u: string) => void, initialTab?: 'ranking' | 'likes' }) {
  const [tab, setTab] = useState<'ranking' | 'likes'>(initialTab || 'ranking');
  const [ranking, setRanking] = useState<any[]>([]);
  const [likers, setLikers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMoral, setTotalMoral] = useState(0);

  useEffect(() => {
    loadAnalysisData();
  }, [post.id]);

  async function loadAnalysisData() {
    setLoading(true);
    const [{ data: giftRanking }, { data: listLikers }] = await Promise.all([
      supabase
        .from('gift_transactions')
        .select(`
          sender_id,
          gift_price,
          profiles:sender_id (username, avatar_url)
        `)
        .eq('post_id', post.id),
      supabase
        .from('avista_likes')
        .select(`
          user_id,
          profiles:user_id (username, avatar_url)
        `)
        .eq('avista_id', post.id)
        .order('created_at', { ascending: false })
    ]);

    // Processar Ranking: Agrupar por sender_id
    if (giftRanking) {
      const groupedMap = giftRanking.reduce((acc: any, curr: any) => {
        const sid = curr.sender_id;
        if (!acc[sid]) {
          acc[sid] = {
            id: sid,
            username: curr.profiles?.username || 'cria',
            avatar: curr.profiles?.avatar_url,
            total: 0
          };
        }
        acc[sid].total += curr.gift_price;
        return acc;
      }, {});

      const rankingArray = Object.values(groupedMap).sort((a: any, b: any) => b.total - a.total);
      setRanking(rankingArray);

      // Calcular total real de moral recebido
      const total = giftRanking.reduce((sum: number, curr: any) => sum + (curr.gift_price || 0), 0);
      setTotalMoral(total);
    }

    if (listLikers) setLikers(listLikers);
    setLoading(false);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200000,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 480,
          background: 'linear-gradient(180deg, #111118 0%, #0a0a0f 100%)',
          borderRadius: '24px 24px 0 0',
          border: '1px solid rgba(255,255,255,0.07)',
          borderBottom: 'none',
          maxHeight: '82vh',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.6)',
          animation: 'slideUpSheet 0.35s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)', margin: '14px auto 0' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem 0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Trophy size={22} color="var(--primary)" />
            <span style={{ fontWeight: 900, fontSize: '1.1rem', color: '#fff' }}>Análise do Vídeo</span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.07)', border: 'none', color: '#fff', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {/* Stats resumo */}
        <div style={{ display: 'flex', gap: '0.8rem', padding: '0.8rem 1.5rem' }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: '0.8rem 1rem', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary)', fontFamily: 'Outfit' }}>
              {totalMoral.toLocaleString('pt-BR')}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginTop: 2 }}>Moral Ganho</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: '0.8rem 1rem', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#f472b6', fontFamily: 'Outfit' }}>
              {(post.likes_count || 0).toLocaleString('pt-BR')}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginTop: 2 }}>Curtidas</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: '0.8rem 1rem', border: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#38bdf8', fontFamily: 'Outfit' }}>
              {(post.views_count || 0).toLocaleString('pt-BR')}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginTop: 2 }}>Views</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', padding: '0 1.5rem 0.8rem' }}>
          {(['ranking', 'likes'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '0.6rem', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.8rem', transition: 'all 0.2s',
              background: tab === t ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
              color: tab === t ? '#fff' : 'rgba(255,255,255,0.35)',
              borderBottom: tab === t ? '2px solid var(--primary)' : '2px solid transparent',
            }}>
              {t === 'ranking' ? '🏆 Donatários' : '❤️ Curtidas'}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem 2rem' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
              <Loader2 className="animate-spin" color="var(--primary)" size={28} />
            </div>
          ) : tab === 'ranking' ? (
            ranking.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '2rem', fontWeight: 700 }}>
                🎁 Ninguém mandou presente ainda. Segura firme!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {ranking.map((user, i) => (
                  <div
                    key={user.id}
                    onClick={() => onViewProfile?.(user.username)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.7rem 0.8rem',
                      borderRadius: 14, cursor: 'pointer',
                      background: i === 0 ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.02)',
                      border: i === 0 ? '1px solid rgba(251,191,36,0.2)' : '1px solid rgba(255,255,255,0.04)',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ width: 28, textAlign: 'center', fontWeight: 900, fontSize: i === 0 ? '1rem' : '0.75rem', color: i === 0 ? '#fbbf24' : 'rgba(255,255,255,0.3)' }}>
                      {i === 0 ? '👑' : `#${i + 1}`}
                    </div>
                    <img
                      src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                      style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: i === 0 ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.1)' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>@{user.username}</div>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>doou {user.total.toLocaleString('pt-BR')} Moral</div>
                    </div>
                    {i === 0 && <span style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: '#000', fontSize: '0.6rem', fontWeight: 900, padding: '3px 8px', borderRadius: 20 }}>TOP 1</span>}
                  </div>
                ))}
              </div>
            )
          ) : (
            likers.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '2rem', fontWeight: 700 }}>
                ❤️ Nenhum like ainda. Solta o papo!
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {likers.map((like) => (
                  <div
                    key={like.user_id}
                    onClick={() => onViewProfile?.(like.profiles?.username)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.6rem 0.8rem', borderRadius: 12, cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <img src={like.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${like.user_id}`} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                    <span style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem' }}>@{like.profiles?.username || 'cria'}</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ── COMPONENTE: VideoStatsModal ─────────────────────────────────────────────
function VideoStatsModal({ post, onClose }: { post: any, onClose: () => void }) {
  return (
    <div className="avista-analysis-overlay" onClick={onClose}>
      <div className="avista-analysis-modal" onClick={e => e.stopPropagation()}>
        <div className="analysis-header">
          <div className="analysis-title">
            <BarChart2 size={22} color="var(--primary)" />
            <h3>Desempenho do Vídeo</h3>
          </div>
          <button className="analysis-close" onClick={onClose}><X size={24} /></button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '1rem 0' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
            <Heart size={24} color="#ef4444" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff' }}>{(post.likes_count || 0).toLocaleString()}</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase', marginTop: '2px' }}>Curtidas</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
            <Eye size={24} color="#38bdf8" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff' }}>{(post.views_count || 0).toLocaleString()}</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase', marginTop: '2px' }}>Visualizações</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
            <MessageCircle size={24} color="#a78bfa" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff' }}>{(post.comments_count || 0).toLocaleString()}</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase', marginTop: '2px' }}>Comentários</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem', textAlign: 'center' }}>
            <Trophy size={24} color="#fbbf24" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fbbf24' }}>{(post.moral_received || 0).toLocaleString()}</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase', marginTop: '2px' }}>Moral Recebida</div>
          </div>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '0.5rem' }}>
          Para ver doadores e quem curtiu, toque em 🎁
        </p>
      </div>
    </div>
  );
}

// ── COMPONENTE: RankingBottomSheet com gestos de drag ───────────────────────
function RankingBottomSheet({ onClose, onViewProfile }: { onClose: () => void; onViewProfile: (u: string) => void }) {
  // O sheet tem altura fixa de 92vh. Controlamos com translateY:
  //   translateY(42vh)  → aparece ocupando 50vh (metade)
  //   translateY(0)     → aparece ocupando 92vh (tela cheia)
  //   translateY(92vh)  → fora da tela (fechado)

  const SHEET_H = 92;   // altura do sheet em vh
  const HALF_Y  = 42;   // translateY para mostrar 50vh
  const FULL_Y  = 0;    // translateY para fullscreen
  const CLOSE_Y = SHEET_H; // fora da tela

  const [ty, setTy]         = useState(CLOSE_Y);  // começa fora
  const [dragging, setDragging] = useState(false);
  const tyRef   = useRef(CLOSE_Y);
  const dragRef = useRef<{ startY: number; startTy: number } | null>(null);

  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  // Entrada: anima de CLOSE → HALF em dois frames (garante transição CSS)
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        tyRef.current = HALF_Y;
        setTy(HALF_Y);
      });
    });
    return () => cancelAnimationFrame(id);
  }, []);

  function commitTy(newTy: number) {
    tyRef.current = newTy;
    setTy(newTy);
  }

  function snapAfterDrag() {
    const t = tyRef.current;
    if (t > SHEET_H * 0.55) {
      // Fechar: vai pra baixo e desmonta
      commitTy(CLOSE_Y);
      setTimeout(onClose, 360);
    } else if (t > (HALF_Y + FULL_Y) / 2) {
      // Voltar para metade
      commitTy(HALF_Y);
    } else {
      // Expandir para cheio
      commitTy(FULL_Y);
    }
  }

  // ── Touch ─────────────────────────────────────────────────────
  const touchRef = useRef<{ startY: number; startTy: number } | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    touchRef.current = { startY: e.touches[0].clientY, startTy: tyRef.current };
    setDragging(true);
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (!touchRef.current) return;
    // dy positivo = dedo vai para baixo (sheet desce = ty aumenta)
    const dy = e.touches[0].clientY - touchRef.current.startY;
    const newTy = Math.min(CLOSE_Y, Math.max(FULL_Y - 2, touchRef.current.startTy + (dy / vh) * 100));
    commitTy(newTy);
  }
  function handleTouchEnd() {
    touchRef.current = null;
    setDragging(false);
    snapAfterDrag();
  }

  // ── Mouse ─────────────────────────────────────────────────────
  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    const start = { startY: e.clientY, startTy: tyRef.current };
    dragRef.current = start;
    setDragging(true);
    const onMove = (ev: MouseEvent) => {
      const dy = ev.clientY - start.startY;
      const newTy = Math.min(CLOSE_Y, Math.max(FULL_Y - 2, start.startTy + (dy / vh) * 100));
      commitTy(newTy);
    };
    const onUp = () => {
      dragRef.current = null;
      setDragging(false);
      snapAfterDrag();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function handleClose() {
    commitTy(CLOSE_Y);
    setTimeout(onClose, 360);
  }

  const isFull = ty < (HALF_Y + FULL_Y) / 2;
  const opacity = Math.max(0, Math.min(0.5, (CLOSE_Y - ty) / CLOSE_Y * 0.7));
  const easing = 'cubic-bezier(0.25, 1, 0.5, 1)';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', 
          inset: 0, 
          zIndex: 99999999, 
          background: `rgba(0,0,0,${opacity.toFixed(2)})`,
          backdropFilter: ty < CLOSE_Y * 0.9 ? 'blur(3px)' : 'none',
          WebkitBackdropFilter: ty < CLOSE_Y * 0.9 ? 'blur(3px)' : 'none',
          transition: dragging ? 'none' : `background 0.36s ${easing}`,
        }}
      />

      {/* Sheet fixo em 92vh, movido com translateY */}
      <div
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          height: `${SHEET_H}vh`,
          zIndex: 100000000,
          transform: `translateY(${ty}vh)`,
          transition: dragging ? 'none' : `transform 0.36s ${easing}`,
          background: 'rgba(8,8,18,0.92)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          borderTop: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '22px 22px 0 0',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 -10px 50px rgba(0,0,0,0.7)',
          willChange: 'transform',
        }}
      >
        {/* Handle */}
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          style={{
            padding: '14px 0 10px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '7px',
            cursor: dragging ? 'grabbing' : 'grab',
            flexShrink: 0, userSelect: 'none', touchAction: 'none',
          }}
        >
          <div style={{ width: '44px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.3)' }} />
          <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            {isFull ? '↓ encolher' : '↑ expandir'}
          </span>
        </div>

        {/* Conteúdo rolável */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem 2rem', overscrollBehavior: 'contain' }}>
          <MoralRanking onViewProfile={onViewProfile} />
        </div>
      </div>
    </>
  );
}

// ── COMPONENTE: ShareModal ──────────────────────────────────────
function ShareModal({ post, friends, onClose, onShareInternal, onShareExternal }: { 
  post: any, 
  friends: any[], 
  onClose: () => void, 
  onShareInternal: (uid: string) => void,
  onShareExternal: () => void
}) {
  const [search, setSearch] = useState('');
  
  const filteredFriends = friends.filter(f => 
    f.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div 
      className="avista-share-modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300000,
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
      }}
    >
      <div 
        className="avista-share-modal"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: '480px', background: '#111118',
          borderRadius: '24px 24px 0 0', border: '1px solid rgba(255,255,255,0.1)',
          padding: '1.5rem', maxHeight: '80vh', display: 'flex', flexDirection: 'column'
        }}
      >
        <div style={{ width: 40, height: 4, background: 'rgba(255,255,255,0.2)', borderRadius: 2, margin: '0 auto 1.5rem' }} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 900 }}>Compartilhar</h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', borderRadius: '50%', width: 32, height: 32 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <Search size={18} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
          <input 
            type="text" 
            placeholder="Pesquisar amigos..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px', padding: '10px 15px 10px 40px', color: '#fff', fontSize: '0.9rem'
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem', minHeight: '200px' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginBottom: '1rem', textTransform: 'uppercase' }}>
            Amigos que você saca
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredFriends.length === 0 ? (
              <p style={{ textAlign: 'center', opacity: 0.5, fontSize: '0.9rem', padding: '1rem' }}>Ninguém encontrado 😕</p>
            ) : (
              filteredFriends.map(friend => (
                <div key={friend.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img src={friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.id}`} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                    <span style={{ fontWeight: 700 }}>@{friend.username}</span>
                  </div>
                  <button 
                    onClick={() => onShareInternal(friend.id)}
                    style={{ background: 'var(--primary)', border: 'none', color: '#fff', padding: '6px 15px', borderRadius: '20px', fontWeight: 800, fontSize: '0.75rem' }}
                  >
                    ENVIAR
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <button 
          onClick={onShareExternal}
          style={{
            width: '100%', background: '#fff', color: '#000', border: 'none',
            borderRadius: '12px', padding: '12px', fontWeight: 900, display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}
        >
          <Send size={18} />
          OUTROS / COPIAR LINK
        </button>
      </div>
    </div>
  );
}


