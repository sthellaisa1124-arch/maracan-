import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { X, Camera, Type, Video, Loader2, Send } from 'lucide-react';

export function StatusCreator({ session, onClose, onRefresh }: { session: any, onClose: () => void, onRefresh: () => void }) {
  const [type, setType] = useState<'text' | 'image' | 'video'>('text');
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userId = session?.user?.id;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      setType(file.type.startsWith('video') ? 'video' : 'image');
    }
  };

  async function handleSubmit() {
    if (uploading) return;
    if (type !== 'text' && !fileInputRef.current?.files?.[0] && !preview) {
      alert("Selecione uma mídia primeiro, cria! 📸");
      return;
    }
    if (type === 'text' && !content.trim()) {
      alert("Escreve o papo reto aí primeiro! 🎤");
      return;
    }

    setUploading(true);

    let mediaUrl = '';
    const file = fileInputRef.current?.files?.[0];

    if (file) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('status-media').upload(fileName, file);
      
      if (uploadError) {
        console.error("❌ ERRO NO UPLOAD STORAGE:", uploadError);
        alert("Erro ao subir mídia: " + uploadError.message);
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from('status-media').getPublicUrl(fileName);
      mediaUrl = publicUrl;
    }

    const { error: insertError } = await supabase.from('status_posts').insert([{
      user_id: userId,
      content: type === 'text' ? content : '',
      media_url: mediaUrl,
      media_type: type
    }]);

    if (insertError) {
      console.error("❌ ERRO AO INSERIR NO BANCO:", insertError);
      alert("Erro ao salvar story: " + insertError.message);
    } else {
      onRefresh();
      onClose();
    }
    setUploading(false);
  }

  return (
    <div className="modal-overlay-urban" onClick={onClose}>
      <div className="urbano-card animate-fade-up" onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: '500px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h3 style={{ margin: 0 }}>SOLTAR NA PISTA 📸</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><X size={24} /></button>
        </header>

        <div className="status-creator-content" style={{ marginBottom: '2rem' }}>
          {type === 'text' && !preview ? (
            <textarea 
              placeholder="Qual é o papo reto agora, cria? 🎤🔥" 
              value={content}
              onChange={e => setContent(e.target.value)}
              style={{ 
                width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--separator)', 
                borderRadius: '1.5rem', padding: '1.5rem', color: '#fff', fontSize: '1.2rem', 
                minHeight: '150px', outline: 'none', resize: 'none'
              }}
              maxLength={200}
            />
          ) : (
            <div className="status-preview-box" style={{ borderRadius: '1.5rem', overflow: 'hidden', border: '1px solid var(--primary)', position: 'relative' }}>
              {type === 'image' && <img src={preview!} style={{ width: '100%', display: 'block' }} alt="Preview" />}
              {type === 'video' && <video src={preview!} style={{ width: '100%', display: 'block' }} controls />}
              <button 
                className="btn-remove-preview" 
                onClick={() => { setPreview(null); setType('text'); }}
                style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <X size={16} /> Remover
              </button>
            </div>
          )}
        </div>

        <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.5rem', borderTop: '1px solid var(--separator)' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="icon-btn" onClick={() => setType('text')} title="Texto">
              <Type size={22} color={type === 'text' ? 'var(--primary)' : 'currentColor'} />
            </button>
            <button className="icon-btn" onClick={() => fileInputRef.current?.click()} title="Mídia">
              {type === 'video' ? <Video size={22} /> : <Camera size={22} />}
            </button>
            <input type="file" ref={fileInputRef} hidden accept="image/*,video/*" onChange={handleFileChange} />
          </div>

          <button 
            className="gold-button" 
            onClick={handleSubmit}
            disabled={uploading || (type === 'text' && !content.trim() && !preview)}
          >
            {uploading ? <Loader2 className="animate-spin" /> : <><Send size={18} /> LANÇAR</>}
          </button>
        </footer>
      </div>
    </div>
  );
}
