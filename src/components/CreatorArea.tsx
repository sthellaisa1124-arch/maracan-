import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Heart, Play, Gift, Users, ArrowLeft,
  TrendingUp, Star, CheckCircle, Loader2, Clock,
  ArrowUpRight, ArrowDownRight, Zap, Eye, Award,
  BarChart2, Activity, Target, Calendar, ChevronRight, Video, UserPlus
} from 'lucide-react';

interface CreatorAreaProps {
  profile: any;
  session: any;
  followersCount: number;
  onBack: () => void;
}

// ─── Geração de dados simulados para os gráficos ────────────────
function genFollowerData(total: number, days: number) {
  const data = [];
  const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const base = Math.max(10, Math.floor(total * 0.7));
  for (let i = 0; i < days; i++) {
    const progress = i / (days - 1);
    const noise = (Math.random() - 0.4) * base * 0.15;
    const val = Math.round(base + (total - base) * progress + noise);
    const label = days <= 7 ? labels[i % 7] : days <= 30 ? `${i + 1}` : monthLabels[Math.floor(i / (days / 12))];
    data.push({ label, seguidores: Math.max(0, val) });
  }
  return data;
}

function genEngagementData(likes: number, days: number) {
  const data = [];
  const weekLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const count = Math.min(days, 14);
  for (let i = 0; i < count; i++) {
    const base = Math.floor(likes / count);
    const l = Math.max(0, base + Math.floor((Math.random() - 0.4) * base));
    const c = Math.max(0, Math.floor(l * 0.15 + Math.random() * 10));
    data.push({ label: weekLabels[i % 7], curtidas: l, comentarios: c });
  }
  return data;
}

function genDonutData(total: number) {
  const ganhos = Math.floor(total * 0.6);
  const gastos = Math.floor(total * 0.25);
  const reserva = Math.max(0, total - ganhos - gastos);
  return [
    { name: 'Ganhos', value: Math.max(1, ganhos), color: '#a78bfa' },
    { name: 'Gastos', value: Math.max(1, gastos), color: '#38bdf8' },
    { name: 'Reserva', value: Math.max(1, reserva), color: '#4ade80' },
  ];
}

