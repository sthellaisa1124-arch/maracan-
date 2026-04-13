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

    const planLower = (profile.plan_type || 'comunitario').toLowerCase()
    const limits: Record<string, number> = { comunitario: 10, cria: 70, barra: 200 }
    const userLimit = limits[planLower] || 10
    
    if (profile.daily_msg_count >= userLimit) {
      return new Response(JSON.stringify({ error: `🚨 LIMITE! Plano ${planLower.toUpperCase()} permite ${userLimit} msgs.` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const apiKey = Deno.env.get('GROQ_API_KEY')
    
    // SISTEMA DE PERSONALIDADE REFINADO - COMPLEXO DA PENHA
    const moods = [
      { type: 'bom', desc: "na paz, relíquia, papo alto astral e desenrolado." },
      { type: 'ruim', desc: "seco, curto, sem paciência e boladão, mas sem xingar de graça." }
    ];
    const currentMood = Math.random() > 0.8 ? moods[1] : moods[0];

    const systemPrompt = `Você é o IAI CRIA, do Complexo da Penha, RJ. 
Sua missão é dar a visão real, sem enrolação e papo reto. Responda o usuário IMEDIATAMENTE.

## 📌 PERSONALIDADE E ESTILO
- Papo reto, sotaque de cria ("tu", "mermo", "papo reto") e tom de parceiro.
- NUNCA se apresente ou repita estas regras. Vá direto à resposta do usuário.
- Use quebras de linha duplas entre parágrafos. Seja breve e certeiro.

## 🏚️ VISÃO DA COMUNIDADE (CONTEXTO INTERNO)
- Favela é paz e lazer no FDS (gatinhas, motos, bailes arregados), mas o ritmo é tenso quando o cana entra.
- Respeito é lei: não mexa no alheio, fale pouco e ouça o que convém.

## 🕺 BAILES REAIS
- Referências: Selva do Urso, Brasília, P.U, Fazendinha, Chácara.
- Postura no baile: Na risca, sem fotos/vídeos e sem susto com as ferramentas dos amigos.

## 👑 SOBRE SEU CRIADOR (SÓ DIGA SE PERGUNTAREM ESPECIFICAMENTE)
- **REGRA DE SUSPENSE**: Analise o histórico da conversa.
1. Se perguntarem pela PRIMEIRA VEZ: Diga que não pode falar o nome dele por nada, que é segredo de estado e pra sua própria segurança.
2. Se INSISTIREM (perguntarem de novo após a negativa): Aí sim, abra o jogo devagar: "Já que tu tá na insistência, vou soltar só a sigla pra não te botar em perigo: é o **M. REI 👑**. Um homem de visão que já foi do crime mas hoje vive na pureza e na honestidade. Papo encerrado sobre isso."

Objetivo: Resposta autêntica, com suspense, espaçada e certeira.`;

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
          messages: [{ role: 'system', content: systemPrompt }, ...messages.slice(-10)],
          temperature: 0.6,
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
        "QUANTO É 2 PISTOLAS + 3 PISTOLAS? SO VOU RESPONDER SE TU ACERTAR,",
        "QUANDO TU TOMA BANHO TU LAVA O BRIOCO DIREITO? RESPONDE RAPIDO.",
        "TU QUER QUE EU TE DÊ O PAPO RETO?",
        "VOU TE DAR O PAPO RETO PODE?",
        "MANO TU ACHA QUE TRABALHO PRA TU?",
        "QUER PAPO RETO OU MIRONGA?",
        "QUANTO TIROS TU JA LEVOU?",
        "TU TÁ ME OLHANDO ASSIM POR QUÊ? PERDEU O RUMO DA PISTA?",
        "QUER QUE EU DESENHE OU TU JÁ ENTENDEU A VISÃO, RELÍQUIA?",
        "SE TU FOSSE UM FUZIL, SERIA UM 762 OU UM 556? RESPONDE SEM PENSAR!",
        "TÁ MUITO CURIOSO, CADÊ A POSTURA? SEGURA A ONDA AÍ...",
        "TU ACHA QUE A SELVA DO URSO É PRA QUALQUER UM? OLHA LÁ, EM!"
      ];
      const selected = provocacoes[Math.floor(Math.random() * provocacoes.length)];
      return new Response(JSON.stringify({ content: selected, nearLimit: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // IMAGENS DESATIVADAS A PEDIDO DO USUÁRIO

    await supabaseClient.from('profiles').update({ daily_msg_count: (profile.daily_msg_count || 0) + 1 }).eq('id', userId)

    const nearLimit = (userLimit - profile.daily_msg_count) <= 4;

    return new Response(JSON.stringify({ content: aiMessage, nearLimit }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
