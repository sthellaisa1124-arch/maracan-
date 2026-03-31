import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Newspaper, Calendar, User, Image as ImageIcon, PlayCircle } from 'lucide-react';

interface Post {
  id: string;
  content: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  created_at: string;
  profiles: {
    username: string;
    first_name: string;
    is_admin: boolean;
  };
}

export function Blog() {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    async function fetchPosts() {
      const { data } = await supabase
        .from('posts')
        .select('*, profiles(username, first_name, is_admin)')
        .order('created_at', { ascending: false });
      
      if (data) setPosts(data as any);
    }
    fetchPosts();
  }, []);

  return (
    <div className="blog-container">
      <h2 className="section-title"><Newspaper size={32} /> Notícias do Rio</h2>
      <div className="posts-feed">
        {posts.length === 0 ? (
          <div className="card empty-state">
            <ImageIcon size={48} className="icon-glow" />
            <p>Nada por aqui ainda, cria. O site tá mais vazio que a Linha Amarela domingo de manhã! 😂</p>
          </div>
        ) : (
          posts.map((post: Post) => (
            <div key={post.id} className="card post-card">
              <div className="post-header">
                <div className="author-info">
                  <span className={`author ${post.profiles.is_admin ? 'admin-badge' : ''}`}>
                    {post.profiles.is_admin ? 'OFICIAL: IAI CRIA 🤖' : <><User size={14} /> @{post.profiles.username}</>}
                  </span>
                </div>
                <span className="date"><Calendar size={14} /> {new Date(post.created_at).toLocaleDateString()}</span>
              </div>
              <p className="post-content">{post.content}</p>
              {post.media_url && (
                <div className="post-media-container">
                  {post.media_type === 'image' ? (
                    <img src={post.media_url} alt="Post" className="post-media" />
                  ) : (
                    <div className="video-placeholder">
                      <PlayCircle size={48} />
                      <p>Vídeo postado - Clique para ver</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
