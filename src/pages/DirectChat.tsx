import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Send, 
  MessageSquare, 
  ArrowLeft, 
  Loader2, 
  ShieldCheck, 
  User, 
  CheckCheck, 
  Check, 
  Camera, 
  Mic, 
  Square, 
  Image as ImageIcon, 
  Play, 
  Pause, 
  X,
  Trash2,
  RefreshCw
} from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  image_url?: string;
  audio_url?: string;
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
    
    const msgTime = new Date(message.created_at).getTime();
    const ageMs = Date.now() - msgTime;
    
    if (ageMs < 2500) {
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

  if (showDouble) {
    return <CheckCheck size={14} color="rgba(255,255,255,0.4)" />;
  }
  
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

  // Estados para Mídia
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const recordingIntervalRef = useRef<any>(null);

  // Estados para Câmera Customizada
  const [isCameraVisible, setIsCameraVisible] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mediaCaption, setMediaCaption] = useState('');

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

  async function loadSpecificUser(username: string) {
    if (!username) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .eq('username', username)
      .single();
    
    if (data) {
      setSelectedUser(data);
      markAsRead(data.id);
    }
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

  const startCamera = async (mode: 'user' | 'environment') => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: mode }, 
        audio: false 
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error("Erro ao abrir câmera:", err);
      alert("Não foi possível acessar a câmera. Verifique as permissões.");
      setIsCameraVisible(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraVisible(false);
  };

  const switchCamera = () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    startCamera(newMode);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setMediaPreview(dataUrl);
        
        // Converter dataUrl para File
        fetch(dataUrl)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setSelectedFile(file);
          });
        
        stopCamera();
      }
    }
  };

  async function uploadMedia(file: File | Blob, type: 'image' | 'audio') {
    if (!userId) return null;
    const fileExt = type === 'image' ? 'jpg' : 'webm';
    const fileName = `chat/${userId}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(fileName, file);

    if (uploadError) {
      console.error("Erro no upload:", uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
    return publicUrl;
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendMediaMessage(audioBlob, 'audio');
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 59) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isCamera = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Arquivo muito grande! Máximo 10MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setMediaPreview(event.target?.result as string);
      setSelectedFile(file);
    };
    reader.readAsDataURL(file);
    
    // Se veio da galeria e a câmera estava aberta, fecha a câmera
    if (isCameraVisible) stopCamera();
  };

  async function sendMediaMessage(file: File | Blob, type: 'image' | 'audio') {
    if (!selectedUser || !userId) return;
    setIsUploading(true);

    const mediaUrl = await uploadMedia(file, type);
    if (!mediaUrl) {
      setIsUploading(false);
      return;
    }

    const newMsg = {
      sender_id: userId,
      receiver_id: selectedUser.id,
      content: mediaCaption.trim() || (type === 'image' ? '📷 Foto' : '🎤 Áudio'),
      [type === 'image' ? 'image_url' : 'audio_url']: mediaUrl
    };

    const { data } = await supabase.from('direct_messages').insert([newMsg]).select().single();
    if (data) {
      setMessages(prev => [...prev, data]);
      fetchConversations();
      await supabase.from('notifications').insert({
        user_id: selectedUser.id,
        from_user_id: userId,
        type: 'message'
      });
    }

    setIsUploading(false);
    setMediaPreview(null);
    setSelectedFile(null);
    setMediaCaption('');
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
        .chat-input-urban {
          display: flex;
          align-items: center;
          background: rgba(255, 255, 255, 0.03);
          border: 1.5px solid rgba(255, 255, 255, 0.08);
          border-radius: 1.2rem;
          padding: 0.4rem 1rem;
          gap: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          min-height: 54px;
        }
        .chat-input-urban:focus-within {
          background: rgba(255, 255, 255, 0.06);
          border-color: var(--primary);
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.15);
          transform: translateY(-1px);
        }
        .chat-input-urban input {
          flex: 1;
          background: transparent !important;
          border: none !important;
          color: #fff !important;
          font-size: 0.95rem !important;
          height: 100%;
          outline: none !important;
          padding: 0.8rem 0;
          font-family: inherit;
        }
        .chat-input-urban input::placeholder {
          color: rgba(255, 255, 255, 0.3);
          font-weight: 500;
        }
        .chat-bubble-velar {
          max-width: 85%;
          padding: 0.8rem 1.1rem;
          border-radius: 1.2rem;
          font-size: 0.95rem;
          line-height: 1.4;
          position: relative;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        .chat-bubble-velar.sent {
          background: linear-gradient(135deg, #6C2BFF, #a855f7);
          color: #fff;
          border-bottom-right-radius: 4px;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .chat-bubble-velar.received {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          border-bottom-left-radius: 4px;
          border: 1px solid rgba(255,255,255,0.05);
          backdrop-filter: blur(10px);
        }
        .chat-timestamp-velar {
          font-size: 0.65rem;
          color: rgba(255,255,255,0.3);
          margin-top: 4px;
          font-weight: 600;
          text-transform: uppercase;
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
                    {m.image_url && (
                      <div style={{ marginBottom: m.content ? '0.5rem' : 0 }}>
                        <img 
                          src={m.image_url} 
                          alt="Mídia" 
                          style={{ maxWidth: '100%', borderRadius: '12px', display: 'block', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }} 
                          onClick={() => window.open(m.image_url, '_blank')}
                        />
                      </div>
                    )}
                    
                    {m.audio_url && (
                      <div style={{ 
                        minWidth: '200px', 
                        padding: '0.5rem 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <audio src={m.audio_url} controls style={{ height: '32px', filter: 'invert(1) hue-rotate(180deg)', width: '100%' }} />
                      </div>
                    )}

                    {m.content && m.content !== '📷 Foto' && m.content !== '🎤 Áudio' && (
                      <div style={{ wordBreak: 'break-word' }}>{m.content}</div>
                    )}
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

            {/* Câmera em Tela Cheia (Overlay) */}
            {isCameraVisible && (
              <div style={{
                position: 'fixed', inset: 0, zIndex: 9999999,
                background: '#000', display: 'flex', flexDirection: 'column'
              }}>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                
                {/* Botão Fechar */}
                <button 
                  onClick={stopCamera}
                  style={{ position: 'absolute', top: '20px', left: '20px', background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
                >
                  <X size={28} />
                </button>

                {/* Controles da Base */}
                <div style={{
                  position: 'absolute', bottom: '40px', left: 0, right: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-evenly',
                }}>
                  {/* Galeria */}
                  <button 
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                    style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}
                  >
                    <ImageIcon size={24} />
                  </button>

                  {/* Capturar */}
                  <button 
                    onClick={capturePhoto}
                    style={{
                      width: '80px', height: '80px', borderRadius: '50%', border: '6px solid #fff',
                      background: 'rgba(255,255,255,0.2)', padding: '5px'
                    }}
                  >
                    <div style={{ width: '100%', height: '100%', background: '#fff', borderRadius: '50%' }} />
                  </button>

                  {/* Trocar Câmera */}
                  <button 
                    onClick={switchCamera}
                    style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}
                  >
                    <RefreshCw size={24} />
                  </button>
                </div>
              </div>
            )}

            {/* Overlay de Confirmação de Imagem */}
            {mediaPreview && (
              <div style={{
                position: 'fixed', inset: 0, zIndex: 999999,
                background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(10px)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem'
              }}>
                <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '70vh' }}>
                  <img src={mediaPreview} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '20px', border: '2px solid var(--primary)' }} alt="Preview" />
                  <button 
                    onClick={() => { setMediaPreview(null); setSelectedFile(null); }}
                    style={{ position: 'absolute', top: '-20px', right: '-20px', background: '#ef4444', border: 'none', color: '#fff', width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X size={24} />
                  </button>
                </div>
                <div style={{ marginTop: '1.5rem', width: '100%', maxWidth: '350px' }}>
                  <input 
                    type="text"
                    placeholder="Escreva uma legenda..."
                    value={mediaCaption}
                    onChange={(e) => setMediaCaption(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      padding: '1rem',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '1rem',
                      outline: 'none',
                      marginBottom: '1rem'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                      onClick={() => sendMediaMessage(selectedFile!, 'image')}
                      disabled={isUploading}
                      style={{ flex: 1, background: 'var(--primary)', border: 'none', color: '#000', padding: '1rem', borderRadius: '16px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      {isUploading ? <Loader2 className="animate-spin" /> : <><Send size={20} /> ENVIAR PAPO</>}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ padding: '1rem 1.5rem', background: 'rgba(5,5,5,0.8)', backdropFilter: 'blur(10px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {/* Inputs Escondidos */}
                <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={(e) => handleFileSelect(e)} />

                <div className="chat-input-urban" style={{ flex: 1, position: 'relative' }}>
                  {/* Botão de Câmera Único */}
                  <div style={{ marginRight: '10px', display: 'flex', alignItems: 'center' }}>
                    <button 
                      onClick={() => {
                        setIsCameraVisible(true);
                        startCamera(facingMode);
                      }}
                      style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '10px', borderRadius: '12px' }}
                    >
                      <Camera size={22} />
                    </button>
                  </div>

                  {isRecording ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px', color: '#ef4444' }}>
                      <div className="animate-pulse" style={{ width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%' }} />
                      <span style={{ fontWeight: 800, fontSize: '0.9rem' }}>Gravando {recordingTime}s / 60s</span>
                    </div>
                  ) : (
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
                  )}

                  {input.trim() ? (
                    <button 
                      onClick={sendMessage} 
                      style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <Send size={24} />
                    </button>
                  ) : (
                    <button 
                      onClick={isRecording ? stopRecording : startRecording}
                      style={{ background: 'transparent', border: 'none', color: isRecording ? '#ef4444' : 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      {isRecording ? <Square size={24} fill="#ef4444" /> : <Mic size={24} />}
                    </button>
                  )}
                </div>
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
