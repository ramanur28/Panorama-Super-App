import React, { useState, useEffect } from 'react';
import { Mountain, LogOut, Download } from 'lucide-react';
import type { Worker } from '../types';

interface Props {
  currentUser?: Worker;
  onLogout?: () => void;
}

export const MobileHeader: React.FC<Props> = ({ currentUser, onLogout }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const getRoleBadgeStyle = (role?: string) => {
    switch (role) {
      case 'driver_jeep':
        return { bg: '#fff7ed', text: '#c2410c', border: '#ffedd5', label: 'Jeep' };
      case 'driver_lapangan':
        return { bg: '#f0f9ff', text: '#0369a1', border: '#e0f2fe', label: 'Shuttle' };
      case 'photographer':
        return { bg: '#fbf7ff', text: '#6d28d9', border: '#ede9fe', label: 'Foto' };
      case 'admin':
      default:
        return { bg: '#eff6ff', text: '#1d4ed8', border: '#dbeafe', label: 'Admin' };
    }
  };

  const roleStyle = getRoleBadgeStyle(currentUser?.role);

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
        {deferredPrompt && (
          <button
            type="button"
            onClick={handleInstallClick}
            className="btn btn-primary btn-sm"
            title="Pasang Aplikasi ke Perangkat"
            style={{
              padding: '4px 9px',
              fontSize: '11px',
              gap: '4px',
              borderRadius: '8px',
              backgroundColor: '#0284c7',
              borderColor: '#0284c7',
              color: '#ffffff',
            }}
          >
            <Download size={13} />
            <span>Install</span>
          </button>
        )}

        {currentUser && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 8px',
              borderRadius: '999px',
              backgroundColor: roleStyle.bg,
              border: `1px solid ${roleStyle.border}`,
              fontSize: '11px',
              fontWeight: 600,
              color: roleStyle.text,
            }}
            title={`Login sebagai ${currentUser.name} (${currentUser.role})`}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: roleStyle.text,
              }}
            />
            <span>{currentUser.name.split(' ')[0]}</span>
            <span style={{ opacity: 0.7, fontSize: '10px' }}>({roleStyle.label})</span>
          </div>
        )}

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="btn btn-outline btn-sm"
            title="Keluar dari akun (Logout)"
            style={{
              padding: '4px 9px',
              fontSize: '11px',
              gap: '5px',
              borderColor: '#fecaca',
              color: '#dc2626',
              backgroundColor: '#fff5f5',
            }}
          >
            <LogOut size={13} />
            <span>Keluar</span>
          </button>
        )}
      </div>
    </header>
  );
};

