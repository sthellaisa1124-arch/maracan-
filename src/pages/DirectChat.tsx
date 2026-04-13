import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, MessageSquare, ArrowLeft, Loader2, ShieldCheck, User, CheckCheck, Check } from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

interface Conversation {
  user: any;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
}

function MessageTicks({ message }: { message: Message }) {
  const [showDouble, setShowDouble] = useState(message.read);
  
  useEffect(() => {
    if (message.read) {
      setShowDouble(true);
      return;
    }
    
    // Calcula a idade da mensagem
    const msgTime = new Date(message.created_at).getTime();
    const ageMs = Date.now() - msgTime;
    
    // Se foi há menos de 2.5 segundos, mostre só 1 tick e agenda o segundo
    if (ageMs < 2500) {
      // Começa com 1 tick
      setShowDouble(false);
      const timer = setTimeout(() => {
        setShowDouble(true);
      }, 2500 - ageMs);
      return () => clearTimeout(timer);
    } else {
      setShowDouble(true);
    }
  }, [message.created_at, message.read]);

  if (message.read) {
    return <CheckCheck size={14} color="#10b981" />;
  }

  // Falta ler, mas já "chegou" ao destino simuladamente
  if (showDouble) {
    return <CheckCheck size={14} color="rgba(255,255,255,0.4)" />;
  }
  
  // Acabou de enviar (mostra só 1 tick)
  return <Check size={14} color="rgba(255,255,255,0.4)" />;
}

