
'use client';

/**
 * Tiga pintu masuk layanan, satu basis data.
 *
 *  1. JANJI_PERIKSA      -> tw_public_submit_consultation -> care_consultation_requests
 *  2. PENDAFTARAN_ONLINE -> tw_public_submit_booking      -> online_booking_requests
 *  3. KONSULTASI_ONLINE  -> tw_public_submit_consultation -> care_consultation_requests
 *
 * Kenapa pendaftaran punya RPC sendiri: tw_public_submit_consultation hanya
 * menerima request_kind 'JANJI_PERIKSA' atau 'KONSULTASI_ONLINE' dan menolak
 * selainnya dengan "Jenis permintaan tidak dikenal". Dulu ketiga tab dikirim ke
 * RPC yang sama, sehingga tab Pendaftaran online selalu gagal di produksi.
 * RPC booking menaruh permintaan pada antrean MENUNGGU_VERIFIKASI_ADMISI,
 * yaitu antrean yang dibaca tombol setujui di modul admisi.
 *
 * Jam tersedia dibaca dari tw_public_slot_availability per tanggal, bukan
 * daftar tetap di peramban, supaya jam yang sudah penuh tidak ditawarkan.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  ClipboardList,
  MessageCircle,
  Phone,
  Search,
  ShieldAlert,
  Store,
  Video,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://fawmudsaaotlqyryciwd.supabase.co';
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  'sb_publishable_wRGUQNJKi5XUjMXHFpDxVw_hPAPyhUc';

const getClient = () => createClient(SUPABASE_URL, SUPABASE_KEY);

type Mode = 'JANJI' | 'DAFTAR' | 'KONSULTASI';

interface SlotInfo {
  slot: string;
  capacity: number;
  booked: number;
  pending: number;
  sisa: number;
}

interface Hasil {
  code: string;
  codeLabel: string;
  level: string | null;
  antrean: string;
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

const MODES: Array<{
  id: Mode;
  label: string;
  Icon: typeof CalendarCheck;
  ringkas: string;
  bukti: string;
}> = [
  {
    id: 'JANJI',
    label: 'Janji periksa',
    Icon: CalendarCheck,
    ringkas: 'Sudah pernah diperiksa dan ingin menjadwalkan sesi berikutnya.',
    bukti: 'Kode janji JNJ- di antrean admisi',
  },
  {
    id: 'DAFTAR',
    label: 'Pendaftaran online',
    Icon: ClipboardList,
    ringkas: 'Pasien baru. Data masuk sebagai pendaftaran untuk dibuatkan nomor rekam medis.',
    bukti: 'Kode pendaftaran BOOK-TW- di antrean admisi',
  },
  {
    id: 'KONSULTASI',
    label: 'Konsultasi online',
    Icon: Video,
    ringkas: 'Masih ragu. Ajukan pertanyaan dulu, tanpa memilih jam kunjungan.',
    bukti: 'Kode konsultasi KON- untuk menghubungi terapis',
  },
];

const ARTI_STATUS: Record<string, string> = {
  BARU: 'Permintaan diterima dan belum ditangani.',
  BARU_MASUK: 'Permintaan diterima dan belum ditangani.',
  MENUNGGU_VERIFIKASI_ADMISI:
    'Menunggu verifikasi admisi. Petugas menghubungi nomor wali untuk konfirmasi data dan jam.',
  TERKONFIRMASI_JADWAL:
    'Jadwal sudah dikonfirmasi. Silakan datang sesuai hari dan jam yang disepakati.',
  TERJADWAL: 'Jadwal sudah ditetapkan oleh petugas.',
  DIBATALKAN: 'Permintaan dibatalkan. Hubungi admisi bila ingin menjadwalkan ulang.',
  SELESAI: 'Permintaan selesai ditangani.',
};

/**
 * Triage lokal: aturan sederhana, hasilnya selalu bisa ditinjau petugas.
 * Bukan diagnosis, hanya penanda prioritas antrean.
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

function labelSlot(slot: string): string {
  const jam = parseInt(slot, 10);
  return slot + ' - ' + String(jam + 1).padStart(2, '0') + ':00 WIB';
}

function tanggalLokal(offsetHari: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetHari);
  return d.toISOString().slice(0, 10);
}

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
  const [slotLoading, setSlotLoading] = useState(true);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasil, setHasil] = useState<Hasil | null>(null);

  const modeAktif = MODES.find((m) => m.id === mode) ?? MODES[0];
  const butuhSlot = mode !== 'KONSULTASI';
  const tanggalMin = useMemo(() => tanggalLokal(1), []);
  const tanggalMaks = useMemo(() => tanggalLokal(30), []);
  const adaDarurat = flags.some((f) => f.startsWith('RED_FLAG_'));
  const sisaTotal = slots.reduce((n, s) => n + Math.max(s.sisa, 0), 0);

  useEffect(() => {
    setPreferredDate(tanggalLokal(2));
  }, []);

  useEffect(() => {
    if (!preferredDate) return;
    const sb = getClient();
    let hidup = true;
    setSlotLoading(true);
    setSlotError(null);
    setPreferredSlot('');
    (async () => {
      try {
        const { data, error: rpcError } = await sb.rpc('tw_public_slot_availability', {
          p_date: preferredDate,
        });
        if (!hidup) return;
        if (rpcError) {
          setSlots([]);
          setSlotError(rpcError.message);
        } else {
          const daftar = ((data as { slots?: SlotInfo[] } | null)?.slots ?? []) as SlotInfo[];
          setSlots(daftar);
          if (daftar.length === 0) setSlotError('Tidak ada jam yang dibuka pada tanggal ini.');
        }
      } catch (err) {
        if (hidup) {
          setSlots([]);
          setSlotError(err instanceof Error ? err.message : 'Jaringan tidak menjawab.');
        }
      } finally {
        if (hidup) setSlotLoading(false);
      }
    })();
    return () => {
      hidup = false;
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

  const pilihMode = (m: Mode) => {
    setMode(m);
    setHasil(null);
    setError(null);
  };

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setHasil(null);

    if (mode === 'DAFTAR' && !birthDate) {
      setError('Tanggal lahir diperlukan untuk membuat nomor rekam medis.');
      return;
    }
    if (!patientName.trim() || !guardianName.trim() || !guardianPhone.trim()) {
      setError('Nama pasien, nama wali, dan nomor HP wali wajib diisi.');
      return;
    }
    if (!/^[0-9+()\-\s]{8,20}$/.test(guardianPhone.trim())) {
      setError('Nomor HP wali belum berbentuk nomor yang bisa dihubungi.');
      return;
    }
    if (mode !== 'KONSULTASI' && !birthDate) {
      setError('Tanggal lahir diperlukan untuk verifikasi identitas.');
      return;
    }
    if (butuhSlot && !preferredSlot) {
      setError('Silakan pilih salah satu jam yang masih tersedia pada tanggal itu.');
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
    const keluhan =
      (mrn.trim() && mode === 'JANJI' ? 'No. RM ' + mrn.trim() + '. ' : '') +
      (complaint.trim() || 'Permintaan ' + modeAktif.label.toLowerCase());

    setBusy(true);
    try {
      const sb = getClient();

      if (mode === 'DAFTAR') {
        const { data, error: rpcError } = await sb.rpc('tw_public_submit_booking', {
          p_payload: {
            patient_full_name: patientName.trim(),
            birth_date: birthDate,
            gender,
            guardian_name: guardianName.trim(),
            guardian_phone: guardianPhone.trim(),
            requested_date: preferredDate,
            requested_slot: labelSlot(preferredSlot),
            service_type: 'ASESMEN_AWAL',
            disorder_concern: focus,
            chief_complaint: keluhan,
            screening_red_flags_count: flags.filter((f) => f.startsWith('RED_FLAG_')).length,
            pdp_explicit_consent: true,
          },
        });
        if (rpcError) {
          setError('Pendaftaran gagal disimpan: ' + rpcError.message);
          return;
        }
        const kode = (data as { booking_code?: string } | null)?.booking_code ?? '-';
        setHasil({
          code: kode,
          codeLabel: 'Kode pendaftaran',
          level: null,
          antrean: 'Menunggu verifikasi admisi',
        });
        reset();
        return;
      }

      const { data, error: rpcError } = await sb.rpc('tw_public_submit_consultation', {
        p_payload: {
          request_kind: mode === 'JANJI' ? 'JANJI_PERIKSA' : 'KONSULTASI_ONLINE',
          patient_full_name: patientName.trim(),
          birth_date: birthDate || null,
          gender,
          guardian_name: guardianName.trim(),
          guardian_phone: guardianPhone.trim(),
          chief_complaint: keluhan,
          duration_onset: onset,
          service_type: mode === 'KONSULTASI' ? 'KONSULTASI_ONLINE' : 'ASESMEN_AWAL',
          preferred_date: preferredDate || null,
          preferred_slot: preferredSlot ? labelSlot(preferredSlot) : null,
          triage_level: t.level,
          triage_summary: t.summary,
          triage_flags: flags,
          triage_engine: 'ATURAN_KLINIS_V1',
          disorder_concern: focus,
          pdp_explicit_consent: true,
        },
      });
      if (rpcError) {
        setError('Permintaan gagal disimpan: ' + rpcError.message);
        return;
      }
      setHasil({
        code: (data as { request_code?: string } | null)?.request_code ?? '-',
        codeLabel: mode === 'JANJI' ? 'Kode janji periksa' : 'Kode konsultasi',
        level: (data as { triage_level?: string } | null)?.triage_level ?? t.level,
        antrean: mode === 'JANJI' ? 'Antrean admisi' : 'Antrean konsultasi terapis',
      });
      reset();
    } catch (err) {
      setError('Permintaan gagal: ' + (err instanceof Error ? err.message : 'kesalahan jaringan'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ew-req">
      <div className="ew-req-modes">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => pilihMode(m.id)}
            className={'ew-req-mode' + (mode === m.id ? ' is-active' : '')}
            aria-pressed={mode === m.id}
          >
            <span className="ew-req-mode-ico">
              <m.Icon size={17} />
            </span>
            <span>
              <b>{m.label}</b>
              <small>{m.ringkas}</small>
            </span>
          </button>
        ))}
      </div>

      <div className="ew-req-grid">
        <form className="ew-card ew-req-card" onSubmit={kirim} noValidate>
          <header className="ew-req-head">
            <span className="ew-req-kicker">{modeAktif.label}</span>
            <h3>Data pasien dan wali</h3>
            <p>
              Yang mengisi formulir adalah wali atau pendamping. Kolom bertanda bintang wajib
              diisi.
            </p>
          </header>

          {mode === 'JANJI' && (
            <div className="ew-field">
              <label htmlFor="mrn">Nomor rekam medis (bila sudah terdaftar)</label>
              <input
                id="mrn"
                value={mrn}
                onChange={(e) => setMrn(e.target.value)}
                placeholder="RM-TW-2026-0041"
                autoComplete="off"
              />
            </div>
          )}

          <div className="ew-req-dua">
            <div className="ew-field">
              <label htmlFor="pn">Nama lengkap pasien *</label>
              <input
                id="pn"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div className="ew-field">
              <label htmlFor="bd">Tanggal lahir *</label>
              <input
                id="bd"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={tanggalLokal(0)}
              />
            </div>
          </div>

          <div className="ew-req-dua">
            <div className="ew-field">
              <label htmlFor="gd">Jenis kelamin</label>
              <select
                id="gd"
                value={gender}
                onChange={(e) => setGender(e.target.value as 'L' | 'P')}
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            <div className="ew-field">
              <label htmlFor="gp">Nomor HP wali (WhatsApp) *</label>
              <input
                id="gp"
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                placeholder="08xxxxxxxxxx"
              />
            </div>
          </div>

          <div className="ew-field">
            <label htmlFor="gn">Nama wali *</label>
            <input
              id="gn"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              autoComplete="name"
            />
          </div>

          <div className="ew-field">
            <label htmlFor="fc">Perhatian utama</label>
            <select id="fc" value={focus} onChange={(e) => setFocus(e.target.value)}>
              {FOCUS_OPTIONS.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.l}
                </option>
              ))}
            </select>
          </div>

          <div className="ew-field">
            <label htmlFor="cc">
              {mode === 'KONSULTASI' ? 'Pertanyaan atau keluhan *' : 'Keluhan utama (opsional)'}
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
            <label htmlFor="on">Sudah berlangsung sejak</label>
            <select id="on" value={onset} onChange={(e) => setOnset(e.target.value)}>
              {ONSET_OPTIONS.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.l}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="ew-req-fieldset">
            <legend>Tanda yang perlu diperhatikan (pilih bila ada)</legend>
            {PROMPT_TAGS.map((tag) => (
              <label key={tag.v} className="ew-check">
                <input
                  type="checkbox"
                  checked={flags.includes(tag.v)}
                  onChange={() => toggleFlag(tag.v)}
                />
                <span>{tag.l}</span>
              </label>
            ))}
          </fieldset>

          {adaDarurat && (
            <div className="ew-note ew-note--err" style={{ marginBottom: 14 }}>
              <ShieldAlert size={16} />
              <span>
                Tanda yang Anda pilih perlu pemeriksaan segera. Kirim formulir ini, lalu hubungi
                klinik atau layanan gawat darurat terdekat tanpa menunggu balasan.
              </span>
            </div>
          )}

          {butuhSlot && (
            <div className="ew-req-jadwal">
              <div className="ew-field">
                <label htmlFor="pd">Tanggal yang diinginkan</label>
                <input
                  id="pd"
                  type="date"
                  value={preferredDate}
                  min={tanggalMin}
                  max={tanggalMaks}
                  onChange={(e) => setPreferredDate(e.target.value)}
                />
              </div>

              <div className="ew-req-slothead">
                <strong>Jam tersedia</strong>
                <span>
                  {slotLoading
                    ? 'Memeriksa jadwal...'
                    : slots.length > 0
                      ? slots.length + ' jam dibuka, ' + sisaTotal + ' tempat tersisa'
                      : 'Belum ada jam terbaca'}
                </span>
              </div>

              <div className="ew-slots" aria-busy={slotLoading}>
                {slotLoading &&
                  [0, 1, 2, 3].map((i) => <span key={i} className="ew-req-skeleton" />)}

                {!slotLoading &&
                  slots.map((s) => {
                    const penuh = s.sisa <= 0;
                    const aktif = preferredSlot === s.slot;
                    return (
                      <button
                        key={s.slot}
                        type="button"
                        disabled={penuh}
                        aria-pressed={aktif}
                        onClick={() => setPreferredSlot(s.slot)}
                        className={
                          'ew-slot' + (aktif ? ' is-active' : '') + (penuh ? ' is-full' : '')
                        }
                      >
                        <b>{s.slot}</b>
                        <span>{penuh ? 'penuh' : s.sisa + ' sisa'}</span>
                      </button>
                    );
                  })}
              </div>

              {!slotLoading && slots.length === 0 && (
                <div className="ew-note ew-note--warn">
                  <Store size={15} />
                  <span>
                    Jam pada tanggal ini belum dapat dibaca
                    {slotError ? ' (' + slotError + ')' : ''}. Anda tetap bisa mengirim
                    permintaan dan petugas akan menawarkan jam alternatif lewat WhatsApp.
                  </span>
                </div>
              )}

              <div className="ew-req-pilihan">
                {preferredSlot ? (
                  <>
                    <b>{labelSlot(preferredSlot)}</b>
                    <span>{preferredDate}</span>
                    <button type="button" onClick={() => setPreferredSlot('')}>
                      ganti
                    </button>
                  </>
                ) : (
                  <span className="ew-req-pilihan-kosong">Belum ada jam yang dipilih.</span>
                )}
              </div>
            </div>
          )}

          <label className="ew-check ew-req-consent">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              Saya menyetujui pemrosesan data untuk penjadwalan dan pelayanan klinis sesuai UU PDP
              No. 27/2022, dan memahami bahwa permintaan ini belum menjadi jadwal pasti sebelum
              dikonfirmasi petugas.
            </span>
          </label>

          {error && (
            <div className="ew-note ew-note--err" style={{ marginBottom: 12 }}>
              {error}
            </div>
          )}

          {hasil && (
            <div className="ew-req-hasil">
              <span className="ew-req-kicker">Permintaan tercatat</span>
              <b className="ew-req-kode">{hasil.code}</b>
              <p>
                {hasil.codeLabel}. Masuk ke <strong>{hasil.antrean}</strong>
                {hasil.level ? (
                  <>
                    {' '}
                    dengan prioritas <strong>{hasil.level}</strong>
                  </>
                ) : null}
                . Petugas menghubungi nomor wali untuk konfirmasi. Simpan kode ini untuk
                menanyakan status.
              </p>
              {clinicPhone ? (
                <p>
                  <Phone size={14} /> Perlu dibicarakan lebih dulu? Hubungi admisi di{' '}
                  <strong>{clinicPhone}</strong>.
                </p>
              ) : null}
            </div>
          )}

          <button type="submit" className="ew-btn ew-btn--grad ew-req-kirim" disabled={busy}>
            {busy ? 'Mengirim...' : mode === 'KONSULTASI' ? 'Kirim pertanyaan' : 'Kirim permintaan'}
          </button>

          <p className="ew-req-foot">
            Tanpa biaya untuk mengirim permintaan. Biaya baru timbul pada tindakan yang Anda
            setujui setelah asesmen.
          </p>
        </form>

        <aside className="ew-req-side">
          <div className="ew-card">
            <h3 className="ew-req-h3">
              <MessageCircle size={16} /> Bagaimana alurnya?
            </h3>
            <ol className="ew-req-steps">
              <li>
                <b>Kirim permintaan.</b> Data masuk ke basis data klinik bersama penanda
                prioritas, dan Anda menerima kode bukti.
              </li>
              <li>
                <b>Dihubungi petugas.</b> Verifikasi identitas dan konfirmasi jam dilakukan lewat
                WhatsApp atau telepon pada hari kerja.
              </li>
              <li>
                <b>Asesmen awal.</b> Terapis memeriksa lima ranah komunikasi dan menelan, lalu
                menyusun rencana terapi tertulis.
              </li>
            </ol>
            <div className="ew-note ew-note--warn" style={{ marginTop: 16 }}>
              Untuk kondisi darurat seperti sesak napas, tersedak berat, atau penurunan kesadaran,
              hubungi layanan gawat darurat terdekat. Jangan menunggu balasan formulir ini.
            </div>
          </div>

          <div className="ew-card">
            <h3 className="ew-req-h3">
              <Search size={16} /> Sudah pernah mengirim?
            </h3>
            <p className="ew-req-side-lead">
              Masukkan kode bukti yang Anda terima untuk melihat status terakhirnya.
            </p>
            <CekStatus />
          </div>

          <div className="ew-card ew-req-side-pilih">
            <h3 className="ew-req-h3">Yang Anda terima per pintu masuk</h3>
            <ul>
              {MODES.map((m) => (
                <li key={m.id}>
                  <b>{m.label}</b>
                  <span>{m.bukti}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CekStatus() {
  const [kode, setKode] = useState('');
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [galat, setGalat] = useState<string | null>(null);

  const cari = async (e: React.FormEvent) => {
    e.preventDefault();
    setGalat(null);
    setData(null);
    const bersih = kode.trim().toUpperCase();
    if (bersih.length < 6) {
      setGalat('Kode bukti terdiri dari minimal 6 karakter, misalnya BOOK-TW-20261124-101.');
      return;
    }
    setBusy(true);
    try {
      const { data: hasil, error } = await getClient().rpc('tw_public_request_status', {
        p_code: bersih,
      });
      if (error) {
        setGalat('Status tidak dapat dibaca: ' + error.message);
        return;
      }
      const d = hasil as Record<string, unknown> | null;
      if (!d || d.status !== 'ok') {
        setGalat(
          typeof d?.message === 'string'
            ? d.message
            : 'Kode tidak ditemukan. Periksa kembali huruf dan angkanya.',
        );
        return;
      }
      setData(d);
    } catch (err) {
      setGalat('Koneksi gagal: ' + (err instanceof Error ? err.message : 'jaringan tidak menjawab'));
    } finally {
      setBusy(false);
    }
  };

  const status = typeof data?.status_permintaan === 'string' ? data.status_permintaan : '';
  const arti = ARTI_STATUS[status] ?? (status ? 'Status tercatat: ' + status : '');

  return (
    <div className="ew-req-cek">
      <form onSubmit={cari} noValidate>
        <div className="ew-field">
          <label htmlFor="cek-kode">Kode bukti</label>
          <input
            id="cek-kode"
            value={kode}
            onChange={(e) => setKode(e.target.value.toUpperCase())}
            placeholder="BOOK-TW-20261124-101"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button type="submit" className="ew-req-cek-btn" disabled={busy}>
          {busy ? 'Mencari...' : 'Lihat status'}
        </button>
      </form>

      {galat && <div className="ew-note ew-note--warn">{galat}</div>}

      {data && (
        <div className="ew-req-status">
          <div className="ew-req-status-top">
            <b>{String(data.request_code ?? '')}</b>
            <span>
              {data.sumber === 'PENDAFTARAN' ? 'Pendaftaran online' : 'Permintaan layanan'}
            </span>
          </div>
          <p className="ew-req-status-arti">{arti}</p>
          <dl>
            <div>
              <dt>Pasien</dt>
              <dd>{String(data.patient_initial ?? '-')}</dd>
            </div>
            <div>
              <dt>Tanggal diinginkan</dt>
              <dd>{String(data.preferred_date ?? 'belum ditentukan')}</dd>
            </div>
            <div>
              <dt>Jam</dt>
              <dd>{String(data.preferred_slot ?? 'belum dipilih')}</dd>
            </div>
            {data.triage_level ? (
              <div>
                <dt>Prioritas</dt>
                <dd>{String(data.triage_level)}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      )}
    </div>
  );
}
