import React from 'react';
import type { UserRole } from '../types';
import { Calendar, Wallet, User, TrendingUp, Building, Users } from 'lucide-react';

interface Props {
  role: UserRole;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export const MobileBottomNav: React.FC<Props> = ({ role, activeTab, onSelectTab }) => {
  if (role === 'admin') {
    return (
      <nav className="mobile-bottom-nav">
        <button
          type="button"
          className={`nav-item ${activeTab === 'daily' ? 'active' : ''}`}
          onClick={() => onSelectTab('daily')}
        >
          <Calendar size={18} />
          <span>Operasional</span>
        </button>
        <button
          type="button"
          className={`nav-item ${activeTab === 'pnl' ? 'active' : ''}`}
          onClick={() => onSelectTab('pnl')}
        >
          <TrendingUp size={18} />
          <span>Laba Rugi</span>
        </button>
        <button
          type="button"
          className={`nav-item ${activeTab === 'agencies' ? 'active' : ''}`}
          onClick={() => onSelectTab('agencies')}
        >
          <Building size={18} />
          <span>Tagihan Agen</span>
        </button>
        <button
          type="button"
          className={`nav-item ${activeTab === 'payroll' ? 'active' : ''}`}
          onClick={() => onSelectTab('payroll')}
        >
          <Users size={18} />
          <span>Gaji Kru</span>
        </button>
      </nav>
    );
  }

  // Mobile worker nav
  return (
    <nav className="mobile-bottom-nav">
      <button
        type="button"
        className={`nav-item ${activeTab === 'schedule' ? 'active' : ''}`}
        onClick={() => onSelectTab('schedule')}
      >
        <Calendar size={18} />
        <span>Jadwal Tugas</span>
      </button>
      <button
        type="button"
        className={`nav-item ${activeTab === 'earnings' ? 'active' : ''}`}
        onClick={() => onSelectTab('earnings')}
      >
        <Wallet size={18} />
        <span>Honor & Hari Kerja</span>
      </button>
      <button
        type="button"
        className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
        onClick={() => onSelectTab('profile')}
      >
        <User size={18} />
        <span>Profil Armada</span>
      </button>
    </nav>
  );
};
