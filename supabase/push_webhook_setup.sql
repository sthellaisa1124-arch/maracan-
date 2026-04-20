-- ==========================================
-- GATILHO AUTOMÁTICO DE NOTIFICAÇÕES (WEBHOOK)
-- ==========================================

-- 1. Habilitar a extensão "net" se não estiver habilitada
-- (Isso permite que o banco faça requisições HTTP para a Edge Function)
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA "extensions";

-- 2. Função de disparo (Trigger Function)
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Chama a Edge Function 'notify-push' passando os dados da notificação
  -- Substitua 'YOUR_PROJECT_REF' pela referência do seu projeto se não estiver usando URL local
  PERFORM
    net.http_post(
      url := 'https://' || current_setting('request.headers')::json->>'x-forwarded-host' || '/functions/v1/notify-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('request.headers')::json->>'apikey'
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Nota: O comando acima usa a extensão pg_net (recomendada pelo Supabase)
-- Se preferir usar Webhooks via Painel do Supabase (mais fácil):
-- Vá em Database -> Webhooks -> Create New
-- Table: notifications
-- Events: INSERT
-- Type: HTTP POST
-- URL: Sua_URL_da_Edge_Function/notify-push
-- Headers: Authorization: Bearer SUA_ANON_KEY

-- 3. Criar o trigger na tabela notifications
DROP TRIGGER IF EXISTS on_notification_created_push ON public.notifications;
CREATE TRIGGER on_notification_created_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_notification();

COMMENT ON FUNCTION public.trigger_push_notification IS 'Dispara a Edge Function de Push sempre que um cria recebe uma notificação no banco.';
