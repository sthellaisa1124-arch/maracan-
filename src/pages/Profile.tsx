import { useState, useEffect, useRef } from 'react';
import { Avista } from './Avista'; // Importar para o overlay
import { supabase } from '../lib/supabase';
import { User, AlertCircle, Loader2, ArrowLeft, Settings, MessageCircle, Heart, Eye, ShieldAlert } from 'lucide-react';
import { MoralWallet } from '../components/MoralWallet';
import { UserBadges } from '../components/Badges';
import { UserRankProgress } from '../components/UserRankProgress';
import { CreatorArea } from '../components/CreatorArea';

export function Profile({ 
  userProfile, 
  session, 
  viewingUsername, 
  onBackToMyProfile, 
  onStartChat, 
  onTabChange,
  onJoinLive
}: { 
  userProfile: any, 
  session: any, 
  viewingUsername?: string | null, 
  onBackToMyProfile?: () => void, 
  onStartChat?: (username: string) => void, 
  onTabChange?: (tab: string) => void,
  onJoinLive?: (live: any) => void
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSettingsMode, setIsSettingsMode] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'menu' | 'conta' | 'moral' | 'rank' | 'criador'>('menu');
  
  // States para Edição
  const [newUsername, setNewUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [avistaPosts, setAvistaPosts] = useState<any[]>([]); // AVISTA posts
  const [activeProfileTab, setActiveProfileTab] = useState<'papos' | 'avista' | 'midias'>('papos');
  const [selectedAvistaId, setSelectedAvistaId] = useState<string | null>(null);
  const [cooldownDays, setCooldownDays] = useState(0);
  const [toast, setToast] = useState<{msg: string; typ: string} | null>(null);
  
  // Estados Sociais
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isOwnProfile = !viewingUsername || viewingUsername === userProfile?.username;
  const [isUserLive, setIsUserLive] = useState<any>(null);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      let targetProfile = userProfile;

      if (viewingUsername && viewingUsername !== userProfile?.username) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', viewingUsername)
          .single();
        
        if (data) {
          targetProfile = data;
        } else {
          notify("Cria não encontrado na pista! 🛑", "error");
          if (onBackToMyProfile) onBackToMyProfile();
          return;
        }
      }

      if (targetProfile) {
        setProfile(targetProfile);
        setNewUsername(targetProfile.username || '');
        setAvatarUrl(targetProfile.avatar_url || '');
        setBio(targetProfile.bio || '');
        setWebsite(targetProfile.website || '');
        setShowSuggestions(targetProfile.show_suggestions !== false);
        
        if (isOwnProfile && targetProfile.last_profile_update && !targetProfile.is_admin) {
          const last = new Date(targetProfile.last_profile_update);
          const now = new Date();
          const diffDays = Math.ceil((30 * 24 * 60 * 60 * 1000 - (now.getTime() - last.getTime())) / (1000 * 60 * 60 * 24));
          if (diffDays > 0) setCooldownDays(diffDays);
        }

        fetchFollowData(targetProfile.id);
        fetchUserPosts(targetProfile.id);
        fetchAvistaPosts(targetProfile.id);
      }
      setLoading(false);
    }
    
    async function checkUserIsLive(userId: string) {
      if (!userId) return;
      const { data } = await supabase
        .from('live_sessions')
        .select(`
          *,
          host_profile:profiles(username, avatar_url, badges, total_donated)
        `)
        .eq('host_id', userId)
        .eq('is_live', true)
        .maybeSingle();
      
      if (data) setIsUserLive(data);
      else setIsUserLive(null);
    }

    loadProfile();
    if (profile?.id) checkUserIsLive(profile.id);
    else if (userProfile?.id && isOwnProfile) checkUserIsLive(userProfile.id);

    // Radar Realtime no Perfil
    const channel = supabase.channel('profile_live_status')
      .on('postgres_changes' as any, { event: '*', table: 'live_sessions', schema: 'public' }, () => {
        if (profile?.id) checkUserIsLive(profile.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userProfile, viewingUsername, profile?.id]);

  async function fetchFollowData(targetId: string) {
    if (!session?.user?.id) return;
    
    const { data: followData } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', session.user.id)
      .eq('following_id', targetId)
      .maybeSingle();
    
    setIsFollowing(!!followData);

    if (!targetId) return;

    const { count: followers } = await supabase
      .from('follows')
      .select('id', { count: 'exact' })
      .eq('following_id', targetId);
    
    setFollowersCount(followers || 0);

    const { count: following } = await supabase
      .from('follows')
      .select('id', { count: 'exact' })
      .eq('follower_id', targetId);
    
    setFollowingCount(following || 0);
  }

  async function toggleFollow() {
    if (!session?.user?.id || isOwnProfile) return;

    if (isFollowing) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', session.user.id)
        .eq('following_id', profile.id);
      
      if (!error) {
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
        notify("Deixou de seguir o cria. 👋");
      }
    } else {
      const { error } = await supabase
        .from('follows')
        .insert([{ follower_id: session.user.id, following_id: profile.id }]);
      
      if (!error) {
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        notify("Agora você segue esse cria! 🔥🏙️");
        
        await supabase.from('notifications').insert({
          user_id: profile.id,
          from_user_id: session.user.id,
          type: 'follow'
        });
      }
    }
  }

  async function fetchUserPosts(userId: string) {
    const { data } = await supabase
      .from('user_posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) setUserPosts(data);
  }

  async function fetchAvistaPosts(userId: string) {
    const { data } = await supabase
      .from('avista_posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (data) setAvistaPosts(data);
  }

  const notify = (msg: string, typ = 'success') => {
    setToast({ msg, typ });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile || !isOwnProfile) return;

    if (cooldownDays > 0 && !profile?.is_admin) {
      return notify(`Segura a onda, cria! Você só pode mudar a foto em ${cooldownDays} dias.`, "error");
    }

    setSaving(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(filePath, file);

    if (uploadError) {
      notify("Erro no upload: " + uploadError.message, "error");
      setSaving(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(filePath);
    setAvatarUrl(publicUrl || '');
    setSaving(false);
    notify("Foto monstra! Salve as alterações pra pista ver. 📸✨");
  };

  const handleSave = async () => {
    if (!isOwnProfile) return;
    if (newUsername.length < 3) return notify("Nome de usuário muito curto, cria!", "error");
    
    if (!/^[a-z0-9_.-]+$/.test(newUsername.toLowerCase())) {
      return notify("Nome de usuário não pode ter emojis, espaços ou símbolos! Só letras, números, ponto e underline.", "error");
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        username: newUsername,
        avatar_url: avatarUrl,
        bio: bio,
        website: website,
        show_suggestions: showSuggestions,
        last_profile_update: new Date().toISOString()
      })
      .eq('id', profile.id);

    if (error) {
      notify("Erro ao salvar: Usuário já existe ou erro no banco.", "error");
    } else {
      notify("Perfil atualizado! 🔥💎");
      setIsEditing(false);
      setProfile({ ...profile, username: newUsername, avatar_url: avatarUrl, bio: bio, website: website, show_suggestions: showSuggestions });
    }
    setSaving(false);
  };



  if (loading) return <div className="loading-container"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="profile-social-container animate-fade-up">
      {toast && <div className={`toast-notification ${toast.typ}`}>{toast.msg}</div>}
      
      {isSettingsMode ? (
         <div className="settings-page-wrapper" style={{ padding: '0', maxWidth: '600px', margin: '0 auto', width: '100%', minHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            
            {/* TELA DE MENU (Opções) */}
            {settingsTab === 'menu' && (
              <div style={{ padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
                 <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
                    <button onClick={() => setIsSettingsMode(false)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                       <ArrowLeft size={24} />
                    </button>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>Configurações</h2>
                 </div>
                 
                 {profile?.is_admin && profile?.account_role === 'ceo' && (
                   <button 
                     onClick={() => onTabChange && onTabChange('admin')}
                     style={{ 
                       background: 'linear-gradient(135deg, #fde68a 0%, #f59e0b 100%)', 
                       color: '#000', 
                       border: 'none', 
                       padding: '1.2rem 1rem', 
                       width: '100%',
                       borderRadius: '0.5rem', 
                       fontWeight: 900, 
                       cursor: 'pointer', 
                       fontSize: '0.95rem', 
                       marginBottom: '1rem',
                       display: 'flex',
                       alignItems: 'center',
                       gap: '0.75rem',
                       boxShadow: '0 4px 10px rgba(245, 158, 11, 0.2)'
                     }}
                   >
                     <ShieldAlert size={20} /> GABINETE CEO 👑
                   </button>
                 )}

                 <button 
                   onClick={() => setSettingsTab('conta')}
                   style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--separator)', color: '#fff', padding: '1.2rem 1rem', borderRadius: '0.5rem', textAlign: 'left', fontWeight: 600, cursor: 'pointer', marginBottom: '0.75rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                 >
                   👤 Central de Contas
                 </button>
                 
                 <button 
                   onClick={() => setSettingsTab('moral')}
                   style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--separator)', color: '#fff', padding: '1.2rem 1rem', borderRadius: '0.5rem', textAlign: 'left', fontWeight: 600, cursor: 'pointer', marginBottom: '0.75rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                 >
                   🪙 Minha Moral
                   <span style={{ background: 'var(--primary)', color: '#000', fontSize: '0.8rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '4px', marginLeft: 'auto' }}>
                     {profile?.moral_balance ?? 0}
                   </span>
                 </button>
                 <button 
                   onClick={() => setSettingsTab('rank')}
                   style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--separator)', color: '#fff', padding: '1.2rem 1rem', borderRadius: '0.5rem', textAlign: 'left', fontWeight: 600, cursor: 'pointer', marginBottom: '0.75rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                 >
                   📊 Meus Ranks & Evolução
                 </button>

                 <button 
                   onClick={() => setSettingsTab('criador')}
                   style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--separator)', color: '#fff', padding: '1.2rem 1rem', borderRadius: '0.5rem', textAlign: 'left', fontWeight: 600, cursor: 'pointer', marginBottom: '0.75rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                 >
                   🎬 Área do Criador
                 </button>
              </div>
            )}

            {/* TELA DE CONTEÚDO */}
            {settingsTab !== 'menu' && (
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                 
               {/* CreatorArea tem seu próprio header com seta de voltar — tratado internamente */}
               {settingsTab === 'criador' && (
                 <CreatorArea
                   session={session}
                   followersCount={followersCount}
                   onBack={() => setSettingsTab('menu')}
                 />
               )}

               {settingsTab !== 'criador' && (
               <>
                 <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
                    <button onClick={() => setSettingsTab('menu')} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                       <ArrowLeft size={24} />
                    </button>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>
                       {settingsTab === 'conta' ? 'Central de Contas' : settingsTab === 'moral' ? 'Minha Moral' : 'Ranks & Evolução'}
                    </h2>
                 </div>

               {settingsTab === 'conta' && (
               <>
               <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '1.5rem' }}>Informações pessoais</h2>
               <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: 1.5 }}>
                 Forneça suas informações pessoais abaixo. Atualize seus dados para manter sua conta da VELAR sempre protegida e correta com você.
               </p>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '500px' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                     <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', color: '#fff', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.95rem' }}>Nome</label>
                        <input type="text" value={profile?.first_name || profile?.username || ''} disabled style={{ width: '100%', background: 'transparent', border: '1px solid var(--separator)', borderRadius: '0.5rem', padding: '0.8rem 1rem', color: '#fff', fontSize: '0.95rem', opacity: 0.6, cursor: 'not-allowed' }} />
                     </div>
                     <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', color: '#fff', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.95rem' }}>Sobrenome</label>
                        <input type="text" value={profile?.last_name || ''} disabled style={{ width: '100%', background: 'transparent', border: '1px solid var(--separator)', borderRadius: '0.5rem', padding: '0.8rem 1rem', color: '#fff', fontSize: '0.95rem', opacity: 0.6, cursor: 'not-allowed' }} />
                     </div>
                  </div>

                  <div>
                     <label style={{ display: 'block', color: '#fff', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.95rem' }}>E-mail</label>
                     <input type="email" value={session?.user?.email || ''} disabled style={{ width: '100%', background: 'transparent', border: '1px solid var(--separator)', borderRadius: '0.5rem', padding: '0.8rem 1rem', color: '#fff', fontSize: '0.95rem', opacity: 0.6, cursor: 'not-allowed' }} />
                  </div>

                  <div>
                     <label style={{ display: 'block', color: '#fff', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.95rem' }}>Número de Telefone</label>
                     <input type="text" value={profile?.phone || 'Não cadastrado'} disabled style={{ width: '100%', background: 'transparent', border: '1px solid var(--separator)', borderRadius: '0.5rem', padding: '0.8rem 1rem', color: '#fff', fontSize: '0.95rem', opacity: 0.6, cursor: 'not-allowed' }} />
                  </div>

                  <hr style={{ borderColor: 'var(--separator)', margin: '1rem 0', opacity: 0.5 }} />

                  <button 
                     onClick={async () => await supabase.auth.signOut()} 
                     style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', border: '1px solid rgba(255,59,48,0.3)', padding: '1rem', borderRadius: '0.5rem', fontWeight: 800, cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s', width: '100%' }}
                     onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 59, 48, 0.2)'}
                     onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 59, 48, 0.1)'}
                  >
                     Sair da conta
                  </button>
               </div>
               </>
               )}

               {settingsTab === 'moral' && (
               <>
                 <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>Minha Moral 🪙</h2>
                 <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Gerencie suas moedas e veja seu extrato completo.</p>
                 <MoralWallet 
                   session={session} 
                   profile={profile}
                   onBalanceUpdate={(newBalance) => setProfile((p: any) => ({ ...p, moral_balance: newBalance }))}
                 />
               </>
               )}

               {settingsTab === 'rank' && (
               <>
                 <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>Evolução de Elite 📊</h2>
                 <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>Acompanhe seu progresso e suba na hierarquia da VELAR.</p>
                 <UserRankProgress userProfile={profile} />
               </>
               )}
               </>
               )}
            </div>
            )}
         </div>
      ) : isEditing ? (
         <div className="settings-page-wrapper" style={{ padding: '2rem 1rem', maxWidth: '800px', margin: '0 auto', width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '2rem' }}>Editar perfil</h1>

            {/* Card Avatar */}
            <div style={{ background: '#111', borderRadius: '1rem', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover' }} alt="Avatar" />
                  ) : (
                    <div className="velar-elite-avatar" style={{ width: '56px', height: '56px' }}>
                      <User />
                    </div>
                  )}
                  <div>
                    <strong style={{ display: 'block', color: '#fff', fontSize: '1rem' }}>{profile?.username}</strong>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{profile?.first_name || 'Usuário'}</span>
                  </div>
               </div>
               <button onClick={() => cooldownDays > 0 && !profile?.is_admin ? notify("Aguarde " + cooldownDays + " dias", "error") : fileInputRef.current?.click()} style={{ background: 'var(--primary)', color: '#000', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                  Mudar foto
               </button>
               <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleAvatarUpload} />
            </div>

            {/* Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
               <div>
                  <label style={{ display: 'block', color: '#fff', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.95rem' }}>Site</label>
                  <input 
                    type="text" 
                    placeholder="Site"
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                    style={{ width: '100%', background: 'transparent', border: '1px solid var(--separator)', borderRadius: '0.5rem', padding: '0.8rem 1rem', color: '#fff', fontSize: '0.95rem', outline: 'none' }} 
                  />
                  <span style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>Adicione o link do seu site ou portfólio.</span>
               </div>

               <div>
                  <label style={{ display: 'block', color: '#fff', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.95rem' }}>Bio</label>
                  <div style={{ position: 'relative' }}>
                    <textarea 
                      value={bio} 
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={150}
                      style={{ width: '100%', background: 'transparent', border: '1px solid var(--separator)', borderRadius: '0.5rem', padding: '0.8rem 1rem', color: '#fff', fontSize: '0.95rem', outline: 'none', minHeight: '80px', resize: 'none' }} 
                    />
                    <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      {bio.length} / 150
                    </div>
                  </div>
               </div>

               <div>
                  <label style={{ display: 'block', color: '#fff', fontWeight: 700, marginBottom: '0.5rem', fontSize: '0.95rem' }}>Mostrar Sugestões</label>
                  <div style={{ width: '100%', background: 'transparent', border: '1px solid var(--separator)', borderRadius: '0.5rem', padding: '1rem', color: '#fff', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div>
                       <span style={{display: 'block', fontWeight: 700}}>Mostrar sugestões de contas em perfis</span>
                       <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>Permite que sua conta seja sugerida quando pessoas seguirem perfis parecidos.</span>
                     </div>
                     <div 
                        onClick={() => setShowSuggestions(!showSuggestions)}
                        style={{ width: '40px', height: '24px', background: showSuggestions ? 'var(--primary)' : '#333', borderRadius: '12px', position: 'relative', cursor: 'pointer', transition: 'background 0.3s' }}>
                        <div style={{ width: '18px', height: '18px', background: '#fff', borderRadius: '50%', position: 'absolute', top: '3px', left: showSuggestions ? '19px' : '3px', transition: 'left 0.3s' }}></div>
                     </div>
                  </div>
               </div>

               {/* Warning Cooldown */}
               {(cooldownDays > 0 && !profile?.is_admin) && (
                  <div style={{ padding: '1rem', border: '1px solid var(--separator)', color: '#ff4444', borderRadius: '0.5rem', fontSize: '0.85rem', display: 'flex', gap: '0.8rem', alignItems: 'center', marginTop: '1rem' }}>
                    <AlertCircle size={20} />
                    <span>Por medida de segurança, o perfil está bloqueado para edições. Aguarde <strong>{cooldownDays} dias</strong>.</span>
                  </div>
               )}

               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
                  <button onClick={() => setIsEditing(false)} style={{ background: 'transparent', color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', opacity: 0.7 }}>
                     &lt; Cancelar
                  </button>
                  <button 
                    onClick={cooldownDays > 0 && !profile?.is_admin ? undefined : handleSave} 
                    disabled={saving || (cooldownDays > 0 && !profile?.is_admin)}
                    style={{ background: '#0095f6', color: '#fff', border: 'none', padding: '0.6rem 2rem', borderRadius: '0.5rem', fontWeight: 600, fontSize: '0.95rem', cursor: (cooldownDays > 0 && !profile?.is_admin) ? 'not-allowed' : 'pointer', opacity: (cooldownDays > 0 && !profile?.is_admin) ? 0.5 : 1 }}
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : 'Enviar'}
                  </button>
               </div>
            </div>
         </div>
      ) : (
      <>
      {!isOwnProfile && (
        <button className="icon-btn" onClick={onBackToMyProfile} style={{ marginBottom: '1.5rem' }}>
          <ArrowLeft size={18} /> <span style={{ marginLeft: '0.5rem', fontWeight: 600 }}>VOLTAR</span>
        </button>
      )}

      {/* HEADER SOCIAL ESTILO INSTAGRAM */}
      <div style={{ marginBottom: '3rem', paddingTop: '2rem', display: 'flex', alignItems: 'stretch', justifyContent: 'center', width: '100%', maxWidth: '900px', margin: '0 auto 2rem auto', flexWrap: 'wrap' }}>
         
         {/* Avatar Area (Esquerda) */}
         <div 
             style={{ display: 'flex', justifyContent: 'center', flexBasis: '30%', minWidth: '100px', marginRight: '1rem', position: 'relative' }}
             onClick={() => isUserLive && onJoinLive?.(isUserLive)}
          >
            {avatarUrl ? (
              <div className={`avatar-wrapper ${isUserLive ? 'is-live-aura' : ''}`} style={{ position: 'relative', width: '100px', height: '100px' }}>
                {isUserLive && <div className="medallion-frame" />}
                {isUserLive && <div className="medallion-ornament" />}
                <div className="live-avatar-box">
                  <img 
                    src={avatarUrl} 
                    alt="Avatar" 
                    className="live-avatar-img"
                    style={{ 
                      border: profile?.is_admin ? '3px solid var(--primary)' : 'none',
                      cursor: isUserLive ? 'pointer' : 'default'
                    }}
                  />
                </div>
                {isUserLive && <div className="live-crystal-tag">AO VIVO</div>}
              </div>
            ) : (
              <div className={`velar-elite-avatar ${isUserLive ? 'is-live-aura' : ''}`} style={{ width: '100px', height: '100px', border: profile?.is_admin ? '3px solid var(--primary)' : '1px solid var(--separator)' }}>
                <User />
              </div>
            )}
            <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleAvatarUpload} />
         </div>

         {/* Info Area (Direita) */}
         <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: '250px' }}>
            
            {/* Linha 1: Username e Botões */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
               <h2 style={{ fontSize: '1.25rem', fontWeight: 500, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 @{profile?.username}
                 <UserBadges badges={profile?.badges} donatedAmount={profile?.total_donated} size={20} />
               </h2>

               {/* Botões de Ação */}
               <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                 {isOwnProfile ? (
                    <>
                      <button onClick={() => setIsEditing(true)} className="profile-action-btn-velar" style={{ border: 'none' }}>
                        Editar
                      </button>

                      <button onClick={() => setIsSettingsMode(true)} className="profile-action-btn-velar" style={{ padding: '0.5rem', display: 'flex' }}>
                         <Settings size={20} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={toggleFollow} style={{ background: isFollowing ? 'rgba(255,255,255,0.1)' : 'var(--primary)', color: isFollowing ? '#fff' : '#000', padding: '0.4rem 1.2rem', borderRadius: '0.5rem', fontSize: '0.9rem', fontWeight: 800, border: 'none', cursor: 'pointer' }}>
                        {isFollowing ? 'Seguindo' : 'Seguir'}
                      </button>
                      <button onClick={() => onStartChat?.(profile?.username)} className="profile-action-btn-velar">
                        Mensagem
                      </button>
                    </>
                  )}
               </div>
            </div>

            {/* Linha 2: Stats (Posts, Seguidores, Seguindo) */}
            <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem' }}>
               <div className="profile-stat-item">
                 <span className="profile-stat-value">{userPosts.length}</span>
                 <span className="profile-stat-label">posts</span>
               </div>
               <div className="profile-stat-item">
                 <span className="profile-stat-value">{followersCount}</span>
                 <span className="profile-stat-label">seguidores</span>
               </div>
               <div className="profile-stat-item">
                 <span className="profile-stat-value">{followingCount}</span>
                 <span className="profile-stat-label">seguindo</span>
               </div>
            </div>

            {/* Linha 3: Nome, Bio e Site */}
            <div style={{ fontSize: '0.95rem', color: '#fff', lineHeight: 1.5 }}>
               <strong style={{ display: 'block', marginBottom: '0.2rem', fontWeight: 600 }}>
                  {profile?.first_name || profile?.username} 
                  {profile?.is_admin && <span style={{ fontSize: '0.6rem', background: 'var(--primary)', color: '#000', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 800, marginLeft: '0.5rem', verticalAlign: 'middle' }}>ADMIN</span>}
               </strong>
               <span style={{ color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '0.2rem' }}>Digital creator</span>
               <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{profile?.bio || (isOwnProfile ? "Adicione uma biografia..." : "")}</p>
               
               {profile?.website && (
                  <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', color: '#e0f2fe', fontWeight: 700, marginTop: '0.5rem', textDecoration: 'none' }}>
                     🔗 {profile.website.replace(/^https?:\/\//, '')}
                  </a>
               )}
            </div>

         </div>
      </div>

      {/* O antigo Modal foi substituído pelo layout Full-Page Config */}

      {/* FEED E TABS NO PERFIL */}
      <div className="profile-posts-feed">
        <div style={{ display: 'flex', gap: '2rem', borderBottom: '1px solid var(--separator)', marginBottom: '1.5rem', padding: '0 1rem' }}>
           <button 
              onClick={() => setActiveProfileTab('papos')}
              style={{ background: 'transparent', border: 'none', borderBottom: activeProfileTab === 'papos' ? '3px solid var(--primary)' : '3px solid transparent', padding: '1rem 0.5rem', color: activeProfileTab === 'papos' ? '#fff' : 'var(--text-muted)', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s' }}>
              PAPOS
           </button>
           <button 
              onClick={() => setActiveProfileTab('avista')}
              style={{ background: 'transparent', border: 'none', borderBottom: activeProfileTab === 'avista' ? '3px solid var(--primary)' : '3px solid transparent', padding: '1rem 0.5rem', color: activeProfileTab === 'avista' ? '#fff' : 'var(--text-muted)', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              AVISTA <div style={{width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', opacity: activeProfileTab === 'avista' ? 1 : 0.4 }} />
           </button>
           <button 
              onClick={() => setActiveProfileTab('midias')}
              style={{ background: 'transparent', border: 'none', borderBottom: activeProfileTab === 'midias' ? '3px solid var(--primary)' : '3px solid transparent', padding: '1rem 0.5rem', color: activeProfileTab === 'midias' ? '#fff' : 'var(--text-muted)', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s' }}>
              MÍDIAS
           </button>
        </div>

        {activeProfileTab === 'papos' && (
          <div className="profile-posts-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {userPosts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Nenhum papo reto largado por aqui... 🎤🔇</div>
            ) : (
              userPosts.map(post => (
                <div key={post.id} className="urbano-card" style={{ padding: '1.25rem' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', opacity: 0.6, fontSize: '0.8rem' }}>
                      <span style={{ fontWeight: 700 }}>@{profile?.username}</span>
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                   </div>
                   <p style={{ fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '1rem' }}>{post.content}</p>
                   {post.image_url && (
                     <img src={post.image_url} alt="Post" style={{ width: '100%', borderRadius: '1rem', border: '1px solid var(--separator)' }} />
                   )}
                   <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--separator)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 700 }}>
                         <Heart size={18} /> 0
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 700 }}>
                         <MessageCircle size={18} /> 0
                      </div>
                   </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeProfileTab === 'avista' && (
          <div className="profile-avista-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '4px' }}>
            {avistaPosts.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                 Nenhum vídeo no AVISTA ainda... 🎥👁️
              </div>
            ) : (
              avistaPosts.map(post => (
                <div 
                  key={post.id} 
                  style={{ position: 'relative', aspectRatio: '9/16', background: '#000', cursor: 'pointer', overflow: 'hidden' }}
                  onClick={() => setSelectedAvistaId(post.id)}
                >
                  <video 
                    src={post.video_url} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} 
                  />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0.5rem', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
                     <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                       <Eye size={12} /> {post.views_count || 0}
                     </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeProfileTab === 'midias' && (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>Álbum de mídias vazio... 🖼️🔇</div>
        )}
      </div>
      </>
      )}

      {/* OVERLAY DO PLAYER AVISTA (ESTILO REELS) */}
      {selectedAvistaId && profile && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          zIndex: 100000, 
          background: '#000',
          animation: 'fadeIn 0.3s ease' 
        }}>
          <Avista 
            session={session}
            onViewProfile={(_username) => {
              // Se clicar no perfil dentro do player, fechamos o player e deixamos o Profile lidar se for outro user
              setSelectedAvistaId(null);
            }}
            filterUserId={profile.id}
            initialPostId={selectedAvistaId}
            onClose={() => setSelectedAvistaId(null)}
          />
        </div>
      )}
      <style>{`
        .avatar-wrapper.is-live-aura { position: relative; }
        @keyframes livePulseRing {
          0% { box-shadow: 0 0 10px #10b98188; }
          50% { box-shadow: 0 0 25px #10b981bb; }
          100% { box-shadow: 0 0 10px #10b98188; }
        }
        @keyframes rotate-ornament { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .medallion-frame {
          position: absolute; inset: -4px; border: 2.5px solid rgba(16, 185, 129, 0.3);
          border-radius: 50%; opacity: 0.8; transition: all 0.3s;
          background: radial-gradient(circle, transparent 70%, rgba(16, 185, 129, 0.05) 100%);
        }
        .medallion-ornament {
          position: absolute; inset: -6px; border: 1.5px solid transparent;
          border-top-color: #10b981; border-bottom-color: #10b981;
          border-radius: 50%; animation: rotate-ornament 8s linear infinite;
        }
        .live-avatar-box {
          width: 100%; height: 100%; border-radius: 50%; padding: 4px;
          background: #000; overflow: hidden; position: relative; z-index: 1;
        }
        .live-avatar-img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
        .live-crystal-tag {
          position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%);
          background: #10b981; color: #fff; font-size: 9px; font-weight: 900;
          padding: 2px 8px; border-radius: 6px; z-index: 2;
          box-shadow: 0 4px 10px rgba(16, 185, 129, 0.4);
          border: 1.5px solid #000; text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          letter-spacing: 0.5px;
        }
      `}</style>
    </div>
  );
}
