import { useState } from 'react';
import { Crown, Heart, Zap, Sparkles, TrendingUp } from 'lucide-react';
import { getGifterLevelDetails, GifterBadge } from './GifterBadge';
import { getCreatorLevel, CreatorBadge } from './CreatorBadge';

interface UserRankProgressProps {
  userProfile: any;
}

export function UserRankProgress({ userProfile }: UserRankProgressProps) {
  const [activeTab, setActiveTab] = useState<'apoiador' | 'criador'>('apoiador');

  const donated = userProfile.total_donated || 0;
  const received = userProfile.total_received || 0;

  const gifter = getGifterLevelDetails(donated);
  const creator = getCreatorLevel(received);

  const activeData = activeTab === 'apoiador' ? gifter : creator;
  const currentVal = activeTab === 'apoiador' ? donated : received;
  
  // Cálculo da porcentagem da barra
  const range = activeData.nextThreshold - activeData.currentThreshold;
  const progressInLevel = currentVal - activeData.currentThreshold;
  const percentage = Math.min(100, Math.max(0, (progressInLevel / range) * 100));
  const diffToNext = activeData.nextThreshold - currentVal;

  return (
    <div className="rank-progress-container animate-fade-up" style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '1.25rem', border: '1px solid var(--separator)' }}>
      {/* Menu de Abas */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem', background: 'rgba(0,0,0,0.4)', padding: '6px', borderRadius: '1rem' }}>
        <button 
          onClick={() => setActiveTab('apoiador')}
          style={{
            flex: 1, padding: '0.8rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer',
            background: activeTab === 'apoiador' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'apoiador' ? '#000' : 'rgba(255,255,255,0.4)',
            fontWeight: 900, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.3s'
          }}>
          <Heart size={16} fill={activeTab === 'apoiador' ? 'currentColor' : 'none'} /> APOIADOR
        </button>
        <button 
          onClick={() => setActiveTab('criador')}
          style={{
            flex: 1, padding: '0.8rem', borderRadius: '0.75rem', border: 'none', cursor: 'pointer',
            background: activeTab === 'criador' ? 'var(--secondary)' : 'transparent',
            color: activeTab === 'criador' ? '#000' : 'rgba(255,255,255,0.4)',
            fontWeight: 900, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.3s'
          }}>
          <Crown size={16} fill={activeTab === 'criador' ? 'currentColor' : 'none'} /> CRIADOR
        </button>
      </div>

      {/* Info Atual */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
          {activeTab === 'apoiador' ? (
            <GifterBadge donatedAmount={donated} />
          ) : (
            <CreatorBadge receivedAmount={received} />
          )}
        </div>
        <h3 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>Nível {activeData.level}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
           {activeTab === 'apoiador' ? 'Você já investiu' : 'Você já recebeu'} 
           <span style={{ color: activeTab === 'apoiador' ? 'var(--primary)' : 'var(--secondary)', fontWeight: 800, marginLeft: '4px' }}>
              🪙 {currentVal.toLocaleString('pt-BR')} Moral
           </span>
        </p>
      </div>

      {/* Barra de Progresso Realista */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.8rem', fontWeight: 700 }}>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Lvl {activeData.level}</span>
          <span style={{ color: activeTab === 'apoiador' ? 'var(--primary)' : 'var(--secondary)' }}>
            {activeData.level < 40 ? `Lvl ${activeData.level + 1}` : 'NÍVEL MÁXIMO 🏆'}
          </span>
        </div>

        <div style={{ height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden', position: 'relative', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ 
            height: '100%', 
            width: `${percentage}%`, 
            background: activeTab === 'apoiador' ? 'linear-gradient(90deg, #6366f1, #a855f7)' : 'linear-gradient(90deg, #f59e0b, #ef4444)',
            borderRadius: '6px',
            boxShadow: activeTab === 'apoiador' ? '0 0 15px rgba(168, 85, 247, 0.5)' : '0 0 15px rgba(245, 158, 11, 0.5)',
            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
          }} />
        </div>

        {activeData.level < 40 ? (
          <div style={{ marginTop: '1rem', textAlign: 'center', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.75rem', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem' }}>
              Faltam <strong style={{ color: '#fff' }}>🪙 {diffToNext.toLocaleString('pt-BR')}</strong> para o <strong style={{ color: activeTab === 'apoiador' ? 'var(--primary)' : 'var(--secondary)' }}>Nível {activeData.level + 1}</strong>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem', color: 'var(--primary)', opacity: 0.6 }}>
               <TrendingUp size={14} />
               <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Continue largando o aço! 🚀</span>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '1rem', textAlign: 'center', color: '#fbbf24', fontWeight: 800 }}>
             🏆 VOCÊ ATINGIU O TOPO DA CADEIA ALIMENTAR!
          </div>
        )}
      </div>

      {/* Dicas de como subir */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
           <Zap size={16} color="var(--primary)" style={{ marginBottom: '0.5rem' }} />
           <p style={{ margin: 0, fontSize: '0.75rem', color: '#fff', fontWeight: 700 }}>Apoie os Criadores</p>
           <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Mande presentes e suba seu Rank Apoiador.</span>
        </div>
        <div style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
           <Sparkles size={16} color="var(--secondary)" style={{ marginBottom: '0.5rem' }} />
           <p style={{ margin: 0, fontSize: '0.75rem', color: '#fff', fontWeight: 700 }}>Produza Conteúdo</p>
           <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Mande papo reto e suba seu Rank Criador.</span>
        </div>
      </div>
    </div>
  );
}
