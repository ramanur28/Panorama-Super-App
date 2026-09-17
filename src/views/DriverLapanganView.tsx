import React, { useState, useEffect } from 'react';
import type { Trip, Worker } from '../types';
import { db, createWhatsAppUrl, generateGuestGreeting } from '../services/db';
import { MetricCard, formatIDR } from '../components/MetricCard';
import { TripDetailModal } from '../components/TripDetailModal';
import { Car, Calendar, Clock, MapPin, Users, Wallet, Sparkles, Phone } from 'lucide-react';

interface Props {
  currentUser: Worker;
  onNotify?: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
  onRequestConfirm?: (options: any) => void;
}

export const DriverLapanganView: React.FC<Props> = ({ currentUser, onNotify, onRequestConfirm }) => {
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
      {/* Identity Card (Light Sky Palette) */}
      <div
        className="metric-card"
        style={{
          background: '#f0f9ff',
          borderColor: '#bae6fd',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Car size={18} color="#0284c7" />
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                PORTAL DRIVER LAPANGAN / SHUTTLE
              </span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
              {currentUser.name}
            </div>
            <div style={{ fontSize: '12px', color: '#475569' }}>
              Armada: <strong style={{ color: '#0f172a' }}>{currentUser.vehicleUnit || 'Unit Shuttle Lapangan'}</strong>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className={`badge ${currentUser.type === 'internal' ? 'badge-internal' : 'badge-external'}`}>
              Kru {currentUser.type.toUpperCase()}
            </span>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
              Tarif: {formatIDR(currentUser.baseRatePerTrip)} / rute
            </div>
          </div>
        </div>
      </div>

      {/* Auto-status Notice */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#475569', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
        <Sparkles size={16} color="#0284c7" style={{ flexShrink: 0 }} />
        <span>Status shuttle diperbarui <strong>otomatis</strong> sesuai jadwal jam operasional.</span>
      </div>

      {/* Work Frequency & Pay Metrics */}
      <div className="metrics-grid">
        <MetricCard
          title="Total Hari Kerja"
          value={`${payrollSummary?.totalDaysWorked || 0} Hari`}
          icon={<Calendar size={16} />}
          subtitle={`${payrollSummary?.totalTripsCount || 0} Kali Rute Selesai`}
          accentColor="#0284c7"
        />
        <MetricCard
          title="Total Upah Terkumpul"
          value={payrollSummary?.totalEarnings || 0}
          icon={<Wallet size={16} />}
          subtitle={`Telah Dicairkan: ${formatIDR(payrollSummary?.paidEarnings || 0)}`}
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
          <span>Jadwal Hari Ini ({todayTrips.length})</span>
        </button>
        <button
          type="button"
          className={`calendar-mode-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          <Calendar size={13} />
          <span>Semua Penugasan ({trips.length})</span>
        </button>
      </div>

      {/* Trip Cards List */}
      <div className="card-section">
        <div className="section-header">
          <div className="section-title">
            <span>{activeTab === 'today' ? 'Jadwal Shuttle Hari Ini' : 'Daftar Seluruh Penugasan'}</span>
          </div>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            Ketuk kartu untuk detail & rute
          </span>
        </div>

        {displayTrips.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
            Tidak ada jadwal transfer / shuttle pada periode ini.
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
                    <Clock size={13} color="#0284c7" />
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

              <div className="trip-divider" />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>Upah Shuttle: </span>
                  {trip.tripStatus === 'cancelled' ? (
                    <>
                      <strong style={{ color: '#dc2626', fontSize: '13px' }}>
                        Rp 0 (Batal)
                      </strong>
                      <span style={{ fontSize: '11px', color: '#94a3b8', textDecoration: 'line-through', marginLeft: '4px' }}>
                        {formatIDR(trip.fieldDriverFee)}
                      </span>
                      <span style={{ marginLeft: '6px' }} className="badge badge-status-cancelled">
                        Upah Ditiadakan
                      </span>
                    </>
                  ) : (
                    <>
                      <strong style={{ color: '#059669', fontSize: '14px' }}>
                        {formatIDR(trip.fieldDriverFee)}
                      </strong>
                      <span style={{ marginLeft: '6px' }} className={`badge ${trip.fieldPayrollStatus === 'paid' ? 'badge-paid' : 'badge-unpaid'}`}>
                        {trip.fieldPayrollStatus === 'paid' ? 'Cair' : 'Pending'}
                      </span>
                    </>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <a
                    href={createWhatsAppUrl(
                      trip.guestPhone,
                      generateGuestGreeting(trip, currentUser.role, currentUser.name)
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-outline btn-sm"
                    style={{ padding: '4px 8px', fontSize: '11px', gap: '4px' }}
                    onClick={(e) => e.stopPropagation()}
                    title="Hubungi Tamu via WhatsApp"
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
          onNotify={onNotify}
          onRequestConfirm={onRequestConfirm}
        />
      )}
    </div>
  );
};
