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
import { Heart, Users, UserPlus, Mic, MicOff, Camera, X, ChevronRight, ChevronLeft, Gift, Video, Share2, BarChart2, Zap, Power, Sparkles, Swords, Loader2 } from 'lucide-react';
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

// Suprimir logs verbose do SDK Agora (inclui 404 /nobooster)
try { AgoraRTC.setLogLevel(4); } catch(_) {}

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
    // Metas de Presentes
    gift_goal_title?: string;
    gift_goal_target?: number;
    gift_goal_current?: number;
    gift_goal_id?: string | null;
    
    // Metas de Seguidores
    follower_goal_title?: string;
    follower_goal_target?: number;
    follower_goal_current?: number;
  };
  userProfile?: any;
  onClose: () => void;
  inline?: boolean;
  isActive?: boolean;
}

export function LiveRoom({ session, userProfile, role, room, onClose, inline, isActive = true }: LiveRoomProps) {
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
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
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
    
    // Mostra que estamos aguardando a resposta
    setBattleInviteStatus('pending');

    // Manda o convite formal (popup BATTLE_INVITE) para o oponente em vez de forçar a conexão da câmera
    doBroadcast(opponent.id, 'battle_invite_request', { 
       from: room.host_id, 
       fromRoomId: room.id,
       profile: room.host_profile || session.user.user_metadata,
       agora_channel: room.agora_channel
    });
  }

  // Função helper puramente não bloqueante para oponente e cross channel
  const doBroadcast = (targetRoomId: string, event: string, payload: any = {}) => {
     try {
       if (targetRoomId === room.id && chatChannelRef.current) {
         chatChannelRef.current.send({ type: 'broadcast', event, payload }).catch(()=>null);
       } else {
         console.log(`[doBroadcast] Connecting to foreign room: live_chat:${targetRoomId} for event ${event}`);
         const tempCh = supabase.channel(`live_chat:${targetRoomId}`, { config: { broadcast: { ack: true } } });
         
         tempCh.subscribe(async (status) => {
            console.log(`[doBroadcast] Foreign channel status:`, status);
            if (status === 'SUBSCRIBED') {
               try {
                 // Try to send immediately with ack
                 const resp = await tempCh.send({ type: 'broadcast', event, payload });
                 console.log(`[doBroadcast] Sent ${event} to ${targetRoomId}, response:`, resp);
                 
                 // Fallback re-transmit (helps if socket wasn't fully ready)
                 setTimeout(() => tempCh.send({ type: 'broadcast', event, payload }).catch(()=>null), 300);
                 setTimeout(() => tempCh.send({ type: 'broadcast', event, payload }).catch(()=>null), 800);
                 
                 // Clean up later
                 setTimeout(() => { supabase.removeChannel(tempCh) }, 3000);
               } catch (err) {
                 console.error("[doBroadcast] failed to send:", err);
               }
            }
         });
       }
     } catch(e) {
       console.error("[doBroadcast] Setup error:", e);
     }
  };

  async function handleDisconnectMatch() {
     // Enviar desconexão local sem travar o botão
     doBroadcast(room.id, 'match_disconnected');
     
     // Enviar desconexão para o oponente
     if (activeBattle?.opponentRoomId) {
        doBroadcast(activeBattle.opponentRoomId, 'match_disconnected');
     }
     
     setActiveBattle(null);
     setBattleTimeLeft(0);
     setBattleInvite(null);
     setBattleInviteStatus(null);
  }

  async function handleRequestBattleStart() {
     if (!activeBattle?.opponentRoomId) return;
     setBattleInviteStatus('pending');
     
     doBroadcast(activeBattle.opponentRoomId, 'battle_invite_request', { 
        from: room.host_id, 
        fromRoomId: room.id,
        profile: room.host_profile || session.user.user_metadata 
     });
  }

  async function handleAcceptBattle() {
     console.log("Accepting battle from:", battleInvite);
     if (!battleInvite?.fromRoomId) return; 
     const eTime = Date.now() + 180000;
     const endsAtStr = new Date(eTime).toISOString();
     
     // 1. O Banco de Dados passa a comandar a Batalha Global!
     const { error } = await supabase.from('live_battles').insert({
        host_a_id: room.host_id,
        host_b_id: battleInvite.fromId || battleInvite.from,
        status: 'active',
        started_at: new Date().toISOString(),
        ends_at: endsAtStr,
        agora_channel_a: room.agora_channel,
        agora_channel_b: battleInvite.agora_channel
     });
     
     if (error) {
        console.error("Erro ao iniciar DB Battle", error);
     } else {
        console.log("DB Battle inserted! The postgres_changes listener should trigger now.");
     }
     
     setBattleInvite(null);
  }

  async function handleRejectBattle() {
     if (!battleInvite?.fromRoomId) return;
     doBroadcast(battleInvite.fromRoomId, 'battle_invite_rejected');
     setBattleInvite(null);
  }

  function handleSurrenderBattle() {
     if (!activeBattle) return;
     // Abre o modal customizado — sem usar confirm() nativo do browser
     setShowSurrenderConfirm(true);
  }

  async function executeSurrender() {
     setShowSurrenderConfirm(false);
     if (!activeBattle) return;

     const opponentId = activeBattle.opponentId;

     // Payload da perspectiva DE QUEM DESISTIU (score_a=0 = eu perdi)
     const myPayload = {
         score_a: 0,
         score_b: 999999,
         winner_id: opponentId,
         surrender: true
     };

     // Payload da perspectiva DO OPONENTE (score_a=999999 = ele ganhou)
     const opponentPayload = {
         score_a: 999999,
         score_b: 0,
         winner_id: opponentId,
         surrender: true
     };

     // Notifica a própria sala (audiência local vê o resultado) usando o helper robusto
     doBroadcast(room.id, 'battle_ended', myPayload);

     // Notifica a sala do oponente com placar do ponto de vista DELE
     if (activeBattle.opponentRoomId) {
         doBroadcast(activeBattle.opponentRoomId, 'battle_ended', opponentPayload);
     }

     // Persiste no banco
     if (activeBattle.battleId) {
         await supabase.from('live_battles').update({
             status: 'finished',
             score_a: 0,
             score_b: Math.max(activeBattle.score_b || 0, activeBattle.score_a || 0) + 100,
             winner_id: opponentId,
             ends_at: new Date().toISOString()
         }).eq('id', activeBattle.battleId);
     }

     // Atualiza estado LOCAL com scores corretos (eu perdi = 0 vs 999999)
     setActiveBattle((prev: any) => prev ? { ...prev, endTime: Date.now(), score_a: 0, score_b: 999999 } : null);
     setBattleTimeLeft(0);
  }

  // SINCRONIZAR AUDIÊNCIA OU HOST RETORNANTE (ENTRADAS TARDIAS/REFRESH)
  useEffect(() => {
    async function syncOngoingBattle() {
      if (!room || !room.host_id) return;
      try {
        // Busca batalha ativa (status = 'active' OU recente nos últimos 3min)
        const { data: activeDBMatch } = await supabase.from('live_battles')
           .select('*')
           .eq('status', 'active')
           .or(`host_a_id.eq.${room.host_id},host_b_id.eq.${room.host_id}`)
           .order('started_at', { ascending: false })
           .limit(1)
           .maybeSingle();

        if (!activeDBMatch) return;

        // ✅ PROTEÇÃO CRÍTICA: Se a batalha já expirou (ends_at no passado), não restaurar.
        // Corrige o status no banco silenciosamente para evitar loops futuros.
        if (activeDBMatch.ends_at && new Date(activeDBMatch.ends_at).getTime() < Date.now()) {
          supabase
            .from('live_battles')
            .update({ status: 'ended' })
            .eq('id', activeDBMatch.id)
            .then(() => {});
          return; // Sai sem restaurar — batalha já acabou
        }

        const opponentId = activeDBMatch.host_a_id === room.host_id 
          ? activeDBMatch.host_b_id 
          : activeDBMatch.host_a_id;
        const oppChannel = activeDBMatch.host_a_id === room.host_id 
          ? activeDBMatch.agora_channel_b 
          : activeDBMatch.agora_channel_a;

        const [{ data: oppProfile }, { data: oppLive }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', opponentId).single(),
          supabase.from('live_sessions').select('id').eq('host_id', opponentId).eq('is_live', true).maybeSingle()
        ]);
        
        if (!oppProfile) return;

        // ends_at SEMPRE vem do banco - nunca será null se a batalha foi criada corretamente
        const syncEndTime = activeDBMatch.ends_at 
          ? new Date(activeDBMatch.ends_at).getTime() 
          : Date.now() + 180000; // fallback: 3 min a partir de agora

        // Scores da perspectiva DESTE quarto (A = meu host, B = oponente)
        const isHostA = activeDBMatch.host_a_id === room.host_id;
        const score_a = isHostA ? (activeDBMatch.score_a || 0) : (activeDBMatch.score_b || 0);
        const score_b = isHostA ? (activeDBMatch.score_b || 0) : (activeDBMatch.score_a || 0);

        setActiveBattle({
          opponentId,
          opponentProfile: oppProfile,
          agora_channel: oppChannel,
          opponentRoomId: oppLive?.id ?? null,
          endTime: syncEndTime,
          score_a,
          score_b,
          battleId: activeDBMatch.id
        });

        setBattleTimeLeft(Math.max(0, Math.floor((syncEndTime - Date.now()) / 1000)));

        // Pedir pontuação real para sincronizar placar
        setTimeout(() => {
          supabase.channel(`live_chat:${room.id}`).send({
            type: 'broadcast', event: 'score_request', payload: {}
          }).catch(() => {});

          if (role === 'host' && oppLive?.id) {
            supabase.channel(`live_chat:${oppLive.id}`).send({
              type: 'broadcast', event: 'score_request', payload: {}
            }).catch(() => {});
          }
        }, 1500); // pequeno delay para garantir que o canal já está inscrito

      } catch (e) {
          console.warn('Erro syncOngoingBattle', e);
      }
    }
    syncOngoingBattle();
  }, [room?.host_id, role]);

  // CRUZADOR DE CANAIS AGORA (OPONENTE)
  const opponentClientRef = useRef<IAgoraRTCClient | null>(null);
  
  useEffect(() => {
    if (!activeBattle?.agora_channel || !APP_ID) return;
    
    let isMounted = true;
    const opponentClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    opponentClientRef.current = opponentClient;

    opponentClient.on('user-published', async (user, mediaType) => {
      await opponentClient.subscribe(user, mediaType);
      
      if (mediaType === 'video' && isMounted) {
        setTimeout(() => {
          const el = document.getElementById(`remote-video-opponent`);
          if (el) {
             el.innerHTML = '';
             user.videoTrack?.play(el);
          }
        }, 500);
      }
      if (mediaType === 'audio') {
        user.audioTrack?.play();
      }
    });

    async function joinOpponentChannel() {
      try {
         await opponentClient.join(APP_ID, activeBattle.agora_channel, null, null);
      } catch (err) {
         console.warn("Opponent Join Error:", err);
      }
    }
    
    joinOpponentChannel();
    
    return () => {
      isMounted = false;
      opponentClient.leave().catch(() => {});
      opponentClientRef.current = null;
    };
  }, [activeBattle?.agora_channel]);

  // INTERATIVIDADE DE ELITE (FILA DE ENTRADA)
  const [hearts, setHearts] = useState<{ id: number, color: string, x: number, y: number }[]>([]);
  const [entranceQueue, setEntranceQueue] = useState<any[]>([]);
  const [activeEntrance, setActiveEntrance] = useState<any | null>(null);
  const [quickEntrances, setQuickEntrances] = useState<{id: string, username: string}[]>([]);
  const [totalLikes, setTotalLikes] = useState(0);
  const [statsHistory, setStatsHistory] = useState<any[]>([]);

  // ESTADOS DE META (REALTIME) - PRESENTES
  const [giftGoalTitle, setGiftGoalTitle] = useState(room.gift_goal_title || '');
  const [giftGoalTarget, setGiftGoalTarget] = useState(room.gift_goal_target || 0);
  const [giftGoalCurrent, setGiftGoalCurrent] = useState(room.gift_goal_current || 0);
  const [giftGoalId, setGiftGoalId] = useState<string | null>(room.gift_goal_id || null);

  // ESTADOS DE META (REALTIME) - SEGUIDORES
  const [followerGoalTitle, setFollowerGoalTitle] = useState(room.follower_goal_title || '');
  const [followerGoalTarget, setFollowerGoalTarget] = useState(room.follower_goal_target || 0);
  const [followerGoalCurrent, setFollowerGoalCurrent] = useState(room.follower_goal_current || 0);

  // Estados de Aquecimento da Batalha (Confronto)
  const [battleInvite, setBattleInvite] = useState<{from: string, fromRoomId: string, profile: any, agora_channel: string} | null>(null);
  const [battleInviteStatus, setBattleInviteStatus] = useState<'pending' | 'rejected' | null>(null);
  const [isGoalPickerOpen, setIsGoalPickerOpen] = useState(false);
  const [isGoalPanelOpen, setIsGoalPanelOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const [hasFollowed, setHasFollowed] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const chatChannelRef = useRef<any>(null);
  const dbChannelRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null); // Container do vídeo local (host)
  const agoraClientRef = useRef<any>(null); // Refs imortais para shutdown
  const localAudioRef = useRef<any>(null);
  const localVideoRef = useRef<any>(null);
  const [activeUserProfile, setActiveUserProfile] = useState<any>(userProfile);
  const beautyProcessorRef = useRef<any>(null);
  const vbgProcessorRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Refs ESTÁVEIS para os containers de vídeo remoto — evita pisca-pisca ao re-renderizar
  const hostVideoRef = useRef<HTMLDivElement>(null);
  const opponentVideoRef = useRef<HTMLDivElement>(null);

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
    if (!isActive) return;

    // Carregar contagem de likes da live do banco ao iniciar
    supabase
      .from('live_sessions')
      .select('likes_count')
      .eq('id', room.id)
      .single()
      .then(({ data }) => {
        if (data?.likes_count) setTotalLikes(data.likes_count);
      });

    // Carregar histórico de mensagens (não quebra caso a tabela ainda não exista)
    supabase
      .from('live_chat_messages')
      .select('content, is_system, profiles(username, avatar_url, total_donated, badges)')
      .eq('room_id', room.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (data && data.length > 0) {
           const formatted = data.reverse().map((msg: any) => ({
              username: msg.profiles?.username || 'Cria',
              content: msg.content,
              isSystem: msg.is_system,
              badges: msg.profiles?.badges || [],
              donated_amount: msg.profiles?.total_donated || 0
           }));
           setChat(formatted);
        }
      })
      .catch(() => {}); // Ignora se o usuário ainda não rodou a migration


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
      if (chatChannelRef.current) supabase.removeChannel(chatChannelRef.current);
      if (dbChannelRef.current) supabase.removeChannel(dbChannelRef.current);
      clearTimeout(timer);
    };
  }, [room.host_id, session?.user?.id, isActive]);


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

  // Timer da Batalha (Global Sync)
  useEffect(() => {
    if (!activeBattle?.endTime) return;
    const interval = setInterval(async () => {
      const remaining = Math.max(0, Math.floor((activeBattle.endTime - Date.now()) / 1000));
      setBattleTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(interval);

        // Apenas o host A (dono da sala) salva o resultado — evita duplicatas
        if (role === 'host') {
          const scoreA = activeBattle.score_a ?? 0;
          const scoreB = activeBattle.score_b ?? 0;
          const winnerId = scoreA >= scoreB ? session.user.id : (activeBattle.opponentId ?? session.user.id);

          // Salvar/Atualizar resultado final na tabela live_battles (usando o ID para update)
          if (activeBattle.battleId) {
             await supabase.from('live_battles').update({
               status: 'finished',
               score_a: scoreA,
               score_b: scoreB,
               final_score_a: scoreA,
               final_score_b: scoreB,
               winner_id: winnerId,
               ends_at: new Date(activeBattle.endTime).toISOString()
             }).eq('id', activeBattle.battleId)
               .then(({ error }) => {
                 if (error) console.warn('Erro ao atualizar batalha final:', error.message);
             });
          } else {
             // Fallback caso battleId não exista localmente
             await supabase.from('live_battles').insert({
               host_a_id: session.user.id,
               host_b_id: activeBattle.opponentId,
               status: 'finished',
               score_a: scoreA,
               score_b: scoreB,
               final_score_a: scoreA,
               final_score_b: scoreB,
               winner_id: winnerId,
               agora_channel_a: room.agora_channel,
               agora_channel_b: activeBattle.agora_channel,
               started_at: new Date(activeBattle.endTime - 180000).toISOString(),
               ends_at: new Date(activeBattle.endTime).toISOString(),
             }).then(({ error }) => {
               if (error) console.warn('Erro ao salvar batalha fallback:', error.message);
             });
          }

          // Notificar toda a audiência que a batalha terminou
          await supabase.channel(`live_chat:${room.id}`).send({
            type: 'broadcast',
            event: 'battle_ended',
            payload: { score_a: scoreA, score_b: scoreB, winner_id: winnerId }
          });
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeBattle?.endTime]);

  // MOTOR DA FILA DE PRESENTES (anima um por vez)
  useEffect(() => {
    if (!activeGift && giftQueue.length > 0) {
      const next = giftQueue[0];
      setGiftQueue(prev => prev.slice(1));
      setActiveGift(next);
    }
  }, [activeGift, giftQueue]);

  // GARANTIR QUE A TRACK DE VÍDEO RODE MESMO DEPOIS DE ROTAS DE RENDERIZAÇÃO
  // Usando refs estáveis (hostVideoRef / opponentVideoRef) para evitar parar o vídeo em re-renders
  useEffect(() => {
    // 1. Toca o host se o usuário for audiência
    if (role === 'audience') {
      const hostUser = remoteUsers.find(u => String(u.uid) === String(room.host_id));
      if (hostUser?.videoTrack && isActive) {
        const el = hostVideoRef.current;
        if (el && el.childElementCount === 0) {
          hostUser.videoTrack.play(el);
        }
      }
    }

    // 2. Toca o oponente se houver uma batalha ativa
    if (activeBattle && activeBattle.opponentId) {
      const opponentUser = remoteUsers.find(u => String(u.uid) === String(activeBattle.opponentId));
      if (opponentUser?.videoTrack) {
        const el = opponentVideoRef.current;
        if (el && el.childElementCount === 0) {
          opponentUser.videoTrack.play(el);
        }
      }
    }
  }, [remoteUsers, role, room.host_id, activeBattle, isActive]);

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
      
      // Sincronizar participantes que já estavam lá antes de nós
      agoraClient.remoteUsers.forEach(async (user) => {
         if (user.hasVideo) {
             await agoraClient.subscribe(user, 'video');
             setRemoteUsers(prev => [...prev.filter(u => u.uid !== user.uid), user]);
         }
         if (user.hasAudio) {
             await agoraClient.subscribe(user, 'audio');
             user.audioTrack?.play();
         }
      });

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
      .on('broadcast', { event: 'gift' }, async ({ payload }) => {
        setGiftQueue(prev => [...prev, payload]);
        setSessionGifts(prev => prev + payload.gift.price);
        
        // Atualizar meta de presentes se ativa
        if (giftGoalTarget > 0) {
          const isMatch = !giftGoalId || payload.gift.id === giftGoalId;
          if (isMatch) {
            const increment = giftGoalId ? 1 : payload.gift.price;
            setGiftGoalCurrent((prev: number) => prev + increment);
            
            if (role === 'host') {
               await supabase
                 .from('live_sessions')
                 .update({ gift_goal_current: (room.gift_goal_current || 0) + increment })
                 .eq('id', room.id);
            }
          }
        }

        const isMatch = !giftGoalId || payload.gift.id === giftGoalId;
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
        
        setTotalLikes(prev => {
           const updatedTotal = prev + 1;
           // Host persiste no banco as curtidas vindas da rede (incremento puro)
           if (role === 'host' && payload.userId !== session.user.id) {
              if (updatedTotal % 5 === 0 || updatedTotal <= 3) {
                 supabase
                    .from('live_sessions')
                    .update({ likes_count: updatedTotal })
                    .eq('id', room.id)
                    .then(() => {});
              }
           }
           return updatedTotal;
        });

        // Se não fui eu que curti, mostro um coração flutuante vindo da rede
        if (payload.userId !== session.user.id) {
          const colors = ['#ff4b2b', '#ff416c', '#6c2bff', '#fbbf24'];
          const newHeart = { id: Date.now(), color: colors[Math.floor(Math.random() * colors.length)] };
          setHearts(prev => [...prev, newHeart]);
          setTimeout(() => setHearts(prev => prev.filter(h => h.id !== newHeart.id)), 1500);
        }
      })
      .on('broadcast', { event: 'follow' }, async ({ payload }) => {
        if (followerGoalTarget > 0) {
           setFollowerGoalCurrent((prev: number) => prev + 1);
           if (role === 'host') {
              await supabase
                .from('live_sessions')
                .update({ follower_goal_current: followerGoalCurrent + 1 })
                .eq('id', room.id);
           }
        }
        setSessionFollowers((prev: number) => prev + 1);
      })
      .on('broadcast', { event: 'match_connected' }, ({ payload }) => {
         if (role === 'audience') {
            setActiveBattle({ ...payload, endTime: null });
            setBattleTimeLeft(0);
         }
      })
      .on('broadcast', { event: 'match_disconnected' }, () => {
         setActiveBattle(null);
         setBattleTimeLeft(0);
         setBattleInvite(null);
         setBattleInviteStatus(null);
      })
      .on('broadcast', { event: 'battle_invite_request' }, ({ payload }) => {
         if (role === 'host') {
            setBattleInvite(payload);
         }
      })
      .on('broadcast', { event: 'battle_invite_rejected' }, () => {
         if (role === 'host') {
            setBattleInviteStatus('rejected');
            setTimeout(() => setBattleInviteStatus(null), 3000);
         }
      })
      .on('broadcast', { event: 'score_update' }, ({ payload }) => {
         // Se o payload vier da MINHA sala, já tratamos (score_a).
         // Mas se o payload vier da sala do OPONENTE, atualizamos nosso score_b (que é o score_a dele lá)
         setActiveBattle((prevBattle: any) => {
           if (!prevBattle) return prevBattle;
           if (payload.sender_room_id && payload.sender_room_id !== room.id) {
             return { ...prevBattle, score_b: payload.score_a };
           } else {
             return { ...prevBattle, score_a: payload.score_a };
           }
         });
      })
      .on('broadcast', { event: 'score_request' }, () => {
         if (role === 'host') {
             setActiveBattle((prevBattle: any) => {
                 if (prevBattle) {
                     const payload = {
                         roomId: room.id,
                         score_a: prevBattle.score_a || 0,
                         score_b: prevBattle.score_b || 0,
                         sender_room_id: room.id
                     };
                     supabase.channel(`live_chat:${room.id}`).send({
                         type: 'broadcast', event: 'score_update', payload
                     }).catch(()=>{});

                     if (prevBattle.opponentRoomId) {
                         supabase.channel(`live_chat:${prevBattle.opponentRoomId}`).send({
                             type: 'broadcast', event: 'score_update', payload
                         }).catch(()=>{});
                     }
                 }
                 return prevBattle;
             });
         }
      })
      .on('broadcast', { event: 'battle_ended' }, ({ payload }) => {
         // Processa para TODOS: audiência E host oponente (que recebe o evento de surrender)
         // Atualiza placar final antes de limpar
         if (payload?.score_a !== undefined) {
           setActiveBattle((prev: any) => prev ? {
             ...prev,
             score_a: payload.score_a,
             score_b: payload.score_b,
             endTime: Date.now()   // força o placar final aparecer
           } : prev);
         }
         setBattleTimeLeft(0); // mostra a tela de resultado imediatamente
         setTimeout(() => {
           setActiveBattle(null);
           setBattleTimeLeft(0);
         }, payload?.surrender ? 4000 : 5000); // abandono some um pouco mais rápido
      })
      .on('broadcast', { event: 'goal_update' }, ({ payload }) => {
        if (payload.gift) {
           setGiftGoalTitle(payload.gift.title);
           setGiftGoalTarget(payload.gift.target);
           setGiftGoalCurrent(payload.gift.current);
           setGiftGoalId(payload.gift.gift_id);
        }
        if (payload.follower) {
           setFollowerGoalTitle(payload.follower.title);
           setFollowerGoalTarget(payload.follower.target);
           setFollowerGoalCurrent(payload.follower.current);
        }
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
      });
      
    // DB Listener para ativar batalhas do aquecimento para ativas
    const dbChannel = supabase.channel(`public:live_battles:${room.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_battles' }, async (payload) => {
         const match = payload.new as any;
         if (!match || match.status !== 'active') return;
         
         const belongsToRoom = match.host_a_id === room.host_id || match.host_b_id === room.host_id;
         if (belongsToRoom) {
            const endsAt = new Date(match.ends_at).getTime();

            const isHostA = match.host_a_id === room.host_id;
            const oppId = isHostA ? match.host_b_id : match.host_a_id;
            const oppChannel = isHostA ? match.agora_channel_b : match.agora_channel_a;

            // Busca as infos faltantes (como o ID da sala do oponente e seu profile) antes de ligar a batalha
            const [{ data: oppProfile }, { data: oppLive }] = await Promise.all([
               supabase.from('profiles').select('*').eq('id', oppId).maybeSingle(),
               supabase.from('live_sessions').select('id').eq('host_id', oppId).eq('is_live', true).maybeSingle()
            ]);

            const mappedBattle = {
               opponentId: oppId,
               opponentProfile: oppProfile || null,
               agora_channel: oppChannel,
               opponentRoomId: oppLive?.id ?? null,
               score_a: 0,
               score_b: 0,
               endTime: endsAt,
               battleId: match.id 
            };

            setActiveBattle((prev: any) => prev ? { ...prev, ...mappedBattle } : mappedBattle);
            setBattleTimeLeft(Math.max(0, Math.floor((endsAt - Date.now()) / 1000)));

            if (role === 'host') {
               setBattleInviteStatus(null);
               setBattleInvite(null);
            }
         }
      });
      
    dbChannel.subscribe();
    dbChannelRef.current = dbChannel;
    
    // Inscreve ambos
    chatChannel.subscribe(async (status) => {
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

    // Salvar silenciosamente no banco para histórico
    supabase.from('live_chat_messages').insert({
       room_id: room.id,
       profile_id: session.user.id,
       content: message
    }).then(() => {}).catch(() => {});
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

    // Se estiver em batalha (e a batalha já tiver começado = endTime presente)
    setActiveBattle((prevBattle: any) => {
      // Se a batalha não iniciou OU já acabou o tempo, NÃO computar pontuação
      if (!prevBattle || !prevBattle.endTime || Date.now() >= prevBattle.endTime) return prevBattle;
      
      const newScoreA = prevBattle.score_a + gift.price;
      const updated = { ...prevBattle, score_a: newScoreA };
      
      // Criar payload de cross-scoring
      const scorePayload = { roomId: room.id, score_a: newScoreA, score_b: prevBattle.score_b, sender_room_id: room.id };
      
      // 1. Broadcast na sala ATUAL
      supabase.channel(`live_chat:${room.id}`).send({
        type: 'broadcast',
        event: 'score_update',
        payload: scorePayload
      }).catch(() => {});
      
      // 2. Broadcast CRUZADO para a sala do oponente (para ele ver nosso ponto subindo lá)
      if (prevBattle.opponentRoomId) {
        supabase.channel(`live_chat:${prevBattle.opponentRoomId}`).send({
           type: 'broadcast',
           event: 'score_update',
           payload: scorePayload
        }).catch(() => {});
      }
      return updated;
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

    // Persistir o presente no histórico do chat silenciosamente
    supabase.from('live_chat_messages').insert({
       room_id: room.id,
       profile_id: session.user.id,
       content: `🎁 enviou um ${gift.name}!`,
       is_system: true,
       gift_data: gift
    }).then(() => {}).catch(() => {});

    // Contagem da meta para o próprio host (visual local)
    const isMatch = !giftGoalId || gift.id === giftGoalId;
    if (isMatch) {
       setGiftGoalCurrent((prev: number) => prev + (giftGoalId ? 1 : gift.price));
    }

    setIsGiftPanelOpen(false);
  }

  async function updateGiftGoal(title: string, target: number, giftId: string | null) {
    const payload = { gift: { title, target, current: 0, gift_id: giftId } };
    await supabase.channel(`live_chat:${room.id}`).send({ type: 'broadcast', event: 'goal_update', payload });
    await supabase.from('live_sessions').update({ gift_goal_title: title, gift_goal_target: target, gift_goal_current: 0, gift_goal_id: giftId }).eq('id', room.id);
    setGiftGoalTitle(title); setGiftGoalTarget(target); setGiftGoalCurrent(0); setGiftGoalId(giftId);
    setIsGoalPanelOpen(false);
  }

  async function updateFollowerGoal(title: string, target: number) {
    const payload = { follower: { title, target, current: 0 } };
    await supabase.channel(`live_chat:${room.id}`).send({ type: 'broadcast', event: 'goal_update', payload });
    await supabase.from('live_sessions').update({ follower_goal_title: title, follower_goal_target: target, follower_goal_current: 0 }).eq('id', room.id);
    setFollowerGoalTitle(title); setFollowerGoalTarget(target); setFollowerGoalCurrent(0);
    setIsGoalPanelOpen(false);
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
        increment: 1
      }
    });

    // Persistir o total no banco (apenas se for o host que deu o like)
    if (role === 'host') {
      if (newLikes % 5 === 0 || newLikes <= 3) {
        supabase
          .from('live_sessions')
          .update({ likes_count: newLikes })
          .eq('id', room.id)
          .then(() => {});
      }
    }
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
        position: 'absolute', inset: 0, backgroundColor: '#000', display: 'flex', flexDirection: 'column', overflow: 'visible', touchAction: 'pan-y'
      } : { 
        position: 'fixed', inset: 0, zIndex: 500000, backgroundColor: '#000000', display: 'flex', flexDirection: 'column', visibility: 'visible', opacity: 1
      }}
    >
          <div 
            className="live-video-layer" 
        style={{ 
          zIndex: 1, 
          position: 'absolute', 
          top: activeBattle ? '10%' : '0', 
          left: '0', 
          right: '0', 
          bottom: activeBattle ? '45%' : '0', 
          display: 'flex', 
          flexDirection: 'row',
          transition: 'all 0.3s ease-out'
        }}
      >


        {/* Vídeo do Host da sala (Seja eu ou o criador que estou assistindo) */}
        {role === 'host' ? (
          <div ref={videoContainerRef} className="live-video-element" style={{ width: activeBattle ? '50%' : '100%', height: '100%', transition: 'width 0.3s' }} />
        ) : (
          <div 
            style={{ width: activeBattle ? '50%' : '100%', height: '100%', background: '#000', transition: 'width 0.3s', position: 'relative' }}
          >
            {/* CONTAINER EXCLUSIVO PARA O AGORA RTC — ref ESTÁVEL para evitar pisca-pisca */}
            <div
              id={`remote-video-${room.host_id}`}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
              ref={hostVideoRef}
            />
            {/* PLACEHOLDER REACT */}
            {!remoteUsers.find(u => String(u.uid) === String(room.host_id))?.videoTrack && (
               <div className="live-waiting" style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
                 <div className="animate-pulse">📺 Aguardando sinal do Host...</div>
               </div>
            )}
          </div>
        )}

        {/* Vídeo do Oponente na Batalha */}
        {activeBattle && (
           <div style={{ width: '50%', height: '100%', background: '#111', borderLeft: '2px solid #ef4444', position: 'relative' }}>
              {/* CONTAINER EXCLUSIVO AGORA RTC — ref ESTÁVEL para evitar pisca-pisca */}
              <div 
                 id={`remote-video-opponent`} 
                 style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                 ref={opponentVideoRef}
              />
              {/* PLACEHOLDER REACT */}
              {!remoteUsers.find(u => String(u.uid) === String(activeBattle.opponentId))?.videoTrack && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, pointerEvents: 'none' }}>
                   <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <img 
                        src={activeBattle.opponentProfile?.avatar_url || 'https://ui-avatars.com/api/?name=Op'} 
                        style={{ width: '64px', height: '64px', borderRadius: '50%', marginBottom: '8px', opacity: 0.5, objectFit: 'cover' }} 
                        alt="Opponent"
                      />
                      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>
                        Conectando oponente...
                      </div>
                   </div>
                </div>
              )}
           </div>
        )}
      </div>

      <div 
        className="live-overlay"
        onTouchEnd={role === 'audience' ? handleDoubleTap : undefined}
        onDoubleClick={role === 'audience' ? handleDoubleTap : undefined}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10, touchAction: 'pan-y' }}
      >

        {activeBattle && activeBattle.endTime && (
          <>
            <BattleScoreBar 
              scoreA={activeBattle.score_a} 
              scoreB={activeBattle.score_b}
              timeRemainingSec={battleTimeLeft}
              hostAvatar={room.host_profile?.avatar_url}
              opponentAvatar={activeBattle.opponentProfile?.avatar_url}
            />

            {/* OVERLAY FINALE DE BATALHA (TÍTULO) */}
            {battleTimeLeft === 0 && (
              <div style={{
                position: 'absolute', top: '15%', left: 0, right: 0, zIndex: 100000,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                animation: 'fadeIn 0.5s ease', textAlign: 'center', pointerEvents: 'none'
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '0.5rem', animation: 'bounce 1s infinite', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' }}>
                  {activeBattle.score_a > activeBattle.score_b ? '👑' : activeBattle.score_a < activeBattle.score_b ? '💀' : '🤝'}
                </div>
                <h2 style={{
                  color: '#fff', fontSize: '1.8rem', fontWeight: 900,
                  background: activeBattle.score_a > activeBattle.score_b ? 'linear-gradient(to right, #facc15, #f59e0b)' : 'linear-gradient(to right, #ef4444, #dc2626)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.8))'
                }}>
                  {role === 'host'
                    ? (activeBattle.score_a > activeBattle.score_b ? 'VITÓRIA É SUA!' : activeBattle.score_a < activeBattle.score_b ? 'VOCÊ FOI DERROTADO' : 'EMPATE!')
                    : (activeBattle.score_a > activeBattle.score_b ? '🏆 VENCEDOR!' : activeBattle.score_a < activeBattle.score_b ? '💔 DERROTADO' : '🤝 EMPATE!')
                  }
                </h2>
              </div>
            )}

            {/* OVERLAY FINALE DE BATALHA (BOTÕES NO RODAPÉ) */}
            {battleTimeLeft === 0 && role === 'host' && (
              <div style={{
                position: 'absolute', bottom: '15%', left: 0, right: 0, zIndex: 100000,
                display: 'flex', gap: '1rem', justifyContent: 'center', padding: '0 2rem'
              }}>
                <button 
                  onClick={() => {
                    setActiveBattle((prev: any) => ({ ...prev, score_a: 0, score_b: 0 }));
                    setBattleTimeLeft(180);
                  }}
                  style={{
                    flex: 1, background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none',
                    color: '#fff', padding: '1rem', borderRadius: '1rem', fontWeight: 900, fontSize: '1rem',
                    cursor: 'pointer', boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)',
                    transition: 'all 0.2s',
                  }}
                >
                  🔁 REVANCHE
                </button>
                <button 
                  onClick={() => setActiveBattle(null)}
                  style={{
                    flex: 1, background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)',
                    color: '#fff', padding: '1rem', borderRadius: '1rem', fontWeight: 700, fontSize: '1rem',
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  ✖ SAIR FORA
                </button>
              </div>
            )}
          </>
        )}

        {activeBattle && !activeBattle.endTime && role === 'host' && (
          <div style={{
            position: 'absolute',
            bottom: '22%', // Fica acima da barra de controles do host
            left: 0, right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            zIndex: 10000000,
            pointerEvents: 'auto'
          }}>
            <button 
               onClick={(e) => { e.stopPropagation(); handleDisconnectMatch(); }}
               style={{
                 background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
                 borderRadius: '20px', padding: '10px 20px', color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                 display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', pointerEvents: 'auto'
               }}>
               ❌ Sair
            </button>
            <button
               onClick={(e) => { e.stopPropagation(); handleRequestBattleStart(); }}
               disabled={battleInviteStatus === 'pending'}
               style={{
                  background: battleInviteStatus === 'pending' ? 'rgba(255,255,255,0.2)' : 'linear-gradient(135deg, #ef4444, #f97316)',
                  border: 'none', borderRadius: '20px', padding: '10px 20px', color: '#fff', fontWeight: 900, 
                  fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: battleInviteStatus ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 15px rgba(239,68,68,0.4)', pointerEvents: 'auto'
               }}>
               {battleInviteStatus === 'pending' ? '⏳ Aguardando Aceite...' : '⚔️ Iniciar Confronto'}
            </button>
          </div>
        )}

        {/* Modal de Convite Recebido (Sobre a câmera do host B) */}
        {battleInvite && role === 'host' && (
           <div style={{
             position: 'absolute', inset: 0, zIndex: 100000000, display: 'flex', alignItems: 'center', justifyContent: 'center',
             background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(5px)', pointerEvents: 'auto'
           }}>
             <div onClick={(e) => e.stopPropagation()} style={{
                background: 'rgba(15,15,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px',
                padding: '1.5rem', textAlign: 'center', maxWidth: '300px',
                animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', pointerEvents: 'auto'
             }}>
                <img src={battleInvite.profile?.avatar_url || 'https://ui-avatars.com/api/?name=Oponente'} style={{ width: 64, height: 64, borderRadius: '50%', marginBottom: '1rem', objectFit: 'cover' }} />
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.2rem', fontWeight: 800 }}>Oponente quer Iniciar Confronto!</h3>
                <p style={{ margin: '0.5rem 0 1.5rem', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Se você não quer o confronto, pode apenas recusar.</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                   <button onClick={(e) => { e.stopPropagation(); handleRejectBattle(); }} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', fontWeight: 700, pointerEvents: 'auto' }}>Recusar</button>
                   <button onClick={(e) => { e.stopPropagation(); handleAcceptBattle(); }} style={{ flex: 1, padding: '12px', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '12px', fontWeight: 800, pointerEvents: 'auto' }}>Aceitar</button>
                </div>
             </div>
           </div>
        )}

        {/* Toast Notificação de Rejeição Nativo */}
        {battleInviteStatus === 'rejected' && role === 'host' && (
           <div style={{
             position: 'absolute', top: '60px', left: '50%', transform: 'translateX(-50%)', zIndex: 100000000,
             background: 'rgba(239, 68, 68, 0.95)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '16px',
             padding: '12px 24px', color: '#fff', fontWeight: 800, fontSize: '0.95rem',
             display: 'flex', alignItems: 'center', gap: '8px', 
             boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
             animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
           }}>
             ❌ Convite Recusado pelo Oponente
           </div>
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
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Users size={11} color="var(--primary)" /> {sessionViewers}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f87171' }}>
                    <Heart size={11} fill="#f87171" color="#f87171" /> {totalLikes}
                  </span>
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

              {/* BOTÃO COMPARTILHAR */}
              <button
                onClick={(e) => { e.stopPropagation(); setIsShareOpen(true); }}
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: 'none', borderRadius: '50%',
                  width: '32px', height: '32px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', backdropFilter: 'blur(8px)', flexShrink: 0
                }}
              >
                <Share2 size={15} color="#fff" />
              </button>
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
                </div>
                
                {/* META DE PRESENTES */}
                {giftGoalTarget > 0 && (
                 <div className="goal-compact-container-sidebar">
                   <div className="goal-host-label-sidebar">{giftGoalTitle || 'Meta de Presentes'}</div>
                   <div className="goal-row-wrap-sidebar">
                     <div className="goal-icon-preview-sidebar">
                        {giftGoalId ? (
                             <img src={GIFT_CATALOG.find(g => g.id === giftGoalId)?.image} className="goal-gift-image" alt="gift" />
                        ) : <span>🎁</span>}
                     </div>
                     <div className="goal-progress-bar-sidebar">
                         <div 
                           className="goal-fill-sidebar"
                           style={{ 
                               width: `${Math.min(100, (giftGoalCurrent / giftGoalTarget) * 100)}%`,
                               background: 'linear-gradient(90deg, #facc15, #fb923c)'
                           }}
                         />
                         <span className="goal-count-text-sidebar">{giftGoalCurrent}/{giftGoalTarget}</span>
                     </div>
                   </div>
                 </div>
                )}

                {/* META DE SEGUIDORES */}
                {followerGoalTarget > 0 && (
                 <div className="goal-compact-container-sidebar">
                   <div className="goal-host-label-sidebar">{followerGoalTitle || 'Meta de Seguidores'}</div>
                   <div className="goal-row-wrap-sidebar">
                     <div className="goal-icon-preview-sidebar">
                        <span>👤</span>
                     </div>
                     <div className="goal-progress-bar-sidebar">
                         <div 
                           className="goal-fill-sidebar"
                           style={{ 
                               width: `${Math.min(100, (followerGoalCurrent / followerGoalTarget) * 100)}%`,
                               background: 'linear-gradient(90deg, #a855f7, #7c3aed)'
                           }}
                         />
                         <span className="goal-count-text-sidebar">{followerGoalCurrent}/{followerGoalTarget}</span>
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
                   {!activeBattle ? (
                     <button 
                       onClick={() => setIsBattleModalOpen(true)}
                       className="control-btn"
                       style={{ background: 'linear-gradient(to right, #dc2626, #ea580c)' }}
                       title="CONFRONTO"
                     >
                       <Swords size={20} color="#fff" />
                     </button>
                   ) : (
                     <button 
                       onClick={handleSurrenderBattle}
                       className="control-btn"
                       style={{ background: 'linear-gradient(to right, #991b1b, #7f1d1d)', display: 'flex', flexDirection: 'column', padding: '4px' }}
                       title="Desistir do Confronto"
                     >
                       <span style={{ fontSize: '14px', lineHeight: 1 }}>🏳️</span>
                     </button>
                   )}
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
          isBattle={!!activeBattle}
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
          <div style={{ width: '100%', maxWidth: '400px', background: '#111', borderRadius: '2rem', border: '1px solid var(--primary)', padding: '2rem', animation: 'fadeIn 0.3s', maxHeight: '90vh', overflowY: 'auto' }}>
             <h3 style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#fbbf24' }}>Configurar Metas 🎯</h3>
             
             {/* SEÇÃO PRESENTES */}
             <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem' }}>
                <h4 style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '1rem' }}>🎁 Meta de Presentes</h4>
                <div onClick={() => setIsGoalPickerOpen(true)} style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', cursor: 'pointer', border: '1px dashed rgba(251,191,36,0.3)' }}>
                   {giftGoalId ? (
                     <>
                       <div style={{ width: '32px', height: '32px' }}><img src={GIFT_CATALOG.find(g => g.id === giftGoalId)?.image} style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div>
                       <div style={{ color: '#fff' }}><div style={{ fontWeight: 800, fontSize: '0.8rem' }}>{GIFT_CATALOG.find(g => g.id === giftGoalId)?.name}</div></div>
                     </>
                   ) : <span style={{ opacity: 0.5, color: '#fff', fontSize: '0.8rem' }}>Escolher presente específico...</span>}
                </div>
                <input type="text" placeholder="Título da Meta" value={giftGoalTitle} onChange={e => setGiftGoalTitle(e.target.value)} style={{ width: '100%', background: '#222', border: '1px solid #333', padding: '0.8rem', borderRadius: '0.8rem', color: '#fff', marginBottom: '0.8rem' }} />
                <input type="number" placeholder="Objetivo" value={giftGoalTarget} onChange={e => setGiftGoalTarget(Number(e.target.value))} style={{ width: '100%', background: '#222', border: '1px solid #333', padding: '0.8rem', borderRadius: '0.8rem', color: '#fff' }} />
                <button onClick={() => updateGiftGoal(giftGoalTitle, Number(giftGoalTarget), giftGoalId)} style={{ width: '100%', marginTop: '0.8rem', padding: '0.8rem', background: '#fbbf24', color: '#000', borderRadius: '0.8rem', border: 'none', fontWeight: 900, fontSize: '0.8rem' }}>ATUALIZAR PRESENTES</button>
             </div>

             {/* SEÇÃO SEGUIDORES */}
             <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1rem' }}>
                <h4 style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '1rem' }}>👤 Meta de Seguidores</h4>
                <input type="text" placeholder="Título da Meta" value={followerGoalTitle} onChange={e => setFollowerGoalTitle(e.target.value)} style={{ width: '100%', background: '#222', border: '1px solid #333', padding: '0.8rem', borderRadius: '0.8rem', color: '#fff', marginBottom: '0.8rem' }} />
                <input type="number" placeholder="Objetivo" value={followerGoalTarget} onChange={e => setFollowerGoalTarget(Number(e.target.value))} style={{ width: '100%', background: '#222', border: '1px solid #333', padding: '0.8rem', borderRadius: '0.8rem', color: '#fff' }} />
                <button onClick={() => updateFollowerGoal(followerGoalTitle, Number(followerGoalTarget))} style={{ width: '100%', marginTop: '0.8rem', padding: '0.8rem', background: 'var(--primary)', color: '#000', borderRadius: '0.8rem', border: 'none', fontWeight: 900, fontSize: '0.8rem' }}>ATUALIZAR SEGUIDORES</button>
             </div>

             <button onClick={() => setIsGoalPanelOpen(false)} style={{ width: '100%', padding: '1rem', background: 'transparent', color: 'rgba(255,255,255,0.5)', border: 'none', fontSize: '0.8rem' }}>FECHAR PAINEL</button>
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
                  <div key={g.id} onClick={() => { setGiftGoalId(g.id); setIsGoalPickerOpen(false); }} style={{ background: giftGoalId === g.id ? 'var(--primary)' : 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}>
                     <img src={g.image} style={{ width: '100%', height: '40px', objectFit: 'contain', marginBottom: '5px' }} />
                     <div style={{ fontSize: '0.6rem', fontWeight: 800, color: giftGoalId === g.id ? '#000' : '#fff' }}>{g.name}</div>
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

      {/* MODAL DE CONFIRMAÇÃO DE DESISTÊNCIA — sem usar confirm() nativo */}
      {showSurrenderConfirm && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)'
          }}
          onClick={() => setShowSurrenderConfirm(false)}
        >
          <div
            className="confirm-modal-urban animate-fade-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="confirm-icon-wrapper" style={{ background: 'rgba(251,191,36,0.1)' }}>
              <span style={{ fontSize: '2rem' }}>🏳️</span>
            </div>
            <h3>DESISTIR DA BATALHA?</h3>
            <p>A vitória será concedida ao seu oponente. Tem certeza que quer jogar a toalha agora?</p>
            <div className="confirm-actions">
              <button
                className="confirm-btn cancel"
                onClick={() => setShowSurrenderConfirm(false)}
              >
                CONTINUAR
              </button>
              <button
                className="confirm-btn proceed"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                onClick={executeSurrender}
              >
                🏳 DESISTIR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE SHEET */}
      {isShareOpen && (
        <div
          onClick={() => setIsShareOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1200000,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480,
              background: 'linear-gradient(180deg, #111118 0%, #0a0a0f 100%)',
              borderRadius: '24px 24px 0 0',
              border: '1px solid rgba(255,255,255,0.08)',
              borderBottom: 'none',
              padding: '1.5rem 1.5rem 2.5rem',
              animation: 'slideUpSheet 0.3s cubic-bezier(0.16,1,0.3,1)'
            }}
          >
            {/* Handle */}
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto 1.5rem' }} />

            {/* Título */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <Share2 size={18} color="var(--primary)" />
              <span style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>Compartilhar Live</span>
            </div>

            {/* Preview da live */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '14px', marginBottom: '1.5rem' }}>
              <img
                src={room.host_profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${room.host_profile?.username}`}
                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }}
              />
              <div>
                <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>@{room.host_profile?.username || 'criador'}</div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>🔴 Ao vivo agora • {sessionViewers} assistindo</div>
              </div>
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

              {/* Copiar link */}
              <button
                onClick={() => {
                  const url = `${window.location.origin}/live/${room.id}`;
                  navigator.clipboard.writeText(url).then(() => {
                    alert('Link copiado! ✅');
                  }).catch(() => {
                    // fallback para dispositivos sem clipboard API
                    const el = document.createElement('textarea');
                    el.value = url;
                    document.body.appendChild(el);
                    el.select();
                    document.execCommand('copy');
                    document.body.removeChild(el);
                    alert('Link copiado! ✅');
                  });
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.85rem 1rem', borderRadius: '14px',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                  color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>🔗</span> Copiar Link
              </button>

              {/* WhatsApp */}
              <button
                onClick={() => {
                  const url = `${window.location.origin}/live/${room.id}`;
                  const msg = encodeURIComponent(`🔴 Entra na live do @${room.host_profile?.username || 'criador'} agora! ${url}`);
                  window.open(`https://wa.me/?text=${msg}`, '_blank');
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.85rem 1rem', borderRadius: '14px',
                  background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.25)',
                  color: '#25D366', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem'
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>💬</span> Compartilhar no WhatsApp
              </button>

              {/* Share nativo (iOS/Android) */}
              {navigator.share && (
                <button
                  onClick={async () => {
                    try {
                      await navigator.share({
                        title: `Live de @${room.host_profile?.username || 'criador'}`,
                        text: `🔴 Entra na live do @${room.host_profile?.username || 'criador'} agora!`,
                        url: `${window.location.origin}/live/${room.id}`
                      });
                    } catch (e) { /* usuário cancelou */ }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.85rem 1rem', borderRadius: '14px',
                    background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)',
                    color: 'var(--primary)', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem'
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>📤</span> Mais opções de compartilhar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .live-room-container {
          position: fixed !important; 
          inset: 0 !important; 
          z-index: 500000 !important;
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
