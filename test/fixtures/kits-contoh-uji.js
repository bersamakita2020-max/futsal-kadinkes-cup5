/**
 * Fixture kit fiktif untuk uji kontrol dan PDF.
 * CONTOH DATA UJI — bukan data peserta sungguhan.
 * Penyusun: Anara Tech
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.FutsalKitsContohUji = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const SECRET_WA = '081299988877';
  const SECRET_CODE = 'KC5-RAHASIA-UJIAN';
  const SECRET_TOKEN = 'token-admin-rahasia';

  function kit(row) {
    const heads = row.kepala || [{
      nama: 'Pimpinan CONTOH',
      instansi: row.namaInstansi || '',
      fotoUrl: row.noHead ? '' : 'assets/kc5_sm.png'
    }];
    return {
      id: row.id,
      namaTim: row.namaTim,
      namaInstansi: row.namaInstansi || '',
      kategoriTim: row.kategoriTim,
      jenisInstansi: row.jenisInstansi || 'Puskesmas',
      status: row.status || 'pending',
      timGabungan: !!row.timGabungan,
      anggotaFaskes: row.anggotaFaskes || '',
      logoUrl: row.noLogo ? '' : 'assets/kc5_sm.png',
      fotoKaptenUrl: row.noKapten ? '' : 'assets/kc5_sm.png',
      jerseyUtamaUrl: row.noJersey ? '' : 'assets/kc5_sm.png',
      jerseyCadanganUrl: '',
      kepala: heads,
      kontakNama: 'Kontak Rahasia CONTOH',
      kontakWA: SECRET_WA,
      editCode: SECRET_CODE,
      token: SECRET_TOKEN,
      _contoh: true
    };
  }

  const teams = [
    kit({ id: 'UJI-PANDAN', namaTim: 'Pusk. Pandan', namaInstansi: 'UPTD Puskesmas Pandan', kategoriTim: 'Putra', status: 'verified' }),
    kit({
      id: 'UJI-GABUNG',
      namaTim: 'Senaning / Merakai',
      namaInstansi: 'Puskesmas Senaning',
      kategoriTim: 'Putra',
      timGabungan: true,
      anggotaFaskes: 'Puskesmas Senaning, Puskesmas Merakai',
      kepala: [
        { nama: 'Pimpinan Senaning CONTOH', instansi: 'Puskesmas Senaning', fotoUrl: 'assets/kc5_sm.png' },
        { nama: 'Pimpinan Merakai CONTOH', instansi: 'Puskesmas Merakai', fotoUrl: 'assets/sintang_sm.png' }
      ]
    }),
    kit({ id: 'UJI-MERAKAI', namaTim: 'Puskesmas Merakai', namaInstansi: 'UPTD Puskesmas Merakai', kategoriTim: 'Putra' }),
    kit({ id: 'UJI-ADE', namaTim: 'Ade M Djoen FC', namaInstansi: 'RSUD Ade Muhammad Djoen', kategoriTim: 'Putra', jenisInstansi: 'RS', status: 'verified' }),
    kit({ id: 'UJI-LAB', namaTim: 'Labkesda', namaInstansi: 'Labkesda Kabupaten Sintang', kategoriTim: 'Putra', jenisInstansi: 'Labkesda', status: 'rejected', noHead: true }),
    kit({ id: 'UJI-SERAWAI', namaTim: 'Pusk. Serawai', namaInstansi: 'UPTD Puskesmas Serawai', kategoriTim: 'Putra', status: 'verified' }),
    kit({ id: 'UJI-RSP', namaTim: 'RSP. Serawai', namaInstansi: 'Rumah Sakit Pratama Serawai', kategoriTim: 'Putra', jenisInstansi: 'RS', noLogo: true }),
    kit({ id: 'UJI-TEB-PUTRA', namaTim: 'Puskesmas Tebidah', namaInstansi: 'UPTD Puskesmas Tebidah', kategoriTim: 'Putra', status: 'verified' }),
    kit({ id: 'UJI-DKBP', namaTim: 'DP3AP2KB Kabupaten Sintang', namaInstansi: 'DP3AP2KB Kabupaten Sintang', kategoriTim: 'Putra', jenisInstansi: 'DP3AP2KB', noJersey: true }),
    kit({ id: 'UJI-TEB-1', namaTim: 'Puskesmas Tebidah', namaInstansi: 'UPTD Puskesmas Tebidah', kategoriTim: 'Putri', noJersey: true }),
    kit({ id: 'UJI-TEB-2', namaTim: 'Tebidah Putri FC', namaInstansi: 'UPTD Puskesmas Tebidah', kategoriTim: 'Putri', status: 'verified' }),
    kit({ id: 'UJI-TPK', namaTim: 'TPK Pride', namaInstansi: 'Puskesmas Tempunak', kategoriTim: 'Putri', status: 'pending' }),
    kit({ id: 'UJI-TMP', namaTim: 'UPTD Puskesmas Tempunak', namaInstansi: 'UPTD Puskesmas Tempunak', kategoriTim: 'Putri', noKapten: true }),
    kit({ id: 'UJI-DINKES-PUTRI', namaTim: 'Dinkes', namaInstansi: 'Dinas Kesehatan Kabupaten Sintang', kategoriTim: 'Putri', jenisInstansi: 'Dinkes' }),
    kit({ id: 'UJI-DEDAI', namaTim: 'Dedai', namaInstansi: 'UPTD Puskesmas Dedai', kategoriTim: '' }),
    kit({ id: 'UJI-LUAR', namaTim: 'FC CONTOH Tebelian', namaInstansi: 'Puskesmas Sungai Tebelian', kategoriTim: 'Putri' })
  ];

  return { teams: teams, SECRET_WA: SECRET_WA, SECRET_CODE: SECRET_CODE, SECRET_TOKEN: SECRET_TOKEN };
});
