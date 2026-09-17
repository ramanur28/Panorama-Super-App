// Centralized REST API Client for Panorama Super App
import type { Agency, ItineraryTemplate, Trip, Worker } from '../types';
import { db } from './db';

const BASE_URL = '/api';

class ApiClient {
  public async checkHealth(): Promise<{ online: boolean; message?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        return { online: true, message: data.database };
      }
      return { online: false };
    } catch {
      return { online: false };
    }
  }

  public async login(identifier: string, pin: string = '123456'): Promise<{ success: boolean; user?: Worker; token?: string; message?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, pin }),
        signal: AbortSignal.timeout(3000),
      });
      const data = await res.json();
      return data;
    } catch {
      // Offline fallback: match locally via db
      const workers = db.getWorkers();
      const cleanId = identifier.trim().toLowerCase();
      const cleanPhone = identifier.replace(/[^0-9]/g, '');
      const user = workers.find((w) => {
        const matchUsername = w.username && w.username.toLowerCase() === cleanId;
        const matchEmail = w.email && w.email.toLowerCase() === cleanId;
        const matchPhone = cleanPhone.length >= 4 && w.phone.replace(/[^0-9]/g, '').includes(cleanPhone);
        const matchName = w.name.toLowerCase() === cleanId || w.name.toLowerCase().includes(cleanId);
        return matchUsername || matchEmail || matchPhone || matchName;
      });

      if (user) {
        return { success: true, user, token: `offline_${user.id}` };
      }
      return { success: false, message: 'Kredensial tidak ditemukan' };
    }
  }

  public async getTrips(role?: string, workerId?: string): Promise<Trip[]> {
    try {
      const params = new URLSearchParams();
      if (role) params.set('role', role);
      if (workerId) params.set('workerId', workerId);

      const res = await fetch(`${BASE_URL}/trips?${params.toString()}`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }
    return db.getTrips(workerId ? { workerId } : undefined);
  }

  public async getWorkers(): Promise<Worker[]> {
    try {
      const res = await fetch(`${BASE_URL}/workers`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }
    return db.getWorkers();
  }

  public async getAgencies(): Promise<Agency[]> {
    try {
      const res = await fetch(`${BASE_URL}/agencies`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }
    return db.getAgencies();
  }

  public async getTemplates(): Promise<ItineraryTemplate[]> {
    try {
      const res = await fetch(`${BASE_URL}/templates`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // Offline fallback
    }
    return db.getItineraryTemplates();
  }

  public async addWorker(workerData: Omit<Worker, 'id'>): Promise<{ success: boolean; worker?: Worker; message?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/workers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workerData),
        signal: AbortSignal.timeout(3000),
      });
      const data = await res.json();
      if (res.ok && data.success && data.worker) {
        db.addWorker(data.worker);
        return data;
      }
      if (!res.ok) {
        return { success: false, message: data.message || 'Gagal menambahkan kru ke server MySQL' };
      }
    } catch {
      // Offline fallback
    }
    const localWorker = db.addWorker(workerData);
    return { success: true, worker: localWorker };
  }

  public async updateWorker(id: string, updates: Partial<Worker>): Promise<{ success: boolean; worker?: Worker; message?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/workers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        signal: AbortSignal.timeout(3000),
      });
      const data = await res.json();
      if (res.ok && data.success && data.worker) {
        db.updateWorker(id, data.worker);
        return data;
      }
      if (!res.ok) {
        return { success: false, message: data.message || 'Gagal memperbarui data kru di server MySQL' };
      }
    } catch {
      // Offline fallback
    }
    const updated = db.updateWorker(id, updates);
    return { success: true, worker: updated };
  }

  public async deleteWorker(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/workers/${id}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(3000),
      });
      const data = await res.json();
      if (res.ok) {
        db.deleteWorker(id);
        return { success: true };
      }
      return { success: false, message: data.message || 'Gagal menghapus kru di server MySQL' };
    } catch {
      // Offline fallback
    }
    db.deleteWorker(id);
    return { success: true };
  }

  public async addAgency(agencyData: Omit<Agency, 'id'>): Promise<{ success: boolean; agency?: Agency; message?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/agencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agencyData),
        signal: AbortSignal.timeout(3000),
      });
      const data = await res.json();
      if (res.ok && data.success && data.agency) {
        db.addAgency(data.agency);
        return data;
      }
      if (!res.ok) {
        return { success: false, message: data.message || 'Gagal menambahkan mitra agen ke MySQL' };
      }
    } catch {
      // Offline fallback
    }
    const local = db.addAgency(agencyData);
    return { success: true, agency: local };
  }

  public async updateAgency(id: string, updates: Partial<Agency>): Promise<{ success: boolean; agency?: Agency; message?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/agencies/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        signal: AbortSignal.timeout(3000),
      });
      const data = await res.json();
      if (res.ok && data.success && data.agency) {
        db.updateAgency(id, data.agency);
        return data;
      }
      if (!res.ok) {
        return { success: false, message: data.message || 'Gagal memperbarui mitra agen di MySQL' };
      }
    } catch {
      // Offline fallback
    }
    const updated = db.updateAgency(id, updates);
    return { success: true, agency: updated };
  }

  public async deleteAgency(id: string): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`${BASE_URL}/agencies/${id}`, {
        method: 'DELETE',
        signal: AbortSignal.timeout(3000),
      });
      const data = await res.json();
      if (res.ok) {
        db.deleteAgency(id);
        return { success: true };
      }
      return { success: false, message: data.message || 'Gagal menghapus mitra agen dari MySQL' };
    } catch {
      // Offline fallback
    }
    db.deleteAgency(id);
    return { success: true };
  }
}

export const api = new ApiClient();
