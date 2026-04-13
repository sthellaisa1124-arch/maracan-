import { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Trash2, 
  Sparkles, 
  Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'ai';
  timestamp: string;
}

export function Chat({ userProfile }: { userProfile: any, onGoToPricing?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [moralBalance, setMoralBalance] = useState<number>(userProfile?.moral_balance ?? 0);
  const [lastSentAt, setLastSentAt] = useState<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const COST_PER_MSG = 5;

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Carregar saldo moral do perfil
  useEffect(() => {
    if (userProfile?.id) {
      supabase
        .from('profiles')
        .select('moral_balance')
        .eq('id', userProfile.id)
        .single()
        .then(({ data }) => {
          if (data) setMoralBalance(data.moral_balance ?? 0);
        });
    }
  }, [userProfile?.id]);

  const formatTime = () => {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    if (!userProfile?.id) return;

    // Anti-spam: mínimo 2 segundos entre mensagens
    const now = Date.now();
    if (now - lastSentAt < 2000) {
      const spamMsg: Message = {
        id: Date.now().toString(),
        content: 'Peraí! Você tá enviando mensagens rápido demais. Respira um segundo, cria! 😅',
        role: 'ai',
        timestamp: formatTime()
      };
      setMessages(prev => [...prev, spamMsg]);
      return;
    }

    // Verificar saldo Moral
    if (moralBalance < COST_PER_MSG) {
      const noMoralMsg: Message = {
        id: Date.now().toString(),
        content: `Sem moral pra trocar ideia 😅\n\nVocê precisa de pelo menos **${COST_PER_MSG} Moral** para mandar uma mensagem. Carrega tua carteira nas **Configurações → Minha Moral**! 🪙`,
        role: 'ai',
        timestamp: formatTime()
      };
      setMessages(prev => [...prev, noMoralMsg]);
      return;
    }

    // Debitar Moral via RPC segura
    const { data: debitResult } = await supabase.rpc('debit_chat_moral', {
      p_user_id: userProfile.id
    });

    if (!debitResult?.success) {
      const blockedMsg: Message = {
        id: Date.now().toString(),
        content: debitResult?.error || 'Sem moral pra trocar ideia 😅',
        role: 'ai',
        timestamp: formatTime()
      };
      setMessages(prev => [...prev, blockedMsg]);
      return;
    }

    // Atualizar saldo local
    setMoralBalance(prev => Math.max(0, prev - COST_PER_MSG));
    setLastSentAt(now);

    const userMessage: Message = { 
      id: Date.now().toString(), 
      content: input, 
      role: 'user',
      timestamp: formatTime()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const chatHistory = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Faça login novamente!");

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-cria`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          messages: chatHistory,
          userId: session.user.id 
        })
      });

      if (!response.ok) throw new Error(`Erro de rede: ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.content || "Pô cria, me perdi aqui no papo. Tenta mandar de novo!",
        role: 'ai',
        timestamp: formatTime()
      };
      setMessages(prev => [...prev, aiMessage]);

    } catch (err: any) {
      const errorMsgs = [
        "pow cria, foi mal, acabei de fumar 2 balao da forte do jaca, e ja to na onda maxima, bugou minha mente, escreve de novo ai,",
        "pow cria, nao trabalho pra tu, nao sou obrigado a fazer nada que tu pede, mais pede namoral ai com jeitiho que eu penso se te responndo."
      ];
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: (err.message && err.message.length > 50) 
          ? errorMsgs[Math.floor(Math.random() * errorMsgs.length)] 
          : (err.message || errorMsgs[0]),
        role: 'ai',
        timestamp: formatTime()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    if (window.confirm("Deseja mesmo limpar nosso papo, cria?")) {
      setMessages([]);
    }
  };

  const canSend = moralBalance >= COST_PER_MSG;

  return (
    <div className="chat-page-container">
      <header className="chat-header-bar">
        <div className="chat-user-info">
          <div style={{position: 'relative'}}>
            <img src="/iai-cria-logo.png" alt="Mascote" style={{width: '42px', height: '42px', borderRadius: '50%', border: '2px solid var(--primary)'}} />
            <div className={`status-dot ${loading ? 'typing' : ''}`} style={{position: 'absolute', bottom: '0', right: '0', border: '2px solid #050505'}}></div>
          </div>
          <div>
            <div style={{display: 'flex', alignItems: 'center'}}>
              <h2 style={{fontSize: '1.1rem', fontWeight: 900, color: '#fff'}}>IAI CRIA</h2>
              <span className="verified-seal cria" style={{marginLeft: '6px', width: '18px', height: '18px'}}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 1L14.6 4.7H19.3L19.3 9.4L23 12L19.3 14.6L19.3 19.3H14.6L12 23L9.4 19.3H4.7L4.7 14.6L1 12L4.7 9.4L4.7 4.7H9.4L12 1Z" fill="#facc15" />
                  <path d="M17.5 8.5L10 16L6.5 12.5" stroke="black" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
            <p style={{fontSize: '0.75rem', color: loading ? 'var(--primary)' : '#10b981', fontWeight: 600}}>
              {loading ? 'Respondendo...' : '🟢 Online'}
            </p>
          </div>
        </div>

        {/* Saldo Moral no header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            background: canSend ? 'rgba(250,204,21,0.1)' : 'rgba(255,59,48,0.1)',
            border: `1px solid ${canSend ? 'rgba(250,204,21,0.3)' : 'rgba(255,59,48,0.3)'}`,
            borderRadius: '2rem', padding: '0.35rem 0.8rem',
          }}>
            <span style={{ fontSize: '1rem' }}>🪙</span>
            <span style={{ color: canSend ? 'var(--primary)' : '#ff3b30', fontWeight: 800, fontSize: '0.9rem' }}>
              {moralBalance}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>Moral</span>
          </div>
          <button className="icon-btn" onClick={clearChat} style={{color: 'rgba(255,255,255,0.4)'}} title="Limpar conversa">
            <Trash2 size={20} />
          </button>
        </div>
      </header>
      
      <div className="chat-window">
        {messages.length === 0 && (
          <div className="empty-chat" style={{marginTop: 'auto', marginBottom: 'auto'}}>
            <Sparkles size={48} color="var(--primary)" style={{marginBottom: '1rem', opacity: 0.5}} />
            <h3 style={{fontSize: '1.4rem', color: '#fff', marginBottom: '0.5rem'}}>Manda o papo, cria!</h3>
            <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Tô aqui pra trocar aquela ideia. Cada mensagem custa {COST_PER_MSG} Moral 🪙</p>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`chat-bubble ${msg.role}`}>
            <div style={{display: 'flex', alignItems: 'flex-start'}}>
              {msg.role === 'ai' && <img src="/iai-cria-logo.png" className="ai-avatar-msg" alt="AI" />}
              <div style={{flex: 1}}>
                <div className="bubble-content" style={{whiteSpace: 'pre-wrap'}}>{msg.content}</div>
                <div className="bubble-meta">{msg.timestamp}</div>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-bubble ai">
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <img src="/iai-cria-logo.png" className="ai-avatar-msg" alt="AI" />
              <div className="loading-dots">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Banner saldo baixo */}
      {!canSend && (
        <div style={{
          padding: '0.75rem 1.5rem',
          background: 'rgba(255,59,48,0.1)',
          border: '1px solid rgba(255,59,48,0.3)',
          borderRadius: '0.5rem',
          margin: '0 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}>
          <p style={{ color: '#ff3b30', fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>
            Sem moral pra trocar ideia 😅 Você precisa de pelo menos {COST_PER_MSG} Moral.
          </p>
          <span style={{ color: '#ff3b30', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
            Carregue em Configurações → Minha Moral
          </span>
        </div>
      )}

      <div className="chat-input-area">
        <textarea 
          ref={textareaRef}
          className="chat-input-field"
          placeholder={canSend ? "Manda o papo reto... (−5 Moral por msg)" : "Sem moral pra isso 😅 Carrega a carteira!"} 
          rows={1}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onKeyDown={handleKeyDown}
          disabled={!canSend}
          style={{ opacity: canSend ? 1 : 0.5 }}
        />
        <button 
          className="btn-send-v2" 
          onClick={sendMessage} 
          disabled={!input.trim() || loading || !canSend}
        >
          {loading ? <Loader2 size={22} className="animate-spin" /> : <Send size={22} />}
        </button>
      </div>
    </div>
  );
}
