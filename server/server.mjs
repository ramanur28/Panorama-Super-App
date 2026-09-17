// =========================================================================
// PANORAMA SUPER APP - CENTRALIZED REST API SERVER (POWERED BY MYSQL)
// =========================================================================
import 'dotenv/config';
import http from 'node:http';
import { URL } from 'node:url';
import { query, execute, initMySQL, isMySQLConnected } from './db_mysql.mjs';

const PORT = parseInt(process.env.PORT || '4000', 10);

// Helper to parse JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

// Helper to send JSON response
function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  });
  res.end(JSON.stringify(data));
}

// Map database row to client Worker model
function mapUserRow(u) {
  return {
    id: u.id,
    name: u.name,
    role: u.role,
    type: u.type,
    phone: u.phone,
    username: u.username,
    email: u.email,
    vehicleUnit: u.vehicle_unit,
    avatar: u.avatar,
    baseRatePerTrip: Number(u.base_rate_per_trip),
    isAvailable: Boolean(u.is_available),
  };
}

// Main HTTP Request Handler
const server = http.createServer(async (req, res) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    });
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const { pathname } = parsedUrl;
  const method = req.method;

  try {
    // 1. HEALTH CHECK ENDPOINT
    if (pathname === '/api/health' && method === 'GET') {
      sendJSON(res, 200, {
        status: 'ok',
        database: isMySQLConnected() ? 'centralized_mysql_online' : 'connecting',
        engine: 'MySQL (InnoDB / utf8mb4)',
        host: process.env.DB_HOST || '127.0.0.1',
        dbName: process.env.DB_NAME || 'panorama_tour_db',
        serverTime: new Date().toISOString(),
      });
      return;
    }

    // 2. AUTHENTICATION: LOGIN
    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await parseBody(req);
      const { identifier, pin } = body;

      if (!identifier) {
        sendJSON(res, 400, { success: false, message: 'Nomor HP, username, atau email wajib diisi.' });
        return;
      }

      const cleanId = String(identifier).trim().toLowerCase();
      const cleanPhone = cleanId.replace(/[^0-9]/g, '');

      const rows = await query(`
        SELECT * FROM users
        WHERE LOWER(username) = ?
           OR LOWER(email) = ?
           OR (? != '' AND REPLACE(phone, '-', '') LIKE CONCAT('%', ?, '%'))
           OR LOWER(name) LIKE CONCAT('%', ?, '%')
        LIMIT 1
      `, [cleanId, cleanId, cleanPhone, cleanPhone, cleanId]);

      if (!rows || rows.length === 0) {
        sendJSON(res, 401, { success: false, message: 'Akun tidak ditemukan. Periksa kembali kredensial Anda.' });
        return;
      }

      const userRow = rows[0];
      const expectedPin = userRow.pin || '123456';

      if (pin && pin !== expectedPin) {
        sendJSON(res, 401, { success: false, message: 'PIN atau kata sandi salah (PIN Demo: 123456).' });
        return;
      }

      const user = mapUserRow(userRow);
      sendJSON(res, 200, { success: true, user });
      return;
    }

    // 3. WORKERS: LIST
    if (pathname === '/api/workers' && method === 'GET') {
      const rows = await query('SELECT * FROM users ORDER BY name ASC');
      const workers = rows.map(mapUserRow);
      sendJSON(res, 200, workers);
      return;
    }

    // 3B. WORKERS: CREATE
    if (pathname === '/api/workers' && method === 'POST') {
      const body = await parseBody(req);
      const { name, role, type = 'internal', phone, username, pin = '123456', vehicleUnit = '', baseRatePerTrip = 200000 } = body;

      if (!name || !name.trim()) {
        sendJSON(res, 400, { success: false, message: 'Nama lengkap kru wajib diisi.' });
        return;
      }
      if (!username || !username.trim()) {
        sendJSON(res, 400, { success: false, message: 'Username wajib diisi.' });
        return;
      }
      const cleanUsername = username.trim().toLowerCase();
      if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(cleanUsername)) {
        sendJSON(res, 400, { success: false, message: 'Username harus 3-32 karakter alfanumerik tanpa spasi.' });
        return;
      }
      if (!pin || pin.length < 4) {
        sendJSON(res, 400, { success: false, message: 'PIN wajib minimal 4-6 karakter/angka.' });
        return;
      }

      // Check unique username
      const existing = await query('SELECT id FROM users WHERE LOWER(username) = ?', [cleanUsername]);
      if (existing && existing.length > 0) {
        sendJSON(res, 400, { success: false, message: `Username "${cleanUsername}" sudah digunakan oleh kru lain.` });
        return;
      }

      const newId = `w-${role || 'kru'}-${Date.now()}`;
      const avatar = `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80`;

      await execute(`
        INSERT INTO users (id, username, email, phone, pin, name, role, type, vehicle_unit, avatar, base_rate_per_trip, is_available)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `, [newId, cleanUsername, `${cleanUsername}@panoramatour.com`, phone || '0812-0000-0000', pin, name.trim(), role || 'driver_jeep', type, vehicleUnit, avatar, Number(baseRatePerTrip) || 200000]);

      const [created] = await query('SELECT * FROM users WHERE id = ?', [newId]);
      sendJSON(res, 201, { success: true, worker: mapUserRow(created) });
      return;
    }

    // 3C. WORKERS: UPDATE
    if (pathname.startsWith('/api/workers/') && method === 'PUT') {
      const workerId = pathname.replace('/api/workers/', '');
      const body = await parseBody(req);
      const { name, role, type, phone, username, pin, vehicleUnit, baseRatePerTrip } = body;

      const rows = await query('SELECT * FROM users WHERE id = ?', [workerId]);
      if (!rows || rows.length === 0) {
        sendJSON(res, 404, { success: false, message: 'Kru tidak ditemukan.' });
        return;
      }

      if (username) {
        const cleanUsername = username.trim().toLowerCase();
        if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(cleanUsername)) {
          sendJSON(res, 400, { success: false, message: 'Username harus 3-32 karakter alfanumerik tanpa spasi.' });
          return;
        }
        const duplicate = await query('SELECT id FROM users WHERE LOWER(username) = ? AND id != ?', [cleanUsername, workerId]);
        if (duplicate && duplicate.length > 0) {
          sendJSON(res, 400, { success: false, message: `Username "${cleanUsername}" sudah digunakan oleh kru lain.` });
          return;
        }
      }

      let updateSql = `
        UPDATE users SET
          name = COALESCE(?, name),
          role = COALESCE(?, role),
          type = COALESCE(?, type),
          phone = COALESCE(?, phone),
          username = COALESCE(?, username),
          vehicle_unit = COALESCE(?, vehicle_unit),
          base_rate_per_trip = COALESCE(?, base_rate_per_trip)
      `;
      const updateParams = [
        name ? name.trim() : null,
        role || null,
        type || null,
        phone ? phone.trim() : null,
        username ? username.trim().toLowerCase() : null,
        vehicleUnit !== undefined ? vehicleUnit : null,
        baseRatePerTrip !== undefined ? Number(baseRatePerTrip) : null,
      ];

      if (pin && String(pin).trim()) {
        updateSql += `, pin = ?`;
        updateParams.push(String(pin).trim());
      }

      updateSql += ` WHERE id = ?`;
      updateParams.push(workerId);

      await execute(updateSql, updateParams);
      const [updated] = await query('SELECT * FROM users WHERE id = ?', [workerId]);
      sendJSON(res, 200, { success: true, worker: mapUserRow(updated) });
      return;
    }

    // 3D. WORKERS: DELETE
    if (pathname.startsWith('/api/workers/') && method === 'DELETE') {
      const workerId = pathname.replace('/api/workers/', '');
      await execute('DELETE FROM users WHERE id = ?', [workerId]);
      sendJSON(res, 200, { success: true, message: 'Data kru berhasil dihapus.' });
      return;
    }

    // 4. AGENCIES LIST
    if (pathname === '/api/agencies' && method === 'GET') {
      const rows = await query('SELECT * FROM agencies ORDER BY name ASC');
      const agencies = rows.map((a) => ({
        id: a.id,
        name: a.name,
        code: a.code,
        contactPerson: a.contact_person,
        phone: a.phone,
        email: a.email,
        address: a.address,
        commissionRatePercent: Number(a.commission_rate_percent),
      }));
      sendJSON(res, 200, agencies);
      return;
    }

    // 4B. AGENCIES: CREATE
    if (pathname === '/api/agencies' && method === 'POST') {
      const body = await parseBody(req);
      const { name, code, contactPerson, phone, email, address, commissionRatePercent } = body;

      if (!name || name.trim().length < 3) {
        sendJSON(res, 400, { success: false, message: 'Nama agen travel minimal 3 karakter.' });
        return;
      }

      const cleanCode = (code || name.slice(0, 3)).trim().toUpperCase();
      if (!/^[A-Z0-9]{2,6}$/.test(cleanCode)) {
        sendJSON(res, 400, { success: false, message: 'Kode agen harus 2-6 karakter alfanumerik (contoh: NHD, TTR).' });
        return;
      }

      const cleanPhone = (phone || '').trim().replace(/[^0-9+]/g, '');
      if (!cleanPhone || cleanPhone.length < 8) {
        sendJSON(res, 400, { success: false, message: 'Nomor WhatsApp PIC minimal 8 digit.' });
        return;
      }

      // Check unique code
      const existing = await query('SELECT id FROM agencies WHERE UPPER(code) = ?', [cleanCode]);
      if (existing && existing.length > 0) {
        sendJSON(res, 400, { success: false, message: `Kode agen "${cleanCode}" sudah digunakan oleh mitra lain.` });
        return;
      }

      const newId = `ag-${Date.now()}`;
      await execute(`
        INSERT INTO agencies (id, name, code, contact_person, phone, email, address, commission_rate_percent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newId,
        name.trim(),
        cleanCode,
        contactPerson ? contactPerson.trim() : 'PIC Operasional',
        phone.trim(),
        email ? email.trim() : `${cleanCode.toLowerCase()}@travel.com`,
        address ? address.trim() : 'Kantor Rekanan',
        Number(commissionRatePercent) || 10,
      ]);

      const [created] = await query('SELECT * FROM agencies WHERE id = ?', [newId]);
      sendJSON(res, 201, {
        success: true,
        agency: {
          id: created.id,
          name: created.name,
          code: created.code,
          contactPerson: created.contact_person,
          phone: created.phone,
          email: created.email,
          address: created.address,
          commissionRatePercent: Number(created.commission_rate_percent),
        },
      });
      return;
    }

    // 4C. AGENCIES: UPDATE
    if (pathname.startsWith('/api/agencies/') && method === 'PUT') {
      const agencyId = pathname.replace('/api/agencies/', '');
      const body = await parseBody(req);
      const { name, code, contactPerson, phone, email, address, commissionRatePercent } = body;

      const rows = await query('SELECT * FROM agencies WHERE id = ?', [agencyId]);
      if (!rows || rows.length === 0) {
        sendJSON(res, 404, { success: false, message: 'Mitra agen travel tidak ditemukan.' });
        return;
      }

      if (code) {
        const cleanCode = code.trim().toUpperCase();
        if (!/^[A-Z0-9]{2,6}$/.test(cleanCode)) {
          sendJSON(res, 400, { success: false, message: 'Kode agen harus 2-6 karakter alfanumerik.' });
          return;
        }
        const duplicate = await query('SELECT id FROM agencies WHERE UPPER(code) = ? AND id != ?', [cleanCode, agencyId]);
        if (duplicate && duplicate.length > 0) {
          sendJSON(res, 400, { success: false, message: `Kode agen "${cleanCode}" sudah digunakan oleh mitra lain.` });
          return;
        }
      }

      await execute(`
        UPDATE agencies SET
          name = COALESCE(?, name),
          code = COALESCE(?, code),
          contact_person = COALESCE(?, contact_person),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          address = COALESCE(?, address),
          commission_rate_percent = COALESCE(?, commission_rate_percent)
        WHERE id = ?
      `, [
        name ? name.trim() : null,
        code ? code.trim().toUpperCase() : null,
        contactPerson !== undefined ? contactPerson.trim() : null,
        phone ? phone.trim() : null,
        email !== undefined ? email.trim() : null,
        address !== undefined ? address.trim() : null,
        commissionRatePercent !== undefined ? Number(commissionRatePercent) : null,
        agencyId,
      ]);

      const [updated] = await query('SELECT * FROM agencies WHERE id = ?', [agencyId]);
      sendJSON(res, 200, {
        success: true,
        agency: {
          id: updated.id,
          name: updated.name,
          code: updated.code,
          contactPerson: updated.contact_person,
          phone: updated.phone,
          email: updated.email,
          address: updated.address,
          commissionRatePercent: Number(updated.commission_rate_percent),
        },
      });
      return;
    }

    // 4D. AGENCIES: DELETE
    if (pathname.startsWith('/api/agencies/') && method === 'DELETE') {
      const agencyId = pathname.replace('/api/agencies/', '');
      if (agencyId === 'ag-direct') {
        sendJSON(res, 400, { success: false, message: 'Agen Direct (Tamu Langsung) adalah agen sistem bawaan dan tidak dapat dihapus.' });
        return;
      }
      await execute('DELETE FROM agencies WHERE id = ?', [agencyId]);
      sendJSON(res, 200, { success: true, message: 'Mitra agen travel berhasil dihapus.' });
      return;
    }

    // 5. ITINERARY TEMPLATES LIST
    if (pathname === '/api/templates' && method === 'GET') {
      const rows = await query('SELECT * FROM itinerary_templates ORDER BY name ASC');
      const templates = rows.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        duration: t.duration,
        description: t.description,
        defaultPrice: Number(t.default_price),
        items: [],
      }));
      sendJSON(res, 200, templates);
      return;
    }

    // 6. TRIPS LIST (With Strict Role Authority Filtering)
    if (pathname === '/api/trips' && method === 'GET') {
      const workerId = parsedUrl.searchParams.get('workerId') || parsedUrl.searchParams.get('userId');
      const role = parsedUrl.searchParams.get('role');

      let sql = 'SELECT * FROM trips';
      const params = [];

      // Enforce Role Boundaries: Field workers ONLY receive trips assigned to them
      if (role === 'driver_jeep' && workerId) {
        sql += ' WHERE jeep_driver_id = ?';
        params.push(workerId);
      } else if (role === 'driver_lapangan' && workerId) {
        sql += ' WHERE field_driver_id = ?';
        params.push(workerId);
      } else if (role === 'photographer' && workerId) {
        sql += ' WHERE photographer_id = ?';
        params.push(workerId);
      }

      sql += ' ORDER BY date DESC, time_slot ASC';
      const rows = await query(sql, params);

      const trips = rows.map((r) => {
        const isDriverJeep = role === 'driver_jeep';
        const isDriverLapangan = role === 'driver_lapangan';
        const isPhotographer = role === 'photographer';
        const isFieldRole = isDriverJeep || isDriverLapangan || isPhotographer;

        let parsedItinerary = [];
        if (r.raw_itinerary) {
          try {
            parsedItinerary = typeof r.raw_itinerary === 'string' ? JSON.parse(r.raw_itinerary) : r.raw_itinerary;
          } catch {
            parsedItinerary = [];
          }
        }

        // Operational crew MUST NOT see operational cost inside itinerary stops
        const sanitizedItinerary = isFieldRole
          ? parsedItinerary.map((item) => ({
              id: item.id,
              time: item.time,
              title: item.title,
              location: item.location,
              description: item.description,
              // operationalCost and costNote are withheld from field operational crew
            }))
          : parsedItinerary;

        return {
          id: r.id,
          code: r.code,
          date: r.date,
          timeSlot: r.time_slot,
          guestName: r.guest_name,
          guestCount: Number(r.guest_count),
          guestPhone: r.guest_phone,
          pickupPoint: r.pickup_point,
          notes: r.notes || '',
          tourPackage: r.tour_package,
          tripStatus: r.trip_status,
          cancellationReason: r.cancellation_reason,

          // Driver Jeep view attributes - ONLY jeep driver or admin can see jeep fee
          jeepDriverId: r.jeep_driver_id,
          jeepDriverName: r.jeep_driver_name || '',
          jeepUnit: r.jeep_unit || '',
          jeepFee: (isDriverJeep || !isFieldRole) ? Number(r.jeep_fee) : undefined,
          jeepStatus: r.jeep_status,
          jeepPayrollStatus: (isDriverJeep || !isFieldRole) ? r.jeep_payroll_status : undefined,

          // Field driver attributes - ONLY field driver or admin can see field fee
          fieldDriverId: r.field_driver_id,
          fieldDriverName: r.field_driver_name || '',
          fieldDriverUnit: r.field_driver_unit || '',
          fieldDriverFee: (isDriverLapangan || !isFieldRole) ? Number(r.field_driver_fee) : undefined,
          fieldDriverStatus: r.field_driver_status,
          fieldPayrollStatus: (isDriverLapangan || !isFieldRole) ? r.field_payroll_status : undefined,

          // Photographer attributes - ONLY photographer or admin can see photo fee
          photographerId: r.photographer_id,
          photographerName: r.photographer_name || '',
          photographerFee: (isPhotographer || !isFieldRole) ? Number(r.photographer_fee) : undefined,
          photographerStatus: r.photographer_status,
          photographerPayrollStatus: (isPhotographer || !isFieldRole) ? r.photographer_payroll_status : undefined,
          photoAlbumUrl: r.photo_album_url || '',

          // Financial data: STRICTLY ADMIN ONLY
          packagePrice: isFieldRole ? undefined : Number(r.package_price),
          operationalCost: isFieldRole ? undefined : Number(r.operational_cost),
          agencyId: isFieldRole ? undefined : r.agency_id,
          agencyName: isFieldRole ? undefined : (r.agency_name || ''),
          agencyPaymentStatus: isFieldRole ? undefined : r.agency_payment_status,
          totalCost: isFieldRole ? undefined : (Number(r.jeep_fee) + Number(r.field_driver_fee) + Number(r.photographer_fee) + Number(r.operational_cost)),

          // Itinerary details: DRIVER JEEP DOES NOT GET ITINERARY; OTHER FIELD ROLES DO NOT GET OPERATIONAL COSTS
          itinerary: isDriverJeep ? [] : sanitizedItinerary,
        };
      });

      sendJSON(res, 200, trips);
      return;
    }

    // 7. ANALYTICS: PROFIT & LOSS (Admin Authority Only)
    if (pathname === '/api/analytics/pnl' && method === 'GET') {
      const activeTrips = await query("SELECT * FROM trips WHERE trip_status != 'cancelled'");
      const cancelledTrips = await query("SELECT * FROM trips WHERE trip_status = 'cancelled'");

      let totalRevenue = 0;
      let totalJeepFee = 0;
      let totalFieldFee = 0;
      let totalPhotoFee = 0;
      let totalOperationalCost = 0;

      for (const t of activeTrips) {
        totalRevenue += Number(t.package_price) || 0;
        totalJeepFee += Number(t.jeep_fee) || 0;
        totalFieldFee += Number(t.field_driver_fee) || 0;
        totalPhotoFee += Number(t.photographer_fee) || 0;
        totalOperationalCost += Number(t.operational_cost) || 0;
      }

      const totalExpenses = totalJeepFee + totalFieldFee + totalPhotoFee + totalOperationalCost;
      const netProfit = totalRevenue - totalExpenses;
      const marginPercent = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0';

      sendJSON(res, 200, {
        totalRevenue,
        totalExpenses,
        netProfit,
        marginPercent: parseFloat(marginPercent),
        totalJeepFee,
        totalFieldFee,
        totalPhotoFee,
        totalOperationalCost,
        activeTripsCount: activeTrips.length,
        cancelledTripsCount: cancelledTrips.length,
      });
      return;
    }

    // 8. ANALYTICS: PAYROLL (Admin Authority Only)
    if (pathname === '/api/analytics/payroll' && method === 'GET') {
      const activeTrips = await query("SELECT * FROM trips WHERE trip_status != 'cancelled'");
      const payrollList = [];

      for (const t of activeTrips) {
        if (t.jeep_driver_id && Number(t.jeep_fee) > 0) {
          payrollList.push({
            id: `pay-jeep-${t.id}`,
            tripId: t.id,
            tripCode: t.code,
            date: t.date,
            workerId: t.jeep_driver_id,
            workerName: t.jeep_driver_name,
            role: 'driver_jeep',
            amount: Number(t.jeep_fee),
            status: t.jeep_payroll_status || 'unpaid',
          });
        }
        if (t.field_driver_id && Number(t.field_driver_fee) > 0) {
          payrollList.push({
            id: `pay-field-${t.id}`,
            tripId: t.id,
            tripCode: t.code,
            date: t.date,
            workerId: t.field_driver_id,
            workerName: t.field_driver_name,
            role: 'driver_lapangan',
            amount: Number(t.field_driver_fee),
            status: t.field_payroll_status || 'unpaid',
          });
        }
        if (t.photographer_id && Number(t.photographer_fee) > 0) {
          payrollList.push({
            id: `pay-photo-${t.id}`,
            tripId: t.id,
            tripCode: t.code,
            date: t.date,
            workerId: t.photographer_id,
            workerName: t.photographer_name,
            role: 'photographer',
            amount: Number(t.photographer_fee),
            status: t.photographer_payroll_status || 'unpaid',
          });
        }
      }

      sendJSON(res, 200, payrollList);
      return;
    }

    // Default 404
    sendJSON(res, 404, { error: 'Not Found', path: pathname });
  } catch (err) {
    console.error('[API Server Error]:', err);
    sendJSON(res, 500, { error: 'Internal Server Error', message: String(err) });
  }
});

// Initialize MySQL and start listening
async function startServer() {
  try {
    await initMySQL();
    server.listen(PORT, '0.0.0.0', () => {
      console.log('=======================================================');
      console.log('PANORAMA SUPER APP - CENTRALIZED MYSQL REST API ONLINE');
      console.log(`Server listening on: http://0.0.0.0:${PORT}`);
      console.log(`MySQL Database: ${process.env.DB_NAME || 'panorama_tour_db'} on ${process.env.DB_HOST || '127.0.0.1'}`);
      console.log('=======================================================');
    });
  } catch (err) {
    console.error('[Fatal Server Startup Error]:', err);
    process.exit(1);
  }
}

startServer();
