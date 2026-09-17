import React, { useState, useEffect } from 'react';
import type { AgencyInvoice, DateFilterSelection, ProfitAndLossSummary, Trip, Worker, WorkerPayrollSummary } from '../types';
import { db } from '../services/db';
import { MetricCard, formatIDR } from '../components/MetricCard';
import { AddTripModal } from '../components/AddTripModal';
import { TripDetailModal } from '../components/TripDetailModal';
import { InvoiceModal } from '../components/InvoiceModal';
import { DateRangeCalendarPicker } from '../components/DateRangeCalendarPicker';
import {
  Calendar,
  DollarSign,
  FileText,
  Users,
  Plus,
  TrendingUp,
  Clock,
  Truck,
  Car,
  Camera,
  Building,
  Search,
  CheckCircle2,
  ChevronRight,
  Pencil,
  Ban,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

interface Props {
  currentUser: Worker;
}

export const AdminDashboardView: React.FC<Props> = ({ currentUser }) => {
  const [activeSubTab, setActiveSubTab] = useState<'daily' | 'pnl' | 'agencies' | 'payroll'>('daily');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Filter Tanggal & Kalender untuk Operasional Harian
  const [dailyDateFilter, setDailyDateFilter] = useState<DateFilterSelection>({
    mode: 'single',
    startDate: '2026-09-17',
    endDate: '2026-09-17',
  });

  // 2. Filter Tanggal & Kalender untuk Laporan Laba Rugi (Fleksibel Satu Tanggal atau Rentang)
  const [pnlDateFilter, setPnlDateFilter] = useState<DateFilterSelection>({
    mode: 'range',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
  });

  // Data states
  const [trips, setTrips] = useState<Trip[]>([]);
  const [pnl, setPnl] = useState<ProfitAndLossSummary>(
    db.getProfitAndLoss(
      pnlDateFilter.startDate,
      pnlDateFilter.mode === 'single' ? pnlDateFilter.startDate : pnlDateFilter.endDate
    )
  );
  const [invoices, setInvoices] = useState<AgencyInvoice[]>([]);
  const [workerPayrolls, setWorkerPayrolls] = useState<WorkerPayrollSummary[]>([]);

  // Modals
  const [isAddTripOpen, setIsAddTripOpen] = useState(false);
  const [tripToEdit, setTripToEdit] = useState<Trip | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<AgencyInvoice | null>(null);

  const loadData = () => {
    const allTrips = db.getTrips();
    setTrips(allTrips);
    const pnlEnd = pnlDateFilter.mode === 'single' ? pnlDateFilter.startDate : pnlDateFilter.endDate;
    setPnl(db.getProfitAndLoss(pnlDateFilter.startDate, pnlEnd));
    setInvoices(db.getAgencyInvoices());
    setWorkerPayrolls(db.getAllWorkersPayroll());
  };

  useEffect(() => {
    loadData();
    const unsubscribe = db.subscribe(loadData);
    return () => unsubscribe();
  }, [dailyDateFilter, pnlDateFilter]);

  // Filtered trips for daily view (Single Date or Date Range)
  const filteredTrips = trips.filter((t) => {
    let matchesDate = false;
    if (dailyDateFilter.mode === 'single') {
      matchesDate = t.date === dailyDateFilter.startDate;
    } else {
      matchesDate = Boolean(t.date >= dailyDateFilter.startDate && t.date <= dailyDateFilter.endDate);
    }

    const matchesSearch =
      searchQuery === '' ||
      t.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.agencyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.jeepDriverName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesDate && matchesSearch;
  });

  const handleMarkPayrollPaid = (workerId: string, currentPending: number) => {
    if (currentPending <= 0) {
      alert('Semua honor pekerja ini sudah lunas dicairkan.');
      return;
    }
    if (window.confirm('Cairkan dan tandai honor pekerja ini sudah dibayar?')) {
      db.markWorkerPayrollPaid(workerId, true);
      loadData();
    }
  };

  return (
    <div className="card-section">
      {/* Admin Executive Hero Card */}
      <div
        className="metric-card"
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #0284c7' }}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building size={14} color="#0284c7" />
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  PANORAMA TOUR OPERATIONS
                </span>
              </div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', marginTop: '1px' }}>
                {currentUser.name}
              </div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                Akses Otoritas Penuh • Manajemen Keuangan & Operasional
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span className="badge badge-internal" style={{ fontSize: '11px' }}>
              ADMIN & OWNER
            </span>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              Total Operasional: <strong>{trips.length} Trip</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Executive Navigation Tabs (Clean Segmented Control) */}
      <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
        <button
          type="button"
          className={`calendar-mode-btn ${activeSubTab === 'daily' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('daily')}
          style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 700 }}
        >
          <Calendar size={14} />
          <span>Operasional Harian</span>
        </button>
        <button
          type="button"
          className={`calendar-mode-btn ${activeSubTab === 'pnl' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('pnl')}
          style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 700 }}
        >
          <TrendingUp size={14} />
          <span>Laporan Laba Rugi</span>
        </button>
        <button
          type="button"
          className={`calendar-mode-btn ${activeSubTab === 'agencies' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('agencies')}
          style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 700 }}
        >
          <Building size={14} />
          <span>Tagihan Agen Travel</span>
        </button>
        <button
          type="button"
          className={`calendar-mode-btn ${activeSubTab === 'payroll' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('payroll')}
          style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 700 }}
        >
          <Users size={14} />
          <span>Rekap Gaji Kru</span>
        </button>
      </div>

      {/* =========================================================================
          SUB-TAB 1: OPERASIONAL HARIAN (DENGAN FILTER KALENDER FLEKSIBEL)
         ========================================================================= */}
      {activeSubTab === 'daily' && (
        <div className="card-section">
          {/* Interactive Visual Calendar Picker for Daily Schedule */}
          <DateRangeCalendarPicker
            selection={dailyDateFilter}
            onChange={setDailyDateFilter}
            title="Filter Jadwal Operasional"
            defaultExpanded={false}
          />

          {/* Action Row: Quick Search + Add Trip */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
              <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="form-input"
                style={{ width: '100%', paddingLeft: '34px', fontSize: '12px' }}
                placeholder="Cari tamu, agen travel, plat jeep..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setTripToEdit(null);
                setIsAddTripOpen(true);
              }}
              style={{ gap: '6px' }}
            >
              <Plus size={14} />
              <span>+ Jadwalkan Trip Baru</span>
            </button>
          </div>

          {/* Trips Count & Status Banner */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span>Menampilkan <strong>{filteredTrips.length}</strong> trip operasional</span>
            <span>
              Mode: <strong>{dailyDateFilter.mode === 'single' ? 'Satu Tanggal' : 'Rentang Periode'}</strong>
            </span>
          </div>

          {/* Trips List */}
          <div className="card-section">
            {filteredTrips.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--text-muted)', background: 'var(--bg-card)', borderRadius: '12px' }}>
                Tidak ditemukan trip yang sesuai dengan filter kalender yang dipilih.
              </div>
            ) : (
              filteredTrips.map((trip) => (
                <div
                  key={trip.id}
                  className={`trip-card ${trip.tripStatus === 'cancelled' ? 'trip-cancelled' : ''}`}
                  onClick={() => setSelectedTrip(trip)}
                >
                  <div className="trip-card-header">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="trip-code">{trip.code}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{trip.date}</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#38bdf8' }}>
                          [{trip.agencyName}]
                        </span>
                      </div>
                      <div className="trip-guest-name" style={{ textDecoration: trip.tripStatus === 'cancelled' ? 'line-through' : 'none', color: trip.tripStatus === 'cancelled' ? '#94a3b8' : 'var(--text-main)' }}>
                        {trip.guestName}
                      </div>
                      <div className="trip-package">{trip.tourPackage}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="trip-time">
                        <Clock size={13} color="var(--color-primary)" />
                        <span>{trip.timeSlot}</span>
                      </div>
                      <div style={{ marginTop: '4px' }}>
                        <span className={`badge badge-status-${trip.tripStatus}`}>
                          {trip.tripStatus === 'cancelled'
                            ? 'Dibatalkan'
                            : trip.tripStatus === 'in_progress'
                            ? 'Sedang Jalan'
                            : trip.tripStatus === 'completed'
                            ? 'Selesai'
                            : 'Terjadwal'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Crew Badges (Internal vs External) & Wages Status */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', padding: '8px', borderRadius: '8px', fontSize: '11px' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Truck size={12} color="var(--color-jeep)" />
                        <span>Driver Jeep:</span>
                      </div>
                      <div style={{ fontWeight: 600, marginTop: '2px' }}>{trip.jeepDriverName}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <span className={`badge ${trip.jeepStatus === 'internal' ? 'badge-internal' : 'badge-external'}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                          {trip.jeepStatus}
                        </span>
                        <span style={{ fontSize: '9px', color: trip.tripStatus === 'cancelled' ? '#dc2626' : '#059669', fontWeight: 600 }}>
                          {trip.tripStatus === 'cancelled' ? 'Rp 0' : formatIDR(trip.jeepFee)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Car size={12} color="var(--color-field)" />
                        <span>Shuttle:</span>
                      </div>
                      <div style={{ fontWeight: 600, marginTop: '2px' }}>{trip.fieldDriverName}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <span className={`badge ${trip.fieldDriverStatus === 'internal' ? 'badge-internal' : 'badge-external'}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                          {trip.fieldDriverStatus}
                        </span>
                        <span style={{ fontSize: '9px', color: trip.tripStatus === 'cancelled' ? '#dc2626' : '#059669', fontWeight: 600 }}>
                          {trip.tripStatus === 'cancelled' ? 'Rp 0' : formatIDR(trip.fieldDriverFee)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Camera size={12} color="var(--color-photo)" />
                        <span>Fotografer:</span>
                      </div>
                      <div style={{ fontWeight: 600, marginTop: '2px' }}>{trip.photographerName}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <span className={`badge ${trip.photographerStatus === 'internal' ? 'badge-internal' : 'badge-external'}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                          {trip.photographerStatus}
                        </span>
                        <span style={{ fontSize: '9px', color: trip.tripStatus === 'cancelled' ? '#dc2626' : '#059669', fontWeight: 600 }}>
                          {trip.tripStatus === 'cancelled' ? 'Rp 0' : formatIDR(trip.photographerFee)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="trip-divider" />

                  {/* Financial Quick View for Admin */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Tarif Paket: </span>
                      <strong style={{ color: 'var(--text-main)', textDecoration: trip.tripStatus === 'cancelled' ? 'line-through' : 'none' }}>
                        {formatIDR(trip.packagePrice)}
                      </strong>
                      <span style={{ marginLeft: '6px' }} className={`badge ${trip.agencyPaymentStatus === 'paid' ? 'badge-paid' : 'badge-unpaid'}`}>
                        {trip.agencyPaymentStatus === 'paid' ? 'Lunas' : 'Belum Bayar'}
                      </span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{trip.tripStatus === 'cancelled' ? 'Upah Kru: ' : 'Est. Margin: '}</span>
                      <strong style={{ color: trip.tripStatus === 'cancelled' ? '#dc2626' : 'var(--color-primary)' }}>
                        {trip.tripStatus === 'cancelled'
                          ? 'Rp 0 (Hilang/Batal)'
                          : formatIDR(trip.packagePrice - (trip.jeepFee + trip.fieldDriverFee + trip.photographerFee + trip.operationalCost))}
                      </strong>
                    </div>
                  </div>

                  {/* Action row on card for quick Admin management */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--border-glass)' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        style={{ padding: '3px 8px', fontSize: '11px', gap: '4px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setTripToEdit(trip);
                          setIsAddTripOpen(true);
                        }}
                      >
                        <Pencil size={12} />
                        <span>Edit</span>
                      </button>

                      {trip.tripStatus !== 'cancelled' ? (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ padding: '3px 8px', fontSize: '11px', gap: '4px', borderColor: '#fca5a5', color: '#dc2626' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const reason = prompt(`Batalkan trip ${trip.code} (${trip.guestName})?\nMasukkan alasan:`, 'Tamu berhalangan / batal');
                            if (reason !== null) {
                              db.cancelTrip(trip.id, reason);
                              loadData();
                            }
                          }}
                        >
                          <Ban size={12} />
                          <span>Batalkan</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          style={{ padding: '3px 8px', fontSize: '11px', gap: '4px', borderColor: '#0284c7', color: '#0284c7' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Pulihkan dan aktifkan kembali trip ${trip.code}?`)) {
                              db.restoreTrip(trip.id);
                              loadData();
                            }
                          }}
                        >
                          <RotateCcw size={12} />
                          <span>Pulihkan</span>
                        </button>
                      )}
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-faint)' }}>Ketuk kartu untuk rincian</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 2: LAPORAN LABA RUGI (DENGAN FILTER KALENDER FLEKSIBEL)
         ========================================================================= */}
      {activeSubTab === 'pnl' && (
        <div className="card-section">
          {/* Interactive Visual Calendar Picker for P&L */}
          <DateRangeCalendarPicker
            selection={pnlDateFilter}
            onChange={setPnlDateFilter}
            title="Periode Waktu Laba Rugi"
            defaultExpanded={false}
          />

          {/* Banner Informasi Trip yang Dibatalkan jika Ada */}
          {(pnl.cancelledTripsCount || 0) > 0 && (
            <div style={{ background: '#fee2e2', border: '1px solid #fecaca', padding: '10px 14px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#991b1b' }}>
              <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0 }} />
              <span>
                Terdapat <strong>{pnl.cancelledTripsCount} trip dibatalkan</strong> pada periode terpilih. Sesuai prinsip akuntansi, nominal paket dan beban trip batal tidak dihitung ke omset laba rugi.
              </span>
            </div>
          )}

          {/* Primary Financial Metric Cards */}
          <div className="metrics-grid admin-grid">
            <MetricCard
              title="Pendapatan Kotor (Omset)"
              value={pnl.grossRevenue}
              icon={<DollarSign size={16} />}
              subtitle={`${pnl.totalTrips} Total Trip Selesai/Jalan`}
              accentColor="#38bdf8"
              isCurrency={true}
            />
            <MetricCard
              title="Total Biaya Beban"
              value={pnl.totalExpenses}
              icon={<TrendingUp size={16} />}
              subtitle="Kru & Tiket Operasional"
              accentColor="#ef4444"
              isCurrency={true}
            />
            <MetricCard
              title="Laba Bersih (Net Profit)"
              value={pnl.netProfit}
              icon={<TrendingUp size={16} />}
              subtitle="Keuntungan Bersih Perusahaan"
              accentColor="var(--color-primary)"
              isCurrency={true}
            />
            <MetricCard
              title="Margin Keuntungan"
              value={`${pnl.profitMarginPercent}%`}
              icon={<TrendingUp size={16} />}
              subtitle="Rasio Profitabilitas"
              accentColor="var(--color-accent)"
            />
          </div>

          {/* Detailed Cost Breakdown (Internal vs External Breakdown) */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '14px', padding: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '12px' }}>
              RINCIAN BIAYA KRU & ARMADA (INTERNAL VS EXTERNAL)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Jeep Costs */}
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', padding: '10px 12px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Truck size={15} color="var(--color-jeep)" />
                    <span style={{ fontWeight: 700 }}>Total Beban Driver Jeep</span>
                  </div>
                  <strong style={{ color: 'var(--color-jeep)' }}>{formatIDR(pnl.jeepCosts.total)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <span>Armada Internal: {formatIDR(pnl.jeepCosts.internal)}</span>
                  <span>Sewa Pihak Luar (Mitra External): {formatIDR(pnl.jeepCosts.external)}</span>
                </div>
              </div>

              {/* Field Driver Costs */}
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', padding: '10px 12px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Car size={15} color="var(--color-field)" />
                    <span style={{ fontWeight: 700 }}>Total Beban Driver Lapangan / Shuttle</span>
                  </div>
                  <strong style={{ color: 'var(--color-field)' }}>{formatIDR(pnl.fieldDriverCosts.total)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <span>Driver Internal: {formatIDR(pnl.fieldDriverCosts.internal)}</span>
                  <span>Vendor Sewa External: {formatIDR(pnl.fieldDriverCosts.external)}</span>
                </div>
              </div>

              {/* Photographer Costs */}
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', padding: '10px 12px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Camera size={15} color="var(--color-photo)" />
                    <span style={{ fontWeight: 700 }}>Total Beban Fotografer</span>
                  </div>
                  <strong style={{ color: 'var(--color-photo)' }}>{formatIDR(pnl.photographerCosts.total)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <span>Fotografer Internal: {formatIDR(pnl.photographerCosts.internal)}</span>
                  <span>Freelance External: {formatIDR(pnl.photographerCosts.external)}</span>
                </div>
              </div>

              {/* Operational & Tickets */}
              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', padding: '10px 12px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DollarSign size={15} color="var(--color-danger)" />
                    <span style={{ fontWeight: 700 }}>Biaya Tiket Masuk Taman Nasional, BBM & Retribusi</span>
                  </div>
                  <strong style={{ color: 'var(--text-main)' }}>{formatIDR(pnl.operationalCosts)}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================================
          SUB-TAB 3: TAGIHAN AGEN TRAVEL (DAFTAR TAMU DARI AGEN DAPAT DIKLIK UNTUK MELIHAT DETAIL)
         ========================================================================================= */}
      {activeSubTab === 'agencies' && (
        <div className="card-section">
          <div className="section-header">
            <div>
              <div className="section-title">
                <Building size={18} color="#38bdf8" />
                <span>Tagihan Agen Travel & Pengelompokan Tamu</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Tamu dikelompokkan berdasarkan agen. <strong>Klik salah satu nama tamu</strong> di bawah ini untuk membuka detail lengkapnya.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {invoices.map((inv) => (
              <div
                key={inv.agencyId}
                className="metric-card"
                style={{ borderLeft: '4px solid #0284c7', padding: '16px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-main)' }}>
                        {inv.agencyName}
                      </span>
                      <span className="trip-code">{inv.invoiceNumber}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Kontak PIC: {inv.contactPerson} ({inv.phone})
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      Membawa: <strong>{inv.trips.length} Rombongan Tamu</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TOTAL TAGIHAN:</div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#0284c7' }}>
                      {formatIDR(inv.totalAmount)}
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      {inv.status === 'paid' ? (
                        <span className="badge badge-paid">LUNAS</span>
                      ) : (
                        <span className="badge badge-unpaid">BELUM LUNAS</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* List of Guests brought by this agency - CLICKABLE ROWS */}
                <div style={{ marginTop: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1', textTransform: 'uppercase' }}>
                      DAFTAR TAMU DARI AGEN INI (KLIK UNTUK DETAIL):
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      Ketuk tamu untuk lihat rute, kontak & armada
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {inv.trips.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTrip(t)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '12px',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f0f9ff';
                          e.currentTarget.style.borderColor = '#bae6fd';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#ffffff';
                          e.currentTarget.style.borderColor = '#e2e8f0';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <ChevronRight size={14} color="#0284c7" />
                          <div>
                            <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{t.guestName}</span>
                            <span style={{ color: 'var(--text-muted)', marginLeft: '6px', fontSize: '11px' }}>
                              ({t.guestCount} pax • {t.date} • {t.timeSlot})
                            </span>
                            <div style={{ fontSize: '11px', color: 'var(--text-faint)', marginTop: '2px' }}>
                              {t.tourPackage} • Driver: {t.jeepDriverName} ({t.jeepUnit})
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: '#0284c7' }}>
                            {formatIDR(t.packagePrice)}
                          </div>
                          <span className={`badge badge-status-${t.tripStatus}`} style={{ fontSize: '9px', padding: '1px 5px' }}>
                            {t.tripStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => setSelectedInvoice(inv)}
                    style={{ gap: '6px', color: '#0284c7', borderColor: '#bae6fd' }}
                  >
                    <FileText size={14} />
                    <span>Lihat & Cetak Faktur / Invoice Resmi</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-TAB 4: REKAP GAJI & HARI KERJA KRU (PAYROLL)
         ======================================================== */}
      {activeSubTab === 'payroll' && (
        <div className="card-section">
          <div className="section-header">
            <div>
              <div className="section-title">
                <Users size={18} color="var(--color-primary)" />
                <span>Rekap Hari Kerja & Penggajian Pekerja</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Menampilkan total hari kerja, berapa kali trip dijalankan, dan pembayaran seluruh kru.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {workerPayrolls.map((wp) => (
              <div
                key={wp.worker.id}
                className="metric-card"
                style={{ padding: '16px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                      src={wp.worker.avatar}
                      alt={wp.worker.name}
                      style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-main)' }}>
                        {wp.worker.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {wp.worker.role === 'driver_jeep' && 'Driver Jeep'}
                        {wp.worker.role === 'driver_lapangan' && 'Driver Lapangan (Shuttle)'}
                        {wp.worker.role === 'photographer' && 'Fotografer Dokumentasi'}
                        {' • '}
                        <span className={`badge ${wp.worker.type === 'internal' ? 'badge-internal' : 'badge-external'}`} style={{ fontSize: '10px' }}>
                          {wp.worker.type.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TOTAL HONOR:</div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)' }}>
                      {formatIDR(wp.totalEarnings)}
                    </div>
                  </div>
                </div>

                {/* Frequency & Days Worked */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', padding: '10px', borderRadius: '8px', marginTop: '12px', textAlign: 'center', fontSize: '12px' }}>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Total Hari Kerja</div>
                    <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '15px' }}>{wp.totalDaysWorked} Hari</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Berapa Kali Bekerja</div>
                    <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '15px' }}>{wp.totalTripsCount} Trip</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Belum Dicairkan</div>
                    <div style={{ fontWeight: 800, color: wp.pendingEarnings > 0 ? '#ef4444' : '#10b981', fontSize: '15px' }}>
                      {formatIDR(wp.pendingEarnings)}
                    </div>
                  </div>
                </div>

                {/* Mark as paid button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${wp.pendingEarnings > 0 ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => handleMarkPayrollPaid(wp.worker.id, wp.pendingEarnings)}
                    disabled={wp.pendingEarnings <= 0}
                  >
                    <CheckCircle2 size={14} />
                    <span>{wp.pendingEarnings > 0 ? 'Cairkan Semua Honor' : 'Semua Sudah Lunas'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {isAddTripOpen && (
        <AddTripModal
          onClose={() => {
            setIsAddTripOpen(false);
            setTripToEdit(null);
          }}
          onTripAdded={loadData}
          onTripSaved={loadData}
          defaultDate={dailyDateFilter.startDate}
          tripToEdit={tripToEdit}
        />
      )}

      {selectedTrip && (
        <TripDetailModal
          trip={selectedTrip}
          currentUser={currentUser}
          onClose={() => setSelectedTrip(null)}
          onTripUpdated={loadData}
          onEditTrip={(trip) => {
            setTripToEdit(trip);
            setIsAddTripOpen(true);
          }}
        />
      )}

      {selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onInvoiceUpdated={loadData}
        />
      )}
    </div>
  );
};
