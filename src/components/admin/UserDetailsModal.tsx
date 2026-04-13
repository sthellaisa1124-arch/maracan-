import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Shield, Wallet, Crown, Star, Check, AlertTriangle, Sparkles, Loader2, MinusCircle, PlusCircle } from 'lucide-react';
import { UserBadges } from '../Badges';
// BadgeType used inline only

interface UserProfile {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  created_at: string;
  avatar_url?: string;
  account_role?: string;
  badges?: string[];
  moral_balance?: number;
}

interface Props {
  user: UserProfile;
  adminRole: string; // 'admin' ou 'ceo'
  onClose: () => void;
  onRefresh: () => void;
}

export function UserDetailsModal({ user, adminRole, onClose, onRefresh }: Props) {
  const [loading, setLoading] = useState(false);
  const [coinAmount, setCoinAmount] = useState<number | ''>('');
  const [coinReason, setCoinReason] = useState('');
  const [selectedRole, setSelectedRole] = useState(user.account_role || 'user');
  const [activeBadges, setActiveBadges] = useState<string[]>(user.badges || []);

  const toggleBadge = (badge: string) => {
    if (activeBadges.includes(badge)) {
      setActiveBadges(activeBadges.filter(b => b !== badge));
    } else {
      setActiveBadges([...activeBadges, badge]);
    }
  };

  const handleSaveRoleAndBadges = async () => {
    if (!confirm('Deseja aplicar as alterações de cargo e selos para este usuário?')) return;
    
    setLoading(true);
    try {
      const payload: any = {
        p_target_id: user.id,
        p_new_badges: activeBadges,
        p_reason: 'Atualização de Cargo/Selos via Painel'
      };

      if (adminRole === 'ceo' && selectedRole !== user.account_role) {
        payload.p_new_role = selectedRole;
      }

      const { data, error } = await supabase.rpc('admin_manage_user', payload);

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      alert('Perfil atualizado com sucesso!');
      onRefresh();
    } catch (err: any) {
      alert('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustCoins = async (isAdding: boolean) => {
    const amount = Number(coinAmount);
    if (!amount || amount <= 0) {
      alert('Insira um valor válido de moedas.');
      return;
    }
    
    const adjustment = isAdding ? amount : -amount;
    
    if (!isAdding && (user.moral_balance || 0) < amount) {
      if (!confirm(`O usuário tem apenas ${user.moral_balance} moedas. Isso vai zerar o saldo dele. Continuar?`)) return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_manage_user', {
        p_target_id: user.id,
        p_coin_adjustment: adjustment,
        p_reason: coinReason || (isAdding ? 'Bônus Administrativo' : 'Remoção Administrativa')
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      alert(`Moedas ${isAdding ? 'adicionadas' : 'removidas'} com sucesso!`);
      setCoinAmount('');
      setCoinReason('');
      onRefresh();
    } catch (err: any) {
      alert('Erro ao ajustar moedas: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div style={{ width: '100%', maxWidth: '400px', height: '100%', backgroundColor: '#121214', borderLeft: '1px solid #2a2a2a', boxShadow: '-10px 0 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflowY: 'auto', animation: 'slideInRight 0.3s ease-out' }}>
        
        {/* Header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', backgroundColor: 'rgba(18,18,20,0.9)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #2a2a2a' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <Shield size={20} color="var(--primary)" />
            Detalhes do Cria
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '8px', borderRadius: '50%' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Perfil Resumo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ position: 'relative', marginBottom: '16px' }}>
               <img 
                 src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
                 alt={user.username}
                 style={{ width: '96px', height: '96px', borderRadius: '50%', border: '2px solid #2a2a2a', objectFit: 'cover', backgroundColor: '#1a1a1e' }}
               />
               <div style={{ position: 'absolute', bottom: '-8px', right: '50%', transform: 'translateX(50%)', backgroundColor: '#121214', padding: '4px', borderRadius: '50%', display: 'flex', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                 <UserBadges badges={activeBadges} size={18} />
               </div>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', margin: '8px 0 4px 0' }}>{user.first_name} {user.last_name}</h3>
            <p style={{ color: '#9ca3af', margin: 0 }}>@{user.username}</p>
            <div style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '9999px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.875rem' }}>
              <Wallet size={14} color="#eab308" />
              <span style={{ fontWeight: 'bold', color: '#eab308' }}>{user.moral_balance || 0} Moral</span>
            </div>
          </div>

          {/* Seção 1: Cargos e Selos */}
          <div style={{ backgroundColor: '#1a1a1e', borderRadius: '12px', padding: '20px', border: '1px solid #2a2a2a' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#9ca3af', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px 0' }}>Gestão de Identidade</h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#d1d5db', marginBottom: '8px' }}>Cargo do Relíquia</label>
                <select 
                  style={{ width: '100%', backgroundColor: '#121214', border: '1px solid #3a3a3a', color: 'white', borderRadius: '8px', padding: '10px', outline: 'none', opacity: adminRole !== 'ceo' ? 0.5 : 1 }}
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  disabled={adminRole !== 'ceo'}
                >
                  <option value="user">Usuário Padrão</option>
                  <option value="influencer">Influenciador</option>
                  <option value="admin">Administrador (Admin)</option>
                  <option value="ceo">CEO Supremo</option>
                </select>
                {adminRole !== 'ceo' && (
                  <p style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={12} /> Apenas o CEO pode alterar cargos.
                  </p>
                )}
              </div>

              <div>
                 <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#d1d5db', marginBottom: '8px' }}>Selos Ativos (Badges)</label>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button 
                      onClick={() => toggleBadge('verified')}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', border: activeBadges.includes('verified') ? '1px solid #3b82f6' : '1px solid #3a3a3a', backgroundColor: activeBadges.includes('verified') ? 'rgba(59,130,246,0.1)' : '#121214', color: activeBadges.includes('verified') ? '#3b82f6' : '#9ca3af', cursor: 'pointer' }}
                    >
                      <Check size={16} /> Verificado
                    </button>
                    <button 
                      onClick={() => toggleBadge('influencer')}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', border: activeBadges.includes('influencer') ? '1px solid #ec4899' : '1px solid #3a3a3a', backgroundColor: activeBadges.includes('influencer') ? 'rgba(236,72,153,0.1)' : '#121214', color: activeBadges.includes('influencer') ? '#ec4899' : '#9ca3af', cursor: 'pointer' }}
                    >
                      <Star size={16} /> Influencer
                    </button>
                    <button 
                      onClick={() => toggleBadge('ceo')}
                      disabled={adminRole !== 'ceo'}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', border: activeBadges.includes('ceo') ? '1px solid #eab308' : '1px solid #3a3a3a', backgroundColor: activeBadges.includes('ceo') ? 'rgba(234,179,8,0.1)' : '#121214', color: activeBadges.includes('ceo') ? '#eab308' : '#9ca3af', opacity: adminRole !== 'ceo' ? 0.5 : 1, cursor: adminRole === 'ceo' ? 'pointer' : 'default' }}
                    >
                      <Crown size={16} /> CEO Glow
                    </button>
                    <button 
                      onClick={() => toggleBadge('special_pink')}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', borderRadius: '8px', border: activeBadges.includes('special_pink') ? '1px solid #f472b6' : '1px solid #3a3a3a', backgroundColor: activeBadges.includes('special_pink') ? 'rgba(244,114,182,0.1)' : '#121214', color: activeBadges.includes('special_pink') ? '#f472b6' : '#9ca3af', cursor: 'pointer' }}
                    >
                      <Sparkles size={16} /> Especial
                    </button>
                 </div>
              </div>

              <button 
                onClick={handleSaveRoleAndBadges}
                disabled={loading}
                style={{ width: '100%', marginTop: '8px', padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 500, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
              >
                {loading ? <Loader2 size={18} style={{ animation: 'spin 2s linear infinite' }} /> : 'Salvar Identidade'}
              </button>
            </div>
          </div>

          {/* Seção 2: Economia Financeira */}
          <div style={{ backgroundColor: '#1a1a1e', borderRadius: '12px', padding: '20px', border: '1px solid #2a2a2a' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#eab308', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid rgba(234,179,8,0.2)', paddingBottom: '8px', margin: '0 0 16px 0' }}>
              <Wallet size={16} /> Central da Moral
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#9ca3af', marginBottom: '4px' }}>Quantidade</label>
                <input 
                  type="number" 
                  min="1"
                  placeholder="Ex: 500"
                  value={coinAmount}
                  onChange={(e) => setCoinAmount(e.target.value ? Number(e.target.value) : '')}
                  style={{ width: '100%', backgroundColor: '#121214', border: '1px solid #3a3a3a', color: 'white', borderRadius: '8px', padding: '10px', outline: 'none' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: '#9ca3af', marginBottom: '4px' }}>Motivo (Log)</label>
                <input 
                  type="text" 
                  placeholder="Ex: Pagamento de bonificação..."
                  value={coinReason}
                  onChange={(e) => setCoinReason(e.target.value)}
                  style={{ width: '100%', backgroundColor: '#121214', border: '1px solid #3a3a3a', color: 'white', borderRadius: '8px', padding: '10px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', paddingTop: '8px' }}>
                <button 
                  onClick={() => handleAdjustCoins(true)}
                  disabled={loading}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', padding: '12px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <PlusCircle size={20} />
                  <span style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Adicionar</span>
                </button>
                <button 
                  onClick={() => handleAdjustCoins(false)}
                  disabled={loading}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', padding: '12px', borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  <MinusCircle size={20} />
                  <span style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>Queimar</span>
                </button>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', textAlign: 'center', marginTop: '8px', lineHeight: 1.5 }}>
                As moedas queimadas são removidas do saldo permanentemente.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
