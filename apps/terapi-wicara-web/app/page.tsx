'use client';

/**
 * Situs publik SIMKLINIK - halaman depan.
 *
 * Bahasa desain: TemplateMo 555 Upright (lisensi bebas untuk situs komersial;
 * yang dilarang hanya mendistribusikan ulang ZIP templatenya). Tata letaknya
 * dipertahankan: kolom kiri tetap berisi logo dan menu, kolom gambar tegak,
 * dan kolom isi yang bergulir di kanan.
 *
 * Halaman ini terpisah dari dasbor SIMKLINIK. Tidak ada tautan ke dasbor:
 * petugas masuk lewat alamatnya sendiri, pasien memakai portal pasien.
 * Yang menyatu adalah datanya - tarif, terapis, ruang, dan slot dibaca dari
 * basis data klinik yang sama, dan setiap permintaan masuk ke meja admisi
 * lewat RPC.
 *
 * Foto: domain publik (CC0 1.0 / Public Domain Mark 1.0) dari Openverse,
 * Wikimedia Commons, dan Flickr arsip pemerintah. Gratis untuk komersial,
 * boleh diubah, tanpa kewajiban atribusi. Tidak ada foto pasien klinik.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarCheck,
  Clock,
  Download,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { FALLBACK_SIMKLINIK_DATA } from '../src/lib/supabaseClient';
import { CareRequestForms } from '../src/components/CareRequestForms';
import { AiConsultAssistant } from '../src/components/AiConsultAssistant';
import { ServiceGlyph } from '../src/components/siteIllustrations';

/**
 * Klien dibangun di sini, bukan lewat getBrowserSupabase(), karena fungsi itu
 * mengembalikan null bila NEXT_PUBLIC_SUPABASE_URL tidak terpasang. Akibatnya
 * halaman diam-diam memakai data cadangan dan menampilkan angka yang salah.
 * Kunci publishable memang dirancang untuk dipakai di sisi publik.
 */
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://fawmudsaaotlqyryciwd.supabase.co';
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  'sb_publishable_wRGUQNJKi5XUjMXHFpDxVw_hPAPyhUc';

const getClient = () => createClient(SUPABASE_URL, SUPABASE_KEY);

/** Snapshot portal publik: tarif, terapis, ruang, dan profil klinik. */
async function ambilSnapshot(sb: ReturnType<typeof getClient>) {
  return sb.rpc('tw_public_portal_snapshot', {
    p_clinic_code: 'KLN-TW-KDR-01',
  });
}

const formatRupiah = (v: number) => 'Rp' + (v ?? 0).toLocaleString('id-ID');

/**
 * Foto domain publik untuk konteks klinik terapi wicara.
 *
 * Seluruh gambar diambil dari Openverse dengan lisensi CC0 1.0 atau Public
 * Domain Mark 1.0: bebas dipakai untuk kepentingan komersial, boleh diubah,
 * tanpa kewajiban atribusi. Kredit tetap ditulis di sini sebagai jejak
 * asal-usul. Tidak ada satu pun foto pasien klinik - semua stok berlisensi.
 *
 * Sumber (semua CC0 / PDM):
 *  - Terapi wicara & asesmen: South Australian History Network, State
 *    Government Photographer.
 *  - Ruang audiologi: NavyMedicine.
 *  - Terapi okupasi tangan: NavyMedicine.
 *  - Pemeriksaan anak: U.S. Embassy Jakarta.
 *  - Belajar membaca anak: NIH.
 *  - Ruang tunggu klinik: Ian Livesey.
 */
const IMG_HERO_1 =
  'https://live.staticflickr.com/5481/14042890298_49f3b4d48a_b.jpg';
const IMG_HERO_2 =
  'https://live.staticflickr.com/65535/51629691390_fb465ea8b1_b.jpg';
const IMG_HERO_3 =
  'https://live.staticflickr.com/6032/6345718703_8e57906fc1_b.jpg';
const IMG_ASESSMEN =
  'https://upload.wikimedia.org/wikipedia/commons/b/b9/Student_doing_speech_therapy%28GN08932%29.jpg';
const IMG_TERAPI =
  'https://live.staticflickr.com/65535/52033349927_69e5145c42_b.jpg';
const IMG_ANAK =
  'https://live.staticflickr.com/65535/48997124487_6bb756f3f9_b.jpg';
