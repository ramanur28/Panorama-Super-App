// Panorama Super App - Centralized MySQL Database Engine
import mysql from 'mysql2/promise';

const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = parseInt(process.env.DB_PORT || '3306', 10);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'panorama_tour_db';

let pool = null;
let isConnected = false;

export async function getPool() {
  if (!pool) {
    await initMySQL();
  }
  return pool;
}

export function isMySQLConnected() {
  return isConnected;
}

export async function query(sql, params = []) {
  const p = await getPool();
  const [rows] = await p.query(sql, params);
  return rows;
}

export async function execute(sql, params = []) {
  const p = await getPool();
  const [result] = await p.execute(sql, params);
  return result;
}

export async function initMySQL() {
  try {
    console.log(`[MySQL] Connecting to MySQL server at ${DB_HOST}:${DB_PORT} (User: ${DB_USER})...`);
    
    // 1. Create database if it doesn't exist
    const bootstrapConn = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
    });
    
    await bootstrapConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await bootstrapConn.end();

    // 2. Initialize connection pool targeting the database
    pool = mysql.createPool({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      waitForConnections: true,
      connectionLimit: 15,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      timezone: '+07:00',
      dateStrings: true,
    });

    // Test connection
    const connection = await pool.getConnection();
    connection.release();
    isConnected = true;
    console.log(`[MySQL] Successfully connected to MySQL database: ${DB_NAME}`);

    // 3. Create tables if not exist
    await createTablesIfNotExist();

    // 4. Seed initial records if empty
    await seedIfEmpty();

    return pool;
  } catch (err) {
    console.error('[MySQL Error] Failed to initialize MySQL connection:', err.message);
    isConnected = false;
    throw err;
  }
}

