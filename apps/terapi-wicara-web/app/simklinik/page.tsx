
/**
 * Ruang kerja klinik.
 *
 * Berkas ini sengaja tipis. Seluruh penjagaan sesi dan penyaringan menu ada di
 * SesiGate, yang memeriksa token ke server sebelum satu pun data pasien dimuat.
 * Dulu halaman ini langsung merender dasbor dengan peran bawaan Kepala Klinik,
 * sehingga siapa pun yang tahu alamatnya masuk sebagai administrator.
 */

import SesiGate from './SesiGate';

export const metadata = {
  title: 'Ruang kerja klinik - SIMKLINIK',
  description: 'Ruang kerja petugas klinik terapi wicara WicaraSehat Kediri.',
};

export default function RuangKerjaKlinikPage() {
  return <SesiGate />;
}
