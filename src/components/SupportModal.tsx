import React, { useState } from 'react';
import { 
  X, 
  MessageSquare, 
  UserCircle, 
  Heart, 
  Send, 
  ChevronRight, 
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SupportModalProps {
  onClose: () => void;
  userId?: string;
  isPublic?: boolean;
}

type SupportCategory = 'account_issue' | 'human_support' | 'feedback' | null;

export function SupportModal({ onClose, userId, isPublic }: SupportModalProps) {
  const [step, setStep] = useState<'category' | 'input' | 'success'>('category');
  const [category, setCategory] = useState<SupportCategory>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);

  const categories = [
    { 
      id: 'account_issue', 
      label: 'Problema com a conta', 
      icon: <UserCircle size={24} color="#f87171" />, 
      desc: 'Não consigo entrar ou esqueci a senha.' 
    },
    { 
      id: 'human_support', 
      label: 'Falar com um cria responsa', 
      icon: <MessageSquare size={24} color="#a855f7" />, 
      desc: 'Atendimento humano direto na pista.' 
    },
    { 
      id: 'feedback', 
      label: 'Deixar feedback', 
      icon: <Heart size={24} color="#ec4899" />, 
      desc: 'Elogios ou sugestões pro sistema.' 
    }
  ];

  const handleCategorySelect = (cat: SupportCategory) => {
    setCategory(cat);
    setStep('input');
  };

  const handleSubmit = async () => {
    if (!message.trim() || loading) return;
    
    setLoading(true);
    try {
      if (isPublic && !userId) {
          const text = encodeURIComponent(`Olá Suporte Vellar! Categoria: ${category}. Problema: ${message}`);
          window.open(`https://wa.me/5521984129620?text=${text}`, '_blank');
          onClose();
          return;
      }

      const { data, error } = await supabase.rpc('open_support_ticket', {
        p_type: category,
        p_subject: categories.find(c => c.id === category)?.label || 'Atendimento',
        p_message: message
      });

      if (error) throw error;

      if (data?.success) {
        setTicketId(data.ticket_id);
        setStep('success');
      } else {
        alert('Erro: ' + (data?.error || 'Não foi possível enviar.'));
      }
    } catch (err: any) {
      alert('Erro: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ESTILOS INLINE PARA GARANTIR PREMIUM DARK MODE
  const modalStyles = {
    overlay: {
      position: 'fixed' as const,
      inset: 0,
      zIndex: 999999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    },
    card: {
      position: 'relative' as const,
      width: '100%',
      maxWidth: '420px',
      backgroundColor: '#0a0a0f',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '2rem',
      overflow: 'hidden',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      display: 'flex',
      flexDirection: 'column' as const,
      maxHeight: '85vh',
      color: '#fff',
      fontFamily: "'Outfit', sans-serif"
    },
    header: {
      padding: '1.5rem',
      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: 'linear-gradient(to right, rgba(168, 85, 247, 0.1), transparent)'
    },
    itemBtn: {
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '1.25rem',
      borderRadius: '1.25rem',
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      cursor: 'pointer',
      textAlign: 'left' as const,
      transition: 'all 0.2s',
      marginBottom: '0.75rem'
    },
    primaryBtn: {
      width: '100%',
      padding: '1.25rem',
      borderRadius: '1.25rem',
      backgroundColor: '#a855f7',
      color: '#fff',
      border: 'none',
      fontWeight: 900,
      fontSize: '1rem',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      boxShadow: '0 10px 20px rgba(168, 85, 247, 0.3)',
      marginTop: '1rem'
    }
  };

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.card} className="animate-fade-in">
        
        {/* Header */}
        <header style={modalStyles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {step !== 'category' && step !== 'success' && (
              <button onClick={() => setStep('category')} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.1rem' }}>Central de Suporte</h3>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.4)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 800 }}>Vellar Cria Responsa</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', borderRadius: '50%', padding: '8px', cursor: 'pointer', display: 'flex' }}>
            <X size={18} />
          </button>
        </header>

        {/* Content */}
        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          
          {/* CATEGORIAS */}
          {step === 'category' && (
            <div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Salve cria! Qual o papo de hoje?</p>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id as SupportCategory)}
                  style={modalStyles.itemBtn}
                  onMouseOver={(e) => e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.4)'}
                  onMouseOut={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'}
                >
                  <div style={{ padding: '10px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '12px' }}>{cat.icon}</div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: 0, color: '#fff', fontWeight: 700 }}>{cat.label}</h4>
                    <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{cat.desc}</p>
                  </div>
                  <ChevronRight size={16} style={{ opacity: 0.3 }} />
                </button>
              ))}
            </div>
          )}

          {/* INPUT */}
          {step === 'input' && (
            <div className="animate-slide-up">
              {category === 'account_issue' && (
                <div style={{ padding: '1rem', backgroundColor: 'rgba(248, 113, 113, 0.05)', border: '1px solid rgba(248, 113, 113, 0.2)', borderRadius: '1rem', color: '#fecaca', fontSize: '13px', marginBottom: '1.5rem', display: 'flex', gap: '10px' }}>
                  <AlertCircle size={20} style={{ flexShrink: 0 }} />
                  <div>
                    <strong style={{ display: 'block', marginBottom: '4px' }}>Dica Rápida:</strong>
                    Confira se escreveu o e-mail certinho. Se esqueceu a senha, mande sua dúvida aqui embaixo!
                  </div>
                </div>
              )}

              <label style={{ display: 'block', fontSize: '10px', fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', paddingLeft: '8px' }}>
                Relate o seu problema
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Explica pra gente com detalhes..."
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '1.5rem',
                  padding: '1.25rem',
                  color: '#fff',
                  fontSize: '0.95rem',
                  minHeight: '150px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  resize: 'none'
                }}
              />

              <button
                onClick={handleSubmit}
                disabled={!message.trim() || loading}
                style={{ 
                  ...modalStyles.primaryBtn,
                  opacity: (!message.trim() || loading) ? 0.5 : 1
                }}
              >
                {loading ? <Clock className="animate-spin" size={20} /> : <><Send size={18} /> ENVIAR CHAMADO</>}
              </button>
            </div>
          )}

          {/* SUCESSO */}
          {step === 'success' && (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ width: '80px', height: '80px', backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyCenter: 'center', margin: '0 auto 1.5rem' }}>
                <CheckCircle2 size={40} color="#22c55e" style={{ margin: 'auto' }} />
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>Fechou, cria!</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                Já recebemos seu chamado. Agora é só ficar de olho no seu perfil que a gente te responde logo logo.
              </p>
              <button
                onClick={onClose}
                style={{ padding: '0.8rem 2rem', borderRadius: 'full', backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontWeight: 800, cursor: 'pointer', borderRadius: '2rem' }}
              >
                ENTENDIDO!
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer style={{ padding: '1rem', backgroundColor: 'rgba(0,0,0,0.3)', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ margin: 0, fontSize: '9px', fontWeight: 900, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: '4px' }}>Vellar Security & Support</p>
        </footer>
      </div>
    </div>
  );
}
