
/**
 * Halaman konsol jaringan hanya untuk kepala klinik.
 *
 * Penjagaan diletakkan di layout supaya berlaku untuk seluruh isi rute tanpa
 * menyentuh berkas halaman yang panjang.
 */

import type { ReactNode } from 'react';
import PenjagaSesi from '../PenjagaSesi';

export default function EnterpriseLayout({ children }: { children: ReactNode }) {
  return <PenjagaSesi izin={['KEPALA_KLINIK']}>{children}</PenjagaSesi>;
}
