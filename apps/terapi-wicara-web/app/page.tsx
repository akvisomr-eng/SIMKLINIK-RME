
'use client';

/**
 * Situs publik SIMKLINIK - halaman depan.
 *
 * Bahasa desain mengikuti TemplateMo 573 EduWell (lisensi bebas, termasuk untuk
 * situs komersial; yang tidak boleh hanya mendistribusikan ulang ZIP templatenya).
 * Seluruh markup dan CSS ditulis ulang untuk konteks klinik terapi wicara.
 *
 * Situs ini terpisah dari dasbor SIMKLINIK. Tidak ada tautan ke dasbor di sini:
 * petugas masuk lewat alamatnya sendiri, pasien memakai portal pasien.
 * Yang tetap menyatu adalah datanya - angka layanan, tarif, terapis, dan slot
 * dibaca dari basis data klinik yang sama, dan setiap pendaftaran masuk ke
 * meja admisi SIMKLINIK lewat RPC.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Ear,
  HeartHandshake,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Volume2,
} from 'lucide-react';
import { FALLBACK_SIMKLINIK_DATA, getBrowserSupabase } from '../src/lib/supabaseClient';
import { CareRequestForms } from '../src/components/CareRequestForms';
import {
  AiTriageFigure,
  AssessmentFigure,
  HeroSessionFigure,
  PrivacyFigure,
  ServiceGlyph,
  SwallowFigure,
} from '../src/components/siteIllustrations';

/** Format rupiah lokal, tidak bergantung pada ekspor tambahan dari pustaka klien. */
const formatRupiah = (v: number) => 'Rp' + (v ?? 0).toLocaleString('id-ID');

