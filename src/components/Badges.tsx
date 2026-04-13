import { Check, Star, Sparkles } from 'lucide-react';
import { GifterBadge } from './GifterBadge';

export type BadgeType = 'ceo' | 'verified' | 'influencer' | 'special_pink';

interface BadgeProps {
  type: BadgeType;
  size?: number;
  className?: string;
  showText?: boolean;
}

export function Badge({ type, size = 16, className = '', showText = false }: BadgeProps) {
  switch (type) {
    case 'ceo':
      return (
        <div 
          className={`badge-wrapper ${className}`}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative', width: size + 6, height: size + 6 }}
          title="CEO Supremo"
        >
          <style>{`
            @keyframes ceoBreathe {
              0% { opacity: 0; transform: scale(0.8); }
              50% { opacity: 0.4; transform: scale(1.2); filter: blur(8px); }
              100% { opacity: 0; transform: scale(0.8); }
            }
          `}</style>

          {/* Brilho base expansivo personalizado */}
          <div style={{ position: 'absolute', inset: -4, backgroundColor: '#f59e0b', borderRadius: '50%', filter: 'blur(6px)', animation: 'ceoBreathe 3s ease-in-out infinite' }}></div>
          
          {/* Imagem 3D realística de Coroa da Apple em alta qualidade */}
          <img 
            src="https://em-content.zobj.net/source/apple/354/crown_1f451.png" 
            alt="Coroa CEO"
            style={{ 
              position: 'relative', 
              zIndex: 10, 
              width: '100%', 
              height: '100%', 
              objectFit: 'contain', 
              filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.7)) drop-shadow(0 2px 3px rgba(245, 158, 11, 0.5)) brightness(1.25) contrast(1.2) saturate(1.3)' 
            }}
          />

          {showText && <span style={{ position: 'relative', zIndex: 10, marginLeft: '8px', background: 'linear-gradient(to bottom, #fef08a, #d97706)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 900, textTransform: 'uppercase', textShadow: '0 2px 10px rgba(217,119,6,0.5)', letterSpacing: '1px' }}>CEO</span>}
        </div>
      );

    case 'verified':
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center' }} className={className} title="Verificado Oficial">
          <div 
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', 
              background: 'linear-gradient(135deg, #00d2ff, #3a7bd5)', color: 'white', 
              boxShadow: '0 0 12px rgba(0,210,255,0.4)', padding: '2px' 
            }}
          >
            <Check size={size - 2 > 0 ? size - 2 : 10} strokeWidth={3} />
          </div>
          {showText && <span style={{ marginLeft: '6px', color: '#00d2ff', fontWeight: 600, fontSize: '14px' }}>Verificado</span>}
        </div>
      );

    case 'influencer':
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center' }} className={className} title="Influenciador">
          <div 
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', 
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: 'white', 
              boxShadow: '0 0 12px rgba(108,43,255,0.5)', padding: '4px' 
            }}
          >
            <Star size={size - 2 > 0 ? size - 2 : 10} strokeWidth={2.5} fill="currentColor" />
          </div>
          {showText && <span style={{ marginLeft: '6px', color: 'var(--secondary)', fontWeight: 600, fontSize: '14px' }}>Influenciador</span>}
        </div>
      );

    case 'special_pink':
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center' }} className={className} title="Especial">
          <div 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'linear-gradient(135deg, #fbcfe8, #ec4899, #be185d)', color: 'white', boxShadow: '0 0 8px rgba(236,72,153,0.5)', padding: '2px' }}
          >
            <Sparkles size={size - 2 > 0 ? size - 2 : 10} strokeWidth={2.5} />
          </div>
          {showText && <span style={{ marginLeft: '6px', color: '#ec4899', fontWeight: 600, fontSize: '14px' }}>Especial</span>}
        </div>
      );

    default:
      return null;
  }
}

export function UserBadges({ badges, donatedAmount, size = 16, className = '' }: { badges: string[] | null | undefined, donatedAmount?: number, size?: number, className?: string }) {
  const hasBadges = badges && Array.isArray(badges) && badges.length > 0;
  const hasDonated = typeof donatedAmount === 'number' && donatedAmount > 0;

  if (!hasBadges && !hasDonated) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} className={className}>
      {hasBadges && badges.map((b, i) => (
        <Badge key={i} type={b as BadgeType} size={size} />
      ))}
      {hasDonated && (
        <div style={{ display: 'flex', transform: 'scale(0.9)', transformOrigin: 'left center' }}>
          <GifterBadge donatedAmount={donatedAmount} />
        </div>
      )}
    </div>
  );
}
