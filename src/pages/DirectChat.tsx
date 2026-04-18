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
  RefreshCw,
  MoreVertical,
  Users,
  Clock,
  Slash,
  LogOut,
  CornerUpRight
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
  reply_to_id?: string;
  reply_to?: { content: string };
  is_temporary?: boolean;
  is_forwarded?: boolean;
  sender?: { avatar_url: string };
}

interface Conversation {
  user?: any;
  group?: any;
  isGroup: boolean;
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

// Componente de Áudio Estilo WhatsApp Elite
function AudioPlayer({ src, avatarUrl, isMe }: { src: string, avatarUrl?: string, isMe: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="audio-player-elite" style={{ 
      display: 'flex', alignItems: 'center', gap: '10px', 
      width: '100%', maxWidth: '280px', padding: '2px 0' 
    }}>
      <audio 
        ref={audioRef} 
        src={src} 
        onTimeUpdate={handleTimeUpdate} 
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      
      {/* Avatar com Microfone */}
      <div style={{ position: 'relative', flexShrink: 0, marginLeft: '4px' }}>
        <img 
          src={avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=audio"} 
          style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.2)' }} 
        />
        <div style={{
          position: 'absolute', bottom: '-2px', right: '-2px',
          background: '#000', borderRadius: '50%',
          width: '18px', height: '18px', display: 'flex',
          alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <Mic size={10} color="var(--primary)" />
        </div>
      </div>

      {/* Controle de Play */}
      <button 
        onClick={togglePlay}
        style={{ 
          background: 'rgba(255,255,255,0.15)', 
          border: 'none', borderRadius: '50%', 
          width: '32px', height: '32px', display: 'flex',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          color: '#fff', transition: 'all 0.2s', backdropFilter: 'blur(5px)'
        }}
      >
        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" style={{ marginLeft: '1px' }} />}
      </button>

      {/* Barra de Progresso e Tempo */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px', marginRight: '6px' }}>
        <div style={{ 
          width: '100%', height: '3px', background: 'rgba(255,255,255,0.2)', 
          borderRadius: '4px', position: 'relative', cursor: 'pointer' 
        }}
        onClick={(e) => {
          if (audioRef.current && duration) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const pct = x / rect.width;
            audioRef.current.currentTime = pct * duration;
          }
        }}>
          <div style={{ 
            height: '100%', background: '#fff', 
            width: `${(currentTime / duration) * 100 || 0}%`, 
            borderRadius: '4px', position: 'relative'
          }}>
            <div style={{
              position: 'absolute', right: '-4px', top: '50%',
              transform: 'translateY(-50%)', width: '9px', height: '9px',
              background: '#fff', borderRadius: '50%',
              boxShadow: '0 0 10px rgba(255,255,255,0.8)'
            }} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.65rem', opacity: 0.8, fontWeight: 900, color: '#fff' }}>
          <span>{formatTime(currentTime || duration)}</span>
        </div>
      </div>
    </div>
  );
}

// Componente para Bolha de Mensagem com Swipe
function MessageBubble({ message, isMe, onSwipe }: { message: Message, isMe: boolean, onSwipe: (m: Message) => void }) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const swipeThreshold = 60;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    if (diff > 0) { // Apenas arraste para a direita
       setSwipeOffset(Math.min(diff, 100));
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset >= swipeThreshold) {
      onSwipe(message);
    }
    setSwipeOffset(0);
    setIsSwiping(false);
  };

  return (
    <div 
      style={{ 
        display: 'flex', flexDirection: 'column', 
        alignItems: isMe ? 'flex-end' : 'flex-start',
        position: 'relative',
        width: '100%', margin: '4px 0',
        overflow: 'visible'
      }}
    >
      {/* Ícone de Resposta (Aparece no fundo ao deslizar) */}
      {swipeOffset > 10 && (
        <div style={{
          position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
          opacity: swipeOffset / 60, transition: 'opacity 0.2s', paddingLeft: '10px'
        }}>
          <RefreshCw size={18} color="var(--primary)" />
        </div>
      )}

      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          maxWidth: '85%'
        }}
      >
        <div 
          className={`chat-bubble-velar ${isMe ? 'sent' : 'received'}`} 
          style={{ position: 'relative' }}
          onClick={(e) => {
            // No mobile, clique abre o menu de ações
            const menu = e.currentTarget.querySelector('.msg-actions-hover');
            if (menu) (menu as HTMLElement).style.display = (menu as HTMLElement).style.display === 'flex' ? 'none' : 'flex';
          }}
        >
          {/* Menu de Ações Rápidas (Especial para Desktop/Touch) */}
          <div className="msg-actions-hover" style={{
            position: 'absolute', top: '-35px', right: isMe ? 0 : 'auto', left: isMe ? 'auto' : 0,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
            borderRadius: '10px', padding: '4px', gap: '8px', zIndex: 10,
            border: '1px solid rgba(255,255,255,0.1)', display: 'none'
          }}>
            <button onClick={() => onSwipe(message)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }} title="Responder"><RefreshCw size={14} /></button>
            <button onClick={(e) => { e.stopPropagation(); (window as any).triggerForward(message); }} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }} title="Encaminhar"><CornerUpRight size={14} /></button>
            <button onClick={(e) => { e.stopPropagation(); (window as any).triggerDeleteMessage(message.id); }} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Apagar para mim"><Trash2 size={14} /></button>
          </div>

          {/* Selo de Encaminhada */}
          {message.is_forwarded && (
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '4px', 
              fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', 
              fontStyle: 'italic', marginBottom: '4px' 
            }}>
              <RefreshCw size={10} /> ENCAMINHADA
            </div>
          )}

          {/* Se for uma resposta, mostrar o card da original */}
          {message.reply_to && message.reply_to.content && (
             <div style={{
               background: 'rgba(0,0,0,0.3)', 
               backdropFilter: 'blur(5px)',
               borderRadius: '10px', 
               padding: '0.6rem 0.8rem', 
               marginBottom: '0.6rem', 
               borderLeft: '4px solid var(--primary)', 
               fontSize: '0.75rem',
               border: '1px solid rgba(255,255,255,0.05)',
               borderLeftWidth: '4px'
             }}>
               <div style={{ 
                 display: 'flex', 
                 alignItems: 'center', 
                 gap: '6px', 
                 marginBottom: '4px',
                 opacity: 0.8
               }}>
                 <RefreshCw size={10} color="var(--primary)" />
                 <strong style={{ color: 'var(--primary)', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '0.65rem' }}>
                   RESPOSTA AO PAPO
                 </strong>
               </div>
               <span className="truncate" style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontStyle: 'italic' }}>
                 {(message as any).reply_to.content}
               </span>
             </div>
          )}

          {message.image_url && (
            <div style={{ marginBottom: message.content ? '0.5rem' : 0 }}>
              <img 
                src={message.image_url} 
                alt="Mídia" 
                style={{ maxWidth: '100%', borderRadius: '12px', display: 'block', cursor: 'pointer' }} 
                onClick={() => window.open(message.image_url, '_blank')}
              />
            </div>
          )}
          
          {message.audio_url && (
             <AudioPlayer 
               src={message.audio_url} 
               avatarUrl={message.sender?.avatar_url} 
               isMe={isMe} 
             />
          )}

          {message.content && message.content !== '📷 Foto' && message.content !== '🎤 Áudio' && (
            <div style={{ wordBreak: 'break-word', fontWeight: 600 }}>{message.content}</div>
          )}
        </div>
        <span className="chat-timestamp-velar" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {isMe && <MessageTicks message={message} />}
        </span>
      </div>
    </div>
  );
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
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isEphemeralMode, setIsEphemeralMode] = useState(false);
  const [filterTab, setFilterTab] = useState('TODOS');
  const [searchTerm, setSearchTerm] = useState('');
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
  const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);
  const [isSidebarMenuOpen, setIsSidebarMenuOpen] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [mutualFriends, setMutualFriends] = useState<any[]>([]);
  const [messageToForward, setMessageToForward] = useState<Message | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);

  useEffect(() => {
    (window as any).triggerForward = (msg: Message) => setMessageToForward(msg);
    (window as any).triggerDeleteMessage = (msgId: string) => deleteSingleMessage(msgId);
    
    return () => {
      delete (window as any).triggerForward;
      delete (window as any).triggerDeleteMessage;
    };
  }, [userId, selectedUser]);

  async function deleteSingleMessage(msgId: string) {
    if (!userId) return;
    setMessageToDelete(msgId);
  }

  async function confirmDeleteMessage() {
    if (!userId || !messageToDelete) return;
    const msgId = messageToDelete;

    try {
      const { data: msg } = await supabase.from('direct_messages').select('deleted_by').eq('id', msgId).single();
      const deletedBy = msg?.deleted_by || [];
      if (!deletedBy.includes(userId)) {
        await supabase.from('direct_messages').update({ deleted_by: [...deletedBy, userId] }).eq('id', msgId);
        setMessages(prev => prev.filter(m => m.id !== msgId));
      }
    } catch (err) {
      console.error("Erro delete msg:", err);
    } finally {
      setMessageToDelete(null);
    }
  }

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
     fetchChatSettings(selectedUser.id);

     const channel = supabase
       .channel(`chat-${userId}-${selectedUser.id}`, {
         config: { presence: { key: userId } }
       })
       .on('postgres_changes', { 
         event: 'INSERT', 
         schema: 'public', 
         table: 'direct_messages',
         filter: selectedUser.is_group ? `group_id=eq.${selectedUser.id}` : `receiver_id=eq.${userId}`
       }, (payload) => {
         const newMsg = payload.new as Message;
         if (selectedUser.is_group || newMsg.sender_id === selectedUser.id) {
           // Se for uma resposta, precisamos buscar o texto da original para o UI
           if (newMsg.reply_to_id) {
             fetchMessages(selectedUser.id); 
           } else {
             setMessages(prev => [...prev, newMsg]);
           }
           setOtherUserTyping(false);
           if (!selectedUser.is_group) markAsRead(selectedUser.id);
         }
         fetchConversations();
       })
       .on('postgres_changes', { 
         event: 'UPDATE', 
         schema: 'public', 
         table: selectedUser.is_group ? 'chat_groups' : 'chat_settings'
       }, (payload) => {
         // Sincronizar o Modo Temporário em tempo real
         const data = payload.new as any;
         if (selectedUser.is_group) {
           if (data.id === selectedUser.id) setIsEphemeralMode(data.is_ephemeral_active);
         } else {
           if ((data.user_a === userId && data.user_b === selectedUser.id) || 
               (data.user_b === userId && data.user_a === selectedUser.id)) {
             setIsEphemeralMode(data.is_ephemeral_active);
           }
         }
       })
       .on('presence', { event: 'sync' }, () => {
         const state = channel.presenceState();
         const targetId = selectedUser.id;
         const typing = Object.values(state).some((p: any) => 
           p.some((presence: any) => presence.user_id === targetId && presence.is_typing)
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

  async function deleteConversation() {
    if (!selectedUser || !userId) return;
    
    const confirmDelete = window.confirm(`Tem certeza que deseja excluir toda a conversa com @${selectedUser.username}? Esta ação não pode ser desfeita.`);
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('direct_messages')
        .delete()
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${userId})`);

      if (error) throw error;
      markAsDeleted(userId, selectedUser.id);
    } catch (err) {
      console.error("Erro ao excluir conversa:", err);
      alert("Erro ao excluir conversa. Tente novamente.");
    }
  }

  async function markAsDeleted(meId: string, otherId: string) {
    // Busca todas as msgs entre os dois
    const { data: msgs } = await supabase
      .from('direct_messages')
      .select('id, deleted_by')
      .or(`and(sender_id.eq.${meId},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${meId})`);

    if (msgs) {
      for (const m of msgs) {
        const deletedBy = m.deleted_by || [];
        if (!deletedBy.includes(meId)) {
          await supabase
            .from('direct_messages')
            .update({ deleted_by: [...deletedBy, meId] })
            .eq('id', m.id);
        }
      }
    }
    setMessages([]);
    setSelectedUser(null);
    fetchConversations();
  }

  async function leaveGroup() {
    if (!selectedUser || !selectedUser.is_group || !userId) return;
    
    const confirmLeave = window.confirm(`Deseja realmente abandonar a tropa ${selectedUser.name}?`);
    if (!confirmLeave) return;

    try {
      // 1. Enviar mensagem de saída
      const leaveMsg = {
        sender_id: userId,
        group_id: selectedUser.id,
        content: `@${userProfile.username} ABANDONOU A TROPA.`,
        receiver_id: userId // receiver_id can be fixed to current user since it is a system message 
      };
      await supabase.from('direct_messages').insert([leaveMsg]);

      // 2. Remover membro
      await supabase.from('group_members').delete().eq('group_id', selectedUser.id).eq('user_id', userId);

      setSelectedUser(null);
      fetchConversations();
    } catch (err) {
      console.error("Erro ao sair:", err);
    }
  }

  async function fetchMutualFriends() {
    if (!userId) return;
    try {
      // Busca quem eu sigo
      const { data: following } = await supabase.from('follows').select('following_id').eq('follower_id', userId);
      // Busca quem me segue
      const { data: followers } = await supabase.from('follows').select('follower_id').eq('following_id', userId);

      if (following && followers) {
        const followingIds = following.map(f => f.following_id);
        const mutualIds = followers.map(f => f.follower_id).filter(id => followingIds.includes(id));

        if (mutualIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', mutualIds);
          setMutualFriends(profiles || []);
        } else {
          setMutualFriends([]);
        }
      }
    } catch (err) {
      console.error("Erro busca mutual:", err);
    }
  }

  async function deleteSelectedConversations() {
    if (selectedChats.length === 0) return;
    const confirmDelete = window.confirm(`Deseja apagar ${selectedChats.length} conversa(s) apenas para você?`);
    if (!confirmDelete) return;

    for (const otherId of selectedChats) {
      await markAsDeleted(userId, otherId);
    }
    
    setIsSelectionMode(false);
    setSelectedChats([]);
  }

  async function createGroup(name: string, members: string[], admins: string[], avatarFile: File | null) {
    if (!userId || !name) return;
    
    setIsUploading(true);
    let avatarUrl = "";
    if (avatarFile) {
      avatarUrl = await uploadMedia(avatarFile, 'image') || "";
    }

    try {
      const { data: group, error: gError } = await supabase
        .from('chat_groups')
        .insert({ name, avatar_url: avatarUrl, created_by: userId })
        .select()
        .single();

      if (gError) throw gError;

      const memberInserts = [
        { group_id: group.id, user_id: userId, is_admin: true }, // Criador é admin
        ...members.map(mId => ({ group_id: group.id, user_id: mId, is_admin: admins.includes(mId) }))
      ];

      const { error: mError } = await supabase.from('group_members').insert(memberInserts);
      if (mError) throw mError;

      // Notificar todos
      for (const mId of members) {
        await supabase.from('notifications').insert({
          user_id: mId,
          from_user_id: userId,
          type: 'message',
          title: `Te adicionou no grupo ${name}`
        });
      }

      setIsGroupModalOpen(false);
      fetchConversations();
    } catch (err) {
      console.error("Erro criar grupo:", err);
    } finally {
      setIsUploading(false);
    }
  }

  async function clearConversation() {
    if (!selectedUser || !userId) return;
    const confirmClear = window.confirm(`Deseja limpar todas as mensagens com @${selectedUser.username}?`);
    if (!confirmClear) return;

    try {
      await supabase
        .from('direct_messages')
        .delete()
        .or(`and(sender_id.eq.${userId},receiver_id.eq.${selectedUser.id}),and(sender_id.eq.${selectedUser.id},receiver_id.eq.${userId})`);
      
      setMessages([]);
      fetchConversations();
    } catch (err) {
      console.error("Erro ao limpar:", err);
    }
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
    try {
      // 1. Buscar Mensagens Privadas
      const { data: privData } = await supabase
        .from('direct_messages')
        .select(`
          *,
          sender:profiles!sender_id(id, username, avatar_url),
          receiver:profiles!receiver_id(id, username, avatar_url)
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .is('group_id', null)
        .not('deleted_by', 'cs', `{${userId}}`)
        .order('created_at', { ascending: false });

      // 2. Buscar Meus Grupos
      const { data: myGroups } = await supabase
        .from('group_members')
        .select(`group:chat_groups(*)`)
        .eq('user_id', userId);

      // 3. Buscar Mensagens de Grupos
      const groupIds = myGroups?.map(m => m.group.id) || [];
      const { data: groupMsgs } = await supabase
        .from('direct_messages')
        .select('*')
        .in('group_id', groupIds)
        .not('deleted_by', 'cs', `{${userId}}`)
        .order('created_at', { ascending: false });

      const convs: Conversation[] = [];

      // Processar Privadas
      if (privData) {
        const privMap = new Map();
        privData.forEach(m => {
          const otherUser = m.sender_id === userId ? m.receiver : m.sender;
          if (otherUser && !privMap.has(otherUser.id)) {
            const unreadCount = privData.filter(msg => 
              msg.sender_id === otherUser.id && msg.receiver_id === userId && !msg.read
            ).length;
            privMap.set(otherUser.id, true);
            convs.push({
              user: otherUser,
              isGroup: false,
              lastMessage: m.content,
              timestamp: m.created_at,
              unreadCount
            });
          }
        });
      }

      // Processar Grupos
      if (myGroups) {
        myGroups.forEach(gm => {
          const g = gm.group;
          const lastM = groupMsgs?.find(m => m.group_id === g.id);
          convs.push({
            group: g,
            isGroup: true,
            lastMessage: lastM ? lastM.content : "Início da Tropa",
            timestamp: lastM ? lastM.created_at : g.created_at,
            unreadCount: 0 // Simplificado para agora
          });
        });
      }

      setConversations(convs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (err) {
      console.error("Erro fetch convs:", err);
    }
    setListLoading(false);
  }



   async function fetchChatSettings(entityId: string) {
     if (!selectedUser) return;
     if (selectedUser.is_group) {
       const { data } = await supabase.from('chat_groups').select('is_ephemeral_active').eq('id', entityId).single();
       if (data) setIsEphemeralMode(data.is_ephemeral_active);
     } else {
       const { data } = await supabase
         .from('chat_settings')
         .select('is_ephemeral_active')
         .or(`and(user_a.eq.${userId},user_b.eq.${entityId}),and(user_a.eq.${entityId},user_b.eq.${userId})`)
         .single();
       if (data) setIsEphemeralMode(data.is_ephemeral_active);
       else setIsEphemeralMode(false);
     }
   }

   async function toggleEphemeralMode() {
     if (!selectedUser || !userId) return;
     const newState = !isEphemeralMode;
     
     if (selectedUser.is_group) {
        await supabase.from('chat_groups').update({ is_ephemeral_active: newState }).eq('id', selectedUser.id);
     } else {
        await supabase.from('chat_settings').upsert({
          user_a: userId < selectedUser.id ? userId : selectedUser.id,
          user_b: userId < selectedUser.id ? selectedUser.id : userId,
          is_ephemeral_active: newState
        }, { onConflict: 'user_a,user_b' });
     }
     setIsEphemeralMode(newState);
     setIsChatMenuOpen(false);
   }

   async function fetchMessages(entityId: string) {
     if (!userId || !entityId) return;

     const query = supabase
       .from('direct_messages')
        .select(`
          *, 
          reply_to:direct_messages(content),
          sender:profiles!sender_id(avatar_url)
        `)
       .not('deleted_by', 'cs', `{${userId}}`)
       .order('created_at', { ascending: true });

     if (selectedUser?.is_group) {
       query.eq('group_id', entityId);
     } else {
       query
         .or(`and(sender_id.eq.${userId},receiver_id.eq.${entityId}),and(sender_id.eq.${entityId},receiver_id.eq.${userId})`)
         .is('group_id', null);
     }

     const { data } = await query;
     if (data) setMessages(data as any);
     if (!selectedUser?.is_group) markAsRead(entityId);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    if (isCameraVisible) stopCamera();
  };

  async function sendMediaMessage(file: File | Blob, type: 'image' | 'audio') {
    if (!selectedUser || !userId) return;
    setIsUploading(true);

    try {
      const publicUrl = await uploadMedia(file, type);
      if (!publicUrl) throw new Error("Erro upload");

      const msgData: any = {
        sender_id: userId,
        content: mediaCaption.trim() || (type === 'image' ? '📷 Foto' : '🎤 Áudio'),
        [type === 'image' ? 'image_url' : 'audio_url']: publicUrl,
        is_temporary: isEphemeralMode,
        expires_at: isEphemeralMode ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null
      };

      if (selectedUser.is_group) {
        msgData.group_id = selectedUser.id;
        msgData.receiver_id = userId;
      } else {
        msgData.receiver_id = selectedUser.id;
      }

      const { error, data } = await supabase.from('direct_messages').insert([msgData]).select('*, reply_to:direct_messages(content)').single();
      if (error) throw error;

      setMessages(prev => [...prev, data]);
      fetchConversations();
      
      if (!selectedUser.is_group) {
        await supabase.from('notifications').insert({
          user_id: selectedUser.id,
          from_user_id: userId,
          type: 'message'
        });
      }
    } catch (err) {
      console.error("Erro enviar mídia:", err);
    } finally {
      setIsUploading(false);
      setMediaPreview(null);
      setSelectedFile(null);
      setMediaCaption('');
    }
  }

  async function sendMessage() {
    if (!input.trim() || !selectedUser || !userId) return;

    const msgData: any = {
      sender_id: userId,
      content: input.trim(),
      reply_to_id: replyingTo?.id || null,
      is_temporary: isEphemeralMode,
      expires_at: isEphemeralMode ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null
    };

    if (selectedUser.is_group) {
      msgData.group_id = selectedUser.id;
      msgData.receiver_id = userId;
    } else {
      msgData.receiver_id = selectedUser.id;
    }

    try {
      const { data, error } = await supabase.from('direct_messages').insert([msgData]).select('*, reply_to:direct_messages(content)').single();
      if (error) throw error;
      
      setInput('');
      setReplyingTo(null);
      setMessages(prev => [...prev, data]);
      fetchConversations();

      if (!selectedUser.is_group) {
        await supabase.from('notifications').insert({
          user_id: selectedUser.id,
          from_user_id: userId,
          type: 'message'
        });
      }
    } catch (err) {
      console.error("Erro ao enviar:", err);
    }
  }

  
  const filteredConversations = conversations.filter(c => {
    const name = c.isGroup ? c.group?.name : c.user?.username;
    return name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className={`direct-chat-container animate-fade-up ${selectedUser ? 'is-in-conversation' : ''}`} style={{ display: 'flex', width: '100%', height: selectedUser ? '100vh' : 'calc(100vh - 70px)', overflow: 'hidden' }}>
      <style>{`
        body:has(.is-in-conversation) .mobile-nav-elite { 
          display: none !important; 
        }
        .dc-container { padding-bottom: 0 !important; }
        .dc-sidebar {
          width: 350px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          border-right: 1px solid rgba(255,255,255,0.05);
          background: #09090D;
        }
        .dc-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          background: #0B0B0F;
          position: relative;
          overflow: hidden;
        }
        .dc-main::before {
          content: "";
          position: absolute;
          inset: 0;
          background: 
            radial-gradient(circle at 20% 30%, rgba(124, 58, 237, 0.1) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(79, 70, 229, 0.1) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, #1a0b3e 0%, #0b0b0f 100%);
          z-index: 0;
        }
        .dc-main::after {
          content: "";
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(white, rgba(255,255,255,0.2) 1.5px, transparent 40px);
          background-size: 250px 250px;
          opacity: 0.1;
          pointer-events: none;
          z-index: 1;
        }
        .dm-window-header {
          position: sticky;
          top: 0;
          z-index: 100;
          padding: 0.8rem 1.2rem;
          display: flex;
          align-items: center;
          min-height: 70px;
          background: rgba(11, 11, 15, 0.6);
          backdrop-filter: blur(25px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
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
        .chat-bubble-velar {
          max-width: 82%;
          width: fit-content;
          min-width: 70px;
          padding: 10px 14px;
          border-radius: 20px;
          font-size: 0.95rem;
          line-height: 1.5;
          position: relative;
          box-shadow: 0 4px 15px rgba(0,0,0,0.3);
          margin-bottom: 12px;
          display: inline-block;
          clear: both;
          word-break: normal;
          overflow-wrap: break-word;
        }
        .chat-bubble-velar:has(.audio-player-elite) {
          padding: 8px 14px !important;
          min-width: 240px;
          max-width: 300px;
          background: linear-gradient(135deg, #6366f1, #a855f7) !important;
        }
        .chat-bubble-velar.sent {
          background: linear-gradient(135deg, #6366f1, #a855f7);
          color: #fff;
          border-bottom-right-radius: 4px;
          box-shadow: 0 4px 25px rgba(168, 85, 247, 0.2);
        }
        .chat-bubble-velar.received {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          border-bottom-left-radius: 4px;
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.05);
        }
        .audio-player-elite {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
        }
        .search-input-chats {
          width: 100%;
          padding: 0.8rem 1.4rem;
          border-radius: 2rem;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          color: #fff;
          font-family: inherit;
          margin-bottom: 1rem;
        }
        .chat-input-urban {
          display: flex;
          align-items: center;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 2.5rem;
          padding: 0.4rem 1.2rem;
          gap: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          min-height: 56px;
          backdrop-filter: blur(15px);
        }
        .chat-input-urban input {
          flex: 1;
          background: transparent !important;
          border: none !important;
          outline: none !important;
          color: #fff !important;
          font-family: inherit;
          font-size: 0.95rem;
          padding: 0.5rem 0;
        }
        .chat-input-urban input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }
        .chat-timestamp-velar {
          font-size: 0.65rem;
          color: rgba(255,255,255,0.4);
          margin-top: 4px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }
      `}</style>
      
      {/* Barra Lateral de Conversas */}
      <aside className="dc-sidebar">
        <div className="dm-sidebar-header" style={{ padding: '1.2rem', borderBottom: '1px solid var(--separator)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.8rem', margin: 0 }}>
              <MessageSquare size={20} color="var(--primary)" /> PAPOS
            </h3>
            
            {/* Menu da Barra Lateral */}
            <div style={{ position: 'relative' }}>
               {isSelectionMode ? (
                 <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={deleteSelectedConversations}
                      disabled={selectedChats.length === 0}
                      style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '6px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer', opacity: selectedChats.length === 0 ? 0.5 : 1 }}
                    >
                      APAGAR ({selectedChats.length})
                    </button>
                    <button 
                      onClick={() => { setIsSelectionMode(false); setSelectedChats([]); }}
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px 12px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' }}
                    >
                      PRONTO
                    </button>
                 </div>
               ) : (
                 <button 
                   onClick={() => setIsSidebarMenuOpen(!isSidebarMenuOpen)}
                   style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '4px' }}
                 >
                   <MoreVertical size={20} />
                 </button>
               )}
               {isSidebarMenuOpen && !isSelectionMode && (
                 <>
                   <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => setIsSidebarMenuOpen(false)} />
                   <div style={{
                     position: 'absolute', top: '100%', right: 0, zIndex: 101,
                     background: 'rgba(15,15,20,0.95)', backdropFilter: 'blur(20px)',
                     border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px',
                     padding: '0.4rem', minWidth: '180px', marginTop: '8px',
                     boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                   }}>
                     <button 
                       onClick={() => { 
                         setIsSidebarMenuOpen(false); 
                         setIsGroupModalOpen(true);
                         fetchMutualFriends();
                       }} 
                       className="menu-btn-velar"
                     >
                       <Users size={16} color="var(--primary)" /> CRIA GRUPO
                     </button>
                     <button onClick={() => { setIsSidebarMenuOpen(false); setIsSelectionMode(true); }} className="menu-btn-velar" style={{ color: '#ef4444' }}>
                       <Trash2 size={16} /> EXCLUIR CONVERSA
                     </button>
                   </div>
                 </>
               )}
             </div>
          </div>
          <input 
            type="text" 
            placeholder="Pesquisar conversa..." 
            className="search-input-chats"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="chat-tabs-container" style={{ display: 'flex', gap: '5px', padding: '0.2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', marginBottom: '0.5rem', position: 'relative', overflow: 'hidden' }}>
             {['TODOS', 'NAO LIDAS', 'GRUPOS', 'SOLICITAÇÕES'].map((tab) => (
               <div 
                 key={tab}
                 className={`chat-tab-item ${filterTab === tab ? 'active' : ''}`}
                 onClick={() => setFilterTab(tab)}
                 style={{ 
                   flex: 1, textAlign: 'center', padding: '0.8rem 0.2rem', 
                   fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer',
                   transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                   borderRadius: '10px',
                   color: filterTab === tab ? '#000' : 'rgba(255,255,255,0.4)',
                   background: filterTab === tab ? 'var(--primary)' : 'transparent',
                   position: 'relative', zIndex: 2
                 }}
               >
                 {tab}
               </div>
             ))}
           </div>
         </div>

         {/* Container Deslizante das Listas (Sidebar Swipe) */}
         <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <div style={{ 
              display: 'flex', width: '400%', height: '100%',
              transform: `translateX(-${['TODOS', 'NAO LIDAS', 'GRUPOS', 'SOLICITAÇÕES'].indexOf(filterTab) * 25}%)`,
              transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              {['TODOS', 'NAO LIDAS', 'GRUPOS', 'SOLICITAÇÕES'].map(tab => (
                <div key={tab} style={{ width: '25%', height: '100%', overflowY: 'auto', padding: '0.75rem' }}>
                   {listLoading ? (
                     <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                       <Loader2 className="animate-spin" color="var(--primary)" />
                     </div>
                   ) : (filteredConversations || []).filter(c => {
                       if (tab === 'GRUPOS') return c.isGroup;
                       if (tab === 'NAO LIDAS') return c.unreadCount > 0;
                       return true;
                   }).length === 0 ? (
                     <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.3 }}>
                        <MessageSquare size={40} style={{ marginBottom: '10px', marginLeft: 'auto', marginRight: 'auto' }} />
                        <p style={{ fontSize: '0.8rem', fontWeight: 700 }}>Nada por aqui ainda...</p>
                     </div>
                   ) : (
                    (filteredConversations || [])
                      .filter(c => {
                        if (tab === 'GRUPOS') return c.isGroup;
                        if (tab === 'NAO LIDAS') return c.unreadCount > 0;
                        return true;
                      })
                      .map((c, idx) => {
                       const entityId = c.isGroup ? c.group.id : c.user.id;
                       return (
                        <div 
                          key={entityId || idx} 
                          className={`chat-list-item-urban ${((c.isGroup && selectedUser?.id === c.group.id) || (!c.isGroup && selectedUser?.id === c.user.id)) ? 'active' : ''} ${isSelectionMode ? 'selection-mode' : ''}`}
                          onClick={() => {
                            if (isSelectionMode) {
                              setSelectedChats(prev => prev.includes(entityId) ? prev.filter(id => id !== entityId) : [...prev, entityId]);
                            } else {
                              if (c.isGroup) setSelectedUser({ ...c.group, is_group: true });
                              else setSelectedUser({ ...c.user, is_group: false });
                            }
                          }}
                        >
                          <div style={{ position: 'relative' }}>
                            {isSelectionMode && (
                              <div style={{
                                width: '22px', height: '22px', borderRadius: '50%',
                                border: '2px solid var(--primary)', marginRight: '10px',
                                background: selectedChats.includes(entityId) ? 'var(--primary)' : 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}>
                                {selectedChats.includes(entityId) && <Check size={14} color="#000" strokeWidth={4} />}
                              </div>
                            )}
                            <img 
                              src={(c.isGroup ? c.group.avatar_url : c.user.avatar_url) || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + entityId} 
                              style={{ width: '52px', height: '52px', borderRadius: '50%', border: '2px solid var(--separator)', objectFit: 'cover' }}
                            />
                            {c.unreadCount > 0 && <span className="unread-badge-velar">{c.unreadCount}</span>}
                          </div>
                          
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                              <h3 style={{ fontSize: '0.95rem', fontWeight: 900, margin: 0 }}>{c.isGroup ? c.group.name : `@${c.user.username}`}</h3>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p style={{ fontSize: '0.85rem', color: c.unreadCount > 0 ? '#fff' : 'var(--text-muted)', fontWeight: c.unreadCount > 0 ? 700 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>
                              {c.lastMessage}
                            </p>
                          </div>
                        </div>
                       );
                     })
                   )}
                </div>
              ))}
            </div>
         </div>
      </aside>



      {/* Janela de Chat */}
      <main className="dc-main">
        {selectedUser ? (
          <>
            <header className="dm-window-header">
              <div style={{ width: '44px', display: 'flex', justifyContent: 'flex-start' }}>
                <button className="btn-back-dm" onClick={() => setSelectedUser(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.4rem' }}>
                  <ArrowLeft size={24} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', flex: 1, textAlign: 'center' }}>
                {selectedUser.avatar_url ? (
                  <img src={selectedUser.avatar_url} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} alt="Avatar" />
                ) : (
                  <div className="velar-elite-avatar" style={{ width: '40px', height: '40px' }}>
                    <User size={20} />
                  </div>
                )}
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem' }}>
                      {selectedUser.is_group ? selectedUser.name : `@${selectedUser.username}`}
                    </h4>
                    {isEphemeralMode && <Clock size={16} color="var(--primary)" className="animate-pulse" />}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 800, letterSpacing: '0.5px' }}>
                    {selectedUser.is_group ? 'TROPA ATIVA' : 'NA PISTA AGORA'}
                  </p>
                </div>
              </div>

              <div style={{ width: '44px', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  onClick={() => setIsChatMenuOpen(!isChatMenuOpen)}
                  style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center' }}
                >
                  <MoreVertical size={22} />
                </button>

                {isChatMenuOpen && (
                  <>
                    <div 
                      style={{ position: 'fixed', inset: 0, zIndex: 100 }} 
                      onClick={() => setIsChatMenuOpen(false)} 
                    />
                    <div style={{
                      position: 'absolute', top: '100%', right: 0, zIndex: 101,
                      background: 'rgba(15,15,20,0.95)', backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
                      padding: '0.5rem', minWidth: '200px', marginTop: '10px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                      animation: 'slideUp 0.2s ease'
                    }}>
                      {selectedUser?.is_group ? (
                        <button 
                          onClick={() => { setIsChatMenuOpen(false); leaveGroup(); }}
                          className="menu-btn-velar" style={{ color: '#ef4444' }}
                        >
                          <LogOut size={16} /> SAIR DO GRUPO
                        </button>
                      ) : (
                        <>
                          <button 
                            onClick={() => { setIsChatMenuOpen(false); clearConversation(); }}
                            className="menu-btn-velar"
                          >
                            <Trash2 size={16} color="var(--primary)" /> LIMPAR CONVERSA
                          </button>
                          
                          <button 
                            onClick={() => { toggleEphemeralMode(); setIsChatMenuOpen(false); }}
                            className="menu-btn-velar"
                          >
                            <Clock size={16} color="var(--primary)" /> MENSAGEM TEMPORÁRIA
                          </button>

                          <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0.4rem 0.5rem' }} />

                          <button 
                            onClick={() => { alert('Cria bloqueado!'); setIsChatMenuOpen(false); }}
                            className="menu-btn-velar" style={{ color: '#ef4444' }}
                          >
                            <Slash size={16} /> BLOQUEAR
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </header>

            <div className="dm-messages-area" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ textAlign: 'center', margin: '1rem 0 2rem', opacity: 0.4 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: 600 }}>
                  <ShieldCheck size={14} /> PAPO RETO & SIGILO ABSOLUTO
                </div>
              </div>

              {messages.map((m) => (
                <MessageBubble 
                  key={m.id}
                  message={m}
                  isMe={m.sender_id === userId}
                  onSwipe={(msg) => setReplyingTo(msg)}
                />
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

            <div style={{ padding: '0.5rem 1.5rem', background: 'rgba(5,5,5,0.8)', backdropFilter: 'blur(10px)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              {/* Preview de Resposta */}
              {replyingTo && (
                <div style={{ 
                  background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.8rem', 
                  marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '12px',
                  borderLeft: '4px solid var(--primary)', animation: 'slideUp 0.2s ease'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 900, marginBottom: '2px' }}>
                      RESPONDENDO PARA {replyingTo.sender_id === userId ? 'VOCÊ' : `@${selectedUser.username || 'GRUPO'}`}
                    </p>
                    <p style={{ fontSize: '0.85rem', opacity: 0.6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {replyingTo.content}
                    </p>
                  </div>
                  <button onClick={() => setReplyingTo(null)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>
              )}

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

      {/* Modal de Encaminhamento */}
      {messageToForward && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999999,
          background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            background: '#111', width: '100%', maxWidth: '450px',
            borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)',
            padding: '1.5rem', maxHeight: '80vh', display: 'flex', flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--primary)' }}>ENCAMINHAR PAPO</h2>
                <p style={{ fontSize: '0.75rem', opacity: 0.5 }}>Escolha pra quem mandar essa fita</p>
              </div>
              <button onClick={() => setMessageToForward(null)} style={{ background: 'transparent', border: 'none', color: '#fff' }}>
                <X />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {conversations.map((c, idx) => {
                const entityId = c.isGroup ? c.group.id : c.user.id;
                return (
                  <div 
                    key={entityId || idx}
                    onClick={async () => {
                      const forwardData = {
                        sender_id: userId,
                        content: messageToForward.content,
                        image_url: messageToForward.image_url,
                        audio_url: messageToForward.audio_url,
                        is_forwarded: true,
                        [c.isGroup ? 'group_id' : 'receiver_id']: entityId
                      };
                      await supabase.from('direct_messages').insert([forwardData]);
                      setMessageToForward(null);
                      alert('Encaminhado com sucesso!');
                    }}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '12px', 
                      padding: '0.8rem', borderRadius: '14px', cursor: 'pointer',
                      background: 'rgba(255,255,255,0.03)', marginBottom: '8px'
                    }}
                  >
                    <img 
                      src={(c.isGroup ? c.group.avatar_url : c.user.avatar_url) || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + entityId} 
                      style={{ width: '40px', height: '40px', borderRadius: '50%' }} 
                    />
                    <span style={{ fontWeight: 800 }}>{c.isGroup ? c.group.name : `@${c.user.username}`}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

       {/* Modais Globais (Fora de qualquer condicional de contexto) */}
       {isGroupModalOpen && (
         <div style={{
           position: 'fixed', inset: 0, zIndex: 9999999,
           background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(20px)',
           display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
         }}>
           <div style={{
             background: '#111', width: '100%', maxWidth: '450px',
             borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)',
             padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto'
           }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
               <h2 style={{ fontSize: '1.5rem', fontWeight: 900 }}>NOVO GRUPO</h2>
               <button onClick={() => setIsGroupModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff' }}><X /></button>
             </div>

             {/* Info Básica */}
             <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div 
                  onClick={() => document.getElementById('group-avatar-input')?.click()}
                  style={{ width: '80px', height: '80px', borderRadius: '24px', background: 'rgba(255,255,255,0.05)', border: '2px dashed rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}
                >
                  {selectedFile ? <img src={URL.createObjectURL(selectedFile)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Camera color="rgba(255,255,255,0.3)" />}
                </div>
                <input type="file" id="group-avatar-input" hidden accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                <div style={{ flex: 1 }}>
                  <input 
                    type="text" 
                    id="group-name"
                    placeholder="Nome da Tropa..." 
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px', color: '#fff', fontSize: '1rem', fontWeight: 700 }}
                  />
                </div>
             </div>

             {/* Lista de Crias */}
             <p style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.8rem' }}>ADICIONAR CRIAS (MUTUALS)</p>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.5rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '5px' }}>
                {mutualFriends.length === 0 ? (
                  <p style={{ opacity: 0.5, fontSize: '0.85rem' }}>Nenhum cria mútuo encontrado...</p>
                ) : (
                  mutualFriends.map(f => {
                    const isSelected = selectedChats.includes(f.id);
                    return (
                      <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '0.8rem', borderRadius: '12px' }}>
                        <img src={f.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + f.id} style={{ width: '38px', height: '38px', borderRadius: '50%' }} />
                        <span style={{ flex: 1, fontWeight: 700, fontSize: '0.9rem' }}>@{f.username}</span>
                        
                        <button 
                          onClick={() => {
                            setSelectedChats(prev => prev.includes(f.id) ? prev.filter(id => id !== f.id) : [...prev, f.id]);
                          }}
                          style={{
                            padding: '0.4rem 0.8rem', borderRadius: '8px', border: 'none',
                            background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                            color: isSelected ? '#000' : '#fff', fontWeight: 800, fontSize: '0.7rem', cursor: 'pointer'
                          }}
                        >
                          {isSelected ? 'ADICIONADO' : 'ADICIONAR'}
                        </button>
                      </div>
                    );
                  })
                )}
             </div>

             <button 
               disabled={isUploading || selectedChats.length === 0}
               onClick={() => {
                 const name = (document.getElementById('group-name') as HTMLInputElement).value;
                 if (name) createGroup(name, selectedChats, [], selectedFile);
               }}
               style={{ width: '100%', background: 'var(--primary)', border: 'none', color: '#000', padding: '1.2rem', borderRadius: '16px', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
             >
               {isUploading ? <Loader2 className="animate-spin" /> : 'CRIAR TROPA'}
             </button>
           </div>
         </div>
       )}

      {/* Modal de Confirmação de Exclusão */}
      {messageToDelete && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999999,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(15px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1a20 0%, #0a0a0c 100%)',
            width: '100%', maxWidth: '340px',
            borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)',
            padding: '2rem', textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
          }}>
            <div style={{ 
              width: '60px', height: '60px', borderRadius: '50%', 
              background: 'rgba(239, 68, 68, 0.1)', display: 'flex', 
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem'
            }}>
              <Trash2 size={30} color="#ef4444" />
            </div>
            
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '0.5rem' }}>SUMIR COM O PAPO?</h2>
            <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', marginBottom: '2rem' }}>
              Essa mensagem vai sumir apenas pra você, mas o sigilo continua. Confirmar?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={confirmDeleteMessage}
                style={{
                  width: '100%', background: '#ef4444', border: 'none',
                  color: '#fff', padding: '1rem', borderRadius: '16px',
                  fontWeight: 900, fontSize: '0.9rem', cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
                }}
              >
                SIM, APAGAR AGORA
              </button>
              <button 
                onClick={() => setMessageToDelete(null)}
                style={{
                  width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', padding: '1rem', borderRadius: '16px',
                  fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer'
                }}
              >
                NÃO, DEIXA ELA AÍ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
