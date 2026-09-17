// Unified Database Layer for Panorama Super App
import type { Agency, AgencyInvoice, ItineraryTemplate, ProfitAndLossSummary, Trip, TripStatus, UserRole, Worker, WorkerPayrollSummary } from '../types';
import { INITIAL_AGENCIES, INITIAL_ITINERARY_TEMPLATES, INITIAL_TRIPS, INITIAL_WORKERS } from './seedData';

const STORAGE_KEYS = {
  TRIPS: 'panorama_trips_v3',
  WORKERS: 'panorama_workers_v3',
  AGENCIES: 'panorama_agencies_v3',
  TEMPLATES: 'panorama_templates_v3',
};

export function calculateAutoTripStatus(dateStr: string, timeSlot: string): TripStatus {
  const todayStr = '2026-09-17';
  const currentHour = 17;
  const currentMinute = 25;
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  if (dateStr < todayStr) {
    return 'completed';
  }
  if (dateStr > todayStr) {
    return 'booked';
  }

  let startMinutes = 3 * 60 + 30; // 03:30 (210 menit)
  let endMinutes = 10 * 60; // 10:00 (600 menit)

  if (timeSlot.includes('03:30') || timeSlot.toLowerCase().includes('sunrise')) {
    startMinutes = 3 * 60 + 30;
    endMinutes = 10 * 60; // 03:30 - 10:00
  } else if (timeSlot.includes('08:30') || timeSlot.toLowerCase().includes('daylight') || timeSlot.includes('08:00')) {
    startMinutes = 8 * 60 + 30;
    endMinutes = 14 * 60 + 30; // 08:30 - 14:30
  } else if (timeSlot.includes('14:00') || timeSlot.toLowerCase().includes('sunset')) {
    startMinutes = 14 * 60;
    endMinutes = 20 * 60; // 14:00 - 20:00 (sedang jalan saat 17:25)
  }

  if (currentTimeMinutes < startMinutes) {
    return 'booked';
  } else if (currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes) {
    return 'in_progress';
  } else {
    return 'completed';
  }
}

