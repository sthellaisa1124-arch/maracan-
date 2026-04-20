-- ==========================================
-- SISTEMA DE NOTIFICAÇÕES PUSH (WEB PUSH)
-- ==========================================

-- 1. Tabela para armazenar as inscrições (Subscription) de cada navegador/dispositivo
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, endpoint) -- Evita duplicidade do mesmo navegador
);

-- 2. Habilitar RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança (Só o usuário mexe nas suas inscrições)
DROP POLICY IF EXISTS "Usuários gerenciam suas próprias inscrições" ON public.push_subscriptions;
CREATE POLICY "Usuários gerenciam suas próprias inscrições" ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- 4. Garantir permissões básicas
GRANT ALL ON TABLE public.push_subscriptions TO authenticated;
GRANT ALL ON TABLE public.push_subscriptions TO service_role;

-- 5. Comentário de ajuda
COMMENT ON TABLE public.push_subscriptions IS 'Tokens de navegadores para envio de notificações Push (PWA).';
