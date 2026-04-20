import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2022-11-15',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { amount, moralAmount, userId, userName } = await req.json()

    if (!amount || !userId) {
      throw new Error('Aonde tu vai sem o valor ou o ID do usuário, cria? 🤨')
    }

    console.log(`Iniciando Checkout Stripe para: ${userName} - R$ ${amount}`)

    // Criar a Sessão de Checkout na Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'pix'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: `${moralAmount} Morais - Vellar App`,
              description: `Crédito de moedas virtuais para a plataforma Vellar`,
              // images: ['https://vellar.app/logo.png'], // Opcional
            },
            unit_amount: Math.round(amount * 100), // Stripe usa centavos
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.get('origin')}/?payment=success`,
      cancel_url: `${req.headers.get('origin')}/?payment=cancel`,
      metadata: {
        userId: userId,
        moralAmount: moralAmount.toString(),
        reaisAmount: amount.toString()
      },
    })

    // REGISTRAR NO BANCO DE DADOS (payment_logs)
    const { error: dbError } = await supabase
      .from('payment_logs')
      .insert({
        user_id: userId,
        amount_reais: amount,
        moral_amount: moralAmount,
        external_id: session.id, // O ID da sessão da Stripe
        status: 'pending',
        payload: session
      })

    if (dbError) {
      console.error("Erro ao gravar log de pagamento:", dbError)
      // Não bloqueamos o checkout por erro de log, mas avisamos
    }

    return new Response(
      JSON.stringify({ url: session.url, id: session.id }),
      { 
        status: 200, 
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error: any) {
    console.error("Erro no Checkout:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
      }
    )
  }
})
