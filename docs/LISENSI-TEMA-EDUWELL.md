
# Catatan lisensi tema visual EduWell

## Sumber

TemplateMo 573 EduWell — template HTML5/CSS untuk institusi pendidikan,
berbasis Bootstrap 5.1.3, diterbitkan Februari 2022 oleh TemplateMo.

## Ketentuan yang berlaku (dari halaman resmi TemplateMo)

Halaman template menyatakan: *"Eduwell Template is 100% free to download for anyone.
You are allowed to download, edit and use this Eduwell HTML CSS layout for your
commercial or non-commercial sites."*

Halaman tanya-jawab resmi menambahkan:

| Pertanyaan | Jawaban resmi |
| --- | --- |
| Apakah semua template benar-benar gratis untuk segala keperluan? | Ya, 100% gratis, tanpa biaya tersembunyi, dan boleh dipakai untuk situs komersial. |
| Bolehkah diubah lalu dipakai untuk situs klien dan ditagihkan? | Ya, boleh. |
| Bolehkah menghapus tautan kredit? | Ya, boleh, tanpa biaya. |
| Bolehkah memakai gambar contoh dari template? | Ya, boleh. |
| Bolehkah menyebarluaskan ulang template-nya? | Tidak. Ini satu-satunya larangan. |

Kesimpulan untuk proyek ini: **tidak ada masalah lisensi** untuk pemakaian
komersial SIMKLINIK, termasuk situs daring yang diakses pasien. Larangan yang ada
hanya menyebarluaskan ulang ZIP template sebagai template — dan itu tidak kami lakukan.

## Yang kami lakukan

Desain diterapkan ulang sebagai kode orisinal di `app/theme-eduwell.css`:

- palet gradien identitas (blush `#DC8CDB` ke peach `#F6BF9F`) dipakai sebagai
  warna aksi utama — tombol, bilah langkah, kartu sesi, kepala panel;
- header transparan yang menempel di atas banner dan memadat saat halaman digulir;
- banner gradien dua kolom dengan kartu putih melayang;
- kartu layanan berikon dengan label nomor bidang;
- bilah langkah bernomor berpanah;
- kartu sesi bergaya kartu harga kursus (label harga menonjol di bagian atas);
- kisi dua kolom dan judul bagian dengan kata bergradien;
- kaki halaman gelap tiga kolom.

## Yang tidak kami lakukan

- Tidak menyalin berkas CSS, HTML, JavaScript, atau gambar template.
- Tidak memakai aset gambar contoh TemplateMo.
- Tidak menyebarluaskan ZIP template.

Struktur aplikasi (komponen React, RPC basis data, alur formulir) seluruhnya milik
SIMKLINIK. Template hanya menyumbang bahasa visual.

## Berkas terkait

| Berkas | Isi |
| --- | --- |
| `app/theme-eduwell.css` | Seluruh token & komponen tema |
| `app/page.tsx` | Halaman publik yang memakainya |
| `src/components/CareRequestForms.tsx` | Janji periksa, pendaftaran, konsultasi |
| `src/components/AiConsultAssistant.tsx` | Asisten analisa multi-agen |


## Catatan ilustrasi

Situs publik memakai ilustrasi SVG buatan sendiri (`src/components/siteIllustrations.tsx`),
bukan foto stok. Alasannya etis, bukan hanya teknis: foto pasien anak adalah data
pribadi spesifik UU PDP 27/2022, dan memakai foto klinik pihak lain akan melanggar
hak citra sekaligus menyesatkan pasien. Bila klinik punya foto resmi sendiri dengan
persetujuan tertulis wali, ganti komponen tersebut dengan `<img>` biasa - strukturnya
sudah disiapkan pada kelas `.ew-figure`.
