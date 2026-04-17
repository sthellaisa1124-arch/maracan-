import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { X, Type, Loader2, Send, Image as ImageIcon, RotateCcw, ChevronLeft, UserPlus, Tag, Search, Move } from 'lucide-react';

interface TaggedUser {
  user_id: string;
  username: string;
  avatar_url: string;
  position_x: number; // 0.0 a 1.0
  position_y: number; // 0.0 a 1.0
}

export function StatusCreator({ session, onClose, onRefresh }: { session: any, onClose: () => void, onRefresh: () => void }) {
  const [type, setType] = useState<'text' | 'image' | 'video'>('image');
  const [content, setContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  // Estado de marcações
  const [showTagSearch, setShowTagSearch] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [tagResults, setTagResults] = useState<any[]>([]);
  const [searchingTags, setSearchingTags] = useState(false);
  const [taggedUsers, setTaggedUsers] = useState<TaggedUser[]>([]);
  const [draggingTag, setDraggingTag] = useState<string | null>(null);
  const [showTagsOverlay, setShowTagsOverlay] = useState(true);
  const mediaContainerRef = useRef<HTMLDivElement>(null);
  
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

  // Buscar usuários para marcar
  useEffect(() => {
    if (!tagSearch.trim()) {
      setTagResults([]);
      return;
    }
    const timer = setTimeout(searchUsers, 400);
    return () => clearTimeout(timer);
  }, [tagSearch]);

  async function searchUsers() {
    if (!tagSearch.trim()) return;
    setSearchingTags(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${tagSearch}%`)
        .neq('id', userId)
        .limit(8);
      
      // Filtrar usuários já marcados
      const alreadyTagged = new Set(taggedUsers.map(t => t.user_id));
      setTagResults((data || []).filter(u => !alreadyTagged.has(u.id)));
    } finally {
      setSearchingTags(false);
    }
  }

  function addTag(user: any) {
    setTaggedUsers(prev => [...prev, {
      user_id: user.id,
      username: user.username,
      avatar_url: user.avatar_url || '',
      position_x: 0.5,
      position_y: 0.5
    }]);
    setTagSearch('');
    setTagResults([]);
    setShowTagSearch(false);
    setShowTagsOverlay(true);
  }

  function removeTag(userId: string) {
    setTaggedUsers(prev => prev.filter(t => t.user_id !== userId));
  }

  function handleTagDragStart(e: React.TouchEvent | React.MouseEvent, tagUserId: string) {
    e.stopPropagation();
    setDraggingTag(tagUserId);
  }

  function handleContainerDrag(e: React.TouchEvent | React.MouseEvent) {
    if (!draggingTag || !mediaContainerRef.current) return;
    const rect = mediaContainerRef.current.getBoundingClientRect();
    
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    const x = Math.max(0.05, Math.min(0.95, (clientX - rect.left) / rect.width));
    const y = Math.max(0.05, Math.min(0.95, (clientY - rect.top) / rect.height));
    
    setTaggedUsers(prev => prev.map(t => 
      t.user_id === draggingTag ? { ...t, position_x: x, position_y: y } : t
    ));
  }

  function handleDragEnd() {
    setDraggingTag(null);
  }

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
      alert("Seleciona uma mídia, cria!");
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

      const { data: newStatus, error: insertError } = await supabase.from('status_posts').insert([{
        user_id: userId,
        content: type === 'text' ? content : '',
        media_url: mediaUrl,
        media_type: type
      }]).select('id').single();

      if (insertError) throw insertError;

      // Salvar marcações
      if (newStatus && taggedUsers.length > 0) {
        const tagsToInsert = taggedUsers.map(tag => ({
          status_id: newStatus.id,
          tagged_user_id: tag.user_id,
          position_x: tag.position_x,
          position_y: tag.position_y
        }));
        
        await supabase.from('status_tags').insert(tagsToInsert);

        // Notificar os marcados
        const notifs = taggedUsers.map(tag => ({
          user_id: tag.user_id,
          from_user_id: userId,
          type: 'status_tag',
          post_id: newStatus.id
        }));
        await supabase.from('notifications').insert(notifs);
      }

      onRefresh();
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar story:", err);
      alert("Erro ao salvar story: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  const canTag = (preview || type === 'image' || type === 'video') && !isCameraActive;

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
          animation: pulse-ring 2s infinite;
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.7); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 15px rgba(168, 85, 247, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(168, 85, 247, 0); }
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
        .story-header-btn.active { background: rgba(168, 85, 247, 0.6); border-color: rgba(168, 85, 247, 0.9); }

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

        .tag-search-panel {
          position: absolute; bottom: 120px; left: 16px; right: 16px;
          background: rgba(10,10,10,0.95); backdrop-filter: blur(20px);
          border: 1px solid rgba(168,85,247,0.4); border-radius: 20px;
          padding: 1rem; z-index: 100;
          animation: slideUp 0.2s ease;
        }
        .tag-input {
          width: 100%; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; padding: 0.7rem 1rem; color: #fff; font-size: 0.95rem;
          outline: none; box-sizing: border-box;
        }
        .tag-result-item {
          display: flex; align-items: center; gap: 10px;
          padding: 0.7rem 0.5rem; border-radius: 12px; cursor: pointer;
          transition: background 0.15s;
        }
        .tag-result-item:hover { background: rgba(168,85,247,0.15); }

        .tag-overlay-pill {
          position: absolute;
          transform: translate(-50%, -50%);
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(8px);
          border: 2px solid rgba(168,85,247,0.9);
          border-radius: 24px;
          padding: 5px 10px 5px 6px;
          display: flex; align-items: center; gap: 6px;
          color: #fff; font-size: 0.82rem; font-weight: 800;
          cursor: grab; white-space: nowrap;
          user-select: none; touch-action: none;
          box-shadow: 0 4px 20px rgba(0,0,0,0.6);
          animation: tagPulse 2s ease-in-out infinite;
        }
        .tag-overlay-pill:active { cursor: grabbing; transform: translate(-50%,-50%) scale(1.05); }
        @keyframes tagPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(168,85,247,0.5); }
          50% { box-shadow: 0 0 0 8px rgba(168,85,247,0); }
        }
        .tag-remove-btn {
          background: rgba(239,68,68,0.8); border: none; border-radius: 50%;
          width: 16px; height: 16px; display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #fff; font-size: 10px; padding: 0; flex-shrink: 0;
        }
      `}</style>
      
      {/* 🟢 LAYER DE FUNDO */}
      <div 
        ref={mediaContainerRef}
        style={{ position: 'absolute', inset: 0, zIndex: 1 }}
        onMouseMove={draggingTag ? handleContainerDrag : undefined}
        onTouchMove={draggingTag ? handleContainerDrag : undefined}
        onMouseUp={handleDragEnd}
        onTouchEnd={handleDragEnd}
      >
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
              transform: 'scaleX(-1)'
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
                  transform: capturedBlob ? 'scaleX(-1)' : 'none'
                }} 
                alt="Preview" 
              />
            )}
            {type === 'video' && <video src={preview!} style={{ width: '100%', height: '100%', objectFit: 'contain' }} controls autoPlay />}
          </div>
        )}

        {/* OVERLAY DE TAGS ARRASTÁVEIS */}
        {showTagsOverlay && preview && taggedUsers.map(tag => (
          <div
            key={tag.user_id}
            className="tag-overlay-pill"
            style={{
              left: `${tag.position_x * 100}%`,
              top: `${tag.position_y * 100}%`,
            }}
            onMouseDown={(e) => handleTagDragStart(e, tag.user_id)}
            onTouchStart={(e) => handleTagDragStart(e, tag.user_id)}
          >
            <Move size={12} style={{ opacity: 0.7 }} />
            <img 
              src={tag.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${tag.user_id}`}
              alt={tag.username}
              style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover' }}
            />
            @{tag.username}
            <button 
              className="tag-remove-btn"
              onClick={(e) => { e.stopPropagation(); removeTag(tag.user_id); }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* ⚪ HEADER */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: 'calc(env(safe-area-inset-top, 20px) + 20px) 25px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button className="story-header-btn" onClick={() => { stopCamera(); onClose(); }} title="Voltar">
          <ChevronLeft size={28} />
        </button>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          {type !== 'text' && !preview && (
            <button className="story-header-btn" onClick={() => { stopCamera(); setType('text'); }} title="Escrever">
              <Type size={24} />
            </button>
          )}
          {preview && (
            <>
              {/* Botão de Marcar Usuário */}
              <button 
                className={`story-header-btn ${showTagSearch ? 'active' : ''}`}
                onClick={() => setShowTagSearch(p => !p)} 
                title="Marcar usuário"
              >
                <UserPlus size={24} />
              </button>
              
              {/* Indicador de quantos foram marcados */}
              {taggedUsers.length > 0 && (
                <button 
                  className={`story-header-btn ${showTagsOverlay ? 'active' : ''}`}
                  onClick={() => setShowTagsOverlay(p => !p)}
                  title="Ver/ocultar marcações"
                  style={{ position: 'relative' }}
                >
                  <Tag size={22} />
                  <span style={{
                    position: 'absolute', top: '-4px', right: '-4px',
                    background: '#a855f7', color: '#fff',
                    width: '18px', height: '18px', borderRadius: '50%',
                    fontSize: '0.7rem', fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {taggedUsers.length}
                  </span>
                </button>
              )}

              <button className="story-header-btn" onClick={() => { setPreview(null); setCapturedBlob(null); setType('image'); setTaggedUsers([]); }} title="Resetar">
                <RotateCcw size={24} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* PAINEL DE BUSCA DE USUÁRIOS PARA MARCAR */}
      {showTagSearch && preview && (
        <div className="tag-search-panel" style={{ zIndex: 100 }}>
          <p style={{ margin: '0 0 0.8rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: '1px' }}>
            <Tag size={12} style={{ display: 'inline', marginRight: '4px' }} />
            MARCAR ALGUÉM
          </p>
          <div style={{ position: 'relative' }}>
            <input
              className="tag-input"
              placeholder="Buscar por @username..."
              value={tagSearch}
              onChange={e => setTagSearch(e.target.value)}
              autoFocus
            />
            {searchingTags && (
              <Loader2 className="animate-spin" size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
            )}
          </div>

          {tagResults.length > 0 && (
            <div style={{ marginTop: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
              {tagResults.map(user => (
                <div
                  key={user.id}
                  className="tag-result-item"
                  onClick={() => addTag(user)}
                >
                  <img 
                    src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`}
                    alt={user.username}
                    style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(168,85,247,0.4)' }}
                  />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>@{user.username}</div>
                  </div>
                  <UserPlus size={16} style={{ marginLeft: 'auto', color: 'rgba(168,85,247,0.8)' }} />
                </div>
              ))}
            </div>
          )}

          {tagSearch && !searchingTags && tagResults.length === 0 && (
            <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'rgba(255,255,255,0.3)', padding: '1rem 0 0' }}>
              Nenhum usuário encontrado 😕
            </p>
          )}

          {/* Lista de já marcados */}
          {taggedUsers.length > 0 && (
            <div style={{ marginTop: '0.8rem', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.8rem' }}>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>MARCADOS:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {taggedUsers.map(tag => (
                  <div key={tag.user_id} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '12px', padding: '4px 10px 4px 6px', fontSize: '0.8rem', fontWeight: 700 }}>
                    <img src={tag.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${tag.user_id}`} style={{ width: '18px', height: '18px', borderRadius: '50%' }} alt={tag.username} />
                    @{tag.username}
                    <button onClick={() => removeTag(tag.user_id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 0, fontSize: '14px', lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 🔘 FOOTER */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, padding: '0 30px calc(env(safe-area-inset-bottom, 40px) + 60px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
