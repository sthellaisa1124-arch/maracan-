import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Newspaper, Calendar, User, Image as ImageIcon, Heart, MessageCircle, Share2, Trash2, Clock } from 'lucide-react';

interface Post {
  id: string;
  content: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  created_at: string;
  author_id: string;
  profiles: {
    username: string;
    first_name: string;
    is_admin: boolean;
  };
}

export function Blog() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
    fetchPosts();
  }, []);

  async function fetchPosts() {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(username, first_name, is_admin)')
      .order('created_at', { ascending: false });
    
    if (data) setPosts(data as any);
  }

  const deletePost = async (postId: string) => {
    if (!window.confirm("Deseja mesmo apagar esse post, cria?")) return;
    
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (!error) {
      setPosts(prev => prev.filter(p => p.id !== postId));
    } else {
      alert("Erro ao apagar: " + error.message);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'agora mesmo';
    if (diffInSeconds < 3600) return `há ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `há ${Math.floor(diffInSeconds / 3600)} h`;
    return date.toLocaleDateString();
  };

  return (
    <div className="blog-container">
      <div className="posts-feed">
        {posts.length === 0 ? (
          <div className="card empty-state">
            <ImageIcon size={48} className="icon-glow" />
            <p>Nada por aqui ainda, cria. O site tá mais vazio que a Linha Amarela domingo de manhã! 😂</p>
          </div>
        ) : (
          posts.map((post: Post) => (
            <div key={post.id} className="social-post-card card">
              <div className="post-header">
                <div className="author-info-main">
                  <div className="author-avatar">
                   {post.profiles.is_admin ? "🤖" : post.profiles.username[0].toUpperCase()}
                  </div>
                  <div className="author-meta">
                    <span className={`author-name ${post.profiles.is_admin ? 'admin-text' : ''}`}>
                      {post.profiles.is_admin ? 'IAI CRIA (Oficial)' : post.profiles.first_name || post.profiles.username}
                      {post.profiles.is_admin && <span className="verified-badge">✓</span>}
                    </span>
                    <span className="post-time">
                      <Clock size={12} /> {formatRelativeTime(post.created_at)} • {new Date(post.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>
                
                {currentUserId === post.author_id && (
                  <button onClick={() => deletePost(post.id)} className="btn-delete-post">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>

              <div className="post-body">
                <p className="post-content">{post.content}</p>
                {post.media_url && (
                  <div className="post-media-container">
                    {post.media_type === 'image' ? (
                      <img src={post.media_url} alt="Post" className="post-media" />
                    ) : (
                      <video controls src={post.media_url} className="post-media" />
                    )}
                  </div>
                )}
              </div>

              <div className="post-actions">
                <button className="post-action-btn"><Heart size={20} /> Curtir</button>
                <button className="post-action-btn"><MessageCircle size={20} /> Comentar</button>
                <button className="post-action-btn"><Share2 size={20} /> Compartilhar</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
