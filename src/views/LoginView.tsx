import React, { useState, useEffect } from 'react';
import type { Worker } from '../types';
import { auth } from '../services/auth';
import { api } from '../services/api';
import { Mountain, LogIn, Lock, Wifi, Eye, EyeOff, User, AlertCircle, Download } from 'lucide-react';

interface Props {
  onLoginSuccess: (user: Worker) => void;
  onNotify?: (type: 'success' | 'info' | 'warning' | 'error', title: string, message?: string) => void;
}

export const LoginView: React.FC<Props> = ({ onLoginSuccess, onNotify }) => {
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; pin?: string }>({});
  const [isDbOnline, setIsDbOnline] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    api.checkHealth().then((res) => setIsDbOnline(res.online));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const validateForm = (): boolean => {
    const errors: { username?: string; pin?: string } = {};
    const trimmedId = identifier.trim();

    if (!trimmedId) {
      errors.username = 'Username akun wajib diisi.';
    } else if (trimmedId.length < 3) {
      errors.username = 'Username minimal harus 3 karakter.';
    }

    if (!pin) {
      errors.pin = 'PIN keamanan wajib diisi.';
    } else if (!/^[0-9]{6}$/.test(pin)) {
      errors.pin = 'PIN harus tepat 6 digit angka (contoh: 123456).';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    const res = auth.login(identifier.trim(), pin.trim());
    setIsLoading(false);

    if (res.success && res.user) {
      if (onNotify) {
        onNotify('success', 'Berhasil Masuk', `Selamat datang, ${res.user.name}!`);
      }
      onLoginSuccess(res.user);
    } else {
      setErrorMessage(res.message || 'Login gagal. Periksa kembali username dan PIN Anda.');
    }
  };


  return (
    <div className="login-screen-wrapper" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: '#f8fafc' }}>
      <div style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 12px auto',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 8px 20px -4px rgba(2, 132, 199, 0.4)',
            }}
          >
            <Mountain size={34} />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            PANORAMA
          </h1>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginTop: '2px' }}>
            Super App Tour Operations & Management
          </div>

          {/* Centralized DB Status Indicator */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              background: isDbOnline ? '#dcfce7' : '#fef3c7',
              border: `1px solid ${isDbOnline ? '#bbf7d0' : '#fde68a'}`,
              marginTop: '10px',
              fontSize: '11px',
              fontWeight: 700,
              color: isDbOnline ? '#15803d' : '#b45309',
            }}
          >
            <Wifi size={13} />
            <span>{isDbOnline ? 'Database MySQL Terpusat: Online (Live Sync)' : 'Database: Mode Lokal (Offline)'}</span>
          </div>
        </div>

        {/* Login Card */}
        <div
          className="metric-card"
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
              Masuk ke Akun Anda
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              Autentikasi menggunakan Username dan PIN Keamanan 6 Digit
            </div>
          </div>

          {errorMessage && (
            <div style={{ background: '#fee2e2', border: '1px solid #fecaca', padding: '8px 12px', borderRadius: '8px', color: '#991b1b', fontSize: '12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleManualLogin} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Field 1: Username */}
            <div className="form-group">
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                <span>Username Akun:</span>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 400 }}>Contoh: admin, budi, rian</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="form-input"
                  style={{
                    width: '100%',
                    paddingLeft: '34px',
                    fontSize: '13px',
                    borderColor: fieldErrors.username ? '#dc2626' : '#e2e8f0',
                    backgroundColor: fieldErrors.username ? '#fef2f2' : '#ffffff',
                  }}
                  placeholder="Masukkan username Anda (misal: budi, admin)"
                  value={identifier}
                  autoComplete="username"
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (fieldErrors.username) setFieldErrors({ ...fieldErrors, username: undefined });
                  }}
                  autoFocus
                />
              </div>
              {fieldErrors.username && (
                <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={12} />
                  <span>{fieldErrors.username}</span>
                </div>
              )}
            </div>

            {/* Field 2: PIN */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>
                  PIN Keamanan (6 Digit):
                </label>
                <span style={{ fontSize: '10px', color: '#059669', fontWeight: 600 }}>Default: 123456</span>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#64748b" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="current-password"
                  className="form-input"
                  style={{
                    width: '100%',
                    paddingLeft: '34px',
                    paddingRight: '36px',
                    fontSize: '14px',
                    letterSpacing: showPin ? 'normal' : '0.2em',
                    borderColor: fieldErrors.pin ? '#dc2626' : '#e2e8f0',
                    backgroundColor: fieldErrors.pin ? '#fef2f2' : '#ffffff',
                  }}
                  placeholder="6 digit angka PIN"
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setPin(val);
                    if (fieldErrors.pin) setFieldErrors({ ...fieldErrors, pin: undefined });
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                >
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.pin && (
                <div style={{ color: '#dc2626', fontSize: '11px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <AlertCircle size={12} />
                  <span>{fieldErrors.pin}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
              style={{ width: '100%', padding: '10px', fontSize: '13px', fontWeight: 700, gap: '8px', marginTop: '4px' }}
            >
              <LogIn size={16} />
              <span>{isLoading ? 'Memverifikasi Sesi...' : 'Masuk Sekarang'}</span>
            </button>
          </form>

          {deferredPrompt && (
            <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
              <button
                type="button"
                onClick={handleInstallApp}
                className="btn btn-outline"
                style={{
                  width: '100%',
                  padding: '9px',
                  fontSize: '12px',
                  fontWeight: 700,
                  gap: '8px',
                  borderColor: '#bae6fd',
                  color: '#0284c7',
                  backgroundColor: '#f0f9ff',
                }}
              >
                <Download size={15} />
                <span>Pasang Aplikasi ke Layar Utama (PWA)</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8' }}>
          Panorama Tour Operations Super App • Build Multi-Device RBAC
        </div>
      </div>
    </div>
  );
};

export default LoginView;
