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
    if (!mpAccessToken) throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado!');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const { amount, moralAmount, userId, userName, userEmail } = body

    if (!amount || !userId) throw new Error('Dados incompletos!');

    const origin = req.headers.get('origin') || 'https://vellar-teal.vercel.app';

    // Criar Preferência no Mercado Pago (Checkout Pro)
    // Isso mostra a tela completa com PIX + Cartão de Crédito + Débito
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            id: `moral-${moralAmount}`,
            title: `${moralAmount} Morais - Vellar App`,
            description: 'Créditos para usar na plataforma Vellar',
            unit_price: Number(amount),
            quantity: 1,
            currency_id: 'BRL'
          }
        ],
        payer: {
          email: userEmail || `vellar.user.${userId.substring(0, 8)}@gmail.com`,
          name: userName || 'Usuário Vellar'
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
          moral_amount: String(moralAmount),
          reais_amount: String(amount)
        },
        payment_methods: {
          default_payment_method_id: 'pix',
          installments: 1
        }
      })

    });

    const preference = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("ERRO MP:", preference);
      throw new Error(preference.message || 'Erro ao criar preferência no Mercado Pago');
    }

    console.log(`PREFERÊNCIA CRIADA: ${preference.id} para user ${userId}`);

    // Salvar no banco com o ID da PREFERÊNCIA (é o que o webhook vai receber)
    const { error: dbError } = await supabase.from('payment_logs').insert({
      user_id: userId,
      amount_reais: amount,
      moral_amount: moralAmount,
      external_id: preference.id, // ID da preferência do MP
      status: 'pending'
    });

    if (dbError) console.error("Erro ao salvar log:", dbError);

    return new Response(
      JSON.stringify({ url: preference.init_point, id: preference.id }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error("ERRO NO CHECKOUT:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
