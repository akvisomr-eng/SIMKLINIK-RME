
'use client';

/**
 * Pintu masuk petugas SIMKLINIK.
 *
 * Halaman ini adalah halaman penerimaan (landing) untuk petugas, bukan deretan
 * kartu tujuan. Tugasnya menjawab empat pertanyaan sebelum orang mengetik PIN:
 * ini sistem apa, ruang kerja mana yang saya butuhkan, peran saya membuka apa,
 * dan bagaimana keamanan datanya dijaga.
 *
 * Kendali akses tetap di server: peran dibaca dari kolom access_role lewat
 * tw_staff_login, bukan dari pilihan di peramban. Tidak ada tombol yang bisa
 * menaikkan hak akses sendiri.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Network,
  ScrollText,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import {
  LABEL_PERAN,
  getKlien,
  periksaSesi,
  simpanToken,
  type PeranPetugas,
  type SesiPetugas,
} from '../../src/lib/staffSession';

interface HasilMasuk {
  ok?: boolean;
  code?: string;
  message?: string;
  session_token?: string;
  access_role?: PeranPetugas;
}

const STATISTIK = [
  { angka: '16', label: 'modul operasional' },
  { angka: '5', label: 'peran petugas' },
  { angka: '3', label: 'lapis kendali akses' },
  { angka: '12', label: 'jam masa sesi' },
];

const RUANG = [
  {
    href: '/simklinik',
    Icon: Stethoscope,
    judul: 'Ruang kerja klinik',
    isi: 'Admisi, rekam medis elektronik, kasir paket sesi, sterilisasi, mutu, dan jejak audit. Modul yang terbuka mengikuti peran akun Anda.',
    label: 'Masuk dengan akun petugas',
    perluAkun: true,
  },
  {
    href: '/enterprise',
    Icon: Network,
    judul: 'Konsol jaringan',
    isi: 'Pemantauan multi-cabang, konsolidasi indikator mutu, dan tata kelola pusat. Terbuka untuk kepala klinik.',
    label: 'Buka konsol jaringan',
    perluAkun: true,
  },
  {
    href: '/portal-pasien',
    Icon: Smartphone,
    judul: 'Portal pasien',
    isi: 'Keluarga melihat jadwal, catatan latihan rumah, dan sisa paket sesi memakai nomor rekam medis dan tanggal lahir pasien.',
    label: 'Buka portal pasien',
    perluAkun: false,
  },
];

const PERAN: Array<{ kode: PeranPetugas; modul: string; isi: string }> = [
  {
    kode: 'KEPALA_KLINIK',
    modul: 'Seluruh 16 modul',
    isi: 'SDM dan SIP tenaga, master tarif, RBAC, jejak audit, serta konsol jaringan.',
  },
  {
    kode: 'ADMISI_RME',
    modul: 'Admisi, RME, SATUSEHAT, SOP, jadwal, paket, rujukan',
    isi: 'Pendaftaran, consent, penjadwalan, dan berkas rekam medis. Catatan klinis dibaca, tidak diubah.',
  },
  {
    kode: 'TERAPIS_WICARA',
    modul: 'RME, SOP, jadwal, sterilisasi, insiden, rujukan',
    isi: 'Agenda sesi, asesmen lima ranah, catatan SOAP, dan rujukan interprofesional.',
  },
  {
    kode: 'KASIR_KEUANGAN',
    modul: 'Kasir, tarif, jadwal',
    isi: 'Kwitansi, paket sesi, dan tarif. Catatan klinis dan data SDM tetap tertutup.',
  },
  {
    kode: 'MUTU_DINKES',
    modul: 'SATUSEHAT, sarpras, mutu INM, RBAC dan audit, tarif',
    isi: 'Indikator mutu, PPI, insiden keselamatan, dan pelaporan Dinas Kesehatan.',
  },
];

const ALUR = [
  {
    Icon: UserRound,
    judul: 'Masukkan ID pegawai',
    isi: 'Nomor pegawai yang diterbitkan kepala klinik, misalnya TW-2023-001. Huruf besar dan kecil tidak dibedakan.',
  },
  {
    Icon: KeyRound,
    judul: 'PIN diperiksa server',
    isi: 'PIN enam sampai delapan angka dicocokkan dengan hash bcrypt di basis data. PIN tidak pernah dikirim balik ke peramban.',
  },
  {
    Icon: ShieldCheck,
    judul: 'Peran menentukan menu',
    isi: 'Server membaca peran dari akun, menerbitkan token sesi, lalu hanya memuat modul serta data yang menjadi hak peran itu.',
  },
  {
    Icon: ScrollText,
    judul: 'Setiap aksi tercatat',
    isi: 'Pembukaan rekam medis, perubahan data, dan pencetakan dokumen masuk jejak audit atas nama pemegang akun.',
  },
];

const JAMINAN = [
  {
    judul: 'PIN tidak disimpan sebagai teks',
    isi: 'Basis data hanya menyimpan hash bcrypt. Tidak ada mekanisme apa pun yang dapat menampilkan kembali PIN asli petugas.',
  },
  {
    judul: 'Sesi berbatas waktu',
    isi: 'Token sesi berlaku 12 jam, tersimpan per perangkat, dan dicabut seketika saat petugas menekan keluar.',
  },
  {
    judul: 'Data pasien tidak terbuka lewat tabel',
    isi: 'Rekam medis hanya dibaca lewat fungsi server dengan penyaringan peran. Kolom rahasia seperti NIK dan kode PIN dibuang dari keluaran.',
  },
  {
    judul: 'Dasar hukum yang jelas',
    isi: 'UU PDP No. 27/2022 mengatur persetujuan dan jejak akses; Permenkes No. 24/2022 mengatur rekam medis elektronik dan retensinya.',
  },
];

const TANYA = [
  {
    t: 'Saya lupa PIN. Apakah bisa dikirim lewat pesan?',
    j: 'Tidak. PIN tidak dapat dikirim lewat pesan atau surel. Kepala klinik mengatur ulang PIN dari modul SDM, dan setiap pengaturan ulang tercatat di jejak audit.',
  },
  {
    t: 'Sesi saya berakhir di tengah pekerjaan.',
    j: 'Masa sesi 12 jam sejak masuk. Setelah itu Anda diminta masuk ulang. Data yang sudah tersimpan tidak hilang; simpan catatan sesi sebelum meninggalkan meja.',
  },
  {
    t: 'Klinik kami belum punya akun petugas.',
    j: 'Akun dibuat oleh kepala klinik lewat modul SDM: nomor pegawai, peran, dan PIN awal. Tanpa akun, halaman ini memang tidak bisa dilewati.',
  },
  {
    t: 'Bolehkah satu akun dipakai bergantian?',
    j: 'Tidak. Jejak audit menempel pada akun, bukan pada orang di depan layar. Akun bersama membuat pertanggungjawaban rekam medis menjadi kabur.',
  },
  {
    t: 'Kenapa peran tidak bisa saya pilih sendiri?',
    j: 'Peran dibaca dari basis data saat masuk. Kalau peran bisa dipilih di layar, siapa pun dapat menaikkan hak aksesnya sendiri hanya dengan mengubah pilihan.',
  },
];

export default function MasukPage() {
  const [pegawai, setPegawai] = useState('');
  const [pin, setPin] = useState('');
  const [lihatPin, setLihatPin] = useState(false);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [sesiLama, setSesiLama] = useState<SesiPetugas | null>(null);

  useEffect(() => {
    let hidup = true;
    periksaSesi().then((s) => {
      if (hidup && s) setSesiLama(s);
    });
    return () => {
      hidup = false;
    };
  }, []);

  async function masuk(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    if (!pegawai.trim()) {
      setGalat('ID pegawai belum diisi.');
      return;
    }
    if (!/^[0-9]{6,8}$/.test(pin)) {
      setGalat('PIN terdiri dari 6 sampai 8 angka.');
      return;
    }

    setMemuat(true);
    try {
      const { data, error } = await getKlien().rpc('tw_staff_login', {
        p_employee_number: pegawai.trim().toUpperCase(),
        p_pin: pin,
        p_device: 'WEB_DASBOR',
      });
      if (error) {
        setGalat('Layanan masuk tidak dapat dijangkau. Coba lagi sebentar lagi.');
        return;
      }
      const d = data as HasilMasuk | null;
      if (!d?.ok || !d.session_token) {
        setGalat(d?.message ?? 'ID pegawai atau PIN tidak cocok.');
        return;
      }
      try {
        simpanToken(d.session_token);
      } catch {
        setGalat('Peramban menolak menyimpan sesi. Aktifkan penyimpanan situs lalu coba lagi.');
        return;
      }
      window.location.replace('/simklinik');
    } catch {
      setGalat('Koneksi ke server klinik gagal. Periksa jaringan Anda.');
    } finally {
      setMemuat(false);
    }
  }

  return (
    <div className="ew-lp">
      <header className="ew-lp-bar">
        <Link className="ew-lp-brand" href="/">
          <span className="ew-logo-mark">
            <ShieldCheck size={18} />
          </span>
          <span>
            <span className="ew-lp-brand-nama">SIMKLINIK</span>
            <span className="ew-lp-brand-sub">WicaraSehat Kediri</span>
          </span>
        </Link>

        <nav className="ew-lp-nav">
          <a href="#akses">Ruang kerja</a>
          <a href="#peran">Peran</a>
          <a href="#alur">Alur masuk</a>
          <a href="#keamanan">Keamanan</a>
          <a href="#bantuan">Bantuan</a>
        </nav>

        <span className="ew-lp-bar-aksi">
          <Link className="ew-lp-ghost" href="/">
            Situs layanan
          </Link>
          <a className="ew-lp-mini" href="#masuk">
            Masuk
            <ArrowRight size={14} />
          </a>
        </span>
      </header>

      <section className="ew-lp-hero">
        <div className="ew-lp-hero-teks">
          <span className="ew-lp-pill">
            <BadgeCheck size={14} /> Akreditasi Paripurna · Fasyankes 3571042001
          </span>
          <h1>
            Ruang kerja klinik yang mencatat setiap tindakan atas{' '}
            <em>nama petugasnya</em>
          </h1>
          <p>
            SIMKLINIK adalah rekam medis elektronik Klinik Utama Rehabilitasi Medik dan Terapi
            Wicara WicaraSehat Kediri. Masuk dengan ID pegawai dan PIN pribadi. Peran Anda diambil
            dari basis data, bukan dipilih di layar ini.
          </p>

          <div className="ew-lp-hero-tombol">
            <a className="ew-btn ew-btn--grad" href="#masuk">
              Masuk ke ruang kerja
              <ArrowRight size={16} />
            </a>
            <a className="ew-lp-garis" href="#akses">
              Lihat tiga ruang kerja
            </a>
          </div>

          <dl className="ew-lp-stat">
            {STATISTIK.map((s) => (
              <div key={s.label}>
                <dt>{s.angka}</dt>
                <dd>{s.label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="ew-lp-hero-kartu" id="masuk">
          <div className="ew-auth-card ew-lp-authcard">
            <header>
              <span className="ew-auth-badge">Akses terbatas</span>
              <h2>Masuk ke SIMKLINIK</h2>
              <p>
                Gunakan akun yang diberikan kepala klinik. Jangan berbagi PIN antar petugas.
              </p>
            </header>

            {sesiLama ? (
              <div className="ew-note ew-note--ok" style={{ marginBottom: 18 }}>
                <ShieldCheck size={16} />
                <span>
                  Sesi masih aktif atas nama <strong>{sesiLama.full_name}</strong> dengan peran{' '}
                  <strong>{LABEL_PERAN[sesiLama.access_role]}</strong>.{' '}
                  <Link href="/simklinik">Lanjutkan ke ruang kerja</Link> atau masuk dengan akun
                  lain di bawah.
                </span>
              </div>
            ) : null}

            <form onSubmit={masuk} noValidate>
              <label className="ew-auth-field">
                <span>ID pegawai</span>
                <span className="ew-auth-input">
                  <UserRound size={16} />
                  <input
                    value={pegawai}
                    onChange={(e) => setPegawai(e.target.value.toUpperCase())}
                    placeholder="Contoh: TW-2023-001"
                    autoComplete="username"
                    autoCapitalize="characters"
                    spellCheck={false}
                  />
                </span>
              </label>

              <label className="ew-auth-field">
                <span>PIN</span>
                <span className="ew-auth-input">
                  <KeyRound size={16} />
                  <input
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                    placeholder="6 sampai 8 angka"
                    inputMode="numeric"
                    autoComplete="current-password"
                    type={lihatPin ? 'text' : 'password'}
                  />
                  <button
                    type="button"
                    className="ew-auth-peek"
                    onClick={() => setLihatPin(!lihatPin)}
                    aria-label={lihatPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                  >
                    {lihatPin ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </span>
              </label>

              {galat ? (
                <div className="ew-note ew-note--err" style={{ marginTop: 14 }}>
                  <Lock size={15} /> {galat}
                </div>
              ) : null}

              <button type="submit" className="ew-auth-submit" disabled={memuat}>
                {memuat ? <Loader2 size={16} className="ew-spin" /> : null}
                {memuat ? 'Memeriksa akun...' : 'Masuk'}
                {memuat ? null : <ArrowRight size={16} />}
              </button>
            </form>

            <div className="ew-lp-authkaki">
              <span>
                <Lock size={12} /> PIN tidak pernah dikirim balik
              </span>
              <a href="#bantuan">Lupa PIN atau butuh bantuan?</a>
            </div>
          </div>

          <div className="ew-lp-bukanpetugas">
            <strong>Bukan petugas?</strong>
            <span>
              Keluarga pasien memakai{' '}
              <Link href="/portal-pasien">portal pasien</Link>, dan informasi layanan ada di{' '}
              <Link href="/">situs klinik</Link>.
            </span>
          </div>
        </div>
      </section>

      <section className="ew-lp-seksi" id="akses">
        <span className="ew-lp-eyebrow">Tiga ruang, satu akun</span>
        <h2 className="ew-lp-judul">
          Pilih ruang kerja sesuai <em>tugas</em> Anda
        </h2>
        <p className="ew-lp-sub">
          Akun yang sama dapat membuka lebih dari satu ruang, tetapi isi setiap ruang tetap
          disaring oleh peran. Tidak ada tautan yang bisa melewati penyaringan itu.
        </p>

        <div className="ew-lp-ruang">
          {RUANG.map((r) => (
            <article className="ew-lp-ruang-kartu" key={r.href}>
              <span className="ew-lp-ruang-ikon">
                <r.Icon size={20} />
              </span>
              <h3>{r.judul}</h3>
              <p>{r.isi}</p>
              <Link className="ew-lp-ruang-tautan" href={r.href}>
                {r.label}
                <ArrowRight size={15} />
              </Link>
              <span className="ew-lp-ruang-tanda">
                {r.perluAkun ? 'Perlu akun petugas' : 'Tanpa akun petugas'}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="ew-lp-seksi ew-lp-seksi--kertas" id="peran">
        <span className="ew-lp-eyebrow">Hak akses per peran</span>
        <h2 className="ew-lp-judul">
          Lima peran, dan apa yang <em>terbuka</em> bagi masing-masing
        </h2>
        <p className="ew-lp-sub">
          Peran ditetapkan kepala klinik dan disimpan di basis data. Daftar di bawah adalah
          ringkasan; rincian modul dan tabel ada di dokumen hak akses peran.
        </p>

        <div className="ew-lp-peran">
          {PERAN.map((p) => (
            <article className="ew-lp-peran-kartu" key={p.kode}>
              <span className="ew-lp-peran-kode">{p.kode.replace(/_/g, ' ')}</span>
              <h3>{LABEL_PERAN[p.kode]}</h3>
              <p>{p.isi}</p>
              <span className="ew-lp-peran-modul">{p.modul}</span>
            </article>
          ))}
        </div>

        <div className="ew-note ew-note--info ew-lp-catatan">
          <Lock size={16} />
          <span>
            Tidak ada pemilih peran di halaman ini. Kalau peran bisa dipilih sendiri, kendali akses
            hanya menjadi hiasan.
          </span>
        </div>
      </section>

      <section className="ew-lp-seksi" id="alur">
        <span className="ew-lp-eyebrow">Alur masuk</span>
        <h2 className="ew-lp-judul">
          Empat langkah, masing-masing <em>terperiksa</em>
        </h2>
        <p className="ew-lp-sub">
          Dari mengetik ID pegawai sampai aksi pertama tercatat, semuanya terjadi di server klinik.
        </p>

        <ol className="ew-lp-alur">
          {ALUR.map((a, i) => (
            <li key={a.judul}>
              <span className="ew-lp-alur-no">{String(i + 1).padStart(2, '0')}</span>
              <span className="ew-lp-alur-ikon">
                <a.Icon size={17} />
              </span>
              <h3>{a.judul}</h3>
              <p>{a.isi}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="ew-lp-seksi ew-lp-gelap" id="keamanan">
        <div className="ew-lp-gelap-kiri">
          <span className="ew-lp-eyebrow ew-lp-eyebrow--terang">Pelindungan data</span>
          <h2 className="ew-lp-judul ew-lp-judul--terang">
            Rekam medis anak adalah data pribadi yang <em>spesifik</em>
          </h2>
          <p className="ew-lp-sub ew-lp-sub--terang">
            Karena itu aksesnya dibatasi berlapis: siapa yang boleh masuk, modul apa yang terbuka,
            dan baris mana yang boleh dibaca. Setiap lapisan meninggalkan jejak.
          </p>
          <div className="ew-lp-gelap-tanda">
            <span>
              <ShieldCheck size={13} /> UU PDP 27/2022
            </span>
            <span>
              <ScrollText size={13} /> Permenkes 24/2022
            </span>
            <span>
              <Building2 size={13} /> SATUSEHAT
            </span>
          </div>
        </div>

        <ul className="ew-lp-jaminan">
          {JAMINAN.map((j) => (
            <li key={j.judul}>
              <strong>{j.judul}</strong>
              <span>{j.isi}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="ew-lp-seksi ew-lp-seksi--kertas" id="bantuan">
        <span className="ew-lp-eyebrow">Bantuan</span>
        <h2 className="ew-lp-judul">
          Hal yang paling sering <em>ditanyakan</em> petugas
        </h2>
        <p className="ew-lp-sub">
          Kalau jawabannya belum ada di sini, hubungi kepala klinik atau admin SIMKLINIK klinik
          Anda.
        </p>

        <div className="ew-lp-tanya">
          {TANYA.map((q) => (
            <details key={q.t}>
              <summary>
                {q.t}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{q.j}</p>
            </details>
          ))}
        </div>

        <div className="ew-lp-bantuan-kartu">
          <div>
            <strong>Butuh akun baru atau PIN diatur ulang?</strong>
            <span>Pengaturan ulang PIN hanya dilakukan kepala klinik dari modul SDM.</span>
          </div>
          <Link className="ew-lp-garis" href="/">
            Kembali ke situs layanan
          </Link>
        </div>
      </section>

      <footer className="ew-lp-kaki">
        <div>
          <strong>SIMKLINIK</strong>
          <span>
            Klinik Utama Rehabilitasi Medik dan Terapi Wicara WicaraSehat, Kota Kediri. Fasyankes
            3571042001.
          </span>
        </div>
        <nav>
          <Link href="/">Situs layanan</Link>
          <Link href="/portal-pasien">Portal pasien</Link>
          <Link href="/masuk">Masuk petugas</Link>
        </nav>
        <p>
          Akses ke rekam medis diatur UU PDP No. 27/2022 dan Permenkes No. 24/2022. Setiap
          pembukaan, perubahan, dan penghapusan data pasien dicatat dalam jejak audit.
        </p>
      </footer>
    </div>
  );
}
