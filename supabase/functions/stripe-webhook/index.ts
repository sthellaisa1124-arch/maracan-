import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@12.0.0?target=deno"

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2022-11-15',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Pegar a assinatura da Stripe (crucial para segurança)
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      throw new Error('Nenhuma assinatura encontrada na requisição.')
    }

    const body = await req.text()
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
    
    let event
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
    } catch (err: any) {
      console.error(`Erro na validação do Webhook: ${err.message}`)
      return new Response(`Webhook Error: ${err.message}`, { status: 400 })
    }

    console.log(`Recebendo Evento Stripe: ${event.type}`)

    // PROCESSAR O PAGAMENTO CONCLUÍDO
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const externalId = session.id
      
      console.log(`Pagamento confirmado! Session ID: ${externalId}`)

      // Chamar a função SQL confirm_payment que já criamos no banco
      const { data, error } = await supabase.rpc('confirm_payment', {
        p_external_id: externalId,
        p_provider: 'stripe'
      })

      if (error) {
        console.error("Erro ao rodar confirm_payment RPC:", error)
        throw error
      }

      console.log("Resultado da confirmação no banco:", data)

      return new Response(JSON.stringify({ success: true, db_result: data }), { 
        status: 200, 
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } 
      })
    }

    return new Response(JSON.stringify({ received: true }), { 
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
