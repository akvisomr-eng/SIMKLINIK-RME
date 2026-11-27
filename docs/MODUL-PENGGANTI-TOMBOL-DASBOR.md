# Tiga tombol dasbor yang dipindahkan dari situs publik

Situs publik klinik tidak lagi memuat tombol `SIMKLINIK Cabang`, `Enterprise HQ
(Multi-Cabang)`, dan `Pusat Komando AI`. Ketiganya adalah pintu petugas, bukan
menu pasien, jadi keberadaannya di halaman depan membuat situs terbaca seperti
konsol internal.

Kemampuannya tidak dihapus. Setiap kemampuan turun menjadi modul di ruang kerja
petugas, dan halaman masuk `/masuk` sekarang memuat empat ruang.

## Peta penggantian

| Tombol lama | Alamat lama | Sekarang jadi |
| --- | --- | --- |
| `SIMKLINIK Cabang` | `/simklinik` | Modul **Ruang kerja klinik**: admisi & consent, RME & CPPT, SATUSEHAT, SDM/STR/SIP, kasir & paket sesi, sarpras/MFK/PPI, mutu INM, RBAC & jejak audit, tarif, penjadwalan, sterilisasi, insiden keselamatan, rujukan interprofesional. |
| `Enterprise HQ (Multi-Cabang)` | `/enterprise` | Modul **Konsol jaringan**: pemantauan cabang, konsolidasi indikator mutu, tata kelola pusat. Tetap ada di `/enterprise`, tetapi hanya ditautkan dari `/masuk`, bukan dari halaman depan. |
| `Pusat Komando AI` | `/ai-command-center` | Modul **Pusat analisa AI**: halaman baru `app/ai-command-center/page.tsx`, membaca `tw_ai_command_center_snapshot()` — status tujuh agen, antrean tugas, skor kepatuhan data, celah pengetahuan, dan temuan kepatuhan. |

## Menu publik yang menggantikannya

Sidebar situs publik sekarang memakai menu lazim situs klinik:

1. Layanan
2. Dokter & terapis
3. Tarif layanan
4. Ruang terapi
5. Alur pendaftaran
6. Konsultasi online
7. Aplikasi petugas
8. Tanya jawab
9. Kontak & lokasi
10. Portal pasien (satu-satunya tautan ke aplikasi pasien)

Tidak ada lagi tautan ke `/simklinik`, `/enterprise`, atau `/ai-command-center`
dari halaman depan. Ketiganya hanya terjangkau lewat `/masuk`.

## Batas peran agen

Halaman Pusat analisa AI menegaskan bahwa agen hanya menghimpun temuan dan
usulan. Tidak ada agen yang menegakkan diagnosis atau mengubah rekam medis, dan
tindakan yang menyentuh skema wajib lewat persetujuan manusia.
