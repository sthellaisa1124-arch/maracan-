-- =====================================================
-- CORREÇÃO DE RLS + MARCAÇÕES EM STORIES (STATUS TAGS)
-- Execute no SQL Editor do Supabase
-- =====================================================

-- 1. GARANTIR QUE status_posts TEM RLS CORRETA
-- (Se a tabela não existir, crie ela primeiro)
CREATE TABLE IF NOT EXISTS public.status_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('text', 'image', 'video')) NOT NULL DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.status_posts ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Stories são públicos" ON public.status_posts;
DROP POLICY IF EXISTS "Dono cria story" ON public.status_posts;
DROP POLICY IF EXISTS "Dono deleta story" ON public.status_posts;

-- Políticas corretas
CREATE POLICY "Stories são públicos" ON public.status_posts
  FOR SELECT USING (true);

CREATE POLICY "Dono cria story" ON public.status_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Dono deleta story" ON public.status_posts
  FOR DELETE USING (auth.uid() = user_id);

-- 2. GARANTIR QUE status_views TEM RLS CORRETA
CREATE TABLE IF NOT EXISTS public.status_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  status_id UUID REFERENCES status_posts(id) ON DELETE CASCADE NOT NULL,
  viewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(status_id, viewer_id)
);

ALTER TABLE public.status_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Views são públicas" ON public.status_views;
DROP POLICY IF EXISTS "Usuários registram view" ON public.status_views;

CREATE POLICY "Views são públicas" ON public.status_views
  FOR SELECT USING (true);

CREATE POLICY "Usuários registram view" ON public.status_views
  FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- 3. GARANTIR QUE status_likes TEM RLS CORRETA
CREATE TABLE IF NOT EXISTS public.status_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  status_id UUID REFERENCES status_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(status_id, user_id)
);

ALTER TABLE public.status_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Likes são públicos" ON public.status_likes;
DROP POLICY IF EXISTS "Usuários curtem" ON public.status_likes;
DROP POLICY IF EXISTS "Usuários descurtem" ON public.status_likes;

CREATE POLICY "Likes são públicos" ON public.status_likes
  FOR SELECT USING (true);

CREATE POLICY "Usuários curtem" ON public.status_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários descurtem" ON public.status_likes
  FOR DELETE USING (auth.uid() = user_id);

-- 4. CRIAR TABELA DE MARCAÇÕES EM STORIES
CREATE TABLE IF NOT EXISTS public.status_tags (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  status_id UUID REFERENCES status_posts(id) ON DELETE CASCADE NOT NULL,
  tagged_user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  position_x FLOAT DEFAULT 0.5,  -- Posição X normalizada (0.0 a 1.0)
  position_y FLOAT DEFAULT 0.5,  -- Posição Y normalizada (0.0 a 1.0)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(status_id, tagged_user_id)
);

ALTER TABLE public.status_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tags são públicas" ON public.status_tags;
DROP POLICY IF EXISTS "Dono cria tags" ON public.status_tags;
DROP POLICY IF EXISTS "Dono deleta tags" ON public.status_tags;

CREATE POLICY "Tags são públicas" ON public.status_tags
  FOR SELECT USING (true);

CREATE POLICY "Dono cria tags" ON public.status_tags
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM status_posts WHERE id = status_id)
  );

CREATE POLICY "Dono deleta tags" ON public.status_tags
  FOR DELETE USING (
    auth.uid() = (SELECT user_id FROM status_posts WHERE id = status_id)
  );

-- 5. BUCKET status-media (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('status-media', 'status-media', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas do bucket
DROP POLICY IF EXISTS "Qualquer um vê status-media" ON storage.objects;
DROP POLICY IF EXISTS "Logados postam status-media" ON storage.objects;

CREATE POLICY "Qualquer um vê status-media" ON storage.objects
  FOR SELECT USING (bucket_id = 'status-media');

CREATE POLICY "Logados postam status-media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'status-media' AND auth.role() = 'authenticated');

CREATE POLICY "Dono deleta status-media" ON storage.objects
  FOR DELETE USING (bucket_id = 'status-media' AND auth.uid() = owner);

SELECT 'Schema de stories atualizado com sucesso! ✅' AS resultado;
