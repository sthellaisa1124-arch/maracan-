import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Auth } from './pages/Auth';
import { Chat } from './pages/Chat';
import { Admin } from './pages/Admin';
import { Profile } from './pages/Profile';
import { Notifications } from './pages/Notifications';
import { Community } from './pages/Community';
import { DirectChat } from './pages/DirectChat';
import { Avista } from './pages/Avista';
import { AvistaCreator } from './components/AvistaCreator';
import { MoralRanking } from './components/MoralRanking';
import { LiveRoom } from './components/LiveRoom';
import { LiveRail } from './components/LiveRail';
import { SetupLiveModal } from './components/SetupLiveModal';
import type { Session } from '@supabase/supabase-js';
import { 
  MessageSquare, LogOut, User, Bell, Hash, Search, 
  MessageCircle, Plus, Eye, Video, Home, Star, Shield, X, Users, Radio
} from 'lucide-react';

type TabType = 'chat' | 'profile' | 'admin' | 'notifications' | 'community' | 'messages' | 'avista';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('community');
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [viewingUsername, setViewingUsername] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isAvistaModalOpen, setIsAvistaModalOpen] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [activeLiveRoom, setActiveLiveRoom] = useState<any>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [isSetupLiveOpen, setIsSetupLiveOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession) {
        fetchUserProfile(initialSession.user.id);
        fetchUnreadCount(initialSession.user.id);
        checkActiveLive(initialSession.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription: authSubs } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (newSession) {
        fetchUserProfile(newSession.user.id);
        fetchUnreadCount(newSession.user.id);
        if (!activeLiveRoom) {
          checkActiveLive(newSession.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setIsAdmin(false);
        setUserProfile(null);
        setUnreadCount(0);
        setActiveLiveRoom(null);
      }
      setLoading(false);
    });

    return () => {
      authSubs.unsubscribe();
    };
  }, []);

  async function fetchUserProfile(userId: string) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (data) {
        setUserProfile(data);
        setIsAdmin(!!data.is_admin && data.account_role === 'ceo');
      }
    } catch (err) {
      console.error("Erro perfil:", err);
    }
  }

  async function checkActiveLive(userId: string) {
    if (!userId) return;
    
    const saved = localStorage.getItem('VELAR_ACTIVE_LIVE');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (activeLiveRoom && activeLiveRoom.id === parsed.id) return;
        setActiveLiveRoom(parsed);
        return;
      } catch (e) { localStorage.removeItem('VELAR_ACTIVE_LIVE'); }
    }

    try {
      const { data } = await supabase
        .from('live_sessions')
        .select(`*, host_profile:profiles(username, avatar_url, badges, total_donated)`)
        .eq('host_id', userId)
        .eq('is_live', true)
        .is('ended_at', null)
        .maybeSingle();
      
      if (data) {
        setActiveLiveRoom(data);
        localStorage.setItem('VELAR_ACTIVE_LIVE', JSON.stringify(data));
      } else {
        if (!localStorage.getItem('VELAR_ACTIVE_LIVE')) {
          setActiveLiveRoom(null);
        }
      }
    } catch (err) {
      console.error("Erro check live:", err);
    }
  }

  async function fetchUnreadCount(userId: string) {
    const { data } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('read', false);
    
    setUnreadCount(data?.length || 0);
  }

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url, id')
      .ilike('username', `%${query}%`)
      .limit(5);
    setSearchResults(data || []);
  }

  function onViewProfile(username: string) {
    setViewingUsername(username);
    setActiveTab('profile');
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  }

  const handleTabChange = (newTab: TabType) => {
    setActiveTab(newTab);
    setViewingUsername(null);
  };

  // ── RENDERIZAÇÃO ──────────────────────────────────────────────
  return (
    <>
      {loading ? (
        <div className="loading-container">
          <div className="loader"></div>
          <p style={{ color: 'var(--primary)', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', fontSize: '0.8rem', marginTop: '1rem', opacity: 0.8 }}>
            VELAR ESTÁ CHEGANDO...
          </p>
        </div>
      ) : !session ? (
        <Auth />
      ) : (
        <>
          {/* ── LAYOUT PRINCIPAL ── */}
          <div className={`dashboard-layout ${(activeTab as string) === 'avista' ? 'is-avista' : ''}`}>

            {/* Sidebar Desktop (oculta no mobile via CSS) */}
            {(activeTab as string) !== 'avista' && (
              <aside className="sidebar">
                <div className="logo-container">
                  <span className="velar-logo">VELAR</span>
                </div>
                <nav className="sidebar-nav">
                  <button className={`nav-item-urban ${activeTab === 'community' ? 'active' : ''}`} onClick={() => handleTabChange('community')}>
                    <Hash size={24} /><span>Vellar</span>
                  </button>
                  <button className={`nav-item-urban ${activeTab === 'avista' ? 'active' : ''}`} onClick={() => handleTabChange('avista')}>
                    <Eye size={24} /><span>AVISTA 👁️</span>
                  </button>
                  <button className={`nav-item-urban ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => handleTabChange('messages')}>
                    <MessageCircle size={24} /><span>Mensagens</span>
                  </button>
                  <button className={`nav-item-urban ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => handleTabChange('chat')}>
                    <MessageSquare size={24} /><span>Chat Carioca</span>
                  </button>
                  <button className={`nav-item-urban ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => handleTabChange('notifications')}>
                    <Bell size={24} /><span>Notificações</span>
                  </button>
                  <button className={`nav-item-urban ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => handleTabChange('profile')}>
                    <User size={24} /><span>Meu Perfil</span>
                  </button>
                  {isAdmin && (
                    <button className={`nav-item-urban ${activeTab === 'admin' ? 'active' : ''}`} onClick={() => handleTabChange('admin')}>
                      <Shield size={24} /><span>Gabinete CEO</span>
                    </button>
                  )}
                </nav>
                <div className="sidebar-footer">
                  <button className="btn-logout-urban" onClick={() => supabase.auth.signOut()}>
                    <LogOut size={18} /><span>SAIR FORA</span>
                  </button>
                </div>
              </aside>
            )}

            {/* Conteúdo principal */}
            <main className="main-content">
              {showSearch && (
                <div className="search-overlay-urban animate-fade-in">
                  <div className="search-bar-urban">
                    <Search size={20} color="var(--primary)" />
                    <input placeholder="Buscar crias..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} autoFocus />
                    <X size={20} onClick={() => setShowSearch(false)} style={{ cursor: 'pointer' }} />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="search-results-urban">
                      {searchResults.map(res => (
                        <div key={res.id} className="search-result-item" onClick={() => onViewProfile(res.username)}>
                          <img src={res.avatar_url || '/default-avatar.png'} alt="avatar" />
                          <span>@{res.username}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className={`feed-container-urban ${activeTab !== 'avista' ? 'animate-fade-up' : ''}`}>
                {activeTab === 'community' && (
                  <Community
                    profile={userProfile}
                    session={session}
                    unreadCount={unreadCount}
                    onViewProfile={onViewProfile}
                    onTabChange={(tab: any) => handleTabChange(tab)}
                    onJoinLive={(live) => setActiveLiveRoom(live)}
                  />
                )}
                {activeTab === 'chat' && <Chat userProfile={userProfile} />}
                {activeTab === 'avista' && (
                  <Avista session={session} onViewProfile={onViewProfile} onBackToCommunity={() => handleTabChange('community')} />
                )}
                {activeTab === 'profile' && (
                  <Profile
                    session={session}
                    userProfile={userProfile}
                    viewingUsername={viewingUsername}
                    onBackToMyProfile={() => setViewingUsername(null)}
                    onStartChat={(user) => { setViewingUsername(user); handleTabChange('messages'); }}
                    onTabChange={(tab: any) => handleTabChange(tab)}
                    onJoinLive={(live: any) => setActiveLiveRoom(live)}
                  />
                )}
                {activeTab === 'messages' && (
                  <DirectChat session={session} initialRecipient={viewingUsername} />
                )}
                {activeTab === 'notifications' && (
                  <Notifications userId={session.user.id} onBack={() => handleTabChange('community')} />
                )}
                {activeTab === 'admin' && (
                  <Admin isAdmin={isAdmin} userProfile={userProfile} session={session} onBack={() => handleTabChange('profile')} />
                )}
              </div>
            </main>

            {/* Sidebar direita (só desktop, oculta no mobile via CSS) */}
            {activeTab !== 'avista' && (
              <aside className="right-sidebar-urban">
                <div className="sidebar-section">
                  <h3><Users size={18} /> HALL DA FAMA</h3>
                  <MoralRanking onViewProfile={onViewProfile} />
                </div>
                <div className="sidebar-section">
                  <h3><Star size={18} /> EM ALTA</h3>
              <LiveRail onJoinLive={(live) => setActiveLiveRoom(live)} currentUserId={session?.user?.id} />
                </div>
              </aside>
            )}

            {/* Modais de criação */}
            {isAvistaModalOpen && (
              <AvistaCreator
                session={session}
                onClose={() => setIsAvistaModalOpen(false)}
                onRefresh={() => window.location.reload()}
              />
            )}
            {isSetupLiveOpen && (
              <SetupLiveModal
                session={session}
                onClose={() => setIsSetupLiveOpen(false)}
                onStartLive={(live) => {
                  setActiveLiveRoom(live);
                  setIsSetupLiveOpen(false);
                }}
              />
            )}
          </div>

          {/* ── MOBILE NAV — fora do dashboard para position:fixed funcionar ── */}
          {(activeTab !== 'avista' && !activeLiveRoom) && (
            <nav className="mobile-nav-elite" style={{ zIndex: 100 }}>
              <button className={activeTab === 'community' ? 'active' : ''} onClick={() => handleTabChange('community')}>
                <Home size={24} />
              </button>
              <button className={activeTab === 'messages' ? 'active' : ''} onClick={() => handleTabChange('messages')}>
                <MessageCircle size={24} />
              </button>
              <div className="nav-special-wrapper">
                <button className="nav-create-btn-elite" onClick={() => setShowFabMenu(!showFabMenu)}>
                  <Plus size={26} style={{ transform: showFabMenu ? 'rotate(45deg)' : 'none', transition: 'transform 0.3s ease' }} />
                </button>
              </div>
              <button onClick={() => handleTabChange('avista')}>
                <Eye size={24} />
              </button>
              <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => handleTabChange('profile')}>
                <User size={24} />
              </button>
            </nav>
          )}

          {/* ── MENU FAB — fora do dashboard ── */}
          {(showFabMenu && !activeLiveRoom) && (
            <div className="fab-container-urban active">
              <div className="fab-menu-options animate-fade-up">
                <button className="fab-menu-item" onClick={() => { setIsAvistaModalOpen(true); setShowFabMenu(false); }}>
                  <Video size={20} /><span>Lançar AVISTA</span>
                </button>
                <button className="fab-menu-item" onClick={() => { setIsSetupLiveOpen(true); setShowFabMenu(false); }}>
                  <Radio size={20} color="#ef4444" /><span style={{ color: '#ef4444' }}>Abrir Live</span>
                </button>
              </div>
              <div className="fab-overlay-urban" onClick={() => setShowFabMenu(false)} />
            </div>
          )}
        </>
      )}

      {/* ── LIVE ROOM (auto-portala para o body internamente) ── */}
      {session && activeLiveRoom && (
        <LiveRoom
          session={session}
          userProfile={userProfile}
          role={activeLiveRoom.host_id === session.user.id ? 'host' : 'audience'}
          room={activeLiveRoom}
          onClose={() => setActiveLiveRoom(null)}
        />
      )}
    </>
  );
}

export default App;
