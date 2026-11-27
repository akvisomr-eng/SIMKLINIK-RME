
'use client';

/**
 * Portal pasien & keluarga.
 *
 * Sebelumnya halaman ini membuka diri dengan status "terverifikasi" dan
 * menampilkan data contoh sebagai rekam medis pasien. Itu berbahaya: keluarga
 * yang membuka portal melihat nama, diagnosis, dan tagihan orang lain tanpa
 * memverifikasi apa pun.
 *
 * Sekarang data hanya muncul setelah dua identitas cocok di server
 * (No. RM + tanggal lahir, Permenkes 24/2022). Tidak ada data cadangan yang
 * ditampilkan bila pencarian gagal.
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookOpenCheck,
  Calendar,
  CheckCircle2,
  FileCheck2,
  Loader2,
  Printer,
  Receipt,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { getKlien } from '../../src/lib/staffSession';

interface Pasien {
  id: string;
  medical_record_number: string;
  full_name: string;
  birth_date: string;
  gender: string;
  guardian_name: string;
  guardian_relation: string;
  referring_doctor: string;
  referring_diagnosis_name: string;
}

interface Tujuan {
  id: string;
  target: string;
  progress: number;
}

interface Rencana {
  id: string;
  status: string;
  tw_diagnosis_name: string;
  long_term_goal: string;
  short_term_goals: Tujuan[] | null;
  planned_sessions: number;
  completed_sessions: number;
}

interface Sesi {
  id: string;
  session_date: string;
  therapist_name: string;
  target_skill: string;
  accuracy_percentage: number;
  home_exercise_program: string;
  tte_certificate_serial: string;
  is_locked_tte: boolean;
}

interface Paket {
  id: string;
  package_name: string;
  total_sessions: number;
  used_sessions: number;
  remaining_sessions: number;
  valid_until: string;
}

interface Faktur {
  id: string;
  invoice_number: string;
  description: string;
  amount_idr: number;
  payment_status: string;
  payment_method: string;
  issued_at: string;
}

interface IsiPortal {
  patient: Pasien;
  care_plans: Rencana[];
  hep_list: Sesi[];
  packages: Paket[];
  invoices: Faktur[];
}

const rupiah = (nilai: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
    Number(nilai || 0),
  );

const tanggal = (nilai: string) => {
  if (!nilai) return '-';
  const d = new Date(nilai);
  return Number.isNaN(d.getTime()) ? nilai : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

export default function PortalPasienPage() {
  const [mrn, setMrn] = useState('');
  const [lahir, setLahir] = useState('');
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [isi, setIsi] = useState<IsiPortal | null>(null);

  async function cari(e: React.FormEvent) {
    e.preventDefault();
    setGalat(null);
    if (!mrn.trim() || !lahir) {
      setGalat('Isi nomor rekam medis dan tanggal lahir pasien.');
      return;
    }
    setMemuat(true);
    try {
      const { data, error } = await getKlien().rpc('tw_patient_portal_lookup', {
        p_mrn: mrn.trim().toUpperCase(),
        p_birth_date: lahir,
      });
      if (error) {
        setGalat(error.message);
        setIsi(null);
        return;
      }
      if (!data) {
        setGalat('Rekam medis tidak ditemukan untuk kombinasi tersebut.');
        setIsi(null);
        return;
      }
      setIsi(data as IsiPortal);
    } catch {
      setGalat('Koneksi ke server klinik gagal. Periksa jaringan Anda.');
    } finally {
      setMemuat(false);
    }
  }

  function keluar() {
    setIsi(null);
    setMrn('');
    setLahir('');
    setGalat(null);
  }

  return (
    <div className="ew-portal">
      <header className="ew-portal-head no-print">
        <Link href="/" className="ew-portal-back">
          <ArrowLeft size={15} /> Beranda klinik
        </Link>
        <div className="ew-portal-brand">
          <ShieldCheck size={17} />
          <span>
            <strong>Portal pasien &amp; keluarga</strong>
            <em>Ringkasan program terapi dan latihan rumah</em>
          </span>
        </div>
        {isi ? (
          <div className="ew-portal-head-act">
            <button type="button" className="ew-portal-btn" onClick={() => window.print()}>
              <Printer size={15} /> Cetak ringkasan
            </button>
            <button type="button" className="ew-portal-btn ew-portal-btn--ghost" onClick={keluar}>
              Tutup
            </button>
          </div>
        ) : null}
      </header>

      <main className="ew-portal-main">
        {!isi ? (
          <section className="ew-portal-card">
            <span className="ew-portal-kicker">Verifikasi dua identitas</span>
            <h1>Buka ringkasan terapi keluarga Anda</h1>
            <p className="ew-portal-lead">
              Masukkan dua data yang tertulis pada kartu berobat. Sistem mencocokkannya di server
              klinik; bila tidak cocok, tidak ada data apa pun yang ditampilkan.
            </p>

            <form onSubmit={cari} className="ew-portal-form" noValidate>
              <label>
                <span>Nomor rekam medis</span>
                <input
                  value={mrn}
                  onChange={(e) => setMrn(e.target.value.toUpperCase())}
                  placeholder="RM-TW-2026-0041"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <label>
                <span>Tanggal lahir pasien</span>
                <input type="date" value={lahir} onChange={(e) => setLahir(e.target.value)} />
              </label>
              <button type="submit" className="ew-portal-submit" disabled={memuat}>
                {memuat ? <Loader2 size={16} className="ew-spin" /> : <ShieldCheck size={16} />}
                {memuat ? 'Mencocokkan...' : 'Buka ringkasan'}
              </button>
            </form>

            {galat ? <div className="ew-portal-err">{galat}</div> : null}

            <p className="ew-portal-note">
              Data yang tampil hanya ringkasan: rencana terapi, latihan rumah, sisa paket, dan
              riwayat pembayaran. Catatan klinis lengkap hanya dibuka oleh petugas yang berwenang.
            </p>
          </section>
        ) : (
          <>
            <section className="ew-portal-card ew-portal-ident">
              <div>
                <span className="ew-portal-chip">{isi.patient.medical_record_number}</span>
                <h1>{isi.patient.full_name}</h1>
                <p>
                  Lahir {tanggal(isi.patient.birth_date)} &middot; {isi.patient.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                  {isi.patient.guardian_name ? ` · Wali: ${isi.patient.guardian_name}` : ''}
                </p>
                {isi.patient.referring_doctor ? (
                  <p className="ew-portal-sub">
                    Rujukan {isi.patient.referring_doctor}
                    {isi.patient.referring_diagnosis_name ? ` — ${isi.patient.referring_diagnosis_name}` : ''}
                  </p>
                ) : null}
              </div>
              <div className="ew-portal-head-act no-print">
                <button type="button" className="ew-portal-btn ew-portal-btn--ghost" onClick={keluar}>
                  Ganti pasien
                </button>
              </div>
            </section>

            <div className="ew-portal-grid">
              {isi.care_plans.length === 0 ? (
                <section className="ew-portal-card">
                  <h2 className="ew-portal-h2">Program terapi</h2>
                  <p className="ew-portal-empty">Belum ada rencana terapi yang diterbitkan.</p>
                </section>
              ) : (
                isi.care_plans.map((cp) => (
                  <section key={cp.id} className="ew-portal-card">
                    <div className="ew-portal-row">
                      <span className="ew-portal-chip ew-portal-chip--ok">{cp.status}</span>
                      <strong className="ew-portal-count">
                        {cp.completed_sessions} / {cp.planned_sessions} sesi
                      </strong>
                    </div>
                    <h2 className="ew-portal-h2">{cp.tw_diagnosis_name}</h2>
                    <p className="ew-portal-sub">{cp.long_term_goal}</p>
                    <div className="ew-portal-goals">
                      {(cp.short_term_goals ?? []).map((g) => (
                        <div key={g.id}>
                          <div className="ew-portal-goal-head">
                            <span>{g.target}</span>
                            <strong>{g.progress}%</strong>
                          </div>
                          <div className="ew-portal-bar">
                            <i style={{ width: `${Math.min(100, Math.max(0, g.progress))}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))
              )}
            </div>

            <section className="ew-portal-card">
              <h2 className="ew-portal-h2">
                <BookOpenCheck size={17} /> Latihan rumah dari terapis
              </h2>
              {isi.hep_list.length === 0 ? (
                <p className="ew-portal-empty">Belum ada catatan latihan rumah.</p>
              ) : (
                <div className="ew-portal-hep">
                  {isi.hep_list.map((s) => (
                    <article key={s.id} className="ew-portal-hep-item">
                      <div className="ew-portal-row">
                        <strong>{s.target_skill || 'Sesi terapi'}</strong>
                        <span className="ew-portal-chip ew-portal-chip--ok">
                          <FileCheck2 size={12} /> Akurasi {Number(s.accuracy_percentage || 0)}%
                        </span>
                      </div>
                      <p className="ew-portal-sub">
                        {tanggal(s.session_date)} &middot; {s.therapist_name}
                        {s.is_locked_tte && s.tte_certificate_serial
                          ? ` · TTE ${s.tte_certificate_serial}`
                          : ''}
                      </p>
                      {s.home_exercise_program ? (
                        <p className="ew-portal-hep-body">{s.home_exercise_program}</p>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <div className="ew-portal-grid">
              <section className="ew-portal-card">
                <h2 className="ew-portal-h2">
                  <Calendar size={17} /> Sisa paket terapi
                </h2>
                {isi.packages.length === 0 ? (
                  <p className="ew-portal-empty">Tidak ada paket aktif.</p>
                ) : (
                  isi.packages.map((p) => (
                    <div key={p.id} className="ew-portal-item">
                      <strong>{p.package_name}</strong>
                      <span>
                        Terpakai {p.used_sessions} dari {p.total_sessions} sesi &middot; sisa{' '}
                        <b>{p.remaining_sessions}</b> sesi
                      </span>
                      <span className="ew-portal-sub">Berlaku sampai {tanggal(p.valid_until)}</span>
                    </div>
                  ))
                )}
              </section>

              <section className="ew-portal-card">
                <h2 className="ew-portal-h2">
                  <Receipt size={17} /> Riwayat pembayaran
                </h2>
                {isi.invoices.length === 0 ? (
                  <p className="ew-portal-empty">Belum ada kwitansi.</p>
                ) : (
                  isi.invoices.map((inv) => (
                    <div key={inv.id} className="ew-portal-invoice">
                      <div>
                        <strong>{inv.invoice_number}</strong>
                        <span className="ew-portal-sub">{inv.description}</span>
                      </div>
                      <div className="ew-portal-invoice-right">
                        <strong>
                          <Wallet size={13} /> {rupiah(inv.amount_idr)}
                        </strong>
                        <span
                          className={
                            'ew-portal-chip' + (inv.payment_status === 'LUNAS' ? ' ew-portal-chip--ok' : '')
                          }
                        >
                          <CheckCircle2 size={11} /> {inv.payment_status}
                          {inv.payment_method ? ` · ${inv.payment_method}` : ''}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </section>
            </div>

            <p className="ew-portal-legal">
              Ditampilkan berdasarkan persetujuan yang tercatat pada rekam medis. Bila ada data yang
              tidak sesuai, hubungi admisi klinik &mdash; jangan bagikan tautan atau tangkapan layar
              halaman ini kepada pihak lain.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
