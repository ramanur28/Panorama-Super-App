// Auth and Role Authority Gateway for Panorama Super App
import type { UserRole, Worker } from '../types';
import { db } from './db';

const ACTIVE_USER_STORAGE_KEY = 'panorama_active_user_v1';

class AuthService {
  private activeUser: Worker;
  private listeners: ((user: Worker) => void)[] = [];

  constructor() {
    // Default to Driver Jeep for mobile prototype or Admin
    const workers = db.getWorkers();
    const storedUserId = typeof window !== 'undefined' ? localStorage.getItem(ACTIVE_USER_STORAGE_KEY) : null;
    const foundUser = storedUserId ? workers.find((w) => w.id === storedUserId) : null;

    this.activeUser = foundUser || workers.find((w) => w.role === 'admin') || workers[0];
  }

  public getActiveUser(): Worker {
    return this.activeUser;
  }

  public setActiveUser(workerId: string): Worker | null {
    const worker = db.getWorkerById(workerId);
    if (!worker) return null;

    this.activeUser = worker;
    try {
      localStorage.setItem(ACTIVE_USER_STORAGE_KEY, workerId);
    } catch (e) {
      console.error(e);
    }
    this.notify();
    return this.activeUser;
  }

  public subscribe(callback: (user: Worker) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.activeUser));
  }

  // --- AUTHORITY ACCESS RULES ---
  public canViewFinancials(role: UserRole = this.activeUser.role): boolean {
    return role === 'admin';
  }

  public canManageTrips(role: UserRole = this.activeUser.role): boolean {
    return role === 'admin';
  }

  public canViewAgencyInvoices(role: UserRole = this.activeUser.role): boolean {
    return role === 'admin';
  }

  public canViewAllPayroll(role: UserRole = this.activeUser.role): boolean {
    return role === 'admin';
  }
}

export const auth = new AuthService();
