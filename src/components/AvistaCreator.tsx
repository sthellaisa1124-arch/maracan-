import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Video, Loader2, Send, AlertCircle, ArrowRight, Camera, Image as ImageIcon, RotateCcw, Play, Square, Scissors, Volume2, MessageCircle, ChevronLeft, Maximize, ZoomIn } from 'lucide-react';

export function AvistaCreator({ session, onClose, onRefresh }: { session: any, onClose: () => void, onRefresh: () => void }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [showEditor, setShowEditor] = useState(false);
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // Estados de Edição
  const [volume, setVolume] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isGeneratingThumbs, setIsGeneratingThumbs] = useState(false);
  const [isApplyingEdits, setIsApplyingEdits] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success'>('idle');
  const [isVerified, setIsVerified] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const step2VideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<any>(null);
  const userId = session?.user?.id;

  // Refs de Performance para a Timeline
  const startHandleRef = useRef<HTMLDivElement>(null);
  const endHandleRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<'start' | 'end' | null>(null);

  // Iniciar câmera automaticamente ao abrir
  useEffect(() => {
    if (step === 1 && !videoFile && !isCameraActive) {
      startCamera();
    }
  }, [step, videoFile, isCameraActive]);

  // Geração de Thumbnails (Timeline)
  useEffect(() => {
    if (preview && duration > 0 && thumbnails.length === 0 && !isGeneratingThumbs) {
      generateThumbnails();
    }
  }, [preview, duration, thumbnails]);

  // Controle de loop PRECISO usando requestAnimationFrame (Elimina travamento no final)
  useEffect(() => {
    let animationFrameId: number;
    
    const checkLoop = () => {
      const vid = step === 1 ? previewVideoRef.current : step2VideoRef.current;
      if (vid && !vid.paused) {
        if (vid.currentTime < startTime) {
          vid.currentTime = startTime;
        }
        if (endTime > 0 && vid.currentTime >= endTime) {
          vid.currentTime = startTime;
          vid.play(); // Garante que continue rodando
        }
      }
      animationFrameId = requestAnimationFrame(checkLoop);
    };

    animationFrameId = requestAnimationFrame(checkLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [startTime, endTime, duration, step, preview]);

  // Sincronizar UI da timeline quando os estados mudam de forma externa (como ao carregar ou trocar vídeo)
  useEffect(() => {
    if (startHandleRef.current && endHandleRef.current && selectionRef.current && duration > 0) {
      const startP = (startTime / duration) * 100;
      const endP = (endTime / duration) * 100;
      startHandleRef.current.style.left = `${startP}%`;
      endHandleRef.current.style.left = `${endP}%`;
      selectionRef.current.style.left = `${startP}%`;
      selectionRef.current.style.right = `${100 - endP}%`;
    }
  }, [startTime, endTime, duration, showEditor]);

  // Ajuste de volume e zoom do preview
  useEffect(() => {
    if (previewVideoRef.current) {
      previewVideoRef.current.volume = volume;
      previewVideoRef.current.style.transform = `scale(${zoom}) ${videoFile instanceof Blob ? 'scaleX(-1)' : ''}`;
    }
  }, [volume, zoom, preview, videoFile]);

  // Ajuste de volume e zoom no Step 2
  useEffect(() => {
    if (step === 2 && step2VideoRef.current) {
      step2VideoRef.current.volume = volume;
      step2VideoRef.current.style.transform = `scale(${zoom}) ${videoFile instanceof Blob ? 'scaleX(-1)' : ''}`;
    }
  }, [step, volume, zoom, videoFile]);

  // Limpeza ao desmontar
  useEffect(() => {
    return () => {
      stopCamera();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Lógica de Verificação Fake
  async function handleVerify() {
    setVerificationStatus('verifying');
    setVerificationProgress(0);
    
    const duration = 5000; // 5 segundos
    const interval = 50;
    const stepSize = 100 / (duration / interval);
    
    let currentProgress = 0;
    const timer = setInterval(() => {
      currentProgress += stepSize;
      if (currentProgress >= 100) {
        clearInterval(timer);
        setVerificationProgress(100);
        setVerificationStatus('success');
        setIsVerified(true);
      } else {
        setVerificationProgress(currentProgress);
      }
    }, interval);
  }

  // Resetar verificação se sair do Step 2
  useEffect(() => {
    if (step === 1) {
      setVerificationStatus('idle');
      setIsVerified(false);
      setVerificationProgress(0);
    }
  }, [step]);

  async function generateThumbnails() {
    setIsGeneratingThumbs(true);
    const count = 8;
    const thumbs: string[] = [];
    const tempVid = document.createElement('video');
    tempVid.src = preview!;
    tempVid.crossOrigin = 'anonymous';
    tempVid.muted = true;
    
    await new Promise(resolve => tempVid.onloadedmetadata = resolve);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 160;
    canvas.height = 90;

    for (let i = 0; i < count; i++) {
      const time = (duration / count) * i;
      tempVid.currentTime = time;
      await new Promise(resolve => tempVid.onseeked = resolve);
      if (ctx) {
        ctx.drawImage(tempVid, 0, 0, canvas.width, canvas.height);
        thumbs.push(canvas.toDataURL('image/jpeg', 0.5));
      }
    }
    setThumbnails(thumbs);
    setIsGeneratingThumbs(false);
  }

  async function startCamera() {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: true 
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

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    let recorder;
    try { recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp9,opus' }); }
    catch (e) { recorder = new MediaRecorder(streamRef.current); }

    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setPreview(url);
      setVideoFile(blob);
      setThumbnails([]); // Reset thumbnails for new video
      stopCamera();
    };

    recorder.start();
    setIsRecording(true);
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleMetadata = (e: any) => {
    const dur = e.target.duration;
    setDuration(dur);
    setEndTime(dur);
    setStartTime(0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        alert("Pô cria, AVISTA é só pra vídeo! 🎥");
        return;
      }
      const url = URL.createObjectURL(file);
      setPreview(url);
      setVideoFile(file);
      setThumbnails([]);
      stopCamera();
    }
  };

  async function handleSubmit() {
    if (uploading || !videoFile) return;
    setUploading(true);

    try {
      const fileExt = videoFile instanceof File ? videoFile.name.split('.').pop() : 'webm';
      const fileName = `avista/${userId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('media').upload(fileName, videoFile);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(fileName);
      const expiresAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();

      const { error: insertError } = await supabase.from('avista_posts').insert([{
        user_id: userId,
        description: description.trim(),
        video_url: publicUrl,
        expires_at: expiresAt,
        views_count: 0,
        metadata: { volume, startTime, endTime, zoom }
      }]);

      if (insertError) {
        if (insertError.message.includes('metadata')) {
          throw new Error("Pai, tá faltando a coluna 'metadata' no banco! 🛑 Roda o comando SQL que eu te mandei no painel do Supabase pra liberar a postagem.");
        }
        throw insertError;
      }

      onRefresh();
      onClose();
    } catch (err: any) {
      console.error("❌ ERRO AO LANÇAR AVISTA:", err);
      alert("Erro ao lançar no AVISTA: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="avista-creator-elite" style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 9999999, display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .avista-creator-elite { animation: slideUp 0.3s ease-out; font-family: 'Inter', sans-serif; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        
        .camera-btn {
          width: 80px; height: 80px; border-radius: 50%; border: 4px solid #fff;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          transition: all 0.2s; position: relative;
        }
        .camera-btn.recording { border-color: #ef4444; animation: pulse-red 1.5s infinite; }
        .inner-record { width: 62px; height: 62px; border-radius: 50%; background: #ef4444; transition: all 0.2s; }
        .recording .inner-record { border-radius: 8px; width: 30px; height: 30px; }

        @keyframes pulse-red { 
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }

        .elite-btn-next {
          background: rgba(168, 85, 247, 0.2); backdrop-filter: blur(10px);
          border: 1px solid rgba(168, 85, 247, 0.4); color: #fff;
          padding: 8px 16px; border-radius: 20px; display: flex; align-items: center; gap: 8px;
          font-weight: 800; cursor: pointer; transition: all 0.2s;
        }

        .editor-panel-professional {
          position: absolute; bottom: 0; left: 0; right: 0; 
          background: rgba(0,0,0,0.95); backdrop-filter: blur(30px);
          border-top: 1px solid rgba(255,255,255,0.1);
          padding: 1.5rem 1rem calc(env(safe-area-inset-bottom, 20px) + 1rem); 
          border-radius: 30px 30px 0 0;
          z-index: 20; animation: editorSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes editorSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

        .timeline-container {
          position: relative; width: 100%; height: 60px; background: #111;
          border-radius: 12px; overflow: hidden; display: flex; margin: 1rem 0;
          border: 1px solid rgba(255,255,255,0.05);
        }
        .thumb-img { flex: 1; height: 100%; object-fit: cover; opacity: 0.5; }

        /* Dual Range Slider Styles */
        .dual-range-slider {
          position: absolute; inset: 0; z-index: 5;
        }
        .range-handle {
          position: absolute; top: 0; bottom: 0; width: 20px; 
          background: #a855f7; border-radius: 4px; cursor: ew-resize;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 15px rgba(168, 85, 247, 0.5);
        }
        .range-handle::after { content: ''; width: 2px; height: 20px; background: rgba(255,255,255,0.5); border-radius: 1px; }
        
        .selection-overlay {
          position: absolute; top: 0; bottom: 0; border: 2px solid #a855f7;
          background: rgba(168, 85, 247, 0.05); pointer-events: none;
        }

        .slider-custom-pro { width: 100%; height: 4px; border-radius: 2px; background: #333; accent-color: #a855f7; cursor: pointer; }

        .preview-miniature {
          width: 120px; height: 180px; border-radius: 16px; overflow: hidden; 
          border: 2px solid #a855f7; boxShadow: 0 0 20px rgba(168,85,247,0.3); position: relative;
        }
      `}</style>

      {/* STEP 1: CAPTURA E SELEÇÃO */}
      {step === 1 && (
        <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: '#000', overflow: 'hidden' }}>
            {preview ? (
              <video 
                ref={previewVideoRef}
                key={preview}
                src={preview} 
                autoPlay 
                loop 
                muted={volume === 0}
                playsInline 
                onLoadedMetadata={handleMetadata}
                style={{ 
                  width: '100%', height: '100%', objectFit: 'cover',
                  transition: 'transform 0.2s'
                }} 
              />
            ) : isCameraActive ? (
              <video 
                ref={videoRef} autoPlay playsInline muted 
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
              />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 className="animate-spin" color="#a855f7" size={40} />
              </div>
            )}
          </div>

          {/* Header */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: 'calc(env(safe-area-inset-top, 20px) + 20px) 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button style={{ background: 'rgba(0,0,0,0.5)', width: '44px', height: '44px', borderRadius: '50%', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}><X size={24} /></button>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              {videoFile && (
                <>
                  <button className="elite-btn-next" onClick={() => setShowEditor(!showEditor)}>
                    <Scissors size={18} /> EDITAR
                  </button>
                  <button className="elite-btn-next" style={{ color: '#a855f7', borderColor: '#a855f7' }} onClick={() => setStep(2)}>
                    PRÓXIMO <ArrowRight size={20} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* PROFESSIONAL EDITOR PANEL (Timeline Style) */}
          {showEditor && (
            <div className="editor-panel-professional">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ color: '#fff', fontWeight: 900, fontSize: '0.9rem' }}>ESTÚDIO DE EDIÇÃO</span>
                <button 
                  onClick={() => {
                    setIsApplyingEdits(true);
                    setTimeout(() => {
                      setIsApplyingEdits(false);
                      setShowEditor(false);
                    }, 2500);
                  }} 
                  style={{ background: '#a855f7', border: 'none', color: '#fff', padding: '6px 20px', borderRadius: '15px', fontWeight: 800, fontSize: '0.8rem' }}
                >
                  PRONTO
                </button>
              </div>

              {/* ZOOM E VOLUME CONTROLS */}
              <div style={{ display: 'flex', gap: '20px', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                    <ZoomIn size={14} color="#a855f7" />
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>ZOOM: {zoom.toFixed(1)}x</span>
                  </div>
                  <input type="range" min="1" max="2" step="0.1" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} className="slider-custom-pro" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                    <Volume2 size={14} color="#a855f7" />
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem' }}>ÁUDIO: {Math.round(volume * 100)}%</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.1" value={volume} onChange={e => setVolume(parseFloat(e.target.value))} className="slider-custom-pro" />
                </div>
              </div>

              {/* TIMELINE VISUAL */}
              <div style={{ marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>DURAÇÃO SELECIONADA: {formatTime(endTime - startTime)}</span>
                </div>
                
                <div className="timeline-container">
                  {thumbnails.length > 0 ? (
                    thumbnails.map((t, i) => <img key={i} src={t} className="thumb-img" alt="" />)
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Loader2 className="animate-spin" size={20} color="rgba(255,255,255,0.2)" />
                    </div>
                  )}

                  {/* Dual Handle Overlay */}
                  <div 
                    className="dual-range-slider" 
                    style={{ touchAction: 'none' }}
                    onPointerMove={(e) => {
                      if (!isDraggingRef.current) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                      const time = p * duration;

                      // Atualizar vídeo em tempo real (Scrubbing)
                      if (previewVideoRef.current) {
                        previewVideoRef.current.currentTime = time;
                      }

                      if (isDraggingRef.current === 'start') {
                        const currentEndP = parseFloat(endHandleRef.current?.style.left || '100');
                        if (p * 100 < currentEndP - 5) {
                          startHandleRef.current!.style.left = `${p * 100}%`;
                          selectionRef.current!.style.left = `${p * 100}%`;
                        }
                      } else if (isDraggingRef.current === 'end') {
                        const currentStartP = parseFloat(startHandleRef.current?.style.left || '0');
                        if (p * 100 > currentStartP + 5) {
                          endHandleRef.current!.style.left = `${p * 100}%`;
                          selectionRef.current!.style.right = `${100 - (p * 100)}%`;
                        }
                      }
                    }}
                    onPointerUp={(e) => {
                      if (!isDraggingRef.current) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const p = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                      const time = p * duration;

                      if (isDraggingRef.current === 'start') {
                        setStartTime(Math.max(0, Math.min(endTime - 0.5, time)));
                      } else {
                        setEndTime(Math.max(startTime + 0.5, Math.min(duration, time)));
                      }
                      isDraggingRef.current = null;
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    }}
                  >
                    {/* Marcador Início */}
                    <div 
                      ref={startHandleRef}
                      className="range-handle" 
                      style={{ 
                        left: `${(startTime / duration) * 100}%`, 
                        transform: 'translateX(-50%)',
                        zIndex: 10,
                        width: '30px'
                      }}
                      onPointerDown={(e) => {
                        isDraggingRef.current = 'start';
                        e.currentTarget.parentElement?.setPointerCapture(e.pointerId);
                      }}
                    />
                    {/* Marcador Fim */}
                    <div 
                      ref={endHandleRef}
                      className="range-handle" 
                      style={{ 
                        left: `${(endTime / duration) * 100}%`, 
                        transform: 'translateX(-50%)',
                        zIndex: 10,
                        width: '30px'
                      }}
                      onPointerDown={(e) => {
                        isDraggingRef.current = 'end';
                        e.currentTarget.parentElement?.setPointerCapture(e.pointerId);
                      }}
                    />
                    {/* Área Selecionada */}
                    <div 
                      ref={selectionRef}
                      className="selection-overlay" 
                      style={{ 
                        left: `${(startTime / duration) * 100}%`, 
                        right: `${100 - (endTime / duration) * 100}%`,
                        borderWidth: '2px 0'
                      }} 
                    />
                  </div>
                </div>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', textAlign: 'center', margin: 0 }}>Arraste os marcadores roxos para cortar o vídeo</p>
            </div>
          )}

          {/* Rodapé (Captura) */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, padding: '0 30px calc(env(safe-area-inset-bottom, 40px) + 40px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {!isRecording && !preview ? (
              <button onClick={() => galleryInputRef.current?.click()} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', width: '50px', height: '50px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={26} /></button>
            ) : preview && !showEditor ? (
              <button onClick={() => { setPreview(null); setVideoFile(null); setThumbnails([]); setStartTime(0); setEndTime(0); setZoom(1); startCamera(); }} style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', width: '50px', height: '50px', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RotateCcw size={26} /></button>
            ) : <div style={{ width: '50px' }} />}

            {!preview && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                {isRecording && <span style={{ color: '#fff', fontWeight: 900, background: '#ef4444', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem' }}>{formatTime(recordingTime)}</span>}
                <div className={`camera-btn ${isRecording ? 'recording' : ''}`} onClick={isRecording ? stopRecording : startRecording}>
                  <div className="inner-record" />
                </div>
              </div>
            )}
            <div style={{ width: '50px' }} />
            <input type="file" ref={galleryInputRef} hidden accept="video/*" onChange={handleFileChange} />
          </div>
        </div>
      )}

      {/* STEP 2: REFINO E POSTAGEM (ELITE UI) */}
      {step === 2 && (
        <div style={{ 
          flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column', 
          alignItems: 'center', height: '100%', overflowY: 'auto', background: '#000' 
        }}>
          <header style={{ width: '100%', maxWidth: '450px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0' }}>
            <button onClick={() => setStep(1)} style={{ color: '#fff', background: 'transparent', border: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '5px' }}>
               <ChevronLeft size={20} /> VOLTAR
            </button>
            <h3 style={{ margin: 0, fontWeight: 900, color: '#fff', fontSize: '0.9rem', letterSpacing: '1px' }}>ESTÚDIO DE LANÇAMENTO</h3>
          </header>

          <div style={{ width: '100%', maxWidth: '450px', display: 'flex', flexDirection: 'column', gap: '1.2rem', paddingBottom: '2rem' }}>
            
            {/* CARD PREMIUM DE COMPOSIÇÃO */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.03)', 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              borderRadius: '32px', padding: '1.5rem',
              backdropFilter: 'blur(20px)',
              display: 'flex', flexDirection: 'column', gap: '1.2rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
            }}>
              {/* Input de Texto Profissional */}
              <textarea 
                placeholder="Qual o papo de hoje, cria? Manda a visão... 🎤" 
                value={description} onChange={e => setDescription(e.target.value)}
                style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '1.1rem', minHeight: '80px', outline: 'none', resize: 'none' }}
                maxLength={150} autoFocus
              />

              {/* Preview de Vídeo com Badge de Verificação */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div className="preview-miniature" style={{ 
                  border: '2px solid #a855f7', width: '200px', height: '300px',
                  boxShadow: '0 0 40px rgba(168, 85, 247, 0.15)',
                  borderRadius: '20px'
                }}>
                  <video ref={step2VideoRef} src={preview!} muted autoPlay loop style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', color: '#fff', fontWeight: 900, border: '1px solid rgba(168,85,247,0.3)' }}>
                    {formatTime(endTime - startTime)}
                  </div>
                </div>

                {/* Ritual de Verificação (Integrado) */}
                <div style={{ width: '100%' }}>
                  {verificationStatus === 'idle' && (
                    <button 
                      onClick={handleVerify}
                      style={{ 
                        width: '100%', padding: '14px', borderRadius: '15px', 
                        background: 'rgba(168,85,247,0.1)', border: '1px dashed #a855f7',
                        color: '#a855f7', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                      }}
                    >
                      <AlertCircle size={18} /> VALIDAR CONTEÚDO ELITE
                    </button>
                  )}

                  {verificationStatus === 'verifying' && (
                    <div style={{ width: '100%', textAlign: 'center' }}>
                      <p style={{ color: '#a855f7', fontWeight: 900, fontSize: '0.7rem', marginBottom: '8px', letterSpacing: '1px' }}>
                        {verificationProgress < 50 ? 'ESCANEANDO PIXELS...' : 'SINCRONIZANDO BLOCKCHAIN...'}
                      </p>
                      <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${verificationProgress}%`, height: '100%', background: '#a855f7', boxShadow: '0 0 10px #a855f7', transition: 'width 0.1s linear' }} />
                      </div>
                    </div>
                  )}

                  {verificationStatus === 'success' && (
                    <div style={{ 
                      width: '100%', padding: '12px', borderRadius: '15px', 
                      background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                    }}>
                      <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Play size={10} color="#fff" fill="#fff" />
                      </div>
                      <span style={{ color: '#22c55e', fontWeight: 900, fontSize: '0.8rem', letterSpacing: '1px' }}>CONTEÚDO VERIFICADO ✅</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* MENSAGEM INFORMATIVA NO RODAPÉ */}
            <div style={{ textAlign: 'center', padding: '0 1rem' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', margin: '0 0 4px 0' }}>
                🌎 Seu vídeo é <span style={{ color: '#a855f7', fontWeight: 800 }}>público para todos</span> no AVISTA.
              </p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', margin: '0 0 10px 0' }}>
                📍 Ativo por 15 dias • 💎 Presentes na carteira
              </p>
              <p style={{ color: '#fff', fontSize: '0.85rem', fontWeight: 800, margin: 0, fontStyle: 'italic', opacity: 0.9 }}>
                "O topo é seu, manda o papo reto! 🎤✨"
              </p>
            </div>
          </div>

          <div style={{ width: '100%', maxWidth: '450px', paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 20px)', marginTop: 'auto' }}>
            <button 
              className="papo-reto-btn" 
              onClick={handleSubmit} 
              disabled={uploading || !isVerified} 
              style={{ 
                width: '100%', height: '64px', borderRadius: '24px', 
                background: isVerified ? 'linear-gradient(90deg, #a855f7, #6366f1)' : 'rgba(255,255,255,0.05)', 
                border: 'none', color: isVerified ? '#fff' : 'rgba(255,255,255,0.2)', 
                fontWeight: 900, fontSize: '1.2rem', cursor: isVerified ? 'pointer' : 'not-allowed', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                boxShadow: isVerified ? '0 15px 40px rgba(168,85,247,0.3)' : 'none',
                transition: 'all 0.4s'
              }}
            >
              {uploading ? <Loader2 className="animate-spin" size={24} /> : <><Send size={22} /> LANÇAR AGORA</>}
            </button>
          </div>
        </div>
      )}
      {/* OVERLAY DE CARREGAMENTO DA EDIÇÃO */}
      {isApplyingEdits && (
        <div style={{ 
          position: 'absolute', inset: 0, zIndex: 99999, 
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '20px', animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{ position: 'relative' }}>
            <div style={{ 
              width: '80px', height: '80px', borderRadius: '50%', 
              border: '4px solid rgba(168, 85, 247, 0.2)',
              borderTopColor: '#a855f7',
              animation: 'spin 1s linear infinite'
            }} />
            <div style={{ 
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Scissors size={24} color="#a855f7" className="animate-pulse" />
            </div>
          </div>
          <h2 style={{ 
            color: '#fff', fontWeight: 900, fontSize: '1.4rem', 
            textShadow: '0 0 20px rgba(168, 85, 247, 0.8)',
            margin: 0, letterSpacing: '1px'
          }}>
            TÁ CARREGANDO CRIA... 🎬🔥
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', margin: 0 }}>
            Estamos preparando sua obra de arte para a pista!
          </p>

          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          `}</style>
        </div>
      )}
    </div>
  );
}
