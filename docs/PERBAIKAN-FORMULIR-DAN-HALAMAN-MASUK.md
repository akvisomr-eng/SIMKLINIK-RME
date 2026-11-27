
# Perbaikan formulir permintaan layanan dan halaman masuk petugas

Tanggal: 2026-11-27. Dua temuan di bawah keduanya cacat fungsional, bukan sekadar tampilan.

## 1. Tab "Pendaftaran online" selalu gagal

`CareRequestForms.tsx` mengirim ketiga tab ke RPC yang sama dengan
`request_kind: mode === 'JANJI' ? 'JANJI_PERIKSA' : 'KONSULTASI_ONLINE'`.
Akibatnya tab kedua mengirim `KONSULTASI_ONLINE`, bukan pendaftaran, sehingga:

- pendaftaran tidak pernah sampai ke `online_booking_requests`, yaitu antrean yang
dibaca `APPROVE_ONLINE_BOOKING_TO_MRN` di modul admisi;
- permintaan tersimpan tanpa `preferred_slot` dan diverifikasi sebagai konsultasi.

RPC `tw_public_submit_booking` sudah ada dan sudah terbuka untuk `anon`, tetapi tidak
pernah dipanggil. Sekarang:

| Tab | RPC | Tabel | Kode bukti |
|---|---|---|---|
| Janji periksa | `tw_public_submit_consultation` | `care_consultation_requests` | `JNJ-YYYYMM-NNNN` |
| Pendaftaran online | `tw_public_submit_booking` | `online_booking_requests` | `BOOK-TW-YYYYMMDD-NNN` |
| Konsultasi online | `tw_public_submit_consultation` | `care_consultation_requests` | `KON-YYYYMM-NNNN` |

## 2. Memilih jam tidak memberi umpan balik

Komponen memakai `.is-active` dan `.is-full`; tema hanya mendefinisikan `.is-on` dan
`.is-off`. Tombol jam penuh juga tidak pernah diredupkan. Ditambahkan di tema:
`.ew-slot.is-active`, `.ew-slot.is-full`, `.ew-slot:disabled`.

## 3. Perubahan lain pada formulir

- Jam dibaca ulang setiap tanggal berubah; pilihan jam direset agar tidak terbawa tanggal lama.
- Kerangka berkedip (skeleton) saat memuat, pesan galat yang menyebut sebabnya.
- `triage_flags` dikirim sebagai array JSON, bukan string JSON. Sebelumnya kolom jsonb menerima
  string sehingga penanda darurat tersimpan sebagai teks bersarang.
- Tanggal minimum H+1 dan maksimum H+30 supaya tidak ada permintaan untuk tanggal lampau.
- Validasi nomor HP sederhana; nama pasien, wali, dan nomor HP wajib untuk semua tab.
- Peringatan darurat muncul begitu penanda merah dicentang, tidak menunggu kirim.
- Kartu hasil menampilkan kode, antrean tujuan, dan prioritas.
- Fitur baru "Sudah pernah mengirim?": status dibaca lewat `tw_public_request_status`.
- Panel alur dan jaminan privasi di sisi kanan; tata letak dua kolom yang runtuh di layar kecil.

## 4. `tw_public_request_status` diperluas dan diperketat

- Mencari di `care_consultation_requests` **dan** `online_booking_requests`, jadi kode
  `BOOK-TW-...` kini bisa dilacak; sebelumnya hanya kode `JNJ-`/`KON-`.
- Nama pasien tidak lagi dikembalikan penuh kepada siapa pun yang menebak kode. Yang
  dikembalikan hanya inisial, misalnya `A Z.`.
- Kode kurang dari 6 karakter ditolak lebih awal (`INVALID`).
- Kunci lama `patient_full_name` dipertahankan agar pemanggil lama tidak pecah, tetapi isinya
  kini inisial.

## 5. Halaman `/masuk` menjadi halaman penerimaan

Sebelumnya halaman ini hanya daftar tiga kartu tujuan dengan tautan langsung ke `/simklinik`,
`/enterprise`, dan `/portal-pasien` — termasuk tautan yang melewati pintu masuk. Sekarang:

- Bar atas dengan merek, navigasi bagian, dan tombol masuk.
- Hero dua kolom: penjelasan produk dan formulir masuk sebagai fokus (lengket saat menggulir).
- Empat angka ringkas: 16 modul, 5 peran, 3 lapis kendali akses, 12 jam masa sesi.
- Tiga ruang kerja dengan penanda "perlu akun petugas" / "tanpa akun petugas".
- Lima peran beserta modul yang terbuka, dinyatakan sebagai ringkasan.
- Empat langkah alur masuk, dari ID pegawai sampai jejak audit.
- Bagian gelap berisi empat jaminan: hash PIN, masa sesi, data pasien tidak terbuka lewat tabel,
  dan dasar hukum.
- Lima tanya-jawab memakai `<details>` (tanpa JavaScript tambahan).
- Kaki halaman dengan tautan ke situs layanan dan portal pasien.
- Catatan tegas bahwa tidak ada pemilih peran di halaman ini.

Gaya baru memakai awalan `.ew-lp-*` dan mandiri terhadap `.up-*`, sehingga perubahan tema
beranda tidak merusak pintu masuk petugas. `.ew-auth-*` tetap dipakai untuk formulir.

## 6. Yang belum dikerjakan

- Halaman `/masuk` belum menautkan pendaftaran akun; akun memang hanya dibuat kepala klinik.
- Tombol "Lupa PIN" masih mengarah ke bagian tanya-jawab, bukan alur pengaturan ulang.
- `tw_simklinik_dashboard_snapshot` dan komponen dasbor belum mengirim token sesi
  (`p_payload.session_token`) — pekerjaan lanjutan yang sudah tercatat.
