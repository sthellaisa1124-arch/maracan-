import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Auth } from './pages/Auth';
import { Blog } from './pages/Blog';
import { Chat } from './pages/Chat';
import { Admin } from './pages/Admin';
import type { Session } from '@supabase/supabase-js';
import { Newspaper, MessageSquare, ShieldAlert, LogOut } from 'lucide-react';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'blog' | 'chat' | 'admin'>('blog');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkAdmin(session.user.id);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkAdmin(session.user.id);
      else setIsAdmin(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkAdmin(userId: string) {
    console.log("Checking admin for user:", userId);
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();
    
    if (error) console.error("Admin check error:", error);
    console.log("Admin data received:", data);
    
    if (data?.is_admin) {
      console.log("User is ADMIN!");
      setIsAdmin(true);
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loader"></div>
        <p>Tá chegando, cria...</p>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar Lateral */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo small">IAI CRIA 🌴</div>
        </div>
        
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'blog' ? 'active' : ''}`} 
            onClick={() => setActiveTab('blog')}
          >
            <Newspaper size={20} /> Notícias do Rio
          </button>
          <button 
            className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`} 
            onClick={() => setActiveTab('chat')}
          >
            <MessageSquare size={20} /> Chat Carioca
          </button>
          {isAdmin && (
            <button 
              className={`nav-item admin-nav ${activeTab === 'admin' ? 'active' : ''}`} 
              onClick={() => setActiveTab('admin')}
            >
              <ShieldAlert size={20} /> Administração
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <p>Fala, <strong>{session.user.user_metadata.username || 'Cria'}</strong>!</p>
            <button onClick={() => supabase.auth.signOut()} className="btn-logout">
              <LogOut size={16} /> Sair fora
            </button>
          </div>
        </div>
      </aside>

      {/* Área de Conteúdo */}
      <main className="main-content">
        <header className="mobile-header">
          <div className="logo small">IAI CRIA 🌴</div>
          <button className="menu-toggle">☰</button>
        </header>

        <div className="content-wrapper">
          {activeTab === 'blog' ? <Blog /> : activeTab === 'chat' ? <Chat /> : <Admin />}
        </div>
      </main>
    </div>
  );
}

export default App;
