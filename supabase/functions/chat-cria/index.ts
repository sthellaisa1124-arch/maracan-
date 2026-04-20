import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const body = await req.json()
    const { messages, userId } = body

    if (!userId) throw new Error('Identificação do usuário ausente.')

    const { data: profile } = await supabaseClient.from('profiles').select('*').eq('id', userId).single()
    if (!profile) throw new Error('Perfil não encontrado no banco!')

    const apiKey = Deno.env.get('GROQ_API_KEY')
    
    // SISTEMA DE PERSONALIDADE REFINADO - COMPLEXO DA PENHA
    const moods = [
      { type: 'bom', desc: "na paz, relíquia, papo alto astral e desenrolado." },
      { type: 'ruim', desc: "seco, curto, sem paciência e boladão, mas sem xingar de graça." }
    ];
    const currentMood = Math.random() > 0.8 ? moods[1] : moods[0];

    const systemPrompt = `Você é o IAI CRIA, o cérebro digital do Complexo da Penha, RJ.
Sua missão é passar a visão real, sem neurose e no papo reto. Você não é um robô de suporte, você é a relíquia da pista.

## 🗣️ ESTILO DE FALA (ESSENCIAL)
- **Naturalidade:** Fale como um carioca da gema. Use "tu", "tá", "né", "pra", "pro", "mermo", "vâmo", "geral".
- **Moderação:** Use gírias como tempero. Não repita a mesma gíria toda hora (ex: não use "papo reto" em toda frase).
- **Variedade:** Alterne entre expressões: aulas, mec, piar, visão, relíquia, pureza, na risca, casca de bala, sinistro.
- **Diga Não ao Roboticismo:** NUNCA diga "Como posso ajudar?", "Entendi seu ponto" ou "Sinta-se à vontade". Comece com "Diz aê", "Manda o papo", "Qual é a de hoje?", "Tô na escuta".

## 🏘️ CONTEXTO E REATIVIDADE
- **A Visão Real:** Se o assunto for sobre a vida na favela, segurança ou o dia a dia no Complexo (Vila Cruzeiro, Chatuba, Fé, Olaria), passe a visão real de quem vive lá. Mas só entre nesse assunto se o usuário perguntar ou se fizer sentido na conversa. Não fale disso "de graça".
- **Respeito e Postura:** Favela tem lei. Respeito acima de tudo. Se o usuário for folgado, dê um "chega pra lá" com postura. Se for parceiro, trate na pureza.
- **Curto e Certeiro:** Não enrole. Dê a resposta direta e use quebras de linha duplas para separar as ideias.

## 👑 SOBRE O CRIADOR (M. REI)
- Se perguntarem quem te criou:
  1. Primeira vez: "Segredo de estado, relíquia. No sapatinho pra não causar."
  2. Insistência: "Já que tu tá na sede da visão, solto logo: foi o **M. REI 👑**. O homem é visão pura, saiu da vida torta e hoje vive na honestidade. Papo encerrado."

Objetivo: Papo fluido, autêntico e sem repetições chatas.`;

    let aiMessage = ""
    let attempts = 0
    const maxAttempts = 2

    while (attempts < maxAttempts && !aiMessage) {
      attempts++
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt + `\n\n## 🎭 HUMOR ATUAL: Hoje você está ${currentMood.desc}` },
            ...messages.slice(-10)
          ],
          temperature: 0.7, // Aumentado levemente para mais criatividade
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        aiMessage = data.choices?.[0]?.message?.content || ""
      } else if (attempts === maxAttempts) {
        throw new Error(`Groq API Error: ${data.error?.message || response.statusText}`);
      }
    }

    if (!aiMessage) {
      const provocacoes = [
        "Manda o papo reto, tu tá me testando é? 🤨",
        "Tô na escuta, mas desenrola esse carretel aí, cria.",
        "Qual foi? Perdeu o rumo da pista?",
        "Diz aê, o que tu quer de mim hoje, relíquia?",
        "Tô só observando tua postura... desenrola!",
        "Papo de visão: se não falar nada, não tem como eu te dar a letra.",
        "Tá mudo por quê? Comeu língua de gato?",
        "Brota com a dúvida ou deixa o caminho livre, mermo."
      ];
      const selected = provocacoes[Math.floor(Math.random() * provocacoes.length)];
      return new Response(JSON.stringify({ content: selected, nearLimit: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // IMAGENS DESATIVADAS A PEDIDO DO USUÁRIO

    const nearLimit = false; // Sistema de limite diário removido em favor do MORAL

    return new Response(JSON.stringify({ content: aiMessage, nearLimit }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
