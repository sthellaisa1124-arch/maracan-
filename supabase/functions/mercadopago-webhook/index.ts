import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    let body: any = {};
    try { body = await req.json(); } catch(e) {}

    const url = new URL(req.url);
    const paymentId = body?.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id');
    const type = body?.type || url.searchParams.get('type') || 'payment';

    console.log(`WEBHOOK — type: ${type} | payment_id: ${paymentId}`);
    console.log('BODY COMPLETO:', JSON.stringify(body));

    if (type !== 'payment' || !paymentId) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
    }

    // 1. Buscar detalhes reais no Mercado Pago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${mpAccessToken}` }
    });
    const payment = await mpRes.json();

    console.log(`PAGAMENTO ${paymentId} — status: ${payment.status} | preference_id: ${payment.preference_id}`);

    if (payment.status !== 'approved') {
      return new Response(JSON.stringify({ ok: true, status: payment.status }), { status: 200 });
    }

    // 2. Usar o preference_id para encontrar o log e creditar via RPC confirm_payment
    const preferenceId = payment.preference_id;
    if (!preferenceId) {
      console.error('preference_id ausente no pagamento!');
      return new Response(JSON.stringify({ ok: false, error: 'no_preference_id' }), { status: 200 });
    }

    // 3. Chamar a RPC confirm_payment que faz tudo: atualiza o log E credita o saldo
    const { data: rpcData, error: rpcError } = await supabase.rpc('confirm_payment', {
      p_external_id: preferenceId,
      p_provider: 'mercadopago'
    });

    if (rpcError) {
      console.error('ERRO NA RPC confirm_payment:', JSON.stringify(rpcError));
      throw rpcError;
    }

    console.log('RESULTADO DA RPC:', JSON.stringify(rpcData));

    if (!rpcData?.success) {
      console.error('RPC retornou falha:', rpcData?.error);
    } else {
      console.log('✅ MORAIS CREDITADOS COM SUCESSO!');
    }

    return new Response(JSON.stringify({ ok: true, result: rpcData }), { status: 200 });

  } catch (err: any) {
    console.error('ERRO CRÍTICO NO WEBHOOK:', err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 200 });
  }
})
