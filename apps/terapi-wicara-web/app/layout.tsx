
import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

/**
 * Tipografi.
 *
 * Huruf sebelumnya memakai Open Sans bawaan template. Untuk klinik, huruf itu
 * terasa netral dan agak kaku. Plus Jakarta Sans dipilih karena buatan Indonesia,
 * memiliki bobot tebal yang tegas untuk judul, dan tetap terbaca nyaman pada
 * ukuran kecil. Dimuat lewat next/font agar tidak ada permintaan ke Google saat
 * halaman dibuka pasien (lebih cepat dan tidak membocorkan IP pengunjung).
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: 'WicaraSehat - Klinik Terapi Wicara, Bahasa & Menelan | Kediri',
  description:
    'Layanan terapi wicara, bahasa, suara, dan menelan oleh terapis ber-STR dengan SIP aktif Dinas Kesehatan. Asesmen terukur, program individual, rekam medis elektronik terhubung SATUSEHAT.',
  applicationName: 'SIMKLINIK',
  keywords: [
    'terapi wicara',
    'klinik terapi wicara Kediri',
    'speech delay',
    'terapis wicara',
    'disfagia',
    'gagap',
  ],
  openGraph: {
    title: 'WicaraSehat - Klinik Terapi Wicara di Kediri',
    description:
      'Asesmen terukur dan program terapi individual untuk gangguan bahasa, bicara, suara, kelancaran, dan menelan.',
    type: 'website',
    locale: 'id_ID',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#DC8CDB',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body className="ew-body">{children}</body>
    </html>
  );
}
