/**
 * Roster tim yang diharapkan dari jadwal pertandingan yang disetujui.
 * Sumber konten: PDF jadwal KADINKES CUP Seri V (bukan warna latar badge).
 * Kategori mengikuti TEKS PUTRA/PUTRI.
 * Penyusun: Anara Tech
 *
 * Bukan modul pendaftaran. Aplikasi ini Kit Faskes Peserta.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.FutsalScheduleRoster = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const SOURCE = {
    dokumen: 'Jadwal Pertandingan KADINKES CUP Seri V',
    event: 'Futsal Nakes · HKN Ke-62',
    tanggal: '8–9 November 2026',
    tempat: 'Indoor Apang Semangai, Kabupaten Sintang',
    penyelenggara: 'Dinas Kesehatan Kabupaten Sintang',
    catatanWarna: 'Warna latar badge pada ekspor PDF ini tidak dipakai. Kategori hanya dari teks PUTRA atau PUTRI.',
    hari1Pagi: 'Hari 1 pagi–siang memuat 13 pertandingan (08.00–16.40) sesudah penghapusan DKBP3A vs RSUD Ade M. Djoen PUTRI. Istirahat 16.40–18.30.',
    caraDedupe: 'Peserta yang diharapkan = tim konkret yang unik per kategori (Putra/Putri) di 4 halaman jadwal. Bukan jumlah pertandingan. Label Pemenang… adalah placeholder babak berikutnya, bukan peserta.',
    halaman: [
      { halaman: 2, hari: 1, sesi: 'Pagi–Siang', tanggal: 'Minggu, 8 November 2026' },
      { halaman: 3, hari: 1, sesi: 'Sore–Malam', tanggal: 'Minggu, 8 November 2026' },
      { halaman: 4, hari: 2, sesi: 'Pagi–Siang', tanggal: 'Senin, 9 November 2026' },
      { halaman: 5, hari: 2, sesi: 'Sore–Malam', tanggal: 'Senin, 9 November 2026' }
    ]
  };

  const BREAKS = [
    { halaman: 2, hari: 1, sesi: 'Pagi–Siang', waktu: '16.40–18.30', label: 'ISTIRAHAT' },
    { halaman: 3, hari: 1, sesi: 'Sore–Malam', waktu: '16.40–18.30', label: 'ISTIRAHAT' },
    { halaman: 4, hari: 2, sesi: 'Pagi–Siang', waktu: '17.20–18.30', label: 'ISTIRAHAT' },
    { halaman: 5, hari: 2, sesi: 'Sore–Malam', waktu: '17.20–18.30', label: 'ISTIRAHAT' }
  ];

  /**
   * Pertandingan sesuai urutan waktu di tiap halaman.
   * kiri = nama di kolom kiri, kanan = kolom kanan, gender = teks badge.
   * placeholder pada salah satu sisi tidak menciptakan peserta.
   */
  const MATCHES = [
    { id: 'h1p-01', halaman: 2, hari: 1, sesi: 'Pagi–Siang', waktu: '08.00–08.40', gender: 'Putra', kiri: 'Pusk. Pandan', kanan: 'Pusk. Nanga Mau' },
    { id: 'h1p-02', halaman: 2, hari: 1, sesi: 'Pagi–Siang', waktu: '08.40–09.20', gender: 'Putra', kiri: 'Pusk. Kemangai', kanan: 'Pusk. Lebang' },
    { id: 'h1p-03', halaman: 2, hari: 1, sesi: 'Pagi–Siang', waktu: '09.20–10.00', gender: 'Putri', kiri: 'Pusk. Lebang', kanan: 'Dinkes x Pusk. Merakai' },
    { id: 'h1p-04', halaman: 2, hari: 1, sesi: 'Pagi–Siang', waktu: '10.00–10.40', gender: 'Putra', kiri: 'Pusk. Dara Juanti', kanan: 'Pusk. Emparu' },
    { id: 'h1p-05', halaman: 2, hari: 1, sesi: 'Pagi–Siang', waktu: '10.40–11.20', gender: 'Putra', kiri: 'Pusk. Kebong', kanan: 'DKBP3A' },
    { id: 'h1p-06', halaman: 2, hari: 1, sesi: 'Pagi–Siang', waktu: '11.20–12.00', gender: 'Putra', kiri: 'Pusk. Senaning / Merakai', kanan: 'Pusk. Sepauk' },
    { id: 'h1p-07', halaman: 2, hari: 1, sesi: 'Pagi–Siang', waktu: '12.00–12.40', gender: 'Putra', kiri: 'Labkesda', kanan: 'Pusk. Mensiku' },
    { id: 'h1p-08', halaman: 2, hari: 1, sesi: 'Pagi–Siang', waktu: '12.40–13.20', gender: 'Putri', kiri: 'Pusk. Dara Juanti', kanan: 'Pusk. Tempunak' },
    { id: 'h1p-09', halaman: 2, hari: 1, sesi: 'Pagi–Siang', waktu: '13.20–14.00', gender: 'Putra', kiri: 'RSJ Sudiyanto', kanan: 'Pusk. Sungai Durian / Tanjung Puri' },
    { id: 'h1p-10', halaman: 2, hari: 1, sesi: 'Pagi–Siang', waktu: '14.00–14.40', gender: 'Putra', kiri: 'Pusk. Serangas', kanan: 'Pusk. Nanga Ketungau' },
    { id: 'h1p-11', halaman: 2, hari: 1, sesi: 'Pagi–Siang', waktu: '14.40–15.20', gender: 'Putri', kiri: 'Pusk. Senaning', kanan: 'RSJ Sudiyanto' },
    { id: 'h1p-12', halaman: 2, hari: 1, sesi: 'Pagi–Siang', waktu: '15.20–16.00', gender: 'Putra', kiri: 'BPJS', kanan: 'Pusk. Dedai' },
    { id: 'h1p-13', halaman: 2, hari: 1, sesi: 'Pagi–Siang', waktu: '16.00–16.40', gender: 'Putra', kiri: 'RSUD Ade M. Djoen', kanan: 'Pusk. Jelimpau' },

    { id: 'h1s-01', halaman: 3, hari: 1, sesi: 'Sore–Malam', waktu: '18.30–19.10', gender: 'Putri', kiri: 'Pusk. Dedai', kanan: 'Labkesda' },
    { id: 'h1s-02', halaman: 3, hari: 1, sesi: 'Sore–Malam', waktu: '19.10–19.50', gender: 'Putri', kiri: 'Pusk. Tanjung Puri', kanan: 'BPJS' },
    { id: 'h1s-03', halaman: 3, hari: 1, sesi: 'Sore–Malam', waktu: '19.50–20.30', gender: 'Putra', kiri: 'Dinkes', kanan: 'Pusk. Tebidah' },
    { id: 'h1s-04', halaman: 3, hari: 1, sesi: 'Sore–Malam', waktu: '20.30–21.10', gender: 'Putra', kiri: 'RSP. Serawai', kanan: 'Pusk. Serawai' },
    { id: 'h1s-05', halaman: 3, hari: 1, sesi: 'Sore–Malam', waktu: '21.10–21.50', gender: 'Putra', kiri: 'Pusk. Tempunak', kanan: 'Pusk. Pandan' },

    { id: 'h2p-01', halaman: 4, hari: 2, sesi: 'Pagi–Siang', waktu: '08.00–08.40', gender: 'Putri', kiri: 'Pusk. Sepauk', kanan: 'Pusk. Mensiku x Pusk. Serangas' },
    { id: 'h2p-02', halaman: 4, hari: 2, sesi: 'Pagi–Siang', waktu: '08.40–09.20', gender: 'Putri', kiri: 'Pusk. Tebidah', kanan: 'Pusk. Kebong' },
    { id: 'h2p-03', halaman: 4, hari: 2, sesi: 'Pagi–Siang', waktu: '09.20–10.00', gender: 'Putra', kiri: 'Pusk. Serawai', kanan: 'RSUD Ade M. Djoen' },
    { id: 'h2p-04', halaman: 4, hari: 2, sesi: 'Pagi–Siang', waktu: '10.00–10.40', gender: 'Putra', kiri: 'Pusk. Jelimpau', kanan: 'Dinkes' },
    { id: 'h2p-05', halaman: 4, hari: 2, sesi: 'Pagi–Siang', waktu: '10.40–11.20', gender: 'Putri', kiri: 'Pusk. Kemangai', kanan: 'Pemenang Tanjung Puri / BPJS', kananPlaceholder: true },
    { id: 'h2p-06', halaman: 4, hari: 2, sesi: 'Pagi–Siang', waktu: '11.20–12.00', gender: 'Putra', kiri: 'Pusk. Tebidah', kanan: 'RSP. Serawai' },
    { id: 'h2p-07', halaman: 4, hari: 2, sesi: 'Pagi–Siang', waktu: '12.00–12.40', gender: 'Putra', kiri: 'Pusk. Dedai', kanan: 'RSJ Sudiyanto' },
    { id: 'h2p-08', halaman: 4, hari: 2, sesi: 'Pagi–Siang', waktu: '12.40–13.20', gender: 'Putri', kiri: 'Pusk. Nanga Mau', kanan: 'Pemenang Dedai / Labkesda', kananPlaceholder: true },
    { id: 'h2p-09', halaman: 4, hari: 2, sesi: 'Pagi–Siang', waktu: '13.20–14.00', gender: 'Putra', kiri: 'Pusk. Sungai Durian / Tanjung Puri', kanan: 'Pusk. Serangas' },
    { id: 'h2p-10', halaman: 4, hari: 2, sesi: 'Pagi–Siang', waktu: '14.00–14.40', gender: 'Putra', kiri: 'Pusk. Tempunak', kanan: 'Pusk. Emparu' },
    { id: 'h2p-11', halaman: 4, hari: 2, sesi: 'Pagi–Siang', waktu: '14.40–15.20', gender: 'Putri', kiri: 'Pusk. Pandan', kanan: 'Pemenang Senaning / RSJ Sudiyanto', kananPlaceholder: true },
    { id: 'h2p-12', halaman: 4, hari: 2, sesi: 'Pagi–Siang', waktu: '15.20–16.00', gender: 'Putra', kiri: 'Pusk. Nanga Ketungau', kanan: 'BPJS' },
    { id: 'h2p-13', halaman: 4, hari: 2, sesi: 'Pagi–Siang', waktu: '16.00–16.40', gender: 'Putra', kiri: 'Pusk. Mensiku', kanan: 'Pusk. Kebong' },
    { id: 'h2p-14', halaman: 4, hari: 2, sesi: 'Pagi–Siang', waktu: '16.40–17.20', gender: 'Putri', kiri: 'Pusk. Jelimpau', kanan: 'Pemenang Dara Juanti / Tempunak', kananPlaceholder: true },

    { id: 'h2s-01', halaman: 5, hari: 2, sesi: 'Sore–Malam', waktu: '18.30–19.10', gender: 'Putra', kiri: 'DKBP3A', kanan: 'Pusk. Senaning / Merakai' },
    { id: 'h2s-02', halaman: 5, hari: 2, sesi: 'Sore–Malam', waktu: '19.10–19.50', gender: 'Putra', kiri: 'Pusk. Sepauk', kanan: 'Labkesda' },
    { id: 'h2s-03', halaman: 5, hari: 2, sesi: 'Sore–Malam', waktu: '19.50–20.30', gender: 'Putri', kiri: 'Pusk. Nanga Ketungau', kanan: 'Pemenang DKBP3A / Ade M. Djoen', kananPlaceholder: true, ambiguityId: 'amb-dkbp3a-ade-putri' },
    { id: 'h2s-04', halaman: 5, hari: 2, sesi: 'Sore–Malam', waktu: '20.30–21.10', gender: 'Putri', kiri: 'Pusk. Serawai', kanan: 'Pemenang Lebang / Dinkes x Merakai', kananPlaceholder: true },
    { id: 'h2s-05', halaman: 5, hari: 2, sesi: 'Sore–Malam', waktu: '21.10–21.50', gender: 'Putra', kiri: 'Pusk. Lebang', kanan: 'Pusk. Dara Juanti' },
    { id: 'h2s-06', halaman: 5, hari: 2, sesi: 'Sore–Malam', waktu: '21.50–22.30', gender: 'Putra', kiri: 'Pusk. Nanga Mau', kanan: 'Pusk. Kemangai' }
  ];

  const AMBIGUITIES = [
    {
      id: 'amb-dkbp3a-ade-putri',
      gender: 'Putri',
      teks: 'Pemenang DKBP3A / Ade M. Djoen',
      lokasi: 'Hari 2 sore, 19.50–20.30, halaman 5, lawan Pusk. Nanga Ketungau',
      penjelasan: 'Pertandingan sumber DKBP3A vs RSUD Ade M. Djoen PUTRI pada Hari 1 pagi sudah dihapus, tetapi placeholder hilir tetap tertulis. DKBP3A dan RSUD Ade M. Djoen tidak muncul sebagai tim konkret PUTRI di halaman lain. Keduanya tidak ditambahkan sebagai peserta PUTRI hanya dari placeholder ini.'
    }
  ];

  function isPlaceholderName(name) {
    return /^pemenang\b/i.test(String(name || '').trim());
  }

  function splitJoint(display) {
    const raw = String(display || '').trim();
    const parts = raw.split(/\s+(?:\/|x)\s+/i).map(s => s.trim()).filter(Boolean);
    if (parts.length < 2) return null;
    const firstIsPusk = /^pusk\.?\s/i.test(parts[0]);
    return parts.map((part, i) => {
      if (i === 0) return part;
      if (/^(pusk\.?|rsud|rsj|rsp\.?|dkbp3a|dp3ap2kb|labkesda|bpjs|dinkes|dinas)\b/i.test(part)) return part;
      if (firstIsPusk) return 'Pusk. ' + part;
      return part;
    });
  }

  function jenisOfName(name) {
    const s = String(name || '').trim();
    if (/^pusk\.?\b/i.test(s) || /puskesmas/i.test(s)) return 'Puskesmas';
    if (/^(dkbp3a|dp3ap2kb)\b/i.test(s)) return 'DP3AP2KB';
    if (/^labkesda\b/i.test(s)) return 'Labkesda';
    if (/^bpjs\b/i.test(s)) return 'BPJS';
    if (/^(dinkes|dinas kesehatan)\b/i.test(s)) return 'Dinkes';
    if (/^(rsud|rsj|rsp\.?)\b/i.test(s)) return 'RS';
    return 'Puskesmas';
  }

  function jenisLabel(j) {
    if (j === 'RS') return 'Rumah Sakit';
    if (j === 'Labkesda') return 'Labkesda';
    if (j === 'BPJS') return 'BPJS';
    if (j === 'DP3AP2KB') return 'DP3AP2KB';
    if (j === 'Dinkes') return 'Dinas Kesehatan';
    if (j === 'Gabungan') return 'Tim gabungan';
    return 'Puskesmas';
  }

  function deriveTeams(matches) {
    const list = matches || MATCHES;
    const map = new Map();
    list.forEach(match => {
      const sides = [
        { name: match.kiri, placeholder: !!match.kiriPlaceholder || isPlaceholderName(match.kiri) },
        { name: match.kanan, placeholder: !!match.kananPlaceholder || isPlaceholderName(match.kanan) }
      ];
      sides.forEach(side => {
        if (!side.name || side.placeholder) return;
        const display = String(side.name).trim();
        const key = match.gender + '\n' + display.toLowerCase();
        let row = map.get(key);
        if (!row) {
          const members = splitJoint(display);
          const joint = !!(members && members.length >= 2);
          const constituents = (joint ? members : [display]).map(label => ({
            label: label,
            jenis: jenisOfName(label)
          }));
          const jenisSet = constituents.map(c => c.jenis);
          const same = jenisSet.every(j => j === jenisSet[0]);
          row = {
            gender: match.gender,
            display: display,
            joint: joint,
            constituents: constituents,
            jenis: same ? jenisSet[0] : 'Gabungan',
            jenisLabel: same ? jenisLabel(jenisSet[0]) : 'Tim gabungan',
            headCount: joint ? constituents.length : 1,
            appearances: []
          };
          map.set(key, row);
        }
        row.appearances.push({
          matchId: match.id,
          halaman: match.halaman,
          hari: match.hari,
          sesi: match.sesi,
          waktu: match.waktu,
          lawan: side.name === match.kiri ? match.kanan : match.kiri,
          lawanPlaceholder: side.name === match.kiri
            ? (!!match.kananPlaceholder || isPlaceholderName(match.kanan))
            : (!!match.kiriPlaceholder || isPlaceholderName(match.kiri))
        });
      });
    });
    const teams = Array.from(map.values());
    teams.sort((a, b) => {
      if (a.gender !== b.gender) return a.gender === 'Putra' ? -1 : 1;
      return a.display.localeCompare(b.display, 'id', { sensitivity: 'base' });
    });
    teams.forEach((t, i) => {
      t.urutan = i + 1;
      t.id = t.gender.toLowerCase() + '-' + slugDisplay(t.display);
    });
    return teams;
  }

  function slugDisplay(display) {
    return String(display || '')
      .toLowerCase()
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/&/g, ' dan ')
      .replace(/\bpusk\.?\b/g, 'puskesmas')
      .replace(/\bdkbp3a\b/g, 'dp3ap2kb')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  const teams = deriveTeams(MATCHES);

  function placeholders(matches) {
    const out = [];
    (matches || MATCHES).forEach(match => {
      [['kiri', match.kiri, match.kiriPlaceholder], ['kanan', match.kanan, match.kananPlaceholder]].forEach(([slot, name, flag]) => {
        if (flag || isPlaceholderName(name)) {
          out.push({
            matchId: match.id,
            slot: slot,
            teks: name,
            gender: match.gender,
            halaman: match.halaman,
            hari: match.hari,
            sesi: match.sesi,
            waktu: match.waktu,
            ambiguityId: match.ambiguityId || ''
          });
        }
      });
    });
    return out;
  }

  return {
    SOURCE: SOURCE,
    BREAKS: BREAKS,
    MATCHES: MATCHES,
    AMBIGUITIES: AMBIGUITIES,
    teams: teams,
    deriveTeams: deriveTeams,
    isPlaceholderName: isPlaceholderName,
    splitJoint: splitJoint,
    jenisOfName: jenisOfName,
    jenisLabel: jenisLabel,
    placeholders: placeholders,
    slugDisplay: slugDisplay
  };
});