const IMG_TANGAN =
  'https://upload.wikimedia.org/wikipedia/commons/8/88/Game_speaks_Revolutionizing_speech_therapy_through_interactive_gaming.jpg';
const IMG_DEWASA = IMG_TERAPI;
const IMG_RUANG =
  'https://live.staticflickr.com/65535/33789221398_63e87748af_b.jpg';

/**
 * Gambar kolom tengah per fase bacaan. TemplateMo Upright mengganti gambar
 * mengikuti seksi yang sedang dilihat; di sini tiap fase punya tiga foto yang
 * relevan dengan bagian isinya, bukan hiasan yang berulang.
 */
const FIGUR: Array<Array<{ img: string; caption: string }>> = [
  [
    { img: IMG_HERO_1, caption: 'Sesi terapi wicara tatap muka' },
    { img: IMG_HERO_2, caption: 'Pemeriksaan pendengaran anak' },
    { img: IMG_HERO_3, caption: 'Pendampingan orang tua di setiap sesi' },
  ],
  [
    { img: IMG_TERAPI, caption: 'Latihan motorik halus di ruang terapi' },
    { img: IMG_ANAK, caption: 'Latihan membaca dan mengenal kata' },
    { img: IMG_RUANG, caption: 'Ruang tunggu keluarga' },
  ],
  [
    { img: IMG_ASESSMEN, caption: 'Asesmen bahasa dan artikulasi' },
    { img: IMG_TANGAN, caption: 'Stimulasi oromotor lewat permainan' },
    { img: IMG_HERO_1, caption: 'Terapis ber-SIP mendampingi tiap sesi' },
  ],
];

/** Seksi bertanda jangkar dan fase gambar yang dipakai saat seksi itu dibaca. */
const FASE_JANGKAR: Array<[string, number]> = [
  ['layanan', 0],
  ['alur', 0],
  ['galeri', 0],
  ['tarif', 1],
  ['daftar', 1],
  ['konsultasi', 1],
  ['aplikasi', 2],
  ['tim', 2],
  ['tanya', 2],
  ['kontak', 2],
];

const SERVICES = [
  {
    glyph: 'bahasa' as const,
    title: 'Gangguan Bahasa',
    icd: 'ICD-10 F80.1 - F80.2 - F84.0 - R47.01',
    body:
      'Keterlambatan bicara-bahasa (speech delay), gangguan bahasa reseptif-ekspresif, komunikasi sosial pragmatik pada ASD/ADHD, serta rehabilitasi afasia pasca-stroke.',
  },
  {
    glyph: 'bicara' as const,
    title: 'Gangguan Bicara',
    icd: 'ICD-10 F80.0 - R47.1 - Q35-Q37',
    body:
      'Gangguan artikulasi dan fonologi anak, Childhood Apraxia of Speech (CAS), disartria neurogenik, serta terapi resonansi pasca-operasi celah bibir dan langit-langit.',
  },
  {
    glyph: 'suara' as const,
    title: 'Gangguan Suara',
    icd: 'ICD-10 R49.0 - J38.2',
    body:
      'Higienitas vokal dan fungsi fonasi pada nodul pita suara, paralisis plika vokalis, hipernasalitas, dan rehabilitasi pasca-laringektomi.',
  },
  {
    glyph: 'irama' as const,
    title: 'Kelancaran Bicara',
    icd: 'ICD-10 F98.5 - F98.6',
    body:
      'Penanganan gagap (stuttering) perkembangan anak hingga dewasa serta cluttering, memakai pendekatan modifikasi gagap dan pembentukan kelancaran.',
  },
  {
    glyph: 'menelan' as const,
    title: 'Menelan & Makan',
    icd: 'ICD-10 R13.10 - F98.2',
    body:
      'Asesmen menelan klinis berpanduan saturasi oksigen (SpO2), modifikasi diet standar IDDSI Level 0-7, dan terapi makan pediatrik.',
  },
  {
    glyph: 'aural' as const,
    title: 'Rehabilitasi Aural & AAC',
    icd: 'AVT - Augmentative Communication',
    body:
      'Terapi Auditory-Verbal pasca pemasangan alat bantu dengar atau implan koklea, serta penyediaan papan komunikasi alternatif fungsional.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Daftar dari rumah',
    body: 'Isi formulir janji periksa atau pendaftaran online. Anda langsung menerima kode permintaan sebagai bukti masuk.',
  },
  {
    n: '02',
    title: 'Verifikasi admisi',
    body: 'Petugas memeriksa identitas dan kelengkapan data, lalu menghubungi Anda lewat WhatsApp untuk memastikan jadwal.',
  },
  {
    n: '03',
    title: 'Asesmen awal',
    body: 'Terapis melakukan asesmen lima area komunikasi dan menelan, termasuk observasi pendengaran dan oromotor.',
  },
  {
    n: '04',
    title: 'Rencana terapi',
    body: 'Program terapi disusun terukur bersama keluarga, dievaluasi berkala, dan dicatat dalam rekam medis elektronik.',
  },
];

