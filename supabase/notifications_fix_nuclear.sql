-- NUCLEAR RESET DAS NOTIFICAÇÕES ☢️
-- 1. Destrói a tabela antiga que pode estar com estrutura errada
DROP TABLE IF EXISTS public.notifications;

-- 2. Cria a tabela perfeitamente estruturada e moderna
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  post_id UUID,
  message TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Habilita RLS de segurança e zera políticas
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários veem suas notificações" ON public.notifications;
DROP POLICY IF EXISTS "Usuários atualizam notificações" ON public.notifications;
DROP POLICY IF EXISTS "Usuários deletam notificações" ON public.notifications;
DROP POLICY IF EXISTS "Qualquer um logado notifica outro" ON public.notifications;

-- 4. Setando Políticas Perfeitas
CREATE POLICY "Usuários veem suas notificações" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários atualizam notificações" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuários deletam notificações" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Qualquer um logado notifica outro" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- 5. RELIGAMENTO DO REALTIME SUPABASE
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;

-- 6. Garantindo privilégio inegável de banco!
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;
