import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    console.log("Recebendo Webhook PushinPay:", body)

    // A PushinPay envia o status no campo 'status'
    // Comum: 'paid', 'completed', 'canceled'
    const status = body.status
    const transactionId = body.id || body.transaction_id

    if (!transactionId) {
       return new Response(JSON.stringify({ error: "No transaction ID" }), { 
         status: 400, 
         headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
       })
    }

    // 1. Buscar o log da compra
    const { data: log, error: logError } = await supabase
      .from('moral_purchases_log')
      .select('*')
      .eq('external_id', transactionId)
      .single()

    if (logError || !log) {
      console.error("Compra não encontrada no log local:", transactionId)
      return new Response(JSON.stringify({ error: "Purchase log not found" }), { 
        status: 404, 
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
      })
    }

    // Se já foi completado, ignora (evita double spend)
    if (log.status === 'completed') {
      return new Response(JSON.stringify({ message: "Already processed" }), { 
        status: 200, 
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
      })
    }

    // 2. Se o pagamento foi confirmado
    if (status === 'paid' || status === 'completed') {
       console.log(`Confirmando pagamento para usuário ${log.user_id} - ${log.amount} Morais`)

       // Atualizar status do log
       await supabase
         .from('moral_purchases_log')
         .update({ status: 'completed', updated_at: new Date().toISOString() })
         .eq('id', log.id)

       // Creditar as Morais usando a função RPC purchase_moral
       const { error: rpcError } = await supabase.rpc('purchase_moral', {
         p_user_id: log.user_id,
         p_amount: log.amount,
         p_reais: log.reais
       })

       if (rpcError) {
         console.error("Erro ao creditar Morais via RPC:", rpcError)
         throw rpcError
       }

       return new Response(JSON.stringify({ success: true, message: "Moral credited!" }), { 
         status: 200, 
         headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
       })
    }

    // Se o pagamento falhou ou expirou
    if (status === 'canceled' || status === 'expired' || status === 'failed') {
      await supabase
        .from('moral_purchases_log')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', log.id)
    }

    return new Response(JSON.stringify({ message: "Webhook received" }), { 
      status: 200, 
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
    })

  } catch (error: any) {
    console.error("Erro no Webhook:", error.message)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
    })
  }
})
