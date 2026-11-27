
'use client';

/**
 * Penjaga sesi ruang kerja klinik.
 *
 * Tidak ada lagi pemilih peran di layar. Peran datang dari sesi yang diperiksa
 * server; menu disaring mengikuti peta hak akses. Bila sesi tidak ada atau
 * kedaluwarsa, pengunjung dilempar ke /masuk.
 *
 * Catatan penting: berkas ini hanya memuat data klinik setelah sesi terbukti.
 * Sebelum itu kerangka tidak pernah menampilkan nama pasien.
 */

import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpenCheck,
  Bot,
  Building2,
  ClipboardList,
  CreditCard,
  FileBarChart2,
  FileLock2,
  Globe,
  LayoutDashboard,
  Loader2,
  LogOut,
  PackageSearch,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react';
import FormulirCrud from '../../src/components/FormulirCrud';
import ClinicOperatingDashboard from '../../src/components/ClinicOperatingDashboard';
import SatusehatBridgeModule from '../../src/components/SatusehatBridgeModule';
import RbacAuditModule from '../../src/components/RbacAuditModule';
import { SIMKLINIK_SCHEMAS } from '../../src/lib/formSchemas';
import { FALLBACK_SIMKLINIK_DATA } from '../../src/lib/supabaseClient';
import type { SimklinikSnapshot } from '../../src/lib/types';
import {
  LABEL_PERAN,
  getKlien,
  keluarSesi,
  periksaSesi,
  tokenTersimpan,
  type PeranPetugas,
  type SesiPetugas,
} from '../../src/lib/staffSession';
import { MODUL_PER_PERAN, bolehBukaKonsol, type ModulId } from '../../src/lib/aksesModul';

interface MenuDef {
  id: ModulId;
  label: string;
  reg: string;
  Icon: ComponentType<{ size?: number }>;
  schemaKey?: string;
}

const MENU: MenuDef[] = [
  { id: 'M1_DASHBOARD', label: 'Dasbor operasional', reg: 'KPI klinik', Icon: LayoutDashboard },
  { id: 'M2_ADMISI_JADWAL', label: 'Admisi & consent', reg: 'Permenkes 24/2022', Icon: UserCheck, schemaKey: 'pasien' },
  { id: 'M3_RME_CPPT', label: 'RME & CPPT TTE', reg: 'ICD-10 / ICF', Icon: ClipboardList, schemaKey: 'soap' },
  { id: 'M4_SATUSEHAT', label: 'Bridging SATUSEHAT', reg: 'HL7 FHIR R4', Icon: Globe },
  { id: 'M5_SOP_PPK', label: 'Master SOP & PPK', reg: 'Permenkes 81/2014', Icon: BookOpenCheck, schemaKey: 'sop' },
  { id: 'M6_SDM_SIP_STR', label: 'SDM, STR & SIP', reg: 'UU 17/2023', Icon: Users, schemaKey: 'sdm' },
  { id: 'M7_KASIR_PAKET', label: 'Kasir & paket sesi', reg: 'Akuntansi klinik', Icon: CreditCard, schemaKey: 'kasir' },
  { id: 'M8_SARPRAS_PPI', label: 'Sarpras, MFK & PPI', reg: 'Permenkes 14/2021', Icon: PackageSearch, schemaKey: 'inventaris' },
  { id: 'M9_MUTU_DINKES', label: 'Mutu INM & Dinkes', reg: 'Permenkes 34/2022', Icon: FileBarChart2, schemaKey: 'inm' },
  { id: 'M10_RBAC_AUDIT', label: 'RBAC & jejak audit', reg: 'UU PDP 27/2022', Icon: FileLock2 },
  { id: 'M11_TARIF', label: 'Master tarif layanan', reg: 'ICD-9-CM', Icon: CreditCard, schemaKey: 'tarif' },
  { id: 'M12_JADWAL', label: 'Penjadwalan sesi', reg: 'Jadwal & kunjungan', Icon: Activity, schemaKey: 'jadwal' },
  { id: 'M13_PAKET', label: 'Paket sesi terapi', reg: 'PSAK 72', Icon: Award, schemaKey: 'paket' },
  { id: 'M14_STERILISASI', label: 'Log sterilisasi PPI', reg: 'Permenkes 14/2021', Icon: ShieldCheck, schemaKey: 'sterilisasi' },
  { id: 'M15_IKP', label: 'Insiden keselamatan', reg: 'Permenkes 34/2022', Icon: Activity, schemaKey: 'ikp' },
  { id: 'M16_RUJUKAN', label: 'Rujukan interprofesional', reg: 'PKP kolaborasi', Icon: Users, schemaKey: 'rujukan' },
];

