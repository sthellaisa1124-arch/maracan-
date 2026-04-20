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
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeKey) {
      throw new Error('A chave STRIPE_SECRET_KEY não foi configurada nos Secrets do Supabase! 😱');
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2022-11-15',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const body = await req.json()
    const { amount, moralAmount, userId, userName } = body

    console.log("DADOS RECEBIDOS NO CHECKOUT:", { amount, moralAmount, userId, userName });

    if (!amount || !userId) {
      throw new Error(`Dados incompletos! Amount: ${amount}, User: ${userId}`);
    }

    const origin = req.headers.get('origin') || 'https://vellar-teal.vercel.app';

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
            },
            unit_amount: Math.round(amount * 100), // Stripe usa centavos
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/?payment=success`,
      cancel_url: `${origin}/?payment=cancel`,
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

  } catch (err: any) {
    console.error("ERRO NO CHECKOUT STRIPE:", err.message);
    
    return new Response(
      JSON.stringify({ 
        error: err.message,
        details: err.raw?.message || "Erro desconhecido na API da Stripe."
      }),
      { 
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, 
        status: 400 
      }
    )
  }
})
