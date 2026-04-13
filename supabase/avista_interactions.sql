-- Tabelas de Interação para AVISTA (Vídeos Curtos)

-- 1. Curtidas em Vídeos
CREATE TABLE IF NOT EXISTS avista_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  avista_id UUID REFERENCES avista_posts(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id, avista_id)
);

-- 2. Comentários em Vídeos
CREATE TABLE IF NOT EXISTS avista_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  avista_id UUID REFERENCES avista_posts(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Habilitar RLS
ALTER TABLE avista_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE avista_comments ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Likes
CREATE POLICY "Likes do AVISTA são públicos" ON avista_likes FOR SELECT USING (true);
CREATE POLICY "Usuários curtem AVISTA" ON avista_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários descurtem AVISTA" ON avista_likes FOR DELETE USING (auth.uid() = user_id);

-- 5. Políticas de Comentários
CREATE POLICY "Comentários do AVISTA são públicos" ON avista_comments FOR SELECT USING (true);
CREATE POLICY "Usuários comentam AVISTA" ON avista_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Dono ou autor deleta comentário" ON avista_comments FOR DELETE USING (
  auth.uid() = user_id OR 
  EXISTS(SELECT 1 FROM avista_posts WHERE id = avista_id AND user_id = auth.uid())
);

-- 6. RPC para Incrementar Visão (Caso não exista)
CREATE OR REPLACE FUNCTION increment_avista_view(post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE avista_posts
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
