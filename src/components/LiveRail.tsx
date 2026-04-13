import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Radio } from 'lucide-react';

interface LiveSession {
  id: string;
  host_id: string;
  title: string;
  host_profile: {
    username: string;
    avatar_url: string;
  };
}

export function LiveRail({ onJoinLive, currentUserId }: { onJoinLive: (live: any) => void; currentUserId?: string }) {
  const [activeLives, setActiveLives] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActiveLives();
    
    const channel = supabase.channel('live_sessions_rail')
      .on(
        'postgres_changes' as any, 
        { event: '*', table: 'live_sessions', schema: 'public' }, 
        () => { fetchActiveLives(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId]);

  async function fetchActiveLives() {
    // Pega lives ativas
    const { data: lives, error } = await supabase
      .from('live_sessions')
      .select('*, host_profile:profiles(username, avatar_url)')
      .eq('is_live', true)
      .is('ended_at', null)
      .order('started_at', { ascending: false });

    if (error || !lives) { setLoading(false); return; }

    // Se tiver usuário logado, filtra apenas os que ele segue
    if (currentUserId) {
      const { data: following } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId);

      const followingIds = new Set((following || []).map((f: any) => f.following_id));
      setActiveLives(lives.filter((l: any) => followingIds.has(l.host_id)));
    } else {
      setActiveLives(lives);
    }

    setLoading(false);
  }

  if (loading || activeLives.length === 0) return null;

  return (
    <div className="elite-live-rail">
      <style>{`
        .elite-live-rail {
          padding: 1.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.05);
          margin-bottom: 1.5rem; animation: slideInContent 0.5s ease-out;
        }
        .elite-rail-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 1.2rem; padding: 0 1rem;
        }
        .header-title-group { display: flex; align-items: center; gap: 8px; }
        .live-indicator-dot { width: 6px; height: 6px; background: #ef4444; border-radius: 50%; box-shadow: 0 0 10px #ef4444; animation: live-pulse-dot 1.5s infinite; }
        .rail-label { font-family: 'Outfit'; font-weight: 900; color: #fff; font-size: 0.85rem; letter-spacing: 0.5px; }
        
        .elite-rail-items {
          display: flex; gap: 1.25rem; overflow-x: auto;
          padding: 0.5rem 1rem 1rem; scrollbar-width: none; -ms-overflow-style: none;
        }
        .elite-rail-items::-webkit-scrollbar { display: none; }
        
        .live-item-card {
          display: flex; flex-direction: column; align-items: center; gap: 10px;
          background: none; border: none; padding: 0; cursor: pointer;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          min-width: 76px;
        }
        .live-item-card:hover { transform: scale(1.08); }
        .live-item-card:hover .medallion-frame { border-color: rgba(255,255,255,0.4); }

        .medallion-container { position: relative; width: 72px; height: 72px; }
        .medallion-frame {
          position: absolute; inset: -4px; border: 2.5px solid rgba(239,68,68,0.3);
          border-radius: 50%; opacity: 0.8; transition: all 0.3s;
          background: radial-gradient(circle, transparent 70%, rgba(239,68,68,0.05) 100%);
        }
        .medallion-ornament {
          position: absolute; inset: -6px; border: 1.5px solid transparent;
          border-top-color: #ef4444; border-bottom-color: #ef4444;
          border-radius: 50%; animation: rotate-ornament 8s linear infinite;
        }
        
        .live-avatar-box {
          width: 100%; height: 100%; border-radius: 50%; padding: 4px;
          background: #000; overflow: hidden; position: relative; z-index: 1;
        }
        .live-avatar-img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
        
        .live-crystal-tag {
          position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%);
          background: #ef4444; color: #fff; font-size: 9px; font-weight: 900;
          padding: 2px 8px; border-radius: 6px; z-index: 2;
          box-shadow: 0 4px 10px rgba(239,68,68,0.4);
          border: 1.5px solid #000; text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          letter-spacing: 0.5px;
        }

        .live-user-handle {
          font-family: 'Outfit'; font-size: 0.75rem; color: #fff; font-weight: 700;
          width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          text-align: center; opacity: 0.8;
        }

        @keyframes rotate-ornament { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes live-pulse-dot { 0% { opacity: 0.4; } 50% { opacity: 1; transform: scale(1.2); } 100% { opacity: 0.4; } }
        @keyframes slideInContent { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="elite-rail-header">
        <div className="header-title-group">
          <div className="live-indicator-dot" />
          <span className="rail-label">AO VIVO AGORA</span>
        </div>
        <div style={{ opacity: 0.3 }}>
          <Radio size={14} color="#fff" />
        </div>
      </div>
      
      <div className="elite-rail-items">
        {activeLives.map((live) => (
          <button 
            key={live.id}
            onClick={() => onJoinLive(live)}
            className="live-item-card"
          >
            <div className="medallion-container">
              <div className="medallion-frame" />
              <div className="medallion-ornament" />
              <div className="live-avatar-box">
                <img 
                  src={live.host_profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${live.host_profile?.username}`} 
                  alt={live.host_profile?.username}
                  className="live-avatar-img"
                />
              </div>
              <div className="live-crystal-tag">LIVE</div>
            </div>
            <span className="live-user-handle">@{live.host_profile?.username.split(' ')[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
