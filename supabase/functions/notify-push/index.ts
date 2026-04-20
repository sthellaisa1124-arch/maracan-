import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import webpush from 'https://esm.sh/web-push@3.6.6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { record } = await req.json()
    if (!record || !record.user_id) throw new Error('Dados da notificação ausentes.')

    // 1. Buscar inscrições de push do usuário alvo
    const { data: subscriptions, error: subError } = await supabaseClient
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', record.user_id)

    if (subError) throw subError
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhuma inscrição de push encontrada para este cria.' }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 2. Configurar VAPID (Deve estar nos Secrets do Supabase)
    const publicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const privateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const subject = 'mailto:suporte@vellar.app'

    if (!publicKey || !privateKey) {
      throw new Error('Chaves VAPID não configuradas nos Secrets (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)')
    }

    // 3. Buscar dados do remetente para enriquecer a notificação
    let senderName = 'Vellar'
    let senderAvatar = 'https://dculnqqyxqtdynmcvqxk.supabase.co/storage/v1/object/public/system/vellar-icon-192.png'
    
    if (record.from_user_id) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', record.from_user_id)
        .single()
      
      if (profile) {
        senderName = profile.username || 'Cria'
        senderAvatar = profile.avatar_url || senderAvatar
      }
    }

    // 4. Preparar o conteúdo da notificação (Padrão Elite)
    const payload = JSON.stringify({
      title: senderName,
      message: record.message || 'Mandou algo novo na pista!',
      avatar_url: senderAvatar,
      from_user_id: record.from_user_id,
      url: record.post_id ? `/post/${record.post_id}` : '/direct',
      tag: record.from_user_id ? `msg-${record.from_user_id}` : 'system'
    })

    // 4. Enviar para todos os dispositivos inscritos
    const pushPromises = subscriptions.map(sub => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      }

      return webpush.sendNotification(pushConfig, payload, {
        vapidDetails: { subject, publicKey, privateKey }
      }).catch(err => {
        console.error(`Erro ao enviar para endpoint ${sub.endpoint}:`, err)
        // Se o erro for 410 (Inscrição expirada/revogada), podemos deletar do banco
        if (err.statusCode === 410 || err.statusCode === 404) {
          return supabaseClient.from('push_subscriptions').delete().eq('id', sub.id)
        }
      })
    })

    await Promise.all(pushPromises)

    return new Response(JSON.stringify({ success: true, count: subscriptions.length }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
