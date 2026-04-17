import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Bell, UserPlus, Heart, MessageCircle, AlertCircle, 
  Loader2, Trash2, MessageSquare, Sparkles, 
  ChevronLeft, Video, CheckCheck
} from 'lucide-react';

const isToday = (d: Date) => {
  const today = new Date();
  return d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
};

const isYesterday = (d: Date) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();
};

const isThisWeek = (d: Date) => {
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - d.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  return diffDays > 1 && diffDays <= 7;
};

const getRelativeTime = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `agora`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  const diffDays = Math.floor(diffInSeconds / 86400);
  if (diffDays < 7) return `${diffDays}d`;
  return `${Math.floor(diffDays / 7)}sem`;
};

// ── COMPONENTE DE CARD COM SWIPE ──
function SwipeableNotificationItem({ notif, onClick, onDelete, getIcon, getMessage, displayAvatar }: any) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const MAX_SWIPE = -80; 

  const handleTouchStart = (e: React.TouchEvent) => {
     startX.current = e.touches[0].clientX;
     setIsDragging(true);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
     if (!isDragging) return;
     currentX.current = e.touches[0].clientX;
     const diffX = currentX.current - startX.current;
     if (diffX < 0) {
        setTranslateX(Math.max(diffX, MAX_SWIPE - 20)); // Efeito elástico
     } else {
        setTranslateX(0); // Não arrasta pra direita
     }
  };
  
  const handleTouchEnd = () => {
     setIsDragging(false);
     if (translateX < MAX_SWIPE / 2) {
        setTranslateX(MAX_SWIPE); // Trava aberto
     } else {
        setTranslateX(0); // Retrai
     }
  };

  const handleActualDelete = (e: any) => {
     e.stopPropagation();
     setDeleted(true);
     setTimeout(() => {
        onDelete(notif);
     }, 300);
  };

  if (deleted) {
      return <div style={{ height: 0, opacity: 0, overflow: 'hidden', transition: 'all 0.3s ease-out' }} />;
  }

  const isUnread = (!notif.read && !notif.isGroup) || (notif.isGroup && notif.items?.some((i:any) => !i.read));

  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: '#ef4444', borderRadius: '16px', marginBottom: '8px' }}>
      
      {/* Background (Lixeira) */}
      <div style={{ position: 'absolute', top: 0, right: 0, height: '100%', width: Math.abs(MAX_SWIPE), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
         <button onClick={handleActualDelete} style={{ background: 'transparent', border: 'none', color: '#fff', padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <Trash2 size={24} />
         </button>
      </div>

      {/* Layer Frontal (Card) */}
      <div 
        onClick={translateX === 0 ? () => onClick(notif) : () => setTranslateX(0)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`notification-card ${isUnread ? 'unread' : 'read'}`}
        style={{
           transform: `translateX(${translateX}px)`,
           transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
           background: isUnread ? '#1a1025' : '#0f0f0f',
           position: 'relative',
           zIndex: 1,
           padding: '16px',
           display: 'flex',
           gap: '14px',
           alignItems: 'center',
           cursor: 'pointer',
           borderRadius: '16px',
           boxShadow: isUnread ? '0 4px 20px rgba(168, 85, 247, 0.05)' : 'none',
           border: isUnread ? '1px solid rgba(168, 85, 247, 0.15)' : '1px solid rgba(255,255,255,0.03)'
        }}
      >
        <div className="notif-avatar" style={{ position: 'relative', flexShrink: 0 }}>
             <img 
              src={displayAvatar} 
              alt="Remetente" 
              style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: '#111' }}
             />
             <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: '#000', borderRadius: '50%', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {getIcon(notif.type)}
             </div>
        </div>
        
        <div className="notif-info" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
            <div className="notif-text" style={{ fontSize: '0.95rem', lineHeight: 1.35, color: 'rgba(255,255,255,0.85)', wordWrap: 'break-word', fontFamily: '"Inter", sans-serif' }}>
              {getMessage(notif)}
            </div>
            <span className="notif-date" style={{ fontSize: '0.8rem', color: isUnread ? '#a855f7' : 'rgba(255,255,255,0.4)', fontWeight: isUnread ? 600 : 400 }}>
               {getRelativeTime(notif.created_at)}
            </span>
        </div>

        {/* Unread Indicator e Fallback Lixeira Mobile */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: '8px', flexShrink: 0 }}>
            {isUnread && (
               <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 10px rgba(168, 85, 247, 0.6)' }} />
            )}
            {/* Fallback silencioso pra quem usa mouse ou tem tela grande e não acessa swipe */}
            <Trash2 
              size={18} 
              color="rgba(255,255,255,0.2)" 
              className="fallback-delete-icon" 
              onClick={(e) => { e.stopPropagation(); onDelete(notif); }} 
            />
        </div>
      </div>
    </div>
  )
}

