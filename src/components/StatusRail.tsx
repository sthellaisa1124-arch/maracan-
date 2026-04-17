import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Loader2 } from 'lucide-react';

interface StatusGroup {
  user_id: string;
  username: string;
  avatar_url: string;
  status_list: any[];
  all_viewed: boolean;
  is_live?: boolean;
  live_id?: string;
  agora_channel?: string;
  badges?: string[];
  total_donated?: number;
  goal_type?: string;
  goal_title?: string;
  goal_target?: number;
  goal_current?: number;
  goal_gift_id?: string | null;
}

export function StatusRail({ session, profile, onOpenStatus, onOpenCreator }: { session: any, profile: any, onOpenStatus: (group: StatusGroup) => void, onOpenCreator?: () => void }) {
  const [groups, setGroups] = useState<StatusGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = session?.user?.id;

  useEffect(() => {
    fetchStatus();
  }, [userId]);

  async function fetchStatus() {
    setLoading(true);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 1. Buscar lives ativas (Prioridade 1)
    const { data: lives } = await supabase
      .from('live_sessions')
      .select('*, host_profile:profiles(username, avatar_url, badges, total_donated)')
      .eq('is_live', true)
      .is('ended_at', null);

    let allowedUserIds: string[] = [];
    if (userId) {
       const { data: follows } = await supabase
         .from('follows')
         .select('following_id')
         .eq('follower_id', userId);
       allowedUserIds = (follows?.map(f => f.following_id) || []);
       allowedUserIds.push(userId); // Mostrar os próprios stories
    }

    // 2. Buscar status ativos (24h)
    let statusQuery = supabase
      .from('status_posts')
      .select(`
        *,
        author:user_id(username, avatar_url, badges, total_donated)
      `)
      .gt('created_at', yesterday)
      .order('created_at', { ascending: false });

    if (userId && allowedUserIds.length > 0) {
      statusQuery = statusQuery.in('user_id', allowedUserIds);
    } else {
      // Usuário não logado, não carrega stories
      statusQuery = statusQuery.eq('user_id', '00000000-0000-0000-0000-000000000000');
    }

    const { data: statuses } = await statusQuery;

    // 3. Buscar visualizações do usuário logado
    const { data: views } = await supabase
      .from('status_views')
      .select('status_id')
      .eq('viewer_id', userId);

    const viewedIds = new Set(views?.map(v => v.status_id) || []);
    const userMap = new Map<string, StatusGroup>();

    // Injetar Lives Primeiro
    if (lives) {
      lives.forEach(l => {
        const host = l.host_profile;
        if (host && !userMap.has(l.host_id)) {
          userMap.set(l.host_id, {
            user_id: l.host_id,
            username: host.username,
            avatar_url: host.avatar_url,
            badges: host.badges,
            total_donated: host.total_donated,
            status_list: [],
            all_viewed: false,
            is_live: true,
            live_id: l.id,
            agora_channel: l.agora_channel,
            goal_type: l.goal_type,
            goal_title: l.goal_title,
            goal_target: l.goal_target,
            goal_current: l.goal_current,
            goal_gift_id: l.goal_gift_id
          });
        }
      });
    }

    if (statuses) {
      statuses.forEach(s => {
        if (!userMap.has(s.user_id)) {
          userMap.set(s.user_id, {
            user_id: s.user_id,
            username: s.author.username,
            avatar_url: s.author.avatar_url,
            badges: s.author.badges,
            total_donated: s.author.total_donated,
            status_list: [],
            all_viewed: true
          });
        }
        const group = userMap.get(s.user_id)!;
        group.status_list.push(s);
        
        if (!viewedIds.has(s.id)) {
          group.all_viewed = false;
        }
      });
    }

    setGroups(Array.from(userMap.values()));
    setLoading(false);
  }

  return (
    <div className="status-rail-container-urban">
      <div className="status-rail-scroll">
        {/* Botão de Adicionar Meu Status (Primeira Bolinha) */}
        <div className="status-item-urban creator" onClick={() => onOpenCreator?.()}>
          <div className="status-avatar-ring-urban creator">
             <img 
              src={profile?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + userId} 
              alt="Meu Avatar" 
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "https://api.dicebear.com/7.x/avataaars/svg?seed=" + userId;
              }}
            />
            <div className="plus-badge-gold"><Plus size={16} strokeWidth={3} /></div>
          </div>
          <span>Soltar</span>
        </div>

        {loading ? (
          <div className="status-rail-loading"><Loader2 className="animate-spin" color="var(--primary)" /></div>
        ) : (
          groups.map(group => (
            <div 
              key={group.user_id} 
              className={`status-item-urban ${group.is_live ? 'is-live' : (group.all_viewed ? 'viewed' : 'unviewed')}`}
              onClick={() => onOpenStatus(group)}
            >
              <div className={`status-avatar-ring-urban ${group.is_live ? 'live-neon' : (group.all_viewed ? '' : 'gold-gradient')}`}>
                <img 
                  src={group.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + group.user_id} 
                  alt={group.username} 
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "https://api.dicebear.com/7.x/avataaars/svg?seed=" + group.user_id;
                  }}
                />
                {group.is_live && <div className="live-badge-mini">AO VIVO</div>}
              </div>
              <span>@{group.username}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
