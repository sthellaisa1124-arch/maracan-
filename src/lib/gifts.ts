import { Zap, Crown, Sparkles } from 'lucide-react';

export interface Gift {
  id: string;
  name: string;
  price: number;
  tier: 'basic' | 'mid' | 'premium' | 'ultra';
  icon: string;       // CSS class prefix (ex: "gift-icon-heart")
  symbol: string;     // caractere / símbolo
  color: string;
  glow: string;
  animationVideo?: string;
  /** Imagem estática realista do presente */
  image?: string;
}

export const GIFT_CATALOG: Gift[] = [
  // ── BÁSICO ──────────────────────────────────────────────
  { id: 'tomato',       name: 'Papo Torto',        price: 1,      tier: 'basic',   icon: 'gi-tomato',   symbol: '🍅', color: '#ff4d4d', glow: 'rgba(255,77,77,0.7)' },
  { id: 'balloon',      name: 'Balão da Pista',    price: 2,      tier: 'basic',   icon: 'gi-balloon',  symbol: '🎈', color: '#38bdf8', glow: 'rgba(56,189,248,0.7)' },
  { id: 'neon_heart',   name: 'Coração Neon',      price: 3,      tier: 'basic',   icon: 'gi-heart',    symbol: '♥', color: '#ff4d8d', glow: 'rgba(255,77,141,0.7)' },
  { id: 'rose',         name: 'Rosa Simples',       price: 4,      tier: 'basic',   icon: 'gi-rose',     symbol: '✿', color: '#ff6b6b', glow: 'rgba(255,107,107,0.7)' },
  { id: 'cap',          name: 'Boné de Cria',      price: 5,      tier: 'basic',   icon: 'gi-cap',      symbol: '🧢', color: '#94a3b8', glow: 'rgba(148,163,184,0.7)' },
  { id: 'sparkle_like', name: 'Curtida Brilhante',  price: 6,      tier: 'basic',   icon: 'gi-sparkle',  symbol: '✦', color: '#60a5fa', glow: 'rgba(96,165,250,0.7)' },
  { id: 'sneaker',      name: 'Tênis de Elite',    price: 7,      tier: 'basic',   icon: 'gi-sneaker',  symbol: '👟', color: '#cbd5e1', glow: 'rgba(203,213,225,0.7)' },
  { id: 'fire_basic',   name: 'Fogo na Pista',     price: 9,      tier: 'basic',   icon: 'gi-fire',     symbol: '🔥', color: '#f97316', glow: 'rgba(249,115,22,0.7)' },

  // ── PREMIUM ──────────────────────────────────────────────
  { id: 'park',         name: 'Parque Mágico',      price: 500,    tier: 'premium', icon: 'park',        symbol: '🎡', color: '#38bdf8', glow: 'rgba(56,189,248,0.9)',  animationVideo: '/animations/park_animation.mp4', image: '/gifts/park.png' },
  { id: 'royal_throne', name: 'Trono Real',         price: 1000,   tier: 'premium', icon: 'gi-throne',   symbol: '⬖', color: '#e879f9', glow: 'rgba(232,121,249,0.9)', animationVideo: '/animations/royal_throne.mp4', image: '/gifts/royal_throne.png' },
  { id: 'eagle',        name: 'Águia Real',         price: 3000,   tier: 'premium', icon: 'eagle',       symbol: '🦅', color: '#fbbf24', glow: 'rgba(251,191,36,0.9)',  animationVideo: '/animations/eagle_animation.mp4', image: '/gifts/eagle.png' },
  { id: 'wild_gorilla', name: 'Gorila Selvagem',    price: 5000,   tier: 'premium', icon: 'gi-gorilla', symbol: '🦍', color: '#64748b', glow: 'rgba(100,116,139,1.0)', animationVideo: '/animations/wild_gorilla.mp4', image: '/gifts/wild_gorilla.png' },
  { id: 'fire_phoenix', name: 'Fênix de Fogo',      price: 5000,   tier: 'premium', icon: 'gi-phoenix',  symbol: '⟁', color: '#fb923c', glow: 'rgba(251,146,60,1.0)',  animationVideo: '/animations/fire_phoenix.mp4', image: '/gifts/fire_phoenix.png'  },
  { id: 'diamond_lion', name: 'Leão de Fogo',       price: 10000,  tier: 'premium', icon: 'gi-lion',     symbol: '◉', color: '#fb923c', glow: 'rgba(251,146,60,1.0)',  animationVideo: '/animations/diamond_lion.mp4', image: '/gifts/diamond_lion.png'  },

  // ── ULTRA RARO ───────────────────────────────────────────
  { id: 'gold_meteor',  name: 'Meteoro Dourado',    price: 15000,  tier: 'ultra',   icon: 'gi-meteor',   symbol: '☄', color: '#fbbf24', glow: 'rgba(251,191,36,1.0)',  animationVideo: '/animations/gold_meteor.mp4', image: '/gifts/gold_meteor.png'  },
  { id: 'imp_dragon',   name: 'Dragão Imperial',    price: 20000,  tier: 'ultra',   icon: 'gi-dragon',   symbol: '☯', color: '#f43f5e', glow: 'rgba(244,63,94,1.0)',   animationVideo: '/animations/imp_dragon.mp4', image: '/gifts/imp_dragon.png'   },
  { id: 'gold_storm',   name: 'Tempestade de Ouro', price: 50000,  tier: 'ultra',   icon: 'gi-storm',    symbol: '⚡', color: '#fde047', glow: 'rgba(253,224,71,1.0)',  animationVideo: '/animations/gold_storm.mp4', image: '/gifts/gold_storm.png'   },
  { id: 'supreme_king', name: 'Coroa Suprema Rei',  price: 100000, tier: 'ultra',   icon: 'gi-supreme',  symbol: '✶', color: '#ff9500', glow: 'rgba(255,149,0,1.0)',   animationVideo: '/animations/supreme_king.mp4', image: '/gifts/supreme_king.png' },
];

export const TIER_CONFIG: Record<string, { label: string, Icon: any, color: string, bg: string }> = {
  all:     { label: 'Todos',           Icon: Zap,      color: '#ffffff', bg: 'rgba(255,255,255,0.08)' },
  basic:   { label: 'Básico',          Icon: Zap,      color: '#60a5fa', bg: 'rgba(96,165,250,0.08)' },
  premium: { label: 'Premium',         Icon: Sparkles, color: '#e879f9', bg: 'rgba(232,121,249,0.08)' },
  ultra:   { label: 'Ultra Raro 🔥',   Icon: Crown,    color: '#ff9500', bg: 'rgba(255,149,0,0.08)' },
};
