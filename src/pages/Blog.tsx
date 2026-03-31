import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
      <h2 className="section-title">Notícias do Rio 🌴</h2>
      <div className="posts-feed">
        {posts.length === 0 ? (
          <div className="card empty-state">
            <p>Nada por aqui ainda, cria. O site tá mais vazio que a Linha Amarela domingo de manhã! 😂</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="card post-card">
              <div className="post-header">
                <span className={`author ${post.profiles.is_admin ? 'admin-badge' : ''}`}>
                  {post.profiles.is_admin ? 'OFICIAL: IAI CRIA 🤖' : `@${post.profiles.username}`}
                </span>
                <span className="date">{new Date(post.created_at).toLocaleDateString()}</span>
              </div>
              <p className="post-content">{post.content}</p>
              {post.media_url && post.media_type === 'image' && (
                <img src={post.media_url} alt="Post" className="post-media" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
