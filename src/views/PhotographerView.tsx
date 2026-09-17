import React, { useState, useEffect } from 'react';
import type { Trip, Worker } from '../types';
import { db } from '../services/db';
import { MetricCard, formatIDR } from '../components/MetricCard';
import { TripDetailModal } from '../components/TripDetailModal';
import { Camera, Calendar, Clock, MapPin, Users, Wallet, Sparkles, ExternalLink, Phone } from 'lucide-react';

interface Props {
  currentUser: Worker;
}

export const PhotographerView: React.FC<Props> = ({ currentUser }) => {
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [payrollSummary, setPayrollSummary] = useState(db.getWorkerPayroll(currentUser.id));
  const [activeTab, setActiveTab] = useState<'today' | 'all'>('today');

  const todayDate = '2026-09-17';

  const loadData = () => {
    const workerTrips = db.getTrips({ workerId: currentUser.id });
    setTrips(workerTrips);
    setPayrollSummary(db.getWorkerPayroll(currentUser.id));
  };

  useEffect(() => {
    loadData();
    const unsubscribe = db.subscribe(loadData);
    return () => unsubscribe();
  }, [currentUser.id]);

  const todayTrips = trips.filter((t) => t.date === todayDate);
  const displayTrips = activeTab === 'today' ? todayTrips : trips;

  return (
    <div className="card-section">
      {/* Identity Card (Violet Light Palette) */}
      <div
        className="metric-card"
        style={{
          background: '#faf5ff',
          borderColor: '#e9d5ff',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Camera size={18} color="#7c3aed" />
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#6d28d9', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                PORTAL DOKUMENTASI FOTOGRAFER
              </span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {currentUser.name}
            </div>
            <div style={{ fontSize: '12px', color: '#475569' }}>
              Gear Kit: <strong style={{ color: '#0f172a' }}>{currentUser.vehicleUnit || 'Kamera & Drone Kit'}</strong>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className={`badge ${currentUser.type === 'internal' ? 'badge-internal' : 'badge-external'}`}>
              Fotografer {currentUser.type.toUpperCase()}
            </span>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
              Tarif: {formatIDR(currentUser.baseRatePerTrip)} / sesi
            </div>
          </div>
        </div>
      </div>

      {/* Auto-status Notice */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
        <Sparkles size={16} color="#7c3aed" style={{ flexShrink: 0 }} />
        <span>Status sesi dokumentasi diperbarui <strong>otomatis</strong>. Unggah tautan Google Drive langsung pada rincian trip.</span>
      </div>

      {/* Work Frequency & Pay Metrics */}
      <div className="metrics-grid">
        <MetricCard
          title="Total Hari Kerja"
          value={`${payrollSummary?.totalDaysWorked || 0} Hari`}
          icon={<Calendar size={16} />}
          subtitle={`${payrollSummary?.totalTripsCount || 0} Sesi Dokumentasi`}
          accentColor="#7c3aed"
        />
        <MetricCard
          title="Total Honor Terkumpul"
          value={payrollSummary?.totalEarnings || 0}
          icon={<Wallet size={16} />}
          subtitle={`Cair: ${formatIDR(payrollSummary?.paidEarnings || 0)}`}
          accentColor="#059669"
          isCurrency={true}
        />
      </div>

      {/* Tabs Filter */}
      <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
        <button
          type="button"
          className={`calendar-mode-btn ${activeTab === 'today' ? 'active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          <Clock size={13} />
          <span>Sesi Hari Ini ({todayTrips.length})</span>
        </button>
        <button
          type="button"
          className={`calendar-mode-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <Calendar size={13} />
          <span>Semua Riwayat ({trips.length})</span>
        </button>
      </div>

      {/* Trip Cards List */}
      <div className="card-section">
        <div className="section-header">
          <div className="section-title">
            <span>{activeTab === 'today' ? 'Jadwal Pemotretan Hari Ini' : 'Daftar Seluruh Penugasan'}</span>
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            Ketuk kartu untuk upload link foto
          </span>
        </div>

        {displayTrips.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            Belum ada jadwal sesi foto yang ditugaskan ke Anda pada periode ini.
          </div>
        ) : (
          displayTrips.map((trip) => (
            <div
              key={trip.id}
              className={`trip-card ${trip.tripStatus === 'cancelled' ? 'trip-cancelled' : ''}`}
              onClick={() => setSelectedTrip(trip)}
            >
              <div className="trip-card-header">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="trip-code">{trip.code}</span>
                    <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{trip.date}</span>
                  </div>
                  <div className="trip-guest-name" style={{ textDecoration: trip.tripStatus === 'cancelled' ? 'line-through' : 'none' }}>
                    {trip.guestName}
                  </div>
                  <div className="trip-package">{trip.tourPackage}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="trip-time">
                    <Clock size={13} color="#7c3aed" />
                    <span>{trip.timeSlot}</span>
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <span className={`badge badge-status-${trip.tripStatus}`}>
                      {trip.tripStatus === 'booked' && 'Menunggu Jadwal'}
                      {trip.tripStatus === 'in_progress' && 'Sedang Jalan'}
                      {trip.tripStatus === 'completed' && 'Selesai'}
                      {trip.tripStatus === 'cancelled' && 'Dibatalkan'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="trip-meta-row">
                <div className="trip-meta-item">
                  <Users size={14} color="#64748b" />
                  <strong style={{ color: '#0f172a' }}>{trip.guestCount} Orang</strong>
                </div>
                <div className="trip-meta-item" style={{ flex: 1 }}>
                  <MapPin size={14} color="#dc2626" style={{ flexShrink: 0 }} />
                  <span style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {trip.pickupPoint}
                  </span>
                </div>
              </div>

              {/* Status of photo link */}
              <div style={{ marginTop: '4px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {trip.photoAlbumUrl ? (
                  <span style={{ color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                    ✓ Link Foto Telah Diupload
                    <ExternalLink size={11} />
                  </span>
                ) : (
                  <span style={{ color: '#d97706', fontWeight: 600 }}>
                    ⏳ Belum ada link album foto (Ketuk kartu untuk memasukkan link)
                  </span>
                )}
              </div>

              <div className="trip-divider" />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Honor Dokumentasi: </span>
                  {trip.tripStatus === 'cancelled' ? (
                    <>
                      <strong style={{ color: '#dc2626', fontSize: '13px' }}>
                        Rp 0 (Batal)
                      </strong>
                      <span style={{ fontSize: '11px', color: '#94a3b8', textDecoration: 'line-through', marginLeft: '4px' }}>
                        {formatIDR(trip.photographerFee)}
                      </span>
                      <span style={{ marginLeft: '6px' }} className="badge badge-status-cancelled">
                        Upah Ditiadakan
                      </span>
                    </>
                  ) : (
                    <>
                      <strong style={{ color: '#059669', fontSize: '14px' }}>
                        {formatIDR(trip.photographerFee)}
                      </strong>
                      <span style={{ marginLeft: '6px' }} className={`badge ${trip.photographerPayrollStatus === 'paid' ? 'badge-paid' : 'badge-unpaid'}`}>
                        {trip.photographerPayrollStatus === 'paid' ? 'Cair' : 'Pending'}
                      </span>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <a
                    href={`https://wa.me/${trip.guestPhone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline btn-sm"
                    style={{ padding: '4px 8px', fontSize: '11px', gap: '4px' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Phone size={12} color="#059669" />
                    <span>Hubungi WA</span>
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Detail */}
      {selectedTrip && (
        <TripDetailModal
          trip={selectedTrip}
          currentUser={currentUser}
          onClose={() => setSelectedTrip(null)}
          onTripUpdated={loadData}
        />
      )}
    </div>
  );
};