const GALERI = [
  { img: IMG_TERAPI, label: 'Sesi terapi tatap muka' },
  { img: IMG_ANAK, label: 'Latihan artikulasi anak' },
  { img: IMG_RUANG, label: 'Ruang terapi kedap suara' },
  { img: IMG_TANGAN, label: 'Stimulasi oromotor' },
];

const FAQ = [
  {
    q: 'Apakah konsultasi AI di situs ini bisa menggantikan pemeriksaan terapis?',
    a: 'Tidak. Asisten analisis hanya membantu menyusun ringkasan keluhan dan menunjukkan informasi awal. Sifatnya sementara, tidak menyimpan diagnosis, dan bukan keputusan klinis. Keputusan tetap pada terapis setelah asesmen langsung.',
  },
  {
    q: 'Berapa lama saya menunggu konfirmasi jadwal?',
    a: 'Permintaan masuk ke meja admisi pada jam kerja. Petugas menghubungi lewat WhatsApp pada hari yang sama untuk permintaan sebelum pukul 15.00 WIB.',
  },
  {
    q: 'Apakah data kesehatan saya aman?',
    a: 'Data disimpan dalam rekam medis elektronik klinik dengan persetujuan eksplisit sesuai UU PDP 27/2022. Anda berhak meminta salinan dan mengajukan pembatasan pemrosesan.',
  },
  {
    q: 'Apakah bisa datang tanpa mendaftar lebih dulu?',
    a: 'Bisa, tetapi pasien yang mendaftar online lebih dulu mendapat prioritas slot. Kapasitas tiap slot dibatasi agar tiap sesi tetap mendapat waktu penuh.',
  },
];

const NAV = [
  { href: '#layanan', label: 'Layanan', Icon: Sparkles },
  { href: '#tim', label: 'Dokter & terapis', Icon: ShieldCheck },
  { href: '#tarif', label: 'Tarif layanan', Icon: Clock },
  { href: '#galeri', label: 'Ruang terapi', Icon: MapPin },
  { href: '#alur', label: 'Alur pendaftaran', Icon: CalendarCheck },
  { href: '#konsultasi', label: 'Konsultasi online', Icon: MessageCircle },
  { href: '#aplikasi', label: 'Aplikasi petugas', Icon: Download },
  { href: '#tanya', label: 'Tanya jawab', Icon: Volume2 },
  { href: '#kontak', label: 'Kontak & lokasi', Icon: Phone },
  { href: '/portal-pasien', label: 'Portal pasien', Icon: ShieldCheck },
];

