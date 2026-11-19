-- Smart E-Mobility Hub (VNU-HCM) - PostgreSQL 18 Schema (Database-First)

CREATE TYPE user_role AS ENUM ('STUDENT', 'OPERATOR', 'ADMIN');
CREATE TYPE account_status AS ENUM ('ACTIVE', 'PENDING_APPROVAL', 'LOCKED', 'REJECTED', 'DELETED');
CREATE TYPE vehicle_status AS ENUM ('AVAILABLE', 'BOOKED', 'IN_USE', 'CHARGING', 'UNDER_MAINTENANCE', 'FAULTY');
CREATE TYPE charging_point_status AS ENUM ('AVAILABLE', 'CHARGING', 'RESERVED', 'MAINTENANCE');
CREATE TYPE charging_session_status AS ENUM ('SCHEDULED', 'CHARGING', 'COMPLETED', 'CANCELLED');
CREATE TYPE booking_status AS ENUM ('ACTIVE', 'CANCELLED', 'COMPLETED', 'EXPIRED');
CREATE TYPE rental_status AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE dispatch_status AS ENUM ('IN_TRANSIT', 'COMPLETED', 'CANCELLED');
CREATE TYPE incident_resource_type AS ENUM ('VEHICLE', 'CHARGING_POINT');
CREATE TYPE incident_status AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');
CREATE TYPE audit_category AS ENUM ('QUAN_TRI', 'CANH_BAO', 'API', 'VAN_HANH');
CREATE TYPE audit_status AS ENUM ('SUCCESS', 'WARNING', 'ERROR');

CREATE TABLE users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  role user_role NOT NULL,
  status account_status NOT NULL DEFAULT 'ACTIVE',
  citizen_id VARCHAR(32),
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE student_profiles (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  student_id VARCHAR(64),
  university VARCHAR(200),
  balance INTEGER NOT NULL DEFAULT 100000 CHECK (balance >= 0),
  unpaid_fee INTEGER NOT NULL DEFAULT 0 CHECK (unpaid_fee >= 0)
);

CREATE TABLE operator_profiles (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  staff_id VARCHAR(64) NOT NULL,
  department VARCHAR(200)
);

