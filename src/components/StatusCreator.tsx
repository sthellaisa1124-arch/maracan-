import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Camera, Type, Video, Loader2, Send, Image as ImageIcon, RotateCcw, ChevronLeft } from 'lucide-react';

export function StatusCreator({ session, onClose, onRefresh }: { session: any, onClose: () => void, onRefresh: () => void }) {
  const [type, setType] = useState<'text' | 'image' | 'video'>('image');
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const userId = session?.user?.id;

  // Iniciar câmera automaticamente
  useEffect(() => {
    if (type === 'image' && !preview && !isCameraActive && !capturedBlob) {
      startCamera();
    }
  }, [type, preview, isCameraActive, capturedBlob]);

  // Limpeza ao desmontar
  useEffect(() => {
    return () => stopCamera();
  }, []);

  async function startCamera() {
    try {
      setIsCameraActive(true);
      setPreview(null);
      setCapturedBlob(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1920 } }, 
        audio: false 
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Erro ao abrir câmera:", err);
      setIsCameraActive(false);
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }

  function capturePhoto() {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setPreview(url);
          setCapturedBlob(blob);
          stopCamera();
        }
      }, 'image/jpeg', 0.95);
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      stopCamera();
      if (file.type.startsWith('video')) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = function() {
          window.URL.revokeObjectURL(video.src);
          if (video.duration > 60.5) {
            alert("Vídeo muito longo! Limite de 60 segundos. ⏱️");
            if (e.target) e.target.value = "";
            setPreview(null);
            setType('image');
            startCamera();
            return;
          }
          const url = URL.createObjectURL(file);
          setPreview(url);
          setType('video');
        };
        video.src = URL.createObjectURL(file);
      } else {
        const url = URL.createObjectURL(file);
        setPreview(url);
        setCapturedBlob(null);
        setType('image');
      }
    }
  };

  async function handleSubmit() {
    if (uploading) return;
    const galleryFile = galleryInputRef.current?.files?.[0];
    const fileToUpload = capturedBlob || galleryFile;

    if (type !== 'text' && !fileToUpload && !preview) {
      alert("Selecione uma mídia, cria!");
      return;
    }

    setUploading(true);

    try {
      let mediaUrl = '';
      if (fileToUpload) {
        const isBlob = fileToUpload instanceof Blob && !(fileToUpload instanceof File);
        const fileExt = isBlob ? 'jpg' : (fileToUpload as File).name.split('.').pop();
        const fileName = `status/${userId}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('status-media').upload(fileName, fileToUpload);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('status-media').getPublicUrl(fileName);
        mediaUrl = publicUrl;
      }

      const { error: insertError } = await supabase.from('status_posts').insert([{
        user_id: userId,
        content: type === 'text' ? content : '',
        media_url: mediaUrl,
        media_type: type
      }]);

      if (insertError) throw insertError;

      onRefresh();
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar story:", err);
      alert("Erro ao salvar story: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="instagram-story-mode" style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999999, display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .instagram-story-mode {
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          font-family: 'Inter', sans-serif;
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .capture-circle {
          width: 82px; height: 82px; border-radius: 50%; 
          background: linear-gradient(45deg, #a855f7, #f97316);
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 0 30px rgba(168, 85, 247, 0.5);
          border: 4px solid #fff;
        }
        .capture-circle:active { transform: scale(0.85); filter: brightness(1.2); }
        .inner-circle { width: 62px; height: 62px; border-radius: 50%; background: #fff; box-shadow: inset 0 0 10px rgba(0,0,0,0.1); }
        
        .story-header-btn {
          background: rgba(168, 85, 247, 0.2); backdrop-filter: blur(15px);
          border: 1px solid rgba(168, 85, 247, 0.3); color: #fff;
          width: 48px; height: 48px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        .story-header-btn:active { transform: scale(0.9); background: rgba(168, 85, 247, 0.4); }

        .story-footer-btn {
          background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.1); color: #fff;
          width: 52px; height: 52px; border-radius: 18px;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          transition: all 0.2s;
        }
        .story-footer-btn:active { transform: scale(0.9); }

        .text-story-bg {
          background: linear-gradient(135deg, #2D0B5A 0%, #000 100%);
          position: relative; overflow: hidden;
        }
        .text-story-bg::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.15) 0%, transparent 70%);
        }

        .story-textarea {
          width: 100%; max-width: 400px; background: transparent; border: none;
          color: #fff; font-size: 2.5rem; font-weight: 900; text-align: center;
          outline: none; resize: none; text-shadow: 0 0 20px rgba(168, 85, 247, 0.5);
          z-index: 2; line-height: 1.1;
        }
        .send-pill {
          background: linear-gradient(90deg, #a855f7, #6366f1); color: #fff; padding: 1rem 1.8rem;
          border-radius: 20px; font-weight: 900; font-size: 1rem;
          display: flex; align-items: center; gap: 10px; cursor: pointer;
          box-shadow: 0 10px 30px rgba(168, 85, 247, 0.4); border: none;
          letter-spacing: 0.5px; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .send-pill:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 15px 40px rgba(168, 85, 247, 0.6); }
        .send-pill:active { transform: scale(0.95); }
      `}</style>
      
      {/* 🟢 LAYER DE FUNDO (CÂMERA, PREVIEW OU TEXTO) */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        {type === 'text' && !preview ? (
          <div className="text-story-bg" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <textarea 
              className="story-textarea"
              placeholder="MANDA O PAPO... 🎤"
              value={content}
              onChange={e => setContent(e.target.value)}
              autoFocus
            />
          </div>
        ) : isCameraActive ? (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover',
              transform: 'scaleX(-1)' // Espelha a câmera selfie
            }} 
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#000' }}>
            {type === 'image' && (
              <img 
                src={preview!} 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  transform: capturedBlob ? 'scaleX(-1)' : 'none' // Espelha preview se for captura direta
                }} 
                alt="Preview" 
              />
            )}
            {type === 'video' && <video src={preview!} style={{ width: '100%', height: '100%', objectFit: 'contain' }} controls autoPlay />}
          </div>
        )}
      </div>

      {/* ⚪ LAYER DE CONTROLES (HEADER) */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: 'calc(env(safe-area-inset-top, 20px) + 20px) 25px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="story-header-btn" onClick={() => { stopCamera(); onClose(); }} title="Voltar">
          <ChevronLeft size={28} />
        </button>
        
        <div style={{ display: 'flex', gap: '15px' }}>
          {type !== 'text' && !preview && (
            <button className="story-header-btn" onClick={() => { stopCamera(); setType('text'); }} title="Escrever">
              <Type size={24} />
            </button>
          )}
          {preview && (
            <button className="story-header-btn" onClick={() => { setPreview(null); setCapturedBlob(null); setType('image'); }} title="Resetar">
              <RotateCcw size={24} />
            </button>
          )}
        </div>
      </div>

      {/* 🔘 LAYER DE CONTROLES (FOOTER) */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, padding: '0 30px calc(env(safe-area-inset-bottom, 40px) + 60px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <style>{`
          @keyframes pulse-ring {
            0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.7); }
            70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(168, 85, 247, 0); }
            100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(168, 85, 247, 0); }
          }
          .capture-circle {
            animation: pulse-ring 2s infinite;
          }
        `}</style>
        
        {/* GALERIA */}
        {!preview ? (
          <button className="story-footer-btn" onClick={() => galleryInputRef.current?.click()}>
            <ImageIcon size={28} color="#fff" />
          </button>
        ) : <div style={{ width: '52px' }} />}
        
        <input type="file" ref={galleryInputRef} style={{ display: 'none' }} accept="image/*,video/*" onChange={handleFileChange} />

        {/* BOTAO CAPTURA */}
        {isCameraActive && !preview && (
          <div className="capture-circle" onClick={capturePhoto}>
            <div className="inner-circle" />
          </div>
        )}

        {/* BOTAO LANÇAR */}
        {(preview || (type === 'text' && content.trim())) ? (
          <button 
            className="send-pill" 
            onClick={handleSubmit} 
            disabled={uploading}
          >
            {uploading ? <Loader2 className="animate-spin" size={20} /> : <><Send size={20} /> LANÇAR</>}
          </button>
        ) : <div style={{ width: '52px' }} />}
      </div>
    </div>
  );
}
