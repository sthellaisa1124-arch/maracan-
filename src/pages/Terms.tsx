import { ArrowLeft, ScrollText } from 'lucide-react';

export function Terms({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-[#050508] text-white p-6 pb-20 animate-fade-in overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center gap-4 mb-8 sticky top-0 bg-[#050508]/80 backdrop-blur-md py-4 z-10 border-b border-white/5">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <ArrowLeft size={24} color="var(--primary)" />
          </button>
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter">TERMOS DE <span className="text-[var(--primary)] text-neon">USO</span></h1>
            <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Última atualização: 20 de Abril de 2026</p>
          </div>
        </header>

        <section className="space-y-8 text-white/70 leading-relaxed font-medium">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4 text-[var(--primary)]">
              <ScrollText size={20} />
              <h2 className="text-xl font-bold italic">1. Aceitação dos Termos</h2>
            </div>
            <p>
              Ao acessar ou usar a plataforma Vellar, você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, você não deve acessar o serviço.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-4 italic underline decoration-[var(--primary)] decoration-2 underline-offset-4">2. Descrição do Serviço</h2>
            <p>
              A Vellar é uma plataforma social de compartilhamento de vídeos curtos (AVISTA), transmissões ao vivo e interações entre usuários. Oferecemos um sistema de moedas virtuais ("Morais") para apoio a criadores de conteúdo.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-4 italic underline decoration-[var(--primary)] decoration-2 underline-offset-4">3. Transações Financeiras e Doações</h2>
            <p>
              A compra de "Morais" é finalizada através de gateways de pagamento terceirizados. 
              Ao realizar uma doação para um criador de conteúdo, você entende que esta ação é voluntária e não gera direito a reembolso, dada a natureza de gratificação imediata do serviço digital.
            </p>
            <p className="mt-4 border-l-4 border-[var(--primary)] pl-4 italic bg-[var(--primary)]/5 py-2 rounded-r-lg">
              A Vellar atua apenas como intermediária tecnológica entre o doador e o criador de conteúdo.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-4 italic underline decoration-[var(--primary)] decoration-2 underline-offset-4">4. Conduta do Usuário</h2>
            <p>
              É estritamente proibido:
            </p>
            <ul className="list-disc pl-6 mt-2 space-y-2">
              <li>Publicar conteúdo ilegal, violento ou discriminatório.</li>
              <li>Praticar assédio ou bullying contra outros usuários.</li>
              <li>Tentar fraudar o sistema de pagamentos ou de moedas.</li>
              <li>Compartilhar conteúdo de terceiros sem a devida autorização.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-4 italic underline decoration-[var(--primary)] decoration-2 underline-offset-4">5. Propriedade Intelectual</h2>
            <p>
              Todo o design, código e identidade visual da Vellar são de propriedade exclusiva da administração da plataforma. O conteúdo enviado pelos usuários permanece de propriedade dos mesmos, mas concede-se à Vellar uma licença mundial e gratuita para exibição do mesmo dentro do aplicativo.
            </p>
          </div>

          <div className="pt-10 border-t border-white/5 text-center">
            <p className="text-sm text-white/30 italic">
              Dúvidas sobre estes termos? Entre em contato:<br/>
              <span className="text-[var(--primary)] font-bold">vellarcria.01@gmail.com</span>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
