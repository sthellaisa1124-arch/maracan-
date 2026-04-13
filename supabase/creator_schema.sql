-- =====================================================
-- ÁREA DO CRIADOR — Script SQL
-- Cole e execute no SQL Editor do Supabase
-- =====================================================

-- 1. Tabela de Métricas Diárias do Criador
CREATE TABLE IF NOT EXISTS creator_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  profile_views INTEGER DEFAULT 0,
  total_likes INTEGER DEFAULT 0,
  total_video_views INTEGER DEFAULT 0,
  total_gifts_received INTEGER DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- RLS para creator_analytics
ALTER TABLE creator_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê suas próprias métricas"
  ON creator_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuário insere suas métricas"
  ON creator_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário atualiza suas métricas"
  ON creator_analytics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins veem tudo em creator_analytics"
  ON creator_analytics FOR ALL
  USING (is_admin());

-- 2. Tabela de Solicitações de Selo de Criador
CREATE TABLE IF NOT EXISTS creator_badge_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  followers_snapshot INTEGER DEFAULT 0,
  video_views_snapshot INTEGER DEFAULT 0,
  videos_last_7days INTEGER DEFAULT 0,
  creator_level INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES profiles(id)
);

-- RLS para creator_badge_requests
ALTER TABLE creator_badge_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê suas próprias solicitações"
  ON creator_badge_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuário cria sua solicitação"
  ON creator_badge_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins gerenciam solicitações"
  ON creator_badge_requests FOR ALL
  USING (is_admin());
