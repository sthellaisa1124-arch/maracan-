import { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Trash2, 
  Sparkles, 
  Loader2,
  ArrowLeft,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'ai';
  timestamp: string;
}

export function Chat({ userProfile, onBack }: { userProfile: any, onGoToPricing?: () => void, onBack?: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [moralBalance, setMoralBalance] = useState<number>(userProfile?.moral_balance ?? 0);
  const [lastSentAt, setLastSentAt] = useState<number>(0);
  const [showProfileModal, setShowProfileModal] = useState(false);
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
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', backgroundColor: '#000', backgroundImage: 'url(/iai-cria-login-bg.png)', backgroundSize: 'cover', backgroundPosition: 'center', zIndex: 90 }}>
      {/* Overlay escuro para garantir legibilidade dos textos da favela ao fundo */}
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 0 }}></div>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', zIndex: 1 }}>
      {/* Header Fixo */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#050505', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 8px 0 0', display: 'flex' }}>
              <ArrowLeft size={24} />
            </button>
          )}
          <div style={{position: 'relative', cursor: 'pointer'}} onClick={() => setShowProfileModal(true)}>
            <img src="/iai-cria-login-bg.png" alt="Mascote" style={{width: '46px', height: '46px', borderRadius: '50%', border: '2px solid var(--secondary)', objectFit: 'cover'}} />
            <div className={`status-dot ${loading ? 'typing' : ''}`} style={{position: 'absolute', bottom: '2px', right: '0', width: '12px', height: '12px', borderRadius: '50%', background: loading ? 'var(--secondary)' : '#10b981', border: '2px solid #050505'}}></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }} onClick={() => setShowProfileModal(true)}>
            <div style={{display: 'flex', alignItems: 'center'}}>
              <h2 style={{fontSize: '1.2rem', fontWeight: 900, color: '#fff', margin: 0, lineHeight: 1}}>IAI CRIA</h2>
              <span style={{marginLeft: '6px', width: '18px', height: '18px'}}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 1L14.6 4.7H19.3L19.3 9.4L23 12L19.3 14.6L19.3 19.3H14.6L12 23L9.4 19.3H4.7L4.7 14.6L1 12L4.7 9.4L4.7 4.7H9.4L12 1Z" fill="#a855f7" />
                  <path d="M17.5 8.5L10 16L6.5 12.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>
            <p style={{fontSize: '0.8rem', color: loading ? 'var(--secondary)' : '#10b981', fontWeight: 700, margin: '4px 0 0 0'}}>
              {loading ? 'Digitando...' : '🟢 Online'}
            </p>
          </div>
        </div>

        {/* Saldo Moral no header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            background: canSend ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255,59,48,0.1)',
            border: `1px solid ${canSend ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255,59,48,0.3)'}`,
            borderRadius: '2rem', padding: '0.4rem 0.8rem',
          }}>
            <span style={{ fontSize: '1rem' }}>🪙</span>
            <span style={{ color: canSend ? 'var(--secondary)' : '#ff3b30', fontWeight: 800, fontSize: '0.9rem' }}>
              {moralBalance}
            </span>
          </div>
          <button onClick={clearChat} style={{color: 'rgba(255,255,255,0.4)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex'}} title="Limpar conversa">
            <Trash2 size={20} />
          </button>
        </div>
      </header>
      
      {/* Área das Mensagens */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages.length === 0 && (
          <div style={{ margin: 'auto', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.8 }}>
            <Sparkles size={54} color="var(--secondary)" style={{marginBottom: '1rem', filter: 'drop-shadow(0 0 15px var(--secondary))'}} />
            <h3 style={{fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: '0.5rem'}}>Manda o papo, cria!</h3>
            <p style={{color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '80%'}}>Tô aqui pra trocar aquela ideia. Cada mensagem te custa <strong style={{color: 'var(--secondary)'}}>{COST_PER_MSG} Moral 🪙</strong></p>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{display: 'flex', alignItems: 'flex-start', gap: '8px', maxWidth: '85%'}}>
              {msg.role === 'ai' && <img src="/iai-cria-login-bg.png" style={{width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover'}} alt="AI" />}
              
              <div style={{ 
                  background: msg.role === 'user' ? 'linear-gradient(135deg, #6C2BFF 0%, #a855f7 100%)' : 'rgba(255,255,255,0.08)', 
                  padding: '12px 16px', 
                  borderRadius: msg.role === 'user' ? '16px 16px 0 16px' : '0 16px 16px 16px',
                  color: '#fff', fontSize: '0.95rem', lineHeight: 1.4, wordWrap: 'break-word',
                  boxShadow: msg.role === 'user' ? '0 4px 15px rgba(108,43,255,0.3)' : 'none'
              }}>
                <div style={{whiteSpace: 'pre-wrap'}}>{msg.content}</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '6px', textAlign: 'right' }}>{msg.timestamp}</div>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <img src="/iai-cria-login-bg.png" style={{width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover'}} alt="AI" />
            <div style={{ background: 'rgba(255,255,255,0.08)', padding: '16px', borderRadius: '0 16px 16px 16px' }}>
              <div style={{ display: 'flex', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', background: '#fff', borderRadius: '50%', animation: 'criaPulse 1s infinite alternate' }}></span>
                <span style={{ width: '6px', height: '6px', background: '#fff', borderRadius: '50%', animation: 'criaPulse 1s infinite alternate 0.2s' }}></span>
                <span style={{ width: '6px', height: '6px', background: '#fff', borderRadius: '50%', animation: 'criaPulse 1s infinite alternate 0.4s' }}></span>
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

      {/* Área de Input Fixa Embaixo */}
      <div style={{ background: '#050505', padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'flex-end', gap: '10px' }}>
        <textarea 
          ref={textareaRef}
          placeholder={canSend ? "Manda o papo reto..." : "Sem moral pra isso 😅"} 
          rows={1}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
          onKeyDown={handleKeyDown}
          disabled={!canSend}
          style={{ 
            flex: 1, 
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid rgba(255,255,255,0.1)', 
            borderRadius: '24px', 
            padding: '14px 16px', 
            color: '#fff', 
            fontSize: '1rem', 
            outline: 'none', 
            resize: 'none', 
            maxHeight: '120px',
            opacity: canSend ? 1 : 0.5,
            fontFamily: 'inherit',
            lineHeight: 1.4
          }}
        />
        <button 
          onClick={sendMessage} 
          disabled={!input.trim() || loading || !canSend}
          style={{
            background: !input.trim() || loading || !canSend ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, var(--secondary) 0%, #6C2BFF 100%)',
            border: 'none',
            borderRadius: '50%',
            width: '50px',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            cursor: !input.trim() || loading || !canSend ? 'not-allowed' : 'pointer',
            flexShrink: 0,
            boxShadow: input.trim() && !loading && canSend ? '0 4px 15px rgba(168, 85, 247, 0.4)' : 'none',
            transition: 'all 0.3s'
          }}
        >
          {loading ? <Loader2 size={24} className="animate-spin" /> : <Send size={22} style={{ marginLeft: '2px' }} />}
        </button>
      </div>
      </div>
      
      {/* Modal de Perfil do IA */}
      {showProfileModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', backdropFilter: 'blur(10px)' }} onClick={() => setShowProfileModal(false)}>
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '28px', padding: '2rem 1.5rem', width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.8)' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowProfileModal(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', padding: '8px', color: '#fff', cursor: 'pointer', display: 'flex' }}>
              <X size={20} />
            </button>
            <div style={{ position: 'relative', marginBottom: '1.5rem', marginTop: '1rem' }}>
              <img src="/iai-cria-login-bg.png" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--secondary)', boxShadow: '0 0 25px rgba(168, 85, 247, 0.4)' }} />
              <div style={{ position: 'absolute', bottom: '5px', right: '10px', background: '#10b981', border: '4px solid #0a0a0a', width: '24px', height: '24px', borderRadius: '50%' }}></div>
            </div>
            <h2 style={{ color: '#fff', fontSize: '1.6rem', fontWeight: 900, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              IAI CRIA
              <span style={{ width: '22px', height: '22px' }}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 1L14.6 4.7H19.3L19.3 9.4L23 12L19.3 14.6L19.3 19.3H14.6L12 23L9.4 19.3H4.7L4.7 14.6L1 12L4.7 9.4L4.7 4.7H9.4L12 1Z" fill="#a855f7" />
                  <path d="M17.5 8.5L10 16L6.5 12.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </h2>
            <div style={{ background: 'rgba(168, 85, 247, 0.1)', color: 'var(--secondary)', padding: '6px 16px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '1.5rem', border: '1px solid rgba(168, 85, 247, 0.3)', textAlign: 'center' }}>
              🤖 Inteligência Artificial Oficial da Comunidade
            </div>
            <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.05)', marginBottom: '1.5rem' }}></div>
            <h3 style={{ width: '100%', margin: '0 0 8px 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>Biografia</h3>
            <p style={{ color: '#fff', margin: 0, fontSize: '0.95rem', lineHeight: 1.6, textAlign: 'center', opacity: 0.9 }}>
              Salve! Eu sou o Cria, o cérebro digital da sua comunidade. Fui treinado nas ruas e programado em código puro pra te passar a visão, te dar os melhores conselhos e resolver os trampos cabulosos, sem caô. Tô ligado no que tá em alta, no que vinga e no que é furada. <strong>Pode mandar o papo que a firma tá forte!</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
