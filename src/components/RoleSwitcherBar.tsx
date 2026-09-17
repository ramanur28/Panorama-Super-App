import React from 'react';
import type { UserRole, Worker } from '../types';
import { Compass, ShieldCheck, Truck, Car, Camera } from 'lucide-react';

interface Props {
  activeUser: Worker;
  onSelectUser: (workerId: string) => void;
  workers: Worker[];
}

export const RoleSwitcherBar: React.FC<Props> = ({ activeUser, onSelectUser, workers }) => {
  const rolesList: { role: UserRole; title: string; icon: React.ReactNode; defaultWorkerId: string; className: string }[] = [
    {
      role: 'driver_jeep',
      title: 'Driver Jeep',
      icon: <Truck size={14} />,
      defaultWorkerId: workers.find((w) => w.role === 'driver_jeep')?.id || 'w-jeep-1',
      className: 'role-jeep',
    },
    {
      role: 'driver_lapangan',
      title: 'Driver Lapangan',
      icon: <Car size={14} />,
      defaultWorkerId: workers.find((w) => w.role === 'driver_lapangan')?.id || 'w-field-1',
      className: 'role-field',
    },
    {
      role: 'photographer',
      title: 'Fotografer',
      icon: <Camera size={14} />,
      defaultWorkerId: workers.find((w) => w.role === 'photographer')?.id || 'w-photo-1',
      className: 'role-photo',
    },
    {
      role: 'admin',
      title: 'Admin (Laba Rugi)',
      icon: <ShieldCheck size={14} />,
      defaultWorkerId: workers.find((w) => w.role === 'admin')?.id || 'w-admin-1',
      className: 'role-admin',
    },
  ];

  return (
    <div className="role-switcher-banner">
      <div className="role-switcher-inner">
        <div className="role-switcher-label">
          <Compass size={14} />
          <span>Simulasi Role Akses:</span>
        </div>
        <div className="role-pill-group">
          {rolesList.map((item) => {
            const isActive = activeUser.role === item.role;
            return (
              <button
                key={item.role}
                type="button"
                className={`role-pill ${item.className} ${isActive ? 'active' : ''}`}
                onClick={() => onSelectUser(item.defaultWorkerId)}
                title={`Pindah ke tampilan ${item.title}`}
              >
                {item.icon}
                <span>{item.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
