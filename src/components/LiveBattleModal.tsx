import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Search, Swords, User, Loader2 } from 'lucide-react';

interface LiveBattleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentHostId: string;
  onInvite: (opponent: any) => void;
}

export function LiveBattleModal({ isOpen, onClose, currentHostId, onInvite }: LiveBattleModalProps) {
  const [loading, setLoading] = useState(true);
  const [liveCreators, setLiveCreators] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    fetchLiveOpponents();
  }, [isOpen]);

  async function fetchLiveOpponents() {
    setLoading(true);
    try {
      // Buscar sessão de quem está online agora, exceto o próprio
      const { data, error } = await supabase
        .from('live_sessions')
        .select(`
          id,
          host_id,
          agora_channel,
          title,
          viewer_count,
          profiles:host_id(username, avatar_url, name)
        `)
        .eq('is_live', true)
        .neq('host_id', currentHostId)
        .order('viewer_count', { ascending: false });

      if (data && !error) {
         setLiveCreators(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[2rem] sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-red-600 to-orange-500 p-1.5 rounded-lg">
              <Swords className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-wide">Desafiar para CONFRONTO</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-white/50 animate-spin mb-4" />
              <p className="text-white/50 text-sm">Buscando oponentes ao vivo...</p>
            </div>
          ) : liveCreators.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-white/20" />
              </div>
              <h3 className="text-white font-medium mb-1">Nenhum criador ao vivo</h3>
              <p className="text-white/50 text-sm max-w-[250px]">
                Seus amigos precisam estar em uma transmissão ao vivo para serem desafiados.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {liveCreators.map((creator) => {
                const profile = creator.profiles;
                if (!profile) return null; // Fallback se não der join

                return (
                  <div key={creator.id} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5 hover:border-white/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img 
                          src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.username}`} 
                          alt="Avatar" 
                          className="w-12 h-12 rounded-full object-cover border border-white/10"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-red-500 border-2 border-zinc-900 w-4 h-4 rounded-full flex items-center justify-center">
                           <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-white font-medium text-sm">@{profile.username}</h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                          <span className="text-xs text-white/50">{creator.viewer_count || 0} assistindo</span>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => onInvite(creator)}
                      className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white text-sm font-bold rounded-xl transition-transform active:scale-95 shadow-lg flex flex-col items-center justify-center"
                    >
                      <span>Desafiar</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