// ── PÁGINA PRINCIPAL ──
export function Notifications({ userId, onBack }: { userId: string, onBack: () => void }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();

    // --- REALTIME: Escuta novas notificações chegando ---
    const channel = supabase
      .channel(`new-notifications-${userId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${userId}` 
      }, async (payload) => {
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
      .select(`*, from_user:profiles!from_user_id(username, avatar_url)`)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setNotifications(data);
    }
    setLoading(false);
  }

  async function markAllAsRead() {
    setNotifications(prev => prev.map(n => ({...n, read: true})));
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
  }

  async function deleteNotification(notifObj: any) {
    if (notifObj.isGroup) {
      const ids = notifObj.items.map((i: any) => i.id);
      await supabase.from('notifications').delete().in('id', ids);
      setNotifications(prev => prev.filter(n => !ids.includes(n.id)));
    } else {
      await supabase.from('notifications').delete().eq('id', notifObj.id);
      setNotifications(prev => prev.filter(n => n.id !== notifObj.id));
    }
  }

  const handleNotifClick = (notif: any) => {
    if (!notif.read && !notif.isGroup) {
       supabase.from('notifications').update({ read: true }).eq('id', notif.id).then();
       setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    } else if (notif.isGroup) {
       const ids = notif.items.filter((i:any) => !i.read).map((i:any) => i.id);
       if (ids.length > 0) {
         supabase.from('notifications').update({ read: true }).in('id', ids).then();
         setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
       }
    }

    const t = notif.type;
    window.dispatchEvent(new CustomEvent('handleNotificationAction', { detail: notif }));
  };

  const groupNotifications = (notifs: any[]) => {
    const groups: any[] = [];
    const map = new Map();

    notifs.forEach(notif => {
      if (notif.post_id && notif.type && (notif.type.includes('like') || notif.type.includes('comment'))) {
        const key = `${notif.post_id}-${notif.type}`;
        if (map.has(key)) {
          const group = map.get(key);
          group.items.push(notif);
          if (notif.from_user && !group.users.some((u: any) => u.username === notif.from_user.username)) {
            group.users.push(notif.from_user);
          }
          group.read = group.read && notif.read;
        } else {
          const group = {
            id: notif.id, post_id: notif.post_id, type: notif.type,
            isGroup: true, items: [notif], users: notif.from_user ? [notif.from_user] : [],
            read: notif.read, created_at: notif.created_at,
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
      case 'follow': return <UserPlus size={16} color="#a855f7" />;
      case 'like': 
      case 'post_like': 
      case 'status_like':
      case 'avista_like': return <Heart size={16} color="#ef4444" fill="#ef4444" />;
      case 'comment': 
      case 'post_comment': 
      case 'avista_comment': return <MessageCircle size={16} color="#3b82f6" fill="#3b82f6" />;
      case 'message': return <MessageSquare size={16} color="#a855f7" />;
      case 'gift_received': return <Sparkles size={16} color="#fbbf24" fill="#fbbf24" />;
      case 'live': return <Video size={16} color="#10b981" fill="#10b981" />;
      case 'status_tag': return <Bell size={16} color="#a855f7" fill="#a855f7" />;
      default: return <AlertCircle size={16} color="#a1a1aa" />;
    }
  };

  const getMessage = (notif: any) => {
    if (notif.isGroup && notif.items?.length > 1) {
      const mainUser = notif.users?.[0]?.username ? `@${notif.users[0].username}` : 'Um cria';
      const extraUsers = (notif.users?.length || 1) - 1;
      let extraText = '';
      if (extraUsers > 0) extraText = ` e mais ${extraUsers} cria${extraUsers > 1 ? 's' : ''}`;
      else if (notif.items.length > 1 && notif.type && notif.type.includes('comment')) extraText = ` (e deixou ${notif.items.length} coments)`;

      switch (notif.type) {
        case 'like':
        case 'post_like': return <span><strong>{mainUser}</strong>{extraText} curtiram seu post!</span>;
        case 'comment':
        case 'post_comment': return <span><strong>{mainUser}</strong>{extraText} comentaram no seu post!</span>;
        case 'avista_like': return <span><strong>{mainUser}</strong>{extraText} curtiram seu vídeo!</span>;
        case 'avista_comment': return <span><strong>{mainUser}</strong>{extraText} comentaram no seu vídeo!</span>;
        default: return <span><strong>{mainUser}</strong> interagiu com você!</span>;
      }
    }

    const userObj = notif.isGroup ? notif.users[0] : notif.from_user;
    const name = userObj?.username ? `@${userObj.username}` : 'Um cria';
    switch (notif.type) {
      case 'follow': return <span><strong>{name}</strong> começou a seguir você.</span>;
      case 'like': 
      case 'post_like': return <span><strong>{name}</strong> curtiu seu post.</span>;
      case 'comment': 
      case 'post_comment': return <span><strong>{name}</strong> comentou no seu post.</span>;
      case 'message': return <span><strong>{name}</strong> enviou uma mensagem privada.</span>;
      case 'status_like': return <span><strong>{name}</strong> curtiu seu story.</span>;
      case 'avista_like': return <span><strong>{name}</strong> curtiu seu vídeo.</span>;
      case 'avista_comment': return <span><strong>{name}</strong> comentou no seu vídeo.</span>;
      case 'gift_received': return <span><strong>{name}</strong> {notif.message || 'enviou um presente!'}</span>;
      case 'creator_approved':
      case 'creator_rejected': return <span>{notif.message || 'Status de criador atualizado.'}</span>;
      case 'live': return <span><strong>{name}</strong> iniciou uma LIVE. Vem ver!</span>;
      case 'status_tag': return <span><strong>{name}</strong> mencionou você em um story.</span>;
      default: return <span>{notif.message || 'Notificação do sistema.'}</span>;
    }
  };

  // Separação em blocos Temporais
  const groupedList = groupNotifications(notifications);
  const byDate = { today: [] as any[], yesterday: [] as any[], week: [] as any[], older: [] as any[] };

  groupedList.forEach(n => {
    const d = new Date(n.created_at);
    if (isToday(d)) byDate.today.push(n);
    else if (isYesterday(d)) byDate.yesterday.push(n);
    else if (isThisWeek(d)) byDate.week.push(n);
    else byDate.older.push(n);
  });

  const renderSection = (title: string, list: any[]) => {
    if (list.length === 0) return null;
    return (
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '0.85rem', color: '#a1a1aa', margin: '0 0 12px 6px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</h3>
        {list.map(notif => {
             const displayAvatar = notif.isGroup 
               ? (notif.users?.[0]?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + notif.id)
               : (notif.from_user?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + notif.from_user_id);

             return (
               <SwipeableNotificationItem 
                 key={notif.id}
                 notif={notif}
                 onClick={handleNotifClick}
                 onDelete={deleteNotification}
                 getIcon={getIcon}
                 getMessage={getMessage}
                 displayAvatar={displayAvatar}
               />
             );
        })}
      </div>
    );
  };

  if (loading) return <div className="loading-container"><Loader2 className="animate-spin" color="#a855f7" /></div>;

  return (
    <div className="notifications-page" style={{ padding: '0 12px', background: '#000', minHeight: '100dvh' }}>
      <div className="notifications-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 8px 24px 4px', position: 'sticky', top: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button 
              onClick={onBack}
              style={{ background: 'transparent', border: 'none', color: '#fff', padding: '4px', cursor: 'pointer' }}
            >
              <ChevronLeft size={28} />
            </button>
            <h1 className="logo-text" style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Notificações</h1>
        </div>
        
        {notifications.some(n => !n.read) && (
            <button onClick={markAllAsRead} style={{ background: 'transparent', border: 'none', color: '#a855f7', cursor: 'pointer' }} title="Marcar tudo como lido">
                <CheckCheck size={24} />
            </button>
        )}
      </div>

      <div className="notifications-list" style={{ paddingBottom: '100px' }}>
        {notifications.length === 0 ? (
          <div className="empty-state" style={{ height: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.6 }}>
            <Bell size={64} color="#a855f7" style={{ marginBottom: '16px', filter: 'drop-shadow(0 0 16px rgba(168,85,247,0.4))' }} />
            <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>Nenhuma notificação</p>
            <span style={{ fontSize: '0.9rem', color: '#a1a1aa' }}>Inicie interações para movimentar sua conta.</span>
          </div>
        ) : (
          <>
            {renderSection('Hoje', byDate.today)}
            {renderSection('Ontem', byDate.yesterday)}
            {renderSection('Esta Semana', byDate.week)}
            {renderSection('Anteriores', byDate.older)}
          </>
        )}
      </div>
    </div>
  );
}
