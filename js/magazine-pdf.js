/**
 * Majalah PDF Kit Faskes — KADINKES CUP Seri V (client-side jsPDF).
 * Penyusun: Anara Tech
 */
(function (global) {
  const NAVY = [3, 59, 126];
  const LIME = [204, 227, 16];
  const TEAL = [26, 166, 160];
  const INK = [20, 32, 48];
  const MUTED = [100, 116, 139];
  const LINE = [215, 224, 239];
  const PAPER = [255, 255, 255];
  const SOFT = [245, 248, 252];

  const JENIS_ORDER = ['Puskesmas', 'RS', 'Labkesda', 'BPJS', 'DP3AP2KB'];
  const JENIS_LABEL = {
    Puskesmas: 'Puskesmas',
    RS: 'Rumah Sakit',
    Labkesda: 'Labkesda',
    BPJS: 'BPJS',
    DP3AP2KB: 'DP3AP2KB'
  };

  function rgb(doc, c) { doc.setTextColor(c[0], c[1], c[2]); }
  function fill(doc, c) { doc.setFillColor(c[0], c[1], c[2]); }
  function stroke(doc, c) { doc.setDrawColor(c[0], c[1], c[2]); }

  function jenisLabel(j) { return JENIS_LABEL[j] || j || '—'; }
  function statusLabel(s) {
    if (s === 'verified') return 'Terverifikasi';
    if (s === 'rejected') return 'Ditolak';
    if (s === 'pending') return 'Menunggu';
    return s || '—';
  }
  function kategoriOf(t) {
    const s = String(t.kategoriTim || '').trim();
    if (/^putra$/i.test(s)) return 'Putra';
    if (/^putri/i.test(s) || /wanita/i.test(s)) return 'Putri';
    return '';
  }
  function sortTeams(list) {
    return list.slice().sort((a, b) => {
      const ja = JENIS_ORDER.indexOf(a.jenisInstansi); const jb = JENIS_ORDER.indexOf(b.jenisInstansi);
      const ia = ja < 0 ? 99 : ja; const ib = jb < 0 ? 99 : jb;
      if (ia !== ib) return ia - ib;
      return String(a.namaTim || '').localeCompare(String(b.namaTim || ''), 'id', { sensitivity: 'base' });
    });
  }
  function kitMeta(t) {
    const logo = !!(t.logoUrl || (t.files && t.files.logo && t.files.logo.url));
    const jerseyUtama = !!(t.jerseyUtamaUrl || (t.files && t.files.jerseyUtama && t.files.jerseyUtama.url));
    const fotoKapten = !!(t.fotoKaptenUrl || (t.files && t.files.fotoKapten && t.files.fotoKapten.url));
    const kepala = Array.isArray(t.kepala) ? t.kepala : [];
    const fotoKepala = kepala.some(k => !!(k && k.fotoUrl));
    const n = (logo ? 1 : 0) + (jerseyUtama ? 1 : 0) + (fotoKapten ? 1 : 0) + (fotoKepala ? 1 : 0);
    return { persen: Math.round((n / 4) * 100), lengkap: n === 4, logo, jerseyUtama, fotoKapten, fotoKepala };
  }
  function clip(doc, text, fontSize, maxW) {
    doc.setFontSize(fontSize);
    let t = String(text || '');
    if (doc.getTextWidth(t) <= maxW) return t;
    while (t.length > 1 && doc.getTextWidth(t + '…') > maxW) t = t.slice(0, -1);
    return t + '…';
  }

  async function urlToDataUrl(url, fallback) {
    if (!url) return fallback || null;
    if (String(url).startsWith('data:')) return url;
    try {
      const res = await fetch(url);
      if (!res.ok) return fallback || null;
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      });
    } catch (e) {
      return fallback || null;
    }
  }

  function drawHeaderBar(doc, W, title) {
    fill(doc, NAVY);
    doc.rect(0, 0, W, 12, 'F');
    fill(doc, LIME);
    doc.rect(0, 12, W, 1.2, 'F');
    rgb(doc, [255, 255, 255]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(clip(doc, title || 'Kit Faskes Peserta · KADINKES CUP Seri V', 8, W - 20), 10, 8);
  }
  function drawFooter(doc, W, H, page, total) {
    fill(doc, NAVY);
    doc.rect(0, H - 10, W, 10, 'F');
    fill(doc, LIME);
    doc.rect(0, H - 10, W, 0.9, 'F');
    rgb(doc, [255, 255, 255]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text('Penyusun: Anara Tech', 10, H - 3.8);
    doc.text('Hal. ' + page + (total ? ' / ' + total : ''), W - 10, H - 3.8, { align: 'right' });
  }
  function drawPlaceholder(doc, x, y, w, h, label) {
    fill(doc, SOFT);
    stroke(doc, LINE);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, h, 2, 2, 'FD');
    rgb(doc, MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(label || 'Belum ada', x + w / 2, y + h / 2 + 1, { align: 'center' });
  }
  function drawImageOrPlaceholder(doc, dataUrl, x, y, w, h, label) {
    fill(doc, SOFT);
    doc.roundedRect(x, y, w, h, 1.5, 1.5, 'F');
    if (dataUrl) {
      try {
        const fmt = String(dataUrl).indexOf('image/png') >= 0 ? 'PNG' : 'JPEG';
        const props = doc.getImageProperties(dataUrl);
        const iw = props.width || 1;
        const ih = props.height || 1;
        const scale = Math.min(w / iw, h / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        const dx = x + (w - dw) / 2;
        const dy = y + (h - dh) / 2;
        doc.addImage(dataUrl, fmt, dx, dy, dw, dh);
        stroke(doc, LINE);
        doc.setLineWidth(0.25);
        doc.roundedRect(x, y, w, h, 1.5, 1.5, 'S');
        return;
      } catch (e) { /* fallthrough */ }
    }
    drawPlaceholder(doc, x, y, w, h, label || 'Belum ada');
  }

  function summarize(teams) {
    const s = {
      total: teams.length,
      putra: 0, putri: 0, kosong: 0,
      verified: 0, pending: 0, rejected: 0,
      gabungan: 0,
      jenis: {}
    };
    JENIS_ORDER.forEach(j => { s.jenis[j] = 0; });
    teams.forEach(t => {
      const k = kategoriOf(t);
      if (k === 'Putra') s.putra++; else if (k === 'Putri') s.putri++; else s.kosong++;
      if (t.status === 'verified') s.verified++;
      else if (t.status === 'rejected') s.rejected++;
      else s.pending++;
      if (t.timGabungan) s.gabungan++;
      const j = t.jenisInstansi || '';
      if (s.jenis[j] == null) s.jenis[j] = 0;
      s.jenis[j]++;
    });
    return s;
  }

  /**
   * @param {object} opts
   * @param {Array} opts.teams
   * @param {'Semua'|'Putra'|'Putri'} opts.kategoriFilter
   * @param {'aktif'|'verified'} opts.statusFilter
   * @param {boolean} opts.includeKontak
   * @param {{kc5?:string,hkn?:string}} opts.brand
   * @param {(team:object,key:string)=>Promise<string|null>} opts.loadImage
   * @param {(p:{phase:string,current:number,total:number,label?:string})=>void} opts.onProgress
   */
  async function generate(opts) {
    const jsPDF = (global.jspdf && global.jspdf.jsPDF) || global.jsPDF;
    if (!jsPDF) throw new Error('jsPDF belum dimuat.');

    let teams = (opts.teams || []).slice();
    if (opts.statusFilter === 'verified') {
      teams = teams.filter(t => t.status === 'verified');
    }
    // "aktif" = semua status non-arsip (already the admin list)
    const kat = opts.kategoriFilter || 'Semua';
    if (kat === 'Putra' || kat === 'Putri') {
      teams = teams.filter(t => kategoriOf(t) === kat);
    }

    const putra = sortTeams(teams.filter(t => kategoriOf(t) === 'Putra'));
    const putri = sortTeams(teams.filter(t => kategoriOf(t) === 'Putri'));
    const kosong = sortTeams(teams.filter(t => !kategoriOf(t)));
    const ordered = [].concat(
      kat === 'Putri' ? [] : putra,
      kat === 'Putra' ? [] : putri,
      (kat === 'Semua' ? kosong : [])
    );

    const progress = opts.onProgress || function () {};
    const loadImage = opts.loadImage || async function () { return null; };
    const brand = opts.brand || {};

    // Preload images
    const cache = new Map();
    async function img(team, key) {
      const ck = (team && team.id || '') + '::' + key;
      if (cache.has(ck)) return cache.get(ck);
      progress({ phase: 'gambar', current: cache.size, total: Math.max(1, ordered.length * 5), label: (team && team.namaTim) || key });
      let data = null;
      try { data = await loadImage(team, key); } catch (e) { data = null; }
      cache.set(ck, data);
      return data;
    }

    // Also brand
    let logoKc5 = brand.kc5 || null;
    let logoHkn = brand.hkn || null;
    if (logoKc5 && !String(logoKc5).startsWith('data:')) logoKc5 = await urlToDataUrl(logoKc5);
    if (logoHkn && !String(logoHkn).startsWith('data:')) logoHkn = await urlToDataUrl(logoHkn);

    for (const t of ordered) {
      await img(t, 'logo');
      await img(t, 'fotoKapten');
      await img(t, 'jerseyUtama');
      await img(t, 'jerseyCadangan');
      const kepala = Array.isArray(t.kepala) ? t.kepala : [];
      for (let i = 0; i < Math.min(kepala.length, 5); i++) {
        await img(t, 'kepala_' + (i + 1));
      }
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const M = 12;

    // Estimate page count roughly for footer totals later — we'll renumber by walking pages
    function addPage() { doc.addPage(); }

    // ---- COVER ----
    progress({ phase: 'halaman', current: 1, total: 3 + ordered.length, label: 'Sampul' });
    fill(doc, NAVY);
    doc.rect(0, 0, W, H, 'F');
    fill(doc, LIME);
    doc.rect(0, 0, W, 6, 'F');
    fill(doc, TEAL);
    doc.rect(0, H - 18, W, 18, 'F');
    if (logoKc5) {
      try { doc.addImage(logoKc5, 'PNG', M, 24, 28, 28); } catch (e) {}
    }
    if (logoHkn) {
      try { doc.addImage(logoHkn, 'PNG', W - M - 28, 24, 28, 28); } catch (e) {}
    }
    rgb(doc, LIME);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('KADINKES CUP SERI V 2026', W / 2, 70, { align: 'center' });
    rgb(doc, [255, 255, 255]);
    doc.setFontSize(28);
    doc.text('KIT FASKES PESERTA', W / 2, 88, { align: 'center' });
    doc.setFontSize(12);
    rgb(doc, [200, 220, 255]);
    doc.text('Majalah Profil Tim Futsal Nakes', W / 2, 100, { align: 'center' });
    // filter badge
    fill(doc, TEAL);
    doc.roundedRect(W / 2 - 40, 112, 80, 10, 2, 2, 'F');
    rgb(doc, [255, 255, 255]);
    doc.setFontSize(9);
    const filterLabel = (kat === 'Semua' ? 'Semua kategori' : ('Tim ' + kat)) +
      (opts.statusFilter === 'verified' ? ' · Terverifikasi' : ' · Semua status aktif');
    doc.text(filterLabel, W / 2, 118.5, { align: 'center' });

    rgb(doc, LIME);
    doc.setFontSize(10);
    doc.text(String(ordered.length) + ' tim', W / 2, 140, { align: 'center' });
    rgb(doc, [180, 200, 230]);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Futsal Nakes · HKN Ke-62', W / 2, 152, { align: 'center' });

    rgb(doc, [255, 255, 255]);
    doc.setFontSize(9);
    doc.text('Penyusun: Anara Tech', W / 2, H - 8, { align: 'center' });

    // ---- SUMMARY ----
    addPage();
    progress({ phase: 'halaman', current: 2, total: 3 + ordered.length, label: 'Ringkasan' });
    drawHeaderBar(doc, W, 'Ringkasan Infografis');
    const stats = summarize(ordered);
    let y = 22;
    rgb(doc, NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Ringkasan Kit Faskes', M, y);
    y += 8;
    rgb(doc, MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Data sesuai filter unduhan. Angka dihitung dari tim yang disertakan.', M, y);
    y += 10;

    function statCard(x, yy, w, h, title, value, accent) {
      fill(doc, SOFT);
      doc.roundedRect(x, yy, w, h, 2.5, 2.5, 'F');
      fill(doc, accent || TEAL);
      doc.rect(x, yy, 2.2, h, 'F');
      rgb(doc, MUTED);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(title, x + 6, yy + 7);
      rgb(doc, NAVY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text(String(value), x + 6, yy + 18);
    }
    const cw = (W - 2 * M - 8) / 3;
    statCard(M, y, cw, 24, 'Total tim', stats.total, NAVY);
    statCard(M + cw + 4, y, cw, 24, 'Tim Putra', stats.putra, TEAL);
    statCard(M + 2 * (cw + 4), y, cw, 24, 'Tim Putri', stats.putri, LIME);
    y += 30;
    statCard(M, y, cw, 24, 'Terverifikasi', stats.verified, TEAL);
    statCard(M + cw + 4, y, cw, 24, 'Menunggu', stats.pending, [234, 179, 8]);
    statCard(M + 2 * (cw + 4), y, cw, 24, 'Ditolak', stats.rejected, [220, 38, 38]);
    y += 32;
    statCard(M, y, cw, 24, 'Tim gabungan', stats.gabungan, NAVY);
    if (stats.kosong) statCard(M + cw + 4, y, cw, 24, 'Kategori belum diisi', stats.kosong, MUTED);
    y += 34;

    rgb(doc, NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Per jenis instansi', M, y);
    y += 6;
    JENIS_ORDER.forEach(j => {
      const n = stats.jenis[j] || 0;
      const barW = Math.max(2, (W - 2 * M - 55) * (stats.total ? n / stats.total : 0));
      rgb(doc, INK);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(jenisLabel(j), M, y + 4);
      fill(doc, LINE);
      doc.roundedRect(M + 42, y, W - 2 * M - 55, 5, 1, 1, 'F');
      fill(doc, TEAL);
      doc.roundedRect(M + 42, y, barW, 5, 1, 1, 'F');
      rgb(doc, NAVY);
      doc.setFont('helvetica', 'bold');
      doc.text(String(n), W - M, y + 4, { align: 'right' });
      y += 9;
    });

    // ---- TOC ----
    addPage();
    progress({ phase: 'halaman', current: 3, total: 3 + ordered.length, label: 'Daftar isi' });
    drawHeaderBar(doc, W, 'Daftar Isi');
    y = 22;
    rgb(doc, NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Daftar Isi', M, y);
    y += 10;

    function tocBlock(title, list) {
      if (!list.length) return;
      if (y > H - 30) { addPage(); drawHeaderBar(doc, W, 'Daftar Isi'); y = 22; }
      fill(doc, NAVY);
      doc.roundedRect(M, y - 4, W - 2 * M, 8, 1.5, 1.5, 'F');
      rgb(doc, [255, 255, 255]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(title + ' (' + list.length + ')', M + 3, y + 1.5);
      y += 10;
      list.forEach((t, i) => {
        if (y > H - 18) { addPage(); drawHeaderBar(doc, W, 'Daftar Isi'); y = 22; }
        rgb(doc, INK);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const left = clip(doc, (i + 1) + '. ' + (t.namaTim || t.id), 9, W - 2 * M - 50);
        doc.text(left, M + 2, y);
        rgb(doc, MUTED);
        doc.setFontSize(8);
        doc.text(jenisLabel(t.jenisInstansi), W - M, y, { align: 'right' });
        y += 6;
      });
      y += 4;
    }
    if (kat !== 'Putri') tocBlock('TIM PUTRA', putra);
    if (kat !== 'Putra') tocBlock('TIM PUTRI', putri);
    if (kat === 'Semua') tocBlock('KATEGORI BELUM DIISI', kosong);

    async function drawDivider(title, subtitle) {
      addPage();
      fill(doc, NAVY);
      doc.rect(0, 0, W, H, 'F');
      fill(doc, LIME);
      doc.rect(0, H / 2 - 20, W, 2, 'F');
      rgb(doc, LIME);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(26);
      doc.text(title, W / 2, H / 2 - 4, { align: 'center' });
      rgb(doc, [200, 220, 255]);
      doc.setFontSize(11);
      doc.text(subtitle || '', W / 2, H / 2 + 8, { align: 'center' });
      rgb(doc, [255, 255, 255]);
      doc.setFontSize(9);
      doc.text('Penyusun: Anara Tech', W / 2, H - 12, { align: 'center' });
    }

    async function drawTeamPage(t, sectionName, indexInSection, sectionTotal) {
      addPage();
      drawHeaderBar(doc, W, sectionName + ' · ' + (t.namaTim || ''));
      const k = kitMeta(t);
      const kepala = Array.isArray(t.kepala) ? t.kepala : [];
      let yy = 18;

      // Title row
      const logo = await img(t, 'logo');
      drawImageOrPlaceholder(doc, logo, M, yy, 32, 32, 'Logo');
      rgb(doc, NAVY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      const nameLines = doc.splitTextToSize(String(t.namaTim || 'Tanpa nama'), W - M - 50);
      doc.text(nameLines.slice(0, 2), M + 36, yy + 8);
      rgb(doc, MUTED);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(jenisLabel(t.jenisInstansi) + ' · ' + String(t.namaInstansi || '—'), M + 36, yy + 18);
      // badges
      let bx = M + 36;
      const by = yy + 22;
      function badge(text, bg, fg) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        const tw = doc.getTextWidth(text) + 5;
        fill(doc, bg);
        doc.roundedRect(bx, by, tw, 5.5, 1.2, 1.2, 'F');
        rgb(doc, fg);
        doc.text(text, bx + 2.5, by + 3.9);
        bx += tw + 2.5;
      }
      const katv = kategoriOf(t) || 'Belum diisi';
      badge(katv, katv === 'Putri' ? LIME : (katv === 'Putra' ? TEAL : MUTED), katv === 'Putri' ? NAVY : [255, 255, 255]);
      badge(statusLabel(t.status), t.status === 'verified' ? TEAL : (t.status === 'rejected' ? [220, 38, 38] : [234, 179, 8]), t.status === 'pending' ? NAVY : [255, 255, 255]);
      badge('Kit ' + k.persen + '%', SOFT, NAVY);
      if (t.timGabungan) badge('Gabungan', NAVY, LIME);
      yy += 38;

      if (t.timGabungan && t.anggotaFaskes) {
        fill(doc, SOFT);
        doc.roundedRect(M, yy, W - 2 * M, 10, 2, 2, 'F');
        rgb(doc, MUTED);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(clip(doc, 'Anggota: ' + t.anggotaFaskes, 8, W - 2 * M - 6), M + 3, yy + 6.2);
        yy += 13;
      }

      // Meta line
      rgb(doc, INK);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      const meta = [
        'Kapten: ' + (t.namaKapten || '—'),
        'Warna jersey: ' + (t.warnaJersey || '—'),
        'ID: ' + (t.id || '—')
      ].join('  ·  ');
      doc.text(clip(doc, meta, 8.5, W - 2 * M), M, yy);
      yy += 5;
      if (opts.includeKontak) {
        rgb(doc, MUTED);
        doc.setFontSize(8);
        doc.text(clip(doc, 'Kontak internal: ' + (t.kontakNama || '—') + ' · WA ' + (t.kontakWA || '—'), 8, W - 2 * M), M, yy);
        yy += 5;
      }
      yy += 2;

      // Photo grid main
      const gap = 3;
      const colW = (W - 2 * M - gap) / 2;
      const ph = 48;
      const kapten = await img(t, 'fotoKapten');
      const jersey = await img(t, 'jerseyUtama');
      const jersey2 = await img(t, 'jerseyCadangan');

      function labeledPhoto(data, x, y0, w, h, label) {
        drawImageOrPlaceholder(doc, data, x, y0, w, h - 6, 'Belum ada');
        rgb(doc, NAVY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text(label, x, y0 + h - 1.2);
      }
      labeledPhoto(kapten, M, yy, colW, ph, 'Foto Kapten');
      labeledPhoto(jersey, M + colW + gap, yy, colW, ph, 'Jersey Utama');
      yy += ph + 4;
      labeledPhoto(jersey2, M, yy, colW, ph, 'Jersey Cadangan');
      // side info card
      fill(doc, SOFT);
      doc.roundedRect(M + colW + gap, yy, colW, ph - 6, 2, 2, 'F');
      rgb(doc, NAVY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('Kelengkapan kit', M + colW + gap + 3, yy + 6);
      rgb(doc, INK);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const checks = [
        (k.logo ? '✓' : '·') + ' Logo',
        (k.fotoKapten ? '✓' : '·') + ' Kapten',
        (k.fotoKepala ? '✓' : '·') + ' Pimpinan',
        (k.jerseyUtama ? '✓' : '·') + ' Jersey utama'
      ];
      checks.forEach((c, i) => doc.text(c, M + colW + gap + 3, yy + 13 + i * 5));
      yy += ph + 6;

      // Kepala section
      rgb(doc, NAVY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Kepala / Pimpinan', M, yy);
      yy += 4;
      const maxK = Math.min(kepala.length || 1, 5);
      const kCols = Math.min(maxK, 3);
      const kW = (W - 2 * M - (kCols - 1) * gap) / kCols;
      const kH = 42;
      for (let i = 0; i < maxK; i++) {
        if (i > 0 && i % 3 === 0) yy += kH + 8;
        if (yy + kH > H - 16) break; // avoid overflow; remaining omitted cleanly
        const kh = kepala[i] || { nama: '—', instansi: '' };
        const kx = M + (i % 3) * (kW + gap);
        const foto = await img(t, 'kepala_' + (i + 1));
        drawImageOrPlaceholder(doc, foto, kx, yy, kW, 28, 'Belum ada');
        rgb(doc, NAVY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text(clip(doc, kh.nama || ('Pimpinan #' + (i + 1)), 7.5, kW), kx, yy + 32);
        rgb(doc, MUTED);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.text(clip(doc, kh.instansi || '—', 6.5, kW), kx, yy + 36.5);
      }
    }

    if (kat !== 'Putri' && putra.length) {
      progress({ phase: 'halaman', current: 4, total: 4 + ordered.length, label: 'Pemisah Putra' });
      await drawDivider('TIM PUTRA', putra.length + ' tim');
      for (let i = 0; i < putra.length; i++) {
        progress({ phase: 'halaman', current: 5 + i, total: 5 + ordered.length, label: putra[i].namaTim });
        await drawTeamPage(putra[i], 'TIM PUTRA', i + 1, putra.length);
      }
    }
    if (kat !== 'Putra' && putri.length) {
      await drawDivider('TIM PUTRI', putri.length + ' tim');
      for (let i = 0; i < putri.length; i++) {
        progress({ phase: 'halaman', current: 5 + putra.length + i, total: 5 + ordered.length, label: putri[i].namaTim });
        await drawTeamPage(putri[i], 'TIM PUTRI', i + 1, putri.length);
      }
    }
    if (kat === 'Semua' && kosong.length) {
      await drawDivider('KATEGORI BELUM DIISI', kosong.length + ' tim');
      for (let i = 0; i < kosong.length; i++) {
        await drawTeamPage(kosong[i], 'BELUM DIISI', i + 1, kosong.length);
      }
    }

    // Footers on all pages except pure full-bleed cover/dividers that already branded —
    // Apply footer to every page for consistency of page numbers.
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      // skip drawing navy footer over cover/dividers? Still useful for page numbers.
      // On dark pages, draw a light page number only.
      const isDark = p === 1; // cover; dividers also dark — detect by checking we always drew footer lightly
      // Simpler: always draw footer bar (may overlay divider bottom — OK)
      drawFooter(doc, W, H, p, totalPages);
    }

    progress({ phase: 'selesai', current: totalPages, total: totalPages, label: 'Selesai' });
    const filename = 'majalah_kit_faskes_kc5_' +
      (kat === 'Semua' ? 'semua' : kat.toLowerCase()) +
      (opts.statusFilter === 'verified' ? '_verified' : '') +
      '.pdf';
    return { doc, filename, teamCount: ordered.length, pages: totalPages };
  }

  global.FutsalMagazinePdf = { generate, kategoriOf, sortTeams, summarize };
})(window);
