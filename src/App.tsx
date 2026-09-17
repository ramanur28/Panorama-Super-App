import React, { useState, useEffect } from 'react';
import type { Worker } from './types';
import { auth } from './services/auth';
import { db } from './services/db';
import { RoleSwitcherBar } from './components/RoleSwitcherBar';
import { MobileHeader } from './components/MobileHeader';
import { DriverJeepView } from './views/DriverJeepView';
import { DriverLapanganView } from './views/DriverLapanganView';
import { PhotographerView } from './views/PhotographerView';
import { AdminDashboardView } from './views/AdminDashboardView';
import './styles/index.css';
import './styles/components.css';

export const App: React.FC = () => {
  const [activeUser, setActiveUser] = useState<Worker>(auth.getActiveUser());
  const [workers, setWorkers] = useState<Worker[]>(db.getWorkers());
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubAuth = auth.subscribe((user) => setActiveUser(user));
    const unsubDb = db.subscribe(() => {
      setWorkers(db.getWorkers());
      setActiveUser(auth.getActiveUser());
      setTick((t) => t + 1);
    });

    return () => {
      unsubAuth();
      unsubDb();
    };
  }, []);

  const handleSelectUser = (workerId: string) => {
    const newUser = auth.setActiveUser(workerId);
    if (newUser) {
      setActiveUser(newUser);
    }
  };

  const handleReset = () => {
    setWorkers(db.getWorkers());
    setActiveUser(auth.getActiveUser());
    setTick((t) => t + 1);
  };

  const isAdmin = activeUser.role === 'admin';

  return (
    <div className="app-viewport-wrapper">
      {/* 1. Interactive Role Switcher Banner for Instant Multi-Role Testing */}
      <RoleSwitcherBar
        activeUser={activeUser}
        onSelectUser={handleSelectUser}
        workers={workers}
      />

      {/* 2. Main Mobile App Shell */}
      <div className={`app-container ${isAdmin ? 'admin-expanded' : ''}`}>
        <MobileHeader onReset={handleReset} />

        <main className="main-content">
          {/* Dynamic Role-Based View */}
          {activeUser.role === 'driver_jeep' && (
            <DriverJeepView currentUser={activeUser} />
          )}

          {activeUser.role === 'driver_lapangan' && (
            <DriverLapanganView currentUser={activeUser} />
          )}

          {activeUser.role === 'photographer' && (
            <PhotographerView currentUser={activeUser} />
          )}

          {activeUser.role === 'admin' && (
            <AdminDashboardView currentUser={activeUser} />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
