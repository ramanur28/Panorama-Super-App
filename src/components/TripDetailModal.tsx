import React, { useState } from 'react';
import type { Trip, TripStatus, Worker } from '../types';
import { formatIDR } from './MetricCard';
import { X, Phone, MapPin, Users, Calendar, Clock, Car, Truck, Camera, ExternalLink, Sparkles, Compass, Pencil, Ban, RotateCcw, AlertTriangle } from 'lucide-react';
import { db } from '../services/db';

interface Props {
  trip: Trip;
  currentUser: Worker;
  onClose: () => void;
  onTripUpdated: () => void;
  onEditTrip?: (trip: Trip) => void;
}

export const TripDetailModal: React.FC<Props> = ({ trip, currentUser, onClose, onTripUpdated, onEditTrip }) => {
  const isJeepDriver = currentUser.role === 'driver_jeep';
  const [photoUrlInput, setPhotoUrlInput] = useState(trip.photoAlbumUrl || '');
  const [isSavingUrl, setIsSavingUrl] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'itinerary'>(isJeepDriver ? 'details' : 'itinerary');

  const handleSavePhotoUrl = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingUrl(true);
    db.updatePhotoUrl(trip.id, photoUrlInput);
    setIsSavingUrl(false);
    onTripUpdated();
    alert('Link album foto berhasil disimpan!');
  };

  const handleCancelTrip = () => {
    const reason = prompt('Masukkan alasan pembatalan trip:', 'Tamu berhalangan / reschedule');
    if (reason !== null) {
      db.cancelTrip(trip.id, reason);
      onTripUpdated();
      alert('Trip berhasil dibatalkan.');
    }
  };

  const handleRestoreTrip = () => {
    if (confirm('Pulihkan status trip ini ke jadwal otomatis?')) {
      db.restoreTrip(trip.id);
      onTripUpdated();
      alert('Trip berhasil diaktifkan kembali!');
    }
  };

  const getStatusBadge = (status: TripStatus) => {
    switch (status) {
      case 'booked':
        return <span className="badge badge-status-booked">Menunggu Jam Jalan (Terjadwal)</span>;
      case 'in_progress':
        return <span className="badge badge-status-in_progress">Sedang Jalan (Otomatis)</span>;
      case 'completed':
        return <span className="badge badge-status-completed">Selesai (Otomatis)</span>;
      case 'cancelled':
        return <span className="badge badge-status-cancelled">Dibatalkan</span>;
    }
  };

  let myFee = 0;
  let myPayrollStatus = 'unpaid';
  if (currentUser.role === 'driver_jeep') {
    myFee = trip.jeepFee;
    myPayrollStatus = trip.jeepPayrollStatus;
  } else if (currentUser.role === 'driver_lapangan') {
    myFee = trip.fieldDriverFee;
    myPayrollStatus = trip.fieldPayrollStatus;
  } else if (currentUser.role === 'photographer') {
    myFee = trip.photographerFee;
    myPayrollStatus = trip.photographerPayrollStatus;
  }

  const hasItinerary = trip.itinerary && trip.itinerary.length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '620px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="trip-code">{trip.code}</span>
              {getStatusBadge(trip.tripStatus)}
            </div>
            <div className="modal-title" style={{ marginTop: '4px' }}>
              {trip.guestName}
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Banner Peringatan jika Trip Dibatalkan */}
        {trip.tripStatus === 'cancelled' && (
          <div style={{ background: '#fee2e2', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#991b1b' }}>
              <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
              <div>
                <strong>STATUS: TRIP INI TELAH DIBATALKAN</strong>
                <div style={{ fontSize: '11px', color: '#b91c1c' }}>
                  Tidak ditagihkan ke Agen Travel dan tidak masuk omset/beban gaji.
                </div>
              </div>
            </div>
            {currentUser.role === 'admin' && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleRestoreTrip}
                style={{ borderColor: '#38bdf8', color: '#38bdf8', fontSize: '11px', gap: '4px', whiteSpace: 'nowrap' }}
              >
                <RotateCcw size={13} />
                <span>Pulihkan Trip</span>
              </button>
            )}
          </div>
        )}

        {/* Header khusus Driver Jeep (Tanpa Tab Itinerary) */}
        {isJeepDriver ? (
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', padding: '10px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Truck size={16} color="var(--color-jeep)" />
              <span style={{ fontSize: '13px', color: '#c2410c', fontWeight: 700 }}>Penugasan Unit Jeep: {trip.jeepUnit}</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Fokus Penjemputan & Drop Off</span>
          </div>
        ) : (
          /* Tab Switcher: Itinerary Kegiatan vs Informasi Tamu & Kru (Hanya untuk Selain Driver Jeep) */
          <div style={{ display: 'flex', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '4px', borderRadius: '10px', gap: '4px' }}>
            <button
              type="button"
              className={`calendar-mode-btn ${activeTab === 'itinerary' ? 'active' : ''}`}
              onClick={() => setActiveTab('itinerary')}
            >
              <Compass size={14} />
              <span>Itinerary & Kegiatan ({trip.itinerary?.length || 0} Stop)</span>
            </button>
            <button
              type="button"
              className={`calendar-mode-btn ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              <Users size={14} />
              <span>Data Tamu & Tim Kru</span>
            </button>
          </div>
        )}

        {/* =========================================================================
            TAB 1: ITINERARY & KEGIATAN HARIAN BESERTA BIAYA OPERASIONAL
            (Disembunyikan sepenuhnya dari Driver Jeep)
           ========================================================================= */}
        {!isJeepDriver && activeTab === 'itinerary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Paket Tour / Template:</span>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0284c7' }}>
                  {trip.itineraryTemplateName || trip.tourPackage}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Biaya Operasional:</span>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#059669' }}>
                  {formatIDR(trip.operationalCost)}
                </div>
              </div>
            </div>

            {/* Timeline of activities */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
              {!hasItinerary ? (
                <div style={{ textAlign: 'center', padding: '24px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  Belum ada detail itinerary untuk trip ini.
                </div>
              ) : (
                trip.itinerary.map((item, idx) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '12px',
                      position: 'relative',
                    }}
                  >
                    {/* Time indicator pill */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '70px' }}>
                      <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800 }}>
                        {item.time}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-faint)', marginTop: '4px' }}>
                        Stop #{idx + 1}
                      </div>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={12} color="var(--color-danger)" />
                        <span>{item.location}</span>
                      </div>
                      {item.description && (
                        <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '2px' }}>
                          {item.description}
                        </div>
                      )}

                      {/* Operational cost tag for this activity */}
                      {item.operationalCost > 0 ? (
                        <div style={{ marginTop: '4px', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '6px', width: 'fit-content' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Biaya Operasional:</span>
                          <strong style={{ color: '#047857' }}>{formatIDR(item.operationalCost)}</strong>
                          {item.costNote && <span style={{ color: 'var(--text-faint)' }}>({item.costNote})</span>}
                        </div>
                      ) : (
                        <div style={{ marginTop: '4px', fontSize: '10px', color: 'var(--text-faint)' }}>
                          Bebas biaya tiket/tambahan
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: DATA TAMU, TIM KRU, & INFORMASI KONTROL
           ========================================================================= */}
        {(isJeepDriver || activeTab === 'details') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Automatic Status Notice */}
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#0369a1' }}>
              <Sparkles size={14} style={{ flexShrink: 0 }} />
              <span>Status trip diperbarui secara otomatis berdasarkan jam jadwal operasional tanpa perlu klik tombol manual.</span>
            </div>

            {/* Quick info row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div className="metric-card" style={{ padding: '10px' }}>
                <div className="trip-meta-item">
                  <Calendar size={14} color="var(--text-muted)" />
                  <span style={{ fontSize: '12px' }}>{trip.date}</span>
                </div>
                <div className="trip-meta-item" style={{ marginTop: '4px' }}>
                  <Clock size={14} color="var(--color-accent)" />
                  <span style={{ fontSize: '12px', fontWeight: 700 }}>{trip.timeSlot}</span>
                </div>
              </div>

              <div className="metric-card" style={{ padding: '10px' }}>
                <div className="trip-meta-item">
                  <Users size={14} color="var(--text-muted)" />
                  <span style={{ fontSize: '12px' }}>{trip.guestCount} Pax</span>
                </div>
                <div className="trip-meta-item" style={{ marginTop: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Agen:</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#0284c7' }}>
                    {trip.agencyName}
                  </span>
                </div>
              </div>
            </div>

            {/* Guest & Route Details */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                LOKASI PENJEMPUTAN & KONTAK
              </div>
              <div className="trip-meta-item" style={{ marginBottom: '6px' }}>
                <MapPin size={16} color="var(--color-danger)" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: 'var(--text-main)', fontWeight: 600 }}>{trip.pickupPoint}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-glass)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Phone size={14} color="var(--color-primary)" />
                  <span style={{ fontSize: '12px' }}>{trip.guestPhone}</span>
                </div>
                <a
                  href={`https://wa.me/${trip.guestPhone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline btn-sm"
                  style={{ padding: '4px 8px', fontSize: '11px', gap: '4px' }}
                >
                  Hubungi Tamu
                </a>
              </div>

              {trip.notes && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', padding: '8px', borderRadius: '6px' }}>
                  <strong>Catatan:</strong> {trip.notes}
                </div>
              )}
            </div>

            {/* Worker Specific Earning Info (Authority Protected) */}
            {currentUser.role !== 'admin' && (
              trip.tripStatus === 'cancelled' ? (
                <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: '#991b1b', textTransform: 'uppercase', fontWeight: 700 }}>
                        Status Upah / Honor Penugasan:
                      </div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
                        Rp 0 <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', textDecoration: 'line-through' }}>({formatIDR(myFee)})</span>
                      </div>
                    </div>
                    <span className="badge badge-status-cancelled">Upah Ditiadakan</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#991b1b', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #fca5a5' }}>
                    Trip ini telah dibatalkan, sehingga rencana honor/upah kerja operasional kru otomatis dihapus dan tidak masuk perhitungan gaji.
                  </div>
                </div>
              ) : (
                <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Honor Anda Untuk Trip Ini:
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)' }}>
                      {formatIDR(myFee)}
                    </div>
                  </div>
                  <div>
                    {myPayrollStatus === 'paid' ? (
                      <span className="badge badge-paid">Sudah Cair</span>
                    ) : (
                      <span className="badge badge-unpaid">Belum Cair</span>
                    )}
                  </div>
                </div>
              )
            )}

            {/* Crew Assignments */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
                TIM OPERASIONAL BERTUGAS:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 10px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Truck size={14} color="var(--color-jeep)" />
                  <span>{trip.jeepDriverName} ({trip.jeepUnit})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: trip.tripStatus === 'cancelled' ? '#dc2626' : '#059669', fontWeight: 600 }}>
                    {trip.tripStatus === 'cancelled' ? 'Upah: Rp 0 (Batal)' : formatIDR(trip.jeepFee)}
                  </span>
                  <span className={`badge ${trip.jeepStatus === 'internal' ? 'badge-internal' : 'badge-external'}`}>
                    {trip.jeepStatus}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 10px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Car size={14} color="var(--color-field)" />
                  <span>{trip.fieldDriverName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: trip.tripStatus === 'cancelled' ? '#dc2626' : '#059669', fontWeight: 600 }}>
                    {trip.tripStatus === 'cancelled' ? 'Upah: Rp 0 (Batal)' : formatIDR(trip.fieldDriverFee)}
                  </span>
                  <span className={`badge ${trip.fieldDriverStatus === 'internal' ? 'badge-internal' : 'badge-external'}`}>
                    {trip.fieldDriverStatus}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 10px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Camera size={14} color="var(--color-photo)" />
                  <span>{trip.photographerName}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: trip.tripStatus === 'cancelled' ? '#dc2626' : '#059669', fontWeight: 600 }}>
                    {trip.tripStatus === 'cancelled' ? 'Upah: Rp 0 (Batal)' : formatIDR(trip.photographerFee)}
                  </span>
                  <span className={`badge ${trip.photographerStatus === 'internal' ? 'badge-internal' : 'badge-external'}`}>
                    {trip.photographerStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Photographer specific: Cloud Deliverables Link */}
            {(currentUser.role === 'photographer' || currentUser.role === 'admin') && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-photo)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Camera size={14} />
                  <span>LINK DOKUMENTASI FOTO (GOOGLE DRIVE / CLOUD)</span>
                </div>
                <form onSubmit={handleSavePhotoUrl} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="url"
                    className="form-input"
                    placeholder="https://drive.google.com/..."
                    value={photoUrlInput}
                    onChange={(e) => setPhotoUrlInput(e.target.value)}
                    style={{ flex: 1, fontSize: '12px' }}
                  />
                  <button type="submit" className="btn btn-photo btn-sm" disabled={isSavingUrl}>
                    Simpan Link
                  </button>
                </form>
                {trip.photoAlbumUrl && (
                  <a
                    href={trip.photoAlbumUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#7c3aed', marginTop: '6px' }}
                  >
                    <span>Buka Album Foto Tersimpan</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Admin Action Control Bar (Edit & Cancel Trip) */}
        {currentUser.role === 'admin' && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border-glass)' }}>
            <button
              type="button"
              className="btn btn-primary"
              style={{ flex: 1, gap: '6px', fontSize: '12px' }}
              onClick={() => {
                if (onEditTrip) onEditTrip(trip);
                onClose();
              }}
            >
              <Pencil size={14} />
              <span>Edit Data & Itinerary Trip</span>
            </button>

            {trip.tripStatus !== 'cancelled' ? (
              <button
                type="button"
                className="btn btn-outline"
                style={{ borderColor: '#fca5a5', color: '#dc2626', gap: '6px', fontSize: '12px' }}
                onClick={handleCancelTrip}
              >
                <Ban size={14} />
                <span>Batalkan Trip</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-outline"
                style={{ borderColor: '#0284c7', color: '#0284c7', gap: '6px', fontSize: '12px' }}
                onClick={handleRestoreTrip}
              >
                <RotateCcw size={14} />
                <span>Pulihkan Trip</span>
              </button>
            )}
          </div>
        )}

        <button type="button" className="btn btn-outline btn-block" onClick={onClose} style={{ marginTop: '8px' }}>
          Tutup Detail
        </button>
      </div>
    </div>
  );
};