class PanoramaDatabase {
  private trips: Trip[] = [];
  private workers: Worker[] = [];
  private agencies: Agency[] = [];
  private templates: ItineraryTemplate[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    try {
      const storedTrips = localStorage.getItem(STORAGE_KEYS.TRIPS);
      const storedWorkers = localStorage.getItem(STORAGE_KEYS.WORKERS);
      const storedAgencies = localStorage.getItem(STORAGE_KEYS.AGENCIES);
      const storedTemplates = localStorage.getItem(STORAGE_KEYS.TEMPLATES);

      const rawTrips: Trip[] = storedTrips ? JSON.parse(storedTrips) : INITIAL_TRIPS;
      this.trips = rawTrips.map((t) => ({
        ...t,
        itinerary: t.itinerary || [],
        tripStatus: t.tripStatus === 'cancelled' ? 'cancelled' : calculateAutoTripStatus(t.date, t.timeSlot),
      }));

      this.workers = storedWorkers ? JSON.parse(storedWorkers) : INITIAL_WORKERS;
      this.agencies = storedAgencies ? JSON.parse(storedAgencies) : INITIAL_AGENCIES;
      this.templates = storedTemplates ? JSON.parse(storedTemplates) : INITIAL_ITINERARY_TEMPLATES;

      this.persist();
    } catch (e) {
      console.error('Failed to load storage, using defaults', e);
      this.trips = INITIAL_TRIPS.map((t) => ({
        ...t,
        itinerary: t.itinerary || [],
        tripStatus: t.tripStatus === 'cancelled' ? 'cancelled' : calculateAutoTripStatus(t.date, t.timeSlot),
      }));
      this.workers = [...INITIAL_WORKERS];
      this.agencies = [...INITIAL_AGENCIES];
      this.templates = [...INITIAL_ITINERARY_TEMPLATES];
    }
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(this.trips));
      localStorage.setItem(STORAGE_KEYS.WORKERS, JSON.stringify(this.workers));
      localStorage.setItem(STORAGE_KEYS.AGENCIES, JSON.stringify(this.agencies));
      localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(this.templates));
      this.notifyListeners();
    } catch (e) {
      console.error('Failed to persist database', e);
    }
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => cb());
  }

  // --- ITINERARY TEMPLATES ---
  public getItineraryTemplates(): ItineraryTemplate[] {
    return [...this.templates];
  }

  public getItineraryTemplateById(id: string): ItineraryTemplate | undefined {
    return this.templates.find((t) => t.id === id);
  }

  // --- TRIPS CRUD & QUERIES ---
  public getTrips(filters?: {
    date?: string;
    startDate?: string;
    endDate?: string;
    role?: UserRole;
    workerId?: string;
    agencyId?: string;
  }): Trip[] {
    let result = this.trips.map((t) => ({
      ...t,
      tripStatus: t.tripStatus === 'cancelled' ? 'cancelled' : calculateAutoTripStatus(t.date, t.timeSlot),
    }));

    if (filters?.date && filters.date !== 'all') {
      result = result.filter((t) => t.date === filters.date);
    }

    if (filters?.startDate && filters?.endDate) {
      result = result.filter((t) => t.date >= filters.startDate! && t.date <= filters.endDate!);
    }

    if (filters?.agencyId) {
      result = result.filter((t) => t.agencyId === filters.agencyId);
    }

    if (filters?.workerId) {
      const wId = filters.workerId;
      result = result.filter(
        (t) =>
          t.jeepDriverId === wId ||
          t.fieldDriverId === wId ||
          t.photographerId === wId
      );
    }

    return result.sort((a, b) => b.date.localeCompare(a.date) || a.timeSlot.localeCompare(b.timeSlot));
  }

  public getTripById(id: string): Trip | undefined {
    const trip = this.trips.find((t) => t.id === id);
    if (!trip) return undefined;
    return {
      ...trip,
      tripStatus: trip.tripStatus === 'cancelled' ? 'cancelled' : calculateAutoTripStatus(trip.date, trip.timeSlot),
    };
  }

  public addTrip(newTripData: Omit<Trip, 'id' | 'code' | 'updatedAt' | 'tripStatus'>): Trip {
    const codeNumber = String(this.trips.length + 1).padStart(2, '0');
    const dateFormatted = newTripData.date.replace(/-/g, '').slice(2);
    const code = `PNR-${dateFormatted}-${codeNumber}`;
    const autoStatus = calculateAutoTripStatus(newTripData.date, newTripData.timeSlot);

    // Otomatis hitung biaya operasional dari total biaya seluruh stop itinerary jika ada
    let totalOpCost = newTripData.operationalCost;
    if (newTripData.itinerary && newTripData.itinerary.length > 0) {
      const sumItineraryCost = newTripData.itinerary.reduce((acc, it) => acc + (it.operationalCost || 0), 0);
      if (sumItineraryCost > 0) {
        totalOpCost = sumItineraryCost;
      }
    }

    const newTrip: Trip = {
      ...newTripData,
      id: `trip-${Date.now()}`,
      code,
      operationalCost: totalOpCost,
      tripStatus: autoStatus,
      updatedAt: new Date().toISOString(),
    };

    this.trips.unshift(newTrip);
    this.persist();
    return newTrip;
  }

  public updateTrip(id: string, updates: Partial<Trip>): Trip | undefined {
    const idx = this.trips.findIndex((t) => t.id === id);
    if (idx === -1) return undefined;

    let totalOpCost = updates.operationalCost ?? this.trips[idx].operationalCost;
    if (updates.itinerary && updates.itinerary.length > 0) {
      const sumItineraryCost = updates.itinerary.reduce((acc, it) => acc + (Number(it.operationalCost) || 0), 0);
      if (sumItineraryCost > 0) {
        totalOpCost = sumItineraryCost;
      }
    }

    this.trips[idx] = {
      ...this.trips[idx],
      ...updates,
      operationalCost: totalOpCost,
      updatedAt: new Date().toISOString(),
    };

    this.persist();
    return this.trips[idx];
  }

  public cancelTrip(id: string, reason?: string): Trip | undefined {
    const trip = this.trips.find((t) => t.id === id);
    if (!trip) return undefined;
    const notePrefix = reason ? `[DIBATALKAN: ${reason}]` : '[DIBATALKAN ADMIN]';
    const updatedNotes = trip.notes ? `${notePrefix} ${trip.notes}` : notePrefix;
    return this.updateTrip(id, {
      tripStatus: 'cancelled',
      notes: updatedNotes,
      jeepPayrollStatus: 'unpaid',
      fieldPayrollStatus: 'unpaid',
      photographerPayrollStatus: 'unpaid',
    });
  }

  public restoreTrip(id: string): Trip | undefined {
    const trip = this.trips.find((t) => t.id === id);
    if (!trip) return undefined;
    const autoStatus = calculateAutoTripStatus(trip.date, trip.timeSlot);
    const cleanedNotes = trip.notes ? trip.notes.replace(/\[DIBATALKAN.*?\]\s*/g, '').trim() : '';
    return this.updateTrip(id, {
      tripStatus: autoStatus,
      notes: cleanedNotes,
    });
  }

  public updatePhotoUrl(id: string, url: string): void {
    this.updateTrip(id, { photoAlbumUrl: url });
  }

  public deleteTrip(id: string): boolean {
    const initialLen = this.trips.length;
    this.trips = this.trips.filter((t) => t.id !== id);
    if (this.trips.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- WORKERS ---
  public getWorkers(role?: UserRole): Worker[] {
    if (role) {
      return this.workers.filter((w) => w.role === role);
    }
    return [...this.workers];
  }

  public getWorkerById(id: string): Worker | undefined {
    return this.workers.find((w) => w.id === id);
  }

  // --- AGENCIES ---
  public getAgencies(): Agency[] {
    return [...this.agencies];
  }

  public getAgencyById(id: string): Agency | undefined {
    return this.agencies.find((a) => a.id === id);
  }

  // --- BILLING / INVOICE PER AGENCY ---
  public getAgencyInvoices(): AgencyInvoice[] {
    const invoices: AgencyInvoice[] = [];

    this.agencies.forEach((agency) => {
      const agencyTrips = this.trips
        .filter((t) => t.agencyId === agency.id)
        .map((t) => ({
          ...t,
          tripStatus: t.tripStatus === 'cancelled' ? 'cancelled' : calculateAutoTripStatus(t.date, t.timeSlot),
        }));

      if (agencyTrips.length === 0) return;

      // Hanya trip yang tidak dibatalkan yang dimasukkan ke nominal tagihan
      const billableTrips = agencyTrips.filter((t) => t.tripStatus !== 'cancelled');

      const totalAmount = billableTrips.reduce((acc, t) => acc + t.packagePrice, 0);
      const paidAmount = billableTrips
        .filter((t) => t.agencyPaymentStatus === 'paid')
        .reduce((acc, t) => acc + t.packagePrice, 0);
      const remainingAmount = totalAmount - paidAmount;

      let status: 'unpaid' | 'paid' | 'partial' = 'unpaid';
      if (billableTrips.length === 0) {
        status = 'paid';
      } else if (remainingAmount <= 0) {
        status = 'paid';
      } else if (paidAmount > 0) {
        status = 'partial';
      }

      invoices.push({
        invoiceNumber: `INV-${agency.code}-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}`,
        agencyId: agency.id,
        agencyName: agency.name,
        contactPerson: agency.contactPerson,
        phone: agency.phone,
        invoiceDate: '2026-09-17',
        dueDate: '2026-09-25',
        trips: agencyTrips,
        totalAmount,
        paidAmount,
        remainingAmount,
        status,
      });
    });

    return invoices;
  }

  public markAgencyTripsPaid(agencyId: string, paid: boolean = true): void {
    const status = paid ? 'paid' : 'unpaid';
    this.trips = this.trips.map((t) => {
      if (t.agencyId === agencyId) {
        return { ...t, agencyPaymentStatus: status };
      }
      return t;
    });
    this.persist();
  }

  // --- WORKER PAYROLL (DAYS WORKED & BAYARAN) ---
  public getWorkerPayroll(workerId: string): WorkerPayrollSummary | null {
    const worker = this.getWorkerById(workerId);
    if (!worker) return null;

    const workerTrips: { trip: Trip; fee: number; isPaid: boolean }[] = [];

    this.trips.forEach((t) => {
      const liveTrip = {
        ...t,
        tripStatus: t.tripStatus === 'cancelled' ? 'cancelled' : calculateAutoTripStatus(t.date, t.timeSlot),
      };

      // Trip yang dibatalkan tidak dihitung ke honor pekerja
      if (liveTrip.tripStatus === 'cancelled') return;

      if (t.jeepDriverId === workerId) {
        workerTrips.push({
          trip: liveTrip,
          fee: t.jeepFee,
          isPaid: t.jeepPayrollStatus === 'paid',
        });
      } else if (t.fieldDriverId === workerId) {
        workerTrips.push({
          trip: liveTrip,
          fee: t.fieldDriverFee,
          isPaid: t.fieldPayrollStatus === 'paid',
        });
      } else if (t.photographerId === workerId) {
        workerTrips.push({
          trip: liveTrip,
          fee: t.photographerFee,
          isPaid: t.photographerPayrollStatus === 'paid',
        });
      }
    });

    const uniqueDays = new Set(workerTrips.map((wt) => wt.trip.date));
    const totalDaysWorked = uniqueDays.size;
    const totalTripsCount = workerTrips.length;

    const totalEarnings = workerTrips.reduce((acc, wt) => acc + wt.fee, 0);
    const paidEarnings = workerTrips
      .filter((wt) => wt.isPaid)
      .reduce((acc, wt) => acc + wt.fee, 0);
    const pendingEarnings = totalEarnings - paidEarnings;

    return {
      worker,
      totalDaysWorked,
      totalTripsCount,
      totalEarnings,
      paidEarnings,
      pendingEarnings,
      trips: workerTrips.map((wt) => wt.trip),
    };
  }

  public getAllWorkersPayroll(): WorkerPayrollSummary[] {
    const summaries: WorkerPayrollSummary[] = [];
    const nonAdminWorkers = this.workers.filter((w) => w.role !== 'admin');

    nonAdminWorkers.forEach((w) => {
      const summary = this.getWorkerPayroll(w.id);
      if (summary) summaries.push(summary);
    });

    return summaries;
  }

  public markWorkerPayrollPaid(workerId: string, paid: boolean = true): void {
    const status = paid ? 'paid' : 'unpaid';
    this.trips = this.trips.map((t) => {
      const updated = { ...t };
      // Abaikan trip yang berstatus dibatalkan (upah sudah ditiadakan)
      if (t.tripStatus === 'cancelled') return updated;
      if (t.jeepDriverId === workerId) updated.jeepPayrollStatus = status;
      if (t.fieldDriverId === workerId) updated.fieldPayrollStatus = status;
      if (t.photographerId === workerId) updated.photographerPayrollStatus = status;
      return updated;
    });
    this.persist();
  }

  // --- PROFIT AND LOSS (LABA RUGI) DENGAN PERIODE FLEKSIBEL (START & END DATE) ---
  public getProfitAndLoss(startDate?: string, endDate?: string): ProfitAndLossSummary {
    let targetTrips = this.trips.map((t) => ({
      ...t,
      tripStatus: t.tripStatus === 'cancelled' ? 'cancelled' : calculateAutoTripStatus(t.date, t.timeSlot),
    }));

    if (startDate && endDate) {
      targetTrips = targetTrips.filter((t) => t.date >= startDate && t.date <= endDate);
    } else if (startDate && startDate !== 'all') {
      targetTrips = targetTrips.filter((t) => t.date === startDate);
    }

    // Pisahkan trip aktif vs yang dibatalkan
    const activeTrips = targetTrips.filter((t) => t.tripStatus !== 'cancelled');
    const cancelledCount = targetTrips.filter((t) => t.tripStatus === 'cancelled').length;

    const grossRevenue = activeTrips.reduce((acc, t) => acc + t.packagePrice, 0);

    let jeepInternal = 0;
    let jeepExternal = 0;
    activeTrips.forEach((t) => {
      if (t.jeepStatus === 'internal') {
        jeepInternal += t.jeepFee;
      } else {
        jeepExternal += t.jeepFee;
      }
    });

    let fieldInternal = 0;
    let fieldExternal = 0;
    activeTrips.forEach((t) => {
      if (t.fieldDriverStatus === 'internal') {
        fieldInternal += t.fieldDriverFee;
      } else {
        fieldExternal += t.fieldDriverFee;
      }
    });

    let photoInternal = 0;
    let photoExternal = 0;
    activeTrips.forEach((t) => {
      if (t.photographerStatus === 'internal') {
        photoInternal += t.photographerFee;
      } else {
        photoExternal += t.photographerFee;
      }
    });

    const operationalCosts = activeTrips.reduce((acc, t) => acc + t.operationalCost, 0);

    const totalJeep = jeepInternal + jeepExternal;
    const totalField = fieldInternal + fieldExternal;
    const totalPhoto = photoInternal + photoExternal;

    const totalExpenses = totalJeep + totalField + totalPhoto + operationalCosts;
    const netProfit = grossRevenue - totalExpenses;
    const profitMarginPercent = grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 100) : 0;

    return {
      totalTrips: activeTrips.length,
      cancelledTripsCount: cancelledCount,
      grossRevenue,
      jeepCosts: { internal: jeepInternal, external: jeepExternal, total: totalJeep },
      fieldDriverCosts: { internal: fieldInternal, external: fieldExternal, total: totalField },
      photographerCosts: { internal: photoInternal, external: photoExternal, total: totalPhoto },
      operationalCosts,
      totalExpenses,
      netProfit,
      profitMarginPercent,
    };
  }

  // --- DEMO RESET ---
  public resetDatabase(): void {
    this.trips = INITIAL_TRIPS.map((t) => ({
      ...t,
      itinerary: t.itinerary || [],
      tripStatus: calculateAutoTripStatus(t.date, t.timeSlot),
    }));
    this.workers = [...INITIAL_WORKERS];
    this.agencies = [...INITIAL_AGENCIES];
    this.templates = [...INITIAL_ITINERARY_TEMPLATES];
    this.persist();
  }
}

export const db = new PanoramaDatabase();