export default function PublicClinicWebsitePage() {
  const [clinic, setClinic] = useState(FALLBACK_SIMKLINIK_DATA.clinic);
  // Daftar dimulai kosong, bukan dari data contoh. Data contoh klinik ini hanya
  // memuat 2 terapis dan 2 ruang, sedangkan basis data memuat 4 dan 3. Memakai
  // cadangan berarti menampilkan angka yang salah, jadi daftar dibiarkan kosong
  // sampai RPC benar-benar menjawab.
  const [therapists, setTherapists] = useState<typeof FALLBACK_SIMKLINIK_DATA.therapists>(
    [],
  );
  const [rooms, setRooms] = useState<typeof FALLBACK_SIMKLINIK_DATA.rooms>([]);
  const [tariffs, setTariffs] = useState<typeof FALLBACK_SIMKLINIK_DATA.tariffs>([]);
  // Selama false, REST snapshot belum benar-benar terbaca. Angka dan direktori
  // ditahan supaya data contoh tidak pernah tampil sebagai fakta klinik.
  const [live, setLive] = useState(false);
  // Fase bacaan mengikuti seksi yang sedang terlihat, supaya kolom gambar ikut
  // berganti seperti perilaku Upright. Nilainya 0..2 sesuai panjang FIGUR.
  const [fase, setFase] = useState(0);

  useEffect(() => {
    const sb = getClient();
    (async () => {
      try {
        const { data, error } = await ambilSnapshot(sb);
        if (!error && data) {
          if (data.clinic) setClinic(data.clinic);
          if (data.therapists) setTherapists(data.therapists);
          if (data.rooms) setRooms(data.rooms);
          if (data.tariffs) setTariffs(data.tariffs);
          setLive(true);
        } else {
          // RPC menjawab dengan galat. Angka ditahan pada tanda hubung dan daftar
          // tetap kosong; data contoh tidak pernah dipakai sebagai fakta klinik.
          console.warn('[portal] snapshot gagal:', error?.message ?? 'data kosong');
          setLive(true);
        }
      } catch {
        // RPC gagal total: halaman tetap terbaca, tetapi tanpa angka karangan.
        setLive(true);
      }
    })();
  }, []);

  // Ganti fase gambar saat seksi berikutnya masuk ke tengah layar.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const peta = new Map<string, number>(FASE_JANGKAR);
    const dilihat = new Set<string>();
    const pengamat = new IntersectionObserver(
      (entri) => {
        entri.forEach((e) => {
          const id = e.target.id;
          if (!peta.has(id)) return;
          if (e.isIntersecting) dilihat.add(id);
          else dilihat.delete(id);
        });
        let faseBaru = 0;
        dilihat.forEach((id) => {
          faseBaru = Math.max(faseBaru, peta.get(id) ?? 0);
        });
        setFase(faseBaru);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    FASE_JANGKAR.forEach(([id]) => {
      const el = document.getElementById(id);
      if (el) pengamat.observe(el);
    });
    return () => pengamat.disconnect();
  }, []);

  const activeTherapists = therapists.filter((t) => t.is_active);

  return (
    <div className="up-app">
      <aside className="up-side">
        <Link href="/" className="up-brand">
          <span className="up-brand-mark">
            <Volume2 size={14} /> Terapi wicara
          </span>
          <span className="up-brand-name">WicaraSehat</span>
          <span className="up-brand-sub">Klinik utama rehabilitasi medik - Kediri</span>
        </Link>

        <ul className="up-nav">
          {NAV.map(({ href, label, Icon }) => (
            <li key={href}>
              <a className="up-nav-link" href={href}>
                <Icon size={16} />
                {label}
              </a>
            </li>
          ))}
        </ul>

        <div className="up-side-foot">
          <p>
            Izin Dinkes <strong>{clinic.dinkes_license_number}</strong>
          </p>
          <p>
            Fasyankes <strong>{clinic.fasyankes_code}</strong> - {clinic.accreditation_status}
          </p>
          <a className="up-side-cta" href={`tel:${clinic.phone.replace(/\s/g, '')}`}>
            <Phone size={15} /> {clinic.phone}
          </a>
        </div>
      </aside>

      <div className="up-figure-col" aria-hidden="true">
        {FIGUR[fase].map((f, i) => (
          <figure className="up-figure" key={f.caption}>
            <img src={f.img} alt="" loading={i === 0 ? 'eager' : 'lazy'} />
            <figcaption>{f.caption}</figcaption>
          </figure>
        ))}
      </div>

      <main className="up-main">
        <section className="up-section up-hero ew-hero">
          <span className="up-kicker">Klinik terapi wicara keluarga</span>
          <h1 className="up-display">
            Setiap anak berhak <em>didengar</em>, setiap kata layak diperjuangkan
          </h1>
          <p className="up-lead">
            Layanan terapi wicara, bahasa, suara, dan menelan oleh terapis ber-STR dengan
            SIP aktif Dinas Kesehatan. Asesmen terukur, program individual, dan rekam medis
            elektronik yang terhubung SATUSEHAT.
          </p>
          <div className="up-actions">
            <a href="#daftar" className="up-btn up-btn--solid">
              Buat janji periksa <ArrowRight size={16} />
            </a>
            <a href="#layanan" className="up-btn up-btn--ghost">
              Lihat layanan
            </a>
          </div>
          <div className="up-stats">
            <div className="up-stat">
              <b>{live ? activeTherapists.length : '-'}</b>
              <span>terapis ber-SIP aktif</span>
            </div>
            <div className="up-stat">
              <b>{live ? rooms.length : '-'}</b>
              <span>ruang terapi kedap suara</span>
            </div>
            <div className="up-stat">
              <b>{live ? tariffs.length : '-'}</b>
              <span>layanan bertarif resmi</span>
            </div>
          </div>
        </section>

        <section className="up-section" id="layanan">
          <span className="up-eyebrow">Ruang lingkup pelayanan</span>
          <h2 className="up-title">
            Enam bidang <em>layanan klinis</em> terapi wicara
          </h2>
          <p className="up-sub">
            Informasi edukatif sesuai standar profesi, tanpa klaim penyembuhan instan.
            Setiap pasien dimulai dari asesmen, bukan dari paket yang dipaksakan.
          </p>
          <div className="up-grid">
            {SERVICES.map((s) => (
              <article className="up-card up-rise" key={s.title}>
                <span className="up-card-ico">
                  <ServiceGlyph kind={s.glyph} />
                </span>
                <h3>{s.title}</h3>
                <span className="up-card-code">{s.icd}</span>
                <p>{s.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="up-section" id="alur">
          <span className="up-eyebrow">Alur pasien baru</span>
          <h2 className="up-title">
            Empat langkah <em>sederhana</em> sebelum terapi dimulai
          </h2>
          <p className="up-sub">
            Setiap tahap tercatat di sistem klinik, jadi tidak ada permintaan yang
            menggantung tanpa tindak lanjut.
          </p>
          <div className="up-steps">
            {STEPS.map((s) => (
              <div className="up-step up-rise" key={s.n}>
                <span className="up-step-num">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="up-section" id="galeri">
          <span className="up-eyebrow">Di dalam klinik</span>
          <h2 className="up-title">
            Ruang yang dirancang untuk <em>mendengar</em>
          </h2>
          <p className="up-sub">
            Sesi berlangsung 45 menit di ruang kedap suara dengan kebisingan di bawah
            35 dB, dilengkapi cermin artikulasi dan jendela observasi satu arah agar
            orang tua bisa mengikuti tanpa mengganggu.
          </p>
          <figure className="up-shot">
            <img src={IMG_ASESSMEN} alt="Terapis mendampingi anak dalam sesi latihan bicara" loading="lazy" />
            <figcaption>
              <strong>Asesmen dulu, rencana terapi kemudian</strong>
              <span>
                Penilaian artikulasi, bahasa, suara, kelancaran, dan menelan dicatat
                sebagai angka awal. Tanpa angka awal, kemajuan tidak bisa dibuktikan.
              </span>
            </figcaption>
          </figure>
          <div className="up-gallery">
            {GALERI.map((g) => (
              <figure className="up-tile" key={g.label}>
                <img src={g.img} alt={g.label} loading="lazy" />
                <figcaption>{g.label}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="up-section" id="tarif">
          <span className="up-eyebrow">Transparansi biaya</span>
          <h2 className="up-title">
            Tarif resmi <em>tanpa</em> biaya tersembunyi
          </h2>
          <p className="up-sub">
            Harga di bawah dibaca langsung dari master tarif klinik. Bila tarif berubah,
            halaman ini ikut berubah.
          </p>
          <div className="up-price-list">
            {tariffs.length === 0 ? (
              <p className="up-sub" style={{ marginBottom: 0 }}>
                {live
                  ? 'Master tarif belum dapat dibaca dari basis data klinik. Silakan hubungi admisi untuk tarif terbaru.'
                  : 'Memuat tarif resmi dari master tarif klinik...'}
              </p>
            ) : null}
            {tariffs.slice(0, 6).map((t) => (
              <div className="up-price" key={t.id}>
                <span className="up-price-name">{t.service_name}</span>
                <span className="up-price-meta">
                  {t.service_code} - {t.duration_minutes} menit
                  {t.sessions_included > 1 ? ' - ' + t.sessions_included + ' sesi' : ''}
                  {t.icd9cm_code ? ' - ICD-9-CM ' + t.icd9cm_code : ''}
                </span>
                <span className="up-price-value">{formatRupiah(t.unit_price_idr)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="up-section" id="daftar">
          <span className="up-eyebrow">Terhubung ke meja admisi</span>
          <h2 className="up-title">
            Janji periksa, pendaftaran, dan <em>konsultasi</em> online
          </h2>
          <p className="up-sub">
            Pilih salah satu pintu masuk. Setiap permintaan tercatat di sistem klinik
            dengan kode unik, bukan sekadar pesan yang lewat.
          </p>
          <CareRequestForms clinicPhone={clinic.phone} />
        </section>

        <section className="up-section" id="konsultasi">
          <span className="up-eyebrow">Konsultasi online</span>
          <h2 className="up-title">
            Tanya dulu, <em>periksa</em> kemudian
          </h2>
          <p className="up-sub">
            Asisten multi-agen klinik membantu menyusun ringkasan keluhan dan menunjukkan
            bahan bacaan yang relevan sebelum Anda datang. Jawabannya bersifat analisa
            sementara, tidak menyimpan diagnosis, dan bukan keputusan klinis. Keputusan
            tetap di tangan dokter atau terapis setelah asesmen langsung.
          </p>
          <AiConsultAssistant />
        </section>

        <section className="up-section" id="aplikasi">
          <span className="up-eyebrow">Aplikasi pendamping</span>
          <h2 className="up-title">
            SIMKLINIK di <em>ponsel</em> terapis
          </h2>
          <p className="up-sub">
            Aplikasi Android untuk terapis dan petugas: agenda sesi, asesmen lima area,
            catatan SOAP, dan sinkronisasi ke rekam medis elektronik klinik. Dipakai
            dengan akun petugas, bukan untuk pasien.
          </p>
          <div className="up-card" style={{ maxWidth: 620 }}>
            <h3>WicaraSehat Terapis 1.0.0</h3>
            <span className="up-card-code">id.wicarasehat.terapis.rme - Android 8.0+</span>
            <p>
              Berkas APK ditandatangani untuk pemasangan langsung. Ponsel akan meminta izin
              memasang aplikasi dari luar Play Store - itu wajar untuk distribusi internal
              klinik. Berkas AAB disediakan bila aplikasi hendak diunggah ke Play Console.
            </p>
            <div className="up-actions" style={{ marginBottom: 0, marginTop: 18 }}>
              <a
                className="up-btn up-btn--solid"
                href="https://github.com/akvisomr-eng/RUNDINGAN-KREASI-MEDIA/releases/download/android-v1.0.0-6/WicaraSehat-Terapis-v1.0.0.apk"
              >
                <Download size={16} /> Unduh APK
              </a>
              <a
                className="up-btn up-btn--ghost"
                href="https://github.com/akvisomr-eng/RUNDINGAN-KREASI-MEDIA/releases/download/android-v1.0.0-6/WicaraSehat-Terapis-v1.0.0.aab"
              >
                Berkas AAB
              </a>
              <a
                className="up-btn up-btn--ghost"
                href="https://github.com/akvisomr-eng/RUNDINGAN-KREASI-MEDIA/releases"
                target="_blank"
                rel="noreferrer"
              >
                Semua versi
              </a>
            </div>
          </div>
        </section>

        <section className="up-section" id="tim">
          <span className="up-eyebrow">Direktori terapis</span>
          <h2 className="up-title">
            Terapis wicara dengan <em>SIP</em> aktif
          </h2>
          <p className="up-sub">
            Setiap terapis ber-STR seumur hidup dan memiliki SIP yang masih berlaku
            di Dinas Kesehatan Kota Kediri.
          </p>
          <div className="up-people">
            {activeTherapists.length === 0 ? (
              <p className="up-sub" style={{ marginBottom: 0 }}>
                {live
                  ? 'Direktori terapis belum dapat dibaca. Silakan hubungi klinik untuk informasi terapis yang bertugas.'
                  : 'Memuat direktori terapis dari basis data klinik...'}
              </p>
            ) : null}
            {activeTherapists.map((t) => (
              <div className="up-person" key={t.id}>
                <span className="up-avatar">{t.full_name.slice(0, 1)}</span>
                <div>
                  <h3>{t.full_name}</h3>
                  <p>
                    {t.degree_title} - SIP berlaku hingga {t.sip_valid_until}
                  </p>
                  <span className="up-person-code">{t.sip_number}</span>
                  <div className="up-tags">
                    {t.specializations.map((s) => (
                      <span className="up-tag" key={s}>
                        {s.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <h2 className="up-title" style={{ marginTop: 44 }}>
            Tiga ruang <em>kedap suara</em>
          </h2>
          <div className="up-grid">
            {rooms.length === 0 ? (
              <p className="up-sub" style={{ marginBottom: 0 }}>
                {live
                  ? 'Data ruang terapi belum dapat dibaca dari basis data klinik.'
                  : 'Memuat data ruang terapi...'}
              </p>
            ) : null}
            {rooms.map((r) => (
              <article className="up-card" key={r.id}>
                <span className="up-card-ico">
                  <MapPin size={20} />
                </span>
                <h3>{r.room_code}</h3>
                <p>{r.room_name}</p>
                <div className="up-tags" style={{ marginTop: 12 }}>
                  <span className="up-tag">{r.ambient_noise_db} dB</span>
                  {r.has_soundproofing ? <span className="up-tag">kedap suara</span> : null}
                  {r.has_observation_window ? (
                    <span className="up-tag">observasi wali</span>
                  ) : null}
                  <span className="up-tag">{r.sterilization_status}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="up-section">
          <div className="up-panel">
            <span className="up-eyebrow">Pelindungan data pasien</span>
            <h2 className="up-title">
              Rekam medis elektronik dengan <em>izin eksplisit</em>
            </h2>
            <p className="up-sub" style={{ marginBottom: 0 }}>
              Data kesehatan anak adalah data pribadi spesifik. Kami meminta persetujuan
              eksplisit sebelum menyimpan, membatasi siapa yang boleh membaca, dan mencatat
              setiap akses dalam jejak audit.
            </p>
            <ul>
              <li>
                <ShieldCheck size={17} /> Persetujuan UU PDP 27/2022 sebelum data disimpan
              </li>
              <li>
                <ShieldCheck size={17} /> Jejak audit setiap pembukaan rekam medis
              </li>
              <li>
                <ShieldCheck size={17} /> Retensi dan pemusnahan sesuai Permenkes 24/2022
              </li>
            </ul>
          </div>
        </section>

        <section className="up-section" id="tanya">
          <span className="up-eyebrow">Pertanyaan yang sering diajukan</span>
          <h2 className="up-title">
            Hal yang <em>perlu</em> Anda tahu
          </h2>
          <div className="up-faq">
            {FAQ.map((f, i) => (
              <details key={f.q} open={i === 0}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="up-section" id="kontak">
          <span className="up-eyebrow">Langkah pertama</span>
          <h2 className="up-title">
            Mulai dari percakapan, bukan dari <em>diagnosis</em>
          </h2>
          <p className="up-sub">
            Ceritakan keluhan anak Anda. Kami bantu menentukan langkah pertama yang tepat.
            Untuk kondisi darurat seperti sesak napas atau tersedak berat, hubungi layanan
            gawat darurat terdekat.
          </p>
          <div className="up-actions" style={{ marginBottom: 0 }}>
            <a href="#daftar" className="up-btn up-btn--solid">
              <CalendarCheck size={16} /> Daftar sekarang
            </a>
            <a href={`tel:${clinic.phone.replace(/\s/g, '')}`} className="up-btn up-btn--ghost">
              <Phone size={16} /> {clinic.phone}
            </a>
          </div>
        </section>

        <footer className="up-foot">
          <div className="up-foot-col">
            <h4>{clinic.name}</h4>
            <address>
              {clinic.address}, {clinic.city}, {clinic.province}
              <br />
              {clinic.phone}
              <br />
              Penanggung jawab medis: {clinic.head_of_clinic_name}
            </address>
          </div>
          <div className="up-foot-col">
            <h4>Untuk pasien</h4>
            <p>
              <a href="#daftar">Janji periksa</a>
              <br />
              <a href="#daftar">Pendaftaran online</a>
              <br />
              <a href="#tarif">Tarif layanan</a>
              <br />
              <Link href="/portal-pasien">Portal pasien</Link>
            </p>
          </div>
          <div className="up-foot-col">
            <h4>Kepatuhan</h4>
            <p>
              Izin Dinkes {clinic.dinkes_license_number}
              <br />
              Fasyankes {clinic.fasyankes_code}
              <br />
              Akreditasi {clinic.accreditation_status}
              <br />
              Terhubung SATUSEHAT
            </p>
          </div>
          <div className="up-foot-legal">
            (c) {new Date().getFullYear()} {clinic.name}. Seluruh hak dilindungi.
            Bahasa desain diadaptasi dari TemplateMo 555 Upright. Foto berlisensi
            domain publik (CC0 1.0 / Public Domain Mark 1.0) - bukan foto pasien klinik.
          </div>
        </footer>
      </main>
    </div>
  );
}
