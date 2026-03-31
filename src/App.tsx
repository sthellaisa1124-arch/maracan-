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
    <div className="app-container">
      <header>
        <div className="logo">IAI CRIA 🌴</div>
        <div className="user-nav">
          <span className="welcome-msg">Fala, {session.user.user_metadata.username || 'Cria'}! ✌️</span>
          <button onClick={() => supabase.auth.signOut()} className="signout-btn">Sair fora</button>
        </div>
      </header>

      <nav className="main-nav">
        <button 
          className={activeTab === 'blog' ? 'active' : ''} 
          onClick={() => setActiveTab('blog')}
        >
          Notícias do Rio
        </button>
        <button 
          className={activeTab === 'chat' ? 'active' : ''} 
          onClick={() => setActiveTab('chat')}
        >
          Chat com a IA
        </button>
      </nav>

      <main className="content-area">
        {activeTab === 'blog' ? <Blog /> : <Chat />}
      </main>
    </div>
  );
}

export default App;
