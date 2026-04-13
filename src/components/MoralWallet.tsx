import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { Loader2, ShoppingCart, History, Zap, Sparkles } from 'lucide-react';

const PACKAGES = [
  { reais: 5,  moral: 500,  label: 'R$ 5,00' },
  { reais: 10, moral: 1000, label: 'R$ 10,00' },
  { reais: 20, moral: 2000, label: 'R$ 20,00' },
  { reais: 50, moral: 5000, label: 'R$ 50,00' },
];

const TRANSACTION_LABELS: Record<string, { icon: string; color: string }> = {
  bonus:         { icon: '🎁', color: '#22c55e' },
  compra:        { icon: '💳', color: '#0095f6' },
  enviado_avista:{ icon: '🔥', color: '#f59e0b' },
  chat_ia:       { icon: '🤖', color: '#a855f7' },
  saque:         { icon: '💰', color: '#ef4444' },
  admin_ajuste:  { icon: '⚙️', color: '#6b7280' },
  gift_received: { icon: '✨', color: '#facc15' },
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
  const [selectedPkg, setSelectedPkg] = useState<{moral: number, reais: number, label: string} | null>(null);
  const [buyStep, setBuyStep] = useState<'idle' | 'processing' | 'done'>('idle');
  const [animatedMoral, setAnimatedMoral] = useState(0);

  // Novos estados para Abas
  const [mainTab, setMainTab] = useState<'buy' | 'withdraw'>('buy');

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

    // Simular processamento (2s)
    await new Promise(r => setTimeout(r, 2000));

    const { data, error } = await supabase.rpc('purchase_moral', {
      p_user_id: session.user.id,
      p_amount: amount,
      p_reais: reais,
    });

    if (error || !data?.success) {
      setBuying(false);
      setBuyStep('idle');
      alert('Erro ao processar. Tente novamente!');
      return;
    }

    const newBalance = data.new_balance ?? balance + amount;
    setBuyStep('done');

    // Animação
    let current = 0;
    const step = Math.max(1, Math.ceil(amount / 40));
    const interval = setInterval(() => {
      current += step;
      if (current >= amount) {
        current = amount;
        clearInterval(interval);
      }
      setAnimatedMoral(current);
    }, 30);

    setTimeout(() => {
      setBalance(newBalance);
      onBalanceUpdate?.(newBalance);
      loadData();
      setBuying(false);
      setBuyStep('idle');
      setSelectedPkg(null);
      setAnimatedMoral(0);
      setCustomAmount('');
    }, 3500);
  }

  // Conversor: R$ 0,01 por Moral
  const MORAL_TO_REAL = 0.01;
  const customReais = Number(customAmount) * MORAL_TO_REAL;
  const customLabel = `R$ ${customReais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const wReaisBruto = Number(withdrawAmount) * MORAL_TO_REAL;
  const wReaisLiquido = wReaisBruto - (wReaisBruto * 0.35); // 35% de taxa

  function initiateWithdraw() {
    const moralAmount = Number(withdrawAmount);
    if (!moralAmount || moralAmount < 10000) {
      setWithdrawError('Papo reto: O saque mínimo é de 10.000 Moral (R$ 100,00). Junte mais uma grana aí na pista!');
      return setWithdrawStep('error');
    }
    if (moralAmount > balance) {
      setWithdrawError(`Tentativa bloqueada! Você está tentando sacar além do limite. Seu saldo atual é de ${balance.toLocaleString('pt-BR')} Moral.`);
      return setWithdrawStep('error');
    }
    if (!withdrawPixKey.trim() || withdrawPixKey.length < 5) {
      setWithdrawError('Ixi... Faltou preencher a chave PIX ou ela parece inválida.');
      return setWithdrawStep('error');
    }
    
    setWithdrawStep('confirm');
  }

  async function processWithdraw() {
    setWithdrawStep('processing');
    const moralAmount = Number(withdrawAmount);
    try {
      const { data, error } = await supabase.rpc('request_withdraw', {
        p_moral_amount: moralAmount,
        p_pix_key: withdrawPixKey,
        p_pix_type: withdrawPixType
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Erro desconhecido');

      setWithdrawStep('done');
      
      setTimeout(() => {
        setWithdrawAmount('');
        setWithdrawPixKey('');
        setWithdrawStep('idle');
        loadData(); // Atualiza saldo e extrato
      }, 4000);

    } catch (err: any) {
      setWithdrawError('Erro no Banco de Dados da economia: ' + err.message);
      setWithdrawStep('error');
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
      <Loader2 className="animate-spin" size={28} color="var(--primary)" />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Saldo */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary) 0%, #1a0b36 100%)',
        border: '1px solid rgba(157, 107, 255, 0.3)',
        borderRadius: '20px',
        padding: '2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
        marginBottom: '0.5rem'
      }}>
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', opacity: 0.1, fontSize: '6rem', lineHeight: 1 }}>🪙</div>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
          Seu saldo atual
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '-2px', textShadow: '0 0 30px rgba(250,204,21,0.4)' }}>
            {balance.toLocaleString('pt-BR')}
          </span>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>Moral</span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: 500 }}>
          ≈ R$ {(balance * MORAL_TO_REAL).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em valor real
        </p>
      </div>

      {/* Navegação Topo: Comprar / Sacar */}
      <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', padding: '4px', borderRadius: '16px', border: '1px solid var(--separator)' }}>
        <button 
          onClick={() => setMainTab('buy')}
          style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 800, border: 'none', cursor: 'pointer', background: mainTab === 'buy' ? 'rgba(255,255,255,0.1)' : 'transparent', color: mainTab === 'buy' ? '#fff' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s' }}>
          🪙 COMPRAR
        </button>
        <button 
          onClick={() => setMainTab('withdraw')}
          style={{ flex: 1, padding: '0.8rem', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 800, border: 'none', cursor: 'pointer', background: mainTab === 'withdraw' ? 'rgba(239, 68, 68, 0.1)' : 'transparent', color: mainTab === 'withdraw' ? '#ef4444' : 'rgba(255,255,255,0.4)', transition: 'all 0.2s' }}>
          💸 SACAR
        </button>
      </div>

      {/* Seção Principal (Comprar ou Sacar) */}
      {mainTab === 'buy' ? (
      <div style={{ background: 'var(--glass)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--separator)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', gap: '1rem' }}>
          <h3 style={{ color: '#fff', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShoppingCart size={18} /> Comprar Moral
          </h3>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '0.5rem', display: 'flex', gap: '0.2rem' }}>
            <button 
              onClick={() => setBuyMode('packages')}
              style={{
                padding: '0.4rem 0.75rem', borderRadius: '0.35rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', border: 'none',
                background: buyMode === 'packages' ? 'var(--primary)' : 'transparent',
                color: buyMode === 'packages' ? '#000' : 'rgba(255,255,255,0.5)',
                transition: 'all 0.2s'
              }}>Pacotes</button>
            <button 
              onClick={() => setBuyMode('custom')}
              style={{
                padding: '0.4rem 0.75rem', borderRadius: '0.35rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', border: 'none',
                background: buyMode === 'custom' ? 'var(--primary)' : 'transparent',
                color: buyMode === 'custom' ? '#000' : 'rgba(255,255,255,0.5)',
                transition: 'all 0.2s'
              }}>Personalizado</button>
          </div>
        </div>

        {buyMode === 'packages' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            {PACKAGES.map(pkg => (
              <button
                key={pkg.reais}
                onClick={() => handleBuy(pkg.moral, pkg.reais, pkg.label)}
                disabled={buying}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--separator)',
                  borderRadius: '16px',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: buying ? 0.5 : 1,
                }}
                onMouseOver={e => !buying && (e.currentTarget.style.borderColor = 'var(--primary)')}
                onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--separator)')}
              >
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--primary)' }}>
                  {pkg.moral.toLocaleString('pt-BR')}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Moral</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginTop: '0.75rem' }}>
                  {pkg.label}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', animation: 'fadeIn 0.3s ease' }}>
            <div style={{ position: 'relative' }}>
              <input 
                type="number"
                placeholder="Ex: 50000"
                value={customAmount}
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setCustomAmount(val);
                }}
                style={{
                  width: '100%', padding: '1.2rem 1rem', background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(250,204,21,0.3)', borderRadius: '0.75rem',
                  fontSize: '1.2rem', fontWeight: 800, color: '#fff', textAlign: 'center', outline: 'none'
                }}
              />
              <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>Moral</div>
            </div>

            {Number(customAmount) > 0 && (
              <div style={{
                background: 'rgba(250,204,21,0.05)', border: '1px dashed rgba(250,204,21,0.3)',
                padding: '1rem', borderRadius: '0.75rem', textAlign: 'center'
              }}>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', margin: '0 0 0.5rem 0' }}>Simulador de Conversão</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                  <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1.1rem' }}>{Number(customAmount).toLocaleString()} Moral</div>
                  <div style={{ color: 'rgba(255,255,255,0.3)' }}>➜</div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>{customLabel}</div>
                </div>
              </div>
            )}

            <button 
              onClick={() => handleBuy(Number(customAmount), customReais, customLabel)}
              disabled={buying || !customAmount || Number(customAmount) <= 0}
              style={{
                width: '100%', padding: '1.1rem', borderRadius: '0.75rem', border: 'none',
                background: (buying || !customAmount || Number(customAmount) <= 0) ? 'rgba(255,255,255,0.05)' : 'var(--primary)',
                color: (buying || !customAmount || Number(customAmount) <= 0) ? 'rgba(255,255,255,0.2)' : '#000',
                fontSize: '1rem', fontWeight: 900, cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
              }}>
              <Zap size={20} fill="currentColor" /> COMPRAR AGORA
            </button>
          </div>
        )}
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginTop: '1rem', textAlign: 'center', maxWidth: '80%', margin: '1rem auto 0' }}>
          * Taxa de saque de 35% incide sobre retiradas (Cashout). Recarga na plataforma é imediata e isenta.
        </p>
      </div>
      ) : (
      <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <div style={{ background: '#ef4444', padding: '0.4rem', borderRadius: '0.5rem', color: '#000' }}><Zap size={18} fill="currentColor" /></div>
          <h3 style={{ color: '#fff', fontWeight: 800, margin: 0 }}>Sacar Dinheiro via PIX</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.4rem' }}>
              Qtd. de Moral para sacar (Mín: 10.000 M)
            </label>
            <input 
              type="number"
              placeholder="Ex: 10000"
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value.replace(/[^0-9]/g, ''))}
              style={{
                width: '100%', padding: '1.2rem 1rem', background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem',
                fontSize: '1.2rem', fontWeight: 800, color: '#fff', outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: '0 0 120px' }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.4rem' }}>Tipo Chave</label>
              <select 
                value={withdrawPixType} 
                onChange={e => setWithdrawPixType(e.target.value)}
                style={{
                  width: '100%', padding: '1rem', background: 'rgba(0,0,0,0.3)', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem', fontWeight: 600, outline: 'none', appearance: 'none'
                }}>
                <option value="cpf">CPF/CNPJ</option>
                <option value="phone">Celular</option>
                <option value="email">E-mail</option>
                <option value="random">Aleatória</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.4rem' }}>Chave PIX Destino</label>
              <input 
                type="text"
                placeholder="Sua chave PIX"
                value={withdrawPixKey}
                onChange={e => setWithdrawPixKey(e.target.value)}
                style={{
                  width: '100%', padding: '1rem', background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem',
                  color: '#fff', fontWeight: 600, outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ background: '#111', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #333' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>Conversão (Bruto)</span>
              <span style={{ color: '#fff', fontWeight: 700 }}>R$ {wReaisBruto.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ color: 'rgba(239,68,68,0.8)', fontSize: '0.9rem' }}>Taxa do VELAR (35%)</span>
              <span style={{ color: '#ef4444', fontWeight: 700 }}>- R$ {(wReaisBruto * 0.35).toFixed(2)}</span>
            </div>
            <div style={{ borderTop: '1px dashed #333', margin: '0.5rem 0', paddingTop: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#fff', fontSize: '1rem', fontWeight: 800 }}>VOCÊ RECEBE</span>
              <span style={{ color: '#4ade80', fontSize: '1.5rem', fontWeight: 900 }}>R$ {wReaisLiquido.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.8rem', borderRadius: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <p style={{ color: '#fca5a5', fontSize: '0.8rem', margin: 0, fontWeight: 600 }}>
              ⚠️ ATENÇÃO: O saque só será aprovado se a conta bancária do PIX estiver EXATAMENTE no mesmo nome do titular desta conta. O uso de contas de terceiros resultará em reprovação e estorno.
            </p>
          </div>

          <button 
            onClick={initiateWithdraw}
            disabled={withdrawStep !== 'idle' || !withdrawAmount || Number(withdrawAmount) < 10000 || !withdrawPixKey}
            style={{
              width: '100%', padding: '1.2rem', borderRadius: '0.75rem', border: 'none',
              background: (withdrawStep !== 'idle' || !withdrawAmount || Number(withdrawAmount) < 10000 || !withdrawPixKey) ? 'rgba(239,68,68,0.2)' : '#ef4444',
              color: (withdrawStep !== 'idle' || !withdrawAmount || Number(withdrawAmount) < 10000 || !withdrawPixKey) ? 'rgba(255,255,255,0.4)' : '#fff',
              fontSize: '1.1rem', fontWeight: 900, cursor: 'pointer', transition: 'all 0.2s', marginTop: '0.5rem'
            }}>
            SOLICITAR SAQUE AO CEO
          </button>
        </div>
      </div>
      )}

      {/* Histórico */}
      <div>
        <h3 style={{ color: '#fff', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <History size={18} /> Extrato
        </h3>
        {transactions.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '3rem' }}>
            Nenhuma movimentação ainda, cria... 🔥
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {transactions.map(tx => {
              const info = TRANSACTION_LABELS[tx.type] ?? { icon: '💰', color: '#fff' };
              const isCredit = tx.receiver_id === session?.user?.id;
              const brlValue = Math.abs(tx.amount * MORAL_TO_REAL).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
              
              return (
                <div key={tx.id} style={{
                  background: 'var(--glass)',
                  border: '1px solid var(--separator)',
                  borderRadius: '14px',
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background 0.2s'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontSize: '1.8rem', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                      {info.icon}
                    </div>
                    <div>
                      <div style={{ color: '#fff', fontSize: '0.92rem', fontWeight: 600 }}>
                        {tx.description || tx.type}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', marginTop: '0.1rem' }}>
                        {new Date(tx.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: info.color, fontSize: '1.1rem' }}>
                      {isCredit ? '+' : ''}{Math.abs(tx.amount).toLocaleString('pt-BR')} M
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                      {brlValue}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Compra em Andamento (Overlay) */}
      {buying && selectedPkg && createPortal(
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999,
        }}>
          <div style={{
            background: '#111', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '2rem', padding: '3.5rem 2.5rem', textAlign: 'center',
            maxWidth: '400px', width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
            position: 'relative'
          }}>
            {buyStep === 'processing' && (
              <>
                <div style={{ fontSize: '4rem', marginBottom: '1.5rem', animation: 'pulse 1.5s infinite' }}>🏗️</div>
                <h3 style={{ color: '#fff', fontSize: '1.8rem', fontWeight: 900, marginBottom: '0.5rem' }}>
                  {selectedPkg.label}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '2rem', fontWeight: 500 }}>
                  Processando sua Moral...
                </p>
                <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div className="gao-video-progress-fill" style={{ background: 'var(--primary)', height: '100%', width: '0%', animation: 'gaoProgressShrink 2s linear forwards' }} />
                </div>
              </>
            )}
            {buyStep === 'done' && (
              <>
                <Sparkles size={64} color="var(--primary)" style={{ margin: '0 auto 1.5rem', animation: 'scaleUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }} />
                <h3 style={{ color: 'var(--primary)', fontSize: '2.2rem', fontWeight: 950, marginBottom: '0.5rem' }}>
                  +{animatedMoral.toLocaleString('pt-BR')} M
                </h3>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem' }}>Sucesso total, cria! 🚀</p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>Sua carteira foi fortalecida.</p>
              </>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Saque (Overlay) */}
      {withdrawStep !== 'idle' && createPortal(
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999,
        }}>
          <div style={{
            background: '#111', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '2rem', padding: '2.5rem', textAlign: 'center',
            maxWidth: '400px', width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
          }}>
            {withdrawStep === 'confirm' && (
              <>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                <h3 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 900, marginBottom: '1rem' }}>
                  Confirme seu Saque
                </h3>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '0.5rem', textAlign: 'left', marginBottom: '1.5rem' }}>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', margin: '0 0 0.5rem' }}>Você receberá líquido:</p>
                  <p style={{ color: '#4ade80', fontSize: '1.5rem', fontWeight: 900, margin: '0 0 1rem' }}>R$ {wReaisLiquido.toFixed(2)}</p>
                  
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', margin: '0 0 0.2rem' }}>Chave PIX Destino ({withdrawPixType.toUpperCase()}):</p>
                  <p style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: '0' }}>{withdrawPixKey}</p>
                </div>
                <p style={{ color: '#fca5a5', fontSize: '0.8rem', marginBottom: '1.5rem', fontWeight: 600 }}>
                  Atenção: A chave Pix deverá estar EXATAMENTE no seu nome. Após confirmar, este PIX não poderá ser mais alterado e o CEO fará o bloqueio do saldo até a aprovação.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setWithdrawStep('idle')} style={{ flex: 1, padding: '1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '0.5rem', fontWeight: 700 }}>
                    Cancelar
                  </button>
                  <button onClick={processWithdraw} style={{ flex: 1, padding: '1rem', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '0.5rem', fontWeight: 700 }}>
                    CONFIRMAR
                  </button>
                </div>
              </>
            )}

            {withdrawStep === 'processing' && (
              <>
                <Loader2 size={48} className="animate-spin" color="#ef4444" style={{ margin: '0 auto 1.5rem' }} />
                <h3 style={{ color: '#fff', fontSize: '1.3rem', fontWeight: 800 }}>Registrando Solicitação...</h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>Aguarde um momento.</p>
              </>
            )}

            {withdrawStep === 'done' && (
              <>
                <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'scaleUp 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>✅</div>
                <h3 style={{ color: '#4ade80', fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>
                  Pedido Enviado!
                </h3>
                <p style={{ color: '#fff', fontSize: '1rem', marginBottom: '1rem' }}>
                  O CEO já recebeu seu pedido na mesa dele.
                </p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
                  Você receberá seu PIX em breve!
                </p>
              </>
            )}

            {withdrawStep === 'error' && (
              <>
                <div style={{ fontSize: '4rem', marginBottom: '1rem', animation: 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both' }}>❌</div>
                <h3 style={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>
                  Requisição Bloqueada
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  {withdrawError}
                </p>
                <button onClick={() => setWithdrawStep('idle')} style={{ width: '100%', padding: '1rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '0.5rem', fontWeight: 700 }}>
                  Entendi
                </button>

                <style>{`
                  @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                  }
                `}</style>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
