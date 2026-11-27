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
 * Foto: Unsplash (lisensi Unsplash: gratis untuk komersial, tanpa atribusi
 * wajib). Tidak ada foto pasien klinik - semua gambar stok berlisensi.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarCheck,
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { FALLBACK_SIMKLINIK_DATA, getBrowserSupabase } from '../src/lib/supabaseClient';
import { CareRequestForms } from '../src/components/CareRequestForms';
import { ServiceGlyph } from '../src/components/siteIllustrations';

const formatRupiah = (v: number) => 'Rp' + (v ?? 0).toLocaleString('id-ID');

/** Foto Unsplash: parameter w dan q mengecilkan berkas agar halaman ringan. */
const U = (id: string, w: number) =>
  'https://images.unsplash.com/' + id + '?auto=format&fit=crop&w=' + w + '&q=72';

const IMG_HERO_1 = U('photo-1758598737516-ffd38ba74838', 520);
const IMG_HERO_2 = U('photo-1771765767087-ce71e4a7916a', 520);
const IMG_HERO_3 = U('photo-1758598737505-90a3084105ac', 520);
const IMG_ASESSMEN = U('photo-1758598737516-ffd38ba74838', 1200);
const IMG_TERAPI = U('photo-1771765767087-ce71e4a7916a', 900);
const IMG_ANAK = U('photo-1786292949404-084cbd10c7b1', 900);
const IMG_TANGAN = U('photo-1728138240695-54ebc33215f2', 900);
const IMG_DEWASA = U('photo-1758273240373-370993d0275d', 900);
const IMG_RUANG = U('photo-1728138127500-fb73c1313f76', 900);

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
  { href: '#alur', label: 'Alur pasien', Icon: ArrowRight },
  { href: '#galeri', label: 'Ruang terapi', Icon: MapPin },
  { href: '#tarif', label: 'Tarif', Icon: Clock },
  { href: '#daftar', label: 'Daftar online', Icon: CalendarCheck },
  { href: '#tim', label: 'Terapis', Icon: ShieldCheck },
  { href: '#tanya', label: 'Pertanyaan', Icon: MessageCircle },
];

export default function PublicClinicWebsitePage() {
  const [clinic, setClinic] = useState(FALLBACK_SIMKLINIK_DATA.clinic);
  const [therapists, setTherapists] = useState(FALLBACK_SIMKLINIK_DATA.therapists);
  const [rooms, setRooms] = useState(FALLBACK_SIMKLINIK_DATA.rooms);
  const [tariffs, setTariffs] = useState(FALLBACK_SIMKLINIK_DATA.tariffs);

  useEffect(() => {
    const sb = getBrowserSupabase();
    if (!sb) return;
    (async () => {
      try {
        const { data, error } = await sb.rpc('tw_public_portal_snapshot', {
          p_clinic_code: 'KLN-TW-KDR-01',
        });
        if (!error && data) {
          if (data.clinic) setClinic(data.clinic);
          if (data.therapists) setTherapists(data.therapists);
          if (data.rooms) setRooms(data.rooms);
          if (data.tariffs) setTariffs(data.tariffs);
        }
      } catch {
        // Data contoh sudah terpasang; halaman tetap terbaca.
      }
    })();
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
          <li>
            <Link className="up-nav-link" href="/portal-pasien">
              <ShieldCheck size={16} />
              Portal pasien
            </Link>
          </li>
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
        <figure className="up-figure">
          <img src={IMG_HERO_1} alt="" loading="eager" />
          <figcaption>Sesi terapi tatap muka bersama terapis wicara</figcaption>
        </figure>
        <figure className="up-figure">
          <img src={IMG_HERO_2} alt="" loading="lazy" />
          <figcaption>Latihan artikulasi dan bahasa anak</figcaption>
        </figure>
        <figure className="up-figure">
          <img src={IMG_HERO_3} alt="" loading="lazy" />
          <figcaption>Pendampingan orang tua di setiap sesi</figcaption>
        </figure>
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
              <b>{activeTherapists.length}</b>
              <span>terapis ber-SIP aktif</span>
            </div>
            <div className="up-stat">
              <b>{rooms.length}</b>
              <span>ruang terapi kedap suara</span>
            </div>
            <div className="up-stat">
              <b>{tariffs.length}</b>
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

        <section className="up-section">
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
            Bahasa desain diadaptasi dari TemplateMo 555 Upright. Foto: Unsplash,
            digunakan sesuai lisensi Unsplash - bukan foto pasien klinik.
          </div>
        </footer>
      </main>
    </div>
  );
}
