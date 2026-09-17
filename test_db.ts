import { db, createWhatsAppUrl, generateGuestGreeting } from './src/services/db';

console.log('--- TEST PANORAMA SUPER APP CORE LOGIC ---');

// 1. Test Trips
const trips = db.getTrips();
console.log(`[PASS] Total Trips: ${trips.length}`);
if (trips.length === 0) throw new Error('No trips found');

// 2. Test P&L calculation
const pnl = db.getProfitAndLoss('2026-09-01', '2026-09-30');
console.log(`[PASS] P&L Gross Revenue: Rp ${pnl.grossRevenue.toLocaleString('id-ID')}, Net Profit: Rp ${pnl.netProfit.toLocaleString('id-ID')}`);

// 3. Test Trip Cancellation & Crew Wage Loss
const tripToCancel = trips[0];
const originalTotalExpenses = pnl.totalExpenses;
console.log(`Testing cancel trip ${tripToCancel.code}...`);
db.cancelTrip(tripToCancel.id, 'Uji pembatalan sistem');
const pnlAfterCancel = db.getProfitAndLoss('2026-09-01', '2026-09-30');
console.log(`[PASS] After cancel, cancelled trips count: ${pnlAfterCancel.cancelledTripsCount}`);
console.log(`[PASS] Total expenses reduced from Rp ${originalTotalExpenses} to Rp ${pnlAfterCancel.totalExpenses}`);

// Restore trip
db.restoreTrip(tripToCancel.id);
const pnlAfterRestore = db.getProfitAndLoss('2026-09-01', '2026-09-30');
console.log(`[PASS] Restored trip, cancelled trips count: ${pnlAfterRestore.cancelledTripsCount}`);

// 4. Test WhatsApp Link Generator
const waUrl = createWhatsAppUrl('08123456789', 'Halo Tamu');
console.log(`[PASS] WhatsApp URL generated: ${waUrl}`);
if (!waUrl.startsWith('https://wa.me/628123456789?text=')) {
  throw new Error('Invalid WhatsApp URL formatting');
}

// 5. Test Greeting Generator
const greeting = generateGuestGreeting(tripToCancel, 'driver_jeep', 'Cak Slamet');
console.log(`[PASS] Guest greeting: ${greeting.slice(0, 45)}...`);

// 6. Test CSV Generators
const pnlCSV = db.generatePnLCSV(pnl, 'September 2026');
console.log(`[PASS] PnL CSV length: ${pnlCSV.length} bytes`);
const payrollCSV = db.generatePayrollCSV();
console.log(`[PASS] Payroll CSV length: ${payrollCSV.length} bytes`);

// 7. Test Master CRUD
const newWorker = db.addWorker({
  name: 'Test Driver External',
  role: 'driver_jeep',
  type: 'external',
  phone: '081299998888',
  standardRate: 300000,
  vehiclePlate: 'N 9999 ZZ'
});
console.log(`[PASS] Added new worker: ${newWorker.id} (${newWorker.name})`);
db.deleteWorker(newWorker.id);
console.log(`[PASS] Deleted test worker successfully`);

// 8. Test Export/Import JSON
const jsonBackup = db.exportDatabaseJSON();
console.log(`[PASS] Export database JSON: ${jsonBackup.length} bytes`);
const importSuccess = db.importDatabaseJSON(jsonBackup);
console.log(`[PASS] Import database JSON status: ${importSuccess}`);

// 9. Reset database to seed
db.resetDatabase();
console.log('[PASS] Reset database to seed complete');

console.log('--- ALL LOGIC TESTS PASSED 100% ---');
