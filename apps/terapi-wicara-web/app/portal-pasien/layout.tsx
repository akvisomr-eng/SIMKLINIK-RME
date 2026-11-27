
/**
 * Portal pasien memakai lapisan tema yang sama dengan halaman masuk dan ruang
 * kerja, supaya tidak tampil sebagai halaman tanpa gaya.
 */

import type { ReactNode } from 'react';
import '../theme-eduwell.css';

export const metadata = {
  title: 'Portal pasien - WicaraSehat Kediri',
  description:
    'Ringkasan program terapi, latihan rumah, sisa paket sesi, dan riwayat pembayaran pasien Klinik WicaraSehat Kediri.',
};

export default function PortalPasienLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
