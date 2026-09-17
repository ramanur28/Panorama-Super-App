import React, { useState } from 'react';
import type { ItineraryItem, Trip, TripStatus } from '../types';
import { formatIDR } from './MetricCard';
import { X, PlusCircle, Check, Plus, Trash2, Compass, Pencil, AlertTriangle, ShieldAlert, AlertCircle } from 'lucide-react';
import { db, calculateAutoTripStatus } from '../services/db';

interface Props {
  onClose: () => void;
  onTripAdded?: () => void;
  onTripSaved?: () => void;
  defaultDate?: string;
  tripToEdit?: Trip | null;
}

export const AddTripModal: React.FC<Props> = ({
  onClose,
  onTripAdded,
  onTripSaved,
  defaultDate = '2026-09-17',
  tripToEdit,
}) => {
  const isEditing = !!tripToEdit;
  const workers = db.getWorkers();
  const agencies = db.getAgencies();
  const templates = db.getItineraryTemplates();

  const jeepDrivers = workers.filter((w) => w.role === 'driver_jeep');
  const fieldDrivers = workers.filter((w) => w.role === 'driver_lapangan');
  const photographers = workers.filter((w) => w.role === 'photographer');

  const [date, setDate] = useState(tripToEdit ? tripToEdit.date : defaultDate);
  const [timeSlot, setTimeSlot] = useState(tripToEdit ? tripToEdit.timeSlot : '03:30 WIB (Sunrise)');
  const [tourPackage, setTourPackage] = useState(
    tripToEdit ? tripToEdit.tourPackage : (templates[0]?.name || 'Bromo Sunrise Golden Hour (4 Spot)')
  );
  const [guestName, setGuestName] = useState(tripToEdit ? tripToEdit.guestName : '');
  const [guestCount, setGuestCount] = useState(tripToEdit ? tripToEdit.guestCount : 4);
  const [guestPhone, setGuestPhone] = useState(tripToEdit ? tripToEdit.guestPhone : '0812-');
  const [pickupPoint, setPickupPoint] = useState(
    tripToEdit ? tripToEdit.pickupPoint : 'Lobby Hotel Jiwa Jawa Bromo'
  );
  const [notes, setNotes] = useState(tripToEdit ? tripToEdit.notes : '');

  const [agencyId, setAgencyId] = useState(
    tripToEdit ? tripToEdit.agencyId : (agencies[0]?.id || 'ag-1')
  );
  const [packagePrice, setPackagePrice] = useState(
    tripToEdit ? tripToEdit.packagePrice : (templates[0]?.defaultPrice || 1250000)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Status Selector (Khusus Mode Edit Trip)
  const [selectedStatus, setSelectedStatus] = useState<string>(
    tripToEdit ? (tripToEdit.tripStatus === 'cancelled' ? 'cancelled' : 'auto') : 'auto'
  );

  // Itinerary Template Selection & Custom Itinerary State
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    tripToEdit?.itineraryTemplateId || (tripToEdit ? 'custom' : (templates[0]?.id || 'custom'))
  );
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>(
    tripToEdit?.itinerary && tripToEdit.itinerary.length > 0
      ? tripToEdit.itinerary.map((it) => ({ ...it }))
      : templates[0]?.items.map((it, idx) => ({
          ...it,
          id: `it-init-${idx}`,
        })) || []
  );

  // Workers selection
  const [jeepDriverId, setJeepDriverId] = useState(
    tripToEdit?.jeepDriverId || jeepDrivers[0]?.id || ''
  );
  const [fieldDriverId, setFieldDriverId] = useState(
    tripToEdit?.fieldDriverId || fieldDrivers[0]?.id || ''
  );
  const [photographerId, setPhotographerId] = useState(
    tripToEdit?.photographerId || photographers[0]?.id || ''
  );

  // Calculate total operational cost directly from itinerary items
  const totalItineraryOperationalCost = itineraryItems.reduce(
    (acc, item) => acc + (Number(item.operationalCost) || 0),
    0
  );

  // Find selected worker objects
  const selectedJeep = workers.find((w) => w.id === jeepDriverId) || jeepDrivers[0];
  const selectedField = workers.find((w) => w.id === fieldDriverId) || fieldDrivers[0];
  const selectedPhoto = workers.find((w) => w.id === photographerId) || photographers[0];
  const selectedAgency = agencies.find((a) => a.id === agencyId) || agencies[0];

  const jeepFee = selectedJeep?.baseRatePerTrip || 250000;
  const fieldFee = selectedField?.baseRatePerTrip || 175000;
  const photoFee = selectedPhoto?.baseRatePerTrip || 200000;

  const totalExpense = jeepFee + fieldFee + photoFee + totalItineraryOperationalCost;
  const projectedProfit = packagePrice - totalExpense;

  // Handle Template change
  const handleTemplateChange = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    if (tmplId === 'custom') {
      return;
    }
    const tmpl = templates.find((t) => t.id === tmplId);
    if (tmpl) {
      setTourPackage(tmpl.name);
      setPackagePrice(tmpl.defaultPrice);
      setItineraryItems(
        tmpl.items.map((it, idx) => ({
          ...it,
          id: `it-${Date.now()}-${idx}`,
        }))
      );
    }
  };

  // Add new custom stop to itinerary
  const handleAddItineraryItem = () => {
    const newItem: ItineraryItem = {
      id: `it-custom-${Date.now()}`,
      time: '08:00 WIB',
      title: 'Kunjungan Spot Baru',
      location: 'Lokasi Wisata',
      description: 'Aktivitas eksplorasi tambahan',
      operationalCost: 25000,
      costNote: 'Biaya Retribusi / Parkir',
    };
    setItineraryItems([...itineraryItems, newItem]);
  };

  // Update specific itinerary item
  const handleUpdateItem = (id: string, updates: Partial<ItineraryItem>) => {
    setItineraryItems(itineraryItems.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  // Remove itinerary item
  const handleRemoveItem = (id: string) => {
    setItineraryItems(itineraryItems.filter((item) => item.id !== id));
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!date) {
      errs.date = 'Tanggal tour wajib diisi.';
    }

    if (!timeSlot) {
      errs.timeSlot = 'Waktu / sesi jalan wajib dipilih.';
    }

    if (!guestName.trim()) {
      errs.guestName = 'Nama tamu / rombongan wajib diisi.';
    } else if (guestName.trim().length < 3) {
      errs.guestName = 'Nama tamu minimal 3 karakter.';
    }

    const cleanPhone = guestPhone.trim().replace(/[^0-9+]/g, '');
    if (!guestPhone.trim() || guestPhone.trim() === '0812-') {
      errs.guestPhone = 'Nomor WhatsApp tamu wajib diisi.';
    } else if (cleanPhone.length < 9 || cleanPhone.length > 15) {
      errs.guestPhone = 'Nomor WhatsApp tidak valid (minimal 9-15 digit angka).';
    }

    if (!pickupPoint.trim()) {
      errs.pickupPoint = 'Titik penjemputan tamu wajib diisi.';
    } else if (pickupPoint.trim().length < 3) {
      errs.pickupPoint = 'Titik penjemputan minimal 3 karakter.';
    }

    if (!guestCount || Number(guestCount) < 1) {
      errs.guestCount = 'Jumlah pax minimal 1 orang.';
    }

    if (!packagePrice || Number(packagePrice) < 100000) {
      errs.packagePrice = 'Harga paket jual minimal Rp 100.000.';
    }

    if (itineraryItems.length === 0) {
      errs.itinerary = 'Trip harus memiliki minimal 1 rute stop kegiatan.';
    } else {
      const hasEmpty = itineraryItems.some((it) => !it.title.trim());
      if (hasEmpty) {
        errs.itinerary = 'Setiap rute stop kegiatan wajib memiliki nama kegiatan.';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    const tmpl = templates.find((t) => t.id === selectedTemplateId);

    if (isEditing && tripToEdit) {
      // Calculate final status
      let finalStatus: TripStatus;
      if (selectedStatus === 'auto') {
        finalStatus = calculateAutoTripStatus(date, timeSlot);
      } else {
        finalStatus = selectedStatus as TripStatus;
      }

      db.updateTrip(tripToEdit.id, {
        date,
        timeSlot,
        tourPackage,
        pickupPoint,
        guestName,
        guestCount: Number(guestCount),
        guestPhone,
        notes,
        agencyId: selectedAgency.id,
        agencyName: selectedAgency.name,
        packagePrice: Number(packagePrice),
        jeepDriverId: selectedJeep.id,
        jeepDriverName: selectedJeep.name,
        jeepUnit: selectedJeep.vehicleUnit || 'Jeep Unit 01',
        jeepStatus: selectedJeep.type,
        jeepFee,
        fieldDriverId: selectedField.id,
        fieldDriverName: selectedField.name,
        fieldDriverStatus: selectedField.type,
        fieldDriverFee: fieldFee,
        photographerId: selectedPhoto.id,
        photographerName: selectedPhoto.name,
        photographerStatus: selectedPhoto.type,
        photographerFee: photoFee,
        itineraryTemplateId: selectedTemplateId !== 'custom' ? selectedTemplateId : undefined,
        itineraryTemplateName: tmpl ? tmpl.name : 'Custom Itinerary',
        itinerary: itineraryItems,
        operationalCost: totalItineraryOperationalCost,
        tripStatus: finalStatus,
      });

      if (onTripSaved) onTripSaved();
      if (onTripAdded) onTripAdded();
      onClose();
      return;
    }

    // Add new trip mode
    const newTripData: Omit<Trip, 'id' | 'code' | 'updatedAt' | 'tripStatus'> = {
      date,
      timeSlot,
      tourPackage,
      pickupPoint,
      guestName,
      guestCount: Number(guestCount),
      guestPhone,
      notes,
      agencyId: selectedAgency.id,
      agencyName: selectedAgency.name,
      packagePrice: Number(packagePrice),
      agencyPaymentStatus: 'unpaid',
      jeepDriverId: selectedJeep.id,
      jeepDriverName: selectedJeep.name,
      jeepUnit: selectedJeep.vehicleUnit || 'Jeep Unit 01',
      jeepStatus: selectedJeep.type,
      jeepFee,
      jeepPayrollStatus: 'unpaid',
      fieldDriverId: selectedField.id,
      fieldDriverName: selectedField.name,
      fieldDriverStatus: selectedField.type,
      fieldDriverFee: fieldFee,
      fieldPayrollStatus: 'unpaid',
      photographerId: selectedPhoto.id,
      photographerName: selectedPhoto.name,
      photographerStatus: selectedPhoto.type,
      photographerFee: photoFee,
      photographerPayrollStatus: 'unpaid',
      itineraryTemplateId: selectedTemplateId !== 'custom' ? selectedTemplateId : undefined,
      itineraryTemplateName: tmpl ? tmpl.name : 'Custom Itinerary',
      itinerary: itineraryItems,
      operationalCost: totalItineraryOperationalCost,
    };

    db.addTrip(newTripData);
    if (onTripAdded) onTripAdded();
    if (onTripSaved) onTripSaved();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEditing ? (
              <Pencil size={20} color="#0284c7" />
            ) : (
              <PlusCircle size={20} color="var(--color-primary)" />
            )}
            <div className="modal-title">
              {isEditing ? `Edit Jadwal Trip: ${tripToEdit?.code}` : 'Jadwalkan Trip & Itinerary Baru'}
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Status Trip Controller (Khusus Mode Edit Trip) */}
          {isEditing && (
            <div style={{ background: '#fee2e2', border: '1px solid #fecaca', padding: '12px', borderRadius: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#991b1b', marginBottom: '8px' }}>
                <ShieldAlert size={16} />
                <span>KONTROL STATUS TRIP (ADMIN OVERRIDE)</span>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Pilih Status Operasional:
                </label>
                <select
                  className="form-select"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  style={{
                    fontWeight: 700,
                    color: selectedStatus === 'cancelled' ? '#dc2626' : '#0284c7',
                    borderColor: selectedStatus === 'cancelled' ? '#fca5a5' : 'var(--border-glass)',
                  }}
                >
                  <option value="auto">⚡ Otomatis (Sesuai Jam Jalan & Waktu Terjadwal)</option>
                  <option value="cancelled">🚫 Dibatalkan (Cancel Trip)</option>
                  <option value="booked">📅 Terjadwal / Menunggu Jam Jalan (Booked)</option>
                  <option value="in_progress">🚙 Sedang Berjalan (In Progress)</option>
                  <option value="completed">✅ Selesai (Completed)</option>
                </select>
              </div>

              {selectedStatus === 'cancelled' && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                  <span>Trip yang dibatalkan tidak akan ditagihkan ke Agen Travel dan tidak masuk dalam beban komisi kru.</span>
                </div>
              )}
            </div>
          )}

          {/* Tanggal & Waktu */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Tanggal Tour <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (errors.date) setErrors({ ...errors, date: '' });
                }}
                style={{ borderColor: errors.date ? '#ef4444' : undefined }}
              />
              {errors.date && <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', display: 'block' }}>{errors.date}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Waktu / Sesi Mulai</label>
              <select className="form-select" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}>
                <option value="03:30 WIB (Sunrise)">03:30 WIB (Sunrise)</option>
                <option value="08:30 WIB (Daylight)">08:30 WIB (Daylight)</option>
                <option value="14:00 WIB (Sunset)">14:00 WIB (Sunset)</option>
              </select>
            </div>
          </div>

          {/* Agen Travel Mitra */}
          <div className="form-group">
            <label className="form-label">Agen Travel Mitra (Atau Walk-in)</label>
            <select
              className="form-select"
              value={agencyId}
              onChange={(e) => setAgencyId(e.target.value)}
            >
              {agencies.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.name} ({ag.code})
                </option>
              ))}
            </select>
          </div>

          {/* Tamu Info */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Nama Tamu / Rombongan <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Contoh: Bpk. Budi & Keluarga"
                value={guestName}
                onChange={(e) => {
                  setGuestName(e.target.value);
                  if (errors.guestName) setErrors({ ...errors, guestName: '' });
                }}
                style={{ borderColor: errors.guestName ? '#ef4444' : undefined }}
              />
              {errors.guestName && <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', display: 'block' }}>{errors.guestName}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">
                Jumlah Pax <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                min="1"
                max="25"
                className="form-input"
                value={guestCount}
                onChange={(e) => {
                  setGuestCount(Number(e.target.value));
                  if (errors.guestCount) setErrors({ ...errors, guestCount: '' });
                }}
                style={{ borderColor: errors.guestCount ? '#ef4444' : undefined }}
              />
              {errors.guestCount && <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', display: 'block' }}>{errors.guestCount}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                Nomor Kontak WhatsApp Tamu <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="tel"
                className="form-input"
                placeholder="0812-xxxx-xxxx"
                value={guestPhone}
                onChange={(e) => {
                  setGuestPhone(e.target.value);
                  if (errors.guestPhone) setErrors({ ...errors, guestPhone: '' });
                }}
                style={{ borderColor: errors.guestPhone ? '#ef4444' : undefined }}
              />
              {errors.guestPhone && <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', display: 'block' }}>{errors.guestPhone}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">
                Titik Penjemputan <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Hotel / Villa / Stasiun"
                value={pickupPoint}
                onChange={(e) => {
                  setPickupPoint(e.target.value);
                  if (errors.pickupPoint) setErrors({ ...errors, pickupPoint: '' });
                }}
                style={{ borderColor: errors.pickupPoint ? '#ef4444' : undefined }}
              />
              {errors.pickupPoint && <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', display: 'block' }}>{errors.pickupPoint}</span>}
            </div>
          </div>

          {/* =========================================================================
              ITINERARY BUILDER & TEMPLATE PICKER
             ========================================================================= */}
          <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Compass size={16} color="#0284c7" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0369a1' }}>
                  PENGATURAN ITINERARY & BIAYA OPERASIONAL KEGIATAN
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {itineraryItems.length} Kegiatan Terjadwal
              </span>
            </div>

            {errors.itinerary && (
              <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#dc2626', padding: '8px 12px', borderRadius: '8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                <span>{errors.itinerary}</span>
              </div>
            )}

            {/* Template Selector */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '11px' }}>
                Pilih Template Itinerary Standar:
              </label>
              <select
                className="form-select"
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                style={{ fontSize: '12px', fontWeight: 600 }}
              >
                <option value="custom">⚙️ Custom Itinerary (Buat Kegiatan Mandiri)</option>
                {templates.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>
                    📋 {tmpl.name} ({tmpl.duration}) • Est: {formatIDR(tmpl.items.reduce((a, b) => a + b.operationalCost, 0))}
                  </option>
                ))}
              </select>
            </div>

            {/* Itinerary List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
              {itineraryItems.map((item, idx) => (
                <div
                  key={item.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)' }}>
                      STOP #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', padding: '2px' }}
                      title="Hapus Stop Ini"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '6px' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: '11px', padding: '4px 6px' }}
                      placeholder="Jam (misal 04:00 WIB)"
                      value={item.time}
                      onChange={(e) => handleUpdateItem(item.id, { time: e.target.value })}
                    />
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: '11px', padding: '4px 6px', fontWeight: 600 }}
                      placeholder="Nama Kegiatan / Spot Wisata"
                      value={item.title}
                      onChange={(e) => handleUpdateItem(item.id, { title: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px', gap: '6px' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: '11px', padding: '4px 6px' }}
                      placeholder="Lokasi (Spot)"
                      value={item.location}
                      onChange={(e) => handleUpdateItem(item.id, { location: e.target.value })}
                    />
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        className="form-input"
                        style={{ fontSize: '11px', padding: '4px 6px', color: '#059669', fontWeight: 700 }}
                        placeholder="Biaya Ops (Rp)"
                        value={item.operationalCost}
                        onChange={(e) => handleUpdateItem(item.id, { operationalCost: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: '10px', padding: '3px 6px', color: 'var(--text-muted)' }}
                      placeholder="Instruksi kru (opsional)"
                      value={item.description || ''}
                      onChange={(e) => handleUpdateItem(item.id, { description: e.target.value })}
                    />
                    <input
                      type="text"
                      className="form-input"
                      style={{ fontSize: '10px', padding: '3px 6px', color: 'var(--text-muted)' }}
                      placeholder="Keterangan biaya (misal: BBM/Tiket)"
                      value={item.costNote || ''}
                      onChange={(e) => handleUpdateItem(item.id, { costNote: e.target.value })}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Add Custom Stop Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={handleAddItineraryItem}
                style={{ fontSize: '11px', padding: '5px 10px', gap: '4px' }}
              >
                <Plus size={13} />
                <span>+ Tambah Stop/Kegiatan</span>
              </button>

              <div style={{ textAlign: 'right', fontSize: '11px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Akumulasi Biaya Operasional: </span>
                <strong style={{ color: '#059669', fontSize: '13px' }}>
                  {formatIDR(totalItineraryOperationalCost)}
                </strong>
              </div>
            </div>
          </div>

          {/* Catatan Khusus */}
          <div className="form-group">
            <label className="form-label">Catatan Operasional Khusus</label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="Contoh: Tamu lansia butuh jaket ekstra, bawa air mineral."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Penugasan Tim Kru Lapangan */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Driver Jeep & Armada</label>
              <select
                className="form-select"
                value={jeepDriverId}
                onChange={(e) => setJeepDriverId(e.target.value)}
              >
                {jeepDrivers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} • {w.vehicleUnit} ({w.type.toUpperCase()}) • {formatIDR(w.baseRatePerTrip)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Driver Lapangan (Transfer)</label>
              <select
                className="form-select"
                value={fieldDriverId}
                onChange={(e) => setFieldDriverId(e.target.value)}
              >
                {fieldDrivers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} • {w.type.toUpperCase()} • {formatIDR(w.baseRatePerTrip)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Fotografer Dokumentasi</label>
              <select
                className="form-select"
                value={photographerId}
                onChange={(e) => setPhotographerId(e.target.value)}
              >
                {photographers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} • {w.type.toUpperCase()} • {formatIDR(w.baseRatePerTrip)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Harga Jual Paket */}
          <div className="form-group">
            <label className="form-label">
              Harga Paket Jual (Ke Tamu/Agen) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="number"
              step="50000"
              className="form-input"
              value={packagePrice}
              onChange={(e) => {
                setPackagePrice(Number(e.target.value));
                if (errors.packagePrice) setErrors({ ...errors, packagePrice: '' });
              }}
              style={{ borderColor: errors.packagePrice ? '#ef4444' : undefined }}
            />
            {errors.packagePrice && <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', display: 'block' }}>{errors.packagePrice}</span>}
          </div>

          {/* Real-time Profit Preview */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ESTIMASI LABA BERSIH TRIP INI:</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--color-primary)' }}>
                {formatIDR(projectedProfit)}
              </div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>
              Beban Kru: {formatIDR(jeepFee + fieldFee + photoFee)} <br />
              Operasional Itinerary: {formatIDR(totalItineraryOperationalCost)}
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '8px' }}>
            <Check size={18} />
            <span>{isEditing ? 'Simpan Perubahan Data Trip' : 'Simpan & Terbitkan Jadwal dengan Itinerary'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
