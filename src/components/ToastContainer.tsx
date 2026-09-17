import React from 'react';
import type { ToastMessage } from '../types';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

interface Props {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<Props> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  const getIcon = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} color="#15803d" />;
      case 'warning':
        return <AlertTriangle size={18} color="#b45309" />;
      case 'error':
        return <AlertCircle size={18} color="#b91c1c" />;
      case 'info':
      default:
        return <Info size={18} color="#0369a1" />;
    }
  };

  const getTypeClass = (type: ToastMessage['type']) => {
    switch (type) {
      case 'success':
        return 'toast-success';
      case 'warning':
        return 'toast-warning';
      case 'error':
        return 'toast-error';
      case 'info':
      default:
        return 'toast-info';
    }
  };

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-item ${getTypeClass(toast.type)}`}>
          <div className="toast-icon">{getIcon(toast.type)}</div>
          <div className="toast-body">
            <div className="toast-title">{toast.title}</div>
            {toast.message && <div className="toast-desc">{toast.message}</div>}
          </div>
          <button
            type="button"
            className="toast-close"
            onClick={() => onDismiss(toast.id)}
            aria-label="Tutup notifikasi"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
