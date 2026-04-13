import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Search, 
  MapPin, 
  Calendar, 
  TrendingUp, 
  Plus, 
  X, 
  Save, 
  Trash2,
  Loader2
} from 'lucide-react';

export function Blog({ isAdmin, userProfile, session, onViewProfile }: { isAdmin: boolean, userProfile: any, session: any, onViewProfile: (username: string) => void }) {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingPost, setIsAddingPost] = useState(false);
  const [editingPost, setEditingPost] = useState<any | null>(null);
  
  const [newPost, setNewPost] = useState({
    title: '',
    description: '',
    content: '',
    image_url: '',
    category: 'Comunidade',
    location: 'Rio de Janeiro'
  });

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar posts:', error);
    } else {
      setPosts(data || []);
    }
    setLoading(false);
  }

  const handleSaveNode = async () => {
    if (!newPost.title || !newPost.content) return alert("Pô cria, preenche o título e o papo principal!");
    
    setLoading(true);
    const postData = {
      ...newPost,
      author_name: userProfile?.first_name || 'Admin IAI',
      author_username: userProfile?.username || 'admin',
      author_id: session?.user?.id
    };

    const { error } = editingPost 
      ? await supabase.from('posts').update(postData).eq('id', editingPost.id)
      : await supabase.from('posts').insert([postData]);

    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      fetchPosts();
      setIsAddingPost(false);
      setEditingPost(null);
      setNewPost({ title: '', description: '', content: '', image_url: '', category: 'Comunidade', location: 'Rio de Janeiro' });
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Vai apagar esse papo mesmo, cria?")) return;
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) alert("Erro ao deletar");
    else fetchPosts();
  };

  const categories = ['Comunidade', 'Segurança', 'Eventos', 'Visão do Cria', 'Utilidade Tab'];

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="blog-container">
      {/* Header com Busca */}
      <header className="blog-head">
        <div className="head-content">
          <h1>NOTÍCIAS DO RIO</h1>
          <p>O papo reto do que tá rolando na pista em tempo real.</p>
        </div>
        <div className="head-actions">
          <div className="search-bar-v2">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Filtrar conteúdo..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {isAdmin && (
            <button className="btn-add-post" onClick={() => setIsAddingPost(true)}>
              <Plus size={20} /> Novo Papo
            </button>
          )}
        </div>
      </header>

      {/* Editor Modal */}
      {(isAddingPost || editingPost) && (
        <div className="modal-overlay">
          <div className="editor-modal">
            <div className="modal-header">
              <h2>{editingPost ? 'EDITAR PAPO' : 'LANÇAR NOVO PAPO'}</h2>
              <button className="btn-close" onClick={() => { setIsAddingPost(false); setEditingPost(null); }}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <input 
                type="text" 
                placeholder="Título do Papo" 
                value={newPost.title}
                onChange={e => setNewPost({...newPost, title: e.target.value})}
              />
              <div className="row">
                <select value={newPost.category} onChange={e => setNewPost({...newPost, category: e.target.value})}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input 
                  type="text" 
                  placeholder="Local (Ex: Vidigal)" 
                  value={newPost.location}
                  onChange={e => setNewPost({...newPost, location: e.target.value})}
                />
              </div>
              <input 
                type="text" 
                placeholder="Link da Foto (Opcional)" 
                value={newPost.image_url}
                onChange={e => setNewPost({...newPost, image_url: e.target.value})}
              />
              <textarea 
                placeholder="Resumo curto..." 
                value={newPost.description}
                onChange={e => setNewPost({...newPost, description: e.target.value})}
              />
              <textarea 
                className="main-content-area"
                placeholder="Manda o papo completo aqui..." 
                value={newPost.content}
                onChange={e => setNewPost({...newPost, content: e.target.value})}
              />
              <button className="btn-save-post" onClick={handleSaveNode} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Salvar e Postar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feed de Grid */}
      <div className="blog-grid">
        {loading ? (
          <div className="loading-state"><Loader2 className="animate-spin" /></div>
        ) : filteredPosts.length === 0 ? (
          <div className="empty-state">Nada de interessante na pista hoje... 🔇</div>
        ) : (
          filteredPosts.map(post => (
            <article key={post.id} className="blog-card-v2">
              <div className="card-image">
                <img src={post.image_url || "https://images.unsplash.com/photo-1483726234545-481d6e880fc6?auto=format&fit=crop&q=80"} alt={post.title} />
                <span className="card-badge">{post.category}</span>
              </div>
              <div className="card-content">
                <div className="card-meta">
                  <span><MapPin size={14} /> {post.location}</span>
                  <span><Calendar size={14} /> {new Date(post.created_at).toLocaleDateString()}</span>
                </div>
                <h3>{post.title}</h3>
                <p>{post.description}</p>
                <div className="card-footer">
                  <div className="author-box clickable" onClick={() => onViewProfile(post.author_username)}>
                    <TrendingUp size={16} className="trend-icon" />
                    <span>Postado por: <strong>{post.author_name} (@{post.author_username})</strong></span>
                  </div>
                  {isAdmin && (
                    <div className="admin-actions">
                      <button className="btn-edit" onClick={() => { setEditingPost(post); setNewPost(post); }}>
                        <Plus size={16} />
                      </button>
                      <button className="btn-delete" onClick={() => handleDelete(post.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="blog-footer-info">
        <p>Informativo VELAR: Informação segura e direta da comunidade. 🏙️🛡️</p>
      </div>
    </div>
  );
}