/** Kerangka bersih: struktur snapshot lengkap, tanpa satu pun angka contoh. */
const KERANGKA_KOSONG: SimklinikSnapshot = {
  ...FALLBACK_SIMKLINIK_DATA,
  rooms: [],
  therapists: [],
  patients: [],
  care_plans: [],
  appointments: [],
  soap_sessions: [],
  online_bookings: [],
  tariffs: [],
  packages: [],
  invoices: [],
  inventory: [],
  sterilization_logs: [],
  quality_indicators: [],
  incidents: [],
  sops: [],
  satusehat_logs: [],
  dinkes_top_diagnoses: [],
  audit_logs: [],
};

const PETA_BOOTSTRAP: Record<string, keyof SimklinikSnapshot> = {
  M2_ADMISI_JADWAL: 'patients',
  M3_RME_CPPT: 'soap_sessions',
  M7_KASIR_PAKET: 'invoices',
  M9_MUTU_DINKES: 'quality_indicators',
  M12_JADWAL: 'appointments',
  M13_PAKET: 'packages',
  M14_STERILISASI: 'sterilization_logs',
  M15_IKP: 'incidents',
  M8_SARPRAS_PPI: 'inventory',
  M5_SOP_PPK: 'sops',
  M6_SDM_SIP_STR: 'therapists',
  M11_TARIF: 'tariffs',
};

