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
  HelpCircle,
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
      // Se for público, poderíamos redirecionar para WhatsApp, 
      // mas como o requisito pede para aparecer no Gabinete, tentaremos criar o ticket se tiver userId
      if (isPublic && !userId) {
          // Fallback para WhatsApp configurado no print anterior
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
        alert('Erro: ' + (data?.error || 'Não foi possível abrir o chamado.'));
      }
    } catch (err: any) {
      alert('Erro ao enviar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0a0a0f] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <header className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-purple-500/10 to-transparent">
          <div className="flex items-center gap-3">
            {step !== 'category' && step !== 'success' && (
              <button onClick={() => setStep('category')} className="text-white/40 hover:text-white">
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h3 className="text-white font-black text-lg">Central de Suporte</h3>
              <p className="text-white/40 text-xs uppercase tracking-widest font-bold">Vellar Cria Responsa</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* STEP 1: Seleção de Categoria */}
          {step === 'category' && (
            <div className="flex flex-col gap-4 animate-slide-up">
              <p className="text-white/60 text-sm mb-2">Salve cria! No que a gente pode te ajudar hoje?</p>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.id as SupportCategory)}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-left group"
                >
                  <div className="p-3 rounded-xl bg-black/40 group-hover:scale-110 transition-transform">
                    {cat.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-bold">{cat.label}</h4>
                    <p className="text-white/40 text-xs">{cat.desc}</p>
                  </div>
                  <ChevronRight size={18} className="text-white/20 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          )}

          {/* STEP 2: Input de Mensagem */}
          {step === 'input' && (
            <div className="flex flex-col gap-5 animate-slide-right">
              {category === 'account_issue' && (
                <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 text-red-200/80 text-sm flex gap-3">
                  <AlertCircle size={24} className="shrink-0 text-red-500" />
                  <div>
                    <p className="font-bold mb-1">Dica Rápida:</p>
                    <p className="opacity-70">Confira se o e-mail e senha estão certinhos. Se esqueceu a senha, em breve teremos o botão de recuperação automática!</p>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest px-2">Descreva o ocorrido</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={category === 'account_issue' ? "Manda a boa, o que tá acontecendo com sua conta?" : "Escreve aqui pra gente..."}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white text-sm outline-none focus:border-purple-500/50 min-h-[120px] transition-all"
                  autoFocus
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={!message.trim() || loading}
                className="w-full py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black flex items-center justify-center gap-2 transition-all shadow-xl shadow-purple-500/20"
              >
                {loading ? <Clock className="animate-spin" size={20} /> : <><Send size={18} /> ABRIR CHAMADO</>}
              </button>
            </div>
          )}

          {/* STEP 3: Sucesso */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center text-center py-8 animate-scale-in">
              <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-6">
                <CheckCircle2 size={48} className="text-green-500" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Ticket Aberto!</h3>
              <p className="text-white/40 text-sm mb-8 px-4">
                Já recebemos sua chamada, cria! Um dos nossos atendentes vai te responder em breve no seu Gabinete. Fica de olho!
              </p>
              <button
                onClick={onClose}
                className="px-8 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold transition-all"
              >
                FECHAR
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="p-4 bg-black/40 text-center border-t border-white/5">
          <p className="text-[10px] text-white/20 uppercase font-black tracking-[4px]">Vellar Security & Support</p>
        </footer>
      </div>
    </div>
  );
}