const SERVICES = [
  {
    glyph: 'bahasa' as const,
    title: 'Gangguan Bahasa',
    icd: 'ICD-10 F80.1 · F80.2 · F84.0 · R47.01',
    body:
      'Keterlambatan bicara-bahasa (speech delay), gangguan bahasa reseptif-ekspresif, komunikasi sosial pragmatik pada ASD/ADHD, serta rehabilitasi afasia pasca-stroke.',
  },
  {
    glyph: 'bicara' as const,
    title: 'Gangguan Bicara',
    icd: 'ICD-10 F80.0 · R47.1 · Q35–Q37',
    body:
      'Gangguan artikulasi dan fonologi anak, Childhood Apraxia of Speech (CAS), disartria neurogenik, serta terapi resonansi pasca-operasi celah bibir dan langit-langit.',
  },
  {
    glyph: 'suara' as const,
    title: 'Gangguan Suara',
    icd: 'ICD-10 R49.0 · J38.2',
    body:
      'Higienitas vokal dan fungsi fonasi pada nodul pita suara, paralisis plika vokalis, hipernasalitas, dan rehabilitasi pasca-laringektomi.',
  },
  {
    glyph: 'irama' as const,
    title: 'Kelancaran Bicara',
    icd: 'ICD-10 F98.5 · F98.6',
    body:
      'Penanganan gagap (stuttering) perkembangan anak hingga dewasa serta cluttering, memakai pendekatan modifikasi gagap dan pembentukan kelancaran.',
  },
  {
    glyph: 'menelan' as const,
    title: 'Menelan & Makan',
    icd: 'ICD-10 R13.10 · F98.2',
    body:
      'Asesmen menelan klinis berpanduan saturasi oksigen (SpO2), modifikasi diet standar IDDSI Level 0–7, dan terapi makan pediatrik.',
  },
  {
    glyph: 'aural' as const,
    title: 'Rehabilitasi Aural & AAC',
    icd: 'AVT · Augmentative Communication',
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

export default function PublicClinicWebsitePage() {
  const [clinic, setClinic] = useState(FALLBACK_SIMKLINIK_DATA.clinic);
  const [therapists, setTherapists] = useState(FALLBACK_SIMKLINIK_DATA.therapists);
  const [rooms, setRooms] = useState(FALLBACK_SIMKLINIK_DATA.rooms);
  const [tariffs, setTariffs] = useState(FALLBACK_SIMKLINIK_DATA.tariffs);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
    <div className="ew-body">
      {/* Bilah identitas resmi */}
      <div className="ew-bar">
        <div className="ew-bar-inner">
          <span>
            Izin Dinkes <strong>{clinic.dinkes_license_number}</strong>
            <span className="ew-bar-dot">·</span>
            Fasyankes <strong>{clinic.fasyankes_code}</strong>
          </span>
          <span>
            Akreditasi <strong>{clinic.accreditation_status}</strong>
            <span className="ew-bar-dot">·</span>
            Terhubung SATUSEHAT
          </span>
        </div>
      </div>

      {/* Kepala halaman */}
      <header className={solid ? 'ew-header is-solid' : 'ew-header'}>
        <div className="ew-header-inner">
          <Link href="/" className="ew-logo">
            <span className="ew-logo-mark">
              <Volume2 size={18} />
            </span>
            <span>
              <span className="ew-logo-name">WicaraSehat</span>
              <span className="ew-logo-sub">Klinik Terapi Wicara · Kediri</span>
            </span>
          </Link>

          <nav className="ew-nav">
            <a href="#layanan">Layanan</a>
            <a href="#tarif">Tarif</a>
            <a href="#alur">Alur</a>
            <a href="#tim">Terapis</a>
            <a href="#tanya">Pertanyaan</a>
            <Link href="/portal-pasien">Portal pasien</Link>
          </nav>

          <a href="#daftar" className="ew-btn ew-btn--white">
            <CalendarCheck size={15} /> Daftar online
          </a>
        </div>
      </header>

      {/* Banner utama */}
      <section className="ew-hero">
        <div className="ew-wrap ew-hero-grid">
          <div>
            <span className="ew-kicker">Klinik terapi wicara keluarga</span>
            <h1>
              Setiap anak berhak <em>didengar</em>, setiap kata layak diperjuangkan
            </h1>
            <p>
              Layanan terapi wicara, bahasa, suara, dan menelan oleh terapis ber-STR
              dengan SIP aktif Dinas Kesehatan. Asesmen terukur, program individual, dan
              rekam medis elektronik yang terhubung SATUSEHAT.
            </p>
            <div className="ew-hero-actions">
              <a href="#daftar" className="ew-btn ew-btn--grad">
                Buat janji periksa <ArrowRight size={16} />
              </a>
              <a href="#layanan" className="ew-btn ew-btn--ghost">
                Lihat layanan
              </a>
            </div>

            <div className="ew-hero-stats">
              <div className="ew-hero-stat">
                <strong>{activeTherapists.length}</strong>
                <span>terapis ber-SIP aktif</span>
              </div>
              <div className="ew-hero-stat">
                <strong>{rooms.length}</strong>
                <span>ruang terapi kedap suara</span>
              </div>
              <div className="ew-hero-stat">
                <strong>{tariffs.length}</strong>
                <span>layanan bertarif resmi</span>
              </div>
            </div>
          </div>

          <div className="ew-hero-card">
            <HeroSessionFigure />
            <ul className="ew-hero-list">
              <li>
                <CheckCircle2 size={16} /> Terapis ber-STR seumur hidup & SIP aktif
              </li>
              <li>
                <CheckCircle2 size={16} /> Ruang kedap suara dengan cermin artikulasi
              </li>
              <li>
                <CheckCircle2 size={16} /> Program terapi terukur, dievaluasi berkala
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Layanan */}
      <section className="ew-section" id="layanan">
        <div className="ew-wrap">
          <div className="ew-heading">
            <h6>Ruang lingkup pelayanan</h6>
            <h4>
              Enam bidang <em>layanan klinis</em> terapi wicara
            </h4>
            <p>
              Informasi edukatif sesuai standar profesi, tanpa klaim penyembuhan instan.
              Setiap pasien dimulai dari asesmen, bukan dari paket yang dipaksakan.
            </p>
          </div>

          <div className="ew-grid-3">
            {SERVICES.map((s) => (
              <article className="ew-card" key={s.title}>
                <span className="ew-service-icon">
                  <ServiceGlyph kind={s.glyph} />
                </span>
                <h3>{s.title}</h3>
                <span className="ew-icd">{s.icd}</span>
                <p>{s.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Alur */}
      <section className="ew-section ew-section--paper" id="alur">
        <div className="ew-wrap">
          <div className="ew-heading">
            <h6>Alur pasien baru</h6>
            <h4>
              Empat langkah <em>sederhana</em> sebelum terapi dimulai
            </h4>
          </div>

          <div className="ew-steps">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.n}>
                <div className="ew-step">
                  <span className="ew-num-tag">{s.n}</span>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </div>
                {i < STEPS.length - 1 ? (
                  <span className="ew-step-arrow" aria-hidden="true">
                    <ArrowRight size={18} />
                  </span>
                ) : null}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* Tiga sorotan bergambar */}
      <section className="ew-section">
        <div className="ew-wrap">
          <div className="ew-heading">
            <h6>Bagaimana kami bekerja</h6>
            <h4>
              Asesmen dulu, <em>baru</em> rencana terapi
            </h4>
          </div>

          <div className="ew-grid-3">
            <article className="ew-card">
              <AssessmentFigure />
              <h3>Asesmen terukur</h3>
              <p>
                Penilaian artikulasi, bahasa, suara, kelancaran, dan menelan dicatat
                sebagai angka awal. Tanpa angka awal, kemajuan tidak bisa dibuktikan.
              </p>
            </article>
            <article className="ew-card">
              <SwallowFigure />
              <h3>Asuhan menelan yang aman</h3>
              <p>
                Setiap sesi disfagia dipandu saturasi oksigen dan modifikasi tekstur
                IDDSI, karena tersedak saat terapi adalah risiko nyata.
              </p>
            </article>
            <article className="ew-card">
              <AiTriageFigure />
              <h3>Bantuan analisis, bukan keputusan</h3>
              <p>
                Asisten analisis membantu merangkum keluhan sebelum kunjungan. Hasilnya
                sementara dan bukan diagnosis; keputusan tetap milik terapis.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Tarif */}
      <section className="ew-section ew-section--paper" id="tarif">
        <div className="ew-wrap">
          <div className="ew-heading">
            <h6>Transparansi biaya</h6>
            <h4>
              Tarif resmi <em>tanpa</em> biaya tersembunyi
            </h4>
            <p>
              Harga di bawah dibaca langsung dari master tarif klinik. Bila tarif berubah,
              halaman ini ikut berubah.
            </p>
          </div>

          <div className="ew-grid-3">
            {tariffs.slice(0, 6).map((t) => (
              <article className="ew-session" key={t.id}>
                <div className="ew-session-top">
                  <span className="ew-icd">{t.service_code}</span>
                  {t.icd9cm_code ? <span className="ew-chip">{t.icd9cm_code}</span> : null}
                </div>
                <div className="ew-session-body">
                  <h3>{t.service_name}</h3>
                  <div className="ew-session-meta">
                    <span>
                      <Clock size={14} /> {t.duration_minutes} menit
                    </span>
                    {t.sessions_included > 1 ? <span>{t.sessions_included} sesi</span> : null}
                  </div>
                </div>
                <div className="ew-session-price">{formatRupiah(t.unit_price_idr)}</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Pendaftaran, janji periksa, konsultasi - semuanya menulis ke basis data */}
      <section className="ew-section" id="daftar">
        <div className="ew-wrap">
          <div className="ew-heading">
            <h6>Terhubung ke meja admisi</h6>
            <h4>
              Janji periksa, pendaftaran, dan <em>konsultasi</em> online
            </h4>
            <p>
              Pilih salah satu pintu masuk. Setiap permintaan tercatat di sistem klinik
              dengan kode unik, bukan sekadar pesan yang lewat.
            </p>
          </div>

          <CareRequestForms clinicPhone={clinic.phone} />
        </div>
      </section>

      {/* Tim & ruang */}
      <section className="ew-section ew-section--paper" id="tim">
        <div className="ew-wrap">
          <div className="ew-heading">
            <h6>Direktori terapis</h6>
            <h4>
              Terapis wicara dengan <em>SIP</em> aktif
            </h4>
          </div>

          <div className="ew-grid-2">
            <div className="ew-card">
              {activeTherapists.map((t) => (
                <div className="ew-person" key={t.id}>
                  <span className="ew-avatar">{t.full_name.slice(0, 1)}</span>
                  <div>
                    <h3>{t.full_name}</h3>
                    <p style={{ margin: '4px 0 6px' }}>
                      {t.degree_title} · SIP berlaku hingga {t.sip_valid_until}
                    </p>
                    <span className="ew-icd">{t.sip_number}</span>
                    <div className="ew-agent-row">
                      {t.specializations.map((s) => (
                        <span className="ew-chip" key={s}>
                          {s.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="ew-card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <MapPin size={18} /> Ruang terapi
              </h3>
              {rooms.map((r) => (
                <div key={r.id} style={{ marginBottom: 16 }}>
                  <strong style={{ fontSize: 15 }}>{r.room_code}</strong>
                  <p style={{ margin: '4px 0 6px' }}>{r.room_name}</p>
                  <div className="ew-agent-row">
                    <span className="ew-chip">{r.ambient_noise_db} dB</span>
                    {r.has_soundproofing ? <span className="ew-chip">kedap suara</span> : null}
                    {r.has_observation_window ? <span className="ew-chip">observasi wali</span> : null}
                    <span className="ew-chip ew-chip--live">{r.sterilization_status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Privasi */}
      <section className="ew-section">
        <div className="ew-wrap ew-grid-2" style={{ alignItems: 'center' }}>
          <div>
            <span className="ew-kicker">Pelindungan data pasien</span>
            <h4 style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.25 }}>
              Rekam medis elektronik dengan <em style={{ fontStyle: 'normal', color: 'var(--ew-blush)' }}>izin eksplisit</em>
            </h4>
            <p style={{ marginTop: 16 }}>
              Data kesehatan anak adalah data pribadi spesifik. Kami meminta persetujuan
              eksplisit sebelum menyimpan, membatasi siapa yang boleh membaca, dan mencatat
              setiap akses dalam jejak audit.
            </p>
            <ul className="ew-hero-list" style={{ marginTop: 18 }}>
              <li>
                <ShieldCheck size={16} /> Persetujuan UU PDP 27/2022 sebelum data disimpan
              </li>
              <li>
                <ShieldCheck size={16} /> Jejak audit setiap pembukaan rekam medis
              </li>
              <li>
                <ShieldCheck size={16} /> Retensi dan pemusnahan sesuai Permenkes 24/2022
              </li>
            </ul>
          </div>
          <PrivacyFigure />
        </div>
      </section>

      {/* Pertanyaan umum */}
      <section className="ew-section ew-section--paper" id="tanya">
        <div className="ew-wrap">
          <div className="ew-heading">
            <h6>Pertanyaan yang sering diajukan</h6>
            <h4>
              Hal yang <em>perlu</em> Anda tahu
            </h4>
          </div>

          <div className="ew-grid-2">
            {FAQ.map((f) => (
              <div className="ew-card" key={f.q}>
                <h3 style={{ fontSize: 17 }}>{f.q}</h3>
                <p style={{ marginTop: 10 }}>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ajakan terakhir */}
      <section className="ew-cta">
        <div className="ew-wrap">
          <h3>Mulai dari percakapan, bukan dari diagnosis</h3>
          <p>
            Ceritakan keluhan anak Anda. Kami bantu menentukan langkah pertama yang tepat.
          </p>
          <div className="ew-hero-actions" style={{ justifyContent: 'center' }}>
            <a href="#daftar" className="ew-btn ew-btn--white">
              <CalendarCheck size={16} /> Daftar sekarang
            </a>
            <a href={`tel:${clinic.phone.replace(/\s/g, '')}`} className="ew-btn ew-btn--ghost">
              <Phone size={16} /> {clinic.phone}
            </a>
          </div>
        </div>
      </section>

      {/* Kaki halaman */}
      <footer className="ew-foot">
        <div className="ew-wrap ew-foot-grid">
          <div>
            <span className="ew-logo-name">{clinic.name}</span>
            <p style={{ marginTop: 10 }}>
              {clinic.address}, {clinic.city}, {clinic.province}
            </p>
            <p style={{ marginTop: 6 }}>
              <Phone size={14} /> {clinic.phone}
            </p>
            <p style={{ marginTop: 6 }}>
              Penanggung jawab medis: {clinic.head_of_clinic_name}
            </p>
          </div>

          <div>
            <h6>Layanan</h6>
            <ul>
              {SERVICES.slice(0, 4).map((s) => (
                <li key={s.title}>
                  <a href="#layanan">{s.title}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h6>Untuk pasien</h6>
            <ul>
              <li>
                <a href="#daftar">Janji periksa</a>
              </li>
              <li>
                <a href="#daftar">Pendaftaran online</a>
              </li>
              <li>
                <a href="#tarif">Tarif layanan</a>
              </li>
              <li>
                <Link href="/portal-pasien">Portal pasien</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="ew-wrap ew-foot-bottom">
          <span>
            © {new Date().getFullYear()} {clinic.name}. Seluruh hak dilindungi.
          </span>
          <span>
            Bahasa desain diadaptasi dari TemplateMo 573 EduWell · Foto pasien tidak
            digunakan demi pelindungan data pribadi
          </span>
        </div>
      </footer>
    </div>
  );
}
