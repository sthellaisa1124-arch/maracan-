-- Adicionando a coluna title à tabela de notificações para suportar notificações profissionais
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='title') THEN
    ALTER TABLE notifications ADD COLUMN title TEXT;
  END IF;
END $$;

-- Garantir que as permissões continuem corretas
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;
