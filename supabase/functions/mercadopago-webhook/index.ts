import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    // Ler o body do webhook
    let body: any = {};
    try { body = await req.json(); } catch(e) {}

    const url = new URL(req.url);
    const paymentId = body?.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id');
    const type = body?.type || url.searchParams.get('type') || 'payment';

    console.log(`WEBHOOK — type: ${type} | payment_id: ${paymentId}`);

    if (type !== 'payment' || !paymentId) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), { status: 200 });
    }

    // 1. Buscar os detalhes reais do pagamento no Mercado Pago
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${mpAccessToken}` }
    });
    const payment = await mpRes.json();

    console.log(`PAGAMENTO ${paymentId} — status: ${payment.status} | preference_id: ${payment.preference_id}`);

    if (payment.status !== 'approved') {
      // Pagamento ainda não aprovado, ignora por agora
      return new Response(JSON.stringify({ ok: true, status: payment.status }), { status: 200 });
    }

    // 2. Usar o preference_id para achar o log no nosso banco
    const preferenceId = payment.preference_id;
    if (!preferenceId) {
      console.error('preference_id não encontrado no pagamento!');
      return new Response(JSON.stringify({ ok: false, error: 'no_preference_id' }), { status: 200 });
    }

    const { data: logData, error: logError } = await supabase
      .from('payment_logs')
      .select('*')
      .eq('external_id', preferenceId)
      .eq('status', 'pending')
      .maybeSingle();

    if (logError || !logData) {
      console.error(`Log NÃO encontrado para preference_id: ${preferenceId}`, logError);
      return new Response(JSON.stringify({ ok: false, error: 'log_not_found' }), { status: 200 });
    }

    console.log(`LOG ENCONTRADO: user_id=${logData.user_id}, moral=${logData.moral_amount}`);

    // 3. Marcar como pago ANTES de creditar (evita duplicatas)
    const { error: updateError } = await supabase
      .from('payment_logs')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', logData.id);

    if (updateError) {
      console.error('Erro ao atualizar status:', updateError);
      throw updateError;
    }

    // 4. Creditar os Morais na conta do usuário
    const { data: rpcData, error: rpcError } = await supabase.rpc('purchase_moral', {
      p_user_id: logData.user_id,
      p_amount: logData.moral_amount,
      p_reais: logData.amount_reais
    });

    if (rpcError) {
      console.error('Erro na RPC purchase_moral:', rpcError);
      // Reverter status para 'pending' para tentar novamente
      await supabase.from('payment_logs').update({ status: 'pending' }).eq('id', logData.id);
      throw rpcError;
    }

    console.log('✅ MORAIS CREDITADOS COM SUCESSO!', rpcData);

    return new Response(JSON.stringify({ ok: true, credited: logData.moral_amount }), { status: 200 });

  } catch (err: any) {
    console.error('ERRO CRÍTICO NO WEBHOOK:', err.message);
    // Retornamos 200 para o Mercado Pago não ficar reenviando infinitamente em caso de erro de lógica
    return new Response(JSON.stringify({ error: err.message }), { status: 200 });
  }
})
