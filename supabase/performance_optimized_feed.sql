-- ==========================================
-- OTIMIZAÇÃO DE PERFORMANCE: TURBO FEED 🚀
-- ==========================================

-- 1. ADICIONAR ÍNDICES PARA VELOCIDADE DE BUSCA
CREATE INDEX IF NOT EXISTS idx_user_posts_created_at ON public.user_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_posts_pinned ON public.user_posts (is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_user_posts_bumped ON public.user_posts (last_bumped_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON public.user_post_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.user_post_comments (post_id);
CREATE INDEX IF NOT EXISTS idx_views_post_id ON public.user_post_views (post_id);

-- 2. FUNÇÃO RPC PARA BUSCAR FEED COMPLETO EM UMA ÚNICA REQUISIÇÃO
-- Resolve o problema de 10 segundos de carregamento (N+1 Problem)
CREATE OR REPLACE FUNCTION public.get_community_feed(
  p_user_id UUID,
  p_limit INT DEFAULT 30
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  content TEXT,
  image_url TEXT,
  video_url TEXT,
  is_pinned BOOLEAN,
  pinned_until TIMESTAMP WITH TIME ZONE,
  last_bumped_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  author jsonb,
  likes_count BIGINT,
  comments_count BIGINT,
  views_count BIGINT,
  is_liked BOOLEAN,
  comments_list jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.content,
    p.image_url,
    p.video_url,
    p.is_pinned,
    p.pinned_until,
    p.last_bumped_at,
    p.created_at,
    jsonb_build_object(
      'username', pr.username,
      'avatar_url', pr.avatar_url,
      'badges', pr.badges,
      'total_donated', pr.total_donated
    ) as author,
    (SELECT count(*) FROM public.user_post_likes l WHERE l.post_id = p.id) as likes_count,
    (SELECT count(*) FROM public.user_post_comments c WHERE c.post_id = p.id) as comments_count,
    (SELECT count(*) FROM public.user_post_views v WHERE v.post_id = p.id) as views_count,
    EXISTS (SELECT 1 FROM public.user_post_likes l WHERE l.post_id = p.id AND l.user_id = p_user_id) as is_liked,
    (
      SELECT jsonb_agg(comm) FROM (
        SELECT 
          c.*,
          jsonb_build_object(
            'username', cpr.username,
            'avatar_url', cpr.avatar_url,
            'badges', cpr.badges,
            'total_donated', cpr.total_donated
          ) as author
        FROM public.user_post_comments c
        LEFT JOIN public.profiles cpr ON cpr.id = c.user_id
        WHERE c.post_id = p.id
        ORDER BY c.created_at ASC
        LIMIT 5 -- Pegamos os 5 últimos comentários iniciais para o feed
      ) comm
    ) as comments_list
  FROM public.user_posts p
  LEFT JOIN public.profiles pr ON pr.id = p.user_id
  ORDER BY p.is_pinned DESC, p.last_bumped_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_community_feed IS 'Busca posts do feed com contagens e status de curtida otimizados.';
