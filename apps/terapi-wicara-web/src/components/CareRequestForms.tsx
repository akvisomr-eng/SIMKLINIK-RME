
'use client';

/**
 * Tiga pintu masuk layanan, satu basis data:
 *  1. JANJI_PERIKSA      - pasien lama memilih slot dan terapis.
 *  2. PENDAFTARAN_ONLINE - pasien baru mendaftar, menerima nomor rekam medis.
 *  3. KONSULTASI_ONLINE  - tanya-jawab pra-kunjungan dengan asisten analisa.
 *
 * Semua tulisan masuk lewat RPC server: tw_public_submit_consultation,
 * tw_public_slot_availability, tw_public_submit_booking.
 * Tidak ada kode booking karangan di sisi peramban.
 */

import React, { useEffect, useState } from 'react';
import { CalendarCheck, ClipboardList, MessageCircle, Video } from 'lucide-react';
import { getBrowserSupabase } from '../lib/supabaseClient';
import { AiConsultAssistant } from './AiConsultAssistant';

type Mode = 'JANJI' | 'DAFTAR' | 'KONSULTASI';

interface SlotInfo {
  slot: string;
  capacity: number;
  booked: number;
  pending: number;
  sisa: number;
}

const ONSET_OPTIONS = [
  { v: 'KURANG_1_BULAN', l: 'Kurang dari 1 bulan' },
  { v: '1_6_BULAN', l: '1 sampai 6 bulan' },
  { v: 'LEBIH_6_BULAN', l: 'Lebih dari 6 bulan' },
  { v: 'SEJAK_LAHIR', l: 'Sejak lahir / sejak dini' },
];

const FOCUS_OPTIONS = [
  { v: 'BAHASA', l: 'Bahasa (keterlambatan bicara, pemahaman)' },
  { v: 'BICARA_ARTIKULASI', l: 'Bicara & artikulasi' },
  { v: 'SUARA', l: 'Suara / serak' },
  { v: 'IRAMA_KELANCARAN', l: 'Kelancaran / gagap' },
  { v: 'MENELAN_DISFAGIA', l: 'Menelan & makan' },
  { v: 'PERKEMBANGAN_UMUM', l: 'Perkembangan umum / belum jelas' },
];

const PROMPT_TAGS = [
  { v: 'RED_FLAG_NAPAS', l: 'Ada gangguan napas atau tersedak saat minum' },
  { v: 'RED_FLAG_TELAN_LEMAH', l: 'Bayi lemas saat menyusu atau berat badan turun' },
  { v: 'RED_FLAG_KEJANG', l: 'Pernah kejang atau penurunan kesadaran' },
  { v: 'RED_FLAG_MUNDUR', l: 'Kemampuan yang sudah ada lalu hilang' },
  { v: 'NON_URGENT', l: 'Tidak ada tanda darurat' },
];

/**
 * Triage lokal — aturan sederhana yang hasilnya selalu bisa ditinjau petugas.
 * Bukan diagnosis; hanya penanda prioritas antrean.
 */
function triage(flags: string[]): { level: 'RENDAH' | 'SEDANG' | 'TINGGI'; summary: string } {
  const urgent = flags.filter((f) => f.startsWith('RED_FLAG_'));
  if (flags.includes('RED_FLAG_NAPAS') || flags.includes('RED_FLAG_TELAN_LEMAH')) {
    return {
      level: 'TINGGI',
      summary:
        'Terdapat tanda yang perlu diperiksa segera. Petugas akan menghubungi pada kesempatan pertama.',
    };
  }
  if (urgent.length > 0) {
    return {
      level: 'TINGGI',
      summary: 'Terdapat tanda yang perlu perhatian cepat. Petugas akan menghubungi lebih dahulu.',
    };
  }
  if (flags.length > 0) {
    return { level: 'SEDANG', summary: 'Ada keluhan yang perlu dinilai pada asesmen awal.' };
  }
  return { level: 'RENDAH', summary: 'Tidak ada tanda darurat yang dilaporkan.' };
}

