
/**
 * Pusat analisa AI hanya untuk kepala klinik dan petugas mutu.
 */

import type { ReactNode } from 'react';
import PenjagaSesi from '../PenjagaSesi';

export default function AiCommandCenterLayout({ children }: { children: ReactNode }) {
  return <PenjagaSesi izin={['KEPALA_KLINIK', 'MUTU_DINKES']}>{children}</PenjagaSesi>;
}
