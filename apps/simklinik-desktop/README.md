
# SIMKLINIK Desktop (Windows)

Shell Electron yang menjalankan aplikasi Next.js SIMKLINIK secara lokal, dengan basis
data SQLite di komputer klinik dan sinkronisasi dua arah ke server.

## Status kesiapan

| Komponen | Status |
| --- | --- |
| Proses utama Electron | siap |
| Preload + IPC (status, cadangan, sinkron manual) | siap |
| Menu Bahasa Indonesia | siap |
| Konfigurasi electron-builder (NSIS + portable) | siap |
| Skema SQLite lokal (13 tabel + antrean) | siap |
| Modul sinkronisasi dua arah | siap |
| Lapisan tulis lokal (`lib/localStore.js`) | siap — setiap tulis masuk antrean |
| Panel status luring (`renderer/status-panel.js`) | siap |
| Siklus sinkron otomatis tiap 5 menit | siap |
| Tanda tangan kode | opsional, belum diisi |

Artinya: installer **dapat dibangun**, dan aplikasi tetap dapat dibuka serta membaca
data lokal saat internet mati.

## Cara membangun installer

### Lewat GitHub Actions

1. Tab **Actions** - **Build Installer Windows (Offline)**.
2. **Run workflow**.
3. Unduh artefak `simklinik-installer-windows`.

### Di komputer Windows

```powershell
cd apps\terapi-wicara-web
npm install
npx next build          # perlu output: 'standalone' di next.config.ts

cd ..\simklinik-desktop
npm install
npx electron-builder --win --x64 --publish never
```

Hasil di `apps/simklinik-desktop/dist/`:

- `SIMKLINIK-RME-Setup-1.0.0.exe` - pemasang NSIS
- berkas `.exe` portable

## Lokasi data

```
%APPDATA%\SIMKLINIK RME\data\simklinik.sqlite
%APPDATA%\SIMKLINIK RME\backup\
%APPDATA%\SIMKLINIK RME\logs\
```

Folder data **tidak dihapus** saat aplikasi dicopot, agar rekam medis tidak hilang.

## Bagaimana sinkronisasi bekerja

| Arah | Cara |
| --- | --- |
| Turun (server ke lokal) | RPC `tw_crud_list` untuk 10 tabel inti, lalu upsert ke SQLite |
| Naik (lokal ke server) | Antrean `sync_queue` dikirim lewat `tw_crud_save` |
| SOAP | Dikirim lewat `tw_android_submit_soap` agar aturan TTE dan `client_offline_uuid` tetap berlaku |
| Status ke pengguna | Pil di kanan bawah: hijau tersinkron, jingga menunggu, merah gagal |
| Hapus | Dikirim lewat `tw_crud_delete`, tercatat di jejak audit |

Siklus berjalan otomatis 4 detik setelah aplikasi dibuka, lalu setiap 5 menit. Bila
jaringan gagal, antrean **tidak dibuang**: percobaan diulang, jumlah percobaan dan
pesan galat terakhir disimpan di kolom `attempts` dan `last_error`.

Lapisan tulis ada di `lib/localStore.js`. **Jangan** menulis langsung ke SQLite:
pakai `window.simklinikDesktop.saveLocal({ table, payload, actorName })` dan
`deleteLocal({ table, id })` agar baris ikut masuk antrean. Modul sinkron hanya
mengirim apa yang ada di antrean.

## Variabel lingkungan

| Nama | Bawaan | Keterangan |
| --- | --- | --- |
| `SIMKLINIK_PORT` | `4321` | port server lokal |
| `SIMKLINIK_DB_PATH` | `<userData>/data/simklinik.sqlite` | lokasi basis data |
| `SIMKLINIK_SUPABASE_URL` | URL proyek | titik akhir server |
| `SIMKLINIK_SUPABASE_KEY` | kunci publishable | kredensial |

## Tanda tangan kode

Windows SmartScreen akan memperingatkan bila `.exe` tidak ditandatangani. Tambahkan
rahasia repositori berikut agar electron-builder menandatanganinya otomatis:

| Rahasia | Isi |
| --- | --- |
| `WIN_CSC_LINK` | sertifikat `.pfx` (base64 atau URL) |
| `WIN_CSC_KEY_PASSWORD` | kata sandi sertifikat |
