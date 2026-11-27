
# Hak akses per peran SIMKLINIK

Dokumen ini menjelaskan bagaimana pintu masuk petugas bekerja setelah perubahan
terakhir, dan modul apa yang terbuka untuk tiap peran.

## Prinsip

1. **Peran tidak dipilih di layar.** Tidak ada lagi menu \"Simulasi Peran RBAC\". Sesi
   yang menentukan peran, dan sesi diterbitkan oleh server.
2. **Peramban hanya memegang token.** Yang disimpan di `localStorage` adalah
   `simklinik.session` berisi UUID sesi, bukan nama peran. Mengubah isi
   penyimpanan peramban tidak menaikkan hak akses: server memeriksa token ke
   tabel `terapi_wicara.staff_sessions` dan mengambil `access_role` dari sana.
3. **Penjagaan berlapis.** Walaupun seseorang menembak RPC langsung, server tetap
   memeriksa token (`tw_staff_session_check`) dan menolak peran yang tidak berwenang
   (`ROLE_FORBIDDEN`).

## Alur masuk

| Langkah | Yang terjadi |
| --- | --- |
| 1 | Petugas membuka `/masuk`, mengisi ID pegawai dan PIN. |
| 2 | Peramban memanggil `tw_staff_login(id, pin, 'WEB_DASBOR')`. |
| 3 | Server mencocokkan PIN dengan `crypt()` pada `therapists.pin_code_hash`, menulis `LOGIN_BERHASIL`/`LOGIN_GAGAL` ke jejak audit, menerbitkan token sesi 12 jam. |
| 4 | Peramban menyimpan token lalu pindah ke `/simklinik`. |
| 5 | `SesiGate` memanggil `tw_staff_session_check(token)`. Gagal berarti kembali ke `/masuk`. |
| 6 | Setelah sesi sah, data dimuat lewat `tw_simklinik_dashboard_snapshot(p_role, p_session_token)`. Peran dari peramban diabaikan bila token ada. |
| 7 | Tombol **Keluar** memanggil `tw_staff_logout(token)` dan menghapus token. |

## Matriks modul

| Modul | Kepala klinik | Admisi & RME | Terapis | Kasir | Mutu & Dinkes |
| --- | :-: | :-: | :-: | :-: | :-: |
| M1 Dasbor operasional | ada | ada | ada | ada | ada |
| M2 Admisi & consent | ada | ada | - | - | - |
| M3 RME & CPPT | ada | ada | ada | - | - |
| M4 SATUSEHAT | ada | ada | - | - | ada |
| M5 SOP & PPK | ada | ada | ada | - | - |
| M6 SDM, STR & SIP | ada | - | - | - | - |
| M7 Kasir & paket sesi | ada | - | - | ada | - |
| M8 Sarpras, MFK & PPI | ada | - | - | - | ada |
| M9 Mutu INM & Dinkes | ada | - | - | - | ada |
| M10 RBAC & audit | ada | - | - | - | ada |
| M11 Master tarif | ada | - | - | ada | ada |
| M12 Penjadwalan | ada | ada | ada | - | - |
| M13 Paket sesi | ada | ada | - | ada | - |
| M14 Log sterilisasi | ada | - | ada | - | ada |
| M15 Insiden keselamatan | ada | - | ada | - | ada |
| M16 Rujukan interprofesi | ada | ada | ada | - | - |

Peta ini ditegakkan di tiga lapis:

1. `src/lib/aksesModul.ts` — menu dan pintasan yang tampil di dasbor.
2. `tw_simklinik_dashboard_snapshot` — **data yang dikirim server**. Peran kasir tidak
   menerima satu pun rekam medis; peran mutu tidak menerima tagihan maupun catatan
   klinis; hanya kepala klinik dan mutu yang menerima jejak audit.
3. `tw_crud_save` / `tw_simklinik_execute_action` — penulisan per tabel dan per aksi.

Menambah modul baru tidak otomatis membuka akses ke semua peran.

### Batas yang masih terbuka (jujur)

- `tw_crud_save` memakai peran yang dikirim pemanggil, bukan memeriksa token
  sendiri. Artinya peran pada dasbor sudah benar (berasal dari sesi), tetapi
  pemanggil RPC yang membuat sendiri permintaannya masih dapat mengaku berperan
  lain. Penutupnya adalah menambahkan `p_session_token` ke
  `src/components/FormulirCrud.tsx` — belum dikerjakan karena berkas itu ada di
  repositori, bukan di kanal kode.
- Aplikasi Android yang sudah terunduh memanggil `tw_crud_save` tanpa token.
  Karena itu jalur tanpa token sengaja dibiarkan hidup; ia tetap dibatasi per
  tabel di atas, sehingga kasir tidak dapat menulis rekam medis dan terapis tidak
  dapat menulis kwitansi.

## Konsol terbatas

- `/enterprise` (konsol jaringan) hanya untuk **kepala klinik**.
- `/ai-command-center` hanya untuk **kepala klinik** dan **mutu & Dinkes**.
- Keduanya dijaga `app/PenjagaSesi.tsx`; membuka alamatnya tanpa sesi akan
  dilempar ke `/masuk`, dan peran yang tidak berwenang mendapat **Akses ditolak**.

## Akun petugas yang tersedia

| ID pegawai | Nama | Peran |
| --- | --- | --- |
| `DR-2024-001` | dr. Ratna Kusumawati, Sp.KFR | Kepala klinik |
| `ADM-2025-001` | Rina Ayu Lestari, A.Md.RMIK | Admisi & rekam medis |
| `TW-2023-001` | Nadia Pramesti, S.Tr.Kes | Terapis wicara |
| `TW-2024-002` | Dimas Arya Prakoso, A.Md.TW | Terapis wicara |
| `OT-2025-001` | Hana Kartika Putri, S.Tr.Kes | Terapis (okupasi) |
| `KSR-2025-001` | Bagus Setiawan, S.E | Kasir & keuangan |
| `PSI-2024-001` | Maya Kusuma Wardhani, M.Psi., Psikolog | Mutu & pelaporan Dinkes |

PIN awal untuk akun baru adalah `240826` dan **wajib diganti** oleh pemegang akun.
Staf non-klinis (admisi, kasir) tidak tampil di direktori tenaga klinis situs publik,
tetapi tetap dapat masuk dan hanya melihat modulnya sendiri.

## Menambah atau mengubah petugas

```sql
-- peran
update terapi_wicara.therapists
   set access_role = 'ADMISI_RME'
 where employee_number = 'TW-2024-002';

-- PIN baru (6-8 angka), selalu disimpan sebagai hash
update terapi_wicara.therapists
   set pin_code_hash = extensions.crypt('481920', extensions.gen_salt('bf'))
 where employee_number = 'TW-2024-002';
```

Setelah peran diubah, sesi lama tetap memakai peran saat sesi diterbitkan.
Untuk memberlakukan segera, akhiri sesi petugas itu:

```sql
update terapi_wicara.staff_sessions
   set revoked_at = now()
 where employee_number = 'TW-2024-002' and revoked_at is null;
```

## Yang perlu diketahui

- `tw_simklinik_dashboard_snapshot` menolak permintaan tanpa token
  (`SESSION_REQUIRED`). Aplikasi lain yang memanggil tanpa token akan menerima
  kode itu, bukan data klinik.
- Catatan SOAP tidak pernah dikirim ke peran **kasir**, dan jejak audit hanya
  dikirim ke **kepala klinik** serta **mutu & Dinkes**.
- Jejak audit bersifat hanya-baca; tidak ada tombol hapus di aplikasi.
