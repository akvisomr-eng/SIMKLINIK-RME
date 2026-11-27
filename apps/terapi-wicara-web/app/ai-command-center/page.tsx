
'use client';

/**
 * Pusat analisa & orkestrasi AI - modul dasbor, bukan halaman publik.
 *
 * Halaman ini menggantikan tombol "Pusat Komando AI" yang dulu dipasang di
 * situs publik. Kemampuannya tetap ada, tetapi di tempat yang benar: di dalam
 * ruang kerja petugas, di balik halaman masuk.
 *
 * Batas peran yang dijaga:
 *  - Agen hanya mengumpulkan temuan, bahan bacaan, dan usulan perbaikan.
 *  - Tidak ada agen yang menegakkan diagnosis atau mengubah data pasien.
 *  - Tindakan yang menyentuh skema wajib lewat persetujuan manusia.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  BookOpen,
  CheckCircle2,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://fawmudsaaotlqyryciwd.supabase.co';
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  'sb_publishable_wRGUQNJKi5XUjMXHFpDxVw_hPAPyhUc';

interface Agen {
  agent_key: string;
  agent_name: string;
  role: string;
  mission: string;
  autonomy_level: string;
  health_status: string;
  schedule_cron: string;
  queue_depth: number;
  success_rate: number | null;
  successful_runs: number;
  last_status: string | null;
}

interface Temuan {
  finding_code: string;
  title: string;
  severity: string;
  status: string;
  description: string;
  recommendation: string;
  regulation_reference: string | null;
  detected_by_agent: string;
}

interface Snapshot {
  agents?: Agen[];
  totals?: {
    agents_active?: number;
    agents_degraded?: number;
    runs_pending?: number;
    runs_done?: number;
    runs_failed?: number;
  };
  security_score?: number;
  security_findings?: Temuan[];
  knowledge?: {
    total?: number;
    verified?: number;
    by_category?: Record<string, number>;
  };
  knowledge_gaps?: Array<{ question: string; intent: string | null }>;
  generated_at?: string;
}

const WARNA_SEHAT: Record<string, string> = {
  SEHAT: '#0F766E',
  DEGRADASI: '#B45309',
  KRITIS: '#B91C1C',
  MATI: '#6B7280',
};

export default function PusatAnalisaAiPage() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  async function muat() {
    setMemuat(true);
    setGalat(null);
    try {
      const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
      const { data, error } = await sb.rpc('tw_ai_command_center_snapshot');
      if (error) {
        setGalat(error.message);
      } else {
        setSnap((data ?? null) as Snapshot | null);
      }
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Tidak dapat menghubungi basis data.');
    } finally {
      setMemuat(false);
    }
  }

  useEffect(() => {
    muat();
  }, []);

  const agen = snap?.agents ?? [];
  const temuan = snap?.security_findings ?? [];
  const total: NonNullable<Snapshot['totals']> = snap?.totals ?? {};
  const kategori = snap?.knowledge?.by_category ?? {};

  return (
    <div className="ew-body" style={{ minHeight: '100vh', background: '#FBF9F7' }}>
      <header className="ew-header is-solid" style={{ position: 'static' }}>
        <div className="ew-header-inner">
          <span className="ew-logo">
            <span className="ew-logo-mark">
              <Bot size={18} />
            </span>
            <span>
              <span className="ew-logo-name">Pusat analisa AI</span>
              <span className="ew-logo-sub">Modul internal SIMKLINIK</span>
            </span>
          </span>
          <Link className="ew-text-btn" href="/masuk" style={{ textDecoration: 'none' }}>
            <ArrowLeft size={15} /> Kembali ke pintu masuk
          </Link>
        </div>
      </header>

      <section className="ew-wrap" style={{ padding: '48px 24px 0' }}>
        <span className="ew-kicker">Tujuh agen, satu pengawasan</span>
        <h1 style={{ fontSize: 32, fontWeight: 900, lineHeight: 1.2, margin: '12px 0 0' }}>
          Analisa <em style={{ fontStyle: 'normal', color: 'var(--ew-blush)' }}>berlapis</em> sebelum
          diambil keputusan
        </h1>
        <p style={{ marginTop: 12, maxWidth: 680 }}>
          Agen hanya menghimpun temuan, menelusuri bahan bacaan klinik, dan mengusulkan perbaikan.
          Hasilnya bahan pertimbangan bagi kepala klinik dan tim mutu. Agen tidak menegakkan
          diagnosis, tidak mengubah rekam medis, dan tidak menggantikan penilaian dokter.
        </p>

        <div className="ew-note ew-note--info" style={{ marginTop: 22 }}>
          <ShieldCheck size={16} /> Setiap tindakan yang menyentuh skema atau data pasien wajib
          lewat persetujuan manusia. Jejak keputusan tersimpan di log audit.
        </div>

        <div className="ew-grid-3" style={{ marginTop: 28 }}>
          <div className="ew-card">
            <h3>Agen aktif</h3>
            <p style={{ fontSize: 30, fontWeight: 900, margin: '6px 0 0' }}>
              {memuat ? '-' : total.agents_active ?? agen.length}
            </p>
            <span className="ew-icd">
              {memuat ? 'memuat' : (total.agents_degraded ?? 0) + ' dalam degradasi'}
            </span>
          </div>
          <div className="ew-card">
            <h3>Tugas antre</h3>
            <p style={{ fontSize: 30, fontWeight: 900, margin: '6px 0 0' }}>
              {memuat ? '-' : total.runs_pending ?? 0}
            </p>
            <span className="ew-icd">
              {memuat ? 'memuat' : (total.runs_done ?? 0) + ' selesai - ' + (total.runs_failed ?? 0) + ' gagal'}
            </span>
          </div>
          <div className="ew-card">
            <h3>Skor kepatuhan data</h3>
            <p style={{ fontSize: 30, fontWeight: 900, margin: '6px 0 0' }}>
              {memuat ? '-' : snap?.security_score ?? '-'}
            </p>
            <span className="ew-icd">
              {memuat ? 'memuat' : temuan.length + ' temuan terbuka'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 22, alignItems: 'center' }}>
          <button
            type="button"
            onClick={muat}
            className="ew-text-btn"
            style={{ border: '1px solid #E7DDD6', background: '#fff', padding: '9px 16px', borderRadius: 999, cursor: 'pointer' }}
          >
            {memuat ? <Loader2 size={15} className="ew-spin" /> : <RefreshCw size={15} />} Muat ulang
          </button>
          {galat ? (
            <span style={{ color: '#B91C1C', fontSize: 13 }}>Galat: {galat}</span>
          ) : null}
          {!galat && !memuat && snap?.generated_at ? (
            <span style={{ color: '#6B7280', fontSize: 13 }}>
              Data per {new Date(snap.generated_at).toLocaleString('id-ID')}
            </span>
          ) : null}
        </div>
      </section>

      <section className="ew-wrap" style={{ padding: '36px 24px 0' }}>
        <h2 style={{ fontSize: 21, fontWeight: 900, margin: 0 }}>Status tiap agen</h2>
        <p style={{ marginTop: 6, color: '#5B5551' }}>
          Daftar di bawah dibaca langsung dari tabel agen, bukan angka contoh.
        </p>
        <div className="ew-grid-2" style={{ marginTop: 18 }}>
          {agen.map((a) => {
            const warnaLatar = WARNA_SEHAT[a.health_status] ?? '#6B7280';
            return (
              <div className="ew-card" key={a.agent_key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <h3 style={{ margin: 0 }}>{a.agent_name}</h3>
                  <span
                    style={{
                      background: warnaLatar,
                      color: '#fff',
                      borderRadius: 999,
                      padding: '3px 10px',
                      fontSize: 11,
                      fontWeight: 700,
                      height: 22,
                    }}
                  >
                    {a.health_status}
                  </span>
                </div>
                <span className="ew-icd" style={{ display: 'block', marginTop: 6 }}>
                  {a.role} - {a.autonomy_level.replace(/_/g, ' ')}
                </span>
                <p style={{ marginTop: 10, fontSize: 13.5 }}>{a.mission}</p>
                <span className="ew-icd" style={{ display: 'block', marginTop: 8 }}>
                  Jadwal {a.schedule_cron} - antre {a.queue_depth} - berhasil {a.successful_runs}
                </span>
              </div>
            );
          })}
          {!memuat && agen.length === 0 ? (
            <div className="ew-card">
              <p>Belum ada agen terdaftar pada basis data klinik.</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="ew-wrap" style={{ padding: '36px 24px 64px' }}>
        <div className="ew-grid-2">
          <div className="ew-card">
            <h3 style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <BookOpen size={18} /> Basis pengetahuan klinik
            </h3>
            <p style={{ marginTop: 8, fontSize: 13.5 }}>
              Semua jawaban asisten publik wajib merujuk entri di sini. Entri yang belum
              terverifikasi tidak dipakai.
            </p>
            <p style={{ marginTop: 10, fontSize: 26, fontWeight: 900, margin: 0 }}>
              {memuat ? '-' : snap?.knowledge?.verified ?? 0}
              <span style={{ fontSize: 14, fontWeight: 600, color: '#5B5551' }}> entri terverifikasi</span>
            </p>
            <div className="ew-agent-row" style={{ marginTop: 14 }}>
              {Object.entries(kategori).map(([k, v]) => (
                <span className="ew-chip" key={k}>
                  {k.replace(/_/g, ' ')} {v}
                </span>
              ))}
            </div>
            {(snap?.knowledge_gaps ?? []).length > 0 ? (
              <div className="ew-note ew-note--info" style={{ marginTop: 14 }}>
                <AlertTriangle size={15} /> Ada {(snap?.knowledge_gaps ?? []).length} pertanyaan
                publik yang belum tercakup bahan bacaan.
              </div>
            ) : (
              <div className="ew-note ew-note--info" style={{ marginTop: 14 }}>
                <CheckCircle2 size={15} /> Tidak ada celah pengetahuan yang menumpuk.
              </div>
            )}
          </div>

          <div className="ew-card">
            <h3 style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <ShieldCheck size={18} /> Temuan kepatuhan
            </h3>
            {temuan.length === 0 ? (
              <p style={{ marginTop: 10, fontSize: 13.5 }}>
                Belum ada temuan terbuka. Agen keamanan tetap menjadwalkan audit RLS dan
                penelusuran kebocoran data pribadi.
              </p>
            ) : (
              <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
                {temuan.map((t) => (
                  <div key={t.finding_code}>
                    <strong style={{ fontSize: 14 }}>{t.title}</strong>
                    <span className="ew-icd" style={{ display: 'block', marginTop: 3 }}>
                      {t.severity} - {t.status} - {t.regulation_reference ?? 'tanpa rujukan'}
                    </span>
                    <p style={{ marginTop: 5, fontSize: 13 }}>{t.description}</p>
                    <p style={{ marginTop: 3, fontSize: 13, color: '#0F766E' }}>
                      Usulan: {t.recommendation}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="ew-note ew-note--info" style={{ marginTop: 22 }}>
          <Bot size={16} /> Butuh modul lain? Ruang kerja klinik memuat admisi, rekam medis,
          kasir, PPI, dan mutu. Kembali lewat halaman masuk untuk memilih ruang kerja yang sesuai
          peran Anda.
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <Link className="ew-text-btn" href="/masuk" style={{ textDecoration: 'none' }}>
            <ArrowLeft size={15} /> Pintu masuk petugas
          </Link>
          <Link className="ew-text-btn" href="/simklinik" style={{ textDecoration: 'none' }}>
            Ruang kerja klinik
          </Link>
        </div>
      </section>
    </div>
  );
}
