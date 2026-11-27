
# Memisahkan situs publik dari dasbor SIMKLINIK

## Masalah yang diperbaiki

Sebelumnya tombol **SIMKLINIK Cabang** tampil di kepala halaman situs publik dan
mengarah ke `/simklinik`. Dua akibatnya nyata:

1. Pasien melihat tombol menuju aplikasi internal, dan bisa masuk ke layar yang
   bukan untuk mereka.
2. Situs publik dan dasbor tampak sebagai satu produk, padahal penggunanya berbeda.

## Yang dilakukan

| Perubahan | Berkas |
| --- | --- |
| Tautan `/simklinik` dan `/enterprise` dihapus dari situs publik | `app/page.tsx` |
| Halaman pintu masuk petugas dibuat terpisah | `app/masuk/page.tsx` |
| Situs publik hanya menautkan Portal pasien | `app/page.tsx` |

Alamat yang berlaku sekarang:

| Alamat | Untuk siapa |
| --- | --- |
| `/` | Pasien dan keluarga - profil layanan, tarif, pendaftaran |
| `/portal-pasien` | Pasien terdaftar - jadwal, latihan rumah, sisa paket |
| `/masuk` | Petugas - pintu menuju tiga ruang kerja |
| `/simklinik` | Petugas - 16 modul operasional |
| `/enterprise` | Pemilik jaringan - konsol multi-cabang |

## Yang tetap terintegrasi

Pemisahan hanya pada tampilan. Datanya satu:

- Angka terapis, ruang, dan tarif di situs publik dibaca dari `tw_public_portal_snapshot`.
- Janji periksa, pendaftaran online, dan konsultasi ditulis lewat
  `tw_public_submit_consultation` ke tabel `care_consultation_requests`.
- Permintaan itu muncul di meja admisi SIMKLINIK dan diverifikasi menjadi nomor
  rekam medis lewat `tw_simklinik_execute_action`.
- Slot yang tampil di situs publik dihitung dari kapasitas ruang yang sama dengan
  yang dipakai penjadwalan di dasbor.

Jadi tidak ada data ganda dan tidak ada isian ulang: apa yang didaftarkan pasien
di situs publik adalah baris yang sama yang dikerjakan petugas di dasbor.
