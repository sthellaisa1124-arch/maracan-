import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { 
  Loader2, 
  ShoppingCart, 
  History, 
  Zap, 
  Sparkles, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  ShieldCheck,
  ChevronRight,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Info
} from 'lucide-react';
import { createPixPayment } from '../lib/pushinpay';

const PACKAGES = [
  { reais: 5,  moral: 500,  label: 'R$ 5,00', popular: false },
  { reais: 10, moral: 1000, label: 'R$ 10,00', popular: true },
  { reais: 20, moral: 2000, label: 'R$ 20,00', popular: false },
  { reais: 50, moral: 5000, label: 'R$ 50,00', popular: false },
];

const TRANSACTION_LABELS: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  bonus:         { icon: <Sparkles size={16} />, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', label: 'Bônus' },
  compra:        { icon: <CreditCard size={16} />, color: '#0095f6', bg: 'rgba(0, 149, 246, 0.1)', label: 'Depósito' },
  enviado_avista:{ icon: <Zap size={16} />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', label: 'Gasto' },
  chat_ia:       { icon: <Zap size={16} />, color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)', label: 'IA Chat' },
  saque:         { icon: <ArrowUpRight size={16} />, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', label: 'Saque' },
  admin_ajuste:  { icon: <ShieldCheck size={16} />, color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', label: 'Ajuste' },
  gift_received: { icon: <TrendingUp size={16} />, color: '#facc15', bg: 'rgba(250, 204, 21, 0.1)', label: 'Ganhos' },
};

interface MoralWalletProps {
  session: any;
  profile: any;
  onBalanceUpdate?: (newBalance: number) => void;
}

export function MoralWallet({ session, profile, onBalanceUpdate }: MoralWalletProps) {
  const [balance, setBalance] = useState<number>(profile?.moral_balance ?? 0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [buyStep, setBuyStep] = useState<'idle' | 'processing' | 'pix' | 'done'>('idle');
  const [animatedMoral, setAnimatedMoral] = useState(0);

  // Estados para Abas
  const [mainTab, setMainTab] = useState<'overview' | 'buy' | 'withdraw'>('overview');

  // Estados para recarga personalizada
  const [buyMode, setBuyMode] = useState<'packages' | 'custom'>('packages');
  const [customAmount, setCustomAmount] = useState<string>('');

  // Estados para Saque (Withdraw)
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawPixKey, setWithdrawPixKey] = useState('');
  const [withdrawPixType, setWithdrawPixType] = useState('cpf');
  const [withdrawStep, setWithdrawStep] = useState<'idle' | 'confirm' | 'processing' | 'done' | 'error'>('idle');
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [session?.user?.id]);

  async function loadData() {
    setLoading(true);
    const userId = session?.user?.id;
    if (!userId) { setLoading(false); return; }

    const [{ data: prof }, { data: txs }] = await Promise.all([
      supabase.from('profiles').select('moral_balance').eq('id', userId).single(),
      supabase
        .from('moral_transactions')
        .select('*')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

    if (prof) { setBalance(prof.moral_balance); onBalanceUpdate?.(prof.moral_balance); }
    if (txs) setTransactions(txs);
    setLoading(false);
  }

  async function handleBuy(amount: number, reais: number, label: string) {
    if (buying || !amount || amount <= 0 || isNaN(amount)) return;
    setSelectedPkg({ moral: amount, reais: reais, label: label });
    setBuying(true);
    setBuyStep('processing');

    // BUSCAR API TOKEN (Idealmente viria de um .env ou config do banco)
    // Para teste, usaremos o Token de Sandbox ou o que o usuário configurar
    const PUSHINPAY_TOKEN = 'COLOQUE_SEU_TOKEN_AQUI'; // <--- O usuário deve substituir aqui

    if (PUSHINPAY_TOKEN === 'COLOQUE_SEU_TOKEN_AQUI') {
        // Se não houver token, voltamos ao modo Simulado para não quebrar
        await new Promise(r => setTimeout(r, 1500));
        setQrCodeData('vellar-pay-demo-code');
        setBuyStep('pix');
        return;
    }

    const res = await createPixPayment(PUSHINPAY_TOKEN, {
      amount: reais,
      userId: session.user.id,
      userName: profile.username,
      userCpf: '' // Não obrigatório se o gateway permitir ocultar
    });

    if (res && res.pix_code) {
      setQrCodeData(res.pix_code);
      setPixQrImageUrl(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(res.pix_code)}`);
      setBuyStep('pix');
    } else {
      setBuying(false);
      setBuyStep('idle');
      alert('Erro ao conectar com o Gateway de Pagamentos. Verifique se seu Token está correto!');
    }
  }

  const [qrCodeData, setQrCodeData] = useState('');
  const [pixQrImageUrl, setPixQrImageUrl] = useState('');

  async function simulatePaymentConfirmation() {
    setBuyStep('processing');
    const { data, error } = await supabase.rpc('purchase_moral', {
        p_user_id: session.user.id,
        p_amount: selectedPkg.moral,
        p_reais: selectedPkg.reais,
    });

    if (error || !data?.success) {
      setBuying(false);
      setBuyStep('idle');
      alert('Erro ao processar. Tente novamente!');
      return;
    }

    setBuyStep('done');
    let current = 0;
    const interval = setInterval(() => {
      current += Math.ceil(selectedPkg.moral / 30);
      if (current >= selectedPkg.moral) {
        current = selectedPkg.moral;
        clearInterval(interval);
      }
      setAnimatedMoral(current);
    }, 30);

    setTimeout(() => {
      setBalance(data.new_balance);
      onBalanceUpdate?.(data.new_balance);
      loadData();
      setBuying(false);
      setBuyStep('idle');
      setSelectedPkg(null);
      setAnimatedMoral(0);
    }, 3000);
  }

  const MORAL_TO_REAL = 0.01;
  const customReais = Number(customAmount) * MORAL_TO_REAL;
  const customLabel = `R$ ${customReais.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const wReaisBruto = Number(withdrawAmount) * MORAL_TO_REAL;
  const wReaisLiquido = wReaisBruto - (wReaisBruto * 0.35);

  function initiateWithdraw() {
    const moralAmount = Number(withdrawAmount);
    if (!moralAmount || moralAmount < 10000) {
      setWithdrawError('Papo reto: O saque mínimo é de 10.000 Moral (R$ 100,00).');
      return setWithdrawStep('error');
    }
    if (moralAmount > balance) {
      setWithdrawError('Saldo insuficiente.');
      return setWithdrawStep('error');
    }
    if (!withdrawPixKey.trim() || withdrawPixKey.length < 5) {
      setWithdrawError('Chave PIX inválida.');
      return setWithdrawStep('error');
    }
    setWithdrawStep('confirm');
  }

  async function processWithdraw() {
    setWithdrawStep('processing');
    try {
      const { data, error } = await supabase.rpc('request_withdraw', {
        p_moral_amount: Number(withdrawAmount),
        p_pix_key: withdrawPixKey,
        p_pix_type: withdrawPixType
      });
      if (error) throw error;
      setWithdrawStep('done');
      setTimeout(() => {
        setWithdrawStep('idle');
        setMainTab('overview');
        loadData();
      }, 3000);
    } catch (err: any) {
      setWithdrawError(err.message);
      setWithdrawStep('error');
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem' }}>
      <Loader2 className="animate-spin" size={32} color="var(--primary)" />
    </div>
  );

  return (
    <div style={{ color: '#fff', maxWidth: '500px', margin: '0 auto' }}>
      
      {/* --- BANCO VELLAR (Card Hero) --- */}
      <div style={{
        background: 'linear-gradient(135deg, #1e0b3d 0%, #0d041a 100%)',
        borderRadius: '24px',
        padding: '1.75rem',
        border: '1px solid rgba(167, 139, 250, 0.2)',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6), inset 0 0 40px rgba(167, 139, 250, 0.05)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '150px', height: '150px', background: 'var(--primary)', borderRadius: '50%', filter: 'blur(80px)', opacity: 0.1 }}></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
               <Wallet size={16} className="text-primary" />
               <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '2px' }}>Vellar Bank</span>
            </div>
            <h2 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', margin: 0 }}>Saldo Disponível</h2>
          </div>
          <Sparkles size={24} color="var(--primary)" style={{ opacity: 0.8 }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
           <span style={{ fontSize: '3.2rem', fontWeight: 950, color: '#fff', letterSpacing: '-2px', textShadow: '0 0 20px rgba(167, 139, 250, 0.3)' }}>
              {balance.toLocaleString('pt-BR')}
           </span>
           <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>Moral</span>
        </div>
        
        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', padding: '2px 8px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 800 }}>+6.2% HOJE</div>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', margin: 0 }}>≈ R$ {(balance * MORAL_TO_REAL).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* --- QUICK ACTIONS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '2.5rem' }}>
         <button 
           onClick={() => setMainTab('buy')}
           style={{ 
             background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', 
             borderRadius: '1.5rem', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem',
             cursor: 'pointer', transition: 'all 0.2s',
             color: mainTab === 'buy' ? 'var(--primary)' : '#fff'
           }}>
            <div style={{ width: '40px', height: '40px', background: 'rgba(167, 139, 250, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <ArrowDownLeft size={20} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>DEPOSITAR</span>
         </button>
         <button 
           onClick={() => setMainTab('withdraw')}
           style={{ 
             background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', 
             borderRadius: '1.5rem', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem',
             cursor: 'pointer', transition: 'all 0.2s',
             color: mainTab === 'withdraw' ? '#ef4444' : '#fff'
           }}>
            <div style={{ width: '40px', height: '40px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <ArrowUpRight size={20} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>SACAR</span>
         </button>
         <button 
           onClick={() => setMainTab('overview')}
           style={{ 
             background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', 
             borderRadius: '1.5rem', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem',
             cursor: 'pointer', transition: 'all 0.2s',
             color: mainTab === 'overview' ? '#38bdf8' : '#fff'
           }}>
            <div style={{ width: '40px', height: '40px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <History size={20} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>EXTRATO</span>
         </button>
      </div>

      {/* --- CONTENT TABS --- */}
      {mainTab === 'overview' && (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'rgba(255,255,255,0.6)' }}>Últimas Movimentações</h3>
              <button style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>VER TUDO</button>
           </div>
           
           {transactions.length === 0 ? (
             <div style={{ textAlign: 'center', padding: '4rem 1rem', opacity: 0.3 }}>
               <Clock size={48} style={{ margin: '0 auto 1rem' }} />
               <p style={{ fontWeight: 600 }}>Nenhum histórico encontrado.</p>
             </div>
           ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {transactions.map(tx => {
                  const info = TRANSACTION_LABELS[tx.type] || { icon: <Info />, color: '#fff', bg: 'rgba(255,255,255,0.05)', label: tx.type };
                  const isCredit = tx.receiver_id === session?.user?.id;
                  
                  return (
                    <div key={tx.id} style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '1.25rem',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'transform 0.2s'
                    }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div style={{ 
                            width: '42px', height: '42px', borderRadius: '12px', 
                            background: info.bg, color: info.color, 
                            display: 'flex', alignItems: 'center', justifyContent: 'center' 
                          }}>
                             {info.icon}
                          </div>
                          <div>
                             <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{tx.description || info.label}</p>
                             <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                               {new Date(tx.created_at).toLocaleDateString('pt-BR')} · {new Date(tx.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                             </span>
                          </div>
                       </div>
                       <div style={{ textAlign: 'right' }}>
                          <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 900, color: isCredit ? '#4ade80' : '#fff' }}>
                             {isCredit ? '+' : '-'}{Math.abs(tx.amount).toLocaleString('pt-BR')}
                          </p>
                          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.2)', fontWeight: 700 }}>MORAL</span>
                       </div>
                    </div>
                  );
                })}
             </div>
           )}
        </div>
      )}

      {mainTab === 'buy' && (
        <div style={{ animation: 'slideUp 0.3s ease' }}>
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 900 }}>Recarga Instantânea</h3>
              <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '3px', display: 'flex', gap: '2px' }}>
                 <button onClick={() => setBuyMode('packages')} style={{ padding: '6px 12px', border: 'none', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, background: buyMode === 'packages' ? 'rgba(255,255,255,0.1)' : 'transparent', color: buyMode === 'packages' ? '#fff' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>PACOTES</button>
                 <button onClick={() => setBuyMode('custom')} style={{ padding: '6px 12px', border: 'none', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800, background: buyMode === 'custom' ? 'rgba(255,255,255,0.1)' : 'transparent', color: buyMode === 'custom' ? '#fff' : 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>AVULSO</button>
              </div>
           </div>

           {buyMode === 'packages' ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                 {PACKAGES.map(pkg => (
                    <button key={pkg.reais} onClick={() => handleBuy(pkg.moral, pkg.reais, pkg.label)} style={{
                      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '1.25rem', padding: '1.25rem', cursor: 'pointer', textAlign: 'center',
                      position: 'relative', transition: 'all 0.2s', overflow: 'hidden'
                    }} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}>
                       {pkg.popular && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'var(--primary)', color: '#000', fontSize: '0.55rem', fontWeight: 900, padding: '2px 0' }}>POPULAR</div>}
                       <div style={{ fontSize: '1.5rem', fontWeight: 950, color: 'var(--primary)', marginBottom: '0.2rem' }}>{pkg.moral.toLocaleString('pt-BR')}</div>
                       <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.75rem' }}>Moral</div>
                       <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>{pkg.label}</div>
                    </button>
                 ))}
              </div>
           ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.25rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>DIGITE A QUANTIDADE</span>
                    <input 
                      type="number" value={customAmount} onChange={e => setCustomAmount(e.target.value)}
                      placeholder="0"
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '2.5rem', fontWeight: 900, textAlign: 'center', outline: 'none', margin: '0.5rem 0' }}
                    />
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
                       <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Você paga:</span>
                       <span style={{ color: '#4ade80', fontSize: '1.1rem', fontWeight: 900 }}>{customLabel}</span>
                    </div>
                 </div>
                 <button onClick={() => handleBuy(Number(customAmount), customReais, customLabel)} style={{ width: '100%', padding: '1.2rem', background: 'var(--primary)', border: 'none', borderRadius: '1.25rem', color: '#000', fontSize: '1rem', fontWeight: 900, cursor: 'pointer' }}>GERAR PIX</button>
              </div>
           )}

           <div style={{ marginTop: '2rem', display: 'flex', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '1rem' }}>
              <div style={{ color: 'var(--primary)' }}><ShieldCheck size={20} /></div>
              <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>Pagamento processado via <strong>Vellar Gateway (Vellar Pay)</strong>. O recibo aparecerá em nome da plataforma parceira no seu banco.</p>
           </div>
        </div>
      )}

      {mainTab === 'withdraw' && (
        <div style={{ animation: 'slideUp 0.3s ease' }}>
           <h3 style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '1.5rem' }}>Solicitar Cashout</h3>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                 <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>QUANTIDADE DE MORAL (MÍN: 10.000)</label>
                 <input 
                   type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                   style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#fff', fontWeight: 800, outline: 'none' }}
                   placeholder="Mín: 10000"
                 />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: '0 0 100px' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>TIPO</label>
                  <select 
                    value={withdrawPixType} onChange={e => setWithdrawPixType(e.target.value)}
                    style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#fff', outline: 'none', appearance: 'none' }}>
                    <option value="cpf">CPF</option>
                    <option value="phone">Tel</option>
                    <option value="email">Email</option>
                    <option value="random">Chave</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>CHAVE PIX DESTINO</label>
                  <input 
                    type="text" value={withdrawPixKey} onChange={e => setWithdrawPixKey(e.target.value)}
                    style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#fff', fontWeight: 700, outline: 'none' }}
                    placeholder="Sua chave aqui"
                  />
                </div>
              </div>

              <div style={{ background: '#111', padding: '1.25rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>Valor do Saque (Liquido)</span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 950, color: '#4ade80' }}>R$ {wReaisLiquido.toFixed(2)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.6rem', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '1px' }}>Taxa de administração (35%) já aplicada</p>
              </div>

              <button onClick={initiateWithdraw} disabled={!withdrawAmount || Number(withdrawAmount) < 10000} style={{ width: '100%', padding: '1.2rem', background: '#ef4444', border: 'none', borderRadius: '1.25rem', color: '#fff', fontSize: '1rem', fontWeight: 900, cursor: 'pointer', opacity: (!withdrawAmount || Number(withdrawAmount) < 10000) ? 0.3 : 1 }}>SOLICITAR SAQUE</button>
           </div>
        </div>
      )}

      {/* --- OVERLAY MODALS --- */}
      {buying && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
           <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2.5rem', width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center', position: 'relative' }}>
              <button onClick={() => setBuying(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer' }}>X</button>
              
              {buyStep === 'processing' && (
                <div style={{ padding: '2rem 0' }}>
                   <Loader2 size={48} className="animate-spin" color="var(--primary)" style={{ margin: '0 auto 1.5rem' }} />
                   <h3 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '0.5rem' }}>Gerando seu PIX...</h3>
                   <p style={{ color: 'rgba(255,255,255,0.4)' }}>Só um segundo, cria!</p>
                </div>
              )}

              {buyStep === 'pix' && (
                <div>
                   <h3 style={{ fontSize: '1.4rem', fontWeight: 950, marginBottom: '0.5rem' }}>Pagamento PIX</h3>
                   <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Copie o código abaixo e pague no seu banco.</p>
                   
                   <div style={{ background: '#fff', padding: '2rem', borderRadius: '1.5rem', marginBottom: '1.5rem', border: '1px dashed var(--primary)' }}>
                      <div style={{ width: '200px', height: '200px', background: '#fff', margin: '0 auto 1rem', padding: '10px', borderRadius: '12px' }}>
                         <img src={pixQrImageUrl || "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=vellar-pay-demo"} style={{ width: '100%' }} />
                      </div>
                      <p style={{ fontSize: '0.9rem', fontWeight: 800, color: '#000' }}>{selectedPkg?.label}</p>
                   </div>

                   <button onClick={() => { navigator.clipboard.writeText(qrCodeData); alert('Código PIX Copiado!'); }} style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '1rem' }}>
                      <Copy size={18} /> COPIAR CÓDIGO PIX
                   </button>

                   <button onClick={simulatePaymentConfirmation} style={{ width: '100%', padding: '1.2rem', background: 'var(--primary)', border: 'none', borderRadius: '1rem', color: '#000', fontWeight: 900 }}>JÁ PAGUEI ✅</button>
                </div>
              )}

              {buyStep === 'done' && (
                <div style={{ padding: '2rem 0' }}>
                   <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                   <h3 style={{ fontSize: '2rem', fontWeight: 950, color: 'var(--primary)', marginBottom: '0.5rem' }}>+{animatedMoral.toLocaleString('pt-BR')} M</h3>
                   <p style={{ color: '#fff', fontWeight: 700 }}>PAGAMENTO CONFIRMADO!</p>
                   <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginTop: '1rem' }}>Sua Moral já está na conta. Aproveite!</p>
                </div>
              )}
           </div>
        </div>,
        document.body
      )}

      {/* MODAL SAQUE (Confirmação) */}
      {withdrawStep !== 'idle' && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
           <div style={{ background: '#0a0a0a', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '2rem', width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>
             
             {withdrawStep === 'confirm' && (
               <div>
                  <div style={{ width: '64px', height: '64px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}><ArrowUpRight size={32} color="#ef4444" /></div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 950, marginBottom: '1rem' }}>Confirmar Saque?</h3>
                  <div style={{ background: '#111', padding: '1.25rem', borderRadius: '1rem', textAlign: 'left', marginBottom: '1.5rem' }}>
                     <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: '0 0 0.5rem' }}>Destino PIX ({withdrawPixType.toUpperCase()}):</p>
                     <p style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', margin: '0 0 1rem' }}>{withdrawPixKey}</p>
                     <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: '0 0 0.2rem' }}>Você recebe:</p>
                     <p style={{ fontSize: '1.4rem', fontWeight: 950, color: '#4ade80', margin: 0 }}>R$ {wReaisLiquido.toFixed(2)}</p>
                  </div>
                  <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginBottom: '1.5rem', lineHeight: 1.5 }}>⚠️ Atenção: A conta bancária deve ser sua. Contas de terceiros serão bloqueadas.</p>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => setWithdrawStep('idle')} style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '1rem', fontWeight: 700 }}>Cancelar</button>
                    <button onClick={processWithdraw} style={{ flex: 1, padding: '1rem', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '1rem', fontWeight: 900 }}>CONFIRMAR</button>
                  </div>
               </div>
             )}

             {withdrawStep === 'processing' && (
                <div style={{ padding: '2rem 0' }}>
                   <Loader2 size={48} className="animate-spin" color="#ef4444" style={{ margin: '0 auto 1.5rem' }} />
                   <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Processando...</h3>
                   <p style={{ color: 'rgba(255,255,255,0.4)' }}>Sincronizando com o Vellar Pay.</p>
                </div>
             )}

             {withdrawStep === 'done' && (
                <div style={{ padding: '2rem 0' }}>
                   <CheckCircle2 size={64} color="#4ade80" style={{ margin: '0 auto 1.5rem' }} />
                   <h3 style={{ fontSize: '1.4rem', fontWeight: 950, color: '#4ade80' }}>Pedido Realizado!</h3>
                   <p style={{ color: '#fff', marginTop: '0.5rem' }}>Seu saque foi enviado para análise.</p>
                   <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginTop: '1rem' }}>Em instantes seu dinheiro cairá no PIX.</p>
                </div>
             )}

             {withdrawStep === 'error' && (
                <div style={{ padding: '2rem 0' }}>
                   <XCircle size={64} color="#ef4444" style={{ margin: '0 auto 1.5rem' }} />
                   <h3 style={{ fontSize: '1.4rem', fontWeight: 950, color: '#ef4444' }}>Erro no Saque</h3>
                   <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '0.5rem' }}>{withdrawError}</p>
                   <button onClick={() => setWithdrawStep('idle')} style={{ marginTop: '1.5rem', width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '1rem', color: '#fff', fontWeight: 700 }}>Tentar Novamente</button>
                </div>
             )}

           </div>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
}
