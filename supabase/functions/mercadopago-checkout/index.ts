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
      throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado!');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const { amount, moralAmount, userId, userName, userEmail } = body

    if (!amount || !userId) {
      throw new Error(`Dados incompletos!`);
    }

    // Gerar pagamento PIX diretamente via API (sem redirecionar para fora)
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `vellar-${userId}-${Date.now()}` // Evita pagamentos duplicados
      },
      body: JSON.stringify({
        transaction_amount: Number(amount),
        description: `${moralAmount} Morais - Vellar App`,
        payment_method_id: 'pix',
        payer: {
          email: userEmail || `user.${userId.substring(0, 8)}@vellar.app`,
          first_name: (userName || 'Usuario').split(' ')[0],
          last_name: (userName || 'Vellar').split(' ').slice(1).join(' ') || 'Vellar',
          identification: {
            type: 'CPF',
            number: '00000000000' // Placeholder — o Mercado Pago aceita para PIX
          }
        },
        notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`
      })
    });

    const payment = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("ERRO MP:", payment);
      throw new Error(payment.message || payment.cause?.[0]?.description || 'Erro ao gerar PIX no Mercado Pago');
    }

    const pixData = payment.point_of_interaction?.transaction_data;

    if (!pixData?.qr_code) {
      throw new Error('PIX não foi gerado corretamente. Verifique a conta do Mercado Pago.');
    }

    // Registrar no banco
    await supabase.from('payment_logs').insert({
      user_id: userId,
      amount_reais: amount,
      moral_amount: moralAmount,
      external_id: String(payment.id), // ID do PAGAMENTO (não da preferência)
      status: 'pending',
      pix_code: pixData.qr_code,
      pix_qr_url: pixData.qr_code_base64 ? `data:image/png;base64,${pixData.qr_code_base64}` : null
    });

    return new Response(
      JSON.stringify({
        payment_id: payment.id,
        pix_code: pixData.qr_code,
        pix_qr_base64: pixData.qr_code_base64,
        status: payment.status,
        expires_at: payment.date_of_expiration
      }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error("ERRO NO CHECKOUT PIX:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
