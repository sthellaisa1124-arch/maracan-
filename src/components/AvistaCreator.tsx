import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { X, Video, Loader2, Send, AlertCircle } from 'lucide-react';

export function AvistaCreator({ session, onClose, onRefresh }: { session: any, onClose: () => void, onRefresh: () => void }) {
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userId = session?.user?.id;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        alert("Pô cria, AVISTA é só pra vídeo! 🎥");
        return;
      }
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        alert("Vídeo muito pesado! Máximo 50MB pra pista não travar. 🛡️");
        return;
      }
      const url = URL.createObjectURL(file);
      setPreview(url);
      setVideoFile(file);
    }
  };

  async function handleSubmit() {
    if (uploading || !videoFile) return;

    setUploading(true);

    try {
      const fileExt = videoFile.name.split('.').pop();
      const fileName = `avista/${userId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(fileName, videoFile);
      
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);

      // Inserir na tabela avista_posts com expiração de 15 dias
      const expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();

      const { error: insertError } = await supabase.from('avista_posts').insert([{
        user_id: userId,
        description: description.trim(),
        video_url: publicUrl,
        expires_at: expiresAt,
        views_count: 0
      }]);

      if (insertError) throw insertError;

      onRefresh();
      onClose();
    } catch (err: any) {
      console.error("❌ ERRO AO LANÇAR AVISTA:", err);
      alert("Erro ao lançar no AVISTA: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="modal-overlay-urban" onClick={onClose} style={{ zIndex: 999999 }}>
      <div 
        className="urbano-card animate-fade-up" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          width: '95%', 
          maxWidth: '500px', 
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid var(--primary)',
          paddingBottom: '2rem'
        }}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, color: 'var(--primary)', fontWeight: 900 }}>LANÇAR NO AVISTA 👁️🎥</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}><X size={24} /></button>
        </header>

        <div style={{ marginBottom: '1.5rem' }}>
          {!preview ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                width: '100%', height: '200px', border: '2px dashed var(--separator)', 
                borderRadius: '1.5rem', display: 'flex', flexDirection: 'column', 
                alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                background: 'rgba(255,255,255,0.02)', transition: 'all 0.2s'
              }}
            >
              <Video size={48} color="var(--primary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p style={{ fontWeight: 700, opacity: 0.7 }}>Selecionar vídeo da galeria</p>
              <span style={{ fontSize: '0.75rem', opacity: 0.4 }}>Formato Vertical (9:16) recomendado</span>
            </div>
          ) : (
            <div style={{ borderRadius: '1.5rem', overflow: 'hidden', border: '1px solid var(--primary)', position: 'relative', background: '#000' }}>
              <video src={preview} style={{ width: '100%', maxHeight: '300px', display: 'block' }} controls />
              <button 
                onClick={() => { setPreview(null); setVideoFile(null); }}
                style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', padding: '0.4rem 0.8rem', borderRadius: '2rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}
              >
                Remover
              </button>
            </div>
          )}
          <input type="file" ref={fileInputRef} hidden accept="video/*" onChange={handleFileChange} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>LEGENDA DO VÍDEO</label>
          <textarea 
            placeholder="Manda o papo desse vídeo, cria... 🎤" 
            value={description}
            onChange={e => setDescription(e.target.value)}
            style={{ 
              width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--separator)', 
              borderRadius: '1rem', padding: '1rem', color: '#fff', fontSize: '1rem', 
              minHeight: '60px', outline: 'none', resize: 'none'
            }}
            maxLength={150}
          />
        </div>

        <div style={{ background: 'rgba(250, 204, 21, 0.05)', padding: '0.8rem 1rem', borderRadius: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '0.8rem', border: '1px solid rgba(250, 204, 21, 0.1)' }}>
            <AlertCircle size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.4 }}>
                Vídeos expirados somem após 15 dias.
            </p>
        </div>

        <button 
          className="gold-button" 
          onClick={handleSubmit}
          disabled={uploading || !videoFile}
          style={{ width: '100%', padding: '1.2rem', fontSize: '1.1rem' }}
        >
          {uploading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Loader2 className="animate-spin" size={24} />
              Enviando para pista...
            </div>
          ) : (
            <><Send size={20} /> LANÇAR NA PISTA</>
          )}
        </button>
      </div>
    </div>
  );
}