const MODES: Array<{ id: Mode; label: string; Icon: typeof CalendarCheck }> = [
  { id: 'JANJI', label: 'Janji periksa', Icon: CalendarCheck },
  { id: 'DAFTAR', label: 'Pendaftaran online', Icon: ClipboardList },
  { id: 'KONSULTASI', label: 'Konsultasi online', Icon: Video },
];

export function CareRequestForms({ clinicPhone }: { clinicPhone?: string }) {
  const [mode, setMode] = useState<Mode>('JANJI');

  const [patientName, setPatientName] = useState('');
  const [mrn, setMrn] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'L' | 'P'>('L');
  const [guardianName, setGuardianName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [complaint, setComplaint] = useState('');
  const [onset, setOnset] = useState('1_6_BULAN');
  const [focus, setFocus] = useState('BAHASA');
  const [flags, setFlags] = useState<string[]>([]);
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredSlot, setPreferredSlot] = useState('');
  const [consent, setConsent] = useState(false);

  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ code: string; codeLabel: string; level: string } | null>(
    null
  );

  useEffect(() => {
    setPreferredDate(new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10));
  }, []);

  useEffect(() => {
    if (!preferredDate) return;
    const sb = getBrowserSupabase();
    if (!sb) return;
    let alive = true;
    setSlotLoading(true);
    (async () => {
      try {
        const { data, error } = await sb.rpc('tw_public_slot_availability', {
          p_date: preferredDate,
        });
        if (!alive) return;
        if (error) {
          setSlots([]);
        } else {
          setSlots((data?.slots ?? []) as SlotInfo[]);
        }
      } finally {
        if (alive) setSlotLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [preferredDate]);

  const toggleFlag = (v: string) =>
    setFlags((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const reset = () => {
    setPatientName('');
    setMrn('');
    setBirthDate('');
    setGuardianName('');
    setGuardianPhone('');
    setComplaint('');
    setFlags([]);
    setPreferredSlot('');
    setConsent(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!patientName.trim() || !guardianName.trim() || !guardianPhone.trim()) {
      setError('Nama pasien, nama wali, dan nomor HP wajib diisi.');
      return;
    }
    if (!birthDate) {
      setError('Tanggal lahir diperlukan untuk verifikasi identitas.');
      return;
    }
    if (mode !== 'KONSULTASI' && !preferredSlot) {
      setError('Silakan pilih salah satu jam kunjungan yang masih tersedia.');
      return;
    }
    if (mode === 'KONSULTASI' && !complaint.trim()) {
      setError('Tuliskan pertanyaan atau keluhan yang ingin dikonsultasikan.');
      return;
    }
    if (!consent) {
      setError('Persetujuan pemrosesan data (UU PDP) wajib dicentang.');
      return;
    }

    const t = triage(flags);
    const sb = getBrowserSupabase();
    if (!sb) {
      setError('Koneksi ke server klinik tidak tersedia. Silakan hubungi ' + clinicPhone + '.');
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await sb.rpc('tw_public_submit_consultation', {
        p_payload: {
          request_kind: mode === 'JANJI' ? 'JANJI_PERIKSA' : 'KONSULTASI_ONLINE',
          patient_full_name: patientName.trim(),
          birth_date: birthDate,
          gender,
          guardian_name: guardianName.trim(),
          guardian_phone: guardianPhone.trim(),
          chief_complaint:
            (mrn.trim() ? 'No. RM ' + mrn.trim() + '. ' : '') +
            (complaint.trim() || 'Permintaan ' + (mode === 'JANJI' ? 'janji periksa' : 'pendaftaran')),
          duration_onset: onset,
          service_type: mode === 'KONSULTASI' ? 'KONSULTASI_ONLINE' : 'ASESMEN_AWAL',
          preferred_date: preferredDate,
          preferred_slot: preferredSlot || null,
          triage_level: t.level,
          triage_summary: t.summary,
          triage_flags: JSON.stringify(flags),
          triage_engine: 'ATURAN_KLINIS_V1',
          disorder_concern: focus,
          pdp_explicit_consent: true,
        },
      });

      if (error) {
        setError('Permintaan gagal disimpan: ' + error.message);
        return;
      }

      setResult({
        code: data?.request_code ?? '-',
        codeLabel: mode === 'JANJI' ? 'Kode janji periksa' : 'Kode permintaan',
        level: data?.triage_level ?? t.level,
      });
      reset();
    } catch (err) {
      setError('Permintaan gagal: ' + (err instanceof Error ? err.message : 'kesalahan jaringan'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ew-grid-2" style={{ alignItems: 'start', gap: 28 }}>
      <div>
        <div className="ew-tabs" style={{ marginBottom: 20 }}>
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={'ew-tab' + (mode === m.id ? ' is-active' : '')}
              onClick={() => {
                setMode(m.id);
                setResult(null);
                setError(null);
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        <form className="ew-card" onSubmit={submit}>
          {mode === 'JANJI' && (
            <div className="ew-field">
              <label htmlFor="mrn">Nomor rekam medis (bila sudah terdaftar)</label>
              <input
                id="mrn"
                value={mrn}
                onChange={(e) => setMrn(e.target.value)}
                placeholder="RM-TW-2026-0041"
              />
            </div>
          )}

          <div className="ew-grid-2" style={{ gap: 12 }}>
            <div className="ew-field">
              <label htmlFor="pn">Nama lengkap pasien</label>
              <input id="pn" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
            </div>
            <div className="ew-field">
              <label htmlFor="bd">Tanggal lahir</label>
              <input id="bd" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
          </div>

          <div className="ew-grid-2" style={{ gap: 12 }}>
            <div className="ew-field">
              <label htmlFor="gn">Nama wali</label>
              <input id="gn" value={guardianName} onChange={(e) => setGuardianName(e.target.value)} />
            </div>
            <div className="ew-field">
              <label htmlFor="gp">Nomor HP wali</label>
              <input
                id="gp"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                inputMode="tel"
                placeholder="08xxxxxxxxxx"
              />
            </div>
          </div>

          <div className="ew-field">
            <label htmlFor="gd">Jenis kelamin</label>
            <select id="gd" value={gender} onChange={(e) => setGender(e.target.value as 'L' | 'P')}>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>

          <div className="ew-field">
            <label>Perhatian utama</label>
            <select value={focus} onChange={(e) => setFocus(e.target.value)}>
              {FOCUS_OPTIONS.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.l}
                </option>
              ))}
            </select>
          </div>

          <div className="ew-field">
            <label htmlFor="cc">
              {mode === 'KONSULTASI' ? 'Pertanyaan / keluhan' : 'Keluhan utama (opsional)'}
            </label>
            <textarea
              id="cc"
              rows={3}
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="Tuliskan singkat kondisi atau pertanyaan Anda"
            />
          </div>

          <div className="ew-field">
            <label>Sudah berlangsung sejak</label>
            <select value={onset} onChange={(e) => setOnset(e.target.value)}>
              {ONSET_OPTIONS.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.l}
                </option>
              ))}
            </select>
          </div>

          <div className="ew-field">
            <label>Tanda yang perlu diperhatikan (pilih bila ada)</label>
            {PROMPT_TAGS.map((tag) => (
              <label key={tag.v} className="ew-check" style={{ marginBottom: 6 }}>
                <input
                  type="checkbox"
                  checked={flags.includes(tag.v)}
                  onChange={() => toggleFlag(tag.v)}
                />
                <span>{tag.l}</span>
              </label>
            ))}
          </div>

          <div className="ew-grid-2" style={{ gap: 12 }}>
            <div className="ew-field">
              <label htmlFor="pd">Tanggal yang diinginkan</label>
              <input
                id="pd"
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
              />
            </div>
            <div className="ew-field">
              <label>Jam tersedia</label>
              <div
                style={{
                  fontSize: 12,
                  color: '#7A7A7A',
                  padding: '11px 0',
                }}
              >
                {slotLoading ? 'Memuat ketersediaan...' : preferredSlot || 'Belum dipilih'}
              </div>
            </div>
          </div>

          <div className="ew-slots" style={{ marginBottom: 16 }}>
            {slots.length === 0 && !slotLoading && (
              <p style={{ fontSize: 12, color: '#7A7A7A', gridColumn: '1 / -1' }}>
                Ketersediaan jam belum dapat dimuat. Anda tetap bisa mengirim permintaan dan petugas
                akan menawarkan jam alternatif.
              </p>
            )}
            {slots.map((s) => {
              const full = s.sisa <= 0;
              return (
                <button
                  key={s.slot}
                  type="button"
                  disabled={full}
                  onClick={() => setPreferredSlot(s.slot + ' - ' + (parseInt(s.slot, 10) + 1) + ':00 WIB')}
                  className={
                    'ew-slot' +
                    (preferredSlot?.startsWith(s.slot) ? ' is-active' : '') +
                    (full ? ' is-full' : '')
                  }
                >
                  <b>{s.slot}</b>
                  <span>{full ? 'penuh' : s.sisa + ' sisa'}</span>
                </button>
              );
            })}
          </div>

          <label className="ew-check" style={{ marginBottom: 14 }}>
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>
              Saya menyetujui pemrosesan data untuk penjadwalan dan pelayanan klinis sesuai UU PDP
              No. 27/2022, dan memahami bahwa permintaan ini belum menjadi jadwal pasti sebelum
              dikonfirmasi petugas.
            </span>
          </label>

          {error && <div className="ew-note ew-note--err" style={{ marginBottom: 12 }}>{error}</div>}

          {result && (
            <div className="ew-note ew-note--ok" style={{ marginBottom: 12 }}>
              {result.codeLabel}: <strong>{result.code}</strong>
              <br />
              Tersimpan di basis data klinik dengan prioritas <strong>{result.level}</strong>.
              Petugas admisi akan menghubungi nomor wali untuk konfirmasi.
              <br />
              Simpan kode ini untuk menanyakan status permintaan Anda.
              {clinicPhone ? (
                <>
                  <br />
                  Perlu dibicarakan lebih dulu? Hubungi admisi di <strong>{clinicPhone}</strong>.
                </>
              ) : null}
            </div>
          )}

          <button type="submit" className="ew-btn ew-btn--grad" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Mengirim...' : mode === 'KONSULTASI' ? 'Kirim pertanyaan' : 'Kirim permintaan'}
          </button>
        </form>
      </div>

      <div style={{ display: 'grid', gap: 20 }}>
        <AiConsultAssistant />

        <div className="ew-card">
          <h3 style={{ fontSize: 14.5, marginBottom: 10 }}>Bagaimana alurnya?</h3>
          <div className="ew-hero-list">
            <div className="ew-hero-item">
              <span className="ew-hero-dot">
                <CalendarCheck size={13} />
              </span>
              <span>
                <strong>1. Kirim permintaan.</strong> Data langsung masuk ke basis data klinik bersama
                penanda prioritas.
              </span>
            </div>
            <div className="ew-hero-item">
              <span className="ew-hero-dot">
                <MessageCircle size={13} />
              </span>
              <span>
                <strong>2. Dihubungi petugas.</strong> Verifikasi identitas dan konfirmasi jam
                dilakukan lewat WhatsApp atau telepon.
              </span>
            </div>
            <div className="ew-hero-item">
              <span className="ew-hero-dot">
                <ClipboardList size={13} />
              </span>
              <span>
                <strong>3. Asesmen awal.</strong> Terapis memeriksa lima domain dan menyusun rencana
                terapi tertulis.
              </span>
            </div>
          </div>
          <div className="ew-note ew-note--warn" style={{ marginTop: 14 }}>
            Untuk kondisi darurat seperti sesak napas, tersedak berat, atau penurunan kesadaran,
            hubungi layanan gawat darurat terdekat — jangan menunggu balasan formulir ini.
          </div>
        </div>
      </div>
    </div>
  );
}
