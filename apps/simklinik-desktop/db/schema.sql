
-- Skema SQLite lokal SIMKLINIK Desktop.
-- Kolom mengikuti tabel Supabase terapi_wicara apa adanya (uuid -> TEXT,
-- boolean -> INTEGER, timestamptz/date -> TEXT, numeric -> REAL,
-- bigint/integer -> INTEGER, jsonb/array -> TEXT) supaya tarik data tidak
-- kehilangan kolom. Sinkronisasi dua arah: lib/sync.js.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clinics (
  id TEXT PRIMARY KEY, holding_id TEXT, code TEXT, name TEXT,
  dinkes_license_number TEXT, oss_nib TEXT, fasyankes_code TEXT,
  satusehat_org_id TEXT, accreditation_status TEXT, clinic_classification TEXT,
  is_flagship_hq INTEGER, monthly_revenue_target_idr INTEGER,
  head_of_clinic_name TEXT, address TEXT, city TEXT, province TEXT, phone TEXT,
  created_at TEXT, updated_at TEXT, synced_at TEXT
);

CREATE TABLE IF NOT EXISTS therapists (
  id TEXT PRIMARY KEY, clinic_id TEXT, auth_user_id TEXT, employee_number TEXT,
  full_name TEXT, degree_title TEXT, profession_type TEXT, collegium_council_name TEXT,
  nik_hash TEXT, ihs_practitioner_id TEXT, ikatwi_member_number TEXT,
  str_number TEXT, str_is_lifetime INTEGER, sip_number TEXT, sip_issued_by_dinkes TEXT,
  sip_valid_from TEXT, sip_valid_until TEXT, skp_points_earned REAL, skp_points_target REAL,
  bhd_certified_until TEXT, clinical_privilege_level TEXT, specializations TEXT,
  base_salary_idr INTEGER, fee_per_session_idr INTEGER, is_active INTEGER,
  created_at TEXT, updated_at TEXT, synced_at TEXT
);

CREATE TABLE IF NOT EXISTS therapy_rooms (
  id TEXT PRIMARY KEY, clinic_id TEXT, room_code TEXT, room_name TEXT,
  satusehat_location_id TEXT, ambient_noise_db REAL, has_soundproofing INTEGER,
  has_therapy_mirror INTEGER, has_observation_window INTEGER,
  sterilization_status TEXT, last_disinfected_at TEXT, synced_at TEXT
);

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY, clinic_id TEXT, medical_record_number TEXT, full_name TEXT,
  birth_date TEXT, gender TEXT, nik_masked TEXT, ihs_patient_id TEXT, mother_name TEXT,
  primary_language TEXT, secondary_language TEXT, guardian_name TEXT,
  guardian_relation TEXT, guardian_phone TEXT, address TEXT, referring_doctor TEXT,
  referring_diagnosis_icd10 TEXT, referring_diagnosis_name TEXT,
  hearing_screening_status TEXT, clinical_alerts TEXT, allergies TEXT,
  aspiration_risk_level TEXT, pdp_consent_signed INTEGER, pdp_consent_signed_at TEXT,
  audio_video_consent INTEGER, retention_until TEXT,
  created_at TEXT, updated_at TEXT, synced_at TEXT
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY, clinic_id TEXT, patient_id TEXT, therapist_id TEXT, room_id TEXT,
  care_plan_id TEXT, scheduled_start TEXT, scheduled_end TEXT, visit_type TEXT,
  disorder_focus TEXT, session_number INTEGER, status TEXT,
  patient_identity_verified INTEGER, informed_consent_verified INTEGER,
  satusehat_encounter_id TEXT, satusehat_sync_status TEXT,
  created_at TEXT, updated_at TEXT, synced_at TEXT
);

CREATE TABLE IF NOT EXISTS soap_sessions (
  id TEXT PRIMARY KEY, clinic_id TEXT, appointment_id TEXT, patient_id TEXT,
  therapist_id TEXT, session_date TEXT, duration_minutes INTEGER,
  hand_hygiene_5_moments INTEGER, apd_compliant INTEGER,
  oral_tools_sterile_verified INTEGER, patient_two_identifiers_checked INTEGER,
  target_skill TEXT, trials_independent INTEGER, trials_verbal_prompt INTEGER,
  trials_visual_prompt INTEGER, trials_tactile_prompt INTEGER, trials_incorrect INTEGER,
  accuracy_percentage REAL, subjective TEXT, objective TEXT, assessment TEXT, plan TEXT,
  home_exercise_program TEXT, caregiver_educated INTEGER, caregiver_signature_name TEXT,
  icd10_code TEXT, icd9cm_code TEXT, icf_code TEXT, is_locked_tte INTEGER,
  tte_certificate_serial TEXT, tte_signed_at TEXT, addendum_notes TEXT,
  satusehat_synced INTEGER, client_offline_uuid TEXT UNIQUE,
  created_at TEXT, synced_at TEXT
);

CREATE TABLE IF NOT EXISTS billing_invoices (
  id TEXT PRIMARY KEY, clinic_id TEXT, invoice_number TEXT, patient_id TEXT,
  appointment_id TEXT, description TEXT, amount_idr INTEGER,
  payment_method TEXT, payment_status TEXT, cashier_name TEXT, issued_at TEXT,
  synced_at TEXT
);

CREATE TABLE IF NOT EXISTS service_tariffs (
  id TEXT PRIMARY KEY, clinic_id TEXT, service_code TEXT, service_name TEXT,
  category TEXT, icd9cm_code TEXT, duration_minutes INTEGER, sessions_included INTEGER,
  unit_price_idr INTEGER, therapist_fee_idr INTEGER, is_active INTEGER, synced_at TEXT
);

CREATE TABLE IF NOT EXISTS patient_packages (
  id TEXT PRIMARY KEY, clinic_id TEXT, patient_id TEXT, tariff_id TEXT, package_name TEXT,
  total_sessions INTEGER, used_sessions INTEGER, remaining_sessions INTEGER,
  total_paid_idr INTEGER, recognized_revenue_idr INTEGER, deferred_revenue_idr INTEGER,
  valid_until TEXT, status TEXT, created_at TEXT, synced_at TEXT
);

CREATE TABLE IF NOT EXISTS quality_indicators (
  id TEXT PRIMARY KEY, clinic_id TEXT, period_month TEXT, indicator_code TEXT,
  indicator_name TEXT, indicator_group TEXT, target_percentage REAL,
  achieved_percentage REAL, numerator INTEGER, denominator INTEGER, synced_at TEXT
);

CREATE TABLE IF NOT EXISTS rme_audit_logs (
  id TEXT PRIMARY KEY, clinic_id TEXT, actor_therapist_id TEXT, actor_name TEXT,
  actor_sip_number TEXT, action TEXT, entity_type TEXT, entity_id TEXT,
  patient_mrn TEXT, device_platform TEXT, metadata TEXT, logged_at TEXT
);

-- Antrean tulis lokal yang belum terkirim ke server.
CREATE TABLE IF NOT EXISTS sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload TEXT,
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_mrn ON patients (clinic_id, medical_record_number);
CREATE INDEX IF NOT EXISTS idx_queue_pending ON sync_queue (synced_at) WHERE synced_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_appt_start ON appointments (scheduled_start);
CREATE INDEX IF NOT EXISTS idx_inv_issued ON billing_invoices (issued_at);
CREATE INDEX IF NOT EXISTS idx_soap_offline ON soap_sessions (client_offline_uuid);
