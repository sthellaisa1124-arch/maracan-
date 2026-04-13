import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Users, 
  LayoutDashboard, 
  Search, 
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Crown,
  Check,
  X,
  CreditCard,
  History,
  TrendingUp,
  Wallet,
  ArrowLeft,
  Star,
  Check as CheckIcon
} from 'lucide-react';
import { UserBadges } from '../components/Badges';
import { UserDetailsModal } from '../components/admin/UserDetailsModal';

interface UserProfile {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  created_at: string;
  is_admin: boolean;
  avatar_url?: string;
  plan_type: string;
  daily_msg_count: number;
  account_role?: string;
  badges?: string[];
  moral_balance?: number;
}

interface PlanRequest {
  id: string;
  user_id: string;
  plan_type: string;
  status: string;
  created_at: string;
  user?: {
    username: string;
    avatar_url: string;
  };
}

interface AdminLog {
  id: string;
  admin_id: string;
  target_user_id: string;
  action: string;
  details: any;
  created_at: string;
  admin?: { username: string };
  target?: { username: string };
}

export function Admin({ isAdmin, userProfile, onBack }: { isAdmin: boolean, userProfile: any, session?: any, onBack?: () => void }) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [withdraws, setWithdraws] = useState<any[]>([]); // Novo estado para Saques
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'users' | 'requests' | 'logs' | 'settings' | 'saques' | 'criadores'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [creatorRequests, setCreatorRequests] = useState<any[]>([]);

  // Estados do Modal de Rejeição de Saques
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [withdrawToReject, setWithdrawToReject] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Conta bancária de terceiros');
  const predefinedReasons = [
    'Conta bancária de terceiros (Nome diferente)',
    'Chave PIX inválida ou inexistente',
    'Atividade suspeita bloqueada',
    'Chave PIX não corresponde ao tipo selecionado',
    'Outro motivo. Entre em contato com a equipe.'
  ];

  const isCEO = userProfile?.is_admin && userProfile?.account_role === 'ceo';
  const viewerRole = isCEO ? 'ceo' : 'user';

  useEffect(() => {
    if (isAdmin && isCEO) {
      loadAdminData();
    } else {
      setLoading(false);
    }
  }, [isAdmin, isCEO]);

  async function loadAdminData() {
    setLoading(true);
    await Promise.all([fetchUsers(), fetchRequests(), fetchLogs(), fetchWithdraws(), fetchCreatorRequests()]);
    setLoading(false);
  }

  async function fetchCreatorRequests() {
    try {
      const { data } = await supabase
        .from('creator_badge_requests')
        .select(`
          *,
          profiles:user_id(username, avatar_url, total_followers:follows!following_id(count))
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (data) setCreatorRequests(data);
    } catch (e) {
      console.warn('Erro ao buscar solicitações de criador:', e);
    }
  }

  async function resolveCreatorRequest(requestId: string, userId: string, action: 'approved' | 'rejected') {
    try {
      await supabase
        .from('creator_badge_requests')
        .update({ status: action, reviewed_at: new Date().toISOString(), reviewed_by: userProfile?.id })
        .eq('id', requestId);

      const notifPayload = action === 'approved'
        ? {
            user_id: userId,
            from_user_id: userProfile?.id,
            type: 'creator_approved',
            title: '🎉 Parabéns! Solicitação Aprovada!',
            message: 'Sua solicitação de Criador de Conteúdo foi aprovada! Em breve um administrador adicionará seu selo. Continue produzindo conteúdo incrível! 🚀'
          }
        : {
            user_id: userId,
            from_user_id: userProfile?.id,
            type: 'creator_rejected',
            title: '📢 Sobre sua solicitação de Criador',
            message: 'Você ainda não se encaixa em nenhum dos níveis de Criador neste momento, mas está indo muito bem! Continue crescendo, postando e engajando com seu público. Logo você vai conseguir! 💪🔥'
          };

      await supabase.from('notifications').insert(notifPayload);
      fetchCreatorRequests();
    } catch (e: any) {
      alert('Erro: ' + e.message);
    }
  }

  if (!isAdmin || !isCEO) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <ShieldAlert size={64} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Acesso Restrito ao CEO</h2>
        <p className="text-gray-400">Você não tem autorização para acessar o Gabinete Real.</p>
      </div>
    );
  }

  async function fetchUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setUsers(data as UserProfile[]);
  }

  async function fetchRequests() {
    const { data } = await supabase
      .from('plan_requests')
      .select(`
        *,
        user:profiles(username, avatar_url)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (data) setRequests(data as any[]);
  }

  async function fetchWithdraws() {
    const { data } = await supabase
      .from('withdraw_requests')
      .select('*, profiles(username, avatar_url, moral_balance)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (data) setWithdraws(data);
  }

  async function resolveWithdraw(id: string, action: 'approve' | 'reject', reason?: string) {
    if (action === 'approve') {
      if (!confirm('Confirma que você já enviou o PIX para esta chave? O pedido será marcado como pago e encerrado.')) return;
    }
    
    setLoading(true);
    setRejectModalOpen(false);
    try {
      const { data, error } = await supabase.rpc('admin_resolve_withdraw', {
        p_request_id: id,
        p_action: action,
        p_reason: reason || null
      });
      
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Erro desconhecido');
      }
      
      alert(action === 'approve' ? 'Saque marcado como PAGO com sucesso! ✅' : 'Saque rejeitado e estornado e o cria foi notificado! ❌');
      loadAdminData();
    } catch (e: any) {
      alert('Aviso: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLogs() {
    try {
      const { data } = await supabase
        .from('admin_logs')
        .select(`
          *,
          admin:admin_id(username),
          target:target_user_id(username)
        `)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (data) setLogs(data as any[]);
    } catch (e) {
      console.warn("Erro ao buscar logs (tabela pode ainda não existir).");
    }
  }

  async function approveRequest(requestId: string, userId: string, planType: string) {
    setLoading(true);
    try {
      const { error: profileError } = await supabase.from('profiles').update({ plan_type: planType }).eq('id', userId);
      if (profileError) throw profileError;

      const { error: reqError } = await supabase.from('plan_requests').update({ status: 'approved' }).eq('id', requestId);
      if (reqError) throw reqError;

      await supabase.from('notifications').insert({
        user_id: userId,
        title: '💎 Plano Liberado!',
        message: `Papo reto, seu plano ${planType.toUpperCase()} foi aprovado! Explore as novidades agora. 🚀`
      });

      alert('Plano liberado com sucesso! O cria já é elite. 🚀');
      loadAdminData();
    } catch (err: any) {
      alert('Erro ao aprovar: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function rejectRequest(requestId: string) {
    if (!confirm('Deseja mesmo recusar esse pedido?')) return;
    setLoading(true);
    const { data: requestData } = await supabase.from('plan_requests').select('user_id').eq('id', requestId).single();
    
    await supabase.from('plan_requests').update({ status: 'rejected' }).eq('id', requestId);
    
    if (requestData) {
      await supabase.from('notifications').insert({
        user_id: requestData.user_id,
        title: '⚠️ Pedido de Plano',
        message: 'Seu pedido não foi aprovado dessa vez. Confira os dados do Pix e tente novamente, relíquia!'
      });
    }
    
    loadAdminData();
  }

  if (loading) return <div className="loading-container" style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><Loader2 className="animate-spin text-primary" style={{ animation: 'spin 2s linear infinite' }} size={48} /></div>;

  if (!isAdmin) {
    return (
      <div className="admin-lockout">
        <ShieldAlert size={80} color="#ef4444" style={{marginBottom: '2rem'}} />
        <h1>ACESSO NEGADO</h1>
        <p>Área restrita apenas aos administradores do VELAR! 🛡️🔐</p>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.account_role?.toLowerCase() === searchTerm.toLowerCase()
  );

  const totalMoralEmCirculacao = users.reduce((acc, current) => acc + (current.moral_balance || 0), 0);
  const totalAdmins = users.filter(u => u.account_role === 'admin' || u.account_role === 'ceo').length;

  return (
    <div className="admin-container">
      {onBack && (
        <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '1.5rem 1.5rem 0', fontWeight: 600 }}>
          <ArrowLeft size={20} />
          <span>Voltar ao Perfil</span>
        </button>
      )}
      <header className="admin-header" style={{ paddingTop: onBack ? '1rem' : '2rem' }}>
        <div className="admin-title">
          {viewerRole === 'ceo' ? <Crown size={32} color="#eab308" /> : <ShieldCheck size={32} className="text-primary" />}
          <div>
            <h1 style={{ color: viewerRole === 'ceo' ? '#eab308' : 'inherit' }}>
              {viewerRole === 'ceo' ? 'Gabinete do CEO' : 'Central de Comando'}
            </h1>
            <p>Gerencie crias, moedas e economia da pista.</p>
          </div>
        </div>

        <div className="admin-tabs">
          <button className={`admin-tab ${activeSubTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveSubTab('overview')}>
            <LayoutDashboard size={18} /> Resumo
          </button>
          <button className={`admin-tab ${activeSubTab === 'users' ? 'active' : ''}`} onClick={() => setActiveSubTab('users')}>
            <Users size={18} /> Crias
          </button>
          <button className={`admin-tab ${activeSubTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveSubTab('requests')}>
            <CreditCard size={18} /> Planos {requests.length > 0 && <span className="req-count">{requests.length}</span>}
          </button>
          <button className={`admin-tab ${activeSubTab === 'saques' ? 'active' : ''}`} onClick={() => setActiveSubTab('saques')}>
            <Wallet size={18} /> Saques FIXOS {withdraws.length > 0 && <span className="req-count">{withdraws.length}</span>}
          </button>
          <button className={`admin-tab ${activeSubTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveSubTab('logs')}>
            <History size={18} /> Auditoria
          </button>
          <button className={`admin-tab ${activeSubTab === 'criadores' ? 'active' : ''}`} onClick={() => setActiveSubTab('criadores')}>
            <Star size={18} /> Criadores {creatorRequests.length > 0 && <span className="req-count">{creatorRequests.length}</span>}
          </button>
        </div>
      </header>

      <main className="admin-content-area">
        {activeSubTab === 'overview' && (
          <div className="admin-overview">
            <div className="stats-grid">
               <div className="stat-card">
                  <div className="stat-icon users-bg"><Users size={24} /></div>
                  <div className="stat-info"><span>Total de Crias</span><h2>{users.length}</h2></div>
               </div>
               <div className="stat-card">
                  <div className="stat-icon online-bg"><Wallet size={24} color="#eab308" /></div>
                  <div className="stat-info"><span>Moral em Giro</span><h2 style={{color: '#eab308'}}>{totalMoralEmCirculacao}</h2></div>
               </div>
               <div className="stat-card">
                  <div className="stat-icon users-bg"><ShieldCheck size={24} /></div>
                  <div className="stat-info"><span>Staff (Admins/CEO)</span><h2>{totalAdmins}</h2></div>
               </div>
            </div>
            
            <div className="card-v2 recent-activity">
               <h3><TrendingUp size={18} /> Sistema Otimizado V2</h3>
               <p>Motor de economia reativo e novo sistema de cargos ativado. {viewerRole === 'ceo' && <strong style={{color: '#eab308'}}>Privilégios de CEO estão desbloqueados.</strong>}</p>
            </div>
          </div>
        )}

        {/* --- Aba de Requests --- */}
        {activeSubTab === 'requests' && (
          <div className="admin-requests-grid">
            <h2 style={{marginBottom: '1.5rem'}}>🚨 Pedidos de Upgrade (Pix)</h2>
            {requests.length === 0 ? (
              <p style={{opacity: 0.5}}>Nenhum pedido pendente, relíquia.</p>
            ) : (
              requests.map(req => (
                <div key={req.id} className="request-card">
                  <div className="req-user">
                    <img src={req.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.user?.username}`} className="mini-avatar" />
                    <div>
                      <p><strong>@{req.user?.username}</strong> quer ser <strong>{req.plan_type.toUpperCase()}</strong></p>
                      <span style={{fontSize: '0.75rem', opacity: 0.5}}>Pedido em: {new Date(req.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="req-actions">
                    <button className="btn-approve" onClick={() => approveRequest(req.id, req.user_id, req.plan_type)}>
                      <Check size={18} /> Aprovar
                    </button>
                    <button className="btn-reject" onClick={() => rejectRequest(req.id)}>
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* --- Aba de Saques PIX --- */}
        {activeSubTab === 'saques' && (
          <div className="admin-requests-grid">
            <h2 style={{marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff'}}>
              <Wallet color="#ef4444" /> Pedidos de Saque Manuais (Cashout)
            </h2>
            {withdraws.length === 0 ? (
              <p style={{opacity: 0.5}}>Nenhuma solicitação de saque na fila, chefia.</p>
            ) : (
              withdraws.map(w => (
                <div key={w.id} className="request-card" style={{ borderLeft: '4px solid #ef4444', display: 'flex', flexDirection: 'column' }}>
                  <div className="req-user" style={{ marginBottom: '1rem' }}>
                    <img src={w.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${w.profiles?.username}`} className="mini-avatar" />
                    <div>
                      <p><strong>@{w.profiles?.username}</strong> solicitou saque.</p>
                      <span style={{fontSize: '0.75rem', opacity: 0.5}}>Data do Pedido: {new Date(w.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div style={{ background: '#111', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{opacity: 0.7}}>Moral Debitado do App:</span>
                      <span style={{color: 'var(--primary)', fontWeight: 'bold'}}>{w.moral_amount} M</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{opacity: 0.7}}>Valor Bruto:</span>
                      <span style={{color: '#fff', fontWeight: 'bold'}}>R$ {Number(w.real_amount_bruto).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(239, 68, 68, 0.1)', padding: '0.5rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
                      <span style={{color: '#ef4444', fontWeight: 600}}>Lucro Casa (35%) Retido:</span>
                      <span style={{color: '#ef4444', fontWeight: 'bold'}}>- R$ {(Number(w.real_amount_bruto) * 0.35).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{opacity: 0.7, fontWeight: 'bold'}}>Valor do PIX A ENVIAR:</span>
                      <span style={{color: '#4ade80', fontWeight: 900, fontSize: '1.4rem'}}>R$ {Number(w.real_amount_liquido).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #333', paddingTop: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                      <span style={{opacity: 0.7}}>Chave <strong style={{color:'#fff'}}>{w.pix_type.toUpperCase()}</strong></span>
                      <div 
                        style={{background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: 'var(--primary)'}} 
                        onClick={() => { navigator.clipboard.writeText(w.pix_key); alert('Chave copiada para a área de transferência!'); }}>
                        {w.pix_key} 📋 Copiar
                      </div>
                    </div>
                  </div>

                  <div className="req-actions" style={{ justifyContent: 'space-between' }}>
                    <button className="btn-approve" onClick={() => resolveWithdraw(w.id, 'approve')} style={{flex: 1, marginRight: '0.5rem', background: '#22c55e', color: '#000', fontWeight: 'bold', display: 'flex', justifyContent: 'center', gap: '4px'}}>
                      <Check size={18} /> CONFIRMAR PAGAMENTO
                    </button>
                    <button className="btn-reject" onClick={() => { setWithdrawToReject(w.id); setRejectModalOpen(true); }} style={{flex: 1, marginLeft: '0.5rem', display: 'flex', justifyContent: 'center', gap: '4px'}}>
                      <X size={18} /> REJEITAR / ESTORNAR
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* --- Aba de Usuários --- */}
        {activeSubTab === 'users' && (
          <div className="admin-users-view">
            <div className="search-box" style={{marginBottom: '1rem'}}>
               <Search size={18} />
               <input 
                 type="text" 
                 placeholder="Buscar username ou filtrar 'admin', 'ceo'..." 
                 value={searchTerm} 
                 onChange={e => setSearchTerm(e.target.value)} 
               />
            </div>

            <div className="table-container-v2">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Cria</th>
                    <th>Moral</th>
                    <th>Cargo / Selos</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedUser(u)}>
                      <td>
                        <div className="user-table-cell" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <img src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} className="mini-avatar" />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span>@{u.username}</span>
                            <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{u.id}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#eab308', fontWeight: 'bold' }}>
                          <Wallet size={14} /> {u.moral_balance || 0}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                           <span className={`badge ${u.account_role === 'ceo' ? 'ceo-badge' : u.account_role === 'admin' ? 'admin-badge' : 'comunitário'}`}>
                              {(u.account_role || 'user').toUpperCase()}
                           </span>
                           {u.badges && u.badges.length > 0 && (
                             <UserBadges badges={u.badges} size={16} />
                           )}
                        </div>
                      </td>
                      <td>
                        <button 
                           className="btn-approve"
                           style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                           onClick={(e) => { e.stopPropagation(); setSelectedUser(u); }}
                        >
                          Ver detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- Aba de Logs --- */}
        {activeSubTab === 'logs' && (
          <div className="admin-logs-view">
             {logs.length === 0 ? (
               <p style={{ opacity: 0.5, textAlign: 'center', marginTop: '2rem' }}>Nenhum log registrado ainda.</p>
             ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                 {logs.map(log => (
                   <div key={log.id} className="request-card">
                      <div className="req-user" style={{ flex: 1 }}>
                        <div>
                          <p>
                            <strong style={{ color: '#fff' }}>@{log.admin?.username || 'Sistema'}</strong> modificou <strong style={{ color: 'var(--primary)' }}>@{log.target?.username || log.target_user_id}</strong>
                          </p>
                          <span style={{ fontSize: '0.85rem', color: '#ff79c6', background: 'rgba(255,121,198,0.1)', padding: '2px 6px', borderRadius: '4px', marginTop: '4px', display: 'inline-block' }}>{log.action}</span>
                          {log.details?.reason && <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '4px', fontStyle: 'italic' }}>"{log.details.reason}"</p>}
                        </div>
                      </div>
                      <div className="req-actions" style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>{new Date(log.created_at).toLocaleString()}</span>
                        <button 
                          style={{ fontSize: '0.75rem', background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6', padding: '4px 8px', borderRadius: '4px', marginTop: '6px', cursor: 'pointer' }}
                          onClick={() => alert(JSON.stringify(log.details, null, 2))}
                        >
                          Ver Payload
                        </button>
                      </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}

        {/* --- Aba de Criadores --- */}
        {activeSubTab === 'criadores' && (
          <div className="admin-requests-grid">
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
              <Star color="#a78bfa" /> Solicitações de Criador de Conteúdo
            </h2>
            {creatorRequests.length === 0 ? (
              <p style={{ opacity: 0.5 }}>Nenhuma solicitação pendente no momento.</p>
            ) : (
              creatorRequests.map(req => (
                <div key={req.id} className="request-card" style={{ borderLeft: '4px solid #a78bfa', display: 'flex', flexDirection: 'column' }}>
                  <div className="req-user" style={{ marginBottom: '1rem' }}>
                    <img src={req.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.profiles?.username}`} className="mini-avatar" />
                    <div>
                      <p><strong>@{req.profiles?.username}</strong> solicitou Selo de Criador</p>
                      <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>Enviado em: {new Date(req.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  <div style={{ background: '#111', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ opacity: 0.7 }}>Seguidores (no momento):</span>
                      <span style={{ color: '#a78bfa', fontWeight: 700 }}>{(req.followers_snapshot || 0).toLocaleString('pt-BR')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ opacity: 0.7 }}>Visualizações totais:</span>
                      <span style={{ color: '#38bdf8', fontWeight: 700 }}>{(req.video_views_snapshot || 0).toLocaleString('pt-BR')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ opacity: 0.7 }}>Vídeos últimos 7 dias:</span>
                      <span style={{ color: '#4ade80', fontWeight: 700 }}>{req.videos_last_7days || 0} vídeos</span>
                    </div>
                  </div>

                  <div className="req-actions" style={{ justifyContent: 'space-between' }}>
                    <button
                      className="btn-approve"
                      onClick={() => resolveCreatorRequest(req.id, req.user_id, 'approved')}
                      style={{ flex: 1, marginRight: '0.5rem', background: '#22c55e', color: '#000', fontWeight: 'bold', display: 'flex', justifyContent: 'center', gap: '4px' }}
                    >
                      <CheckIcon size={18} /> APROVAR
                    </button>
                    <button
                      className="btn-reject"
                      onClick={() => resolveCreatorRequest(req.id, req.user_id, 'rejected')}
                      style={{ flex: 1, marginLeft: '0.5rem', display: 'flex', justifyContent: 'center', gap: '4px' }}
                    >
                      <X size={18} /> NEGAR
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* MODAL / DRAWER DE USUÁRIO */}
      {selectedUser && (
        <UserDetailsModal 
          user={selectedUser} 
          adminRole={viewerRole} 
          onClose={() => setSelectedUser(null)} 
          onRefresh={loadAdminData}
        />
      )}

      {/* Modal de Motivo da Rejeição (Saque) */}
      {rejectModalOpen && withdrawToReject && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div style={{
            background: '#111', border: '1px solid #ef4444', borderRadius: '1.5rem',
            padding: '2rem', maxWidth: '450px', width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
          }}>
            <h3 style={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>
              ⚠️ Motivo do Estorno
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Escolha o motivo pelo qual você está rejeitando esse saque. O usuário vai receber essa notificação.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem' }}>
              {predefinedReasons.map((reason, i) => (
                <label key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', 
                  padding: '1rem', background: 'rgba(255,255,255,0.05)', 
                  borderRadius: '0.5rem', cursor: 'pointer',
                  border: rejectReason === reason ? '1px solid #ef4444' : '1px solid transparent',
                  transition: 'all 0.2s'
                }}>
                  <input 
                    type="radio" 
                    name="rejectReason" 
                    value={reason}
                    checked={rejectReason === reason}
                    onChange={() => setRejectReason(reason)}
                    style={{ accentColor: '#ef4444', width: '1.2rem', height: '1.2rem' }}
                  />
                  <span style={{ color: '#fff', fontSize: '0.9rem', fontWeight: 500 }}>{reason}</span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => setRejectModalOpen(false)} 
                style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button 
                onClick={() => resolveWithdraw(withdrawToReject, 'reject', rejectReason)}
                style={{ flex: 1, padding: '1rem', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '0.5rem', fontWeight: 800, cursor: 'pointer' }}>
                CONFIRMAR REJEIÇÃO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