async function createTablesIfNotExist() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      username VARCHAR(64) UNIQUE,
      email VARCHAR(128) UNIQUE,
      phone VARCHAR(32) NOT NULL,
      pin VARCHAR(64) NOT NULL DEFAULT '123456',
      name VARCHAR(128) NOT NULL,
      role ENUM('admin', 'driver_jeep', 'driver_lapangan', 'photographer') NOT NULL,
      type ENUM('internal', 'external') NOT NULL DEFAULT 'internal',
      vehicle_unit VARCHAR(128) DEFAULT NULL,
      avatar VARCHAR(512) DEFAULT NULL,
      base_rate_per_trip DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      is_available TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_users_role (role),
      INDEX idx_users_phone (phone),
      INDEX idx_users_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS agencies (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      code VARCHAR(32) UNIQUE NOT NULL,
      contact_person VARCHAR(128) DEFAULT NULL,
      phone VARCHAR(32) NOT NULL,
      email VARCHAR(128) DEFAULT NULL,
      address TEXT DEFAULT NULL,
      commission_rate_percent DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_agencies_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS itinerary_templates (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      category ENUM('bromo_sunrise', 'milky_way', 'custom_trip', 'open_trip') NOT NULL DEFAULT 'bromo_sunrise',
      duration VARCHAR(64) NOT NULL DEFAULT '12 Jam',
      description TEXT DEFAULT NULL,
      default_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_templates_category (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS itinerary_stops (
      id VARCHAR(64) PRIMARY KEY,
      template_id VARCHAR(64) NOT NULL,
      order_index INT NOT NULL DEFAULT 0,
      title VARCHAR(128) NOT NULL,
      time_estimate VARCHAR(64) NOT NULL,
      activity_description TEXT DEFAULT NULL,
      operational_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (template_id) REFERENCES itinerary_templates(id) ON DELETE CASCADE,
      INDEX idx_stops_template (template_id, order_index)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS trips (
      id VARCHAR(64) PRIMARY KEY,
      code VARCHAR(64) UNIQUE NOT NULL,
      date DATE NOT NULL,
      time_slot VARCHAR(64) NOT NULL,
      guest_name VARCHAR(128) NOT NULL,
      guest_count INT NOT NULL DEFAULT 1,
      guest_phone VARCHAR(32) NOT NULL,
      pickup_point VARCHAR(255) NOT NULL,
      notes TEXT DEFAULT NULL,
      package_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      tour_package VARCHAR(128) NOT NULL,
      agency_id VARCHAR(64) DEFAULT NULL,
      agency_name VARCHAR(128) DEFAULT NULL,
      agency_payment_status ENUM('paid', 'unpaid', 'deposit') NOT NULL DEFAULT 'unpaid',
      jeep_driver_id VARCHAR(64) DEFAULT NULL,
      jeep_driver_name VARCHAR(128) DEFAULT NULL,
      jeep_unit VARCHAR(128) DEFAULT NULL,
      jeep_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      jeep_status ENUM('standby', 'en_route', 'completed') NOT NULL DEFAULT 'standby',
      jeep_payroll_status ENUM('unpaid', 'paid') NOT NULL DEFAULT 'unpaid',
      field_driver_id VARCHAR(64) DEFAULT NULL,
      field_driver_name VARCHAR(128) DEFAULT NULL,
      field_driver_unit VARCHAR(128) DEFAULT NULL,
      field_driver_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      field_driver_status ENUM('standby', 'picked_up', 'completed') NOT NULL DEFAULT 'standby',
      field_payroll_status ENUM('unpaid', 'paid') NOT NULL DEFAULT 'unpaid',
      photographer_id VARCHAR(64) DEFAULT NULL,
      photographer_name VARCHAR(128) DEFAULT NULL,
      photographer_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      photographer_status ENUM('assigned', 'shooting', 'uploaded') NOT NULL DEFAULT 'assigned',
      photographer_payroll_status ENUM('unpaid', 'paid') NOT NULL DEFAULT 'unpaid',
      photo_album_url VARCHAR(512) DEFAULT NULL,
      operational_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      itinerary_template_id VARCHAR(64) DEFAULT NULL,
      trip_status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
      cancellation_reason TEXT DEFAULT NULL,
      raw_itinerary JSON DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_trips_date (date),
      INDEX idx_trips_status (trip_status),
      INDEX idx_trips_jeep (jeep_driver_id),
      INDEX idx_trips_field (field_driver_id),
      INDEX idx_trips_photo (photographer_id),
      INDEX idx_trips_agency (agency_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id VARCHAR(64) PRIMARY KEY,
      trip_id VARCHAR(64) DEFAULT NULL,
      user_id VARCHAR(64) DEFAULT NULL,
      action VARCHAR(64) NOT NULL,
      details JSON DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_audit_trip (trip_id),
      INDEX idx_audit_action (action)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
}

async function seedIfEmpty() {
  const users = await query('SELECT COUNT(*) as count FROM users');
  if (users[0].count === 0) {
    console.log('[MySQL] Seeding default users...');
    const insertUser = `
      INSERT INTO users (id, username, email, phone, pin, name, role, type, vehicle_unit, avatar, base_rate_per_trip)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await execute(insertUser, ['w-admin-1', 'admin', 'admin@panoramatour.com', '0811-0011-2233', '123456', 'Admin Panorama Operasional', 'admin', 'internal', null, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80', 0]);
    await execute(insertUser, ['w-jeep-1', 'budi', 'budi@panoramatour.com', '0812-3344-5561', '123456', 'Budi Santoso', 'driver_jeep', 'internal', 'Jeep 01 (Hardtop N 1045 AB)', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80', 250000]);
    await execute(insertUser, ['w-jeep-2', 'slamet', 'slamet@panoramatour.com', '0813-2211-9988', '123456', 'Pak Slamet Riyadi', 'driver_jeep', 'internal', 'Jeep 04 (Hardtop N 7182 XY)', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80', 250000]);
    await execute(insertUser, ['w-jeep-3', 'joko', 'joko@panoramatour.com', '0857-4433-2211', '123456', 'Joko Waluyo (Mitra Luar)', 'driver_jeep', 'external', 'Jeep 12 (Hardtop N 9921 KL)', 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=120&auto=format&fit=crop&q=80', 300000]);
    await execute(insertUser, ['w-field-1', 'rian', 'rian@panoramatour.com', '0821-6677-8899', '123456', 'Rian Hidayat', 'driver_lapangan', 'internal', 'HiAce Shuttle 02 (N 7788 OP)', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80', 175000]);
    await execute(insertUser, ['w-field-2', 'agus', 'agus@panoramatour.com', '0819-3344-1122', '123456', 'Agus Setiawan (Sewa)', 'driver_lapangan', 'external', 'Innova Reborn (N 1122 TR)', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80', 200000]);
    await execute(insertUser, ['w-photo-1', 'dimas', 'dimas@panoramatour.com', '0812-9988-7766', '123456', 'Dimas Anggara', 'photographer', 'internal', 'Sony A7 IV + Lens Kit', 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=120&auto=format&fit=crop&q=80', 200000]);
    await execute(insertUser, ['w-photo-2', 'fajar', 'fajar@panoramatour.com', '0878-5544-3322', '123456', 'Fajar Snap (Freelance)', 'photographer', 'external', 'Canon R6 + Drone Mini 4', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&auto=format&fit=crop&q=80', 250000]);

    // Seed Agencies
    const insertAgency = `
      INSERT INTO agencies (id, name, code, contact_person, phone, email, address, commission_rate_percent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await execute(insertAgency, ['ag-1', 'Nusantara Tour & Travel', 'AG-01', 'Ibu Rina', '0812-3322-1100', 'rina@nusantaratour.com', 'Jl. Ijen No. 45, Malang', 10]);
    await execute(insertAgency, ['ag-2', 'Bromo Explorer Agency', 'AG-02', 'Bpk. Doni', '0821-4455-6677', 'ops@bromoexplorer.id', 'Jl. Basuki Rahmat 12, Surabaya', 12]);
    await execute(insertAgency, ['ag-3', 'Java Heritage Trip', 'AG-03', 'Mbak Citra', '0856-7788-9900', 'hello@javatrip.com', 'Jl. Malioboro No. 10, Yogyakarta', 10]);

    // Seed Itinerary Templates
    const insertTpl = `
      INSERT INTO itinerary_templates (id, name, category, duration, description, default_price)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await execute(insertTpl, ['tpl-1', 'Bromo Sunrise Classic 4 Spot', 'bromo_sunrise', '12 Jam (00:00 - 12:00)', 'Paket favorit: Penanjakan 1, Kawah Bromo, Pasir Berbisik, dan Bukit Teletubbies.', 1750000]);
    await execute(insertTpl, ['tpl-2', 'Bromo Milky Way Photography Night', 'milky_way', '14 Jam (21:00 - 11:00)', 'Tur khusus fotografer bintang galaksi Bima Sakti dengan spot Kingkong Hill & Lautan Pasir.', 2400000]);

    // Seed Trips
    const insertTrip = `
      INSERT INTO trips (
        id, code, date, time_slot, guest_name, guest_count, guest_phone, pickup_point, notes,
        package_price, tour_package, agency_id, agency_name, agency_payment_status,
        jeep_driver_id, jeep_driver_name, jeep_unit, jeep_fee, jeep_status, jeep_payroll_status,
        field_driver_id, field_driver_name, field_driver_unit, field_driver_fee, field_driver_status, field_payroll_status,
        photographer_id, photographer_name, photographer_fee, photographer_status, photographer_payroll_status, photo_album_url,
        operational_cost, itinerary_template_id, trip_status, cancellation_reason, raw_itinerary
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `;

    const itin1 = JSON.stringify([
      { id: 'it-1', time: '00:00 - 00:30', title: 'Penjemputan Tamu Hotel', location: 'Kota Malang / Batu', notes: 'Standby HiAce Shuttle' },
      { id: 'it-2', time: '03:30 - 05:30', title: 'Golden Sunrise Penanjakan 1', location: 'Penanjakan 1', notes: 'Jeep Hardtop 4x4' },
      { id: 'it-3', time: '06:30 - 08:30', title: 'Kawah Bromo & Pura Luhur Poten', location: 'Lautan Pasir', notes: 'Foto & Naik Kuda' },
      { id: 'it-4', time: '09:00 - 10:30', title: 'Pasir Berbisik & Savana Teletubbies', location: 'Savana Bromo', notes: 'Sesi Foto Dokumentasi' },
      { id: 'it-5', time: '11:00 - 12:30', title: 'Perjalanan Pulang ke Hotel Tamu', location: 'Malang / Surabaya', notes: 'Drop off tamu' },
    ]);

    await execute(insertTrip, [
      'trip-1', 'PNR-260917-01', '2026-09-17', '03:30 WIB (Sunrise)', 'Bpk. Hendra & Keluarga (Jakarta)', 4, '0812-9988-7711', 'Lobby Hotel Tugu Malang', 'Bawa jaket tebal 4 pcs',
      1750000, 'Bromo Sunrise Classic 4 Spot', 'ag-1', 'Nusantara Tour & Travel', 'paid',
      'w-jeep-1', 'Budi Santoso', 'Jeep 01 (Hardtop N 1045 AB)', 250000, 'standby', 'unpaid',
      'w-field-1', 'Rian Hidayat', 'HiAce Shuttle 02 (N 7788 OP)', 175000, 'standby', 'unpaid',
      'w-photo-1', 'Dimas Anggara', 200000, 'assigned', 'unpaid', null,
      350000, 'tpl-1', 'scheduled', null, itin1
    ]);

    await execute(insertTrip, [
      'trip-2', 'PNR-260917-02', '2026-09-17', '21:00 WIB (Milky Way)', 'Ms. Sarah Jenkins (Australia)', 2, '0813-7766-5544', 'Grand Mercure Malang Mirama', 'Kamera tripod ready',
      2400000, 'Bromo Milky Way Photography Night', 'ag-2', 'Bromo Explorer Agency', 'unpaid',
      'w-jeep-2', 'Pak Slamet Riyadi', 'Jeep 04 (Hardtop N 7182 XY)', 250000, 'standby', 'unpaid',
      'w-field-2', 'Agus Setiawan (Sewa)', 'Innova Reborn (N 1122 TR)', 200000, 'standby', 'unpaid',
      'w-photo-2', 'Fajar Snap (Freelance)', 250000, 'assigned', 'unpaid', null,
      400000, 'tpl-2', 'scheduled', null, itin1
    ]);

    console.log('[MySQL] Seeding complete! Database ready for production operations.');
  }
}
