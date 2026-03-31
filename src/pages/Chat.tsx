import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'ai';
}

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll to bottom on new message
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { id: Math.random().toString(), content: input, role: 'user' as const };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    const lowerInput = input.toLowerCase();
    
    // 🌴 Dicionário de Gírias e Respostas Prontas
    const slangResponses: Record<string, string> = {
      "bom dia": "Bom dia é o cacete, cria! O sol tá rachando e tu ainda nessa? Acorda pra vida! ☀️",
      "boa tarde": "Boa tarde, parceiro! Já mandou aquele mate com biscoito Globo hoje? 🥤",
      "boa noite": "Boa noite nada, a Lapa tá só começando! 💃✨",
      "quem é você": "Eu sou o IAI CRIA, a inteligência mais braba e marrenta do Rio! Respeita a firma! 🤖✊",
      "ajuda": "Ajuda? Tu tá achando que eu sou o SAMU? Mas fala aí o que tu quer que eu vejo se não tô ocupado...",
      "flamengo": "Mengo! O maior do mundo, esquece! O resto é resto! 🔴⚫",
      "vasco": "Ih, lá vem o sofredor... Segura a onda aí que o Gigante tá tentando acordar! 💢",
      "fluminense": "Pô, os caras do tapetão... mas o importante é o RJ ganhar, né? 🥂🐍",
      "botafogo": "Botafogo? Nem me fala... o coração do alvinegro é testado todo dia! 🔥",
      "praia": "Praia é vida, cria! Mas ó, se for no Recreio não esquece o protetor, que lá o sol não perdoa!",
      "fome": "Fome? Vai lá no TT Burger ou manda aquele podrão da esquina que é sucesso! 🍔"
    };

    // Procura por palavras-chave
    let response = "";
    for (const key in slangResponses) {
      if (lowerInput.includes(key)) {
        response = slangResponses[key];
        break;
      }
    }

    // Delay para parecer que está pensando (marrento)
    setTimeout(() => {
      if (!response) {
        response = "Essa aí tu me pegou, cria... não tenho palavra pronta pra isso não. Mas jaja a gente coloca uma Key da OpenAI aqui pra eu ficar mais inteligente que o Romário! ⚽️🧠";
      }
      setMessages(prev => [...prev, { id: Math.random().toString(), content: response, role: 'ai' }]);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="chat-page-container">
      <div className="chat-window">
        {messages.map(msg => (
          <div key={msg.id} className={`chat-bubble ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        {loading && <div className="chat-bubble ai loading">Digitando...</div>}
        <div ref={scrollRef} />
      </div>

      <div className="input-area">
        <input 
          type="text" 
          placeholder="Manda a letra aqui..." 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage}>Enviar</button>
      </div>
    </div>
  );
}
