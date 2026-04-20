import { ArrowLeft, ShieldCheck } from 'lucide-react';

export function Privacy({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-[#050508] text-white p-6 pb-20 animate-fade-in overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center gap-4 mb-8 sticky top-0 bg-[#050508]/80 backdrop-blur-md py-4 z-10 border-b border-white/5">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <ArrowLeft size={24} color="var(--primary)" />
          </button>
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter">POLÍTICA DE <span className="text-[var(--primary)] text-neon">PRIVACIDADE</span></h1>
            <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Última atualização: 20 de Abril de 2026</p>
          </div>
        </header>

        <section className="space-y-8 text-white/70 leading-relaxed font-medium">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4 text-[var(--primary)]">
              <ShieldCheck size={20} />
              <h2 className="text-xl font-bold italic">Compromisso com a Privacidade</h2>
            </div>
            <p>
              Na Vellar, levamos a segurança dos seus dados a sério. Esta política descreve como coletamos, usamos e protegemos suas informações de acordo com a Lei Geral de Proteção de Dados (LGPD).
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-4 italic underline decoration-[var(--primary)] decoration-2 underline-offset-4">1. Informações que Coletamos</h2>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li><strong>Dados de Perfil</strong>: Nome de usuário, e-mail e foto de perfil fornecidos no cadastro.</li>
              <li><strong>Dados de Transação</strong>: Informações necessárias para processar pagamentos de moedas (processados de forma segura por gateways externos).</li>
              <li><strong>Conteúdo</strong>: Vídeos, comentários e mensagens enviadas na plataforma.</li>
              <li><strong>Dados Técnicos</strong>: Endereço IP, tipo de dispositivo e logs de acesso para segurança.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-4 italic underline decoration-[var(--primary)] decoration-2 underline-offset-4">2. Uso das Informações</h2>
            <p>
              Utilizamos seus dados para:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Prover e manter os serviços da plataforma.</li>
              <li>Personalizar sua experiência no feed AVISTA.</li>
              <li>Garantir a segurança contra fraudes e abusos.</li>
              <li>Processar as doações de "Morais" aos criadores.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-4 italic underline decoration-[var(--primary)] decoration-2 underline-offset-4">3. Compartilhamento de Dados</h2>
            <p>
              Não vendemos seus dados para terceiros. O compartilhamento ocorre apenas com:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li><strong>Processadores de Pagamento</strong>: Para finalizar compras de moedas.</li>
              <li><strong>Autoridades Judiciais</strong>: Quando exigido por lei ou ordem judicial.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-4 italic underline decoration-[var(--primary)] decoration-2 underline-offset-4">4. Seus Direitos</h2>
            <p>
              Você tem o direito de acessar, corrigir ou excluir seus dados a qualquer momento através das configurações de perfil ou entrando em contato com nosso suporte.
            </p>
          </div>

          <div className="pt-10 border-t border-white/5 text-center">
            <p className="text-sm text-white/30 italic">
              Preocupado com seus dados? Fale conosco:<br/>
              <span className="text-[var(--primary)] font-bold">vellarcria.01@gmail.com</span>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
