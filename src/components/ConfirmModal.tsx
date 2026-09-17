import React, { useState, useEffect } from 'react';
import type { ConfirmDialogState } from '../types';
import { AlertTriangle, X, Check } from 'lucide-react';

interface Props {
  state: ConfirmDialogState;
}

export const ConfirmModal: React.FC<Props> = ({ state }) => {
  const [inputValue, setInputValue] = useState(state.initialInputValue || '');
  const [inputError, setInputError] = useState('');

  useEffect(() => {
    setInputValue(state.initialInputValue || '');
    setInputError('');
  }, [state.isOpen, state.initialInputValue]);

  if (!state.isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state.requiresInput) {
      if (!inputValue.trim()) {
        setInputError('Keterangan / alasan wajib diisi.');
        return;
      }
    }
    state.onConfirm(inputValue.trim());
  };

  return (
    <div className="modal-overlay" onClick={state.onCancel}>
      <div
        className="modal-content"
        style={{ maxWidth: '440px', padding: '20px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: state.isDestructive ? '#fee2e2' : '#e0f2fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} color={state.isDestructive ? '#dc2626' : '#0284c7'} />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                {state.title}
              </div>
              <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px', lineHeight: 1.4 }}>
                {state.message}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={state.onCancel}
            style={{ marginTop: '-4px', marginRight: '-4px' }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
          {state.requiresInput && (
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label" style={{ fontSize: '12px', fontWeight: 700 }}>
                Masukkan Keterangan / Alasan:
              </label>
              <input
                type="text"
                className="form-input"
                autoFocus
                placeholder={state.inputPlaceholder || 'Tulis alasan...'}
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (inputError) setInputError('');
                }}
                style={{ borderColor: inputError ? '#ef4444' : undefined }}
                required
              />
              {inputError && (
                <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                  {inputError}
                </span>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={state.onCancel}
            >
              {state.cancelLabel || 'Batal'}
            </button>
            <button
              type="submit"
              className={`btn btn-sm ${state.isDestructive ? 'btn-danger' : 'btn-primary'}`}
              style={{ gap: '6px' }}
            >
              <Check size={14} />
              <span>{state.confirmLabel || 'Lanjutkan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