// ─── Mini Sparkline SVG puro ────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 72, h = 28;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pad = 3;
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return [x, y];
  });
  const pStr = points.map(p => p.join(',')).join(' ');
  const path = `M ${points[0].join(' ')} ` + points.slice(1).map(p => `L ${p.join(' ')}`).join(' ');
  const lastX = points[points.length - 1][0];
  const firstX = points[0][0];
  const areaPath = `${path} L${lastX},${h} L${firstX},${h} Z`;
  const gradId = `sg-${color.replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <polyline points={pStr} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="3" fill={color} />
    </svg>
  );
}

function generateSparkData(total: number, points = 7) {
  if (total === 0) return Array(points).fill(0);
  const base = Math.max(1, Math.floor(total * 0.55));
  const data: number[] = [];
  for (let i = 0; i < points; i++) {
    const trend = Math.floor((total - base) * (i / (points - 1)));
    const noise = Math.floor((Math.random() - 0.3) * base * 0.3);
    data.push(Math.max(0, Math.round(base + trend + noise)));
  }
  data[points - 1] = total;
  return data;
}

// ─── Tooltip personalizado ──────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(12,12,20,0.97)',
      border: '1px solid rgba(167,139,250,0.3)',
      borderRadius: '12px',
      padding: '10px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
      fontSize: '0.82rem',
    }}>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '6px', fontWeight: 600 }}>{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ color: '#fff', fontWeight: 700 }}>{p.value?.toLocaleString('pt-BR')}</span>
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>{p.name}</span>
        </div>
      ))}
    </div>
  );
}

const LEVELS = [
  {
    level: 1, title: 'Criador Nível 1', color: '#a78bfa',
    gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)', emoji: '🥉',
    requisitos: [
      'Nível mínimo 10 no rank de Criadores',
      'Mínimo 500 seguidores',
      'Mínimo 5.000 visualizações nos últimos 15 dias',
      'Mínimo 2 vídeos por dia nos últimos 7 dias',
    ],
    beneficios: ['Selo de verificado exclusivo do Nível 1', 'Preferência no suporte'],
  },
  {
    level: 2, title: 'Criador Nível 2', color: '#38bdf8',
    gradient: 'linear-gradient(135deg, #0284c7, #38bdf8)', emoji: '🥈',
    requisitos: [
      'Nível mínimo 20 no rank de Criadores',
      'Mínimo 10.000 seguidores',
      'Mínimo 50.000 visualizações nos últimos 15 dias',
      'Mínimo 3 vídeos por dia nos últimos 7 dias',
    ],
    beneficios: [
      'Selo de verificado exclusivo do Nível 2',
      'Acesso ao grupo do Telegram com outros criadores',
      'Instrutor dedicado para dicas de vídeos virais',
      'Prioridade total no suporte',
      'Taxa de saque reduzida para 30%',
    ],
  },
  {
    level: 3, title: 'Criador Nível 3', color: '#fbbf24',
    gradient: 'linear-gradient(135deg, #d97706, #fbbf24)', emoji: '🥇',
    requisitos: [
      'Nível mínimo 35 no rank de Criadores',
      'Mínimo 100.000 seguidores',
      '1.000.000 de visualizações nos últimos 15 dias',
      'Mínimo 3 vídeos por dia nos últimos 30 dias',
    ],
    beneficios: [
      'Selo único e exclusivo do Nível 3',
      'Acesso ao grupo com os administradores',
      'Possível proposta de contrato',
      'Taxa de saque reduzida para 25%',
    ],
  },
];

const PERIOD_OPTIONS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
];

export function CreatorArea({ session, followersCount, onBack }: Omit<CreatorAreaProps, 'profile'>) {
  const [subView, setSubView] = useState<'dashboard' | 'verification' | 'live-history'>('dashboard');
  const [analytics, setAnalytics] = useState<any>(null);
  const [liveHistory, setLiveHistory] = useState<any[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [period, setPeriod] = useState(7);
  const [activeChart, setActiveChart] = useState<'line' | 'bar' | 'donut'>('line');
  const containerRef = useRef<HTMLDivElement>(null);

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchAnalytics();
      checkPendingRequest();
    }
  }, [session]);

  async function fetchAnalytics() {
    setLoadingAnalytics(true);
    try {
      const userId = session.user.id;
      const [likesRes, viewsRes, giftsRes] = await Promise.all([
        supabase.from('likes').select('id', { count: 'exact', head: true })
          .in('post_id', (await supabase.from('user_posts').select('id').eq('user_id', userId)).data?.map((p: any) => p.id) || []),
        supabase.from('avista_posts').select('views_count').eq('user_id', userId),
        supabase.from('gift_transactions').select('id', { count: 'exact', head: true }).eq('recipient_id', userId),
      ]);
      const totalViews = (viewsRes.data || []).reduce((acc: number, p: any) => acc + (p.views_count || 0), 0);
      setAnalytics({
        total_likes: likesRes.count || 0,
        total_video_views: totalViews,
        total_gifts_received: giftsRes.count || 0,
        followers_count: followersCount,
      });

      // Fetch Live History
      const { data: livesData } = await supabase.from('live_sessions')
         .select('*')
         .eq('host_id', userId)
         .gte('started_at', new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString())
         .order('started_at', { ascending: false });
      
      setLiveHistory(livesData || []);

    } catch (e) {
      console.error('Erro ao buscar analytics:', e);
    } finally {
      setLoadingAnalytics(false);
    }
  }

  async function checkPendingRequest() {
    const { data } = await supabase.from('creator_badge_requests')
      .select('id, status').eq('user_id', session.user.id).eq('status', 'pending').maybeSingle();
    setHasPendingRequest(!!data);
  }

  async function submitRequest() {
    if (hasPendingRequest) return notify('Você já tem uma solicitação em análise!', 'error');
    setSubmitting(true);
    try {
      const userId = session.user.id;
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count: videosLast7 } = await supabase.from('avista_posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId).eq('media_type', 'video').gte('created_at', sevenDaysAgo);
      const { error } = await supabase.from('creator_badge_requests').insert({
        user_id: userId, status: 'pending',
        followers_snapshot: followersCount,
        video_views_snapshot: analytics?.total_video_views || 0,
        videos_last_7days: videosLast7 || 0,
      });
      if (error) throw error;
      setHasPendingRequest(true);
      notify('Solicitação enviada! Aguarde a análise do CEO. 🎬');
    } catch (e: any) {
      notify('Erro ao enviar: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Dados dos gráficos ────────────────────────────────────────
  const followerData = analytics ? genFollowerData(analytics.followers_count, period) : [];
  const engagementData = analytics ? genEngagementData(analytics.total_likes, period) : [];
  const donutData = analytics ? genDonutData(analytics.total_gifts_received || 20) : [];

  // ─── Cards métricas ────────────────────────────────────────────
  const metrics = analytics ? [
    {
      id: 'followers', icon: <Users size={22} />, label: 'Seguidores Ativos',
      value: analytics.followers_count, color: '#a78bfa', glow: 'rgba(168, 85, 247, 0.12)',
      delta: `+${Math.max(1, Math.floor(analytics.followers_count * 0.045))}`, positive: true,
      timeframe: 'Últimos 7 dias', isPrimary: true
    },
    {
      id: 'likes', icon: <Heart size={18} />, label: 'Curtidas',
      value: analytics.total_likes, color: '#f43f5e', glow: 'rgba(244, 63, 94, 0.12)',
      delta: `+${Math.max(1, Math.floor(analytics.total_likes * 0.05))}`, positive: true,
    },
    {
      id: 'views', icon: <Eye size={18} />, label: 'Visualizações',
      value: analytics.total_video_views, color: '#38bdf8', glow: 'rgba(56, 189, 248, 0.12)',
      delta: `+${Math.max(1, Math.floor(analytics.total_video_views * 0.08))}`, positive: true,
    },
    {
      id: 'gifts', icon: <Gift size={18} />, label: 'Moral Recebida',
      value: analytics.total_gifts_received, color: '#fbbf24', glow: 'rgba(251, 191, 36, 0.12)',
      delta: `+${Math.max(0, Math.floor(analytics.total_gifts_received * 0.12))}`,
      positive: analytics.total_gifts_received > 0,
    },
  ] : [];

  // ─── Toast ─────────────────────────────────────────────────────
  const ToastEl = toast && (
    <div style={{
      position: 'fixed', top: '1.2rem', left: '50%', transform: 'translateX(-50%)',
      background: toast.type === 'success'
        ? 'linear-gradient(135deg, #166534, #22c55e)'
        : 'linear-gradient(135deg, #7f1d1d, #ef4444)',
      color: '#fff', padding: '0.75rem 1.75rem', borderRadius: '3rem',
      fontWeight: 700, zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
      backdropFilter: 'blur(12px)', whiteSpace: 'nowrap',
      animation: 'fadeSlideDown 0.3s ease',
    }}>
      {toast.type === 'success' ? <CheckCircle size={16} /> : <Zap size={16} />}
      {toast.msg}
    </div>
  );

  // ─────────────── TELA DE VERIFICAÇÃO ───────────────────────────
  if (subView === 'verification') {
    return (
      <div ref={containerRef} style={{ padding: '1.5rem', overflowY: 'auto', paddingBottom: '4rem', background: 'radial-gradient(circle at top right, rgba(168, 85, 247, 0.08) 0%, #050508 60%)', height: '100%' }}>
        {ToastEl}

        {/* Header verificação */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button onClick={() => setSubView('dashboard')} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '0.75rem', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', padding: '0.5rem',
            transition: 'background 0.2s',
          }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.1 }}>Verificação de Criador</h2>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', margin: 0, marginTop: '3px' }}>Escolha o nível que você deseja solicitar</p>
          </div>
        </div>

        {LEVELS.map((lvl) => (
          <div key={lvl.level} style={{
            background: `linear-gradient(135deg, ${lvl.color}10, rgba(10,10,20,0.95))`,
            border: `1px solid ${lvl.color}33`,
            borderRadius: '1.25rem', padding: '1.5rem',
            marginBottom: '1rem', position: 'relative', overflow: 'hidden',
            boxShadow: `0 4px 24px ${lvl.color}15`,
          }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: lvl.gradient, borderRadius: '4px 0 0 4px' }} />
            <div style={{ position: 'absolute', top: '-24px', right: '-16px', fontSize: '5.5rem', opacity: 0.06 }}>{lvl.emoji}</div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '2rem' }}>{lvl.emoji}</div>
              <div>
                <h3 style={{ color: lvl.color, fontWeight: 800, fontSize: '1rem', margin: 0 }}>{lvl.title}</h3>
                <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>Programa de Criadores VELLAR</span>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.7rem' }}>
                <div style={{ width: '3px', height: '12px', background: '#ef4444', borderRadius: '2px' }} />
                <span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Requisitos</span>
              </div>
              {lvl.requisitos.map((req, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.45rem', alignItems: 'flex-start' }}>
                  <span style={{ color: '#ef4444', fontSize: '0.65rem', marginTop: '4px', flexShrink: 0 }}>●</span>
                  <span style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.83rem', lineHeight: 1.5 }}>{req}</span>
                </div>
              ))}
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.7rem' }}>
                <div style={{ width: '3px', height: '12px', background: '#4ade80', borderRadius: '2px' }} />
                <span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Benefícios</span>
              </div>
              {lvl.beneficios.map((ben, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem', alignItems: 'flex-start' }}>
                  <CheckCircle size={13} color="#4ade80" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.83rem', lineHeight: 1.4 }}>{ben}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={{ marginTop: '1.5rem' }}>
          {hasPendingRequest ? (
            <div style={{
              background: 'rgba(250,204,21,0.07)', border: '1px solid rgba(250,204,21,0.2)',
              borderRadius: '1.1rem', padding: '1.5rem', textAlign: 'center',
            }}>
              <Clock size={24} color="#fbbf24" style={{ marginBottom: '0.75rem' }} />
              <p style={{ color: '#fbbf24', fontWeight: 800, margin: 0, fontSize: '0.95rem' }}>Solicitação em análise</p>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', marginTop: '0.4rem', lineHeight: 1.5 }}>
                O CEO está avaliando seu perfil. Em breve você receberá uma notificação!
              </p>
            </div>
          ) : (
            <button onClick={submitRequest} disabled={submitting} style={{
              width: '100%', padding: '1.1rem',
              background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
              border: 'none', borderRadius: '1rem', color: '#fff',
              fontWeight: 800, fontSize: '1rem', cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
              opacity: submitting ? 0.7 : 1,
              boxShadow: '0 6px 30px rgba(124,58,237,0.45)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}>
              {submitting ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Star size={20} />}
              {submitting ? 'Enviando...' : 'Solicitar Selo de Criador'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─────────────── TELA DE HISTORICO DE LIVES ───────────────────────────
  if (subView === 'live-history') {
    return (
      <div ref={containerRef} style={{ padding: '1.5rem', overflowY: 'auto', paddingBottom: '4rem', background: 'radial-gradient(circle at top right, rgba(168, 85, 247, 0.08) 0%, #050508 60%)', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button onClick={() => setSubView('dashboard')} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '0.75rem', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', padding: '0.5rem',
            transition: 'background 0.2s',
          }}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.1 }}>Histórico de Lives</h2>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', margin: 0, marginTop: '3px' }}>Últimas transmissões (15 dias)</p>
          </div>
        </div>

        {liveHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '6rem 1.5rem', color: 'rgba(255,255,255,0.15)' }}>
              <div style={{ 
                width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', marginBottom: '1.5rem',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <Video size={36} opacity={0.4} />
              </div>
              <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 900, marginBottom: '0.5rem' }}>Silêncio no Palco...</h3>
              <p style={{ fontSize: '0.82rem', opacity: 0.6, maxWidth: '240px', margin: '0 auto', lineHeight: 1.6 }}>Nenhuma live encontrada nos últimos 15 dias. Que tal brilhar hoje?</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
             {liveHistory.map((l, idx) => {
                // Lógica de Performance e Evolução
                const prevLive = liveHistory[idx + 1];
                const perfScore = (l.max_viewers || 0) * 5 + (l.total_gifts || 0) + (l.total_likes || 0) * 0.1;
                const isHigh = perfScore > 150;
                const isMedium = perfScore > 40;

                // Comparação com a anterior
                const viewsDiff = prevLive ? (l.max_viewers || 0) - (prevLive.max_viewers || 0) : 0;
                const giftsDiff = prevLive ? (l.total_gifts || 0) - (prevLive.total_gifts || 0) : 0;
                const growth = viewsDiff > 0 || giftsDiff > 0;

                return (
                  <div 
                    key={l.id} 
                    style={{ 
                      background: 'rgba(20, 20, 28, 0.7)', 
                      borderRadius: '1.6rem', 
                      padding: '1.5rem', 
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(30px)',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.5), inset 0 0 30px rgba(168, 85, 247, 0.04)',
                      transition: 'transform 0.2s',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Badge de Performance */}
                    <div style={{
                      position: 'absolute', top: '1.2rem', right: '1.2rem',
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '4px 10px', borderRadius: '2rem',
                      background: isHigh ? 'rgba(239, 68, 68, 0.1)' : isMedium ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${isHigh ? 'rgba(239, 68, 68, 0.2)' : isMedium ? 'rgba(168, 85, 247, 0.2)' : 'rgba(255, 255, 255, 0.1)'}`,
                    }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 900, color: isHigh ? '#ef4444' : isMedium ? '#a78bfa' : 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {isHigh ? '🔥 ALTA PERFORMANCE' : isMedium ? '✨ PERFORMANCE MÉDIA' : '📈 PERFORMANCE PADRÃO'}
                      </span>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                          {new Date(l.started_at).toLocaleDateString()} · {new Date(l.started_at).toLocaleTimeString([], { hour: '2d-digit', minute: '2d-digit' })}
                        </span>
                        <h3 style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 900, margin: 0, letterSpacing: '-0.4px' }}>
                          {l.title || 'Live de Cria'} {l.is_18plus && <span style={{color: '#ef4444', fontSize: '0.8rem', verticalAlign: 'middle', marginLeft: '4px'}}>+18</span>}
                        </h3>
                      </div>
                    </div>

                    {/* Métricas Horizontais Massivas */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.03)' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}><Users size={14}/></div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fff' }}>{l.max_viewers || 0}</div>
                        <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.2)', fontWeight: 800 }}>VISITAS</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}><Gift size={14}/></div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#fbbf24' }}>{l.total_gifts || 0}</div>
                        <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.2)', fontWeight: 800 }}>MORAL</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}><Heart size={14}/></div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#ef4444' }}>{l.total_likes || 0}</div>
                        <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.2)', fontWeight: 800 }}>LIKES</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}><UserPlus size={14}/></div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#10b981' }}>{l.total_followers || 0}</div>
                        <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.2)', fontWeight: 800 }}>FÃS</div>
                      </div>
                    </div>

                    {/* Rodapé de Evolução */}
                    {prevLive && (
                      <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 4px' }}>
                        <div style={{ 
                          display: 'flex', alignItems: 'center', gap: '4px',
                          background: growth ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)',
                          padding: '3px 8px', borderRadius: '1rem',
                          border: `1px solid ${growth ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.1)'}`
                        }}>
                          {growth ? <ArrowUpRight size={10} color="#4ade80" strokeWidth={3} /> : <ArrowDownRight size={10} color="rgba(255,255,255,0.3)" />}
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: growth ? '#4ade80' : 'rgba(255,255,255,0.3)' }}>
                            {growth ? 'EVOLUÇÃO POSITIVA' : 'DESEMPENHO ESTÁVEL'}
                          </span>
                        </div>
                        {viewsDiff !== 0 && (
                          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', fontWeight: 700 }}>
                            {viewsDiff > 0 ? `+${viewsDiff}` : viewsDiff} visitas vs anterior
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
             })}
          </div>
        )}
     </div>
    );
  }

  // ─────────────── DASHBOARD PRINCIPAL ───────────────────────────
  return (
    <div ref={containerRef} style={{ overflowY: 'auto', paddingBottom: '4rem', background: 'radial-gradient(circle at top right, rgba(168, 85, 247, 0.05) 0%, transparent 60%)' }}>
      {ToastEl}

      {/* ── HERO HEADER ─────────────────────────────────────── */}
      <div style={{
        padding: '1.25rem 1.5rem 1rem',
        background: 'linear-gradient(180deg, rgba(124,58,237,0.12) 0%, transparent 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <button onClick={onBack} style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '0.75rem', color: '#fff', cursor: 'pointer',
            display: 'flex', alignItems: 'center', padding: '0.5rem',
          }}>
            <ArrowLeft size={20} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff', margin: 0 }}>Área do Criador</h2>
              <div style={{
                background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                borderRadius: '0.4rem', padding: '1px 7px',
                fontSize: '0.6rem', fontWeight: 800, color: '#fff', letterSpacing: '1px',
              }}>PRO</div>
            </div>
            <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', margin: 0, marginTop: '2px' }}>
              Dashboard de crescimento · Atualizado agora
            </p>
          </div>

          {/* Filtros de período */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '0.65rem', padding: '3px', gap: '2px' }}>
            {PERIOD_OPTIONS.map(opt => (
              <button key={opt.label} onClick={() => setPeriod(opt.days)} style={{
                background: period === opt.days ? 'rgba(124,58,237,0.8)' : 'transparent',
                border: 'none', borderRadius: '0.45rem', color: period === opt.days ? '#fff' : 'rgba(255,255,255,0.4)',
                fontSize: '0.68rem', fontWeight: 700, padding: '4px 8px', cursor: 'pointer',
                transition: 'all 0.2s',
              }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loadingAnalytics ? (
        <div style={{ textAlign: 'center', padding: '5rem 0', color: 'rgba(255,255,255,0.3)' }}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '1rem', fontSize: '0.85rem', fontWeight: 500 }}>Carregando suas métricas...</p>
        </div>
      ) : (
        <div style={{ padding: '0 1.25rem' }}>

          {/* ── CARDS DE MÉTRICAS (Refatorado Premium) ─────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem', marginBottom: '2rem' }}>
            {metrics.map((m: any) => {
              const sparkData = generateSparkData(m.value);
              const isPrimary = m.isPrimary;
              
              return (
                <div key={m.id} style={{
                  gridColumn: isPrimary ? 'span 2' : 'span 1',
                  background: 'rgba(15, 15, 20, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '1.5rem',
                  padding: isPrimary ? '1.5rem' : '1.25rem',
                  position: 'relative',
                  overflow: 'hidden',
                  backdropFilter: 'blur(20px)',
                  boxShadow: `0 8px 32px rgba(0,0,0,0.4), inset 0 0 40px ${m.glow}`,
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'default',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: isPrimary ? '180px' : 'auto'
                }}
                >
                  {/* Aura Glow Sutil */}
                  <div style={{
                    position: 'absolute', top: '-10%', right: '-10%',
                    width: '40%', height: '40%', borderRadius: '50%',
                    background: m.color, opacity: 0.03, filter: 'blur(30px)',
                  }} />

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: isPrimary ? '42px' : '36px', height: isPrimary ? '42px' : '36px', borderRadius: '12px',
                        background: `${m.color}15`, border: `1px solid ${m.color}30`, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', color: m.color,
                      }}>
                        {m.icon}
                      </div>
                      {isPrimary && (
                        <div>
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Métrica Principal
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      background: m.positive ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)',
                      borderRadius: '2rem', padding: '4px 10px',
                      border: `1px solid ${m.positive ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)'}`
                    }}>
                      {m.positive
                        ? <ArrowUpRight size={12} color="#4ade80" strokeWidth={3} />
                        : <ArrowDownRight size={12} color="#ef4444" strokeWidth={3} />}
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: m.positive ? '#4ade80' : '#ef4444' }}>
                        {m.delta}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div style={{ 
                      color: 'rgba(255,255,255,0.4)', 
                      fontSize: '0.7rem', 
                      fontWeight: 800, 
                      textTransform: 'uppercase', 
                      letterSpacing: '1.5px', 
                      marginBottom: '4px' 
                    }}>
                      {m.label}
                    </div>
                    <div style={{ 
                      fontSize: isPrimary ? '3.2rem' : '1.8rem', 
                      fontWeight: 900, 
                      color: '#fff', 
                      lineHeight: 1, 
                      fontVariantNumeric: 'tabular-nums', 
                      letterSpacing: '-1.5px',
                      marginBottom: isPrimary ? '1rem' : '0.5rem'
                    }}>
                      {m.value.toLocaleString('pt-BR')}
                    </div>
                  </div>

                  {/* Sparkline no fundo ou rodapé */}
                  <div style={{ 
                    marginTop: isPrimary ? '0.5rem' : '0.2rem',
                    width: '100%',
                    opacity: 0.8
                  }}>
                    <Sparkline data={sparkData} color={m.color} />
                    {isPrimary && (
                      <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', marginTop: '8px', fontWeight: 700 }}>
                        {m.timeframe} • Análise em tempo real
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── SELETOR DE GRÁFICO (Pill Style) ────────────────────────── */}
          <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            {[
              { id: 'line', icon: <Activity size={14} />, label: 'Seguidores' },
              { id: 'bar', icon: <BarChart2 size={14} />, label: 'Engajamento' },
              { id: 'donut', icon: <Target size={14} />, label: 'Distribuição' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveChart(tab.id as any)} style={{
                flex: 1,
                background: activeChart === tab.id
                  ? 'rgba(168, 85, 247, 0.15)'
                  : 'transparent',
                border: 'none',
                borderRadius: '0.85rem', 
                color: activeChart === tab.id ? '#a78bfa' : 'rgba(255,255,255,0.3)',
                fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer',
                padding: '0.6rem 0.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── PAINEL GRÁFICO PRINCIPAL ─────────────────── */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '1.25rem', padding: '1.25rem',
            marginBottom: '1.25rem',
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          }}>
            {activeChart === 'line' && (
              <>
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: '4px', height: '16px', background: '#a78bfa', borderRadius: '4px' }} />
                    <span style={{ color: '#fff', fontWeight: 900, fontSize: '1rem', letterSpacing: '-0.2px' }}>Crescimento de Seguidores</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={followerData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <defs>
                      <linearGradient id="gradFollowers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.02)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="seguidores" name="Seguidores" 
                      stroke="#a78bfa" strokeWidth={3}
                      fill="url(#gradFollowers)" 
                      dot={false} 
                      activeDot={{ r: 6, fill: '#a78bfa', stroke: '#fff', strokeWidth: 2, filter: 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.6))' }} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.2)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Desempenho Geral Estável
                    </span>
                </div>
              </>
            )}

            {activeChart === 'bar' && (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BarChart2 size={16} color="#38bdf8" />
                    <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.9rem' }}>Engajamento por Dia</span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', margin: '2px 0 0 22px' }}>
                    Curtidas e Comentários
                  </p>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={engagementData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="curtidas" name="Curtidas" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={14} />
                    <Bar dataKey="comentarios" name="Comentários" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={14} />
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.5rem' }}>
                  {[{ color: '#f43f5e', label: 'Curtidas' }, { color: '#38bdf8', label: 'Comentários' }].map(l => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: l.color }} />
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem' }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeChart === 'donut' && (
              <>
                <div style={{ marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Target size={16} color="#fbbf24" />
                    <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.9rem' }}>Distribuição de Renda</span>
                  </div>
                  <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', margin: '2px 0 0 22px' }}>
                    Baseado nos presentes recebidos
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <ResponsiveContainer width="50%" height={160}>
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                        dataKey="value" strokeWidth={0} paddingAngle={3}>
                        {donutData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {donutData.map(d => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: d.color, flexShrink: 0 }} />
                        <div>
                          <div style={{ color: '#fff', fontSize: '0.78rem', fontWeight: 700 }}>{d.name}</div>
                          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem' }}>{d.value} presentes</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── CARD PROGRESSO PARA NÍVEL 1 (Refatorado Premium) ─────────────── */}
          <div style={{
            background: 'rgba(15, 15, 20, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '1.5rem', padding: '1.5rem',
            marginBottom: '2rem',
            backdropFilter: 'blur(20px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Award size={18} color="#a78bfa" />
                </div>
                <span style={{ color: '#fff', fontWeight: 900, fontSize: '1rem' }}>Progresso para o Nível 1</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: '#a78bfa', fontSize: '1.1rem', fontWeight: 900 }}>
                    {Math.min(100, Math.floor(((analytics?.followers_count || 0) / 500) * 100))}%
                </span>
                <p style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', fontWeight: 800, textTransform: 'uppercase' }}>Concluído</p>
              </div>
            </div>

            {[
              { label: 'Seguidores', current: analytics?.followers_count || 0, goal: 500, color: '#a78bfa', icon: <Users size={12} /> },
              { label: 'Visualizações', current: analytics?.total_video_views || 0, goal: 5000, color: '#38bdf8', icon: <Eye size={12} /> },
              { label: 'Curtidas', current: analytics?.total_likes || 0, goal: 200, color: '#f43f5e', icon: <Heart size={12} /> },
            ].map(bar => {
              const pct = Math.min(100, Math.floor((bar.current / bar.goal) * 100));
              const done = pct >= 100;
              return (
                <div key={bar.label} style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: done ? '#4ade80' : 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 700 }}>{bar.label}</span>
                      {done && <CheckCircle size={12} color="#4ade80" strokeWidth={3} />}
                    </div>
                    <span style={{ color: done ? '#4ade80' : '#fff', fontSize: '0.75rem', fontWeight: 800 }}>
                      {bar.current.toLocaleString('pt-BR')} <span style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>/ {bar.goal.toLocaleString('pt-BR')}</span>
                    </span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '2rem', height: '4px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`, height: '100%', borderRadius: '2rem',
                      background: done ? 'linear-gradient(90deg, #4ade80, #22c55e)' : bar.color,
                      transition: 'width 1.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      boxShadow: done ? '0 0 10px rgba(74,222,128,0.4)' : `0 0 10px ${bar.color}40`,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── CARD MOTIVAÇÃO (Clean Style) ───────────────────── */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '1.25rem', padding: '1.25rem',
            marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center',
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'rgba(168, 85, 247, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <Zap size={20} color="#a78bfa" fill="#a78bfa" />
            </div>
            <div>
              <p style={{ color: '#fff', fontWeight: 900, fontSize: '0.9rem', margin: 0, marginBottom: '2px' }}>
                Perfil em Evolução 🚀
              </p>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', lineHeight: 1.5, margin: 0, fontWeight: 600 }}>
                Continue postando e engajando para se tornar um Criador Oficial.
              </p>
            </div>
          </div>

          {/* ── BOTÕES DE AÇÃO ────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', paddingBottom: '2rem' }}>
            <button onClick={() => setSubView('verification')} style={{
              width: '100%', padding: '1.2rem',
              background: hasPendingRequest
                ? 'rgba(250,204,21,0.08)'
                : 'linear-gradient(135deg, #7c3aed, #3b82f6)',
              border: hasPendingRequest ? '1px solid rgba(250,204,21,0.2)' : 'none',
              borderRadius: '1.25rem',
              color: hasPendingRequest ? '#fbbf24' : '#fff',
              fontWeight: 900, fontSize: '0.95rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.7rem',
              boxShadow: hasPendingRequest ? 'none' : '0 10px 40px rgba(124,58,237,0.3)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
              onMouseEnter={e => { if (!hasPendingRequest) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
            >
              {hasPendingRequest
                ? <><Clock size={20} /> Solicitação em análise</>
                : <><Calendar size={20} /> Requisitos para Selo <ChevronRight size={18} /></>
              }
            </button>
            
            <button onClick={() => setSubView('live-history')} style={{
              width: '100%', padding: '1.2rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '1.25rem',
              color: '#fff',
              fontWeight: 800, fontSize: '0.92rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.7rem',
              transition: 'all 0.2s',
            }}>
              <Video size={18} color="rgba(255,255,255,0.4)" /> Histórico de Lives <ChevronRight size={16} color="rgba(255,255,255,0.2)" />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translate(-50%, -10px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
