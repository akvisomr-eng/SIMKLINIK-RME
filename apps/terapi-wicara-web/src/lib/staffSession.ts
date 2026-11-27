/**
 * Sesi petugas SIMKLINIK.
 *
 * Peran TIDAK disimpan di peramban sebagai sumber kebenaran. Yang disimpan hanya
 * token sesi; server mengembalikan peran yang tercatat di basis data. Dengan
 * begitu, mengubah nilai di localStorage tidak menaikkan hak akses.
 */

import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://fawmudsaaotlqyryciwd.supabase.co';

export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  'sb_publishable_wRGUQNJKi5XUjMXHFpDxVw_hPAPyhUc';

export const KUNCI_SESI = 'simklinik.session';

export type PeranPetugas =
  | 'KEPALA_KLINIK'
  | 'ADMISI_RME'
  | 'TERAPIS_WICARA'
  | 'KASIR_KEUANGAN'
  | 'MUTU_DINKES';

export interface SesiPetugas {
  ok: boolean;
  code?: string;
  message?: string;
  session_token: string;
  therapist_id: string;
  employee_number: string;
  full_name: string;
  degree_title: string;
  profession_type: string;
  access_role: PeranPetugas;
  clinical_privilege_level: string;
  sip_number: string;
  sip_valid_until: string;
  clinic_id: string;
  clinic_name: string;
  fasyankes_code: string;
  expires_at: string;
}

export const getKlien = () => createClient(SUPABASE_URL, SUPABASE_KEY);

export function tokenTersimpan(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(KUNCI_SESI);
  } catch {
    return null;
  }
}

export function simpanToken(token: string) {
  window.localStorage.setItem(KUNCI_SESI, token);
}

export function hapusToken() {
  try {
    window.localStorage.removeItem(KUNCI_SESI);
  } catch {
    // penyimpanan diblokir: tidak ada yang perlu dibersihkan
  }
}

/** Periksa token ke server. Mengembalikan null bila sesi tidak sah. */
export async function periksaSesi(token?: string | null): Promise<SesiPetugas | null> {
  const t = token ?? tokenTersimpan();
  if (!t) return null;
  const { data, error } = await getKlien().rpc('tw_staff_session_check', { p_token: t });
  if (error || !data) return null;
  const sesi = data as SesiPetugas;
  return sesi.ok ? sesi : null;
}

export async function keluarSesi() {
  const t = tokenTersimpan();
  if (t) {
    try {
      await getKlien().rpc('tw_staff_logout', { p_token: t });
    } catch {
      // pengakhiran sesi di server gagal: token tetap dihapus di peramban
    }
  }
  hapusToken();
}

export const LABEL_PERAN: Record<PeranPetugas, string> = {
  KEPALA_KLINIK: 'Kepala klinik / dokter penanggung jawab',
  ADMISI_RME: 'Admisi & rekam medis',
  TERAPIS_WICARA: 'Terapis wicara',
  KASIR_KEUANGAN: 'Kasir & keuangan',
  MUTU_DINKES: 'Mutu & pelaporan Dinkes',
};
