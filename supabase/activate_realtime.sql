-- ==========================================
-- ATIVAÇÃO DE REALTIME SUPABASE (PAPO RETO) 🏙️🚀
-- ==========================================

-- 1. Certificar que a publicação 'supabase_realtime' existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- 2. Adicionar as tabelas críticas para o tempo real
-- Isso faz com que o Supabase avise o app no milissegundo que o dado muda!
DO $$
DECLARE
  v_table TEXT;
  v_tables TEXT[] := ARRAY['direct_messages', 'notifications', 'chat_groups', 'group_members', 'profiles'];
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = v_table) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', v_table);
      EXCEPTION WHEN others THEN
        -- Se já estiver na publicação, ignoramos o erro
        NULL;
      END;
    END IF;
  END LOOP;
END $$;

-- 3. Configurar REPLICA IDENTITY FULL
-- (Necessário para que o Supabase envie o conteúdo antigo/novo completo em UPDATES e DELETES)
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- MENSAGEM DE SUCESSO
RAISE NOTICE 'Realtime ativado com sucesso nas tabelas críticas! 🏙️🔥';
