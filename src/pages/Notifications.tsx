import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Bell, 
  UserPlus, 
  Heart, 
  MessageCircle, 
  AlertCircle, 
  Loader2,
  Trash2,
  Clock,
  MessageSquare,
  Sparkles,
  ChevronLeft,
  Video
} from 'lucide-react';

export function Notifications({ userId, onBack }: { userId: string, onBack: () => void }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    markAsRead(); // Marcar todas como lidas ao entrar

    // --- REALTIME: Escuta novas notificações chegando ---
    const channel = supabase
      .channel(`new-notifications-${userId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${userId}` 
      }, async (payload) => {
        // Buscar dados do perfil do remetente para a nova notificação
        const { data: userData } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', payload.new.from_user_id)
          .single();
        
        const newNotif = { ...payload.new, from_user: userData };
        setNotifications(prev => [newNotif, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function fetchNotifications() {
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        from_user:profiles!from_user_id(username, avatar_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar notificações:', error);
    } else {
      setNotifications(data || []);
    }
    setLoading(false);
  }

  async function markAsRead() {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
  }

  async function deleteNotification(notifObj: any, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    if (notifObj.isGroup) {
      const ids = notifObj.items.map((i: any) => i.id);
      const { error } = await supabase.from('notifications').delete().in('id', ids);
      if (!error) {
        setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
      }
    } else {
      const { error } = await supabase.from('notifications').delete().eq('id', notifObj.id);
      if (!error) {
        setNotifications(prev => prev.filter(n => n.id !== notifObj.id));
      }
    }
  }

  const handleNotifClick = (notif: any) => {
    // 1. Mark as read immediately in the DB if not read
    if (!notif.read) {
       supabase.from('notifications').update({ read: true }).eq('id', notif.id).then();
       setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    }

    // 2. Dispatch events
    const t = notif.type;
    if (t === 'status_tag') {
        window.dispatchEvent(new CustomEvent('handleNotificationAction', { detail: notif }));
    } else if (t && t.includes('avista')) {
        window.dispatchEvent(new CustomEvent('handleNotificationAction', { detail: notif }));
    } else if (t === 'like' || t === 'comment' || t === 'post_like' || t === 'post_comment') {
        window.dispatchEvent(new CustomEvent('handleNotificationAction', { detail: notif }));
    } else if (t === 'live') {
        window.dispatchEvent(new CustomEvent('handleNotificationAction', { detail: notif }));
    }
  };

  const groupNotifications = (notifs: any[]) => {
    const groups: any[] = [];
    const map = new Map();

    notifs.forEach(notif => {
      // Agrupar apenas curtidas e comentários do mesmo post
      if (notif.post_id && notif.type && (notif.type.includes('like') || notif.type.includes('comment'))) {
        const key = `${notif.post_id}-${notif.type}`;
        if (map.has(key)) {
          const group = map.get(key);
          group.items.push(notif);
          // Adiciona usuário único à lista do grupo
          if (notif.from_user && !group.users.some((u: any) => u.username === notif.from_user.username)) {
            group.users.push(notif.from_user);
          }
        } else {
          const group = {
            id: notif.id,
            post_id: notif.post_id,
            type: notif.type,
            isGroup: true,
            items: [notif],
            users: notif.from_user ? [notif.from_user] : [],
            read: notif.read,
            created_at: notif.created_at,
          };
          map.set(key, group);
          groups.push(group);
        }
      } else {
        groups.push(notif);
      }
    });
    return groups;
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'follow': return <UserPlus size={20} className="text-primary" />;
      case 'like': return <Heart size={20} style={{color: '#ef4444'}} />;
      case 'post_like': return <Heart size={20} style={{color: '#ef4444'}} />; // Fallback para Community.tsx
      case 'comment': return <MessageCircle size={20} style={{color: '#3b82f6'}} />;
      case 'post_comment': return <MessageCircle size={20} style={{color: '#3b82f6'}} />; // Fallback para Community.tsx
      case 'message': return <MessageSquare size={20} style={{color: 'var(--primary)'}} />;
      case 'status_like': return <Heart size={20} fill="currentColor" style={{color: 'var(--primary)'}} />;
      case 'avista_like': return <Heart size={20} style={{color: 'var(--primary)'}} />;
      case 'avista_comment': return <MessageCircle size={20} style={{color: 'var(--primary)'}} />;
      case 'gift_received': return <Sparkles size={20} style={{color: '#facc15'}} />;
      case 'creator_approved': return <Sparkles size={20} style={{color: '#facc15'}} />;
      case 'creator_rejected': return <AlertCircle size={20} style={{color: '#ef4444'}} />;
      case 'live': return <Video size={20} style={{color: '#10b981'}} />;
      default: return <AlertCircle size={20} className="text-secondary" />;
    }
  };

  const getMessage = (notif: any) => {
    if (notif.isGroup && notif.items?.length > 1) {
      const mainUser = notif.users?.[0]?.username ? `@${notif.users[0].username}` : 'Um cria';
      const extraUsers = (notif.users?.length || 1) - 1;
      
      // Se for apenas o mesmo usuário várias vezes (ex: comentou 3x), mostramos a quantidade de ações
      // Senão mostramos os outros usuários
      let extraText = '';
      if (extraUsers > 0) {
        extraText = ` e mais ${extraUsers} cria${extraUsers > 1 ? 's' : ''}`;
      } else if (notif.items.length > 1 && notif.type && notif.type.includes('comment')) {
        extraText = ` (e deixou ${notif.items.length} coments)`;
      }

      switch (notif.type) {
        case 'like':
        case 'post_like':
          return <span><strong>{mainUser}</strong>{extraText} curtiram seu papo na pista! 🔥</span>;
        case 'comment':
        case 'post_comment':
          return <span><strong>{mainUser}</strong>{extraText} comentaram no seu post! 🎤</span>;
        case 'avista_like':
          return <span><strong>{mainUser}</strong>{extraText} curtiram seu vídeo no AVISTA! 🎥🔥</span>;
        case 'avista_comment':
          return <span><strong>{mainUser}</strong>{extraText} comentaram no seu vídeo AVISTA! 🎤👁️</span>;
        default:
          return <span><strong>{mainUser}</strong> interagiu com seu post!</span>;
      }
    }

    const userObj = notif.isGroup ? notif.users[0] : notif.from_user;
    const name = userObj?.username ? `@${userObj.username}` : 'Um cria';
    switch (notif.type) {
      case 'follow': return <span><strong>{name}</strong> começou a te seguir! 🚀</span>;
      case 'like': 
      case 'post_like': 
        return <span><strong>{name}</strong> curtiu seu papo na pista! 🔥</span>;
      case 'comment': 
      case 'post_comment': 
        return <span><strong>{name}</strong> comentou no seu post! 🎤</span>;
      case 'message': return <span><strong>{name}</strong> te mandou um papo reto no privado! 💬</span>;
      case 'status_like': return <span><strong>{name}</strong> curtiu seu story! 🔥🏙️</span>;
      case 'avista_like': return <span><strong>{name}</strong> curtiu seu vídeo no AVISTA! 🎥🔥</span>;
      case 'avista_comment': return <span><strong>{name}</strong> comentou no seu vídeo AVISTA! 🎤👁️</span>;
      case 'gift_received': return <span><strong>{name}</strong> {notif.message || 'te enviou um presente! 🎁'}</span>;
      case 'creator_approved':
      case 'creator_rejected':
        return <span>{notif.message || 'Atualização no seu status de criador.'}</span>;
      case 'live':
        return <span><strong>{name}</strong> abriu uma LIVE agora! 🔥 Vem fechar com o cria! 🏙️</span>;
      case 'status_tag':
        return <span><strong>{name}</strong> te marcou em um story! 📸🔥</span>;
      default: return <span>{notif.message || 'Nova notificação do sistema.'}</span>;
    }
  };

  if (loading) return <div className="loading-container"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="notifications-page">
      <div className="notifications-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          onClick={onBack}
          style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer' }}
        >
          <ChevronLeft size={28} />
        </button>
        <div>
          <h1 className="logo-text" style={{ margin: 0, fontSize: '1.2rem' }}><Bell size={24} /> NOVIDADES & ALERTAS</h1>
          <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.7 }}>Saiba quem tá fechando contigo na comunidade.</p>
        </div>
      </div>

      <div className="notifications-list">
        {notifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={48} className="icon-pulse" />
            <p>Nenhuma novidade por enquanto, cria... <br/><span>Largue um aço na pista pra atrair os crias!</span></p>
          </div>
        ) : (
          groupNotifications(notifications).map(notif => {
            const displayAvatar = notif.isGroup 
              ? (notif.users?.[0]?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + notif.id)
              : (notif.from_user?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + notif.from_user_id);

            return (
              <div 
                key={notif.id} 
                onClick={() => handleNotifClick(notif)}
                className={`notification-item ${notif.read ? 'read' : 'unread'}`} 
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '1.25rem 1rem', background: notif.read ? 'transparent' : 'rgba(108,43,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.05)', gap: '12px', transition: 'background 0.3s' }}
              >
                
                {/* Lado Esquerdo + Central (Avatar e Textos) */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: 0 }}>
                  <div className="notif-avatar" style={{ position: 'relative', flexShrink: 0 }}>
                     <img 
                      src={displayAvatar} 
                      alt="Remetente" 
                      style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(255,255,255,0.1)', background: '#111' }}
                     />
                     <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', background: '#000', borderRadius: '50%', padding: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {getIcon(notif.type)}
                     </div>
                  </div>
                  
                  <div className="notif-info" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, paddingTop: '2px', minWidth: 0 }}>
                      <div className="notif-text" style={{ fontSize: '0.92rem', lineHeight: 1.4, color: 'rgba(255,255,255,0.9)', wordWrap: 'break-word' }}>
                        {notif.title && (
                          <span style={{ fontWeight: 900, color: '#fff', display: 'block', marginBottom: '2px' }}>
                            {notif.title}
                          </span>
                        )}
                        {getMessage(notif)}
                      </div>
                      <span className="notif-date" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', opacity: 0.5 }}>
                         <Clock size={12} /> {new Date(notif.created_at).toLocaleString()}
                      </span>
                  </div>
                </div>

                {/* Lado Direito (Ações) */}
                <div className="notif-actions" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: '12px', flexShrink: 0 }}>
                  {!notif.read && <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 8px rgba(108,43,255,0.8)' }}></span>}
                  <button onClick={(e) => deleteNotification(notif, e)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '4px', display: 'flex' }}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <div className="notif-footer">
         <p>VELAR: Mantendo você no centro da visão. 🏙️🤙</p>
      </div>
    </div>
  );
}
