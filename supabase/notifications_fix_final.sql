-- ==========================================
-- REPARO FINAL DE NOTIFICAÇÕES E REALTIME 🛠️🔥
-- ==========================================

-- 1. Adicionar coluna faltante (Causa do erro 400)
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS title TEXT;

-- 2. Refinar a Tabela de Configurações (Causa do erro 406)
-- Garante que o nome seja exatamente chat_settings e as políticas permitam leitura/escrita
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_settings') THEN
    CREATE TABLE public.chat_settings (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_a UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
      user_b UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
      is_ephemeral_active BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(user_a, user_b)
    );
  END IF;
END $$;

ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_settings_select_policy" ON public.chat_settings;
CREATE POLICY "chat_settings_select_policy" ON public.chat_settings
  FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);

DROP POLICY IF EXISTS "chat_settings_insert_policy" ON public.chat_settings;
CREATE POLICY "chat_settings_insert_policy" ON public.chat_settings
  FOR INSERT WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

DROP POLICY IF EXISTS "chat_settings_update_policy" ON public.chat_settings;
CREATE POLICY "chat_settings_update_policy" ON public.chat_settings
  FOR UPDATE USING (auth.uid() = user_a OR auth.uid() = user_b);

-- 3. Blindar o Gatilho de Push (Garante que a função seja chamada)
CREATE OR REPLACE FUNCTION public.trigger_push_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Usamos PERFORM net.http_post de forma assíncrona
  -- O link abaixo é o link direto do seu projeto que vimos no print
  PERFORM
    net.http_post(
      url := 'https://dculnqqyxqtdynmcvqxk.supabase.co/functions/v1/notify-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || COALESCE(current_setting('request.headers', true)::jsonb->>'apikey', '')
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Em caso de erro no disparo, não travamos a inserção da notificação
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-aplicar o trigger
DROP TRIGGER IF EXISTS on_notification_created_push ON public.notifications;
CREATE TRIGGER on_notification_created_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_notification();

RAISE NOTICE 'Reparo Final Concluído! O caminho para as notificações está livre. 🚀🏙️';
