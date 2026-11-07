/**
 * Laporan PDF kelengkapan input/unggah kit.
 * Terpisah dari Majalah Kit dan dari PDF jadwal pertandingan.
 * Penyusun: Anara Tech
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.FutsalLaporanKelengkapanPdf = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const NAVY = [3, 59, 126];
  const LIME = [204, 227, 16];
  const INK = [20, 32, 48];
  const MUTED = [90, 104, 122];
  const LINE = [210, 220, 232];
  const SOFT = [244, 247, 251];
  const WHITE = [255, 255, 255];
  const AMBER = [120, 84, 10];
  const RED = [153, 27, 27];

  function safe(s) {
    return String(s == null ? '' : s)
      .replace(/[\u2013\u2014\u2212]/g, '-')
      .replace(/[\u00B7\u2022]/g, ' | ')
      .replace(/\u2026/g, '...')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function rgb(doc, c) { doc.setTextColor(c[0], c[1], c[2]); }
  function fill(doc, c) { doc.setFillColor(c[0], c[1], c[2]); }
  function stroke(doc, c) { doc.setDrawColor(c[0], c[1], c[2]); }

  function unggahanText(detail) {
    const c = detail.completeness;
    const pimpinan = 'Pimpinan ' + c.kepala.ada + '/' + c.kepala.butuh;
    return [
      'Logo ' + (c.logo ? 'Ada' : 'Kurang'),
      'Kapten ' + (c.kapten ? 'Ada' : 'Kurang'),
      'Jersey ' + (c.jerseyUtama ? 'Ada' : 'Kurang'),
      pimpinan
    ].join('; ');
  }

  function generate(opts) {
    const global = typeof window !== 'undefined' ? window : globalThis;
    const lib = (global && global.jspdf && global.jspdf.jsPDF) || (global && global.jsPDF) || (opts && opts.jsPDF);
    if (!lib) throw new Error('jsPDF belum dimuat.');
    const model = opts && opts.model;
    if (!model || !model.counts || !model.rows) {
      throw new Error('Data laporan belum siap. PDF tidak dibuat.');
    }
    const doc = new lib({ unit: 'mm', format: 'a4', compress: true });
    doc.setProperties({
      title: model.contoh ? 'CONTOH DATA UJI - Laporan Kelengkapan Kit Faskes' : 'Laporan Kelengkapan Kit Faskes',
      author: 'Anara Tech',
      subject: 'Kit Faskes Peserta | KADINKES CUP Seri V | laporan kelengkapan terpisah dari majalah'
    });

    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 12;
    const FOOTER = H - 14;
    let y = 0;

    function pageBanner() {
      fill(doc, NAVY);
      doc.rect(0, 0, W, 14, 'F');
      fill(doc, LIME);
      doc.rect(0, 14, W, 1.2, 'F');
      rgb(doc, WHITE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Laporan Kelengkapan Kit Faskes', M, 9);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const right = model.contoh ? 'CONTOH DATA UJI' : 'Kit Faskes Peserta';
      doc.text(right, W - M, 9, { align: 'right' });
    }

    function addPage() {
      doc.addPage();
      pageBanner();
      y = 20;
    }

    pageBanner();
    y = 20;

    function ensure(h) {
      if (y + h > FOOTER) addPage();
    }

    function paragraph(text, size, color, gap) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(size || 9);
      rgb(doc, color || INK);
      const lines = doc.splitTextToSize(safe(text), W - 2 * M);
      const h = lines.length * 4 + (gap == null ? 1 : gap);
      ensure(h);
      doc.text(lines, M, y + 3.5);
      y += h;
    }

    function heading(text) {
      ensure(12);
      fill(doc, NAVY);
      doc.roundedRect(M, y, W - 2 * M, 8, 1.2, 1.2, 'F');
      rgb(doc, WHITE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(safe(text), M + 3, y + 5.4);
      y += 11;
    }

    if (model.contoh) {
      ensure(16);
      stroke(doc, RED);
      doc.setLineWidth(0.4);
      doc.roundedRect(M, y, W - 2 * M, 12, 1.5, 1.5, 'S');
      rgb(doc, RED);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('CONTOH DATA UJI', M + 3, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Bukan data peserta sungguhan. Angka hanya dari fixture uji.', M + 42, y + 5);
      y += 16;
    }

    rgb(doc, NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Kontrol kelengkapan input dan unggah', M, y + 5);
    y += 8;
    paragraph('KADINKES CUP Seri V | HKN Ke-62 | Kit Faskes Peserta. Laporan ini berdiri sendiri: bukan PDF Majalah Kit dan bukan PDF jadwal pertandingan.', 9, MUTED, 2);

    const src = model.source || {};
    paragraph('Dicetak: ' + safe(model.generatedAtText || ''), 9, INK, 1);
    paragraph('Cakupan: ' + safe(model.filterText || 'Seluruh roster'), 9, model.filtersActive ? AMBER : INK, 1);
    if (model.filtersActive) {
      paragraph('Filter aktif. Tabel di bawah hanya baris yang lolos filter. Ringkasan seluruh roster tetap dicantumkan agar tim di luar filter tidak disangka nol.', 8, AMBER, 2);
    }
    paragraph(
      'Sumber jadwal: ' + safe(src.dokumen || 'Jadwal Pertandingan') +
      ', ' + safe(src.tanggal || '8-9 November 2026') +
      ', ' + safe(src.tempat || '') +
      '. ' + safe(src.hari1Pagi || '') +
      ' Kategori mengikuti teks PUTRA/PUTRI, bukan warna badge.',
      8, MUTED, 3
    );

    heading('Ringkasan ' + (model.scope === 'filter' ? 'sesuai filter' : 'seluruh roster'));
    const c = model.counts;
    const pairs = [
      ['Diharapkan', c.diharapkan],
      ['Sudah input', c.sudahInput],
      ['Belum input', c.belumInput],
      ['Belum lengkap', c.belumLengkap],
      ['Lengkap', c.lengkap],
      ['Perlu dicocokkan', c.perluDicocokkan],
      ['Duplikat perlu ditinjau', c.duplikat],
      ['Putra', c.putra],
      ['Putri', c.putri]
    ];
    drawStatTable(pairs);
    paragraph('Sudah input = lengkap + belum lengkap + duplikat (tiap tim dihitung sekali). Belum input tidak termasuk yang perlu dicocokkan. Verifikasi tidak mengubah status kelengkapan.', 8, MUTED, 2);
    if (model.filtersActive && model.fullCounts) {
      const f = model.fullCounts;
      paragraph(
        'Ringkasan seluruh roster (di luar filter): diharapkan ' + f.diharapkan +
        ', sudah input ' + f.sudahInput +
        ', belum input ' + f.belumInput +
        ', belum lengkap ' + f.belumLengkap +
        ', lengkap ' + f.lengkap +
        ', perlu dicocokkan ' + f.perluDicocokkan +
        ', duplikat ' + f.duplikat + '.',
        8, INK, 2
      );
    }

    (model.ambiguities || []).forEach(a => {
      heading('Catatan ambiguitas jadwal');
      paragraph(safe(a.teks) + ' | ' + safe(a.lokasi), 9, INK, 1);
      paragraph(a.penjelasan, 8, AMBER, 2);
      paragraph('Placeholder ini tidak menambah peserta dan tidak ditandai belum input.', 8, MUTED, 2);
    });

    function rowsOf(gender, statuses) {
      return model.rows.filter(r => r.gender === gender && statuses.indexOf(r.status) >= 0);
    }

    ['Putra', 'Putri'].forEach(gender => {
      heading('Sudah input | ' + gender);
      paragraph('Faskes yang kit-nya cocok satu lawan satu. Kelengkapan unggahan terpisah dari status verifikasi. Duplikat dan yang perlu dicocokkan tidak masuk tabel ini.', 8, MUTED, 2);
      const rows = rowsOf(gender, ['lengkap', 'belum-lengkap']);
      drawInputTable(rows);
    });

    heading('Faskes belum input');
    paragraph('Tidak ada kit yang cocok dengan roster. Bukan kegagalan muat data. Yang masih ambigu tidak masuk tabel ini.', 8, MUTED, 2);
    const missing = model.rows.filter(r => r.status === 'belum-input');
    drawSimpleTable(
      [
        { title: 'No', w: 10 },
        { title: 'Kategori', w: 18 },
        { title: 'Faskes di jadwal', w: 78 },
        { title: 'Jenis', w: 32 },
        { title: 'Keterangan', w: 48 }
      ],
      missing.map((r, i) => [String(i + 1), r.gender, r.display, r.jenisLabel, 'Belum ada input kit']),
      'Belum ada faskes pada cakupan ini yang berstatus belum input.'
    );

    const uncertain = model.rows.filter(r => r.status === 'perlu-dicocokkan');
    if (uncertain.length) {
      heading('Perlu dicocokkan');
      paragraph('Ada kandidat, tetapi cocokannya belum yakin. Jangan dibaca sebagai belum input, belum lengkap, atau lengkap.', 8, AMBER, 2);
      drawSimpleTable(
        [
          { title: 'Kategori', w: 18 },
          { title: 'Faskes di jadwal', w: 58 },
          { title: 'Kandidat', w: 70 },
          { title: 'Catatan', w: 40 }
        ],
        uncertain.map(r => [
          r.gender,
          r.display,
          (r.candidates || []).map(k => (k.namaTim || k.id) + (k.kategoriTim ? ' (' + k.kategoriTim + ')' : ' (kategori kosong)')).join('; ') || '-',
          'Perlu tinjauan admin'
        ]),
        ''
      );
    }

    const dupes = model.rows.filter(r => r.status === 'duplikat');
    if (dupes.length) {
      heading('Duplikat perlu ditinjau');
      paragraph('Lebih dari satu kit cocok ke tim yang sama. Dihitung satu kali pada sudah input, tidak pada lengkap atau belum lengkap.', 8, AMBER, 2);
      const flat = [];
      dupes.forEach(r => {
        r.kits.forEach(detail => {
          flat.push([
            r.gender,
            r.display,
            detail.kit.namaTim || detail.kit.id,
            unggahanText(detail),
            detail.completeness.missing.join(', ') || '-',
            detail.verifikasi
          ]);
        });
      });
      drawSimpleTable(
        [
          { title: 'Kategori', w: 16 },
          { title: 'Faskes di jadwal', w: 36 },
          { title: 'Kit masuk', w: 34 },
          { title: 'Unggahan wajib', w: 42 },
          { title: 'Kurang', w: 32 },
          { title: 'Verifikasi', w: 26 }
        ],
        flat,
        ''
      );
    }

    if (model.scope !== 'filter' && model.unmatched && model.unmatched.length) {
      heading('Kit tersimpan di luar roster');
      paragraph('Ada di data kit, tidak cocok ke peserta jadwal. Tidak dihitung belum input.', 8, MUTED, 2);
      drawSimpleTable(
        [
          { title: 'Nama kit', w: 70 },
          { title: 'Instansi', w: 78 },
          { title: 'Kategori', w: 38 }
        ],
        model.unmatched.map(k => [k.namaTim || k.id, k.namaInstansi || '-', k.kategoriTim || 'kategori kosong']),
        ''
      );
    }

    paragraph('Penyusun: Anara Tech. Kelengkapan wajib: logo, foto kapten, jersey utama, dan foto kepala/pimpinan (satu per faskes pada tim gabungan). Jersey cadangan opsional dan tidak menggagalkan kelengkapan.', 8, MUTED, 1);

    const total = doc.internal.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      fill(doc, NAVY);
      doc.rect(0, H - 10, W, 10, 'F');
      fill(doc, LIME);
      doc.rect(0, H - 10, W, 0.8, 'F');
      rgb(doc, WHITE);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Penyusun: Anara Tech', M, H - 4.2);
      doc.text('Hal. ' + p + ' / ' + total, W - M, H - 4.2, { align: 'right' });
    }

    const filename = 'laporan_kelengkapan_faskes_kc5' +
      (model.contoh ? '_CONTOH_DATA_UJI' : '') +
      (model.scope === 'filter' ? '_filter' : '') +
      '.pdf';

    function drawStatTable(items) {
      const colW = (W - 2 * M) / 3;
      const rowH = 10;
      const rowsN = Math.ceil(items.length / 3);
      ensure(rowsN * rowH + 2);
      items.forEach((item, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = M + col * colW;
        const yy = y + row * rowH;
        stroke(doc, LINE);
        doc.setLineWidth(0.2);
        fill(doc, SOFT);
        doc.rect(x, yy, colW, rowH, 'FD');
        rgb(doc, MUTED);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(safe(item[0]), x + 2, yy + 4);
        rgb(doc, NAVY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(String(item[1]), x + 2, yy + 8.2);
      });
      y += rowsN * rowH + 3;
    }

    function drawInputTable(rows) {
      const body = [];
      rows.forEach((r, i) => {
        const detail = r.kits[0];
        body.push([
          String(i + 1),
          r.display + (r.joint ? ' (gabungan)' : ''),
          detail ? (detail.kit.namaTim || detail.kit.id) : '-',
          detail ? unggahanText(detail) : '-',
          detail ? (detail.completeness.missing.join(', ') || '-') : '-',
          detail ? detail.verifikasi : '-'
        ]);
      });
      drawSimpleTable(
        [
          { title: 'No', w: 8 },
          { title: 'Faskes di jadwal', w: 40 },
          { title: 'Kit masuk', w: 36 },
          { title: 'Unggahan wajib', w: 46 },
          { title: 'Kurang', w: 32 },
          { title: 'Verifikasi', w: 24 }
        ],
        body,
        'Tidak ada faskes yang sudah input pada bagian ini.'
      );
    }

    function drawSimpleTable(columns, records, emptyText) {
      const sum = columns.reduce((n, c) => n + c.w, 0);
      const scale = (W - 2 * M) / sum;
      const cols = columns.map(c => ({ title: c.title, w: c.w * scale }));
      if (!records.length) {
        if (emptyText) paragraph(emptyText, 9, MUTED, 2);
        return;
      }
      function headerRow() {
        const h = 7;
        ensure(h + 8);
        let x = M;
        fill(doc, NAVY);
        doc.rect(M, y, W - 2 * M, h, 'F');
        rgb(doc, WHITE);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        cols.forEach(col => {
          doc.text(safe(col.title), x + 1.2, y + 4.6);
          x += col.w;
        });
        y += h;
      }
      headerRow();
      records.forEach(record => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        const wrapped = cols.map((col, i) => doc.splitTextToSize(safe(record[i] == null || record[i] === '' ? '-' : record[i]), col.w - 2.4));
        let lines = 1;
        wrapped.forEach(w => { if (w.length > lines) lines = w.length; });
        const h = Math.max(7, lines * 3.4 + 2.2);
        if (y + h > FOOTER) {
          addPage();
          headerRow();
        }
        stroke(doc, LINE);
        doc.setLineWidth(0.15);
        doc.rect(M, y, W - 2 * M, h, 'S');
        let x = M;
        cols.forEach((col, i) => {
          if (i) doc.line(x, y, x, y + h);
          rgb(doc, INK);
          wrapped[i].forEach((line, li) => {
            doc.text(line, x + 1.2, y + 4 + li * 3.4);
          });
          x += col.w;
        });
        y += h;
      });
      y += 4;
    }

    return { doc: doc, filename: filename, pages: total, counts: model.counts };
  }

  return { generate: generate, safe: safe };
});
