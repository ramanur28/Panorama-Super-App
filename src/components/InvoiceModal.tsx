import React from 'react';
import type { AgencyInvoice } from '../types';
import { formatIDR } from './MetricCard';
import { X, Printer, CheckCircle } from 'lucide-react';
import { db } from '../services/db';

interface Props {
  invoice: AgencyInvoice;
  onClose: () => void;
  onInvoiceUpdated: () => void;
}

export const InvoiceModal: React.FC<Props> = ({ invoice, onClose, onInvoiceUpdated }) => {
  const isPaid = invoice.status === 'paid';

  const handleTogglePaid = () => {
    db.markAgencyTripsPaid(invoice.agencyId, !isPaid);
    onInvoiceUpdated();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '760px', maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>
              TAGIHAN AGIRAN RESMI:
            </span>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8' }}>
              {invoice.agencyName}
            </span>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Action buttons on top (hidden on print) */}
        <div className="no-print" style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className={`btn btn-sm ${isPaid ? 'btn-outline' : 'btn-primary'}`}
              onClick={handleTogglePaid}
            >
              <CheckCircle size={14} />
              <span>{isPaid ? 'Ubah Status Jadi Belum Lunas' : 'Tandai Tagihan LUNAS'}</span>
            </button>
          </div>

          <button type="button" className="btn btn-outline btn-sm" onClick={handlePrint}>
            <Printer size={14} />
            <span>Cetak / Cetak PDF</span>
          </button>
        </div>

        {/* The Printable Invoice Container */}
        <div className="invoice-container">
          <div className="invoice-header">
            <div>
              <div className="invoice-company-title">PANORAMA SUPER APP</div>
              <div style={{ color: '#64748b', fontSize: '12px', marginTop: '2px' }}>
                Divisi Manajemen Operasional Tour & Jeep
              </div>
              <div style={{ color: '#64748b', fontSize: '11px' }}>
                Basecamp Bromo & Merapi • WhatsApp: 0811-0011-2233
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                FAKTUR / INVOICE
              </div>
              <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563eb' }}>
                {invoice.invoiceNumber}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                Tanggal: {invoice.invoiceDate} | Jatuh Tempo: {invoice.dueDate}
              </div>
            </div>
          </div>

          {/* Agency Details */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: '#f8fafc', padding: '14px', borderRadius: '8px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
                DITAGIHKAN KEPADA MITRA AGEN TRAVEL:
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                {invoice.agencyName}
              </div>
              <div style={{ fontSize: '12px', color: '#475569' }}>
                u.p: {invoice.contactPerson} ({invoice.phone})
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>
                STATUS PEMBAYARAN:
              </div>
              <div style={{ marginTop: '4px' }}>
                {isPaid ? (
                  <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 10px', borderRadius: '999px', fontWeight: 800, fontSize: '12px' }}>
                    LUNAS (PAID)
                  </span>
                ) : (
                  <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 10px', borderRadius: '999px', fontWeight: 800, fontSize: '12px' }}>
                    BELUM LUNAS (UNPAID)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Grouped Guest & Trips Table */}
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
            Rincian Tamu yang Dibawa oleh Agen Ini:
          </div>

          <table className="invoice-table">
            <thead>
              <tr>
                <th>Tgl & Kode</th>
                <th>Nama Tamu & Pax</th>
                <th>Paket Tour</th>
                <th>Armada / Driver</th>
                <th style={{ textAlign: 'right' }}>Tarif (IDR)</th>
              </tr>
            </thead>
            <tbody>
              {invoice.trips.map((t) => (
                <tr
                  key={t.id}
                  style={{
                    background: t.tripStatus === 'cancelled' ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                  }}
                >
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.date}</div>
                    <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#64748b' }}>{t.code}</div>
                    {t.tripStatus === 'cancelled' && (
                      <span style={{ fontSize: '9px', background: '#fee2e2', color: '#b91c1c', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                        DIBATALKAN
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: t.tripStatus === 'cancelled' ? '#64748b' : '#0f172a', textDecoration: t.tripStatus === 'cancelled' ? 'line-through' : 'none' }}>
                      {t.guestName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>{t.guestCount} Orang (Pax)</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '12px' }}>{t.tourPackage}</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>{t.timeSlot}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '11px' }}>{t.jeepDriverName}</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>{t.jeepUnit}</div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    {t.tripStatus === 'cancelled' ? (
                      <div>
                        <span style={{ fontSize: '11px', textDecoration: 'line-through', color: '#94a3b8' }}>
                          {formatIDR(t.packagePrice)}
                        </span>
                        <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 800 }}>
                          Rp 0 (Batal)
                        </div>
                      </div>
                    ) : (
                      formatIDR(t.packagePrice)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total Box */}
          <div className="invoice-total-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '260px' }}>
              <span style={{ color: '#64748b' }}>Subtotal Tagihan:</span>
              <span style={{ fontWeight: 700 }}>{formatIDR(invoice.totalAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '260px' }}>
              <span style={{ color: '#64748b' }}>Telah Dibayar:</span>
              <span style={{ fontWeight: 700, color: '#16a34a' }}>{formatIDR(invoice.paidAmount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '260px', borderTop: '1px dashed #cbd5e1', paddingTop: '6px' }}>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>Sisa Tagihan:</span>
              <span className="invoice-total-amount" style={{ color: isPaid ? '#16a34a' : '#dc2626' }}>
                {formatIDR(invoice.remainingAmount)}
              </span>
            </div>
          </div>

          {/* Bank Transfer Information */}
          <div style={{ marginTop: '24px', background: '#f1f5f9', padding: '12px 16px', borderRadius: '8px', fontSize: '11px' }}>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>INSTRUKSI PEMBAYARAN TRANSFER BANK:</div>
            <div>Bank Central Asia (BCA) • No. Rekening: <strong>123-456-7890</strong> a/n <strong>PT Panorama Super Wisata</strong></div>
            <div style={{ color: '#64748b', marginTop: '2px' }}>Mohon kirimkan bukti transfer ke WhatsApp admin operasional untuk rekonsiliasi otomatis.</div>
          </div>
        </div>
      </div>
    </div>
  );
};
