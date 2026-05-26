PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  student_id TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'student',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS facilities (
  id INTEGER PRIMARY KEY,
  campus TEXT NOT NULL DEFAULT '글로벌캠퍼스',
  building TEXT NOT NULL,
  facility_name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 0,
  open_time TEXT NOT NULL,
  close_time TEXT NOT NULL,
  slot_unit_hours INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'available',
  UNIQUE (building, facility_name)
);

CREATE TABLE IF NOT EXISTS facility_reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  date TEXT NOT NULL,
  campus TEXT NOT NULL,
  building TEXT NOT NULL,
  facility_id INTEGER NOT NULL,
  facility_name TEXT NOT NULL,
  applicant_contact TEXT NOT NULL,
  purpose TEXT NOT NULL,
  host_group TEXT NOT NULL,
  leader_name TEXT NOT NULL,
  leader_contact TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '승인 대기',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (facility_id) REFERENCES facilities(id)
);

CREATE TABLE IF NOT EXISTS facility_reservation_times (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reservation_id INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  label TEXT NOT NULL,
  FOREIGN KEY (reservation_id) REFERENCES facility_reservations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_facilities_building ON facilities(building);
CREATE INDEX IF NOT EXISTS idx_facility_reservations_date_facility_status
  ON facility_reservations(date, facility_id, status);
CREATE INDEX IF NOT EXISTS idx_facility_reservation_times_reservation
  ON facility_reservation_times(reservation_id);
CREATE INDEX IF NOT EXISTS idx_facility_reservation_times_time
  ON facility_reservation_times(start_time, end_time);
