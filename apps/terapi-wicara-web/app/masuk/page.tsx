
'use client';

/**
 * Pintu masuk SIMKLINIK (aplikasi internal).
 *
 * Sengaja dipisahkan dari situs publik: situs publik adalah wajah layanan untuk
 * pasien, halaman ini adalah pintu petugas. Karena itu tidak ada tautan balik ke
 * situs publik di navigasi utama, dan tidak ada tautan dari situs publik ke sini.
 *
 * Tautan langsung ke ruang kerja ada di sini agar petugas yang tahu alamatnya
 * tidak perlu mengetik ulang.
 */

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  Globe,
  LayoutDashboard,
  Lock,
  ShieldCheck,
  Smartphone,
  Wallet,
} from 'lucide-react';

const AREAS = [
  {
    href: '/simklinik',
    Icon: LayoutDashboard,
    title: 'Ruang kerja klinik',
    body: 'Enam belas modul operasional: admisi, RME, kasir paket, PPI, mutu, dan audit.',
    roles: 'Kepala klinik · Admisi · Terapis · Kasir · Mutu',
  },
  {
    href: '/enterprise',
    Icon: Globe,
    title: 'Konsol jaringan',
    body: 'Pemantauan multi-cabang, konsolidasi indikator mutu, dan tata kelola pusat.',
    roles: 'Pemilik jaringan · Direksi',
  },
  {
    href: '/portal-pasien',
    Icon: Smartphone,
    title: 'Portal pasien',
    body: 'Keluarga melihat jadwal, catatan latihan rumah, dan sisa paket sesi.',
    roles: 'Orang tua · Wali pasien',
  },
];

const MODULES = [
  'Admisi & consent',
  'RME & CPPT bertanda tangan',
  'Bridging SATUSEHAT',
  'Master SOP & PPK',
  'SDM, STR & SIP',
  'Kasir & paket sesi',
  'Sarpras, MFK & PPI',
  'Mutu INM & pelaporan Dinkes',
  'RBAC & jejak audit PDP',
  'Tarif layanan',
  'Penjadwalan sesi',
  'Sterilisasi',
  'Insiden keselamatan',
  'Rujukan interprofesional',
];

export default function SimklinikEntryPage() {
  return (
    <div className="ew-body" style={{ minHeight: '100vh', background: '#FBF9F7' }}>
      <header className="ew-header is-solid" style={{ position: 'static' }}>
        <div className="ew-header-inner">
          <span className="ew-logo">
            <span className="ew-logo-mark">
              <ShieldCheck size={18} />
            </span>
            <span>
              <span className="ew-logo-name">SIMKLINIK</span>
              <span className="ew-logo-sub">Aplikasi internal klinik</span>
            </span>
          </span>
        </div>
      </header>

      <section className="ew-wrap" style={{ padding: '56px 24px 0' }}>
        <span className="ew-kicker">Akses terbatas untuk petugas</span>
        <h1 style={{ fontSize: 34, fontWeight: 900, lineHeight: 1.2, margin: '12px 0 0' }}>
          Satu pintu, <em style={{ fontStyle: 'normal', color: 'var(--ew-blush)' }}>tiga ruang</em> kerja
        </h1>
        <p style={{ marginTop: 12, maxWidth: 640 }}>
          Halaman ini terpisah dari situs publik klinik. Pilih ruang kerja sesuai peran Anda.
          Setiap tindakan tercatat atas nama pengguna yang masuk, bukan atas nama perangkat.
        </p>

        <div className="ew-grid-3" style={{ marginTop: 34 }}>
          {AREAS.map((a) => (
            <Link key={a.href} href={a.href} className="ew-card" style={{ textDecoration: 'none' }}>
              <span className="ew-service-icon">
                <a.Icon size={22} />
              </span>
              <h3>{a.title}</h3>
              <p style={{ marginTop: 8 }}>{a.body}</p>
              <span className="ew-icd" style={{ display: 'block', marginTop: 10 }}>
                {a.roles}
              </span>
              <span className="ew-text-btn" style={{ marginTop: 14, display: 'inline-flex' }}>
                Masuk <ArrowRight size={15} />
              </span>
            </Link>
          ))}
        </div>

        <div className="ew-note ew-note--info" style={{ marginTop: 28 }}>
          <Lock size={16} /> Ruang kerja klinik dan konsol jaringan memerlukan akun petugas.
          Portal pasien memakai nomor rekam medis dan tanggal lahir pasien.
        </div>
      </section>

      <section className="ew-wrap" style={{ padding: '40px 24px 64px' }}>
        <div className="ew-grid-2">
          <div className="ew-card">
            <h3 style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Bot size={18} /> Modul yang tersedia
            </h3>
            <div className="ew-agent-row" style={{ marginTop: 14 }}>
              {MODULES.map((m) => (
                <span className="ew-chip" key={m}>
                  {m}
                </span>
              ))}
            </div>
          </div>

          <div className="ew-card">
            <h3 style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Wallet size={18} /> Kewajiban pelaporan
            </h3>
            <p style={{ marginTop: 10 }}>
              Rekam medis elektronik wajib terhubung SATUSEHAT (Permenkes 24/2022),
              indikator mutu dilaporkan berkala ke Dinas Kesehatan, dan setiap akses data
              pasien tercatat dalam jejak audit sesuai UU PDP 27/2022.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
