import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let body: any = {};
    try { body = await req.json(); } catch(e) {}
    
    const url = new URL(req.url);
    const paymentId = body?.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id');
    const type = body?.type || url.searchParams.get('type') || 'payment';

    console.log(`WEBHOOK RECEBIDO - Tipo: ${type}, Payment ID: ${paymentId}`);

    if (type === 'payment' && paymentId) {
      const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
      
      // Consultar status real no Mercado Pago
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${mpAccessToken}` }
      });

      const payment = await mpResponse.json();
      console.log(`STATUS: ${payment.status} | ID: ${paymentId}`);

      if (payment.status === 'approved') {
        // Buscar o log de pagamento pelo ID do pagamento (external_id = payment.id)
        const { data: logData, error: logError } = await supabase
          .from('payment_logs')
          .select('*')
          .eq('external_id', String(paymentId))
          .eq('status', 'pending')
          .single();

        if (logError || !logData) {
          console.error('Log de pagamento não encontrado para ID:', paymentId);
          // Retornamos 200 para o MP não ficar reenviando
          return new Response(JSON.stringify({ success: false, reason: 'log_not_found' }), { status: 200 });
        }

        console.log('LOG ENCONTRADO:', logData);

        // Atualizar o log para 'paid'
        await supabase
          .from('payment_logs')
          .update({ status: 'paid' })
          .eq('id', logData.id);

        // Creditar o saldo usando a RPC existente
        const { data: rpcData, error: rpcError } = await supabase.rpc('purchase_moral', {
          p_user_id: logData.user_id,
          p_amount: logData.moral_amount,
          p_reais: logData.amount_reais
        });

        if (rpcError) {
          console.error('ERRO NA RPC purchase_moral:', rpcError);
          throw rpcError;
        }

        console.log('MOEDAS CREDITADAS COM SUCESSO!', rpcData);
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (err: any) {
    console.error("ERRO NO WEBHOOK:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 200 });
  }
})
