/**
 * Peta hak akses modul per peran petugas.
 *
 * Sebelumnya dasbor menampilkan keenam belas modul kepada siapa pun, dan peran
 * hanya pilihan di layar yang default ke "Kepala Klinik". Peta ini yang
 * menentukan modul mana terbuka untuk peran mana. Daftar ini sengaja ditulis
 * eksplisit, bukan pola wildcard, supaya penambahan modul baru tidak otomatis
 * membuka akses ke semua peran.
 *
 * Catatan: penyaringan di peramban hanya soal tampilan. Penjagaan sebenarnya
 * ada di sisi basis data lewat RPC yang memeriksa token sesi.
 */

import type { PeranPetugas } from './staffSession';

export const SEMUA_MODUL = [
  'M1_DASHBOARD',
  'M2_ADMISI_JADWAL',
  'M3_RME_CPPT',
  'M4_SATUSEHAT',
  'M5_SOP_PPK',
  'M6_SDM_SIP_STR',
  'M7_KASIR_PAKET',
  'M8_SARPRAS_PPI',
  'M9_MUTU_DINKES',
  'M10_RBAC_AUDIT',
  'M11_TARIF',
  'M12_JADWAL',
  'M13_PAKET',
  'M14_STERILISASI',
  'M15_IKP',
  'M16_RUJUKAN',
] as const;

export type ModulId = (typeof SEMUA_MODUL)[number];

export const MODUL_PER_PERAN: Record<PeranPetugas, ModulId[]> = {
  KEPALA_KLINIK: [...SEMUA_MODUL],

  ADMISI_RME: ['M1_DASHBOARD', 'M2_ADMISI_JADWAL', 'M3_RME_CPPT', 'M4_SATUSEHAT', 'M5_SOP_PPK', 'M12_JADWAL', 'M13_PAKET', 'M16_RUJUKAN'],

  TERAPIS_WICARA: ['M1_DASHBOARD', 'M3_RME_CPPT', 'M5_SOP_PPK', 'M12_JADWAL', 'M14_STERILISASI', 'M15_IKP', 'M16_RUJUKAN'],

  KASIR_KEUANGAN: ['M1_DASHBOARD', 'M7_KASIR_PAKET', 'M11_TARIF', 'M13_PAKET'],

  MUTU_DINKES: ['M1_DASHBOARD', 'M4_SATUSEHAT', 'M8_SARPRAS_PPI', 'M9_MUTU_DINKES', 'M10_RBAC_AUDIT', 'M11_TARIF', 'M14_STERILISASI', 'M15_IKP'],
};

export function bolehBuka(peran: PeranPetugas, modul: string): boolean {
  return (MODUL_PER_PERAN[peran] ?? []).includes(modul as ModulId);
}

/** Menu lintas-aplikasi yang hanya terbuka untuk peran tertentu. */
export function bolehBukaKonsol(peran: PeranPetugas, tujuan: 'enterprise' | 'ai'): boolean {
  if (peran === 'KEPALA_KLINIK') return true;
  if (peran === 'MUTU_DINKES' && tujuan === 'ai') return true;
  return false;
}
