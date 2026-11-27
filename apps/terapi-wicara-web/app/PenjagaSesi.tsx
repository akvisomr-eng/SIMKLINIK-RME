
'use client';

/**
 * Penjaga sesi untuk halaman dalam ruang kerja.
 *
 * Dipakai oleh /enterprise dan /ai-command-center. Kedua halaman itu dulu dapat
 * dibuka langsung dari bilah alamat tanpa masuk, sehingga isi jaringan klinik
 * dan konsol analisa terbuka bagi siapa pun yang menebak alamatnya. Sekarang
 * keduanya menunggu pemeriksaan sesi dan mencocokkan peran lebih dulu.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { periksaSesi, type PeranPetugas } from '../src/lib/staffSession';

interface Props {
  /** Peran yang boleh membuka halaman ini. */
  izin: PeranPetugas[];
  children: ReactNode;
}

export default function PenjagaSesi({ izin, children }: Props) {
  const [siap, setSiap] = useState(false);
  const [ditolak, setDitolak] = useState<string | null>(null);

  useEffect(() => {
    let hidup = true;
    (async () => {
      const s = await periksaSesi();
      if (!hidup) return;
      if (!s) {
        window.location.replace('/masuk');
        return;
      }
      if (!izin.includes(s.access_role)) {
        setDitolak(
          'Akun Anda tidak berwenang membuka halaman ini. Kembali ke ruang kerja klinik.',
        );
        setSiap(true);
        return;
      }
      setSiap(true);
    })();
    return () => {
      hidup = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!siap) {
    return (
      <div className="sim-loading">
        <Loader2 size={22} className="ew-spin" />
        <span>Memeriksa sesi petugas...</span>
      </div>
    );
  }

  if (ditolak) {
    return (
      <div className="ew-locked">
        <h1>Akses ditolak</h1>
        <p>{ditolak}</p>
        <a className="ew-locked-btn" href="/simklinik">
          Kembali ke ruang kerja
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
