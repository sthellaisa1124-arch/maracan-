import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Loader2, User } from 'lucide-react';
import { UserBadges } from './Badges';

export function UsersListModal({
  title,
  targetUserId,
  mode,
  session,
  onClose,
  onViewProfile
}: {
  title: string;
  targetUserId: string;
  mode: 'followers' | 'following';
  session: any;
  onClose: () => void;
  onViewProfile: (username: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [myFollowingIds, setMyFollowingIds] = useState<Set<string>>(new Set());
  const [myFollowerIds, setMyFollowerIds] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchUsers();
  }, [targetUserId, mode]);

  async function fetchUsers() {
    setLoading(true);
    
    // 1. Fetch current user's relationships first
    const myId = session?.user?.id;
    if (myId) {
      const { data: myFollowingData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', myId);
      
      const { data: myFollowersData } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', myId);

      setMyFollowingIds(new Set((myFollowingData || []).map(r => r.following_id)));
      setMyFollowerIds(new Set((myFollowersData || []).map(r => r.follower_id)));
    }

    // 2. Fetch the target list (followers or following)
    let ids: string[] = [];
    if (mode === 'followers') {
      const { data } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', targetUserId);
      ids = (data || []).map(r => r.follower_id);
    } else {
      const { data } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', targetUserId);
      ids = (data || []).map(r => r.following_id);
    }

    if (ids.length === 0) {
      setUsers([]);
      setLoading(false);
      return;
    }

    // 3. Fetch profiles for those IDs
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, first_name, avatar_url, badges')
      .in('id', ids);

    setUsers(profiles || []);
    setLoading(false);
  }

  async function toggleFollow(userToToggle: string, e: React.MouseEvent) {
    e.stopPropagation();
    const myId = session?.user?.id;
    if (!myId) return;

    setActionLoading(prev => ({ ...prev, [userToToggle]: true }));

    const isFollowing = myFollowingIds.has(userToToggle);

    if (isFollowing) {
      // Unfollow
      const { error } = await supabase
        .from('follows')
        .delete()
        .match({ follower_id: myId, following_id: userToToggle });
      
      if (!error) {
        setMyFollowingIds(prev => {
          const next = new Set(prev);
          next.delete(userToToggle);
          return next;
        });
      }
    } else {
      // Follow
      const { error } = await supabase
        .from('follows')
        .insert({ follower_id: myId, following_id: userToToggle });
      
      if (!error) {
        setMyFollowingIds(prev => {
          const next = new Set(prev);
          next.add(userToToggle);
          return next;
        });

        supabase.from('notifications').insert({
          user_id: userToToggle,
          from_user_id: myId,
          type: 'follow'
        }).then();
      }
    }
    setActionLoading(prev => ({ ...prev, [userToToggle]: false }));
  }

  function getButtonState(userId: string) {
    const isMe = userId === session?.user?.id;
    if (isMe) return null;

    const followThem = myFollowingIds.has(userId);
    const theyFollowMe = myFollowerIds.has(userId);

    if (followThem && theyFollowMe) {
      return { label: 'Amigos', bg: 'rgba(255,255,255,0.1)', color: '#fff' };
    } else if (followThem) {
      return { label: 'Seguindo', bg: 'rgba(255,255,255,0.1)', color: '#fff' };
    } else if (theyFollowMe) {
      return { label: 'Seguidor', bg: 'var(--primary)', color: '#000' };
    } else {
      return { label: 'Seguir', bg: 'var(--primary)', color: '#000' };
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.8)',
      backdropFilter: 'blur(10px)',
      zIndex: 999999,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'center',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUpModal { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>

      <div style={{
        background: '#111',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '85vh',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        display: 'flex',
        flexDirection: 'column',
        animation: 'slideUpModal 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.05)'
        }}>
          <h2 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>{title}</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#fff',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
              <Loader2 className="animate-spin" color="var(--primary)" size={32} />
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '3rem 0', fontSize: '0.9rem' }}>
              Nenhum perfil encontrado.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {users.map(u => {
                const btnState = getButtonState(u.id);
                return (
                  <div 
                    key={u.id}
                    onClick={() => {
                       onClose();
                       onViewProfile(u.username);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      padding: '0.5rem',
                      borderRadius: '12px',
                      transition: 'background 0.2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {u.avatar_url ? (
                        <img 
                          src={u.avatar_url} 
                          alt={u.username} 
                          style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} 
                        />
                      ) : (
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={24} color="#fff" />
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                         <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                           {u.username}
                           <UserBadges badges={u.badges} size={14} />
                         </span>
                         <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>
                           {u.first_name || 'Usuário'}
                         </span>
                      </div>
                    </div>

                    {btnState && (
                      <button
                        onClick={(e) => toggleFollow(u.id, e)}
                        disabled={actionLoading[u.id]}
                        style={{
                          background: btnState.bg,
                          color: btnState.color,
                          border: 'none',
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: actionLoading[u.id] ? 'not-allowed' : 'pointer',
                          minWidth: '85px',
                          opacity: actionLoading[u.id] ? 0.7 : 1
                        }}
                      >
                        {actionLoading[u.id] ? <Loader2 size={14} className="animate-spin" /> : btnState.label}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
