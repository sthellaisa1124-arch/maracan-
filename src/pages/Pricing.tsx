import { MoralWallet } from '../components/MoralWallet';
import { Wallet } from 'lucide-react';

interface PricingProps {
  onPlanSelected?: () => void;
  userProfile: any;
  session: any;
}

export function Pricing({ userProfile, session }: PricingProps) {
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <Wallet size={28} color="var(--primary)" />
        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#fff', margin: 0 }}>Minha Moral</h1>
      </div>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem', marginBottom: '2rem' }}>
        Compre Moral, envie presentes nos vídeos e troque papo com a IA. 1 Moral = R$0,01.
      </p>
      <MoralWallet
        session={session}
        profile={userProfile}
        onBalanceUpdate={() => {}}
      />
    </div>
  );
}
