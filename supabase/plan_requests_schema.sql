-- TABELA DE PEDIDOS DE PLANO
CREATE TABLE IF NOT EXISTS public.plan_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL,
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'rejeitado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- HABILITAR RLS
ALTER TABLE public.plan_requests ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS
-- Usuários podem ver seus próprios pedidos
CREATE POLICY "Users can see their own requests"
ON public.plan_requests FOR SELECT
USING (auth.uid() = user_id);

-- Usuários podem criar pedidos
CREATE POLICY "Users can create requests"
ON public.plan_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins podem fazer tudo
CREATE POLICY "Admins can do everything on plan_requests"
ON public.plan_requests FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
    )
);

-- TRIGGERS E NOTIFICAÇÕES (Opcional, mas bom para debug)
COMMENT ON TABLE public.plan_requests IS 'Tabela que armazena os pedidos de upgrade de plano via Pix.';
