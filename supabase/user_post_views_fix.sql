-- 1. Garante que a tabela user_post_views existe (caso não exista por completo)
CREATE TABLE IF NOT EXISTS public.user_post_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  post_id UUID REFERENCES public.user_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, post_id) -- Garante que registra 1 view por cara
);

-- 2. Habilita o RLS
ALTER TABLE public.user_post_views ENABLE ROW LEVEL SECURITY;

-- 3. Limpa políticas velhas para não bugar
DROP POLICY IF EXISTS "Qualquer um pode ver as views" ON public.user_post_views;
DROP POLICY IF EXISTS "Usuários podem registrar views" ON public.user_post_views;

-- 4. Cria Políticas ZERADAS
-- Politica SELECT: Todo mundo pode ler a contagem
CREATE POLICY "Qualquer um pode ver as views" ON public.user_post_views
  FOR SELECT USING (true);

-- Politica INSERT: O cara logado insere o próprio view apenas
CREATE POLICY "Usuários podem registrar views" ON public.user_post_views
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Dar as permissões do nível de banco (CRÍTICO PARA O ERRO 403)
GRANT ALL ON TABLE public.user_post_views TO authenticated;
GRANT ALL ON TABLE public.user_post_views TO service_role;
GRANT SELECT ON TABLE public.user_post_views TO anon;
