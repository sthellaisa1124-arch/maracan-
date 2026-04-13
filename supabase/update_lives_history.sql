-- ── ATUALIZAÇÃO DA TABELA DE LIVES PARA HISTÓRICO E METRICAS (ESTILO TIKTOK) ──
ALTER TABLE public.live_sessions 
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS is_18plus BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS total_gifts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_likes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_followers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_viewers INTEGER DEFAULT 0;

-- Atualizando a política de segurança da tabela para permitir que o dono sempre veja seu histórico de lives (mesmo após is_live ser false)
DROP POLICY IF EXISTS "Public can view active lives" ON public.live_sessions;

-- 1. Qualquer pessoa só ver a live se ela estiver ativa (Público)
CREATE POLICY "Public can view active lives" 
ON public.live_sessions FOR SELECT 
USING (is_live = true AND ended_at IS NULL);

-- 2. O dono (host) pode puxar o histórico COMPLETO (ativas e encerradas) em sua própria aba de Criador
CREATE POLICY "Hosts can view their own live history"
ON public.live_sessions FOR SELECT
USING (auth.uid() = host_id);
