
/*
 * Layanan CRUD Android -> Supabase.
 * Semua operasi memakai RPC server (tw_crud_list / tw_crud_save / tw_crud_delete)
 * sehingga aturan audit & validasi tetap berjalan di database, bukan di klien.
 */
import { getSupabaseClient } from './rmeSyncService';

export type CrudTable =
  | 'patients'
  | 'appointments'
  | 'service_tariffs'
  | 'patient_packages'
  | 'billing_invoices'
  | 'quality_indicators'
  | 'clinic_inventory'
  | 'ppi_sterilization_logs'
  | 'sop_documents'
  | 'interprofessional_referrals'
  | 'therapists';

export type CrudRow = Record<string, unknown>;

export interface CrudResult {
  ok: boolean;
  message: string;
  action?: string;
  row?: CrudRow;
}

function client() {
  const c = getSupabaseClient();
  if (!c) throw new Error('Tidak ada koneksi ke server RME. Coba lagi saat online.');
  return c;
}

export async function listRows(
  table: CrudTable,
  limit = 200
): Promise<CrudRow[]> {
  const { data, error } = await client().rpc('tw_crud_list', {
    p_table: table,
    p_limit: limit,
  });
  if (error) throw new Error(error.message);
  const res = data as { rows?: CrudRow[] };
  return res?.rows ?? [];
}

export async function saveRow(
  table: CrudTable,
  payload: CrudRow,
  actorName: string,
  actorRole: string,
  reason: string
): Promise<CrudResult> {
  const { data, error } = await client().rpc('tw_crud_save', {
    p_table: table,
    p_payload: payload,
    p_actor_name: actorName,
    p_actor_role: actorRole,
    p_reason: reason,
  });
  if (error) return { ok: false, message: error.message };
  const res = data as { status: string; action: string; row: CrudRow };
  return {
    ok: res.status === 'ok',
    action: res.action,
    row: res.row,
    message:
      res.action === 'CREATE'
        ? 'Rekaman baru berhasil disimpan.'
        : res.action === 'DELETE'
        ? 'Rekaman dihapus.'
        : 'Perubahan tersimpan.',
  };
}

export async function deleteRow(
  table: CrudTable,
  id: string,
  actorName: string,
  reason: string
): Promise<CrudResult> {
  const { data, error } = await client().rpc('tw_crud_delete', {
    p_table: table,
    p_id: id,
    p_actor_name: actorName,
    p_reason: reason,
  });
  if (error) return { ok: false, message: error.message };
  const res = data as { status: string };
  return { ok: res.status === 'ok', message: 'Rekaman dihapus dari basis data.' };
}

/* ---------------- Pembantu domain ---------------- */

export async function createPatient(
  clinicId: string,
  mrn: string,
  fullName: string,
  birthDate: string,
  gender: 'L' | 'P',
  guardianName: string,
  guardianPhone: string,
  actorName: string
): Promise<CrudResult> {
  return saveRow(
    'patients',
    {
      clinic_id: clinicId,
      medical_record_number: mrn,
      full_name: fullName,
      birth_date: birthDate,
      gender,
      nik_masked: '0000************',
      guardian_name: guardianName,
      guardian_relation: 'Ibu Kandung',
      guardian_phone: guardianPhone,
      address: '-',
    },
    actorName,
    'TERAPIS_WICARA',
    'PENDAFTARAN_PASIEN_ANDROID'
  );
}

let invoiceSeq = 0;
export async function createInvoice(
  clinicId: string,
  patientId: string,
  description: string,
  amountIdr: number,
  paymentMethod: string,
  cashierName: string
): Promise<CrudResult> {
  invoiceSeq = (invoiceSeq + 1) % 1000;
  const now = new Date();
  const number =
    'INV/TW/' +
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, '0') +
    '/' +
    String(Date.now()).slice(-4) +
    String(invoiceSeq).padStart(2, '0');

  return saveRow(
    'billing_invoices',
    {
      clinic_id: clinicId,
      patient_id: patientId,
      invoice_number: number,
      description,
      amount_idr: amountIdr,
      payment_method: paymentMethod,
      payment_status: 'LUNAS',
      cashier_name: cashierName,
      issued_at: now.toISOString(),
    },
    cashierName,
    'KASIR_ANDROID',
    'PEMBAYARAN_ANDROID'
  );
}
