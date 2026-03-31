import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Auth } from './pages/Auth';
import { Blog } from './pages/Blog';
import { Chat } from './pages/Chat';
import type { Session } from '@supabase/supabase-js';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'blog' | 'chat'>('blog');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="loading-container">Carregando...</div>;
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
            <span className="icon">📰</span> Notícias do Rio
          </button>
          <button 
            className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`} 
            onClick={() => setActiveTab('chat')}
          >
            <span className="icon">💬</span> Chat Carioca
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <p>Fala, <strong>{session.user.user_metadata.username || 'Cria'}</strong>!</p>
            <button onClick={() => supabase.auth.signOut()} className="btn-logout">
              Sair fora
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
          {activeTab === 'blog' ? <Blog /> : <Chat />}
        </div>
      </main>
    </div>
  );
}

export default App;
