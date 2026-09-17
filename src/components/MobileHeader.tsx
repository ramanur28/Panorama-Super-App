import React from 'react';
import { Mountain, RotateCcw } from 'lucide-react';
import { db } from '../services/db';

interface Props {
  onReset: () => void;
}

export const MobileHeader: React.FC<Props> = ({ onReset }) => {
  const handleResetData = () => {
    if (window.confirm('Reset data kembali ke kondisi demo awal?')) {
      db.resetDatabase();
      onReset();
    }
  };

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-icon">
          <Mountain size={20} />
        </div>
        <div>
          <div className="brand-title">PANORAMA</div>
          <div className="brand-subtitle">Super App Tour Ops</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          type="button"
          onClick={handleResetData}
          className="btn btn-outline btn-sm"
          title="Reset database demo"
          style={{ padding: '5px 10px', fontSize: '11px', gap: '5px' }}
        >
          <RotateCcw size={13} />
          <span>Reset Demo</span>
        </button>
      </div>
    </header>
  );
};