CREATE TABLE auth_sessions (
  jti VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_auth_sessions_user_id ON auth_sessions(user_id);

CREATE TABLE hubs (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  total_docks INTEGER NOT NULL CHECK (total_docks > 0),
  total_charging_ports INTEGER NOT NULL CHECK (total_charging_ports >= 0),
  description TEXT
);

CREATE TABLE vehicles (
  id VARCHAR(64) PRIMARY KEY,
  plate_number VARCHAR(32) NOT NULL UNIQUE,
  type VARCHAR(64) NOT NULL,
  hub_id VARCHAR(64) REFERENCES hubs(id) ON DELETE SET NULL,
  battery_soc INTEGER NOT NULL CHECK (battery_soc >= 0 AND battery_soc <= 100),
  status vehicle_status NOT NULL DEFAULT 'AVAILABLE',
  model VARCHAR(120) NOT NULL,
  bay_code VARCHAR(32),
  qr_code VARCHAR(64) UNIQUE
);

CREATE INDEX idx_vehicles_hub_status ON vehicles(hub_id, status);

CREATE TABLE private_vehicles (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plate_number VARCHAR(32) NOT NULL,
  model VARCHAR(120) NOT NULL,
  vehicle_type VARCHAR(100) NOT NULL,
  charger_type VARCHAR(32) NOT NULL,
  battery_capacity_kwh DOUBLE PRECISION NOT NULL CHECK (battery_capacity_kwh > 0),
  UNIQUE (user_id, plate_number)
);

CREATE TABLE charging_points (
  id VARCHAR(64) PRIMARY KEY,
  hub_id VARCHAR(64) NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
  code VARCHAR(32) NOT NULL UNIQUE,
  bay_code VARCHAR(32) NOT NULL,
  connector_type VARCHAR(32) NOT NULL,
  power_kw DOUBLE PRECISION NOT NULL CHECK (power_kw > 0),
  status charging_point_status NOT NULL DEFAULT 'AVAILABLE'
);

CREATE INDEX idx_charging_points_hub_status ON charging_points(hub_id, status);

CREATE TABLE bookings (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(32) UNIQUE,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id VARCHAR(64) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  hub_id VARCHAR(64) NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  status booking_status NOT NULL DEFAULT 'ACTIVE'
);

CREATE INDEX idx_bookings_user_status ON bookings(user_id, status);

CREATE TABLE parking_bookings (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hub_id VARCHAR(64) NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
  hub_name VARCHAR(200) NOT NULL,
  vehicle_plate VARCHAR(32) NOT NULL,
  bay_code VARCHAR(32) NOT NULL,
  arrival_time VARCHAR(16) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  status booking_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_parking_bookings_hub_status ON parking_bookings(hub_id, status);

CREATE TABLE rentals (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_id VARCHAR(64) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  booking_id VARCHAR(64) REFERENCES bookings(id) ON DELETE SET NULL,
  origin_hub_id VARCHAR(64) NOT NULL REFERENCES hubs(id),
  destination_hub_id VARCHAR(64) REFERENCES hubs(id),
  return_bay_code VARCHAR(32),
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  distance_km DOUBLE PRECISION,
  fare INTEGER,
  damaged_reported BOOLEAN NOT NULL DEFAULT FALSE,
  damage_note TEXT,
  status rental_status NOT NULL DEFAULT 'ACTIVE'
);

CREATE INDEX idx_rentals_user_status ON rentals(user_id, status);

CREATE TABLE charging_sessions (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  vehicle_id VARCHAR(64) REFERENCES vehicles(id) ON DELETE CASCADE,
  private_vehicle_id VARCHAR(64) REFERENCES private_vehicles(id) ON DELETE CASCADE,
  vehicle_label VARCHAR(180) NOT NULL,
  hub_id VARCHAR(64) NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
  charging_point_id VARCHAR(64) NOT NULL REFERENCES charging_points(id) ON DELETE CASCADE,
  charging_point_code VARCHAR(32) NOT NULL,
  bay_code VARCHAR(32) NOT NULL,
  is_private_vehicle BOOLEAN NOT NULL DEFAULT FALSE,
  session_date VARCHAR(16) NOT NULL,
  start_time VARCHAR(16) NOT NULL,
  end_time VARCHAR(16) NOT NULL,
  current_soc INTEGER NOT NULL CHECK (current_soc >= 0 AND current_soc <= 100),
  target_soc INTEGER NOT NULL CHECK (target_soc >= 0 AND target_soc <= 100),
  priority_score INTEGER NOT NULL DEFAULT 0,
  status charging_session_status NOT NULL DEFAULT 'SCHEDULED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((vehicle_id IS NOT NULL AND private_vehicle_id IS NULL) OR (vehicle_id IS NULL AND private_vehicle_id IS NOT NULL))
);

CREATE INDEX idx_charging_sessions_hub_status ON charging_sessions(hub_id, status);

CREATE TABLE dispatch_orders (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  operator_id VARCHAR(64) NOT NULL REFERENCES users(id),
  source_hub_id VARCHAR(64) NOT NULL REFERENCES hubs(id),
  target_hub_id VARCHAR(64) NOT NULL REFERENCES hubs(id),
  note TEXT,
  status dispatch_status NOT NULL DEFAULT 'IN_TRANSIT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE dispatch_order_items (
  id VARCHAR(64) PRIMARY KEY,
  dispatch_order_id VARCHAR(64) NOT NULL REFERENCES dispatch_orders(id) ON DELETE CASCADE,
  vehicle_id VARCHAR(64) NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  plate_number VARCHAR(32) NOT NULL,
  UNIQUE (dispatch_order_id, vehicle_id)
);

CREATE TABLE incidents (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(32) NOT NULL UNIQUE,
  reporter_id VARCHAR(64) NOT NULL REFERENCES users(id),
  hub_id VARCHAR(64) NOT NULL REFERENCES hubs(id),
  resource_type incident_resource_type NOT NULL,
  vehicle_id VARCHAR(64) REFERENCES vehicles(id) ON DELETE CASCADE,
  charging_point_id VARCHAR(64) REFERENCES charging_points(id) ON DELETE CASCADE,
  resource_label VARCHAR(200) NOT NULL,
  incident_type VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  affected_summary TEXT,
  status incident_status NOT NULL DEFAULT 'OPEN',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  CHECK ((vehicle_id IS NOT NULL AND charging_point_id IS NULL) OR (vehicle_id IS NULL AND charging_point_id IS NOT NULL))
);

CREATE TABLE audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  category audit_category NOT NULL,
  actor_name VARCHAR(150) NOT NULL,
  actor_id VARCHAR(64) NOT NULL,
  description TEXT NOT NULL,
  ip_address VARCHAR(64) NOT NULL DEFAULT '127.0.0.1',
  status audit_status NOT NULL DEFAULT 'SUCCESS'
);

CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

CREATE TABLE scenarios (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  target_hub_id VARCHAR(64) NOT NULL REFERENCES hubs(id),
  action_type VARCHAR(64) NOT NULL,
  intensity INTEGER NOT NULL,
  warning_threshold INTEGER NOT NULL
);
