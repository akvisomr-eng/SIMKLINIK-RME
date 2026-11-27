
# Memasang migrasi sekali jalan (sekali saja, sekitar 2 menit)

## Mengapa masih perlu langkah manual

Seluruh berkas terbaru ada di kanal kode Supabase (`public.simklinik_code_files`).
Kanal itu tidak punya izin menulis ke GitHub. Saya juga tidak punya kredensial untuk
repositori `SIMKLINIK-RME`. Jadi ada satu jembatan yang harus Anda tempel sendiri:
sebuah workflow. Setelah terpasang, semua jalannya otomatis.

## Langkah

1. Buka `https://github.com/akvisomr-eng/SIMKLINIK-RME`.
2. Klik **Add file - Create new file**.
3. Nama berkas: `.github/workflows/migrasi-sekali.yml`
4. Di tabel `public.simklinik_code_files`, buka baris dengan
   `path = '.github/workflows/migrasi-sekali.yml'`, salin **seluruh** kolom `content`.
5. Tempel, lalu **Commit changes** ke `main`.
6. Buka tab **Actions - Migrasi Sekali (verifikasi then deploy) - Run workflow**.

## Apa yang berbeda dari percobaan sebelumnya

Percobaan pertama gagal dan pantas gagal: ia menyalin 7 berkas lalu langsung
`git commit`, sehingga saat tidak ada perubahan `git` keluar dengan kode 1 dan
workflow tampak merah. Lebih buruk lagi, ia **tidak pernah membuktikan** bahwa
halaman barunya benar-benar bisa dirender.

Workflow baru membalik urutannya:

| Langkah | Gunanya |
| --- | --- |
| Tarik berkas dari kanal | 23 berkas ditulis ke tempatnya |
| Gabungkan tema ke `globals.css` | `@import` di akhir CSS diabaikan peramban, jadi tema disisipkan langsung dengan penanda |
| Buang workflow lama | `sinkron-web.yml` dan `sinkron-otomatis.yml` dihapus dari repo |
| `tsc --noEmit` | memeriksa tipe sebelum apa pun di-commit |
| `next build` | membuktikan proyek benar-benar terkompilasi |
| Periksa HTML hasil build | memastikan `ew-hero` ada dan **tidak** ada teks `SIMKLINIK Cabang` |
| Commit | hanya jika semua langkah di atas lulus |
| Issue otomatis bila gagal | repositori tetap utuh, Anda mendapat ringkasan |

Artinya: **bila ada galat kompilasi, situs produksi tidak tersentuh** dan Anda
mendapat pemberitahuan, bukan halaman rusak.

## Setelah berhasil

| Kebutuhan | Cara |
| --- | --- |
| Situs web | Vercel membangun ulang otomatis dari `main` |
| Installer Windows | Actions - **Build Installer Windows (Offline)** - Run workflow |
| Aplikasi Android | `npx eas build -p android --profile preview` di `apps/terapi-wicara-android` |
| Menambah berkas baru | tambah baris di kanal, lalu jalankan workflow ini lagi |

## Aturan penempatan berkas

| Awalan path di kanal | Ditulis ke |
| --- | --- |
| `apps/**`, `.github/**`, `docs/**`, berkas akar | akar repositori |
| `app/**`, `src/**` | `apps/terapi-wicara-web/` |

## Bila ingin kembali ke sinkronisasi berkala

Setelah migrasi pertama sukses, jalankan workflow ini cukup saat Anda mengubah kode
lewat kanal. Bila nanti ingin otomatis tiap 6 jam, tambahkan blok berikut pada
berkas workflow yang sama:

```yaml
on:
  workflow_dispatch:
  schedule:
    - cron: "0 */6 * * *"
```

Jangan lupa menghapus `on: workflow_dispatch:` yang lama agar tidak ada dua kunci `on`.
