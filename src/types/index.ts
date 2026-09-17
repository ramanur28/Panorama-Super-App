// Panorama Super App - Type Definitions

export type UserRole = 'driver_jeep' | 'driver_lapangan' | 'photographer' | 'admin';

export type WorkerType = 'internal' | 'external';

export type TripStatus = 'booked' | 'in_progress' | 'completed' | 'cancelled';

export type PaymentStatus = 'unpaid' | 'paid' | 'partial';

export type DateFilterMode = 'single' | 'range';

export interface DateFilterSelection {
  mode: DateFilterMode;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface ItineraryItem {
  id: string;
  time: string; // e.g. "03:30 WIB"
  title: string; // e.g. "Penjemputan Tamu di Hotel"
  location: string; // e.g. "Lobby Hotel Jiwa Jawa"
  description?: string; // e.g. "Briefing rute dan pengecekan jaket tebal"
  operationalCost: number; // e.g. 120000 (Sensitive: Admin Only)
  costNote?: string; // e.g. "Tiket Masuk TNBTS 4 Pax"
}

export interface ItineraryTemplate {
  id: string;
  name: string;
  category: string;
  duration: string;
  description: string;
  defaultPrice: number;
  items: Omit<ItineraryItem, 'id'>[];
}

export interface Worker {
  id: string;
  name: string;
  role: UserRole;
  type: WorkerType; // internal (karyawan/armada tetap) vs external (mitra/vendor lepas)
  phone: string;
  username?: string;
  email?: string;
  pin?: string;
  vehicleUnit?: string; // Plat / Nomor unit (misal: "Jeep 03 - Hardtop N 1845 AB")
  avatar: string;
  baseRatePerTrip: number; // Tarif standar per trip
  isAvailable: boolean;
}

export interface Agency {
  id: string;
  name: string;
  code: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  commissionRatePercent?: number;
}

export interface Trip {
  id: string;
  code: string; // e.g. "PNR-20260917-01"
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "03:30 WIB (Sunrise)", "08:00 WIB (Pagi)", "13:30 WIB (Siang)"
  tourPackage: string; // e.g. "Bromo Sunrise 4 Spot", "Merapi Lava Tour", "Ijen Blue Fire"
  pickupPoint: string;
  
  // Guest Information
  guestName: string;
  guestCount: number; // pax
  guestPhone: string;
  notes?: string;

  // Travel Agency Information
  agencyId: string; // ID agen travel atau "direct" (tamu mandiri)
  agencyName: string;

  // Financials - Penjualan ke Tamu / Agen (Admin Only)
  packagePrice: number; // Harga total paket jual
  agencyPaymentStatus: PaymentStatus; // Status pembayaran dari agen travel

  // Assignment: Driver Jeep
  jeepDriverId: string;
  jeepDriverName: string;
  jeepUnit: string;
  jeepStatus: WorkerType; // internal vs external
  jeepFee: number; // Bayaran untuk driver jeep (Hanya bisa dilihat Driver Jeep & Admin)
  jeepPayrollStatus: PaymentStatus; // Status bayar honor driver jeep

  // Assignment: Driver Lapangan / Shuttle
  fieldDriverId: string;
  fieldDriverName: string;
  fieldDriverStatus: WorkerType; // internal vs external
  fieldDriverFee: number; // Bayaran driver lapangan (Hanya bisa dilihat Driver Lapangan & Admin)
  fieldPayrollStatus: PaymentStatus;

  // Assignment: Fotografer Dokumentasi
  photographerId: string;
  photographerName: string;
  photographerStatus: WorkerType; // internal vs external
  photographerFee: number; // Bayaran fotografer (Hanya bisa dilihat Fotografer & Admin)
  photographerPayrollStatus: PaymentStatus;
  photoAlbumUrl?: string; // Tautan Google Drive / Cloud album

  // Itinerary & Operational Activities
  itineraryTemplateId?: string;
  itineraryTemplateName?: string;
  itinerary: ItineraryItem[];

  // Operational Direct Cost (Tiket Masuk TNBTS, BBM, Parkir dll) - STRICTLY ADMIN ONLY
  operationalCost: number;

  // Status & Lifecycle
  tripStatus: TripStatus;
  updatedAt: string;
}

export interface AgencyInvoice {
  invoiceNumber: string;
  agencyId: string;
  agencyName: string;
  contactPerson: string;
  phone: string;
  invoiceDate: string;
  dueDate: string;
  trips: Trip[];
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: PaymentStatus;
}

export interface WorkerPayrollSummary {
  worker: Worker;
  totalDaysWorked: number;
  totalTripsCount: number;
  totalEarnings: number;
  paidEarnings: number;
  pendingEarnings: number;
  trips: Trip[];
}

export interface ProfitAndLossSummary {
  totalTrips: number;
  cancelledTripsCount?: number;
  grossRevenue: number;
  // Cost breakdown
  jeepCosts: {
    internal: number;
    external: number;
    total: number;
  };
  fieldDriverCosts: {
    internal: number;
    external: number;
    total: number;
  };
  photographerCosts: {
    internal: number;
    external: number;
    total: number;
  };
  operationalCosts: number;
  totalExpenses: number;
  netProfit: number;
  profitMarginPercent: number;
}

// Interactive App Feedback Types
export type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  requiresInput?: boolean;
  inputPlaceholder?: string;
  initialInputValue?: string;
  onConfirm: (inputValue?: string) => void;
  onCancel: () => void;
}

// Authentication & Session Types
export interface AuthCredentials {
  identifier: string; // phone or username or email
  pinOrPassword?: string;
}

export interface AuthSession {
  user: Worker;
  token: string;
  loginTime: string;
}

