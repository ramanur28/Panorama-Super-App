import React, { useState } from 'react';
import type { Agency, ItineraryTemplate, UserRole, Worker, WorkerType } from '../types';
import { db } from '../services/db';
import { api } from '../services/api';
import { formatIDR } from './MetricCard';
import {
  X,
  Users,
  Building,
  Compass,
  Plus,
  Trash2,
  Download,
  Upload,
  Database,
  ChevronDown,
  ChevronUp,
  Pencil,
  Eye,
  EyeOff,
  Lock,
  User,
  ShieldCheck,
  Mail,
  MapPin,
  Phone,
  Percent,
} from 'lucide-react';

interface Props {
  onClose: () => void;
  onDataChanged: () => void;
  onNotify: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
}

export const ManageMasterModal: React.FC<Props> = ({ onClose, onDataChanged, onNotify }) => {
  const [activeTab, setActiveTab] = useState<'workers' | 'agencies' | 'templates' | 'backup'>('workers');

  const [workers, setWorkers] = useState<Worker[]>(db.getWorkers());
  const [agencies, setAgencies] = useState<Agency[]>(db.getAgencies());
  const [templates, setTemplates] = useState<ItineraryTemplate[]>(db.getItineraryTemplates());

  // --- SUB-MODAL 1: WORKER FORM STATES ---
  const [isAddingWorker, setIsAddingWorker] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null);
  const [workerName, setWorkerName] = useState('');
  const [workerRole, setWorkerRole] = useState<UserRole>('driver_jeep');
  const [workerType, setWorkerType] = useState<WorkerType>('internal');
  const [workerPhone, setWorkerPhone] = useState('');
  const [workerVehicle, setWorkerVehicle] = useState('');
  const [workerRate, setWorkerRate] = useState(250000);
  const [workerUsername, setWorkerUsername] = useState('');
  const [workerPin, setWorkerPin] = useState('123456');
  const [showWorkerPin, setShowWorkerPin] = useState(false);
  const [workerErrors, setWorkerErrors] = useState<Record<string, string>>({});

  // --- SUB-MODAL 2: AGENCY FORM STATES (FULL CRUD) ---
  const [isAddingAgency, setIsAddingAgency] = useState(false);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [agencyName, setAgencyName] = useState('');
  const [agencyCode, setAgencyCode] = useState('');
  const [agencyPic, setAgencyPic] = useState('');
  const [agencyPhone, setAgencyPhone] = useState('');
  const [agencyEmail, setAgencyEmail] = useState('');
  const [agencyAddress, setAgencyAddress] = useState('');
  const [agencyCommission, setAgencyCommission] = useState(10);
  const [agencyErrors, setAgencyErrors] = useState<Record<string, string>>({});

  // --- SUB-MODAL 3: TEMPLATE ITINERARY STATES ---
  const [isAddingTemplate, setIsAddingTemplate] = useState(false);
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState('Bromo Adventure');
  const [templateDuration, setTemplateDuration] = useState('7 Jam (03:00 - 10:00 WIB)');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templatePrice, setTemplatePrice] = useState(1250000);
  const [templateErrors, setTemplateErrors] = useState<Record<string, string>>({});
  const [templateItems, setTemplateItems] = useState<Array<{
    time: string;
    title: string;
    location: string;
    description: string;
    operationalCost: number;
    costNote: string;
  }>>([
    {
      time: '03:00 WIB',
      title: 'Penjemputan Tamu & Briefing',
      location: 'Hotel / Homestay',
      description: 'Pengecekan perlengkapan dingin dan briefing.',
      operationalCost: 0,
      costNote: 'Internal',
    },
    {
      time: '04:15 WIB',
      title: 'Sunrise Spot Utama',
      location: 'View Point Penanjakan / Kingkong Hill',
      description: 'Menikmati golden sunrise bersama tamu.',
      operationalCost: 110000,
      costNote: 'Tiket Masuk TNBTS & Retribusi',
    },
    {
      time: '06:30 WIB',
      title: 'Eksplorasi Kawah & Pasir',
      location: 'Lautan Pasir & Kawah',
      description: 'Trekking kawah aktif dan sesi dokumentasi.',
      operationalCost: 20000,
      costNote: 'Retribusi Parkir',
    },
  ]);

  const reload = () => {
    setWorkers(db.getWorkers());
    setAgencies(db.getAgencies());
    setTemplates(db.getItineraryTemplates());
    onDataChanged();
  };

  // =========================================================================
  // WORKER ACTIONS & FORM VALIDATION
  // =========================================================================
  const handleStartAddWorker = () => {
    setEditingWorker(null);
    setWorkerName('');
    setWorkerRole('driver_jeep');
    setWorkerType('internal');
    setWorkerPhone('');
    setWorkerVehicle('');
    setWorkerRate(250000);
    setWorkerUsername('');
    setWorkerPin('123456');
    setShowWorkerPin(false);
    setWorkerErrors({});
    setIsAddingWorker(true);
  };

  const handleEditWorker = (w: Worker) => {
    setEditingWorker(w);
    setWorkerName(w.name);
    setWorkerRole(w.role);
    setWorkerType(w.type);
    setWorkerPhone(w.phone);
    setWorkerVehicle(w.vehicleUnit || '');
    setWorkerRate(w.baseRatePerTrip);
    setWorkerUsername(w.username || w.name.toLowerCase().replace(/[^a-z0-9]/g, '_'));
    setWorkerPin(''); // biarkan kosong jika tidak diubah
    setShowWorkerPin(false);
    setWorkerErrors({});
    setIsAddingWorker(true);
  };

  const handleCancelWorkerForm = () => {
    setEditingWorker(null);
    setIsAddingWorker(false);
    setWorkerErrors({});
  };

  const validateWorkerForm = () => {
    const errors: Record<string, string> = {};
    if (!workerName.trim()) {
      errors.name = 'Nama lengkap kru wajib diisi.';
    } else if (workerName.trim().length < 3) {
      errors.name = 'Nama lengkap minimal 3 karakter.';
    }

    const cleanPhone = workerPhone.trim().replace(/[^0-9+]/g, '');
    if (!workerPhone.trim()) {
      errors.phone = 'Nomor WhatsApp wajib diisi.';
    } else if (cleanPhone.length < 9 || cleanPhone.length > 15) {
      errors.phone = 'Nomor WhatsApp tidak valid (minimal 9-15 digit angka).';
    }

    if ((workerRole === 'driver_jeep' || workerRole === 'driver_lapangan') && !workerVehicle.trim()) {
      errors.vehicle = `Unit armada / plat nomor wajib diisi untuk ${workerRole === 'driver_jeep' ? 'Driver Jeep' : 'Driver Lapangan'}.`;
    }

    if (!workerRate || Number(workerRate) <= 0) {
      errors.rate = 'Tarif honor per trip harus lebih dari Rp 0.';
    }

    const cleanUser = workerUsername.trim().toLowerCase();
    if (!cleanUser) {
      errors.username = 'Username wajib diisi untuk akun login.';
    } else if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(cleanUser)) {
      errors.username = 'Username harus 3-32 karakter alfanumerik (huruf, angka, titik, underscore).';
    } else {
      const duplicate = workers.find(
        (w) => w.username?.toLowerCase() === cleanUser && (!editingWorker || w.id !== editingWorker.id)
      );
      if (duplicate) {
        errors.username = `Username "${cleanUser}" sudah digunakan oleh kru lain (${duplicate.name}).`;
      }
    }

    if (!editingWorker) {
      if (!workerPin.trim()) {
        errors.pin = 'PIN keamanan 6 digit wajib diisi.';
      } else if (!/^\d{6}$/.test(workerPin.trim())) {
        errors.pin = 'PIN harus tepat 6 digit angka numerik (contoh: 123456).';
      }
    } else {
      if (workerPin.trim() && !/^\d{6}$/.test(workerPin.trim())) {
        errors.pin = 'Jika ingin mengganti PIN, harus tepat 6 digit angka numerik.';
      }
    }

    setWorkerErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateWorkerForm()) {
      onNotify('error', 'Form Tidak Valid', 'Silakan periksa input kru yang ditandai warna merah.');
      return;
    }

    const cleanUsername = workerUsername.trim().toLowerCase();
    const vehicle = workerVehicle.trim() || (workerRole === 'driver_jeep' ? 'Jeep Hardtop Standar' : workerRole === 'driver_lapangan' ? 'Mobil Shuttle Standar' : 'Kamera DSLR/Mirrorless');

    if (editingWorker) {
      // UPDATE WORKER
      const updates: Partial<Worker> = {
        name: workerName.trim(),
        role: workerRole,
        type: workerType,
        phone: workerPhone.trim(),
        vehicleUnit: vehicle,
        baseRatePerTrip: Number(workerRate),
        username: cleanUsername,
      };
      if (workerPin.trim()) {
        updates.pin = workerPin.trim();
      }

      const res = await api.updateWorker(editingWorker.id, updates);
      if (!res.success) {
        onNotify('error', 'Gagal Memperbarui Kru', res.message || 'Terjadi kesalahan sistem.');
        return;
      }

      handleCancelWorkerForm();
      reload();
      onNotify('success', 'Data Kru Diperbarui', `Perubahan data kru "${workerName}" berhasil disimpan ke database.`);
    } else {
      // ADD NEW WORKER
      const res = await api.addWorker({
        name: workerName.trim(),
        role: workerRole,
        type: workerType,
        phone: workerPhone.trim(),
        vehicleUnit: vehicle,
        avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80`,
        baseRatePerTrip: Number(workerRate),
        isAvailable: true,
        username: cleanUsername,
        pin: workerPin.trim() || '123456',
      });

      if (!res.success) {
        onNotify('error', 'Gagal Menambahkan Kru', res.message || 'Terjadi kesalahan sistem.');
        return;
      }

      handleCancelWorkerForm();
      reload();
      onNotify('success', 'Kru Baru Ditambahkan', `Anggota ${workerName} (@${cleanUsername}) berhasil didaftarkan ke sistem.`);
    }
  };

  const handleDeleteWorker = async (w: Worker) => {
    if (confirm(`Hapus data pekerja ${w.name} (@${w.username || 'kru'}) dari database?`)) {
      await api.deleteWorker(w.id);
      reload();
      onNotify('info', 'Data Kru Dihapus', `${w.name} telah dikeluarkan dari daftar kru.`);
    }
  };

  // =========================================================================
  // AGENCY ACTIONS & FORM VALIDATION (FULL CRUD)
  // =========================================================================
  const handleStartAddAgency = () => {
    setEditingAgency(null);
    setAgencyName('');
    setAgencyCode('');
    setAgencyPic('');
    setAgencyPhone('');
    setAgencyEmail('');
    setAgencyAddress('');
    setAgencyCommission(10);
    setAgencyErrors({});
    setIsAddingAgency(true);
  };

  const handleEditAgency = (ag: Agency) => {
    setEditingAgency(ag);
    setAgencyName(ag.name);
    setAgencyCode(ag.code);
    setAgencyPic(ag.contactPerson || '');
    setAgencyPhone(ag.phone);
    setAgencyEmail(ag.email || '');
    setAgencyAddress(ag.address || '');
    setAgencyCommission(ag.commissionRatePercent || 10);
    setAgencyErrors({});
    setIsAddingAgency(true);
  };

  const handleCancelAgencyForm = () => {
    setEditingAgency(null);
    setIsAddingAgency(false);
    setAgencyErrors({});
  };

  const validateAgencyForm = () => {
    const errors: Record<string, string> = {};
    if (!agencyName.trim()) {
      errors.name = 'Nama agen travel wajib diisi.';
    } else if (agencyName.trim().length < 3) {
      errors.name = 'Nama agen travel minimal 3 karakter.';
    }

    const cleanCode = agencyCode.trim().toUpperCase();
    if (!cleanCode) {
      errors.code = 'Kode singkatan agen wajib diisi.';
    } else if (!/^[A-Z0-9]{2,6}$/.test(cleanCode)) {
      errors.code = 'Kode harus 2-6 karakter alfanumerik (contoh: NHD, TTR).';
    } else {
      const duplicate = agencies.find(
        (a) => a.code.toUpperCase() === cleanCode && (!editingAgency || a.id !== editingAgency.id)
      );
      if (duplicate) {
        errors.code = `Kode "${cleanCode}" sudah digunakan oleh mitra "${duplicate.name}".`;
      }
    }

    if (!agencyPic.trim()) {
      errors.pic = 'Nama PIC / Manajer wajib diisi.';
    } else if (agencyPic.trim().length < 2) {
      errors.pic = 'Nama PIC minimal 2 karakter.';
    }

    const cleanPhone = agencyPhone.trim().replace(/[^0-9+]/g, '');
    if (!agencyPhone.trim()) {
      errors.phone = 'Nomor WhatsApp PIC wajib diisi.';
    } else if (cleanPhone.length < 8 || cleanPhone.length > 16) {
      errors.phone = 'Nomor WhatsApp PIC minimal 8-16 digit angka.';
    }

    if (agencyEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(agencyEmail.trim())) {
      errors.email = 'Format alamat email tidak valid.';
    }

    if (agencyCommission < 0 || agencyCommission > 50) {
      errors.commission = 'Komisi agen harus berkisar antara 0% hingga 50%.';
    }

    setAgencyErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAgencyForm()) {
      onNotify('error', 'Form Tidak Valid', 'Silakan periksa input agen yang ditandai warna merah.');
      return;
    }

    const cleanCode = agencyCode.trim().toUpperCase();

    if (editingAgency) {
      // UPDATE AGENCY
      const updates: Partial<Agency> = {
        name: agencyName.trim(),
        code: cleanCode,
        contactPerson: agencyPic.trim(),
        phone: agencyPhone.trim(),
        email: agencyEmail.trim() || `${cleanCode.toLowerCase()}@travel.com`,
        address: agencyAddress.trim() || 'Kantor Perwakilan Partner Travel',
        commissionRatePercent: Number(agencyCommission) || 10,
      };

      const res = await api.updateAgency(editingAgency.id, updates);
      if (!res.success) {
        onNotify('error', 'Gagal Memperbarui Mitra', res.message || 'Terjadi kesalahan sistem.');
        return;
      }

      handleCancelAgencyForm();
      reload();
      onNotify('success', 'Data Mitra Diperbarui', `Perubahan agen travel "${agencyName}" berhasil disimpan.`);
    } else {
      // ADD AGENCY
      const res = await api.addAgency({
        name: agencyName.trim(),
        code: cleanCode,
        contactPerson: agencyPic.trim() || 'PIC Operasional',
        phone: agencyPhone.trim(),
        email: agencyEmail.trim() || `${cleanCode.toLowerCase()}@travel.com`,
        address: agencyAddress.trim() || 'Kantor Perwakilan Partner Travel',
        commissionRatePercent: Number(agencyCommission) || 10,
      });

      if (!res.success) {
        onNotify('error', 'Gagal Menambahkan Mitra', res.message || 'Terjadi kesalahan sistem.');
        return;
      }

      handleCancelAgencyForm();
      reload();
      onNotify('success', 'Agen Travel Ditambahkan', `Mitra ${agencyName} (${cleanCode}) berhasil didaftarkan.`);
    }
  };

  const handleDeleteAgency = async (ag: Agency) => {
    if (ag.id === 'ag-direct') {
      onNotify('error', 'Aksi Ditolak', 'Agen Direct (Tamu Mandiri) adalah default sistem dan tidak boleh dihapus.');
      return;
    }

    if (confirm(`Hapus agen mitra ${ag.name} (${ag.code}) dari database?`)) {
      const res = await api.deleteAgency(ag.id);
      if (res.success) {
        reload();
        onNotify('info', 'Mitra Dihapus', `Agen ${ag.name} telah dihapus dari daftar.`);
      } else {
        onNotify('error', 'Gagal Menghapus', res.message || 'Gagal menghapus data mitra.');
      }
    }
  };

  // =========================================================================
  // TEMPLATE ITINERARY ACTIONS & FORM VALIDATION
  // =========================================================================
  const handleStartAddTemplate = () => {
    setTemplateName('');
    setTemplateCategory('Bromo Adventure');
    setTemplateDuration('7 Jam (03:00 - 10:00 WIB)');
    setTemplateDescription('');
    setTemplatePrice(1250000);
    setTemplateErrors({});
    setIsAddingTemplate(true);
  };

  const handleAddTemplateItem = () => {
    setTemplateItems([
      ...templateItems,
      {
        time: '08:00 WIB',
        title: '',
        location: '',
        description: '',
        operationalCost: 0,
        costNote: '',
      },
    ]);
  };

  const handleRemoveTemplateItem = (index: number) => {
    setTemplateItems(templateItems.filter((_, i) => i !== index));
  };

  const handleUpdateTemplateItem = (index: number, field: string, value: any) => {
    const updated = [...templateItems];
    updated[index] = { ...updated[index], [field]: value };
    setTemplateItems(updated);
  };

  const validateTemplateForm = () => {
    const errors: Record<string, string> = {};
    if (!templateName.trim()) {
      errors.name = 'Nama template itinerary wajib diisi.';
    } else if (templateName.trim().length < 3) {
      errors.name = 'Nama template minimal 3 karakter.';
    }

    if (!templateDuration.trim()) {
      errors.duration = 'Estimasi durasi rute tour wajib diisi.';
    }

    if (!templatePrice || Number(templatePrice) < 100000) {
      errors.price = 'Tarif dasar paket minimal Rp 100.000.';
    }

    if (templateItems.length === 0) {
      errors.items = 'Template harus memiliki minimal 1 rute stop kegiatan.';
    } else {
      const invalidStop = templateItems.some((it) => !it.title.trim());
      if (invalidStop) {
        errors.items = 'Setiap rute stop kegiatan wajib memiliki nama kegiatan.';
      }
    }

    setTemplateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateTemplateForm()) {
      onNotify('error', 'Form Tidak Valid', 'Silakan periksa input template yang ditandai warna merah.');
      return;
    }

    db.addItineraryTemplate({
      name: templateName.trim(),
      category: templateCategory.trim() || 'Paket Tour',
      duration: templateDuration.trim() || 'Fleksibel',
      description: templateDescription.trim() || 'Paket itinerary perjalanan wisata.',
      defaultPrice: Number(templatePrice) || 1000000,
      items: templateItems.map((it) => ({
        time: it.time || '00:00 WIB',
        title: it.title || 'Kunjungan',
        location: it.location || '-',
        description: it.description || '',
        operationalCost: Number(it.operationalCost) || 0,
        costNote: it.costNote || '',
      })),
    });

    setIsAddingTemplate(false);
    setTemplateName('');
    setTemplateDescription('');
    setTemplateErrors({});
    reload();
    onNotify('success', 'Template Ditambahkan', `Template "${templateName}" berhasil disimpan ke sistem.`);
  };

  const handleDeleteTemplate = (tmpl: ItineraryTemplate) => {
    if (confirm(`Hapus template itinerary "${tmpl.name}"?`)) {
      db.deleteItineraryTemplate(tmpl.id);
      reload();
      onNotify('info', 'Template Dihapus', `Template "${tmpl.name}" telah dihapus.`);
    }
  };

  // =========================================================================
  // BACKUP & RESTORE ACTIONS
  // =========================================================================
  const handleExportJSON = () => {
    const jsonString = db.exportDatabaseJSON();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `panorama_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    onNotify('success', 'Backup Berhasil', 'File database JSON telah diunduh ke komputer Anda.');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = db.importDatabaseJSON(content);
      if (success) {
        reload();
        onNotify('success', 'Database Dipulihkan', 'Seluruh data trip, kru, dan agen berhasil diimpor.');
      } else {
        onNotify('error', 'Gagal Impor', 'Format file JSON tidak sesuai struktur Panorama Super App.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div
        className="modal-content"
        style={{ maxWidth: '780px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Main Modal Header */}
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={20} color="#0284c7" />
            <div className="modal-title">Manajemen Master Data & Backup</div>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation Strip */}
        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '4px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '14px', flexShrink: 0, overflowX: 'auto' }}>
          <button
            type="button"
            className={`calendar-mode-btn ${activeTab === 'workers' ? 'active' : ''}`}
            onClick={() => setActiveTab('workers')}
            style={{ fontSize: '11px', padding: '6px 14px' }}
          >
            <Users size={13} />
            <span>Kru ({workers.length})</span>
          </button>
          <button
            type="button"
            className={`calendar-mode-btn ${activeTab === 'agencies' ? 'active' : ''}`}
            onClick={() => setActiveTab('agencies')}
            style={{ fontSize: '11px', padding: '6px 14px' }}
          >
            <Building size={13} />
            <span>Agen Travel ({agencies.length})</span>
          </button>
          <button
            type="button"
            className={`calendar-mode-btn ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab('templates')}
            style={{ fontSize: '11px', padding: '6px 14px' }}
          >
            <Compass size={13} />
            <span>Template Itinerary ({templates.length})</span>
          </button>
          <button
            type="button"
            className={`calendar-mode-btn ${activeTab === 'backup' ? 'active' : ''}`}
            onClick={() => setActiveTab('backup')}
            style={{ fontSize: '11px', padding: '6px 14px' }}
          >
            <Download size={13} />
            <span>Backup & Restore</span>
          </button>
        </div>

        {/* Main Tab Content Area (Clean, spacious, uncluttered list) */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          
          {/* -----------------------------------------------------------------
              TAB 1: WORKERS LIST
             ----------------------------------------------------------------- */}
          {activeTab === 'workers' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                    Daftar Kru Operasional & Kredensial Akun
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Total {workers.length} kru terdaftar dengan hak akses dan tarif per trip.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleStartAddWorker}
                  style={{ gap: '6px', fontSize: '11px' }}
                >
                  <Plus size={14} />
                  <span>Tambah Kru Baru</span>
                </button>
              </div>

              {/* Worker Cards List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {workers.map((w) => (
                  <div
                    key={w.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      fontSize: '12px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={w.avatar}
                        alt={w.name}
                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>{w.name}</span>
                          <span className={`badge ${w.type === 'internal' ? 'badge-internal' : 'badge-external'}`} style={{ fontSize: '9px', padding: '1px 6px' }}>
                            {w.type.toUpperCase()}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          {w.role === 'driver_jeep' ? 'Driver Jeep' : w.role === 'driver_lapangan' ? 'Driver Lapangan' : w.role === 'photographer' ? 'Fotografer' : 'Admin'} • {w.vehicleUnit || '-'} • WA: {w.phone}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                          <span style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', color: '#0369a1', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <User size={10} />
                            @{w.username || w.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}
                          </span>
                          <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '1px 6px', fontSize: '10px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Lock size={10} />
                            PIN: {w.pin ? '••••••' : '123456'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <strong style={{ color: '#059669', fontSize: '13px' }}>{formatIDR(w.baseRatePerTrip)}</strong>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>per trip</div>
                      </div>

                      {w.role !== 'admin' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleEditWorker(w)}
                            style={{
                              background: '#f0f9ff',
                              border: '1px solid #bae6fd',
                              color: '#0284c7',
                              cursor: 'pointer',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                            }}
                            title="Edit Data Kru"
                          >
                            <Pencil size={12} />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteWorker(w)}
                            style={{
                              background: '#fee2e2',
                              border: '1px solid #fecaca',
                              color: '#dc2626',
                              cursor: 'pointer',
                              padding: '5px 7px',
                              borderRadius: '6px',
                            }}
                            title="Hapus Kru"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* -----------------------------------------------------------------
              TAB 2: AGENCIES LIST (DENGAN TOMBOL EDIT & CRUD)
             ----------------------------------------------------------------- */}
          {activeTab === 'agencies' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                    Daftar Agen Travel Mitra & Komisi Kerjasama
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Kelola biro travel rekanan yang membawa grup wisatawan ke Panorama Tour.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleStartAddAgency}
                  style={{ gap: '6px', fontSize: '11px' }}
                >
                  <Plus size={14} />
                  <span>Tambah Mitra Baru</span>
                </button>
              </div>

              {/* Agencies List Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {agencies.map((ag) => (
                  <div
                    key={ag.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      fontSize: '12px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building size={16} color="#0284c7" />
                        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>{ag.name}</span>
                        <span className="trip-code">{ag.code}</span>
                        {ag.commissionRatePercent !== undefined && (
                          <span style={{ fontSize: '10px', color: '#059669', background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px', border: '1px solid #a7f3d0', fontWeight: 700 }}>
                            Komisi {ag.commissionRatePercent}%
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <User size={11} /> PIC: <strong>{ag.contactPerson}</strong>
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={11} /> WA: {ag.phone}
                        </span>
                        {ag.email && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={11} /> {ag.email}
                          </span>
                        )}
                        {ag.address && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <MapPin size={11} /> {ag.address}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleEditAgency(ag)}
                        style={{
                          background: '#f0f9ff',
                          border: '1px solid #bae6fd',
                          color: '#0284c7',
                          cursor: 'pointer',
                          padding: '5px 8px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                        title="Edit Data Mitra"
                      >
                        <Pencil size={12} />
                        <span>Edit</span>
                      </button>

                      {ag.id !== 'ag-direct' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAgency(ag)}
                          style={{
                            background: '#fee2e2',
                            border: '1px solid #fecaca',
                            color: '#dc2626',
                            cursor: 'pointer',
                            padding: '5px 7px',
                            borderRadius: '6px',
                          }}
                          title="Hapus Mitra"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* -----------------------------------------------------------------
              TAB 3: TEMPLATES LIST
             ----------------------------------------------------------------- */}
          {activeTab === 'templates' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                    Template Standar Paket Tour & Biaya Operasional
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Rincian jadwal rundown spot dan estimasi beban pengeluaran tiket/parkir.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleStartAddTemplate}
                  style={{ gap: '6px', fontSize: '11px' }}
                >
                  <Plus size={14} />
                  <span>Tambah Template Baru</span>
                </button>
              </div>

              {/* Templates List Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {templates.map((tmpl) => {
                  const totalCost = tmpl.items.reduce((acc, it) => acc + (it.operationalCost || 0), 0);
                  const isExpanded = expandedTemplateId === tmpl.id;

                  return (
                    <div
                      key={tmpl.id}
                      style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ flex: 1, minWidth: '220px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 800, color: '#0284c7', fontSize: '14px' }}>{tmpl.name}</span>
                            <span className="badge badge-internal" style={{ fontSize: '9px', padding: '1px 5px' }}>
                              {tmpl.category}
                            </span>
                          </div>

                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>⏱️ {tmpl.duration}</span>
                            <span>•</span>
                            <span>📍 {tmpl.items.length} Stop Kegiatan</span>
                            <span>•</span>
                            <span>Tarif Paket: <strong style={{ color: '#0f172a' }}>{formatIDR(tmpl.defaultPrice)}</strong></span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>Beban Biaya Ops:</div>
                            <strong style={{ color: '#059669', fontSize: '13px' }}>{formatIDR(totalCost)}</strong>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(tmpl)}
                            style={{
                              background: '#fee2e2',
                              border: '1px solid #fecaca',
                              color: '#dc2626',
                              cursor: 'pointer',
                              padding: '6px 8px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s',
                            }}
                            title="Hapus Template Itinerary"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div style={{ marginTop: '8px', fontSize: '11px', color: '#475569', lineHeight: 1.4 }}>
                        {tmpl.description}
                      </div>

                      {/* Expand/Collapse Stops Toggle */}
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => setExpandedTemplateId(isExpanded ? null : tmpl.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#0284c7',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 0',
                          }}
                        >
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          <span>{isExpanded ? 'Sembunyikan Rute Stop' : `Lihat Rincian ${tmpl.items.length} Stop & Biaya`}</span>
                        </button>

                        <span style={{ fontSize: '10px', color: '#94a3b8' }}>ID: {tmpl.id}</span>
                      </div>

                      {/* Accordion Stops View */}
                      {isExpanded && (
                        <div style={{ marginTop: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {tmpl.items.map((it, idx) => (
                            <div
                              key={idx}
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', padding: '4px 6px', background: '#ffffff', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 700, color: '#ea580c', width: '65px' }}>{it.time}</span>
                                <div>
                                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{it.title}</span>
                                  <span style={{ color: '#64748b', marginLeft: '6px' }}>({it.location})</span>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <strong style={{ color: (it.operationalCost || 0) > 0 ? '#ef4444' : '#10b981' }}>
                                  {(it.operationalCost || 0) > 0 ? formatIDR(it.operationalCost!) : 'Rp 0'}
                                </strong>
                                {it.costNote && (
                                  <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '4px' }}>
                                    ({it.costNote})
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* -----------------------------------------------------------------
              TAB 4: BACKUP & RESTORE
             ----------------------------------------------------------------- */}
          {activeTab === 'backup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Download size={18} color="#15803d" />
                  <strong style={{ color: '#15803d', fontSize: '14px' }}>Ekspor Database (Backup JSON)</strong>
                </div>
                <p style={{ fontSize: '12px', color: '#166534', margin: '6px 0 12px 0', lineHeight: 1.4 }}>
                  Unduh seluruh data operasional (trip, kru, agen, dan template) ke dalam satu file format JSON. Simpan file ini sebagai cadangan berkala.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleExportJSON}
                  style={{ gap: '6px' }}
                >
                  <Download size={14} />
                  <span>Unduh File Backup JSON</span>
                </button>
              </div>

              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Upload size={18} color="#0369a1" />
                  <strong style={{ color: '#0369a1', fontSize: '14px' }}>Impor Database (Restore JSON)</strong>
                </div>
                <p style={{ fontSize: '12px', color: '#0c4a6e', margin: '6px 0 12px 0', lineHeight: 1.4 }}>
                  Pulihkan data dari file backup JSON sebelumnya. Berguna jika Anda berpindah laptop atau ponsel baru.
                </p>
                <label className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <Upload size={14} />
                  <span>Pilih File Backup JSON</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportJSON}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div style={{ marginTop: '16px', paddingTop: '10px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>
            Tutup Master Data
          </button>
        </div>
      </div>

      {/* =========================================================================
          SUB-MODAL DIALOG 1: FORM TAMBAH / EDIT KRU
          (Level Index Terpisah zIndex 1100, tidak menyatu dalam kontainer tab)
         ========================================================================= */}
      {isAddingWorker && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1100, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)' }}
          onClick={handleCancelWorkerForm}
        >
          <div
            className="modal-content"
            style={{ maxWidth: '620px', maxHeight: '90vh', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)', border: '1px solid #94a3b8' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {editingWorker ? <Pencil size={18} color="#0284c7" /> : <Plus size={18} color="#0284c7" />}
                <div className="modal-title">
                  {editingWorker ? `Edit Data Kru: ${editingWorker.name}` : 'Pendaftaran Anggota Kru Baru'}
                </div>
              </div>
              <button type="button" className="modal-close-btn" onClick={handleCancelWorkerForm}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveWorker} style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '4px' }}>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>
                    Nama Lengkap Kru: <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: Joko Prasetyo"
                    value={workerName}
                    onChange={(e) => {
                      setWorkerName(e.target.value);
                      if (workerErrors.name) setWorkerErrors({ ...workerErrors, name: '' });
                    }}
                    style={{ fontSize: '12px', padding: '7px 10px', borderColor: workerErrors.name ? '#ef4444' : undefined }}
                    autoFocus
                  />
                  {workerErrors.name && (
                    <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', display: 'block' }}>
                      {workerErrors.name}
                    </span>
                  )}
                </div>
                <div className="form-group" style={{ width: '160px' }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>Role Penugasan:</label>
                  <select
                    className="form-select"
                    value={workerRole}
                    onChange={(e) => setWorkerRole(e.target.value as UserRole)}
                    style={{ fontSize: '12px', padding: '7px 10px' }}
                  >
                    <option value="driver_jeep">Driver Jeep</option>
                    <option value="driver_lapangan">Driver Lapangan</option>
                    <option value="photographer">Fotografer</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>
                    Nomor WhatsApp: <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="0812-xxxx-xxxx"
                    value={workerPhone}
                    onChange={(e) => {
                      setWorkerPhone(e.target.value);
                      if (workerErrors.phone) setWorkerErrors({ ...workerErrors, phone: '' });
                    }}
                    style={{ fontSize: '12px', padding: '7px 10px', borderColor: workerErrors.phone ? '#ef4444' : undefined }}
                  />
                  {workerErrors.phone && (
                    <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', display: 'block' }}>
                      {workerErrors.phone}
                    </span>
                  )}
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>
                    {workerRole === 'driver_jeep' ? 'Unit Jeep / Plat Nomor:' : workerRole === 'driver_lapangan' ? 'Mobil Shuttle / Plat:' : 'Gear Kamera / Lensa:'}{' '}
                    {(workerRole === 'driver_jeep' || workerRole === 'driver_lapangan') && <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={workerRole === 'driver_jeep' ? 'Jeep Hardtop N 1845 AB' : workerRole === 'driver_lapangan' ? 'Innova Reborn N 1234 CD' : 'Sony A7IV + 24-70 GM'}
                    value={workerVehicle}
                    onChange={(e) => {
                      setWorkerVehicle(e.target.value);
                      if (workerErrors.vehicle) setWorkerErrors({ ...workerErrors, vehicle: '' });
                    }}
                    style={{ fontSize: '12px', padding: '7px 10px', borderColor: workerErrors.vehicle ? '#ef4444' : undefined }}
                  />
                  {workerErrors.vehicle && (
                    <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', display: 'block' }}>
                      {workerErrors.vehicle}
                    </span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>Status Kru:</label>
                  <select
                    className="form-select"
                    value={workerType}
                    onChange={(e) => setWorkerType(e.target.value as WorkerType)}
                    style={{ fontSize: '12px', padding: '7px 10px' }}
                  >
                    <option value="internal">Internal (Armada Tetap Perusahaan)</option>
                    <option value="external">External (Mitra / Freelance)</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>
                    Tarif Honor Standar per Trip (Rp): <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="25000"
                    className="form-input"
                    value={workerRate}
                    onChange={(e) => {
                      setWorkerRate(Number(e.target.value));
                      if (workerErrors.rate) setWorkerErrors({ ...workerErrors, rate: '' });
                    }}
                    style={{ fontSize: '12px', padding: '7px 10px', color: '#059669', fontWeight: 800, borderColor: workerErrors.rate ? '#ef4444' : undefined }}
                  />
                  {workerErrors.rate && (
                    <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', display: 'block' }}>
                      {workerErrors.rate}
                    </span>
                  )}
                </div>
              </div>

              {/* Kredensial Keamanan Akun & Form Login: Username & PIN 6 Digit */}
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ShieldCheck size={16} color="#0284c7" />
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>
                    Kredensial Login Akun (Username & PIN 6-Digit)
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  Kredensial ini digunakan kru untuk masuk ke Panorama Super App sesuai hak akses perannya.
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={12} />
                      <span>Username Login: <span style={{ color: '#ef4444' }}>*</span></span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: '#94a3b8', fontWeight: 700 }}>@</span>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="contoh: joko_jeep"
                        value={workerUsername}
                        onChange={(e) => {
                          setWorkerUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''));
                          if (workerErrors.username) setWorkerErrors({ ...workerErrors, username: '' });
                        }}
                        style={{ fontSize: '12px', padding: '7px 10px 7px 26px', borderColor: workerErrors.username ? '#ef4444' : undefined }}
                        autoCapitalize="none"
                        autoCorrect="off"
                      />
                    </div>
                    {workerErrors.username && (
                      <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', display: 'block' }}>
                        {workerErrors.username}
                      </span>
                    )}
                  </div>

                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Lock size={12} />
                      <span>
                        {editingWorker ? 'Ganti PIN (Opsional):' : 'PIN Keamanan (6 Digit):'} {!editingWorker && <span style={{ color: '#ef4444' }}>*</span>}
                      </span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showWorkerPin ? 'text' : 'password'}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        className="form-input"
                        placeholder={editingWorker ? 'Kosongkan jika PIN tetap' : '6 digit, contoh: 123456'}
                        value={workerPin}
                        onChange={(e) => {
                          setWorkerPin(e.target.value.replace(/[^0-9]/g, ''));
                          if (workerErrors.pin) setWorkerErrors({ ...workerErrors, pin: '' });
                        }}
                        style={{ fontSize: '12px', padding: '7px 32px 7px 10px', letterSpacing: showWorkerPin ? '1px' : '3px', borderColor: workerErrors.pin ? '#ef4444' : undefined }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowWorkerPin(!showWorkerPin)}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748b',
                          padding: '2px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        tabIndex={-1}
                        title={showWorkerPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                      >
                        {showWorkerPin ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {workerErrors.pin ? (
                      <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', display: 'block' }}>
                        {workerErrors.pin}
                      </span>
                    ) : (
                      <span style={{ fontSize: '9px', color: '#64748b', marginTop: '2px', display: 'block' }}>
                        {editingWorker ? 'Hanya isi bila kru meminta perubahan PIN.' : 'PIN standar awal: 123456.'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={handleCancelWorkerForm}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ gap: '6px' }}>
                  {editingWorker ? <Pencil size={13} /> : <Plus size={13} />}
                  <span>{editingWorker ? 'Simpan Perubahan Kru' : 'Daftarkan Kru Baru'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-MODAL DIALOG 2: FORM TAMBAH / EDIT MITRA AGEN TRAVEL (FULL CRUD)
          (Level Index Terpisah zIndex 1100, tidak menyatu dalam kontainer tab)
         ========================================================================= */}
      {isAddingAgency && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1100, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)' }}
          onClick={handleCancelAgencyForm}
        >
          <div
            className="modal-content"
            style={{ maxWidth: '580px', maxHeight: '90vh', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)', border: '1px solid #94a3b8' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={18} color="#0284c7" />
                <div className="modal-title">
                  {editingAgency ? `Edit Data Mitra: ${editingAgency.name}` : 'Pendaftaran Agen Travel Mitra Baru'}
                </div>
              </div>
              <button type="button" className="modal-close-btn" onClick={handleCancelAgencyForm}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAgency} style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '4px' }}>
              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>
                    Nama Agen Travel: <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: Nusantara Holiday Tour"
                    value={agencyName}
                    onChange={(e) => {
                      setAgencyName(e.target.value);
                      if (agencyErrors.name) setAgencyErrors({ ...agencyErrors, name: '' });
                    }}
                    style={{ fontSize: '12px', padding: '7px 10px', borderColor: agencyErrors.name ? '#ef4444' : undefined }}
                    autoFocus
                  />
                  {agencyErrors.name && (
                    <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', display: 'block' }}>
                      {agencyErrors.name}
                    </span>
                  )}
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>
                    Kode Singkatan: <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="NHD"
                    maxLength={6}
                    value={agencyCode}
                    onChange={(e) => {
                      setAgencyCode(e.target.value.toUpperCase());
                      if (agencyErrors.code) setAgencyErrors({ ...agencyErrors, code: '' });
                    }}
                    style={{ fontSize: '12px', padding: '7px 10px', fontWeight: 800, letterSpacing: '1px', borderColor: agencyErrors.code ? '#ef4444' : undefined }}
                  />
                  {agencyErrors.code && (
                    <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', display: 'block' }}>
                      {agencyErrors.code}
                    </span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>
                    Kontak PIC / Manajer Operasional: <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Nama PIC (contoh: Pak Hendra)"
                    value={agencyPic}
                    onChange={(e) => {
                      setAgencyPic(e.target.value);
                      if (agencyErrors.pic) setAgencyErrors({ ...agencyErrors, pic: '' });
                    }}
                    style={{ fontSize: '12px', padding: '7px 10px', borderColor: agencyErrors.pic ? '#ef4444' : undefined }}
                  />
                  {agencyErrors.pic && (
                    <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', display: 'block' }}>
                      {agencyErrors.pic}
                    </span>
                  )}
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>
                    Nomor WhatsApp PIC: <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="0812-xxxx-xxxx"
                    value={agencyPhone}
                    onChange={(e) => {
                      setAgencyPhone(e.target.value);
                      if (agencyErrors.phone) setAgencyErrors({ ...agencyErrors, phone: '' });
                    }}
                    style={{ fontSize: '12px', padding: '7px 10px', borderColor: agencyErrors.phone ? '#ef4444' : undefined }}
                  />
                  {agencyErrors.phone && (
                    <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', display: 'block' }}>
                      {agencyErrors.phone}
                    </span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>Alamat Email Agen:</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="partner@travel.com"
                    value={agencyEmail}
                    onChange={(e) => {
                      setAgencyEmail(e.target.value);
                      if (agencyErrors.email) setAgencyErrors({ ...agencyErrors, email: '' });
                    }}
                    style={{ fontSize: '12px', padding: '7px 10px', borderColor: agencyErrors.email ? '#ef4444' : undefined }}
                  />
                  {agencyErrors.email && (
                    <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', display: 'block' }}>
                      {agencyErrors.email}
                    </span>
                  )}
                </div>
                <div className="form-group" style={{ width: '130px' }}>
                  <label className="form-label" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Percent size={12} />
                    <span>Komisi (%):</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    className="form-input"
                    value={agencyCommission}
                    onChange={(e) => {
                      setAgencyCommission(Number(e.target.value));
                      if (agencyErrors.commission) setAgencyErrors({ ...agencyErrors, commission: '' });
                    }}
                    style={{ fontSize: '12px', padding: '7px 10px', fontWeight: 800, color: '#059669', borderColor: agencyErrors.commission ? '#ef4444' : undefined }}
                  />
                  {agencyErrors.commission && (
                    <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', display: 'block' }}>
                      {agencyErrors.commission}
                    </span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px' }}>Alamat Kantor Biro Rekanan:</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Jl. Raya Bromo / Kota Asal Agen"
                  value={agencyAddress}
                  onChange={(e) => setAgencyAddress(e.target.value)}
                  style={{ fontSize: '12px', padding: '7px 10px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={handleCancelAgencyForm}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ gap: '6px' }}>
                  {editingAgency ? <Pencil size={13} /> : <Plus size={13} />}
                  <span>{editingAgency ? 'Simpan Perubahan Mitra' : 'Daftarkan Mitra Baru'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-MODAL DIALOG 3: FORM TAMBAH TEMPLATE ITINERARY
          (Level Index Terpisah zIndex 1100, tidak menyatu dalam kontainer tab)
         ========================================================================= */}
      {isAddingTemplate && (
        <div
          className="modal-overlay"
          style={{ zIndex: 1100, backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)' }}
          onClick={() => setIsAddingTemplate(false)}
        >
          <div
            className="modal-content"
            style={{ maxWidth: '680px', maxHeight: '90vh', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)', border: '1px solid #94a3b8' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Compass size={18} color="#0284c7" />
                <div className="modal-title">Buat Template Itinerary Baru</div>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setIsAddingTemplate(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '4px' }}>
              <div className="form-row">
                <div className="form-group" style={{ flex: 2 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>
                    Nama Template Paket Tour: <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: Bromo Sunrise + Snorkeling Gili Ketapang"
                    value={templateName}
                    onChange={(e) => {
                      setTemplateName(e.target.value);
                      if (templateErrors.name) setTemplateErrors({ ...templateErrors, name: '' });
                    }}
                    style={{ fontSize: '12px', padding: '7px 10px', borderColor: templateErrors.name ? '#ef4444' : undefined }}
                    autoFocus
                  />
                  {templateErrors.name && (
                    <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', display: 'block' }}>
                      {templateErrors.name}
                    </span>
                  )}
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>Kategori:</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Bromo Adventure / Special"
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    style={{ fontSize: '12px', padding: '7px 10px' }}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>
                    Estimasi Durasi: <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="7 Jam (03:00 - 10:00 WIB)"
                    value={templateDuration}
                    onChange={(e) => {
                      setTemplateDuration(e.target.value);
                      if (templateErrors.duration) setTemplateErrors({ ...templateErrors, duration: '' });
                    }}
                    style={{ fontSize: '12px', padding: '7px 10px', borderColor: templateErrors.duration ? '#ef4444' : undefined }}
                  />
                  {templateErrors.duration && (
                    <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', display: 'block' }}>
                      {templateErrors.duration}
                    </span>
                  )}
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>
                    Tarif Dasar Paket (IDR): <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step={50000}
                    className="form-input"
                    placeholder="1250000"
                    value={templatePrice}
                    onChange={(e) => {
                      setTemplatePrice(Number(e.target.value));
                      if (templateErrors.price) setTemplateErrors({ ...templateErrors, price: '' });
                    }}
                    style={{ fontSize: '12px', padding: '7px 10px', fontWeight: 800, color: '#059669', borderColor: templateErrors.price ? '#ef4444' : undefined }}
                  />
                  {templateErrors.price && (
                    <span style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', display: 'block' }}>
                      {templateErrors.price}
                    </span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '11px' }}>Deskripsi Singkat Rute:</label>
                <textarea
                  className="form-input"
                  rows={2}
                  placeholder="Rute perjalanan, keunggulan paket, dan destinasi yang dikunjungi..."
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  style={{ fontSize: '12px', padding: '7px 10px', resize: 'vertical' }}
                />
              </div>

              {/* Sub-list of Itinerary Stops */}
              <div style={{ background: '#f8fafc', border: templateErrors.items ? '1px solid #ef4444' : '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>
                    Jadwal Rute & Alokasi Biaya Operasional ({templateItems.length} Stop):
                  </span>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={handleAddTemplateItem}
                    style={{ padding: '3px 10px', fontSize: '11px', gap: '4px' }}
                  >
                    <Plus size={13} />
                    <span>Tambah Stop</span>
                  </button>
                </div>

                {templateErrors.items && (
                  <span style={{ fontSize: '11px', color: '#ef4444', marginBottom: '8px', display: 'block' }}>
                    {templateErrors.items}
                  </span>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                  {templateItems.map((item, idx) => (
                    <div
                      key={idx}
                      style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}
                    >
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="04:00 WIB"
                          value={item.time}
                          onChange={(e) => handleUpdateTemplateItem(idx, 'time', e.target.value)}
                          style={{ width: '90px', fontSize: '11px', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                        <input
                          type="text"
                          placeholder="Nama Kegiatan / Spot *"
                          value={item.title}
                          onChange={(e) => handleUpdateTemplateItem(idx, 'title', e.target.value)}
                          required
                          style={{ flex: 1, fontSize: '11px', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveTemplateItem(idx)}
                          disabled={templateItems.length <= 1}
                          style={{ background: 'transparent', border: 'none', color: templateItems.length <= 1 ? '#cbd5e1' : '#ef4444', cursor: templateItems.length <= 1 ? 'not-allowed' : 'pointer', padding: '2px' }}
                          title="Hapus Stop"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="Lokasi / Destinasi"
                          value={item.location}
                          onChange={(e) => handleUpdateTemplateItem(idx, 'location', e.target.value)}
                          style={{ flex: 1, fontSize: '11px', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                        <input
                          type="number"
                          step={5000}
                          placeholder="Biaya Ops (Rp)"
                          value={item.operationalCost}
                          onChange={(e) => handleUpdateTemplateItem(idx, 'operationalCost', Number(e.target.value))}
                          style={{ width: '110px', fontSize: '11px', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#059669', fontWeight: 700 }}
                        />
                        <input
                          type="text"
                          placeholder="Ket. Biaya (Tiket/BBM)"
                          value={item.costNote}
                          onChange={(e) => handleUpdateTemplateItem(idx, 'costNote', e.target.value)}
                          style={{ flex: 1, fontSize: '11px', padding: '5px 8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', fontSize: '11px' }}>
                  <span style={{ color: '#64748b' }}>Total Est. Biaya Operasional: </span>
                  <strong style={{ color: '#059669', marginLeft: '6px' }}>
                    {formatIDR(templateItems.reduce((acc, it) => acc + (Number(it.operationalCost) || 0), 0))}
                  </strong>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setIsAddingTemplate(false)}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ gap: '6px' }}>
                  <Plus size={13} />
                  <span>Simpan Template Itinerary</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
