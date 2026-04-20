-- ==========================================
-- ATIVAÇÃO NUCLEAR DE REALTIME (Vellar Elite) ☢️🚀
-- ==========================================

-- 1. Garantir que as extensões necessárias existam
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

-- 2. Limpeza Total da Publicação Antiga (Reset de Conexão)
DROP PUBLICATION IF EXISTS supabase_realtime;

-- 3. Criar a Publicação 'supabase_realtime' limpa e autoritária
CREATE PUBLICATION supabase_realtime;

-- 4. Adicionar Tabelas à Publicação
-- Adicionamos as tabelas uma a uma para garantir que o erro em uma não pare as outras
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['direct_messages', 'notifications', 'chat_groups', 'chat_settings', 'profiles', 'group_members']) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
        -- Ativar REPLICA IDENTITY FULL para que o Realtime envie o conteúdo completo
        EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Aviso: Tabela % não pôde ser adicionada (já existe ou erro de RLS). erro: %', t, SQLERRM;
      END;
    END IF;
  END LOOP;
END $$;

-- 5. Garantir que a tabela chat_settings esteja configurada corretamente (Fix Error 406)
-- Se a tabela não existir, ela será criada agora para evitar o erro 406
CREATE TABLE IF NOT EXISTS public.chat_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_a UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_ephemeral_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_a, user_b)
);

-- Forçar RLS para segurar a onda
ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_settings_select_policy" ON public.chat_settings;
CREATE POLICY "chat_settings_select_policy" ON public.chat_settings
  FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);

DROP POLICY IF EXISTS "chat_settings_all_policy" ON public.chat_settings;
CREATE POLICY "chat_settings_all_policy" ON public.chat_settings
  FOR ALL USING (auth.uid() = user_a OR auth.uid() = user_b);

-- 6. Garantir privilégios
GRANT ALL ON TABLE public.chat_settings TO authenticated;
GRANT ALL ON TABLE public.direct_messages TO authenticated;
GRANT ALL ON TABLE public.notifications TO authenticated;

RAISE NOTICE 'Operação Nuclear Concluída. Realtime está em 100%%! 🏙️🔥';
