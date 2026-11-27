
/* Verifikasi PIN sesi klinis ke server (RPC tw_android_login). */
import { getSupabaseClient } from './rmeSyncService';

export interface LoginSuccess {
  ok: true;
  therapist_id: string;
  employee_number: string;
  full_name: string;
  profession_type: string;
  sip_number: string;
  sip_valid_until: string;
  clinic_id: string;
  clinic_name: string;
  fasyankes_code: string;
}

export interface LoginFailure {
  ok: false;
  code: string;
  message: string;
}

export type LoginResult = LoginSuccess | LoginFailure;

export async function loginWithPin(
  employeeNumber: string,
  pin: string
): Promise<LoginResult> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      code: 'NO_NETWORK',
      message: 'Tidak ada koneksi ke server RME. Sambungkan internet untuk masuk pertama kali.',
    };
  }

  const { data, error } = await client.rpc('tw_android_login', {
    p_employee_number: employeeNumber.trim(),
    p_pin: pin.trim(),
  });

  if (error) {
    return { ok: false, code: 'RPC_ERROR', message: error.message };
  }
  return data as LoginResult;
}

export async function changePin(
  employeeNumber: string,
  oldPin: string,
  newPin: string
): Promise<{ ok: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { ok: false, message: 'Tidak ada koneksi ke server RME.' };
  }
  const { data, error } = await client.rpc('tw_android_set_pin', {
    p_employee_number: employeeNumber.trim(),
    p_old_pin: oldPin.trim(),
    p_new_pin: newPin.trim(),
  });
  if (error) {
    return { ok: false, message: error.message };
  }
  const res = data as { ok: boolean; message?: string };
  return { ok: !!res.ok, message: res.message ?? 'PIN diperbarui.' };
}
