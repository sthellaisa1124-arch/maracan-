import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { GIFT_CATALOG } from '../lib/gifts';
import AgoraRTC, { 
  type IAgoraRTCClient, 
  type ICameraVideoTrack, 
  type IMicrophoneAudioTrack, 
  type IAgoraRTCRemoteUser 
} from 'agora-rtc-sdk-ng';
import { Heart, Users, UserPlus, Mic, MicOff, Camera, X, ChevronRight, ChevronLeft, Gift, Video, Share2, BarChart2, Zap, Power, Sparkles, Swords } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { GiftAnimationOverlay } from './GiftAnimationOverlay';
import { GiftPanel } from './GiftPanel';
import { LiveBattleModal } from './LiveBattleModal';
import { GlobalBattleMatchmaker } from './GlobalBattleMatchmaker';
import { BattleScoreBar } from './BattleScoreBar';
import { UserBadges } from './Badges';
import BeautyExtension from 'agora-extension-beauty-effect';
import VirtualBackgroundExtension from 'agora-extension-virtual-background';
import { LiveSummaryModal } from './LiveSummaryModal';
import { getGifterLevel } from './GifterBadge';

const BEAUTY_PRESETS = {
  original: null,
  natural: { lighteningLevel: 0.3, rednessLevel: 0.1, smoothnessLevel: 0.5, sharpnessLevel: 0.3 },
  soft: { lighteningLevel: 0.5, rednessLevel: 0.3, smoothnessLevel: 0.8, sharpnessLevel: 0.5 },
  elite: { lighteningLevel: 0.7, rednessLevel: 0.5, smoothnessLevel: 1.0, sharpnessLevel: 0.6 }
};

const VIBE_PRESETS = {
  original: { brightness: 100, contrast: 100, saturate: 100, sepia: 0, grayscale: 0 },
  rio: { brightness: 110, contrast: 110, saturate: 140, sepia: 0, grayscale: 0 },
  cinema: { brightness: 90, contrast: 130, saturate: 85, sepia: 0, grayscale: 0 },
  retro: { brightness: 100, contrast: 95, saturate: 90, sepia: 40, grayscale: 0 },
  pb: { brightness: 105, contrast: 120, saturate: 0, sepia: 0, grayscale: 100 }
};

