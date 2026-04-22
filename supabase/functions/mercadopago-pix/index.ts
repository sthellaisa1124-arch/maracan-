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

    // Gerar pagamento PIX diretamente via API Transparente V1
    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `vellar-pix-${userId}-${Date.now()}`
      },
      body: JSON.stringify({
        transaction_amount: Number(amount),
        description: `${moralAmount} Morais - Vellar App`,
        payment_method_id: 'pix',
        payer: {
          email: userEmail || `vellar.user.${userId.substring(0, 8)}@gmail.com`,
          // Precisamos preencher dados mínimos. Se der erro de nome, usamos fallback
          first_name: userName ? userName.split(' ')[0] : 'Usuário',
          last_name: userName ? userName.split(' ').slice(1).join(' ') || 'Vellar' : 'Vellar',
        },
        notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`
      })
    });

    const payment = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("ERRO MP PIX:", payment);
      throw new Error(payment.message || payment.cause?.[0]?.description || 'Erro ao gerar PIX no Mercado Pago');
    }

    const pixData = payment.point_of_interaction?.transaction_data;

    if (!pixData?.qr_code) {
      throw new Error('QR Code PIX não foi gerado pelo Mercado Pago. Verifique as configurações de conta.');
    }

    // Registrar no log - ID DO PAGAMENTO do v1/payments
    const { error: dbError } = await supabase.from('payment_logs').insert({
      user_id: userId,
      amount_reais: amount,
      moral_amount: moralAmount,
      external_id: String(payment.id),
      status: 'pending',
      pix_code: pixData.qr_code,
      pix_qr_url: pixData.qr_code_base64 ? `data:image/png;base64,${pixData.qr_code_base64}` : null
    });

    if (dbError) console.error("Erro ao salvar log de PIX:", dbError);

    return new Response(
      JSON.stringify({ 
        payment_id: String(payment.id), 
        pix_code: pixData.qr_code,
        pix_qr_base64: pixData.qr_code_base64
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
