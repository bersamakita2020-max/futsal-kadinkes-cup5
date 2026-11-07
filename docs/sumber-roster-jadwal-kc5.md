# Sumber roster jadwal — Kit Faskes Peserta

Penyusun: Anara Tech

Kontrol admin **Kontrol Kit Sesuai Jadwal** membandingkan kit yang sudah masuk dengan peserta yang diharapkan. Sumber isinya PDF jadwal yang disetujui (KADINKES CUP Seri V, Futsal Nakes, HKN Ke-62, 8–9 November 2026, Indoor Apang Semangai). Warna latar badge pada ekspor itu tidak dipakai. Kategori hanya dari teks **PUTRA** atau **PUTRI**.

Fixture ada di `js/schedule-roster.js` (`MATCHES`, `BREAKS`, `AMBIGUITIES`). Daftar tim dihitung dari pertandingan, lalu dideduplikasi per kategori. Ini bukan daftar pertandingan dan bukan data pendaftaran.

## Halaman

| Halaman | Sesi | Isi |
| --- | --- | --- |
| 2 | Hari 1 pagi–siang | 13 pertandingan, 08.00–16.40. Istirahat 16.40–18.30. |
| 3 | Hari 1 sore–malam | 5 pertandingan setelah istirahat yang sama. |
| 4 | Hari 2 pagi–siang | 14 pertandingan, 08.00–17.20. Istirahat 17.20–18.30. |
| 5 | Hari 2 sore–malam | 6 pertandingan. |

Hari 1 pagi tidak lagi memuat DKBP3A vs RSUD Ade M. Djoen putri. Jumlah pertandingan pagi tetap 13.

## Yang dihitung sebagai peserta

Satu baris roster = satu nama konkret + satu kategori. Nama yang sama di beberapa pertandingan tetap satu tim. Peserta mencakup puskesmas dan instansi lain: rumah sakit (RSUD Ade M. Djoen, RSJ Sudiyanto, RSP Serawai), Labkesda, BPJS, DKBP3A/DP3AP2KB, dan Dinas Kesehatan.

Tim gabungan berikut masing-masing **satu** tim pada kategorinya. Komponennya tidak ditandai hilang secara terpisah:

- Putra: `Pusk. Senaning / Merakai`
- Putra: `Pusk. Sungai Durian / Tanjung Puri`
- Putri: `Dinkes x Pusk. Merakai`
- Putri: `Pusk. Mensiku x Pusk. Serangas` (teks jadwal, bukan label Pemenang)

`Pusk. Senaning` putri dan `Pusk. Tanjung Puri` putri tetap tim sendiri karena tertulis terpisah pada kategori itu. Mensiku putra dan Serangas putra juga tetap tim sendiri.

## Yang bukan peserta

Label yang diawali **Pemenang** adalah placeholder babak berikutnya, bukan peserta. Enam placeholder tercatat di fixture.

Satu placeholder bersifat ambigu: Hari 2 sore 19.50–20.30 putri masih menulis `Pemenang DKBP3A / Ade M. Djoen` lawan Pusk. Nanga Ketungau, padahal pertandingan sumbernya sudah dihapus. DKBP3A dan RSUD Ade M. Djoen tidak muncul sebagai tim konkret putri di halaman lain, jadi keduanya **tidak** ditambahkan sebagai peserta putri. Keduanya tetap peserta putra karena ada pertandingan konkret putra. Kontrol menandai catatan ini, bukan mengarang entri.

## Pencocokan kit

Cocok yakin memakai nama yang dinormalisasi (huruf, tanda baca, singkatan Pusk/PKM/UPTD) plus alias eksplisit, nama instansi, faskes asal pimpinan, dan daftar anggota tim gabungan. Julukan `TPK Pride` hanya untuk Tempunak putri. Kategori harus sama. Nama yang hanya menyebut satu komponen tim gabungan, atau kategori kosong, menjadi **Perlu dicocokkan**, bukan lengkap dan bukan belum input. Dua kit yang sama-sama yakin pada satu tim ditandai duplikat dan dihitung sekali.

Kelengkapan wajib mengikuti formulir kit: logo, foto kapten, jersey utama, dan foto kepala/pimpinan. Tim gabungan membutuhkan satu foto pimpinan untuk tiap faskes anggota. Jersey cadangan opsional. Status verifikasi ditampilkan terpisah.

## Laporan PDF

Tombol **Unduh PDF Laporan Kelengkapan Faskes** membuat laporan sendiri lewat `js/laporan-kelengkapan-pdf.js`. File `js/magazine-pdf.js` tidak diubah. Laporan bawaan selalu seluruh roster. PDF sesuai filter, bila dipakai, menulis filter yang aktif dan tetap mencantumkan ringkasan seluruh roster.
