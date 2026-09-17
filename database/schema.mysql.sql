-- =========================================================================
-- PANORAMA SUPER APP - PRODUCTION MYSQL RELATIONAL DATABASE SCHEMA
-- Compatible with MySQL 8.0+, MySQL 8.4+, MariaDB 10.5+, AWS RDS, PlanetScale
-- Engine: InnoDB | Character Set: utf8mb4 | Collation: utf8mb4_unicode_ci
-- =========================================================================

CREATE DATABASE IF NOT EXISTS panorama_tour_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE panorama_tour_db;

-- -------------------------------------------------------------------------
-- 1. USERS & OPERATIONAL CREW TABLE
-- -------------------------------------------------------------------------
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

-- -------------------------------------------------------------------------
-- 2. TRAVEL AGENCIES (B2B PARTNERS)
-- -------------------------------------------------------------------------
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

-- -------------------------------------------------------------------------
-- 3. ITINERARY TEMPLATES (TOUR PACKAGES)
-- -------------------------------------------------------------------------
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

-- -------------------------------------------------------------------------
-- 4. ITINERARY STOPS (SUB-ITEMS OF TEMPLATE)
-- -------------------------------------------------------------------------
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

-- -------------------------------------------------------------------------
-- 5. TRIPS (CORE OPERATIONAL & FINANCIAL ENTITY)
-- -------------------------------------------------------------------------
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
  
  -- Agency Relation
  agency_id VARCHAR(64) DEFAULT NULL,
  agency_name VARCHAR(128) DEFAULT NULL,
  agency_payment_status ENUM('paid', 'unpaid', 'deposit') NOT NULL DEFAULT 'unpaid',
  
  -- Driver Jeep Assignment
  jeep_driver_id VARCHAR(64) DEFAULT NULL,
  jeep_driver_name VARCHAR(128) DEFAULT NULL,
  jeep_unit VARCHAR(128) DEFAULT NULL,
  jeep_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  jeep_status ENUM('standby', 'en_route', 'completed') NOT NULL DEFAULT 'standby',
  jeep_payroll_status ENUM('unpaid', 'paid') NOT NULL DEFAULT 'unpaid',
  
  -- Field / Shuttle Driver Assignment
  field_driver_id VARCHAR(64) DEFAULT NULL,
  field_driver_name VARCHAR(128) DEFAULT NULL,
  field_driver_unit VARCHAR(128) DEFAULT NULL,
  field_driver_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  field_driver_status ENUM('standby', 'picked_up', 'completed') NOT NULL DEFAULT 'standby',
  field_payroll_status ENUM('unpaid', 'paid') NOT NULL DEFAULT 'unpaid',
  
  -- Photographer Assignment
  photographer_id VARCHAR(64) DEFAULT NULL,
  photographer_name VARCHAR(128) DEFAULT NULL,
  photographer_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  photographer_status ENUM('assigned', 'shooting', 'uploaded') NOT NULL DEFAULT 'assigned',
  photographer_payroll_status ENUM('unpaid', 'paid') NOT NULL DEFAULT 'unpaid',
  photo_album_url VARCHAR(512) DEFAULT NULL,
  
  -- Operational Details & Snapshot
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

-- -------------------------------------------------------------------------
-- 6. AUDIT LOGS TABLE
-- -------------------------------------------------------------------------
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
