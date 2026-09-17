import React, { useState, useEffect } from 'react';
import type { ConfirmDialogState, ToastMessage, ToastType, Worker } from './types';
import { auth } from './services/auth';
import { db } from './services/db';
import { MobileHeader } from './components/MobileHeader';
import { LoginView } from './views/LoginView';
import { DriverJeepView } from './views/DriverJeepView';
import { DriverLapanganView } from './views/DriverLapanganView';
import { PhotographerView } from './views/PhotographerView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { ToastContainer } from './components/ToastContainer';
import { ConfirmModal } from './components/ConfirmModal';
import './styles/index.css';
import './styles/components.css';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => auth.isAuthenticated());
  const [activeUser, setActiveUser] = useState<Worker | null>(() => auth.getActiveUser());
  const [, setTick] = useState(0);

  // Toast System State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Confirmation Modal State
  const [confirmState, setConfirmState] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    onCancel: () => {},
  });

  const showToast = (type: ToastType, title: string, message?: string) => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const newToast: ToastMessage = { id, type, title, message, duration: 4000 };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const requestConfirm = (options: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDestructive?: boolean;
    requiresInput?: boolean;
    inputPlaceholder?: string;
    initialInputValue?: string;
    onConfirm: (inputValue?: string) => void;
    onCancel?: () => void;
  }) => {
    setConfirmState({
      isOpen: true,
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel,
      cancelLabel: options.cancelLabel,
      isDestructive: options.isDestructive,
      requiresInput: options.requiresInput,
      inputPlaceholder: options.inputPlaceholder,
      initialInputValue: options.initialInputValue,
      onConfirm: (val) => {
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        options.onConfirm(val);
      },
      onCancel: () => {
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        if (options.onCancel) options.onCancel();
      },
    });
  };

  useEffect(() => {
    const unsubAuth = auth.subscribe((user) => {
      setActiveUser(user);
      setIsAuthenticated(auth.isAuthenticated() && user !== null);
    });
    const unsubDb = db.subscribe(() => {
      setActiveUser(auth.getActiveUser());
      setTick((t) => t + 1);
    });

    return () => {
      unsubAuth();
      unsubDb();
    };
  }, []);

  const handleLogout = () => {
    if (!activeUser) return;
    requestConfirm({
      title: 'Keluar dari Aplikasi?',
      message: `Anda sedang login sebagai ${activeUser.name} (${activeUser.role}). Sesi akun Anda akan ditutup.`,
      confirmLabel: 'Ya, Keluar',
      cancelLabel: 'Batal',
      isDestructive: true,
      onConfirm: () => {
        auth.logout();
        setActiveUser(null);
        setIsAuthenticated(false);
        showToast('info', 'Logout Berhasil', 'Anda telah keluar dari akun.');
      },
    });
  };

  // If unauthenticated, display the dedicated Login View
  if (!isAuthenticated || !activeUser) {
    return (
      <div className="app-viewport-wrapper">
        <LoginView
          onLoginSuccess={(worker) => {
            setActiveUser(worker);
            setIsAuthenticated(true);
            showToast('success', 'Selamat Datang!', `Berhasil masuk sebagai ${worker.name} (${worker.role})`);
          }}
          onNotify={showToast}
        />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <ConfirmModal state={confirmState} />
      </div>
    );
  }

  const isAdmin = activeUser.role === 'admin';

  return (
    <div className="app-viewport-wrapper">
      {/* Main Mobile App Shell */}
      <div className={`app-container ${isAdmin ? 'admin-expanded' : ''}`}>
        <MobileHeader
          currentUser={activeUser}
          onLogout={handleLogout}
        />

        <main className="main-content">
          {/* Dynamic Role-Based View with strictly enforced authority */}
          {activeUser.role === 'driver_jeep' && (
            <DriverJeepView
              currentUser={activeUser}
              onNotify={showToast}
              onRequestConfirm={requestConfirm}
            />
          )}

          {activeUser.role === 'driver_lapangan' && (
            <DriverLapanganView
              currentUser={activeUser}
              onNotify={showToast}
              onRequestConfirm={requestConfirm}
            />
          )}

          {activeUser.role === 'photographer' && (
            <PhotographerView
              currentUser={activeUser}
              onNotify={showToast}
              onRequestConfirm={requestConfirm}
            />
          )}

          {activeUser.role === 'admin' && (
            <AdminDashboardView
              currentUser={activeUser}
              onNotify={showToast}
              onRequestConfirm={requestConfirm}
            />
          )}
        </main>
      </div>

      {/* Global In-App Toast & Confirmation Modal */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <ConfirmModal state={confirmState} />
    </div>
  );
};

export default App;
