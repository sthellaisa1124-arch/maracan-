import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, FilePlus, Image as ImageIcon, Send, ShieldCheck } from 'lucide-react';

interface UserProfile {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  created_at: string;
}

export function Admin() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
  }

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('posts').insert([
      {
        content,
        media_url: mediaUrl || null,
        media_type: mediaUrl ? mediaType : null,
        author_id: user.id
      }
    ]);

    if (error) {
      setMsg({ type: 'error', text: 'Erro ao postar, cria! ' + error.message });
    } else {
      setMsg({ type: 'success', text: 'Postado com sucesso! Já tá lá no feed.' });
      setContent('');
      setMediaUrl('');
    }
    setLoading(false);
  };

  return (
    <div className="admin-page">
      <div className="admin-grid">
        {/* Criar Post */}
        <section className="card admin-card">
          <h3><FilePlus size={20} /> Nova Postagem (IAI CRIA)</h3>
          <form onSubmit={handlePost} className="admin-form">
            <textarea 
              placeholder="O que a IAI CRIA tem pra dizer hoje?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
            
            <div className="input-group-admin">
              <div className="input-with-icon">
                <ImageIcon size={18} />
                <input 
                  type="text" 
                  placeholder="Link da Imagem/Vídeo (opcional)" 
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                />
              </div>
              
              {mediaUrl && (
                <select value={mediaType} onChange={(e) => setMediaType(e.target.value as any)}>
                  <option value="image">Imagem</option>
                  <option value="video">Vídeo</option>
                </select>
              )}
            </div>

            {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Postando...' : <><Send size={18} /> Lançar no Feed</>}
            </button>
          </form>
        </section>

        {/* Lista de Usuários */}
        <section className="card admin-card">
          <h3><Users size={20} /> Usuários Cadastrados ({users.length})</h3>
          <div className="users-list">
            {users.map(u => (
              <div key={u.id} className="user-item">
                <div className="user-avatar">{u.username?.[0]?.toUpperCase() || 'U'}</div>
                <div className="user-details">
                  <p className="u-name">{u.first_name} {u.last_name}</p>
                  <p className="u-username">@{u.username}</p>
                </div>
                <span className="u-date">{new Date(u.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