const AMBIENTE_PRESETS = {
  original: { type: 'none' },
  desfocar: { type: 'blur', blurDegree: 2 },
  escritorio: { type: 'img', source: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200' },
  praia: { type: 'img', source: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200' }
};

const APP_ID = import.meta.env.VITE_AGORA_APP_ID;

interface LiveRoomProps {
  session: any;
  role: 'host' | 'audience';
  room: {
    id: string;
    host_id: string;
    agora_channel: string;
    title: string;
    viewer_count?: number;
    host_profile?: any;
    goal_type?: 'gifts' | 'followers';
    goal_title?: string;
    goal_target?: number;
    goal_current?: number;
    goal_gift_id?: string | null;
  };
  userProfile?: any;
  onClose: () => void;
  inline?: boolean;
}

export function LiveRoom({ session, userProfile, role, room, onClose, inline }: LiveRoomProps) {
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  // const viewerCount = room.viewer_count || 0; // Removido para usar sessionViewers
  
  // UI States
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [chat, setChat] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [activeGift, setActiveGift] = useState<any | null>(null);
  const [giftQueue, setGiftQueue] = useState<any[]>([]);
  const [isGiftPanelOpen, setIsGiftPanelOpen] = useState(false);
  
  // NOVOS ESTADOS DA LIVE
  const [liveStartTime] = useState(Date.now());
  const [sessionGifts, setSessionGifts] = useState(0);
  const [sessionLikes, setSessionLikes] = useState(0);
  const [sessionFollowers, setSessionFollowers] = useState(0);
  const [sessionViewers, setSessionViewers] = useState(room.viewer_count || 1);
  const [isEnded, setIsEnded] = useState(false);
  const [showHostStats, setShowHostStats] = useState(false);
  const [agoraError, setAgoraError] = useState<string | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(role === 'audience'); // Audiência "já está em live" sob a ótica de consumo
  const [activeBeautyPreset, setActiveBeautyPreset] = useState<keyof typeof BEAUTY_PRESETS>('original');
  const [activeVibePreset, setActiveVibePreset] = useState<keyof typeof VIBE_PRESETS>('original');
  const [activeAmbientePreset, setActiveAmbientePreset] = useState<keyof typeof AMBIENTE_PRESETS>('original');
  const [activeEffectTab, setActiveEffectTab] = useState<'vibe' | 'ambiente'>('vibe');
  const [isBeautyMenuOpen, setIsBeautyMenuOpen] = useState(false);
  
  // BATALHAS (CONFRONTO)
  const [isBattleModalOpen, setIsBattleModalOpen] = useState(false);
  const [isGlobalMatchmakerOpen, setIsGlobalMatchmakerOpen] = useState(false);
  const [activeBattle, setActiveBattle] = useState<any | null>(null);
  const [battleTimeLeft, setBattleTimeLeft] = useState(180); // 3 minutes

  useEffect(() => {
    if (activeBattle && battleTimeLeft > 0) {
      const timer = setTimeout(() => setBattleTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [activeBattle, battleTimeLeft]);

  async function handleInviteOpponent(opponent: any) {
    setIsBattleModalOpen(false);
    alert(`Convite enviado para @${opponent.profiles?.username || 'Oponente'}! Em produção aguardaríamos o aceite.`);
    
    // Inicia a batalha imediatamente para fins de MVP
    setActiveBattle({
       opponentId: opponent.host_id,
       opponentProfile: opponent.profiles,
       score_a: 0,
       score_b: 0
    });
    setBattleTimeLeft(180);
    
    // Configura o Agora Relay Channel (Opcional, pro MVP a UI divide de qualquer forma)
    if (agoraClientRef.current) {
        // ... (SDK Agora cross relay connection setup goes here in future)
    }
  }

  // INTERATIVIDADE DE ELITE (FILA DE ENTRADA)
  const [hearts, setHearts] = useState<{ id: number, color: string, x: number, y: number }[]>([]);
  const [entranceQueue, setEntranceQueue] = useState<any[]>([]);
  const [activeEntrance, setActiveEntrance] = useState<any | null>(null);
  const [quickEntrances, setQuickEntrances] = useState<{id: string, username: string}[]>([]);
  const [totalLikes, setTotalLikes] = useState(0);
  const [statsHistory, setStatsHistory] = useState<any[]>([]);

  // ESTADOS DE META (REALTIME)
  const [goalType, setGoalType] = useState<'gifts' | 'followers'>(room.goal_type || 'gifts');
  const [goalTitle, setGoalTitle] = useState(room.goal_title || '');
  const [goalTarget, setGoalTarget] = useState(room.goal_target || 0);
  const [goalCurrent, setGoalCurrent] = useState(room.goal_current || 0);
  const [goalGiftId, setGoalGiftId] = useState<string | null>(room.goal_gift_id || null);
  const [isGoalPickerOpen, setIsGoalPickerOpen] = useState(false);
  const [isGoalPanelOpen, setIsGoalPanelOpen] = useState(false);

  const [isFollowing, setIsFollowing] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatChannelRef = useRef<any>(null); // Ref para o canal de chat
  const agoraClientRef = useRef<any>(null); // Refs imortais para shutdown
  const localAudioRef = useRef<any>(null);
  const localVideoRef = useRef<any>(null);
  const [activeUserProfile, setActiveUserProfile] = useState<any>(userProfile);
  const beautyProcessorRef = useRef<any>(null);
  const vbgProcessorRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchFreshProfile() {
      if (!session?.user?.id) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('username, avatar_url, badges, total_donated')
          .eq('id', session.user.id)
          .single();
        if (data && !error) {
          setActiveUserProfile(data);
        }
      } catch (e) {
        console.error("Erro ao carregar perfil fresco:", e);
      }
    }
    fetchFreshProfile();
  }, [session?.user?.id]);

  useEffect(() => {
    let active = true;

    const timer = setTimeout(() => {
      // Se for desmontado prematuramente pelo React (ex: modo estrito no dev), não abre a câmera dupla!
      if (!active) return;
      
      initAgora();
      setupRealtime();
      checkFollowStatus();
    }, 150);

    return () => {
      active = false;
      cleanupTracks();
      clearTimeout(timer);
    };
  }, [room.host_id, session?.user?.id]);


  // MOTOR DA FILA DE ENTRADA ELITE
  useEffect(() => {
    if (!activeEntrance && entranceQueue.length > 0) {
      const nextOne = entranceQueue[0];
      setEntranceQueue(prev => prev.slice(1));
      setActiveEntrance(nextOne);
      const timer = setTimeout(() => {
        setActiveEntrance(null);
      }, 4000); // 4s e some
      return () => clearTimeout(timer);
    }
  }, [activeEntrance, entranceQueue]);

  // MOTOR DA FILA DE PRESENTES (anima um por vez)
  useEffect(() => {
    if (!activeGift && giftQueue.length > 0) {
      const next = giftQueue[0];
      setGiftQueue(prev => prev.slice(1));
      setActiveGift(next);
    }
  }, [activeGift, giftQueue]);

  // GARANTIR QUE A TRACK DE VÍDEO RODE MESMO DEPOIS DE MONTAR TARDE
  useEffect(() => {
    if (role === 'audience') {
      const hostUser = remoteUsers.find(u => String(u.uid) === String(room.host_id));
      if (hostUser?.videoTrack) {
        const el = document.getElementById(`remote-video-${room.host_id}`);
        if (el && el.childElementCount === 0) {
          hostUser.videoTrack.play(el);
        }
      }
    }
  }, [remoteUsers, role, room.host_id]);

  async function initAgora() {
    const agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    agoraClientRef.current = agoraClient;

    agoraClient.on('user-published', async (user, mediaType) => {
      await agoraClient.subscribe(user, mediaType);
      
      if (mediaType === 'video') {
        const remoteUser = user;
        setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), remoteUser]);
        
        if (role === 'audience' && String(user.uid) === String(room.host_id)) {
          setTimeout(() => {
            const el = document.getElementById(`remote-video-${room.host_id}`);
            if (el) user.videoTrack?.play(el);
          }, 500);
        }
      }
      if (mediaType === 'audio') {
        user.audioTrack?.play();
      }
    });

    agoraClient.on('user-unpublished', (user) => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
    });

    // ENTRAR NA SALA
    try {
      await agoraClient.join(APP_ID, room.agora_channel, null, session.user.id);
      
      if (role === 'host') {
        const audio = await AgoraRTC.createMicrophoneAudioTrack();
        const video = await AgoraRTC.createCameraVideoTrack({
          facingMode: 'user', 
          encoderConfig: '720p_1',
          optimizationMode: 'motion'
        });
        
        setLocalAudioTrack(audio);
        setLocalVideoTrack(video);
        localAudioRef.current = audio;
        localVideoRef.current = video;
        
        try {
          const extension = new BeautyExtension();
          AgoraRTC.registerExtensions([extension]);
          const processor = extension.createProcessor();
          beautyProcessorRef.current = processor;
          
          const vbgExtension = new VirtualBackgroundExtension();
          AgoraRTC.registerExtensions([vbgExtension]);
          const vbgProcessor = vbgExtension.createProcessor();
          vbgProcessorRef.current = vbgProcessor;
          
          vbgProcessor.init("https://cdn.jsdelivr.net/npm/agora-extension-virtual-background@2.1.0/wasms/").catch((e: any) => console.log('Wasm VBG (Ignorável):', e));
          
          video.pipe(processor).pipe(vbgProcessor).pipe(video.processorDestination);
          
          if (videoContainerRef.current) {
            video.play(videoContainerRef.current, { mirror: true });
          }
        } catch (beautyErr) {
          console.error("Erro ao carregar extensões de vídeo:", beautyErr);
        }
      }
    } catch (err: any) {
      console.error('Erro Agora:', err);
      if (err.message?.includes('NOT_READABLE') || err.message?.includes('NotReadableError')) {
        setAgoraError('Câmera em uso por outro app ou bloqueada. 🚫🎥');
      } else {
        setAgoraError('Falha ao iniciar sinal da Live. Verifique as permissões.');
      }
    }
  }

  async function handleGoLive() {
    if (!localAudioTrack || !localVideoTrack || !agoraClientRef.current) return;
    setIsClosing(true); // Usado para mostrar loader se necessário, mas vamos usar um estado específico se preferir
    
    try {
      // 1. Ativar no Banco de Dados
      const { error: dbError } = await supabase
        .from('live_sessions')
        .update({ 
          is_live: true, 
          started_at: new Date().toISOString() 
        })
        .eq('id', room.id);

      if (dbError) throw dbError;

      // 2. Notificar Seguidores
      try {
        const { data: followers } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', session.user.id);
        
        if (followers && followers.length > 0) {
          const notifications = followers.map(f => ({
            user_id: f.follower_id,
            from_user_id: session.user.id,
            type: 'live',
            title: 'ESTAMOS AO VIVO! 🔥',
            message: `@${session.user.user_metadata?.username || 'Um cria'} abriu uma live agora! Vem fechar! 🏙️`,
            read: false
          }));
          await supabase.from('notifications').insert(notifications);
        }
      } catch (notifErr) {
        console.error("Erro ao notificar seguidores:", notifErr);
      }

      // 3. Publicar sinal para o mundo
      await agoraClientRef.current.publish([localAudioTrack, localVideoTrack]);
      setIsBroadcasting(true);
      setIsClosing(false);
    } catch (err) {
      console.error("Erro ao iniciar transmissão:", err);
      setIsClosing(false);
      alert("Erro ao iniciar a live. Tente novamente.");
    }
  }

  function updateCSSFilters(beauty: string, vibe: string, ambiente: string) {
    if (!videoContainerRef.current) return;
    
    // Aplica o filtro diretamente no container principal para garantir que englobe o <video>
    // independente de como a Agora renderiza a hierarquia interna.
    const targetEl = videoContainerRef.current;
    
    const vibePreset = VIBE_PRESETS[vibe as keyof typeof VIBE_PRESETS] || VIBE_PRESETS.original;
    
    let blurStr = '';
    let extraFilter = '';

    // Efeitos simulados via CSS caso as extensões pesadas falhem/não estejam ativas
    if (!beautyProcessorRef.current || true) { // CSS ativo como fallback constante
      if (beauty === 'natural') { blurStr = 'blur(1px) '; extraFilter += 'saturate(120%) brightness(105%) '; }
      if (beauty === 'soft') { blurStr = 'blur(1.5px) '; extraFilter += 'saturate(115%) brightness(110%) '; }
      if (beauty === 'elite') { blurStr = 'blur(2px) '; extraFilter += 'saturate(130%) brightness(115%) contrast(110%) '; }
    }
    
    if (!vbgProcessorRef.current || true) {
       if (ambiente === 'escritorio') extraFilter += 'hue-rotate(15deg) saturate(80%) contrast(115%) '; 
       if (ambiente === 'praia') extraFilter += 'sepia(30%) saturate(180%) brightness(120%) ';
       if (ambiente === 'galeria' || ambiente === 'desfocar' || (ambiente && ambiente.startsWith('fundo-'))) extraFilter += ' '; 
    }
    
    targetEl.style.filter = `${blurStr}${extraFilter}brightness(${vibePreset.brightness}%) contrast(${vibePreset.contrast}%) saturate(${vibePreset.saturate}%) sepia(${vibePreset.sepia}%) grayscale(${vibePreset.grayscale}%)`;
    targetEl.style.transition = 'filter 0.5s ease-in-out';
  }

  async function applyBeautyPreset(presetKey: keyof typeof BEAUTY_PRESETS) {
    setActiveBeautyPreset(presetKey);
    if (!localVideoTrack) return;
    
    // Tenta aplicar na Engine da Agora caso exista
    if (beautyProcessorRef.current) {
      try {
        const preset = BEAUTY_PRESETS[presetKey];
        if (presetKey === 'original') await beautyProcessorRef.current.disable();
        else {
          await beautyProcessorRef.current.setOptions(preset);
          await beautyProcessorRef.current.enable();
        }
      } catch (err) { console.error("Erro Beauty Agora:", err); }
    }
    
    // Fallback/Efeito Imediato CSS
    updateCSSFilters(presetKey, activeVibePreset, activeAmbientePreset);
  }

  async function applyVibePreset(presetKey: keyof typeof VIBE_PRESETS) {
    setActiveVibePreset(presetKey);
    if (!localVideoTrack) return;
    updateCSSFilters(activeBeautyPreset, presetKey, activeAmbientePreset);
  }

  async function applyAmbientePreset(presetKey: string) {
    setActiveAmbientePreset(presetKey as any);
    if (!localVideoTrack) return;
    
    // Tenta aplicar na Engine Virtual Background da Agora
    if (vbgProcessorRef.current) {
      try {
        if (presetKey === 'original') { 
          await vbgProcessorRef.current.disable(); 
        } else if (presetKey === 'desfocar') {
          await vbgProcessorRef.current.setOptions({ type: 'blur', blurDegree: 2 });
          await vbgProcessorRef.current.enable();
        } else if (presetKey.startsWith('fundo-')) {
          let url = "";
          if (presetKey === 'fundo-paris') url = "/bgs/paris.jpg";
          if (presetKey === 'fundo-cristo') url = "/bgs/cristo.png";
          if (presetKey === 'fundo-favela') url = "/bgs/favela.png";
          if (presetKey === 'fundo-quarto') url = "/bgs/gamer.png";
          if (presetKey === 'fundo-piscina') url = "/bgs/piscina.png";

          // Lê da pasta local bypassando bloqueio de cross-origin estrito
          const res = await fetch(url);
          const blob = await res.blob();
          const img = new Image();
          img.src = URL.createObjectURL(blob);
          img.onload = async () => {
             await vbgProcessorRef.current.setOptions({ type: 'img', source: img });
             await vbgProcessorRef.current.enable();
          }
        } else if (presetKey !== 'galeria') {
          const preset = AMBIENTE_PRESETS[presetKey as keyof typeof AMBIENTE_PRESETS] as any;
          if (preset) {
            await vbgProcessorRef.current.setOptions(preset);
            await vbgProcessorRef.current.enable();
          }
        }
      } catch (err) { console.error("Erro Ambient Agora:", err); }
    }
    
    // Fallback/Efeito Imediato CSS
    updateCSSFilters(activeBeautyPreset, activeVibePreset, presetKey as string);
  }

  async function handleCustomBackgroundUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !vbgProcessorRef.current || !localVideoTrack) return;
    
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = async () => {
      try {
        await vbgProcessorRef.current.setOptions({ type: 'img', source: img });
        await vbgProcessorRef.current.enable();
        
        // Limpar os outros presets pois aplicamos o fundo da galeria com sucesso
        applyVibePreset('original');
        applyBeautyPreset('original');
        setActiveAmbientePreset('galeria');
        updateCSSFilters('original', 'original', 'galeria');
      } catch (err) {
        console.error("Erro fundo customizado:", err);
      }
    };
  }

  function setupRealtime() {
    const chatChannel = supabase.channel(`live_chat:${room.id}`);
    chatChannelRef.current = chatChannel;
    
    chatChannel
      .on('broadcast', { event: 'chat' }, ({ payload }) => {
        setChat(prev => [...prev, payload]);
      })
      .on('broadcast', { event: 'gift' }, ({ payload }) => {
        setGiftQueue(prev => [...prev, payload]);
        setSessionGifts(prev => prev + payload.gift.price);
        
        // Atualizar meta se for tipo presentes (na tela)
        // Se houver um presente específico definido, só conta se for ele
        const isMatch = !goalGiftId || payload.gift.id === goalGiftId;
        if (isMatch) {
           setGoalCurrent((prev: number) => prev + (goalGiftId ? 1 : payload.gift.price));
        }

        // Se estiver num confronto, conta pontos (Simplificado para todos os presentes irem pro dono da live logado: no real teria userId target)
        setActiveBattle(prevBattle => {
           if (!prevBattle) return prevBattle;
           // O dono desta sala recebeu
           return { ...prevBattle, score_a: prevBattle.score_a + payload.gift.price };
        });

        // Se for o Host, atualizamos o banco para persistência
        if (role === 'host') {
           supabase.from('live_sessions')
             .update({ goal_current: isMatch ? (goalCurrent + (goalGiftId ? 1 : payload.gift.price)) : goalCurrent })
             .eq('id', room.id)
             .then(() => {});
        }

        setChat(prev => [...prev, { 
          username: payload.username || 'Desconhecido', 
          content: `🎁 enviou um ${payload.gift.name}!`,
          isSystem: true,
          badges: payload.badges || [],
          donated_amount: payload.donated_amount || 0
        }]);
      })
      .on('broadcast', { event: 'like' }, ({ payload }) => {
        setSessionLikes(prev => prev + 1);
        setTotalLikes(payload.totalCount || (totalLikes + 1));
        
        // Se não fui eu que curti, mostro um coração flutuante vindo da rede
        if (payload.userId !== session.user.id) {
          const colors = ['#ff4b2b', '#ff416c', '#6c2bff', '#fbbf24'];
          const newHeart = { id: Date.now(), color: colors[Math.floor(Math.random() * colors.length)] };
          setHearts(prev => [...prev, newHeart]);
          setTimeout(() => setHearts(prev => prev.filter(h => h.id !== newHeart.id)), 1500);
        }
      })
      .on('broadcast', { event: 'follow' }, () => {
        setSessionFollowers((prev: number) => prev + 1);
        // Atualizar meta se for tipo seguidores
        setGoalCurrent((prev: number) => prev + 1);
        
        // Se for o Host, atualiza o banco
        if (role === 'host') {
           supabase.from('live_sessions')
             .update({ goal_current: goalCurrent + 1 })
             .eq('id', room.id)
             .then(() => {});
        }
      })
      .on('broadcast', { event: 'goal_update' }, ({ payload }) => {
        setGoalType(payload.type);
        setGoalTitle(payload.title);
        setGoalTarget(payload.target);
        setGoalCurrent(payload.current);
        setGoalGiftId(payload.giftId);
      })
      .on('presence', { event: 'sync' }, () => {
        const newState = chatChannel.presenceState();
        const count = Object.keys(newState).length;
        setSessionViewers(count);
        
        // Se for o Host, atualiza o banco para persistência na aba Lives
        if (role === 'host') {
          supabase.from('live_sessions')
            .update({ viewer_count: count })
            .eq('id', room.id)
            .then(() => {});
        }
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences.forEach((p: any) => {
          // IGNORA O HOST (Evita notificar no chat ou como Brabo a entrada do próprio Criador da Live)
          if (p.user_id === room.host_id) return;

          const donated = p.total_donated || 0;
          const level = getGifterLevel(donated);
          
          if (level >= 25) {
            // ELITE: Vai para a fila do Banner de Ouro
            setEntranceQueue(prev => [...prev, {
              username: p.username || 'Um cria de elite',
              avatar_url: p.avatar_url,
              level: level,
              badges: p.badges || []
            }]);
          } else {
            // COMUM: Notificação rápida abaixo do chat (2 seg)
            const id = Math.random().toString(36).substr(2, 9);
            const username = p.username || 'Cria';
            setQuickEntrances(prev => [...prev, { id, username }]);
            setTimeout(() => {
              setQuickEntrances(prev => prev.filter(e => e.id !== id));
            }, 2000);
          }
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Se não houver prop, eu forço a puxar do banco agora para a PRESENCE ficar exata (Elite bug fix)
          let dbProf = userProfile;
          if (!dbProf && session?.user?.id) {
            const { data } = await supabase.from('profiles').select('username, avatar_url, total_donated, badges').eq('id', session.user.id).single();
            if (data) dbProf = data;
          }

          const donated = dbProf?.total_donated || 0;
          const level = getGifterLevel(donated);
          const userName = dbProf?.username || session?.user?.user_metadata?.username || 'Cria';
          const avatarUrl = dbProf?.avatar_url;
          const userBadges = dbProf?.badges || [];

          await chatChannel.track({ 
            user_id: session?.user?.id,
            username: userName,
            avatar_url: avatarUrl,
            total_donated: donated,
            badges: userBadges
          });

          // Supabase Presence NUNCA ecoa o evento 'join' para si mesmo.
          // Se eu entrei agora e sou Elite, eu forço meu próprio banner localmente! (Ignorando se o criador estiver stalkeando sua própria live)
          if (role === 'audience' && session?.user?.id !== room.host_id) {
            if (level >= 25) {
              setEntranceQueue(prev => [...prev, {
                username: userName,
                avatar_url: avatarUrl,
                level: level,
                badges: userBadges
              }]);
            } else {
              const id = Math.random().toString(36).substr(2, 9);
              setQuickEntrances(prev => [...prev, { id, username: userName }]);
              setTimeout(() => setQuickEntrances(prev => prev.filter(e => e.id !== id)), 2000);
            }
          }
        }
      });

    // 2. Contagem de Viewers (Opcional simplificado)
    // Em produção usaríamos Presence do Supabase
  }

  async function handleSendChat() {
    if (!message.trim()) return;
    const msgData = {
      username: activeUserProfile?.username || session.user.user_metadata?.username || 'Cria',
      content: message,
      user_id: session.user.id,
      badges: activeUserProfile?.badges || session.user.user_metadata?.badges || [],
      donated_amount: activeUserProfile?.total_donated || session.user.user_metadata?.donated_amount || 0
    };
    
    await supabase.channel(`live_chat:${room.id}`).send({
      type: 'broadcast',
      event: 'chat',
      payload: msgData
    });

    setChat(prev => [...prev, msgData]);
    setMessage('');
  }

  async function handleSendGift(gift: any) {
    if (!session?.user?.id) return;
    
    const giftData = {
      username: activeUserProfile?.username || session.user.user_metadata?.username || 'Cria',
      gift: gift,
      user_id: session.user.id,
      badges: activeUserProfile?.badges || session.user.user_metadata?.badges || [],
      donated_amount: activeUserProfile?.total_donated || session.user.user_metadata?.total_donated || 0
    };

    // DISPARAR PARA TODOS NA LIVE
    await supabase.channel(`live_chat:${room.id}`).send({
      type: 'broadcast',
      event: 'gift',
      payload: giftData
    });

    // Mostrar para si mesmo também na fila e somar a moral
    setGiftQueue(prev => [...prev, giftData]);
    setSessionGifts(prev => prev + gift.price);
    
    // EXIBIR MENSAGEM NO CHAT LOCALMENTE PARA O EMISSOR VER
    setChat(prev => [...prev, {
      username: giftData.username,
      content: `🎁 enviou um ${gift.name}!`,
      isSystem: true,
      badges: giftData.badges,
      donated_amount: giftData.donated_amount
    }]);

    // Contagem da meta para o próprio host (visual local)
    const isMatch = !goalGiftId || gift.id === goalGiftId;
    if (isMatch) {
       setGoalCurrent((prev: number) => prev + (goalGiftId ? 1 : gift.price));
    }

    setIsGiftPanelOpen(false);
  }

  async function updateGoal(type: 'gifts' | 'followers', title: string, target: number, giftId: string | null = null) {
    if (role !== 'host') return;
    
    const newGoalData = {
      type,
      title,
      target: Number(target),
      current: 0,
      giftId
    };

    setGoalType(type);
    setGoalTitle(title);
    setGoalTarget(Number(target));
    setGoalCurrent(0);
    setGoalGiftId(giftId);

    // Broadcast para todos na sala
    await supabase.channel(`live_chat:${room.id}`).send({
      type: 'broadcast',
      event: 'goal_update',
      payload: newGoalData
    });

    // Salvar no banco para quem entrar depois
    await supabase.from('live_sessions')
      .update({
        goal_type: type,
        goal_title: title,
        goal_target: Number(target),
        goal_current: 0,
        goal_gift_id: giftId
      })
      .eq('id', room.id);
    
    setIsGoalPanelOpen(false);
    setIsGoalPickerOpen(false);
  }

  const lastTapRef = useRef<number>(0);

  function handleDoubleTap(e: React.TouchEvent | React.MouseEvent) {
    const now = Date.now();
    const delta = now - lastTapRef.current;
    if (delta < 350 && delta > 0) {
      // Duplo toque detectado!
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      let clientX: number, clientY: number;
      if ('touches' in e && e.changedTouches.length > 0) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        clientX = rect.width / 2;
        clientY = rect.height / 2;
      }
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      handleSendLike(x, y);
    }
    lastTapRef.current = now;
  }

  async function handleSendLike(tapX = 50, tapY = 50) {
    const newLikes = totalLikes + 1;
    setTotalLikes(newLikes);
    setSessionLikes(prev => prev + 1);
    
    // Disparar corações na posição do toque
    const colors = ['#ff4b2b', '#ff416c', '#fc2e6e', '#ff69b4', '#ff1493'];
    // Aparecem 3 corações em leque no ponto do toque
    for (let i = 0; i < 3; i++) {
      const spreadX = tapX + (Math.random() - 0.5) * 30;
      const newHeart = { id: Date.now() + i, color: colors[Math.floor(Math.random() * colors.length)], x: spreadX, y: tapY };
      setHearts(prev => [...prev, newHeart]);
      setTimeout(() => setHearts(prev => prev.filter(h => h.id !== newHeart.id)), 1400);
    }

    await supabase.channel(`live_chat:${room.id}`).send({
      type: 'broadcast',
      event: 'like',
      payload: { 
        userId: session.user.id,
        totalCount: newLikes
      }
    });
  }
  async function checkFollowStatus() {
    if (role !== 'audience' || !session?.user?.id || !room?.host_id) return;
    try {
      const { data } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', session.user.id)
        .eq('following_id', room.host_id)
        .maybeSingle();
      
      setIsFollowing(!!data);
    } catch (e) {
      console.error("Erro ao verificar follow:", e);
    }
  }

  async function handleFollowHost() {
    if (role !== 'audience') return;
    
    // 1. Registrar no banco
    const { error } = await supabase.from('follows').insert({
      follower_id: session.user.id,
      following_id: room.host_id
    });
    
    if (error) return;

    setIsFollowing(true);

    // 2. Broadcast para a sala (atualiza a meta de todos)
    await supabase.channel(`live_chat:${room.id}`).send({
      type: 'broadcast',
      event: 'follow',
      payload: { followerId: session.user.id }
    });

    // 3. Sistema manda msg no chat
    const msgData = {
      username: userProfile?.username || session.user.user_metadata?.username || 'Cria',
      content: `👤 começou a seguir o Host!`,
      isSystem: true,
      badges: userProfile?.badges || session.user.user_metadata?.badges || [],
      donated_amount: userProfile?.total_donated || session.user.user_metadata?.donated_amount || 0
    };
    
    await supabase.channel(`live_chat:${room.id}`).send({
      type: 'broadcast',
      event: 'chat',
      payload: msgData
    });

    setChat(prev => [...prev, msgData]);
  }

  async function cleanupTracks() {
    console.log("🧹 Iniciando limpeza agressiva de tracks...");
    try {
      // Parar todas as tracks locais IMEDIATAMENTE ignorando lifecycle closure
      if (localAudioRef.current) {
        localAudioRef.current.stop();
        localAudioRef.current.close();
        localAudioRef.current = null;
      }
      if (localVideoRef.current) {
        localVideoRef.current.stop();
        localVideoRef.current.close();
        localVideoRef.current = null;
      }

      if (agoraClientRef.current) {
        await agoraClientRef.current.leave();
        agoraClientRef.current.removeAllListeners();
        agoraClientRef.current = null;
      }
      
      // Limpar rastro de persistência
      localStorage.removeItem('VELAR_ACTIVE_LIVE');
    } catch (err) {
      console.error("Erro no cleanup:", err);
    }
  }

  async function leaveLive() {
    setIsClosing(true);
    await cleanupTracks();
    
    if (role === 'host') {
      try {
        const { error } = await supabase.from('live_sessions')
          .update({ 
              is_live: false, 
              ended_at: new Date().toISOString(),
              total_gifts: sessionGifts,
              total_likes: sessionLikes,
              total_followers: sessionFollowers,
              max_viewers: sessionViewers
          })
          .eq('id', room.id);
        
        if (error) throw error;
        setIsEnded(true); 
      } catch (e) {
        console.error("❌ Erro ao encerrar no banco:", e);
        setIsEnded(true);
      }
    } else {
      onClose();
    }
  }

  function getDurationString() {
    const totalMin = Math.floor((Date.now() - liveStartTime) / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  const toggleMute = () => {
    if (localAudioTrack) {
      const newMuted = !muted;
      localAudioTrack.setEnabled(!newMuted);
      setMuted(newMuted);
    }
  };

  const toggleCamera = () => {
    if (localVideoTrack) {
      localVideoTrack.setEnabled(!cameraOff);
      setCameraOff(!cameraOff);
    }
  };

  if (isClosing && role === 'audience') return null;

  if (agoraError) {
    return (
      <div className="live-room-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', textAlign: 'center', padding: '2rem' }}>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '2rem', borderRadius: '2rem', maxWidth: '400px' }}>
          <Video size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
          <h2 style={{ color: '#fff', marginBottom: '1rem' }}>OPS, TRAVOU! 🎥</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>{agoraError}</p>
          <button 
             onClick={leaveLive}
             className="urban-btn-primary"
             style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '1rem 2rem', borderRadius: '1rem', fontWeight: 900, cursor: 'pointer' }}
          >
             FECHAR E LIMPAR TELA
          </button>
        </div>
      </div>
    );
  }

  if (isEnded && role === 'host') {
    return (
      <LiveSummaryModal 
        host={{ username: userProfile?.username, avatar_url: userProfile?.avatar_url }}
        stats={{ duration: getDurationString(), viewers: sessionViewers, likes: sessionLikes, gifts: sessionGifts, followers: sessionFollowers }}
        onClose={onClose}
      />
    );
  }

  const content = (
    <div 
      className={`live-room-container ${inline ? 'is-inline' : ''}`}
      style={inline ? {
        position: 'absolute', inset: 0, backgroundColor: '#000', display: 'flex', flexDirection: 'column', overflow: 'hidden'
      } : { 
        position: 'fixed', inset: 0, zIndex: 20000, backgroundColor: '#000000', display: 'flex', flexDirection: 'column', visibility: 'visible', opacity: 1
      }}
    >
      <div 
        className="live-video-layer" 
        style={{ zIndex: 1, position: 'absolute', inset: 0, display: 'flex', flexDirection: 'row' }}
      >
        {/* Vídeo do Host da sala (Seja eu ou o criador que estou assistindo) */}
        {role === 'host' ? (
          <div ref={videoContainerRef} className="live-video-element" style={{ width: activeBattle ? '50%' : '100%', height: '100%', transition: 'width 0.3s' }} />
        ) : (
          <div 
            id={`remote-video-${room.host_id}`} 
            className="live-video-element"
            style={{ width: activeBattle ? '50%' : '100%', height: '100%', background: '#000', transition: 'width 0.3s' }}
            ref={(el) => {
              if (el) {
                const hostUser = remoteUsers.find(u => String(u.uid) === String(room.host_id));
                if (hostUser?.videoTrack) {
                  hostUser.videoTrack.play(el);
                }
              }
            }}
          >
            {!remoteUsers.find(u => String(u.uid) === String(room.host_id))?.videoTrack && (
               <div className="live-waiting">
                 <div className="animate-pulse">📺 Aguardando sinal do Host...</div>
               </div>
            )}
          </div>
        )}

        {/* Vídeo do Oponente na Batalha */}
        {activeBattle && (
           <div id={`remote-video-opponent`} style={{ width: '50%', height: '100%', background: '#111', borderLeft: '2px solid #ef4444', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <img 
                      src={activeBattle.opponentProfile?.avatar_url || 'https://ui-avatars.com/api/?name=Op'} 
                      style={{ width: '64px', height: '64px', borderRadius: '50%', marginBottom: '8px', opacity: 0.5, objectFit: 'cover' }} 
                    />
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
                      Conectando oponente...
                    </div>
                 </div>
              </div>
              {/* Onde a track de vídeo do oponente seria ejetada no futuro */}
           </div>
        )}
      </div>

      <div 
        className="live-overlay"
        onTouchEnd={role === 'audience' ? handleDoubleTap : undefined}
        onDoubleClick={role === 'audience' ? handleDoubleTap : undefined}
      >

        {activeBattle && (
          <>
            <BattleScoreBar 
              scoreA={activeBattle.score_a} 
              scoreB={activeBattle.score_b}
              timeRemainingSec={battleTimeLeft}
              hostAvatar={room.host_profile?.avatar_url}
              opponentAvatar={activeBattle.opponentProfile?.avatar_url}
            />

            {/* OVERLAY FINALE DE BATALHA */}
            {battleTimeLeft === 0 && (
              <div style={{
                position: 'absolute', inset: 0, zIndex: 100000,
                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                animation: 'fadeIn 0.5s ease', textAlign: 'center', padding: '2rem'
              }}>
                <div style={{ fontSize: '5rem', marginBottom: '1rem', animation: 'bounce 1s infinite' }}>
                  {activeBattle.score_a > activeBattle.score_b ? '👑' : activeBattle.score_a < activeBattle.score_b ? '💀' : '🤝'}
                </div>
                <h2 style={{
                  color: '#fff', fontSize: '2rem', fontWeight: 900, marginBottom: '0.5rem',
                  background: activeBattle.score_a > activeBattle.score_b ? 'linear-gradient(to right, #facc15, #f59e0b)' : 'linear-gradient(to right, #ef4444, #dc2626)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  {activeBattle.score_a > activeBattle.score_b ? 'VITÓRIA É SUA!' : activeBattle.score_a < activeBattle.score_b ? 'VOCÊ FOI DERROTADO' : 'EMPATE!'}
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', marginBottom: '3rem' }}>
                  A pista pegou fogo! {activeBattle.score_a} vs {activeBattle.score_b} pontos.
                </p>

                <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '300px', flexDirection: 'column' }}>
                  <button 
                    onClick={() => {
                      setActiveBattle((prev: any) => ({ ...prev, score_a: 0, score_b: 0 }));
                      setBattleTimeLeft(180);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none',
                      color: '#fff', padding: '1rem', borderRadius: '1rem', fontWeight: 900, fontSize: '1.1rem',
                      cursor: 'pointer', boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)',
                      transition: 'all 0.2s',
                    }}
                  >
                    🔁 PEDIR REVANCHE
                  </button>
                  <button 
                    onClick={() => setActiveBattle(null)}
                    style={{
                      background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff', padding: '1rem', borderRadius: '1rem', fontWeight: 700, fontSize: '1rem',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    ✖ FECHAR
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* --- BANNER DE ENTRADA ELITE (FILA) --- */}
        {activeEntrance && (
          <div className="elite-entrance-banner">
            <div className="elite-entrance-avatar-wrapper">
              <img 
                src={activeEntrance.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeEntrance.username}`} 
                className="elite-entrance-avatar" 
                alt="Elite" 
              />
              <div className="elite-level-tag">LVL {activeEntrance.level}</div>
            </div>
            <div className="elite-entrance-text">
              <div className="elite-label">BRABO NA ÁREA <span className="elite-crown">👑</span></div>
              <div className="elite-user-row">
                <span className="elite-username">@{activeEntrance.username}</span>
                <UserBadges badges={activeEntrance.badges} size={14} />
                <span className="elite-action">ENTROU! 🔥</span>
              </div>
            </div>
          </div>
        )}

        {/* --- CORAÇÕES DO DUPLO TOQUE --- */}
        {hearts.map(h => (
          <div 
            key={h.id} 
            className="floating-heart" 
            style={{ 
              color: h.color,
              left: `${h.x}px`,
              top: `${h.y}px`,
            }}
          >❤️</div>
        ))}

        <header className="live-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div className="live-host-info" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', padding: '4px 12px 4px 4px', borderRadius: '40px', alignItems: 'center', gap: '8px' }}>
              <img 
                src={room.host_profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${room.host_profile?.username || 'user'}`} 
                alt="Host" 
                style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.8)' }} 
              />
              <div className="host-meta" style={{ flex: 1, paddingRight: '8px' }}>
                <span className="host-name" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.9rem', lineHeight: 1.2 }}>
                  @{room.host_profile?.username || 'criador'}
                  <UserBadges badges={room.host_profile?.badges} donatedAmount={room.host_profile?.total_donated} size={14} />
                </span>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px', display: 'block' }}>
                  {room.title || 'Live'}
                </span>
              </div>
              
              {role === 'audience' && !isFollowing && (
                <button 
                  onClick={async (e) => {
                    e.stopPropagation();
                    await handleFollowHost();
                  }} 
                  className="live-header-follow-btn"
                  style={{ borderRadius: '20px', padding: '4px 12px', fontSize: '0.75rem', margin: 0, height: '28px' }}
                >
                  <UserPlus size={14} strokeWidth={3} /> SEGUIR
                </button>
              )}
            </div>

            <div className="live-badge-column">
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 <div className="live-badge" style={{
                   background: isBroadcasting ? '#ef4444' : 'rgba(255,255,255,0.15)',
                   color: isBroadcasting ? '#fff' : 'rgba(255,255,255,0.6)',
                   margin: 0
                 }}>
                   {isBroadcasting ? '🔴 AO VIVO' : '🎬 PREPARAÇÃO'}
                 </div>
                 <div className="live-header-metrics" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', padding: '2px 8px', borderRadius: '12px' }}>
                   <span className="header-count-neon">
                     <Users size={12} color="var(--primary)" /> {sessionViewers}
                   </span>
                   <span className="header-count-neon mini-likes" style={{ marginLeft: '8px' }}>
                     <Heart size={12} fill="currentColor" /> {totalLikes}
                   </span>
                 </div>
               </div>
               
               {goalTarget > 0 && (
                <div className="goal-compact-container-sidebar">
                  <div className="goal-host-label-sidebar">{goalTitle || (goalType === 'gifts' ? 'Meta' : 'Meta')}</div>
                  <div className="goal-row-wrap-sidebar">
                    <div className="goal-icon-preview-sidebar">
                        {goalType === 'gifts' ? (
                          goalGiftId ? (
                              <img src={GIFT_CATALOG.find(g => g.id === goalGiftId)?.image} className="goal-gift-image" alt="gift" />
                          ) : <span>🎁</span>
                        ) : <span>👤</span>}
                    </div>
                    <div className="goal-progress-bar-sidebar">
                        <div 
                          className="goal-fill-sidebar"
                          style={{ 
                              width: `${Math.min(100, (goalCurrent / goalTarget) * 100)}%`,
                              background: goalType === 'gifts' ? 'linear-gradient(90deg, #facc15, #fb923c)' : 'linear-gradient(90deg, #6C2BFF, #9D6BFF)'
                          }}
                        />
                        <span className="goal-count-text-sidebar">{goalCurrent}/{goalTarget}</span>
                    </div>
                  </div>
                </div>
               )}
            </div>
          </div>
          
          {/* Botão de encerrar: só mostra vermelho quando já está ao vivo */}
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (!isBroadcasting) {
                // Modo preparação: botão cancela e volta sem transmitir
                leaveLive();
              } else if (role === 'host') {
                setShowEndConfirm(true);
              } else {
                leaveLive();
              }
            }} 
            className="live-close-circle-btn"
            title={isBroadcasting && role === 'host' ? 'Encerrar Live' : 'Cancelar e Sair'}
            style={isBroadcasting && role === 'host'
              ? { background: 'rgba(239,68,68,0.2)', border: '1px solid currentColor', color: '#ef4444' }
              : { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }
            }
          >
            {isBroadcasting && role === 'host' ? <Power size={20} /> : <X size={20} />}
          </button>
        </header>

        {role === 'host' && !isBroadcasting ? null : (
        <div className="live-chat-area">
          <div className="chat-messages">
            {chat.map((m, i) => (
              <div key={i} className={`chat-msg-elite ${m.isSystem ? 'system' : ''}`}>
                {!m.isSystem ? (
                  <>
                    <div className="chat-user-row">
                      <span className="chat-user-nickname">@{m.username}</span>
                      <UserBadges badges={m.badges} donatedAmount={m.donated_amount} size={12} />
                    </div>
                    <div className="chat-text-content">{m.content}</div>
                  </>
                ) : (
                  <div className="chat-text-content" style={{ opacity: 0.9, fontSize: '0.85rem', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', background: 'rgba(251, 191, 36, 0.1)', padding: '6px 12px', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.25)', color: '#fbbf24', alignSelf: 'flex-start', margin: '4px 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 800 }}>@{m.username}</span>
                      <UserBadges badges={m.badges} donatedAmount={m.donated_amount} size={14} />
                    </div>
                    <span style={{ fontWeight: 600 }}>{m.content}</span>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          {role === 'audience' && (
            <div className="chat-footer">
              <input 
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                placeholder="Diz aí, cria..." 
                className="live-chat-input"
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', padding: '0.8rem 1.2rem' }}
              />
              <button onClick={() => setIsGiftPanelOpen(true)} className="elite-gift-btn">
                <div className="gift-btn-inner">
                  <Gift size={24} color="#fff" strokeWidth={2.5} />
                </div>
              </button>
            </div>
          )}
          
        </div>
        )}

        {/* --- MENU DE EFEITOS PROFISSIONAL (ABAS) --- */}
        {isBeautyMenuOpen && role === 'host' && (
          <div className="beauty-menu-overlay animate-fade-up">
            <div className="beauty-menu-card-v2">
              <header className="effects-tabs-header" style={{ display: 'flex', gap: '8px', paddingBottom: '12px' }}>
                <button 
                  className={`tab-btn ${activeEffectTab !== 'ambiente' ? 'active' : ''}`}
                  onClick={() => setActiveEffectTab('vibe')}
                >
                  <Zap size={16} />
                  <span>VIBE</span>
                </button>
                <button 
                  className={`tab-btn ${activeEffectTab === 'ambiente' ? 'active' : ''}`}
                  onClick={() => setActiveEffectTab('ambiente')}
                >
                  <Camera size={16} />
                  <span>FUNDO</span>
                </button>
                <div style={{ flex: 1 }} />
                <button className="close-effects-btn" onClick={() => setIsBeautyMenuOpen(false)}><X size={18} /></button>
              </header>

              <div className="effects-content-area" style={{ maxHeight: '40vh', overflowY: 'auto', padding: '4px' }}>
                {activeEffectTab !== 'ambiente' && (
                  <div className="beauty-options-grid-v2">
                    {[
                      { id: 'original', label: 'Nenhum', type: 'vibe' },
                      { id: 'natural', label: 'Natural ✨', type: 'beleza' },
                      { id: 'soft', label: 'Suave 🌸', type: 'beleza' },
                      { id: 'elite', label: 'Elite ⭐', type: 'beleza' },
                      { id: 'rio', label: 'Rio ☀️', type: 'vibe' },
                      { id: 'cinema', label: 'Cinema 🎬', type: 'vibe' },
                      { id: 'retro', label: 'Retrô 🎞️', type: 'vibe' },
                      { id: 'pb', label: 'P&B 🖤', type: 'vibe' },
                      { id: 'escritorio', label: 'Office 🏢', type: 'ambiente' },
                      { id: 'praia', label: 'Praia 🏖️', type: 'ambiente' }
                    ].map(p => {
                      const isActive = p.id === 'original' 
                        ? (activeVibePreset === 'original' && activeBeautyPreset === 'original' && activeAmbientePreset === 'original')
                        : (p.type === 'vibe' ? activeVibePreset === p.id : p.type === 'beleza' ? activeBeautyPreset === p.id : activeAmbientePreset === p.id);

                      return (
                        <button 
                          key={p.id} 
                          data-id={p.id}
                          className={`beauty-opt-btn-v2 ${isActive ? 'active' : ''}`}
                          onClick={() => {
                            if (p.id === 'original') {
                              applyVibePreset('original');
                              applyBeautyPreset('original');
                              applyAmbientePreset('original');
                            } else if (p.type === 'vibe') {
                              applyBeautyPreset('original');
                              applyAmbientePreset('original');
                              applyVibePreset(p.id as any);
                            } else if (p.type === 'beleza') {
                              applyVibePreset('original');
                              applyAmbientePreset('original');
                              applyBeautyPreset(p.id as any);
                            } else {
                              applyVibePreset('original');
                              applyBeautyPreset('original');
                              applyAmbientePreset(p.id as any);
                            }
                          }}
                          style={{ padding: '4px' }}
                        >
                          <div className="opt-indicator"></div>
                          <span className="opt-label">{p.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}

                {activeEffectTab === 'ambiente' && (
                  <div className="beauty-options-grid-v2">
                    {[
                      { id: 'original', label: 'Nenhum', type: 'ambiente' },
                      { id: 'desfocar', label: 'Desfoque 🌫️', type: 'ambiente' },
                      { id: 'fundo-quarto', label: 'Gamer 🎮', type: 'ambiente', thumb: '/bgs/gamer.png' },
                      { id: 'fundo-piscina', label: 'Piscina 🏊', type: 'ambiente', thumb: '/bgs/piscina.png' },
                      { id: 'fundo-cristo', label: 'Cristo 🌴', type: 'ambiente', thumb: '/bgs/cristo.png' },
                      { id: 'fundo-favela', label: 'Favela 🏘️', type: 'ambiente', thumb: '/bgs/favela.png' },
                      { id: 'fundo-paris', label: 'Paris 🗼', type: 'ambiente', thumb: '/bgs/paris.jpg' },
                      { id: 'galeria', label: 'Galeria 📸', type: 'ambiente', thumb: '/bgs/galeria.jpg' }
                    ].map((p: any) => {
                      const isActive = p.id === 'original' 
                        ? (activeVibePreset === 'original' && activeBeautyPreset === 'original' && activeAmbientePreset === 'original')
                        : activeAmbientePreset === p.id;

                      return (
                        <button 
                          key={p.id} 
                          data-id={p.id}
                          className={`beauty-opt-btn-v2 ${isActive ? 'active' : ''}`}
                          onClick={() => {
                            if (p.id === 'galeria') {
                              fileInputRef.current?.click();
                              return;
                            }
                            if (p.id === 'original') {
                              applyVibePreset('original');
                              applyBeautyPreset('original');
                              applyAmbientePreset('original');
                            } else {
                              applyVibePreset('original');
                              applyBeautyPreset('original');
                              applyAmbientePreset(p.id as any);
                            }
                          }}
                          style={{ padding: '4px' }}
                        >
                          <div className="opt-indicator" style={p.thumb ? { backgroundImage: `url(${p.thumb})`, backgroundSize: 'cover', backgroundPosition: 'center', borderColor: isActive ? '#fff' : 'rgba(255,255,255,0.2)' } : {}}></div>
                          <span className="opt-label">{p.label}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
            
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleCustomBackgroundUpload} 
              style={{ display: 'none' }} 
            />
          </div>
        )}

        {/* --- OVERLAY DE PREPARAÇÃO (HOST antes de iniciar) --- */}
        {role === 'host' && !isBroadcasting && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 50,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.15)',
            pointerEvents: 'none',
          }}>
            {/* Dica no topo */}
            <div style={{
              position: 'absolute', top: '80px', left: 0, right: 0,
              textAlign: 'center', fontSize: '0.7rem', fontWeight: 900,
              color: 'rgba(255,255,255,0.85)', letterSpacing: '3px', textTransform: 'uppercase',
              textShadow: '0 2px 4px rgba(0,0,0,0.8)'
            }}>
              🎬 Ajuste a câmera e os efeitos
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', pointerEvents: 'auto' }}>
              {/* Botão de Efeitos (Esquerda do Go Live) */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsBeautyMenuOpen(!isBeautyMenuOpen);
                }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, #a855f7, #6b21a8)',
                  border: 'none', borderRadius: '50%', width: '60px', height: '60px',
                  color: '#fff', cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(168, 85, 247, 0.4)',
                  transition: 'all 0.3s ease',
                }}
                title="Efeitos de Beleza"
              >
                <Sparkles size={24} color="#fff" />
              </button>

              {/* Botão IR AO VIVO centralizado */}
              <button
                onClick={handleGoLive}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  border: '4px solid rgba(255,255,255,0.3)',
                  borderRadius: '50%', width: '110px', height: '110px',
                  color: '#fff', cursor: 'pointer', fontWeight: 900,
                  fontSize: '0.75rem', letterSpacing: '1px',
                  boxShadow: '0 0 0 8px rgba(34,197,94,0.2), 0 0 40px rgba(34,197,94,0.4)',
                  animation: 'pulse-go-live 2s ease-in-out infinite',
                  transition: 'all 0.3s ease',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Zap size={36} fill="currentColor" />
                <span>IR AO<br/>VIVO</span>
              </button>

              <div style={{ width: '60px', height: '60px' }}></div> {/* Espaçador p/ manter meio */}
            </div>

            {/* Dica embaixo do botão */}
            <p style={{ marginTop: '1.5rem', color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem', fontWeight: 600, textShadow: '0 1px 4px rgba(0,0,0,0.8)', pointerEvents: 'auto' }}>
              Toque para iniciar a transmissão
            </p>

            <style>{`
              @keyframes pulse-go-live {
                0%, 100% { box-shadow: 0 0 0 8px rgba(34,197,94,0.2), 0 0 40px rgba(34,197,94,0.4); }
                50% { box-shadow: 0 0 0 16px rgba(34,197,94,0.1), 0 0 60px rgba(34,197,94,0.6); }
              }
            `}</style>
          </div>
        )}

        {/* --- NOTIFICAÇÕES RÁPIDAS (BAIXO DA TELA) --- */}
        <div className="quick-entrances-container">
          {quickEntrances.map(entry => (
            <div key={entry.id} className="quick-entrance-item">
              @{entry.username} entrou na live
            </div>
          ))}
        </div>

        {role === 'host' && (
          <>
            <div className={`host-stats-drawer-v2 ${showHostStats ? 'open' : ''}`}>
              <button className="stats-toggle-btn-v2" onClick={() => setShowHostStats(!showHostStats)}>
                {showHostStats ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
              </button>
              
              {showHostStats && (
                <div className="stats-container-v2">
                  <header className="stats-header-v2">
                    <div className="status-indicator">
                      <div className="pulse-dot"></div>
                      <span>AO VIVO</span>
                    </div>
                    <h4>Painel do Criador</h4>
                    <button className="close-stats-v2" onClick={() => setShowHostStats(false)}><X size={20} /></button>
                  </header>

                  <div className="stats-grid-v2">
                    <div className="stat-card-v2 viewers">
                      <div className="card-icon"><Users size={20} /></div>
                      <div className="card-info">
                        <span className="card-value">{sessionViewers}</span>
                        <span className="card-label">Viewers</span>
                      </div>
                    </div>
                    <div className="stat-card-v2 likes">
                      <div className="card-icon"><Heart size={20} /></div>
                      <div className="card-info">
                        <span className="card-value">{totalLikes}</span>
                        <span className="card-label">Likes</span>
                      </div>
                    </div>
                    <div className="stat-card-v2 moral">
                      <div className="card-icon"><Gift size={20} /></div>
                      <div className="card-info">
                        <span className="card-value">{sessionGifts}</span>
                        <span className="card-label">Moral</span>
                      </div>
                    </div>
                    <div className="stat-card-v2 fans">
                      <div className="card-icon"><UserPlus size={20} /></div>
                      <div className="card-info">
                        <span className="card-value">{sessionFollowers}</span>
                        <span className="card-label">Novos Fãs</span>
                      </div>
                    </div>
                  </div>

                  <div className="analytics-section-v2">
                    <div className="section-header-v2">
                      <BarChart2 size={16} />
                      <span>Desempenho da Live</span>
                    </div>
                    <div className="chart-container-v2">
                      <ResponsiveContainer width="100%" height={120}>
                        <AreaChart data={statsHistory}>
                          <defs>
                            <linearGradient id="colorViewers" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6C2BFF" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#6C2BFF" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <Area type="monotone" dataKey="viewers" stroke="#6C2BFF" fillOpacity={1} fill="url(#colorViewers)" strokeWidth={3} isAnimationActive={true} />
                          <Tooltip contentStyle={{ background: '#111', border: '1px solid #333', fontSize: '10px' }} labelStyle={{ display: 'none' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="analytics-section-v2">
                    <div className="section-header-v2">
                      <Zap size={16} />
                      <span>Picos de Engajamento</span>
                    </div>
                    <div className="chart-container-v2">
                      <ResponsiveContainer width="100%" height={100}>
                        <BarChart data={statsHistory}>
                          <Bar dataKey="engagement" radius={[4, 4, 0, 0]}>
                            {statsHistory.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6C2BFF' : '#9D6BFF'} opacity={0.8} />
                            ))}
                          </Bar>
                          <Tooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{ background: '#111', border: '1px solid #333', fontSize: '10px' }} labelStyle={{ display: 'none' }} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="actions-grid-v2">
                    <button onClick={() => setIsGoalPanelOpen(true)} className="action-btn-v2 main">
                      <Zap size={18} />
                      DEFINIR META
                    </button>
                    <button className="action-btn-v2 secondary">
                      <Share2 size={18} />
                      COMPARTILHAR
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="live-controls">
              {role === 'host' && (
                 <>
                   <button 
                     onClick={() => setIsBattleModalOpen(true)}
                     className="control-btn"
                     style={{ background: 'linear-gradient(to right, #dc2626, #ea580c)' }}
                     title="CONFRONTO"
                   >
                     <Swords size={20} color="#fff" />
                   </button>
                   <button 
                     onClick={() => setIsBeautyMenuOpen(!isBeautyMenuOpen)}
                     className="control-btn"
                     style={{ background: 'linear-gradient(to right, #a855f7, #ca8a04)' }}
                     title="Filtros e Efeitos"
                   >
                     <Sparkles size={20} color="#fff" />
                   </button>
                 </>
              )}
              <button onClick={toggleMute} className={`control-btn ${muted ? 'off' : ''}`}>{muted ? <MicOff /> : <Mic />}</button>
              <button onClick={toggleCamera} className={`control-btn ${cameraOff ? 'off' : ''}`}>{cameraOff ? <Camera size={24} style={{opacity: 0.5}} /> : <Camera />}</button>
            </div>
          </>
        )}
      </div>

      {activeGift && (
        <GiftAnimationOverlay
          gift={activeGift.gift}
          senderName={activeGift.username}
          recipientName={room.host_profile?.username || room.title || 'host'}
          onComplete={() => setActiveGift(null)}
        />
      )}

      {isGiftPanelOpen && (
        <GiftPanel 
          senderId={session.user.id} 
          recipientId={room.host_id} 
          recipientName={room.host_profile?.username || 'Host'} 
          postType="live" 
          onClose={() => setIsGiftPanelOpen(false)} 
          onGiftSent={handleSendGift} 
        />
      )}

      {isGoalPanelOpen && role === 'host' && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000001, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: '400px', background: '#111', borderRadius: '2rem', border: '1px solid var(--primary)', padding: '2rem', animation: 'fadeIn 0.3s' }}>
             <h3 style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#fbbf24' }}>Configurar Meta 🎯</h3>
             <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <button onClick={() => setGoalType('gifts')} style={{ flex: 1, padding: '1rem', borderRadius: '1rem', background: goalType === 'gifts' ? 'var(--primary)' : '#222', border: 'none', color: '#fff', fontWeight: 700 }}>PRESENTES 🎁</button>
                <button onClick={() => setGoalType('followers')} style={{ flex: 1, padding: '1rem', borderRadius: '1rem', background: goalType === 'followers' ? 'var(--primary)' : '#222', border: 'none', color: '#fff', fontWeight: 700 }}>SEGUIDORES 👤</button>
             </div>
             {goalType === 'gifts' && (
               <div onClick={() => setIsGoalPickerOpen(true)} style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', cursor: 'pointer', border: '1px dashed rgba(212,175,55,0.3)' }}>
                  {goalGiftId ? (
                    <>
                      <div style={{ width: '40px', height: '40px' }}><img src={GIFT_CATALOG.find(g => g.id === goalGiftId)?.image} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
                      <div style={{ color: '#fff' }}><div style={{ fontWeight: 800 }}>{GIFT_CATALOG.find(g => g.id === goalGiftId)?.name}</div><div style={{ fontSize: '0.7rem', color: '#fbbf24' }}>🪙 {GIFT_CATALOG.find(g => g.id === goalGiftId)?.price} cada</div></div>
                    </>
                  ) : <span style={{ opacity: 0.5, color: '#fff' }}>Escolher presente específico...</span>}
               </div>
             )}
             <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem', opacity: 0.7 }}>TÍTULO DA META</label>
             <input type="text" placeholder="Ex: Para o setup novo!" value={goalTitle} onChange={e => setGoalTitle(e.target.value)} style={{ width: '100%', background: '#222', border: '1px solid #333', padding: '1rem', borderRadius: '1rem', color: '#fff', marginBottom: '1.5rem' }} />
             <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.5rem', opacity: 0.7 }}>OBJETIVO (VALOR)</label>
             <input type="number" placeholder="Ex: 5000" value={goalTarget} onChange={e => setGoalTarget(Number(e.target.value))} style={{ width: '100%', background: '#222', border: '1px solid #333', padding: '1rem', borderRadius: '1rem', color: '#fff', marginBottom: '2rem' }} />
             <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => setIsGoalPanelOpen(false)} style={{ flex: 1, padding: '1rem', background: 'transparent', color: '#fff', border: 'none' }}>CANCELAR</button>
                <button onClick={() => updateGoal(goalType, goalTitle, goalTarget, goalGiftId)} style={{ flex: 2, padding: '1rem', background: 'var(--primary)', color: '#000', borderRadius: '1rem', border: 'none', fontWeight: 900 }}>ATIVAR META 🔥</button>
             </div>
          </div>
        </div>
      )}

      {isGoalPickerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1100000, background: 'rgba(0,0,0,0.95)', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.3s' }} onClick={() => setIsGoalPickerOpen(false)}>
           <div style={{ marginTop: 'auto', background: '#0a0a0a', borderTop: '1px solid rgba(255,255,255,0.1)', borderRadius: '40px 40px 0 0', padding: '1.5rem', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, color: '#fbbf24' }}>Escolher Presente 🎁</h2>
                <button onClick={() => setIsGoalPickerOpen(false)} style={{ background: '#222', border: 'none', color: '#fff', borderRadius: '50%', width: '32px', height: '32px' }}>✕</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {GIFT_CATALOG.filter(g => g.price > 0).map(g => (
                  <div key={g.id} onClick={() => { setGoalGiftId(g.id); setIsGoalPickerOpen(false); }} style={{ background: goalGiftId === g.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}>
                     <img src={g.image} style={{ width: '100%', height: '40px', objectFit: 'contain', marginBottom: '5px' }} />
                     <div style={{ fontSize: '0.6rem', fontWeight: 800, color: goalGiftId === g.id ? '#000' : '#fff' }}>{g.name}</div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      )}

      {isBattleModalOpen && (
        <LiveBattleModal
          isOpen={isBattleModalOpen}
          onClose={() => setIsBattleModalOpen(false)}
          currentHostId={session.user.id}
          onInvite={handleInviteOpponent}
          onGlobalSearch={() => setIsGlobalMatchmakerOpen(true)}
        />
      )}

      {isGlobalMatchmakerOpen && (
        <GlobalBattleMatchmaker
          isOpen={isGlobalMatchmakerOpen}
          onClose={() => setIsGlobalMatchmakerOpen(false)}
          currentHostId={session.user.id}
          currentChannelId={String(room.agora_channel)}
          onMatchFound={(opponent) => {
            setIsGlobalMatchmakerOpen(false);
            handleInviteOpponent(opponent); // Aproveitamos a lógica existente de convite ou já forçamos a união
          }}
        />
      )}

      {showEndConfirm && (
        <div 
          className="modal-overlay-urban" 
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)'
          }} 
          onClick={() => setShowEndConfirm(false)}
        >
          <div className="confirm-modal-urban animate-fade-up" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon-wrapper">
              <Power size={32} color="#ef4444" />
            </div>
            <h3>DESLIGAR A TRANSMISSÃO?</h3>
            <p>Tem certeza que deseja encerrar a sua Live? A pista tá curtindo o papo!</p>
            <div className="confirm-actions">
              <button className="confirm-btn cancel" onClick={() => setShowEndConfirm(false)}>
                CANCELAR
              </button>
              <button 
                className="confirm-btn proceed" 
                onClick={async () => {
                  setShowEndConfirm(false);
                  setIsClosing(true);
                  try { await leaveLive(); } catch (e) { console.error(e); }
                }}
              >
                ENCERRAR AGORA
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .live-room-container {
          position: fixed !important; 
          inset: 0 !important; 
          z-index: 5000 !important;
          background: #000000 !important; 
          color: #fff;
          display: flex; 
          flex-direction: column;
          font-family: 'Outfit', sans-serif;
        }
        .live-room-container.is-inline {
          position: relative; inset: auto; z-index: 1;
          height: 100%; width: 100%;
        }
        .live-video-layer { position: absolute; inset: 0; z-index: 1; }
        .live-video-element { width: 100%; height: 100%; object-fit: cover; }
        .live-video-element video { object-fit: cover !important; }
        
        /* CORAÇÕES DUPLO TOQUE */
        .floating-heart {
          position: absolute;
          font-size: 2.4rem;
          pointer-events: none;
          z-index: 99999;
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
          animation: float-heart-anim 1.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        
        @keyframes float-heart-anim {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          15% { transform: translate(-50%, -50%) scale(1.3); opacity: 1; }
          25% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          100% { transform: translate(-50%, calc(-50% - 150px)) scale(1.1); opacity: 0; }
        }

        /* BOTAO DE PRESENTE ELITE */
        .elite-gift-btn {
          position: relative;
          background: linear-gradient(135deg, #ff0f7b, #f89b29);
          border: none;
          border-radius: 50%;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(255, 15, 123, 0.4), 
                      inset 0 2px 4px rgba(255,255,255,0.4);
          transition: transform 0.2s, box-shadow 0.2s;
          flex-shrink: 0;
        }
        .elite-gift-btn:active {
          transform: scale(0.92);
        }
        .elite-gift-btn::before {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff0f7b, #f89b29);
          z-index: -1;
          filter: blur(8px);
          opacity: 0.7;
          animation: pulse-glow 2s infinite alternate;
        }
        .gift-btn-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          animation: gift-bounce 2s infinite ease-in-out;
        }
        @keyframes gift-bounce {
          0%, 100% { transform: translateY(0) scale(1) rotate(0deg); }
          25% { transform: translateY(-2px) scale(1.05) rotate(-5deg); }
          75% { transform: translateY(-2px) scale(1.05) rotate(5deg); }
        }
        @keyframes pulse-glow {
          from { opacity: 0.5; filter: blur(6px); }
          to { opacity: 0.9; filter: blur(10px); }
        }

        .live-overlay {
          position: absolute; inset: 0; z-index: 10;
          display: flex; flex-direction: column;
          background: transparent;
          padding: env(safe-area-inset-top) 1rem env(safe-area-inset-bottom);
        }

        /* BANNER ELITE (ENTRADA) — estilo TikTok: compacto, canto inferior esquerdo, desliza da esquerda */
        .elite-entrance-banner {
          position: absolute;
          bottom: 120px;
          left: 12px;
          background: linear-gradient(90deg, rgba(10,10,10,0.92), rgba(30,20,0,0.92));
          border: 1.5px solid rgba(212,175,55,0.7);
          border-radius: 40px;
          padding: 6px 14px 6px 6px;
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 200;
          max-width: 220px;
          box-shadow: 0 4px 16px rgba(212,175,55,0.3);
          animation: elite-slide-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     elite-fade-out 0.4s ease 3.6s forwards;
        }
        
        @keyframes elite-slide-in {
          from { transform: translateX(-110%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes elite-fade-out {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(-110%); opacity: 0; }
        }
        
        .elite-entrance-avatar-wrapper {
          position: relative;
          flex-shrink: 0;
        }
        
        .elite-entrance-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 2px solid #d4af37;
          object-fit: cover;
        }
        
        .elite-level-tag {
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          background: #d4af37;
          color: #000;
          font-size: 0.5rem;
          font-weight: 900;
          padding: 1px 4px;
          border-radius: 6px;
          border: 1px solid #fff;
          white-space: nowrap;
        }
        
        .elite-entrance-text {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .elite-label {
          font-size: 0.55rem;
          font-weight: 900;
          color: #d4af37;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          line-height: 1;
        }
        
        .elite-crown { font-size: 0.65rem; }
        
        .elite-user-row {
          display: flex;
          align-items: center;
          gap: 3px;
          flex-wrap: nowrap;
        }
        
        .elite-username {
          font-weight: 900;
          color: #fff;
          font-size: 0.8rem;
          line-height: 1;
        }
        
        .elite-action {
          color: #fbbf24;
          font-weight: 800;
          font-size: 0.7rem;
        }

        .live-header {
          padding: 1rem 0; display: flex; justify-content: space-between; align-items: flex-start;
        }
        .live-host-info { display: flex; align-items: center; gap: 0.8rem; }
        .live-badge {
          background: #ef4444; padding: 2px 8px; border-radius: 4px; font-weight: 800; font-size: 0.7rem;
          box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
        }
        .host-meta { display: flex; flex-direction: column; }
        .host-name { font-weight: 700; font-size: 0.95rem; }
        .viewer-count { font-size: 0.8rem; opacity: 0.8; display: flex; align-items: center; gap: 4px; }
        
        .live-chat-area { margin-top: auto; max-height: 40%; display: flex; flex-direction: column; gap: 1rem; }
        .chat-messages {
          flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;
          mask-image: linear-gradient(to bottom, transparent, #000 15%);
          padding-bottom: 0.5rem;
        }
        .chat-msg-elite { 
          background: rgba(0,0,0,0.4); 
          backdrop-filter: blur(8px); 
          padding: 4px 10px; 
          border-radius: 12px; 
          font-size: 0.85rem; 
          align-self: flex-start; 
          max-width: 85%; 
          border: 1px solid rgba(255,255,255,0.05);
          line-height: 1.3;
        }
        .chat-msg-elite.system { 
          border: 1px solid rgba(251,191,36,0.2);
          background: rgba(251,191,36,0.05);
        }
        .chat-user-row {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 1px;
          line-height: 1;
        }
        .chat-user-nickname { 
          color: #a855f7; 
          font-weight: 800; 
          font-size: 0.75rem;
        }
        .chat-text-content { 
          display: block;
          color: rgba(255,255,255,0.95);
          word-break: break-word;
          font-size: 0.85rem;
          line-height: 1.2;
        }
        
        /* OVERLAY EFEITOS (BELEZA/VIBE/AMBIENTE) */
        .beauty-menu-overlay {
          position: absolute;
          bottom: 120px;
          left: 0;
          right: 0;
          z-index: 9999;
          display: flex;
          justify-content: center;
          width: 100%;
          pointer-events: none;
        }
        .beauty-menu-card-v2 {
          background: rgba(15, 15, 15, 0.95);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 1rem;
          width: 100%;
          max-width: 400px;
          pointer-events: auto;
          box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .effects-tabs-header {
          display: flex;
          gap: 8px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
          padding-bottom: 8px;
          align-items: center;
        }
        .tab-btn {
          flex: 1;
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.4);
          font-family: var(--font-family, 'Outfit');
          font-weight: 800;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 8px 0;
          cursor: pointer;
          transition: all 0.3s;
        }
        .tab-btn.active {
          color: #fff;
          background: rgba(255,255,255,0.05);
          border-radius: 8px;
        }
        .close-effects-btn {
          background: transparent;
          border: none;
          color: #fff;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          cursor: pointer;
        }
        .beauty-options-grid-v2 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        .beauty-opt-btn-v2 {
          background: transparent;
          border: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          opacity: 0.6;
          transition: all 0.3s;
        }
        .beauty-opt-btn-v2.active {
          opacity: 1;
          transform: scale(1.05);
        }
        .opt-indicator {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 2px solid transparent;
          background: linear-gradient(135deg, #444, #222);
          transition: all 0.3s;
        }
        .beauty-opt-btn-v2.active .opt-indicator {
          border-color: #a855f7;
          box-shadow: 0 0 10px rgba(168, 85, 247, 0.5);
          transform: scale(1.1);
        }
        .opt-label {
          color: #fff;
          font-weight: 700;
          font-size: 0.7rem;
        }
        
        /* CORES ESPECÍFICAS PARA OS ÍCONES DOS FILTROS */
        .beauty-opt-btn-v2[data-id="original"] .opt-indicator { background: repeating-linear-gradient(45deg, #333, #333 5px, #444 5px, #444 10px); }
        .beauty-opt-btn-v2[data-id="natural"] .opt-indicator { background: linear-gradient(135deg, #fbcfe8, #f472b6); }
        .beauty-opt-btn-v2[data-id="soft"] .opt-indicator { background: linear-gradient(135deg, #e879f9, #c026d3); }
        .beauty-opt-btn-v2[data-id="elite"] .opt-indicator { background: linear-gradient(135deg, #a855f7, #6b21a8); }
        
        .beauty-opt-btn-v2[data-id="desfocar"] .opt-indicator { background: linear-gradient(135deg, #9ca3af, #4b5563); filter: blur(2px); }
        .beauty-opt-btn-v2[data-id="escritorio"] .opt-indicator { background: linear-gradient(135deg, #bae6fd, #0284c7); }
        .beauty-opt-btn-v2[data-id="praia"] .opt-indicator { background: linear-gradient(135deg, #fef08a, #ea580c); }
        
        
        .chat-footer { padding: 1rem 0; display: flex; gap: 0.8rem; align-items: center; }
        .live-chat-input {
          flex: 1; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
          border-radius: 2rem; padding: 0.8rem 1.2rem; color: #fff; outline: none; backdrop-filter: blur(10px);
        }
        .live-chat-send, .live-gift-btn {
          width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          background: var(--primary, #6C2BFF); color: #000; border: none;
        }
        .live-gift-btn { background: #fbbf24; }

        .live-controls {
          position: absolute; right: 1rem; bottom: 6rem; display: flex; flex-direction: column; gap: 1rem;
        }
        .control-btn {
          width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.2); color: #fff; backdrop-filter: blur(10px);
        }
        .control-btn.off { background: #ef4444; border-color: #ef4444; }

        .live-waiting { height: 100%; display: flex; align-items: center; justify-content: center; background: #111; color: rgba(255,255,255,0.4); font-weight: 700; }

        .live-close-circle-btn {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(12px);
          border: 1.5px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 10000;
        }

        .live-close-circle-btn:hover {
          background: rgba(239, 68, 68, 0.9);
          transform: rotate(90deg) scale(1.1);
          border-color: rgba(255, 255, 255, 0.4);
          box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);
        }

        .live-header-follow-btn {
          background: linear-gradient(135deg, #6C2BFF, #9D6BFF);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 24px;
          font-weight: 800;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(108, 43, 255, 0.4);
          margin-left: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .live-header-follow-btn.is-following {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: none;
          color: rgba(255, 255, 255, 0.9);
        }

        .host-stats-drawer {
          position: absolute;
          right: 0;
          top: 20%;
          transform: translateX(100%);
          transition: transform 0.3s ease;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(10px);
          border-left: 2px solid var(--primary);
          padding: 1rem;
          border-radius: 12px 0 0 12px;
          z-index: 100;
          min-width: 140px;
        }
        .host-stats-drawer.open {
          transform: translateX(0);
        }
        .stats-toggle-btn {
          position: absolute;
          left: -36px;
          top: 50%;
          transform: translateY(-50%);
          width: 36px;
          height: 48px;
          background: rgba(0,0,0,0.8);
          border: 1px solid var(--primary);
          border-right: none;
          border-radius: 12px 0 0 12px;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stats-content { display: flex; flex-direction: column; gap: 0.8rem; }
        .stat-row { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 0.9rem; }

        .live-header-follow-btn {
          background: linear-gradient(135deg, #a855f7 0%, #3b82f6 100%);
          border: 1px solid rgba(255,255,255,0.3);
          color: #fff;
          padding: 6px 14px;
          border-radius: 12px;
          font-weight: 900;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4), inset 0 0 10px rgba(255,255,255,0.1);
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
          animation: pulse-neon-follow 2s infinite;
        }
        .live-header-follow-btn:hover {
          transform: translateY(-2px) scale(1.05);
          filter: brightness(1.2);
          box-shadow: 0 8px 25px rgba(168, 85, 247, 0.6);
        }
        .live-header-follow-btn:active { transform: scale(0.95); }

        .live-header-follow-btn.is-following {
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1.5px solid rgba(255, 255, 255, 0.3);
          animation: none;
          box-shadow: none;
          cursor: default;
          opacity: 0.9;
        }
        .live-header-follow-btn.is-following:hover {
          transform: none;
          filter: none;
        }

        @keyframes pulse-neon-follow {
          0% { box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4); }
          50% { box-shadow: 0 4px 25px rgba(59, 130, 246, 0.6); }
          100% { box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4); }
        }

        /* NOVOS ESTADOS DOS INDICADORES E META (LADO ESQUERDO) */
        .live-badge-column {
           display: flex;
           flex-direction: column;
           gap: 6px;
           align-items: flex-start;
        }
        .live-header-metrics {
           display: flex;
           gap: 8px;
           align-items: center;
           background: rgba(0,0,0,0.4);
           padding: 2px 8px;
           border-radius: 12px;
           backdrop-filter: blur(5px);
        }
        .mini-likes { color: #ef4444 !important; }
        
        .goal-compact-container-sidebar {
           display: flex;
           flex-direction: column;
           gap: 2px;
           width: 140px; /* Reduzido conforme pedido */
           margin-top: 4px;
        }
        .goal-host-label-sidebar {
           font-size: 0.55rem;
           font-weight: 900;
           color: #fbbf24;
           text-transform: uppercase;
           letter-spacing: 0.5px;
           background: rgba(0,0,0,0.5);
           padding: 1px 6px;
           border-radius: 4px;
           width: fit-content;
        }
        .goal-row-wrap-sidebar {
           display: flex;
           align-items: center;
           gap: 6px;
        }
        .goal-icon-preview-sidebar {
           width: 24px;
           height: 24px;
           background: rgba(0,0,0,0.6);
           border-radius: 50%;
           display: flex;
           align-items: center;
           justify-content: center;
           border: 1px solid rgba(255,255,255,0.1);
        }
        .goal-icon-preview-sidebar img { width: 70%; height: 70%; object-fit: contain; }
        .goal-icon-preview-sidebar span { font-size: 0.8rem; }
        
        .goal-progress-bar-sidebar {
           flex: 1;
           height: 12px;
           background: rgba(0,0,0,0.6);
           border-radius: 6px;
           overflow: hidden;
           border: 1px solid rgba(255,255,255,0.05);
           position: relative;
        }
        .goal-fill-sidebar {
           height: 100%;
           transition: width 0.4s ease;
        }
        .goal-count-text-sidebar {
           position: absolute;
           inset: 0;
           display: flex;
           align-items: center;
           justify-content: center;
           font-size: 0.55rem;
           font-weight: 900;
           color: #fff;
           text-shadow: 0 1px 2px rgba(0,0,0,0.8);
        }
         /* NOTIFICAÇÕES RÁPIDAS NO RODAPÉ */
        /* DASHBOARD DO CRIADOR V2 - ULTRA PROFESSIONAL */
        .host-stats-drawer-v2 {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 380px;
          background: rgba(10, 10, 10, 0.85);
          backdrop-filter: blur(25px);
          -webkit-backdrop-filter: blur(25px);
          border-left: 1px solid rgba(255, 255, 255, 0.1);
          transform: translateX(100%);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 5100;
          display: flex;
          flex-direction: column;
          box-shadow: -10px 0 30px rgba(0,0,0,0.5);
        }

        .host-stats-drawer-v2.open {
          transform: translateX(0);
        }

        .stats-toggle-btn-v2 {
          position: absolute;
          left: -40px;
          top: 50%;
          transform: translateY(-50%);
          width: 40px;
          height: 60px;
          background: rgba(10, 10, 10, 0.85);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-right: none;
          border-radius: 12px 0 0 12px;
          color: #6C2BFF;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .stats-toggle-btn-v2:hover {
          color: #fff;
          background: #6C2BFF;
        }

        .stats-container-v2 {
          flex: 1;
          padding: 1.5rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .stats-header-v2 {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .stats-header-v2 h4 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 800;
          background: linear-gradient(90deg, #fff, #999);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(239, 68, 68, 0.2);
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 900;
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .pulse-dot {
          width: 6px;
          height: 6px;
          background: #ef4444;
          border-radius: 50%;
          animation: pulse-red 1.5s infinite;
        }

        @keyframes pulse-red {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }

        .close-stats-v2 {
          background: rgba(255,255,255,0.05);
          border: none;
          color: #fff;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .stats-grid-v2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .stat-card-v2 {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 1rem;
          border-radius: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.3s ease;
        }

        .stat-card-v2:hover {
          background: rgba(255, 255, 255, 0.06);
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.1);
        }

        .card-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .viewers .card-icon { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
        .likes .card-icon { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
        .moral .card-icon { background: rgba(251, 191, 36, 0.15); color: #fbbf24; }
        .fans .card-icon { background: rgba(16, 185, 129, 0.15); color: #10b981; }

        .card-info { display: flex; flex-direction: column; }
        .card-value { font-size: 1.2rem; font-weight: 900; color: #fff; }
        .card-label { font-size: 0.65rem; color: rgba(255,255,255,0.5); text-transform: uppercase; font-weight: 700; }

        .analytics-section-v2 {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 1.2rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .section-header-v2 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          font-weight: 800;
          color: rgba(255,255,255,0.7);
          text-transform: uppercase;
        }

        .chart-container-v2 {
          width: 100%;
          margin: 0.5rem 0;
        }

        .actions-grid-v2 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.8rem;
          margin-top: auto;
          padding-top: 1rem;
        }

        .action-btn-v2 {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 1rem;
          border-radius: 16px;
          font-weight: 900;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
        }

        .action-btn-v2.main {
          background: #6C2BFF;
          color: #fff;
          box-shadow: 0 4px 15px rgba(108, 43, 255, 0.3);
        }

        .action-btn-v2.main:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(108, 43, 255, 0.5);
          filter: brightness(1.1);
        }

        .action-btn-v2.secondary {
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .action-btn-v2.secondary:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        @media (max-width: 768px) {
          .host-stats-drawer-v2 {
            width: 100%;
            height: 80vh;
            top: auto;
            bottom: 0;
            transform: translateY(100%);
            border-left: none;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 30px 30px 0 0;
          }
          .host-stats-drawer-v2.open { transform: translateY(0); }
          .stats-toggle-btn-v2 {
            top: -50px;
            left: 50%;
            transform: translateX(-50%) rotate(90deg);
            border-radius: 12px 12px 0 0;
            border-bottom: none;
          }
        }

         .quick-entrances-container {
            position: absolute;
            bottom: calc(env(safe-area-inset-bottom) + 0.5rem);
            left: 1rem;
            display: flex;
            flex-direction: column;
            gap: 2px;
            pointer-events: none;
            z-index: 100;
         }
         .quick-entrance-item {
            color: rgba(255, 255, 255, 0.6);
            font-size: 0.75rem;
            font-weight: 500;
            text-shadow: 0 1px 2px rgba(0,0,0,0.5);
         }

         /* MODAL DE ENCERRAMENTO */
         .confirm-modal-urban {
           background: rgba(17, 17, 19, 0.45);
           backdrop-filter: blur(24px);
           -webkit-backdrop-filter: blur(24px);
           border: 1px solid rgba(255, 255, 255, 0.08);
           border-radius: 24px;
           padding: 2.5rem 2rem 2rem;
           text-align: center;
           width: 90%;
           max-width: 320px;
           box-shadow: 0 20px 50px rgba(0,0,0,0.8);
         }
         .confirm-icon-wrapper {
           width: 72px;
           height: 72px;
           border-radius: 50%;
           background: rgba(239, 68, 68, 0.1);
           display: flex;
           align-items: center;
           justify-content: center;
           margin: 0 auto 1.5rem;
           animation: pulseWarning 2s infinite;
         }
         @keyframes pulseWarning {
           0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
           70% { box-shadow: 0 0 0 20px rgba(239, 68, 68, 0); }
           100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
         }
         .confirm-modal-urban h3 {
           font-weight: 900;
           font-size: 1.2rem;
           margin-bottom: 0.5rem;
           color: #fff;
         }
         .confirm-modal-urban p {
           font-size: 0.9rem;
           color: rgba(255,255,255,0.6);
           margin-bottom: 2rem;
           line-height: 1.5;
         }
         .confirm-actions {
           display: flex;
           gap: 1rem;
         }
         .confirm-btn {
           flex: 1;
           padding: 1.1rem 0;
           border-radius: 12px;
           font-weight: 800;
           font-size: 0.9rem;
           cursor: pointer;
           border: none;
           transition: all 0.2s;
         }
         .confirm-btn.cancel {
           background: rgba(255, 255, 255, 0.05);
           color: #fff;
         }
         .confirm-btn.proceed {
           background: #ef4444;
           color: #fff;
         }
         .confirm-btn:active { transform: scale(0.95); }
      `}</style>
    </div>
  );

  // Inline: renderiza diretamente no container pai (aba Lives/Avista)
  // Portal: renderiza no body para modo tela cheia (Community/App)
  if (inline) return content;
  return createPortal(content, document.body);
}
