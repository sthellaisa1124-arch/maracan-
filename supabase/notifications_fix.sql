-- AJUSTE FINAL DE SINTAXE DE NOTIFICAÇÕES 🏙️🔔

-- 1. Garante a estrutura da tabela
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  post_id UUID,
  message TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Garante que as colunas existam (Add se faltar)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='type') THEN
    ALTER TABLE notifications ADD COLUMN type TEXT NOT NULL DEFAULT 'system';
  END IF;
END $$;

-- 3. Habilita RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 4. LIMPA AS POLÍTICAS ANTIGAS (Garante que não tenha erro de 'Policy already exists')
DROP POLICY IF EXISTS "Usuários veem suas notificações" ON notifications;
DROP POLICY IF EXISTS "Usuários gerenciam suas notificações" ON notifications;
DROP POLICY IF EXISTS "Qualquer um logado notifica outro" ON notifications;
DROP POLICY IF EXISTS "Usuários atualizam notificações" ON notifications;
DROP POLICY IF EXISTS "Usuários deletam notificações" ON notifications;

-- 5. NOVAS POLÍTICAS COM SINTAXE DE ELITE (Separadas por ação)

-- POLÍTICA 1: O dono vê suas notificações
CREATE POLICY "Usuários veem suas notificações" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- POLÍTICA 2: O dono marca como lida (UPDATE)
CREATE POLICY "Usuários atualizam notificações" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- POLÍTICA 3: O dono deleta a notificação (DELETE)
CREATE POLICY "Usuários deletam notificações" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- POLÍTICA 4: Qualquer um logado pode CRIAR uma notificação para outro (INSERT)
CREATE POLICY "Qualquer um logado notifica outro" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- 6. HABILITAR REALTIME (CRÍTICO PARA AS NOTIFICAÇÕES CHEGAREM SEM ATUALIZAR A PÁGINA)
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

-- 7. GARANTIR PERMISSÕES DO BANCO (CRÍTICO)
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;