export default function SesiGate() {
  const [memeriksa, setMemeriksa] = useState(true);
  const [sesi, setSesi] = useState<SesiPetugas | null>(null);
  // Mulai dari kerangka kosong. Data contoh tidak boleh tampil walau sesaat
  // sebagai angka klinik yang sebenarnya.
  const [snapshot, setSnapshot] = useState<SimklinikSnapshot>(KERANGKA_KOSONG);
  const [aktif, setAktif] = useState<ModulId>('M1_DASHBOARD');
  const [banner, setBanner] = useState<string | null>(null);
  const [segarkan, setSegarkan] = useState(false);
  // Dasbor tidak dirender sebelum data klinik yang sebenarnya tiba. Tanpa penjaga
  // ini, sekejap tampil angka contoh dari FALLBACK dan itu bukan data pasien.
  const [dataSiap, setDataSiap] = useState(false);
  const [galatMuat, setGalatMuat] = useState<string | null>(null);

  useEffect(() => {
    let hidup = true;
    (async () => {
      const s = await periksaSesi(tokenTersimpan());
      if (!hidup) return;
      if (!s) {
        window.location.replace('/masuk');
        return;
      }
      setSesi(s);
      setMemeriksa(false);
    })();
    return () => {
      hidup = false;
    };
  }, []);

  const peran: PeranPetugas = sesi?.access_role ?? 'TERAPIS_WICARA';

  const muat = useCallback(async () => {
    if (!sesi) return;
    setSegarkan(true);
    try {
      const { data } = await getKlien().rpc('tw_simklinik_dashboard_snapshot', {
        p_role: peran,
        p_session_token: sesi.session_token,
      });
      const jawaban = data as (SimklinikSnapshot & { ok?: boolean; code?: string }) | null;
      if (jawaban && jawaban.ok === false) {
        // Sesi ditolak server (kedaluwarsa atau diakhiri). Jangan tampilkan data
        // lama; antar petugas masuk ulang.
        await keluarSesi();
        window.location.replace('/masuk');
        return;
      }
      if (jawaban) {
        setSnapshot(jawaban as SimklinikSnapshot);
        setDataSiap(true);
        setGalatMuat(null);
      } else {
        setGalatMuat('Data klinik tidak dapat dimuat dari server. Periksa jaringan Anda.');
      }
    } catch {
      setGalatMuat('Koneksi ke server klinik terputus.');
    } finally {
      setSegarkan(false);
    }
  }, [sesi, peran]);

  useEffect(() => {
    muat();
  }, [muat]);

  const menuTersedia = useMemo(
    () => MENU.filter((m) => (MODUL_PER_PERAN[peran] ?? []).includes(m.id)),
    [peran],
  );

  const notify = (pesan: string) => {
    setBanner(pesan);
    window.setTimeout(() => setBanner((p) => (p === pesan ? null : p)), 4500);
  };

  if (memeriksa) {
    return (
      <div className="sim-loading">
        <Loader2 size={22} className="ew-spin" />
        <span>Memeriksa sesi petugas...</span>
      </div>
    );
  }

  if (!dataSiap) {
    return (
      <div className="sim-loading sim-loading--galat">
        <AlertTriangle size={22} />
        <span>{galatMuat ?? 'Memuat data klinik...'}</span>
        <button type="button" className="sim-logout" onClick={muat}>
          <RefreshCw size={15} /> Coba lagi
        </button>
      </div>
    );
  }

  const menuAktif =
    MENU.find((m) => m.id === aktif && menuTersedia.some((x) => x.id === m.id)) ?? menuTersedia[0];
  const skema = menuAktif?.schemaKey ? SIMKLINIK_SCHEMAS[menuAktif.schemaKey] : null;
  // Selalu ikuti menu yang benar-benar terbuka, bukan pilihan yang mungkin sudah
  // di luar wewenang setelah peran berubah.
  const kunciBootstrap = menuAktif ? PETA_BOOTSTRAP[menuAktif.id] : undefined;
  const bootstrapRows = kunciBootstrap
    ? ((snapshot[kunciBootstrap] ?? []) as unknown as Array<Record<string, unknown>>)
    : [];
  const actorName = sesi?.full_name ?? 'Petugas';

  return (
    <div className="sim-shell">
      <aside className="sim-sidebar">
        <div className="sim-brand">
          <span className="sim-brand-kicker">SIMKLINIK &middot; RME</span>
          <span className="sim-brand-name">WicaraSehat</span>
          <span className="sim-brand-meta">
            {sesi?.clinic_name ?? snapshot.clinic.name}
          </span>
          <span className="sim-brand-meta">
            Fasyankes {sesi?.fasyankes_code ?? snapshot.clinic.fasyankes_code}
          </span>
        </div>

        <nav className="sim-nav">
          {menuTersedia.map(({ id, label, reg, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setAktif(id)}
              className={'sim-menu-btn' + (menuAktif?.id === id ? ' active' : '')}
            >
              <Icon size={16} />
              <span className="sim-menu-text">
                <span>{label}</span>
                <span className="sim-menu-reg">{reg}</span>
              </span>
            </button>
          ))}
        </nav>

        <div className="sim-side-foot">
          {bolehBukaKonsol(peran, 'enterprise') ? (
            <Link className="sim-side-link" href="/enterprise">
              <Building2 size={14} /> Konsol jaringan
            </Link>
          ) : null}
          {bolehBukaKonsol(peran, 'ai') ? (
            <Link className="sim-side-link" href="/ai-command-center">
              <Bot size={14} /> Pusat analisa AI
            </Link>
          ) : null}
          <Link className="sim-side-link sim-side-link--muted" href="/">
            <ArrowLeft size={14} /> Situs publik
          </Link>
        </div>
      </aside>

      <main className="sim-main">
        <header className="sim-topbar">
          <div className="sim-title-wrap">
            <span className="sim-title">{menuAktif?.label ?? 'Ruang kerja'}</span>
            <span className="sim-title-sub">
              {snapshot.clinic.name} &middot; Izin Dinkes {snapshot.clinic.dinkes_license_number}
            </span>
          </div>

          <div className="sim-topbar-actions">
            <span className="sim-actor">
              <span className="sim-actor-avatar">
                {(sesi?.full_name ?? 'P').slice(0, 1)}
              </span>
              <span className="sim-actor-text">
                <strong>{actorName}</strong>
                <span>{LABEL_PERAN[peran]}</span>
              </span>
            </span>

            <button
              type="button"
              onClick={muat}
              className="sim-icon-btn"
              title="Muat ulang data"
              aria-label="Muat ulang data"
            >
              <RefreshCw size={15} className={segarkan ? 'ew-spin' : undefined} />
            </button>

            <button
              type="button"
              onClick={async () => {
                await keluarSesi();
                window.location.replace('/masuk');
              }}
              className="sim-logout"
            >
              <LogOut size={15} /> Keluar
            </button>
          </div>
        </header>

        <div className="sim-content">
          {banner ? <div className="sim-banner">{banner}</div> : null}

          {menuAktif?.id === 'M1_DASHBOARD' ? (
            <ClinicOperatingDashboard
              snapshot={snapshot}
              role={peran}
              actorName={actorName}
              cloudConnected
              onNavigate={(kunci) => {
                // Tombol pintasan di dasbor tidak boleh membuka modul di luar
                // hak peran. Peta yang sama dipakai untuk menyaring menu.
                const tujuan = kunci as ModulId;
                if ((MODUL_PER_PERAN[peran] ?? []).includes(tujuan)) setAktif(tujuan);
                else notify('Modul itu di luar wewenang peran Anda.');
              }}
              onRefresh={muat}
              onNotify={notify}
            />
          ) : null}

          {menuAktif?.id === 'M4_SATUSEHAT' ? (
            <SatusehatBridgeModule
              snapshot={snapshot}
              actorName={actorName}
              actorRole={peran}
              onRefresh={muat}
              onNotify={notify}
            />
          ) : null}

          {menuAktif?.id === 'M10_RBAC_AUDIT' ? (
            <RbacAuditModule
              snapshot={snapshot}
              role={peran}
              actorName={actorName}
              onRefresh={muat}
              onNotify={notify}
              onSwitchRole={() => notify('Peran ditentukan oleh akun Anda dan tidak dapat diganti dari layar ini.')}
            />
          ) : null}

          {skema ? (
            <FormulirCrud
              schema={skema}
              actorName={actorName}
              actorRole={peran}
              bootstrapRows={bootstrapRows}
              onSaved={muat}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}
