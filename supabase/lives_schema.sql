-- ── TABELA DE SESSÕES DE LIVE ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.live_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'Minha Live de Cria',
    is_live BOOLEAN DEFAULT true,
    viewer_count INTEGER DEFAULT 0,
    agora_channel TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

-- ── SEGURANÇA (RLS) ───────────────────────────────────────────
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

-- QUALQUER UM PODE VER LIVES ATIVAS
CREATE POLICY "Public can view active lives" 
ON public.live_sessions FOR SELECT 
USING (is_live = true AND ended_at IS NULL);

-- APENAS O HOST PODE CRIAR SUA LIVE
CREATE POLICY "Hosts can create their own live" 
ON public.live_sessions FOR INSERT 
WITH CHECK (auth.uid() = host_id);

-- APENAS O HOST PODE ENCERRAR OU ATUALIZAR SUA LIVE
CREATE POLICY "Hosts can update their own live" 
ON public.live_sessions FOR UPDATE 
USING (auth.uid() = host_id);

-- ── HABILITAR REALTIME NO SQL EDITOR ──
-- alter publication supabase_realtime add table live_sessions;
