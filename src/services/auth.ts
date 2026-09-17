// Auth and Role Authority Gateway for Panorama Super App
import type { UserRole, Worker } from '../types';
import { db } from './db';

const ACTIVE_USER_STORAGE_KEY = 'panorama_auth_session_v2';

class AuthService {
  private activeUser: Worker | null = null;
  private listeners: ((user: Worker | null) => void)[] = [];

  constructor() {
    this.restoreSession();
  }

  private restoreSession() {
    if (typeof window === 'undefined') return;
    try {
      const storedUserId = localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
      if (storedUserId) {
        const workers = db.getWorkers();
        const foundUser = workers.find((w) => w.id === storedUserId);
        if (foundUser) {
          this.activeUser = foundUser;
        }
      }
    } catch (e) {
      console.error('Failed to restore auth session:', e);
    }
  }

  public isAuthenticated(): boolean {
    return this.activeUser !== null;
  }

  public getActiveUser(): Worker | null {
    return this.activeUser;
  }

  public login(identifier: string, pin: string = '123456'): { success: boolean; user?: Worker; message?: string } {
    const trimmedId = identifier.trim().toLowerCase();
    const cleanPhone = identifier.replace(/[^0-9]/g, '');
    const workers = db.getWorkers();

    const matchedWorker = workers.find((w) => {
      const matchUsername = Boolean(w.username && w.username.toLowerCase() === trimmedId);
      const matchEmail = Boolean(w.email && w.email.toLowerCase() === trimmedId);
      const matchPhone = Boolean(cleanPhone.length >= 4 && w.phone.replace(/[^0-9]/g, '').includes(cleanPhone));
      const matchName = Boolean(w.name.toLowerCase() === trimmedId || w.name.toLowerCase().includes(trimmedId));
      return matchUsername || matchEmail || matchPhone || matchName;
    });

    if (!matchedWorker) {
      return { success: false, message: 'Nomor HP, username, atau email tidak terdaftar.' };
    }

    // Check PIN
    const expectedPin = matchedWorker.pin || '123456';
    if (pin && pin !== expectedPin) {
      return { success: false, message: 'PIN keamanan yang Anda masukkan salah.' };
    }

    this.activeUser = matchedWorker;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ACTIVE_USER_STORAGE_KEY, matchedWorker.id);
      } catch (e) {
        console.error(e);
      }
    }

    this.notify();
    return { success: true, user: matchedWorker };
  }

  public loginAsDemo(workerId: string): Worker | null {
    const worker = db.getWorkerById(workerId);
    if (!worker) return null;

    this.activeUser = worker;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ACTIVE_USER_STORAGE_KEY, worker.id);
      } catch (e) {
        console.error(e);
      }
    }
    this.notify();
    return this.activeUser;
  }

  public logout(): void {
    this.activeUser = null;
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
      } catch (e) {
        console.error(e);
      }
    }
    this.notify();
  }

  public setActiveUser(workerId: string): Worker | null {
    return this.loginAsDemo(workerId);
  }

  public subscribe(callback: (user: Worker | null) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.activeUser));
  }

  // --- ROLE-BASED ACCESS CONTROL (RBAC) RULES ---
  public canViewFinancials(role?: UserRole): boolean {
    const userRole = role || this.activeUser?.role;
    return userRole === 'admin';
  }

  public canManageTrips(role?: UserRole): boolean {
    const userRole = role || this.activeUser?.role;
    return userRole === 'admin';
  }

  public canViewAgencyInvoices(role?: UserRole): boolean {
    const userRole = role || this.activeUser?.role;
    return userRole === 'admin';
  }

  public canViewAllPayroll(role?: UserRole): boolean {
    const userRole = role || this.activeUser?.role;
    return userRole === 'admin';
  }

  public canManageMasterData(role?: UserRole): boolean {
    const userRole = role || this.activeUser?.role;
    return userRole === 'admin';
  }

  public canViewItinerary(role?: UserRole): boolean {
    const userRole = role || this.activeUser?.role;
    // Driver Jeep tidak perlu mengetahui detail itinerary & biaya umum
    return userRole !== 'driver_jeep';
  }

  public canUploadPhotos(role?: UserRole): boolean {
    const userRole = role || this.activeUser?.role;
    return userRole === 'photographer' || userRole === 'admin';
  }

  // Operational costs within itinerary & stops are STRICTLY ADMIN ONLY
  public canViewOperationalCosts(role?: UserRole): boolean {
    const userRole = role || this.activeUser?.role;
    return userRole === 'admin';
  }

  // Field crew can ONLY see their own fee; other crew members' fees are hidden
  public canViewTeamFee(targetRole: UserRole, currentRole?: UserRole): boolean {
    const role = currentRole || this.activeUser?.role;
    if (role === 'admin') return true;
    return role === targetRole;
  }
}


export const auth = new AuthService();
