import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!mpAccessToken) {
      throw new Error('A chave MERCADOPAGO_ACCESS_TOKEN não foi configurada nos Secrets! 😱');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const { amount, moralAmount, userId, userName } = body

    console.log("DADOS RECEBIDOS MERCADO PAGO:", { amount, moralAmount, userId, userName });

    if (!amount || !userId) {
      throw new Error(`Dados incompletos! Amount: ${amount}, User: ${userId}`);
    }

    const origin = req.headers.get('origin') || 'https://vellar-teal.vercel.app';

    // 1. Criar Preferência no Mercado Pago
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            title: `${moralAmount} Morais - Vellar App`,
            description: `Crédito de moedas virtuais para a plataforma Vellar`,
            quantity: 1,
            unit_price: Number(amount),
            currency_id: 'BRL'
          }
        ],
        payer: {
          name: userName || 'Usuário Vellar',
          email: `${userId}@vellar.app` // Email fictício se não tivermos o real
        },
        back_urls: {
          success: `${origin}/?payment=success`,
          failure: `${origin}/?payment=cancel`,
          pending: `${origin}/?payment=pending`
        },
        auto_return: 'approved',
        notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
        metadata: {
          user_id: userId,
          moral_amount: moralAmount,
          reais_amount: amount
        },
        payment_methods: {
          excluded_payment_types: [
            { id: 'ticket' } // Remove boleto se quiser apenas PIX/Cartão
          ],
          installments: 12
        }
      })
    });

    const preference = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("ERRO API MERCADO PAGO:", preference);
      throw new Error(preference.message || 'Erro ao criar preferência no Mercado Pago');
    }

    // 2. Registrar no banco de dados (payment_logs)
    const { error: dbError } = await supabase
      .from('payment_logs')
      .insert({
        user_id: userId,
        amount_reais: amount,
        moral_amount: moralAmount,
        external_id: preference.id, // ID da preferência
        status: 'pending',
        payload: preference
      })

    if (dbError) {
      console.error("Erro ao gravar log de pagamento:", dbError)
    }

    return new Response(
      JSON.stringify({ url: preference.init_point, id: preference.id }),
      { 
        status: 200, 
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
      }
    )

  } catch (err: any) {
    console.error("ERRO NO CHECKOUT MERCADO PAGO:", err.message);
    
    return new Response(
      JSON.stringify({ 
        error: err.message,
        details: "Erro na integração com Mercado Pago."
      }),
      { 
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, 
        status: 400 
      }
    )
  }
})