export function DirectChat({ session, initialRecipient }: { session: any, initialRecipient?: string | null }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userId = session?.user?.id;

  // 1. Carregar lista de conversas ao montar
  useEffect(() => {
    if (userId) {
      fetchConversations();
      
      // Se vier de um perfil com destinatário inicial
      if (initialRecipient) {
        loadSpecificUser(initialRecipient);
      }

      // Cleanup proativo ao entrar
      cleanupExpiredMessages();
    }
  }, [userId, initialRecipient]);

  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);

  // 2. Ouvir mensagens e presença (typing) em tempo real
  useEffect(() => {
    if (!userId || !selectedUser) return;

    fetchMessages(selectedUser.id);

    const channel = supabase
      .channel(`chat-${userId}-${selectedUser.id}`, {
        config: { presence: { key: userId } }
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'direct_messages',
        filter: `receiver_id=eq.${userId}`
      }, (payload) => {
        const newMsg = payload.new as Message;
        if (selectedUser && newMsg.sender_id === selectedUser.id) {
          setMessages(prev => [...prev, newMsg]);
          setOtherUserTyping(false);
          markAsRead(selectedUser.id); // Marcar como lida se o chat estiver aberto
        }
        fetchConversations();
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'direct_messages',
        filter: `sender_id=eq.${userId}`
      }, (payload) => {
        // Escutar quando o destinatário atualiza a msg para lida
        const updatedMsg = payload.new as Message;
        setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typing = Object.values(state).some((p: any) => 
          p.some((presence: any) => presence.user_id === selectedUser.id && presence.is_typing)
        );
        setOtherUserTyping(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId, is_typing: false });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, selectedUser]);

  const handleTyping = async (typing: boolean) => {
    const channel = supabase.getChannels().find(c => c.topic === `chat-${userId}-${selectedUser.id}`);
    if (channel) {
      await channel.track({ user_id: userId, is_typing: typing });
    }
  };

  const onInputChange = (val: string) => {
    setInput(val);
    if (!isTyping) {
      setIsTyping(true);
      handleTyping(true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      handleTyping(false);
    }, 2000);
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function cleanupExpiredMessages() {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('direct_messages').delete().lt('created_at', yesterday);
  }

  async function markAsRead(otherId: string) {
    const { error } = await supabase
      .from('direct_messages')
      .update({ read: true })
      .eq('sender_id', otherId)
      .eq('receiver_id', userId)
      .eq('read', false);
    
    if (error) {
       console.error("❌ RLS impediu marcar a mensagem como lida. Execute o script fix_dm_read_rls.sql", error);
    } else {
       // Atualizar localmente a lista de mensagens para remover as não-lidas ativas
       setMessages(prev => prev.map(m => (!m.read && m.sender_id === otherId) ? { ...m, read: true } : m));
    }
    
    fetchConversations(); // Atualizar badges
  }

  async function fetchConversations() {
    setListLoading(true);
    const { data } = await supabase
      .from('direct_messages')
      .select(`
        *,
        sender:profiles!sender_id(id, username, avatar_url),
        receiver:profiles!receiver_id(id, username, avatar_url)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (data) {
      const convMap = new Map();
      data.forEach(m => {
        const otherUser = m.sender_id === userId ? m.receiver : m.sender;
        if (otherUser && !convMap.has(otherUser.id)) {
          // Contar não lidas nesta conversa
          const unreadCount = data.filter(msg => 
            msg.sender_id === otherUser.id && 
            msg.receiver_id === userId && 
            !msg.read
          ).length;

          convMap.set(otherUser.id, {
            user: otherUser,
            lastMessage: m.content,
            timestamp: m.created_at,
            unreadCount
          });
        }
      });
      setConversations(Array.from(convMap.values()));
    }
    setListLoading(false);
  }

  async function loadSpecificUser(username: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();
    if (data) setSelectedUser(data);
  }

  async function fetchMessages(otherId: string) {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${userId})`)
      .gt('created_at', yesterday)
      .order('created_at', { ascending: true });
    
    if (data) {
      setMessages(data);
      markAsRead(otherId); // Ler as mensagens ao abrir
    }
  }

  async function sendMessage() {
    if (!input.trim() || !selectedUser || !userId) return;

    const newMsg = {
      sender_id: userId,
      receiver_id: selectedUser.id,
      content: input.trim()
    };

    setInput('');
    const { data, error: sendError } = await supabase.from('direct_messages').insert([newMsg]).select().single();
    
    if (data) {
      setMessages(prev => [...prev, data]);
      fetchConversations();

      // Gerar notificação para o destinatário
      if (sendError) console.warn('Erro ao enviar:', sendError);
      await supabase.from('notifications').insert({
        user_id: selectedUser.id,
        from_user_id: userId,
        type: 'message'
      });
    }
  }

  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredConversations = conversations.filter(c => 
    c.user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="direct-chat-container animate-fade-up" style={{ display: 'flex', width: '100%', height: 'calc(100vh - 70px)', overflow: 'hidden' }}>
      <style>{`
        .dc-container { padding-bottom: 0 !important; }
        .dc-sidebar {
          width: 350px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--separator);
          background: rgba(5,5,5,0.5);
        }
        .dc-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          background: #050505;
        }
        @media (max-width: 768px) {
          .dc-sidebar {
            width: 100%;
            display: ${selectedUser ? 'none' : 'flex'};
            border-right: none;
          }
          .dc-main {
            display: ${!selectedUser ? 'none' : 'flex'};
            width: 100%;
          }
        }
        .search-input-chats {
          width: 100%;
          padding: 0.8rem 1rem;
          border-radius: 1rem;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--separator);
          color: #fff;
          font-family: inherit;
        }
        .search-input-chats:focus {
          outline: none;
          border-color: var(--primary);
        }
      `}</style>
      
      {/* Barra Lateral de Conversas */}
      <aside className="dc-sidebar">
        <div className="dm-sidebar-header" style={{ padding: '1.2rem', borderBottom: '1px solid var(--separator)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
            <MessageSquare size={20} color="var(--primary)" /> PAPOS
          </h3>
          <input 
            type="text" 
            placeholder="Pesquisar conversa..." 
            className="search-input-chats"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="dm-list" style={{ flex: 1, overflowY: 'auto', padding: '0.75rem' }}>
          {listLoading ? (
            <div className="dm-loading"><Loader2 className="animate-spin" color="var(--primary)" /></div>
          ) : filteredConversations.length === 0 ? (
            <div className="dm-empty" style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
              Nenhum papo encontrado... <br/><span style={{ fontSize: '0.85rem' }}>Chame um cria no perfil dele!</span>
            </div>
          ) : (
            filteredConversations.map(c => (
              <div 
                key={c.user.id} 
                className={`chat-list-item-urban ${selectedUser?.id === c.user.id ? 'active' : ''}`}
                onClick={() => setSelectedUser(c.user)}
              >
                <img 
                  src={c.user.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + c.user.id} 
                  style={{ width: '52px', height: '52px', borderRadius: '50%', border: '2px solid var(--separator)', objectFit: 'cover' }}
                  alt="Avatar" 
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <strong style={{ fontSize: '0.95rem' }}>@{c.user.username}</strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {c.unreadCount > 0 && (
                        <span style={{ background: 'var(--primary)', color: '#000', fontSize: '0.65rem', fontWeight: 900, padding: '0.1rem 0.4rem', borderRadius: '1rem', minWidth: '18px', textAlign: 'center' }}>
                          {c.unreadCount}
                        </span>
                      )}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: c.unreadCount > 0 ? '#fff' : 'var(--text-muted)', fontWeight: c.unreadCount > 0 ? 700 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.lastMessage}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Janela de Chat */}
      <main className="dc-main">
        {selectedUser ? (
          <>
            <header className="dm-window-header" style={{ padding: '0.8rem 1.2rem', borderBottom: '1px solid var(--separator)', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)' }}>
              <button className="btn-back-dm" onClick={() => setSelectedUser(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.4rem' }}>
                <ArrowLeft size={24} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flex: 1 }}>
                {selectedUser.avatar_url ? (
                  <img src={selectedUser.avatar_url} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} alt="Avatar" />
                ) : (
                  <div className="velar-elite-avatar" style={{ width: '40px', height: '40px' }}>
                    <User size={20} />
                  </div>
                )}
                <div>
                  <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem' }}>@{selectedUser.username}</h4>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 800, letterSpacing: '0.5px' }}>NA PISTA AGORA</p>
                </div>
              </div>
            </header>

            <div className="dm-messages-area" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ textAlign: 'center', margin: '1rem 0 2rem', opacity: 0.4 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>
                  <ShieldCheck size={14} /> PAPO RETO & SIGILO ABSOLUTO
                </div>
              </div>
              
              {messages.map((m) => (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.sender_id === userId ? 'flex-end' : 'flex-start' }}>
                  <div className={`chat-bubble-velar ${m.sender_id === userId ? 'sent' : 'received'}`}>
                    {m.content}
                  </div>
                  <span className="chat-timestamp-velar" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {m.sender_id === userId && (
                      <MessageTicks message={m} />
                    )}
                  </span>
                </div>
              ))}

              {otherUserTyping && (
                <div className="dm-typing-indicator" style={{ display: 'flex', gap: '4px', padding: '0.5rem 1rem' }}>
                  <div className="typing-dot" style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%', animation: 'bounce 1.4s infinite' }}></div>
                  <div className="typing-dot" style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%', animation: 'bounce 1.4s infinite 0.2s' }}></div>
                  <div className="typing-dot" style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%', animation: 'bounce 1.4s infinite 0.4s' }}></div>
                </div>
              )}

              <div ref={scrollRef} />
            </div>

            <div style={{ padding: '1.5rem', background: 'rgba(5,5,5,0.8)', backdropFilter: 'blur(10px)' }}>
              <div className="chat-input-urban">
                <input 
                  type="text"
                  placeholder="Manda o papo reto..." 
                  value={input}
                  onChange={(e) => onInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      sendMessage();
                    }
                  }}
                />
                <button 
                  onClick={sendMessage} 
                  disabled={!input.trim()}
                  style={{ background: 'transparent', border: 'none', color: input.trim() ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <Send size={24} />
                </button>
              </div>
              <p style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.8rem', fontWeight: 600 }}>
                ESTE PAPO SERÁ DELETADO EM 24 HORAS PELO SISTEMA.
              </p>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.3, textAlign: 'center', padding: '2rem' }}>
            <MessageSquare size={80} strokeWidth={1} style={{ marginBottom: '1.5rem' }} />
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900 }}>VELAR CHAT</h2>
            <p style={{ fontSize: '1rem', maxWidth: '300px' }}>Selecione um cria pra trocar ideia. Papo reto e efêmero.</p>
          </div>
        )}
      </main>
    </div>
  );
}
