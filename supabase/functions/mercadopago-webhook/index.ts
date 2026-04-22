import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url);
    // O Mercado Pago envia o ID via query params ou body
    const id = url.searchParams.get('data.id') || url.searchParams.get('id');
    const type = url.searchParams.get('type') || 'payment';

    console.log(`WEBHOOK RECEBIDO: Type=${type}, ID=${id}`);

    if (type === 'payment' && id) {
      const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
      
      // Consultar o status real do pagamento no Mercado Pago
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`
        }
      });

      const paymentData = await mpResponse.json();

      if (paymentData.status === 'approved') {
        const externalId = paymentData.order?.id || paymentData.preference_id;
        
        console.log("PAGAMENTO APROVADO! Processando...", {
          paymentId: id,
          externalId,
          status: paymentData.status
        });

        // Chamar a RPC confirm_payment que já existe no seu banco de dados
        // Ela lida com: atualizar log, creditar saldo e gerar transação
        const { data, error } = await supabase.rpc('confirm_payment', {
          p_external_id: externalId,
          p_provider: 'mercadopago'
        });

        if (error) {
          console.error("Erro ao confirmar pagamento no banco:", error);
          throw error;
        }

        console.log("RESULTADO RPC:", data);
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });

  } catch (err: any) {
    console.error("ERRO NO WEBHOOK:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
})
