import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { 
  Loader2, 
  History, 
  Zap, 
  Sparkles, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  TrendingUp, 
  ShieldCheck,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  Info,
  X,
  Copy
} from 'lucide-react';

const PACKAGES = [
  { reais: 1,  moral: 100,  label: 'R$ 1,00',  popular: true  },
  { reais: 5,  moral: 500,  label: 'R$ 5,00',  popular: false },
  { reais: 10, moral: 1000, label: 'R$ 10,00', popular: false },
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
  const [buyStep, setBuyStep] = useState<'idle' | 'processing' | 'done'>('idle');
  const [animatedMoral, setAnimatedMoral] = useState(0);

  const [mainTab, setMainTab] = useState<'overview' | 'buy' | 'withdraw'>('overview');
  const [buyMode, setBuyMode] = useState<'packages' | 'custom'>('packages');
  const [customAmount, setCustomAmount] = useState<string>('');

  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawPixKey, setWithdrawPixKey] = useState('');
  const [withdrawPixType, setWithdrawPixType] = useState('cpf');
  const [withdrawStep, setWithdrawStep] = useState<'idle' | 'confirm' | 'processing' | 'done' | 'error'>('idle');
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const [verifying, setVerifying] = useState(false);
  const [returnedPaymentId, setReturnedPaymentId] = useState<string | null>(null);

  const [pixCode, setPixCode] = useState<string | null>(null);
  const [pixQrBase64, setPixQrBase64] = useState<string | null>(null);
  const [pixPaymentId, setPixPaymentId] = useState<string | null>(null);

  useEffect(() => {
    loadData();

    // Detecção de retorno do Mercado Pago
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success' || params.get('collection_id') || params.get('payment_id')) {
      const pid = params.get('payment_id') || params.get('collection_id');
      if (pid) setReturnedPaymentId(pid);
      
      window.history.replaceState({}, '', window.location.pathname);
      setBuying(true);
      setBuyStep('done');
      // Tenta atualizar o saldo várias vezes
      const checks = [3000, 6000, 10000];
      checks.forEach(delay => setTimeout(() => loadData(false), delay));
    }
  }, [session?.user?.id]);

  async function verifyPaymentManually() {
    setVerifying(true);
    try {
      const idToVerify = returnedPaymentId || pixPaymentId;
      if (idToVerify) {
        // Envia o ID real do pagamento que veio pela URL de retorno ou do gerador PIX
        await supabase.functions.invoke('mercadopago-webhook', {
          body: { type: 'payment', data: { id: idToVerify } }
        });
        await new Promise(r => setTimeout(r, 2000));
      } else {
        // Se não houver ID do pagamento, tenta buscar o log pendente 
        const { data: logs } = await supabase.from('payment_logs').select('*').eq('user_id', session.user.id).eq('status', 'pending').order('created_at', { ascending: false }).limit(1);
        if (logs && logs.length > 0) {
          alert('Por favor, certifique-se de que o pagamento de ' + logs[0].moral_amount + ' morais foi concluído no Mercado Pago.');
          // Como não temos o payment_id aqui, o webhook automático do MP tem que operar
        }
      }
    } catch(e) {}

    await loadData(false);
    setVerifying(false);
  }


  async function loadData(showSpinner = true) {
    if (showSpinner && transactions.length === 0) setLoading(true);
    const userId = session?.user?.id;
    if (!userId) { if (showSpinner) setLoading(false); return; }

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
    if (showSpinner) setLoading(false);
  }

  async function handleBuy(amount: number, reais: number, label: string) {
    if (buying || !amount || amount <= 0 || isNaN(amount)) return;

    setSelectedPkg({ moral: amount, reais: reais, label: label });
    setBuying(true);
    setBuyStep('processing');

    try {
      const { data, error } = await supabase.functions.invoke('mercadopago-checkout', {
        body: {
          amount: reais,
          moralAmount: amount,
          userId: session.user.id,
          userName: profile.username || 'Usuario Vellar',
          userEmail: session.user.email || null
        }
      });

      if (error) throw new Error(error.message || 'Erro ao gerar pagamento.');
      if (!data?.url) throw new Error(data?.error || 'Link de pagamento não gerado. Tente novamente.');

      // Redireciona para a tela oficial do Mercado Pago (Seguro)
      window.location.href = data.url;

    } catch (err: any) {
      console.error('Erro no checkout:', err);
      setBuying(false);
      setBuyStep('idle');
      alert(`Erro: ${err.message || 'Não foi possível iniciar o pagamento.'}`);
    }
  }

  async function handleBuyPix(amount: number, reais: number, label: string) {
    if (buying || !amount || amount <= 0 || isNaN(amount)) return;

    setSelectedPkg({ moral: amount, reais: reais, label: label });
    setBuying(true);
    setBuyStep('processing');
    setPixCode(null);
    setPixQrBase64(null);
    setPixPaymentId(null);

    try {
      const { data, error } = await supabase.functions.invoke('mercadopago-pix', {
        body: {
          amount: reais,
          moralAmount: amount,
          userId: session.user.id,
          userName: profile.username || 'Usuario Vellar',
          userEmail: session.user.email || null
        }
      });

      if (error) throw new Error(error.message || 'Erro ao gerar PIX.');
      if (!data?.pix_code) throw new Error(data?.error || 'Código PIX não retornado.');

      setPixCode(data.pix_code);
      setPixQrBase64(data.pix_qr_base64 || null);
      setPixPaymentId(data.payment_id);
      setBuyStep('idle'); // Muda para idle pra poder exibir o modal do PIX Inline
      setBuying(false); // Fecha o modal de "Abrindo Checkout Pro" para dar lugar ao PIX nativo

      // Inicia pooling verificando o pagamento a cada 5s
      const pollObj = setInterval(async () => {
         // Tenta acionar a verificação manual na edge function para contornar atrasos do Mercado Pago
         try {
           await supabase.functions.invoke('mercadopago-webhook', {
             body: { type: 'payment', data: { id: data.payment_id } }
           });
         } catch(e) {}

         // Verifica se o webhook processou
         const { data: logs } = await supabase.from('payment_logs').select('status').eq('user_id', session.user.id).eq('external_id', String(data.payment_id)).single();
         if (logs && logs.status === 'paid') {
           clearInterval(pollObj);
           setPixCode(null);
           setBuying(true);
           setBuyStep('done');
           loadData(false);
         }
      }, 5000);

      // Cancela pooling após 5 min
      setTimeout(() => clearInterval(pollObj), 300000);

    } catch (err: any) {
      console.error('Erro no PIX:', err);
      setBuying(false);
      setBuyStep('idle');
      alert(`Erro: ${err.message || 'Não foi possível gerar PIX.'}`);
    }
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

      {/* --- CARD SALDO --- */}
      <div style={{
        background: 'linear-gradient(135deg, #1e0b3d 0%, #0d041a 100%)',
        borderRadius: '24px', padding: '1.75rem',
        border: '1px solid rgba(167, 139, 250, 0.2)', position: 'relative', overflow: 'hidden',
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
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', margin: 0 }}>≈ R$ {(balance * MORAL_TO_REAL).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* --- QUICK ACTIONS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '2.5rem' }}>
         <button onClick={() => setMainTab('buy')} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1.5rem', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', color: mainTab === 'buy' ? 'var(--primary)' : '#fff' }}>
           <div style={{ width: '40px', height: '40px', background: 'rgba(167, 139, 250, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowDownLeft size={20} /></div>
           <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>DEPOSITAR</span>
         </button>
         <button onClick={() => setMainTab('withdraw')} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1.5rem', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', color: mainTab === 'withdraw' ? '#ef4444' : '#fff' }}>
           <div style={{ width: '40px', height: '40px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowUpRight size={20} /></div>
           <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>SACAR</span>
         </button>
         <button onClick={() => setMainTab('overview')} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1.5rem', padding: '1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', color: mainTab === 'overview' ? '#38bdf8' : '#fff' }}>
           <div style={{ width: '40px', height: '40px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><History size={20} /></div>
           <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>EXTRATO</span>
         </button>
      </div>

      {/* --- ABA: EXTRATO --- */}
      {mainTab === 'overview' && (
        <div style={{ animation: 'fadeIn 0.4s ease' }}>
           <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'rgba(255,255,255,0.6)' }}>Últimas Movimentações</h3>
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
                    <div key={tx.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.25rem', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: info.bg, color: info.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

      {/* --- ABA: COMPRAR --- */}
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
                    <div key={pkg.reais} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.25rem', padding: '1.25rem', textAlign: 'center', position: 'relative' }}>
                       {pkg.popular && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'var(--primary)', color: '#000', fontSize: '0.55rem', fontWeight: 900, padding: '2px 0' }}>POPULAR</div>}
                       <div style={{ fontSize: '1.5rem', fontWeight: 950, color: 'var(--primary)', marginBottom: '0.2rem', marginTop: pkg.popular ? '0.5rem' : '0' }}>{pkg.moral.toLocaleString('pt-BR')}</div>
                       <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.75rem' }}>Moral</div>
                       <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: '1rem' }}>{pkg.label}</div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                         <button onClick={() => handleBuyPix(pkg.moral, pkg.reais, pkg.label)} style={{ width: '100%', padding: '0.65rem', background: '#22c55e', border: 'none', borderRadius: '0.75rem', color: '#000', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer' }}>PIX NO APP</button>
                         <button onClick={() => handleBuy(pkg.moral, pkg.reais, pkg.label)} style={{ width: '100%', padding: '0.65rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#fff', fontSize: '0.7rem', fontWeight: 800, cursor: 'pointer' }}>CARTÃO (MP)</button>
                       </div>
                    </div>
                 ))}
              </div>
           ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem', padding: '1.25rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>DIGITE A QUANTIDADE DE MORAIS</span>
                    <input type="number" value={customAmount} onChange={e => setCustomAmount(e.target.value)} placeholder="0" min="100" style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '2.5rem', fontWeight: 900, textAlign: 'center', outline: 'none', margin: '0.5rem 0' }} />
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
                       <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Você paga:</span>
                       <span style={{ color: '#4ade80', fontSize: '1.1rem', fontWeight: 900 }}>{customLabel}</span>
                    </div>
                    {customReais > 0 && customReais < 1 && (
                      <p style={{ margin: '0.5rem 0 0', fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700 }}>
                        ⚠️ Valor mínimo: R$ 1,00 (100 Morais)
                      </p>
                    )}
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                   <button
                     onClick={() => handleBuyPix(Number(customAmount), customReais, customLabel)}
                     disabled={!customAmount || customReais < 1}
                     style={{ width: '100%', padding: '1rem', background: '#22c55e', border: 'none', borderRadius: '1rem', color: '#000', fontSize: '0.85rem', fontWeight: 900, cursor: (!customAmount || customReais < 1) ? 'not-allowed' : 'pointer', opacity: (!customAmount || customReais < 1) ? 0.4 : 1 }}
                   >
                     PIX RÁPIDO
                   </button>
                   <button
                     onClick={() => handleBuy(Number(customAmount), customReais, customLabel)}
                     disabled={!customAmount || customReais < 1}
                     style={{ width: '100%', padding: '1rem', background: 'var(--primary)', border: 'none', borderRadius: '1rem', color: '#000', fontSize: '0.85rem', fontWeight: 900, cursor: (!customAmount || customReais < 1) ? 'not-allowed' : 'pointer', opacity: (!customAmount || customReais < 1) ? 0.4 : 1 }}
                   >
                     MERCADO PAGO
                   </button>
                 </div>
              </div>
           )}

            <div style={{ marginTop: '2rem', display: 'flex', gap: '0.75rem', background: 'rgba(0,158,227,0.05)', padding: '1rem', borderRadius: '1rem', border: '1px solid rgba(0,158,227,0.15)' }}>
              <div style={{ color: '#009ee3' }}><ShieldCheck size={20} /></div>
              <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>Pagamento processado via <strong style={{ color: '#fff' }}>Mercado Pago</strong>. Aceita PIX, Cartão de Crédito e Débito com total segurança.</p>
            </div>
        </div>
      )}

      {/* --- ABA: SACAR --- */}
      {mainTab === 'withdraw' && (
        <div style={{ animation: 'slideUp 0.3s ease' }}>
           <h3 style={{ fontSize: '1.1rem', fontWeight: 900, marginBottom: '1.5rem' }}>Solicitar Cashout</h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                 <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>QUANTIDADE DE MORAL (MÍN: 10.000)</label>
                 <input type="number" value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#fff', fontWeight: 800, outline: 'none' }} placeholder="Mín: 10000" />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: '0 0 100px' }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>TIPO</label>
                  <select value={withdrawPixType} onChange={e => setWithdrawPixType(e.target.value)} style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#fff', outline: 'none', appearance: 'none' }}>
                    <option value="cpf">CPF</option>
                    <option value="phone">Tel</option>
                    <option value="email">Email</option>
                    <option value="random">Chave</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: '0.5rem' }}>CHAVE PIX DESTINO</label>
                  <input type="text" value={withdrawPixKey} onChange={e => setWithdrawPixKey(e.target.value)} style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', color: '#fff', fontWeight: 700, outline: 'none' }} placeholder="Sua chave aqui" />
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

      {/* --- MODAL DE COMPRA (Checkout Pro) --- */}
      {buying && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ background: 'linear-gradient(145deg, #0d0d1a, #0a0a0a)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: '2.5rem', width: '100%', maxWidth: '380px', padding: '2.5rem 2rem', textAlign: 'center', position: 'relative' }}>

            {/* STEP: REDIRECIONANDO */}
            {buyStep === 'processing' && (
              <div style={{ padding: '1rem 0' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(0,158,227,0.1)', border: '2px solid rgba(0,158,227,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                  <Loader2 size={36} className="animate-spin" style={{ color: '#009ee3' }} />
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, marginBottom: '0.5rem', color: '#fff' }}>Iniciando Transação...</h3>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  Aguarde enquanto preparamos seu pagamento de forma segura.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'rgba(0,158,227,0.08)', borderRadius: '0.75rem', border: '1px solid rgba(0,158,227,0.2)' }}>
                  <ShieldCheck size={16} color="#009ee3" />
                  <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Ambiente protegido Vellar Pay</span>
                </div>
              </div>
            )}

            {/* STEP: SUCESSO (ou Retorno) */}
            {buyStep === 'done' && (
              <div style={{ padding: '1rem 0' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
                <h3 style={{ fontSize: '1.8rem', fontWeight: 950, color: 'var(--primary)', marginBottom: '0.5rem' }}>
                  Aguardando Confirmação
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  Se você já efetuou o pagamento, seus Morais cairão em instantes.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <button
                    onClick={verifyPaymentManually}
                    disabled={verifying}
                    style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '1rem', color: '#fff', fontWeight: 800, cursor: verifying ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    {verifying ? <Loader2 size={18} className="animate-spin" /> : <Clock size={18} />}
                    {verifying ? 'VERIFICANDO...' : 'JÁ PAGUEI / VERIFICAR'}
                  </button>
                  <button
                    onClick={() => { setBuying(false); setBuyStep('idle'); loadData(); }}
                    style={{ width: '100%', padding: '1rem', background: 'var(--primary)', border: 'none', borderRadius: '1rem', color: '#000', fontWeight: 900, cursor: 'pointer' }}
                  >
                    VOLTAR PARA A CARTEIRA
                  </button>
                </div>
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

      {/* --- MODAL DO PIX INLINE --- */}
      {pixCode && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ background: 'linear-gradient(145deg, #0d0d1a, #0a0a0a)', border: '1px solid rgba(22, 163, 74, 0.3)', borderRadius: '2.5rem', width: '100%', maxWidth: '380px', padding: '2.5rem 2rem', textAlign: 'center', position: 'relative' }}>
            <button onClick={() => setPixCode(null)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}><X size={16} /></button>
            <div style={{ width: '64px', height: '64px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '50%', border: '2px solid rgba(34, 197, 94, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Zap size={32} color="#22c55e" />
            </div>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 950, marginBottom: '0.5rem', color: '#fff' }}>Pagamento PIX</h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Escaneie o QR Code ou copie o código abaixo. A aprovação é imediata!
            </p>
            {pixQrBase64 && (
               <div style={{ background: '#fff', padding: '1rem', borderRadius: '1rem', display: 'inline-block', marginBottom: '1.5rem' }}>
                 <img src={pixQrBase64.startsWith('data:') ? pixQrBase64 : `data:image/png;base64,${pixQrBase64}`} alt="QR Code PIX" style={{ width: '150px', height: '150px' }} />
               </div>
            )}
            <div style={{ marginBottom: '1.5rem' }}>
               <input type="text" readOnly value={pixCode} style={{ width: '100%', padding: '0.8rem', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', color: '#fff', fontSize: '0.75rem', textAlign: 'center' }} />
               <button onClick={() => { navigator.clipboard.writeText(pixCode); alert('Código copiado!'); }} style={{ width: '100%', padding: '1rem', background: '#22c55e', border: 'none', borderRadius: '1rem', color: '#000', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  COPIAR CÓDIGO PIX <Copy size={16} />
               </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '0.75rem', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
              <Loader2 size={16} className="animate-spin" color="#22c55e" />
              <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 700 }}>Aguardando pagamento...</span>
            </div>
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
