-- Tabela de Perfis (Estende auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  username TEXT UNIQUE,
  avatar_url TEXT,
  last_profile_update TIMESTAMP WITH TIME ZONE,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS em profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Perfís são públicos" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Usuários atualizam apenas nome e foto" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    is_admin() OR (
      is_admin = (SELECT is_admin FROM profiles WHERE id = auth.uid()) AND
      plan_type = (SELECT plan_type FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins têm poder total" ON profiles
  FOR ALL USING (is_admin());

-- Função Segura para Checar Admin (Evita Recursão no RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gatilho para Criar Perfil Automaticamente ao Cadastrar
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, username, plan_type)
  VALUES (new.id, new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'username', 'comunitário');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Tabela de Posts do Blog
CREATE TABLE posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  content TEXT,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video')),
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de Curtidas
CREATE TABLE IF NOT EXISTS likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, post_id)
);

-- Tabela de Comentários
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de Mensagens do Chat
CREATE TABLE messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  content TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'ai')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Políticas de Posts
CREATE POLICY "Posts são públicos" ON posts FOR SELECT USING (true);
CREATE POLICY "Apenas o dono posta" ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Apenas o dono edita" ON posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Dono ou Admin deleta" ON posts FOR DELETE USING (
  auth.uid() = author_id OR is_admin()
);

-- Políticas de Curtidas
CREATE POLICY "Qualquer um vê as curtidas" ON likes FOR SELECT USING (true);
CREATE POLICY "Usuários logados curtem" ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários descurtem" ON likes FOR DELETE USING (auth.uid() = user_id);

-- Políticas de Comentários
CREATE POLICY "Qualquer um vê comentários" ON comments FOR SELECT USING (true);
CREATE POLICY "Usuários logados comentam" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários deletam próprios comentários" ON comments FOR DELETE USING (auth.uid() = user_id);

-- Políticas de Mensagens
CREATE POLICY "Usuários veem suas mensagens" ON messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários enviam suas mensagens" ON messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CONFIGURAÇÃO DO STORAGE (FOTOS E VÍDEOS)
-- Execute isso no SQL Editor do Supabase se o bucket 'media' não existir ou der erro

-- 1. Criar o Bucket 'media' como Público
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- 2.-- Função para limpar posts com mais de 24 horas
CREATE OR REPLACE FUNCTION cleanup_old_posts()
RETURNS void AS $$
BEGIN
  DELETE FROM posts
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permissão para usuários autenticados chamarem a limpeza (opcional, para limpeza passiva)
GRANT EXECUTE ON FUNCTION cleanup_old_posts() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_posts() TO anon;
GRANT EXECUTE ON FUNCTION cleanup_old_posts() TO service_role;

-- 2. Políticas de Acesso ao Storage (Essencial)
CREATE POLICY "Qualquer um vê mídia" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "Logados postam mídia" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

CREATE POLICY "Dono ou Admin deleta mídia" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'media' AND 
    (auth.uid() = owner OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
  );
