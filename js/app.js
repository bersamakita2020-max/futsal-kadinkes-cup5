(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const C = window.FUTSAL_CONFIG;
  const uploads = {};
  const MAX_KEPALA = 5;
  let kepalaCount = 0;

  function jenisLabel(j) {
    if (j === 'RS') return 'Rumah Sakit';
    if (j === 'Labkesda') return 'Labkesda';
    if (j === 'BPJS') return 'BPJS';
    if (j === 'DP3AP2KB') return 'DP3AP2KB';
    if (j === 'Dinkes') return 'Dinas Kesehatan';
    return 'Puskesmas';
  }
  function jenisBadgeClass(j) {
    if (j === 'RS') return 'badge-rs';
    if (j === 'Labkesda') return 'badge-labkesda';
    if (j === 'BPJS') return 'badge-bpjs';
    if (j === 'DP3AP2KB') return 'badge-dp3';
    if (j === 'Dinkes') return 'badge-dinkes';
    return 'badge-pk';
  }

  function normalizeKategori(v) {
    const s = String(v || '').trim();
    if (!s) return '';
    const low = s.toLowerCase();
    if (low === 'putra' || low === 'pria') return 'Putra';
    if (low === 'putri' || low === 'wanita' || low === 'putri (wanita)' || low === 'perempuan') return 'Putri';
    if (s === 'Putra' || s === 'Putri') return s;
    return '';
  }
  function kategoriBadge(t) {
    const k = normalizeKategori(t && t.kategoriTim);
    if (k === 'Putri') return '<span class="badge badge-putri">Putri</span>';
    if (k === 'Putra') return '<span class="badge badge-putra">Putra</span>';
    return '<span class="badge badge-kategori-empty">Kategori belum diisi</span>';
  }

  function canEditTeam(t) {
    const st = String((t && t.status) || 'pending');
    return st !== 'verified';
  }
  function editKitButtonHtml(t) {
    if (canEditTeam(t)) {
      return '<a class="btn btn-navy" style="width:100%" href="#/kit?edit=' + encodeURIComponent(t.id) + '" data-nav data-edit-kit="' + esc(t.id) + '">Edit Kit</a>';
    }
    return '<button type="button" class="btn btn-outline is-locked" style="width:100%;opacity:.65;cursor:not-allowed" disabled title="Terkunci – sudah diverifikasi" aria-disabled="true">Edit Kit · Terkunci</button>';
  }
  function kategoriPill(t) {
    const k = normalizeKategori(t && t.kategoriTim);
    if (k === 'Putri') return '<span class="pill" style="background:rgba(236,72,153,.22)">Putri</span>';
    if (k === 'Putra') return '<span class="pill ghost">Putra</span>';
    return '<span class="pill ghost">Kategori belum diisi</span>';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function kepalaOf(t) {
    if (t && Array.isArray(t.kepala) && t.kepala.length) return t.kepala;
    if (t && (t.namaKepala || t.fotoKepalaUrl)) {
      return [{
        nama: t.namaKepala || '',
        instansi: t.namaInstansi || '',
        fotoUrl: t.fotoKepalaUrl || '',
        fileId: t.fotoKepalaId || ''
      }];
    }
    return [];
  }

  function kitMeta(t) {
    if (t.kit) return t.kit;
    const logo = !!t.logoUrl;
    const jerseyUtama = !!t.jerseyUtamaUrl;
    const fotoKapten = !!t.fotoKaptenUrl;
    const fotoKepala = kepalaOf(t).some(k => !!k.fotoUrl);
    const n = [logo, jerseyUtama, fotoKapten, fotoKepala].filter(Boolean).length;
    return {
      logo, jerseyUtama, fotoKapten, fotoKepala,
      jerseyCadangan: !!t.jerseyCadanganUrl,
      lengkap: n === 4,
      persen: Math.round((n / 4) * 100),
      jumlahKepala: kepalaOf(t).length
    };
  }

  function kitBar(t) {
    const k = kitMeta(t);
    const label = k.lengkap ? 'Kit lengkap' : 'Kit belum lengkap';
    const cls = k.lengkap ? 'kit-ok' : 'kit-warn';
    return (
      '<div class="kit-meter ' + cls + '" title="' + esc(label) + '">' +
        '<div class="kit-meter-top"><span>' + esc(label) + '</span><strong>' + k.persen + '%</strong></div>' +
        '<div class="kit-track"><i style="width:' + k.persen + '%"></i></div>' +
        '<ul class="kit-check">' +
          '<li class="' + (k.logo ? 'yes' : '') + '">Logo</li>' +
          '<li class="' + (k.jerseyUtama ? 'yes' : '') + '">Jersey</li>' +
          '<li class="' + (k.fotoKapten ? 'yes' : '') + '">Kapten</li>' +
          '<li class="' + (k.fotoKepala ? 'yes' : '') + '">Pimpinan</li>' +
        '</ul>' +
      '</div>'
    );
  }

  function ph(label) {
    return '<div class="ph">' + esc(label) + '</div>';
  }
  function driveFallbacks(url) {
    const u = String(url || '');
    const m = u.match(/[?&]id=([A-Za-z0-9_-]+)/) || u.match(/\/d\/([A-Za-z0-9_-]+)/) || u.match(/lh3\.googleusercontent\.com\/d\/([A-Za-z0-9_-]+)/);
    if (!m) return [u];
    const id = m[1];
    return [
      'https://lh3.googleusercontent.com/d/' + id + '=w1600',
      'https://drive.google.com/thumbnail?id=' + id + '&sz=w1600',
      u
    ];
  }
  function imgOrPh(url, label, lb) {
    if (!url) return ph(label + ' (belum ada)');
    const list = driveFallbacks(url);
    const src = list[0];
    const alts = list.slice(1).join('|');
    return '<img' + (lb || '') + ' src="' + esc(src) + '" alt="' + esc(label) + '" loading="lazy" referrerpolicy="no-referrer" data-fallbacks="' + esc(alts) + '" onerror="window.__futsalImgErr&&window.__futsalImgErr(this)">';
  }
  window.__futsalImgErr = function (img) {
    const raw = img.getAttribute('data-fallbacks') || '';
    const rest = raw.split('|').filter(Boolean);
    if (!rest.length) { img.onerror = null; img.replaceWith(Object.assign(document.createElement('div'), { className: 'ph', textContent: (img.alt || 'Gambar') + ' (gagal muat)' })); return; }
    img.setAttribute('data-fallbacks', rest.slice(1).join('|'));
    img.src = rest[0];
  };

  // ===== Lightbox galeri publik (v1.0.16) =====
  const lbTeams = {};
  function lbAttr(t, key) {
    if (!t || !t.id) return '';
    lbTeams[t.id] = t;
    return ' data-lb-team="' + esc(t.id) + '" data-lb-key="' + esc(key) + '" tabindex="0" role="button"';
  }
  function teamPhotos(t) {
    const out = [];
    const add = (key, url, label) => { if (url) out.push({ key: key, url: url, label: label, srcs: driveFallbacks(url) }); };
    add('logo', t.logoUrl, 'Logo tim');
    add('kapten', t.fotoKaptenUrl, 'Kapten' + (t.namaKapten ? ' · ' + t.namaKapten : ''));
    kepalaOf(t).forEach((k, i) => add('kepala' + i, k.fotoUrl, 'Kepala/Pimpinan' + (k.nama ? ' · ' + k.nama : ' ' + (i + 1)) + (k.instansi ? ' (' + k.instansi + ')' : '')));
    add('jerseyUtama', t.jerseyUtamaUrl, 'Jersey utama');
    add('jerseyCadangan', t.jerseyCadanganUrl, 'Jersey cadangan');
    return out;
  }
  document.addEventListener('click', (e) => {
    const el = e.target.closest && e.target.closest('[data-lb-team]');
    if (!el || !window.FutsalLightbox) return;
    const t = lbTeams[el.getAttribute('data-lb-team')];
    if (!t) return;
    e.preventDefault(); e.stopPropagation();
    const items = teamPhotos(t);
    const idx = Math.max(0, items.findIndex(x => x.key === el.getAttribute('data-lb-key')));
    window.FutsalLightbox.open(items, idx, t.namaTim || '');
  }, true);
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-lb-team]')) { e.preventDefault(); e.target.click(); }
  });

  function avatarStack(t) {
    const list = kepalaOf(t).slice(0, 5);
    if (!list.length) return '';
    const avatars = list.map((k, i) => {
      if (k.fotoUrl) {
        return '<span class="avatar" style="z-index:' + (10 - i) + '"><img' + lbAttr(t, 'kepala' + i) + ' src="' + esc(k.fotoUrl) + '" alt="' + esc(k.nama || 'Pimpinan') + '"></span>';
      }
      return '<span class="avatar avatar-ph" style="z-index:' + (10 - i) + '" title="' + esc(k.nama || '') + '">' + esc((k.nama || '?').slice(0, 1).toUpperCase()) + '</span>';
    }).join('');
    const more = kepalaOf(t).length > 5 ? '<span class="avatar-more">+' + (kepalaOf(t).length - 5) + '</span>' : '';
    return '<div class="avatar-stack" title="Kepala/Pimpinan">' + avatars + more + '</div>';
  }

  function teamCard(t) {
    const jenis = jenisLabel(t.jenisInstansi);
    const badgeJenis = jenisBadgeClass(t.jenisInstansi);
    const statusBadge = t.status === 'verified'
      ? '<span class="badge badge-ok">Kit terverifikasi</span>'
      : t.status === 'rejected'
        ? '<span class="badge badge-demo">Ditolak</span>'
        : '<span class="badge badge-pending">Menunggu verifikasi</span>';
    const demo = t._contoh ? ' <span class="badge badge-demo">CONTOH</span>' : '';
    const gabungan = t.timGabungan ? ' <span class="badge badge-gabungan">Tim gabungan</span>' : '';
    const anggota = t.timGabungan && t.anggotaFaskes
      ? '<div class="meta anggota-line">Anggota: ' + esc(t.anggotaFaskes) + '</div>'
      : '';
    return (
      '<article class="card team-card reveal">' +
        '<div class="cover">' +
          '<span class="logo-badge"><img' + (t.logoUrl ? lbAttr(t, 'logo') : '') + ' src="' + esc(t.logoUrl || 'assets/kc5_sm.png') + '" alt="Logo ' + esc(t.namaTim) + '"></span>' +
          avatarStack(t) +
        '</div>' +
        '<div class="body">' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">' +
            '<span class="badge ' + badgeJenis + '">' + esc(jenis) + '</span>' + kategoriBadge(t) + ' ' + statusBadge + gabungan + demo +
          '</div>' +
          '<h3>' + esc(t.namaTim) + '</h3>' +
          '<div class="meta">' + esc(t.namaInstansi) + '</div>' +
          anggota +
          kitBar(t) +
          '<div class="team-mini">' +
            '<figure>' + imgOrPh(t.fotoKaptenUrl, 'Kapten', lbAttr(t, 'kapten')) + '<figcaption>Kapten: ' + esc(t.namaKapten) + '</figcaption></figure>' +
            '<figure>' + imgOrPh(t.jerseyUtamaUrl, 'Jersey', lbAttr(t, 'jerseyUtama')) + '<figcaption>Jersey utama</figcaption></figure>' +
          '</div>' +
          '<div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">' +
            '<a class="btn btn-outline" style="width:100%" href="#/tim/' + esc(t.id) + '" data-nav>Lihat kit</a>' +
            editKitButtonHtml(t) +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  function observeReveal(root) {
    const els = $$('.reveal', root || document);
    const show = (el) => el.classList.add('in');
    if (!('IntersectionObserver' in window)) { els.forEach(show); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -5% 0px' });
    els.forEach(el => io.observe(el));
    setTimeout(() => els.forEach(show), 400);
  }

  async function loadStats() {
    try {
      const res = await FutsalAPI.get('stats');
      const s = res.stats || {};
      $('#statTotal').textContent = s.total != null ? s.total : '—';
      $('#statPk').textContent = s.puskesmas != null ? s.puskesmas : '—';
      $('#statRs').textContent = s.rs != null ? s.rs : '—';
      const sl = $('#statLabkesda'); if (sl) sl.textContent = s.labkesda != null ? s.labkesda : '—';
      const sb = $('#statBpjs'); if (sb) sb.textContent = s.bpjs != null ? s.bpjs : '—';
      const sd = $('#statDp3'); if (sd) sd.textContent = s.dp3ap2kb != null ? s.dp3ap2kb : '—';
      const sdk = $('#statDinkes'); if (sdk) sdk.textContent = s.dinkes != null ? s.dinkes : '—';
      $('#statKit').textContent = s.kitLengkap != null ? s.kitLengkap : '—';
      $('#statOk').textContent = s.verified != null ? s.verified : '—';
    } catch (e) { console.warn(e); }
  }

  let cacheTeams = [];
  async function loadTeams() {
    const res = await FutsalAPI.get('listTeams', { includePending: false });
    cacheTeams = res.teams || [];
    return cacheTeams;
  }

  function renderHomeTeams() {
    const box = $('#homeTeams');
    const list = cacheTeams.filter(t => t.status === 'verified').slice(0, 3);
    box.innerHTML = list.length ? list.map(teamCard).join('') : '<div class="empty" style="grid-column:1/-1">Belum ada kit terverifikasi.</div>';
    observeReveal(box);
  }

  function renderGaleri() {
    const q = ($('#qSearch').value || '').toLowerCase().trim();
    const jenis = $('#qJenis').value;
    const kat = ($('#qKategori') && $('#qKategori').value) || '';
    let list = cacheTeams.slice();
    if (jenis) list = list.filter(t => t.jenisInstansi === jenis);
    if (kat === '__empty') list = list.filter(t => !normalizeKategori(t.kategoriTim));
    else if (kat) list = list.filter(t => normalizeKategori(t.kategoriTim) === kat);
    if (q) {
      list = list.filter(t =>
        (t.namaTim || '').toLowerCase().includes(q) ||
        (t.namaInstansi || '').toLowerCase().includes(q) ||
        (t.namaKapten || '').toLowerCase().includes(q) ||
        (t.anggotaFaskes || '').toLowerCase().includes(q) ||
        kepalaOf(t).some(k => (k.nama || '').toLowerCase().includes(q) || (k.instansi || '').toLowerCase().includes(q))
      );
    }
    const box = $('#galeriTeams');
    const empty = $('#galeriEmpty');
    if (!list.length) { box.innerHTML = ''; empty.hidden = false; }
    else { empty.hidden = true; box.innerHTML = list.map(teamCard).join(''); observeReveal(box); }
  }

  async function renderDetail(id) {
    const box = $('#detailBox');
    box.innerHTML = '<div class="empty">Memuat…</div>';
    try {
      let t = cacheTeams.find(x => x.id === id);
      if (!t) {
        const res = await FutsalAPI.get('getTeam', { id });
        t = res.team;
      }
      if (!t) throw new Error('Peserta tidak ditemukan.');
      const k = kitMeta(t);
      const demo = t._contoh ? '<span class="badge badge-demo">DATA CONTOH</span> ' : '';
      const kepala = kepalaOf(t);
      const kepalaGrid = kepala.map((kh, i) =>
        '<figure class="reveal">' +
          imgOrPh(kh.fotoUrl, 'Pimpinan ' + (i + 1), lbAttr(t, 'kepala' + i)) +
          '<figcaption>' + esc(kh.nama || ('Pimpinan ' + (i + 1))) +
            (kh.instansi ? '<br><span class="cap-sub">' + esc(kh.instansi) + '</span>' : '') +
          '</figcaption></figure>'
      ).join('');
      const gabunganBlock = t.timGabungan
        ? '<div class="form-card reveal" style="margin-bottom:16px">' +
            '<h3 style="margin-top:0;color:var(--navy)">Tim gabungan</h3>' +
            '<p style="margin:0;color:var(--muted)">Faskes/instansi anggota: <strong style="color:var(--ink)">' +
            esc(t.anggotaFaskes || '—') + '</strong></p></div>'
        : '';
      box.innerHTML =
        '<p><a href="#/galeri" data-nav>← Kembali ke galeri</a></p>' +
        '<div class="detail-hero reveal">' +
          '<span class="logo-badge">' + (t.logoUrl ? imgOrPh(t.logoUrl, 'Logo', lbAttr(t, 'logo')) : '<img src="assets/kc5_sm.png" alt="Logo">') + '</span>' +
          '<div>' + demo +
            '<div class="pill-row" style="margin-bottom:8px">' +
              '<span class="pill">' + esc(jenisLabel(t.jenisInstansi)) + '</span>' +
              kategoriPill(t) +
              (t.timGabungan ? '<span class="pill ghost">Tim gabungan</span>' : '') +
              (t.status === 'verified' ? '<span class="pill ghost">Kit terverifikasi</span>' : '<span class="pill ghost">Menunggu verifikasi</span>') +
            '</div>' +
            '<h2 style="margin:0 0 4px;font-family:var(--display);font-size:2rem;text-transform:uppercase">' + esc(t.namaTim) + '</h2>' +
            '<div style="opacity:.9">' + esc(t.namaInstansi) + '</div>' +
            (t.warnaJersey ? '<div style="margin-top:8px;font-size:.9rem">Warna jersey: <strong>' + esc(t.warnaJersey) + '</strong></div>' : '') +
          '</div>' +
        '</div>' +
        '<div class="form-card reveal" style="margin-bottom:16px">' + kitBar(t) + '</div>' +
        gabunganBlock +
        '<h3 class="section-sub">Kepala / Pimpinan</h3>' +
        '<div class="gallery-kepala stagger" style="margin-bottom:18px">' + (kepalaGrid || '<div class="empty">Belum ada data pimpinan.</div>') + '</div>' +
        '<div class="gallery-4 stagger" style="margin-bottom:18px">' +
          '<figure class="reveal">' + imgOrPh(t.fotoKaptenUrl, 'Kapten', lbAttr(t, 'kapten')) + '<figcaption>Kapten · ' + esc(t.namaKapten) + '</figcaption></figure>' +
          '<figure class="reveal">' + imgOrPh(t.jerseyUtamaUrl, 'Jersey', lbAttr(t, 'jerseyUtama')) + '<figcaption>Jersey utama</figcaption></figure>' +
          '<figure class="reveal">' + imgOrPh(t.jerseyCadanganUrl || t.logoUrl, t.jerseyCadanganUrl ? 'Cadangan' : 'Logo', lbAttr(t, t.jerseyCadanganUrl ? 'jerseyCadangan' : 'logo')) +
            '<figcaption>' + (t.jerseyCadanganUrl ? 'Jersey cadangan' : 'Logo tim') + '</figcaption></figure>' +
          '<figure class="reveal">' + imgOrPh(t.logoUrl, 'Logo', lbAttr(t, 'logo')) + '<figcaption>Logo tim</figcaption></figure>' +
        '</div>' +
        '<div class="form-actions" style="margin-top:8px">' + editKitButtonHtml(t) + '</div>';
      observeReveal(box);
    } catch (e) {
      box.innerHTML = '<div class="alert alert-err">' + esc(e.message) + '</div><p><a href="#/galeri" data-nav>← Galeri</a></p>';
    }
  }

  function bindUploadBox(box) {
    if (box.dataset.bound === '1') return;
    box.dataset.bound = '1';
    const key = box.getAttribute('data-upload');
    const input = $('input[type=file]', box);
    const preview = $('.preview', box);
    const nameEl = $('.name', box);
    const prog = $('.progress', box);
    const bar = $('i', prog);
    const handle = async (file) => {
      if (!file) return;
      prog.classList.add('on'); bar.style.width = '20%';
      try {
        bar.style.width = '55%';
        const compressed = await FutsalAPI.compressImage(file);
        bar.style.width = '100%';
        uploads[key] = compressed;
        preview.src = compressed.dataUrl;
        box.classList.add('has-file');
        nameEl.textContent = compressed.name + ' · ~' + Math.round(compressed.bytesApprox / 1024) + ' KB';
      } catch (err) {
        uploads[key] = null;
        box.classList.remove('has-file');
        nameEl.textContent = '';
        alert(err.message || 'Gagal memproses gambar');
      } finally {
        setTimeout(() => { prog.classList.remove('on'); bar.style.width = '0'; }, 400);
      }
    };
    input.addEventListener('change', () => handle(input.files && input.files[0]));
    box.addEventListener('dragover', (e) => { e.preventDefault(); box.classList.add('drag'); });
    box.addEventListener('dragleave', () => box.classList.remove('drag'));
    box.addEventListener('drop', (e) => {
      e.preventDefault(); box.classList.remove('drag');
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handle(f);
    });
  }

  function setupUploads(root) {
    $$('.upload', root || document).forEach(bindUploadBox);
  }

  function kepalaKey(idx) { return 'kepala_' + idx; }

  function addKepalaRow(prefill) {
    if (kepalaCount >= MAX_KEPALA) return;
    kepalaCount += 1;
    const idx = kepalaCount;
    const list = $('#kepalaList');
    const wrap = document.createElement('div');
    wrap.className = 'kepala-card';
    wrap.dataset.kepalaIdx = String(idx);
    wrap.innerHTML =
      '<div class="kepala-card-top">' +
        '<strong>Pimpinan #' + idx + '</strong>' +
        '<button type="button" class="btn-x" data-remove-kepala aria-label="Hapus">×</button>' +
      '</div>' +
      '<div class="kepala-fields">' +
        '<label class="field">Nama kepala / pimpinan *' +
          '<input type="text" data-k="nama" maxlength="100" required placeholder="Nama lengkap" value="' + esc((prefill && prefill.nama) || '') + '">' +
        '</label>' +
        '<label class="field">Faskes / instansi asal *' +
          '<input type="text" data-k="instansi" maxlength="120" required placeholder="Puskesmas / RS / instansi asal" value="' + esc((prefill && prefill.instansi) || '') + '">' +
        '</label>' +
        '<div class="upload" data-upload="' + kepalaKey(idx) + '">' +
          '<img class="preview" alt="Preview pimpinan">' +
          '<div class="lbl">📷 Foto Pimpinan ' + (idx === 1 ? '*' : '') + '</div>' +
          '<div class="name"></div>' +
          '<input type="file" accept="image/jpeg,image/png,image/webp">' +
          '<div class="progress"><i></i></div>' +
        '</div>' +
      '</div>';
    list.appendChild(wrap);
    setupUploads(wrap);
    const rm = $('[data-remove-kepala]', wrap);
    rm.addEventListener('click', () => {
      if (kepalaCount <= 1) {
        alert('Minimal 1 kepala/pimpinan.');
        return;
      }
      const key = kepalaKey(idx);
      delete uploads[key];
      wrap.remove();
      reindexKepala();
    });
    $('#btnAddKepala').disabled = kepalaCount >= MAX_KEPALA;
  }

  function reindexKepala() {
    const cards = $$('#kepalaList .kepala-card');
    kepalaCount = cards.length;
    cards.forEach((card, i) => {
      const n = i + 1;
      const oldKey = card.querySelector('.upload') && card.querySelector('.upload').getAttribute('data-upload');
      const newKey = kepalaKey(n);
      card.dataset.kepalaIdx = String(n);
      $('.kepala-card-top strong', card).textContent = 'Pimpinan #' + n;
      const up = $('.upload', card);
      if (up) {
        up.setAttribute('data-upload', newKey);
        $('.lbl', up).textContent = '📷 Foto Pimpinan ' + (n === 1 ? '*' : '');
        if (oldKey && oldKey !== newKey && uploads[oldKey]) {
          uploads[newKey] = uploads[oldKey];
          delete uploads[oldKey];
        }
      }
    });
    $('#btnAddKepala').disabled = kepalaCount >= MAX_KEPALA;
  }

  function collectKepala() {
    const cards = $$('#kepalaList .kepala-card');
    const kepala = [];
    const files = {};
    cards.forEach((card, i) => {
      const n = i + 1;
      const nama = String(($('[data-k=nama]', card) || {}).value || '').trim();
      const instansi = String(($('[data-k=instansi]', card) || {}).value || '').trim();
      const key = kepalaKey(n);
      kepala.push({ nama, instansi });
      if (uploads[key] && uploads[key].dataUrl) files[key] = uploads[key];
    });
    return { kepala, files };
  }

  function estimatePayloadBytes(payload) {
    try { return JSON.stringify(payload).length; } catch (_) { return 0; }
  }


  let ownerSession = null; // { team, editCode }

  function statusLabel(st) {
    if (st === 'verified') return 'Kit terverifikasi';
    if (st === 'rejected') return 'Ditolak';
    return 'Menunggu verifikasi';
  }
  function statusBadgeHtml(st) {
    if (st === 'verified') return '<span class="badge badge-ok">Kit terverifikasi</span>';
    if (st === 'rejected') return '<span class="badge badge-demo">Ditolak</span>';
    return '<span class="badge badge-pending">Menunggu verifikasi</span>';
  }

  function renderOwnerSummary(team) {
    const box = $('#cekResultCard');
    if (!box) return;
    if (!team) { box.innerHTML = '<div class="alert alert-err">Data kit tidak tersedia.</div>'; return; }
    const k = kitMeta(team);
    const kepala = kepalaOf(team);
    const gabungan = team.timGabungan
      ? '<div class="owner-kv"><span>Tim gabungan</span><strong>' + esc(team.anggotaFaskes || 'Ya') + '</strong></div>'
      : '';
    const kepalaHtml = kepala.length
      ? ('<h4 style="margin:16px 0 8px;color:var(--navy)">Kepala / Pimpinan</h4><div class="owner-kepala">' +
        kepala.map((kh, i) =>
          '<figure>' + imgOrPh(kh.fotoUrl, 'Pimpinan ' + (i + 1)) +
          '<figcaption>' + esc(kh.nama || ('Pimpinan ' + (i + 1))) +
          (kh.instansi ? '<div class="cap-sub">' + esc(kh.instansi) + '</div>' : '') +
          '</figcaption></figure>'
        ).join('') + '</div>')
      : '';
    box.innerHTML =
      '<div class="owner-top">' +
        '<div class="owner-logo">' + (team.logoUrl ? imgOrPh(team.logoUrl, 'Logo') : '<img src="assets/kc5_sm.png" alt="Logo">') + '</div>' +
        '<div class="owner-meta">' +
          '<div class="pill-row" style="margin-bottom:4px;gap:6px;flex-wrap:wrap">' +
            '<span class="badge ' + jenisBadgeClass(team.jenisInstansi) + '">' + esc(jenisLabel(team.jenisInstansi)) + '</span>' +
            kategoriBadge(team) +
            statusBadgeHtml(team.status) +
            (team.timGabungan ? '<span class="badge badge-gabungan">Tim gabungan</span>' : '') +
            (team._contoh ? '<span class="badge badge-demo">CONTOH</span>' : '') +
          '</div>' +
          '<h3>' + esc(team.namaTim || '—') + '</h3>' +
          '<div class="meta">' + esc(team.namaInstansi || '') + '</div>' +
          '<div class="meta" style="margin-top:4px">ID: <strong>' + esc(team.id || '—') + '</strong></div>' +
        '</div>' +
      '</div>' +
      '<div class="form-card" style="margin:0 0 12px;padding:12px;box-shadow:none">' + kitBar(team) + '</div>' +
      '<div class="owner-grid">' +
        '<div class="owner-kv"><span>Kategori tim</span><strong>' + esc(normalizeKategori(team.kategoriTim) || 'Kategori belum diisi') + '</strong></div>' +
        '<div class="owner-kv"><span>Kapten</span><strong>' + esc(team.namaKapten || '—') + '</strong></div>' +
        '<div class="owner-kv"><span>Warna jersey</span><strong>' + esc(team.warnaJersey || '—') + '</strong></div>' +
        '<div class="owner-kv"><span>Kontak</span><strong>' + esc(team.kontakNama || '—') + '</strong></div>' +
        '<div class="owner-kv"><span>WA kontak</span><strong>' + esc(team.kontakWA || '—') + '</strong></div>' +
        '<div class="owner-kv"><span>Status verifikasi</span><strong>' + esc(statusLabel(team.status)) + '</strong></div>' +
        '<div class="owner-kv"><span>Kelengkapan kit</span><strong>' + (k.persen != null ? k.persen + '%' : '—') + '</strong></div>' +
        gabungan +
        (team.catatan ? '<div class="owner-kv"><span>Catatan</span><strong>' + esc(team.catatan) + '</strong></div>' : '') +
      '</div>' +
      kepalaHtml +
      '<h4 style="margin:16px 0 8px;color:var(--navy)">Aset kit</h4>' +
      '<div class="owner-thumbs">' +
        '<figure>' + imgOrPh(team.logoUrl, 'Logo') + '<figcaption>Logo</figcaption></figure>' +
        '<figure>' + imgOrPh(team.jerseyUtamaUrl, 'Jersey utama') + '<figcaption>Jersey utama</figcaption></figure>' +
        '<figure>' + imgOrPh(team.jerseyCadanganUrl, 'Jersey cadangan') + '<figcaption>Jersey cadangan</figcaption></figure>' +
        '<figure>' + imgOrPh(team.fotoKaptenUrl, 'Kapten') + '<figcaption>Foto kapten</figcaption></figure>' +
      '</div>';
    observeReveal(box);
  }

  function setUploadPreviewFromUrl(key, url, label) {
    const box = $('.upload[data-upload="' + key + '"]');
    if (!box || !url) return;
    const preview = $('.preview', box);
    const nameEl = $('.name', box);
    if (preview) preview.src = url;
    box.classList.add('has-file');
    if (nameEl) nameEl.textContent = (label || key) + ' · foto tersimpan (unggah baru untuk mengganti)';
    // jangan isi uploads[key] — biarkan server mempertahankan file lama
  }

  function prefillFormFromTeam(team) {
    const form = $('#formDaftar');
    if (!form || !team) return;
    form.reset();
    Object.keys(uploads).forEach(k => delete uploads[k]);
    $$('.upload').forEach(u => {
      u.classList.remove('has-file');
      const n = $('.name', u); if (n) n.textContent = '';
      const p = $('.preview', u); if (p) p.removeAttribute('src');
    });
    const set = (name, val) => {
      const el = form.elements[name];
      if (el) el.value = val == null ? '' : String(val);
    };
    set('teamId', team.id || '');
    set('jenisInstansi', team.jenisInstansi || '');
    set('namaInstansi', team.namaInstansi || '');
    set('namaTim', team.namaTim || '');
    set('kategoriTim', normalizeKategori(team.kategoriTim) || '');
    set('namaKapten', team.namaKapten || '');
    // publik tidak punya kontak — biarkan kosong; server pertahankan nilai lama jika kosong
    set('kontakNama', team.kontakNama || '');
    set('kontakWA', team.kontakWA || '');
    set('warnaJersey', team.warnaJersey || '');
    set('catatan', ''); // catatan tidak diekspos publik
    const chk = $('#chkTimGabungan');
    const anggotaWrap = $('#anggotaWrap');
    if (chk) {
      chk.checked = !!team.timGabungan;
      if (anggotaWrap) anggotaWrap.hidden = !chk.checked;
    }
    set('anggotaFaskes', team.anggotaFaskes || '');

    $('#kepalaList').innerHTML = '';
    kepalaCount = 0;
    const kepala = kepalaOf(team);
    if (!kepala.length) addKepalaRow();
    else kepala.forEach((kh) => addKepalaRow(kh));
    // preview foto kepala dari URL tersimpan
    kepala.forEach((kh, i) => {
      if (kh.fotoUrl) setUploadPreviewFromUrl('kepala_' + (i + 1), kh.fotoUrl, 'Pimpinan ' + (i + 1));
    });
    setUploadPreviewFromUrl('fotoKapten', team.fotoKaptenUrl, 'Kapten');
    setUploadPreviewFromUrl('logo', team.logoUrl, 'Logo');
    setUploadPreviewFromUrl('jerseyUtama', team.jerseyUtamaUrl, 'Jersey utama');
    setUploadPreviewFromUrl('jerseyCadangan', team.jerseyCadanganUrl, 'Jersey cadangan');

    const hint = $('#daftarHint');
    if (hint) {
      hint.className = 'alert alert-ok';
      hint.innerHTML = 'Mode pembaruan aktif untuk <strong>' + esc(team.namaTim || team.id) +
        '</strong>. Ubah field/foto yang perlu, lalu simpan — data tidak digandakan. Kit terverifikasi tidak bisa diedit.';
    }
    const btn = $('#btnSubmit');
    if (btn) btn.textContent = 'Simpan Pembaruan Kit';
  }

  function resetCekUI() {
    ownerSession = null;
    const wrap = $('#cekResultWrap');
    if (wrap) wrap.hidden = true;
    const card = $('#cekResultCard');
    if (card) card.innerHTML = '';
    const msg = $('#cekMsg');
    if (msg) { msg.hidden = true; msg.textContent = ''; }
    const form = $('#formCekKode');
    if (form) form.reset();
  }


  function fuzzyScore(query, text) {
    const q = String(query || '').toLowerCase().trim();
    const s = String(text || '').toLowerCase();
    if (!q) return 1;
    if (s === q) return 100;
    if (s.startsWith(q)) return 80;
    if (s.includes(q)) return 60;
    // subsequence fuzzy
    let qi = 0, score = 0;
    for (let i = 0; i < s.length && qi < q.length; i++) {
      if (s[i] === q[qi]) { score += 2; qi++; }
    }
    return qi === q.length ? 20 + score : 0;
  }


  let lastPrefillId = '';
  async function maybePrefillEditFromHash() {
    const hash = location.hash || '';
    const m = hash.match(/[?&]edit=([^&]+)/);
    const id = m ? decodeURIComponent(m[1]) : '';
    if (!id) return;
    if (lastPrefillId === id && ($('#teamId') && $('#teamId').value === id)) return;
    try {
      let t = cacheTeams.find(x => x.id === id);
      if (!t) {
        const res = await FutsalAPI.get('getTeam', { id });
        t = res.team;
      }
      if (!t) throw new Error('Tim tidak ditemukan.');
      if (!canEditTeam(t)) {
        const hint = $('#daftarHint');
        if (hint) {
          hint.className = 'alert alert-warn';
          hint.innerHTML = 'Kit <strong>' + esc(t.namaTim || id) + '</strong> sudah diverifikasi dan terkunci. Hubungi panitia bila perlu perubahan.';
        }
        return;
      }
      prefillFormFromTeam(t);
      lastPrefillId = id;
    } catch (e) {
      const hint = $('#daftarHint');
      if (hint) { hint.className = 'alert alert-err'; hint.textContent = e.message || 'Gagal memuat data untuk edit.'; }
    }
  }

  function setupForm() {

    setupUploads();
    const form = $('#formDaftar');
    const btn = $('#btnSubmit');
    const chk = $('#chkTimGabungan');
    const anggotaWrap = $('#anggotaWrap');
    chk.addEventListener('change', () => {
      anggotaWrap.hidden = !chk.checked;
      if (!chk.checked) $('#anggotaFaskes').value = '';
    });
    $('#btnAddKepala').addEventListener('click', () => addKepalaRow());
    // default 1 entry
    addKepalaRow();

    form.addEventListener('submit', FutsalAPI.withBusy(btn, async (e) => {
      e.preventDefault();
      const msg = $('#formMsg');
      msg.hidden = true;
      const fd = new FormData(form);
      const teamId = String(fd.get('teamId') || '').trim();
      const timGabungan = !!$('#chkTimGabungan').checked;
      const anggotaFaskes = String(fd.get('anggotaFaskes') || '').trim();
      if (timGabungan && !anggotaFaskes) {
        msg.hidden = false; msg.className = 'alert alert-err';
        msg.textContent = 'Isi daftar faskes/instansi anggota untuk tim gabungan.';
        return;
      }
      const { kepala, files: kepalaFiles } = collectKepala();
      if (!kepala.length || !kepala[0].nama) {
        msg.hidden = false; msg.className = 'alert alert-err';
        msg.textContent = 'Minimal 1 nama kepala/pimpinan.';
        return;
      }
      for (let i = 0; i < kepala.length; i++) {
        if (!kepala[i].nama || !kepala[i].instansi) {
          msg.hidden = false; msg.className = 'alert alert-err';
          msg.textContent = 'Lengkapi nama & faskes asal pimpinan #' + (i + 1) + '.';
          return;
        }
      }
      const requiredUploads = ['fotoKapten', 'logo', 'jerseyUtama'];
      if (!teamId) {
        for (const k of requiredUploads) {
          if (!uploads[k] || !uploads[k].dataUrl) {
            msg.hidden = false; msg.className = 'alert alert-err';
            msg.textContent = 'Untuk kit baru, unggah wajib: kapten, logo, dan jersey utama.';
            return;
          }
        }
        if (!kepalaFiles.kepala_1) {
          msg.hidden = false; msg.className = 'alert alert-err';
          msg.textContent = 'Unggah minimal foto pimpinan #1.';
          return;
        }
      }
      const kategoriTim = normalizeKategori(fd.get('kategoriTim'));
      if (!kategoriTim) {
        msg.hidden = false; msg.className = 'alert alert-err';
        msg.textContent = 'Pilih Kategori Tim: Putra atau Putri.';
        return;
      }
      const wa = String(fd.get('kontakWA') || '').replace(/\D/g, '');
      if (!teamId && wa.length < 10) {
        msg.hidden = false; msg.className = 'alert alert-err';
        msg.textContent = 'Nomor WA tidak valid.';
        return;
      }
      if (teamId && wa && wa.length < 10) {
        msg.hidden = false; msg.className = 'alert alert-err';
        msg.textContent = 'Nomor WA tidak valid.';
        return;
      }
      const payload = {
        id: teamId || null,
        jenisInstansi: fd.get('jenisInstansi'),
        namaInstansi: String(fd.get('namaInstansi') || '').trim(),
        namaTim: String(fd.get('namaTim') || '').trim(),
        kategoriTim,
        namaKapten: String(fd.get('namaKapten') || '').trim(),
        namaKepala: kepala[0].nama,
        kontakNama: String(fd.get('kontakNama') || '').trim(),
        kontakWA: wa,
        warnaJersey: String(fd.get('warnaJersey') || '').trim(),
        catatan: String(fd.get('catatan') || '').trim(),
        timGabungan,
        anggotaFaskes,
        kepala,
        files: {
          fotoKapten: uploads.fotoKapten || null,
          logo: uploads.logo || null,
          jerseyUtama: uploads.jerseyUtama || null,
          jerseyCadangan: uploads.jerseyCadangan || null,
          ...kepalaFiles
        }
      };

      const SAFE = 7 * 1024 * 1024;
      try {
        let res;
        const size = estimatePayloadBytes(payload);
        if (size > SAFE && teamId) {
          // kirim metadata dulu tanpa file besar, lalu unggah berurutan
          const meta = Object.assign({}, payload, { files: {} });
          res = await FutsalAPI.post('saveKit', meta);
          const fileEntries = Object.keys(payload.files).filter(k => payload.files[k] && payload.files[k].dataUrl);
          for (const key of fileEntries) {
            const extra = {};
            if (key.indexOf('kepala_') === 0) {
              const ix = parseInt(key.split('_')[1], 10) - 1;
              if (kepala[ix]) {
                extra.nama = kepala[ix].nama;
                extra.instansi = kepala[ix].instansi;
              }
            }
            await FutsalAPI.post('uploadKitFile', {
              id: teamId, key, file: payload.files[key], ...extra
            });
          }
          msg.hidden = false; msg.className = 'alert alert-ok';
          msg.textContent = (res.message || 'Kit diperbarui.') + ' (unggah bertahap OK)';
        } else if (size > SAFE && !teamId) {
          // kit baru: kirim tanpa kepala photos ekstra dulu — tetap kirim kepala_1 + aset inti; sisa berurutan
          const firstFiles = {
            fotoKapten: payload.files.fotoKapten,
            logo: payload.files.logo,
            jerseyUtama: payload.files.jerseyUtama,
            jerseyCadangan: payload.files.jerseyCadangan || null,
            kepala_1: payload.files.kepala_1
          };
          const firstPayload = Object.assign({}, payload, { files: firstFiles });
          res = await FutsalAPI.post('saveKit', firstPayload);
          const newId = res.id;
          for (let i = 2; i <= kepala.length; i++) {
            const key = 'kepala_' + i;
            if (payload.files[key] && newId) {
              await FutsalAPI.post('uploadKitFile', {
                id: newId, key, file: payload.files[key],
                nama: kepala[i - 1].nama, instansi: kepala[i - 1].instansi
              });
            }
          }
          msg.hidden = false; msg.className = 'alert alert-ok';
          let text = res.message || 'Kit tersimpan.';
          if (newId) text += ' ID: ' + newId;
          msg.textContent = text;
        } else {
          res = await FutsalAPI.post('saveKit', payload);
          msg.hidden = false; msg.className = 'alert alert-ok';
          let text = res.message || 'Kit tersimpan.';
          if (res.id && !res.updated) text += ' ID: ' + res.id;
          if (res.kit) text += ' · Kelengkapan ' + res.kit.persen + '%';
          msg.textContent = text;
        }
        if (!teamId) {
          form.reset();
          Object.keys(uploads).forEach(k => delete uploads[k]);
          $$('.upload').forEach(u => { u.classList.remove('has-file'); $('.name', u).textContent = ''; });
          $('#kepalaList').innerHTML = '';
          kepalaCount = 0;
          addKepalaRow();
          anggotaWrap.hidden = true;
        }
        window.scrollTo({ top: msg.offsetTop - 80, behavior: 'smooth' });
      } catch (err) {
        msg.hidden = false; msg.className = 'alert alert-err';
        msg.textContent = err.message || 'Gagal mengirim.';
      }
    }));
    form.addEventListener('reset', () => {
      Object.keys(uploads).forEach(k => delete uploads[k]);
      $$('.upload').forEach(u => { u.classList.remove('has-file'); $('.name', u).textContent = ''; });
      $('#formMsg').hidden = true;
      const tid = $('#teamId'); if (tid) tid.value = '';
      lastPrefillId = '';
      const hint = $('#daftarHint');
      if (hint) {
        hint.className = 'alert alert-info';
        hint.innerHTML = 'Unggah kit baru, atau buka <strong>Galeri → Edit Kit</strong> untuk memperbarui data selama belum diverifikasi (tanpa data ganda).';
      }
      const btn = $('#btnSubmit'); if (btn) btn.textContent = 'Kirim Kit Faskes';
      $('#kepalaList').innerHTML = '';
      kepalaCount = 0;
      setTimeout(() => { addKepalaRow(); anggotaWrap.hidden = true; }, 0);
    });
  }

  const views = {
    home: $('#view-home'),
    galeri: $('#view-galeri'),
    detail: $('#view-detail'),
    daftar: $('#view-daftar')
  };

  function setActiveNav(path) {
    $$('#navLinks a[data-nav]').forEach(a => {
      const href = a.getAttribute('href');
      const map = { home: '#/', galeri: '#/galeri', kit: '#/kit', daftar: '#/kit' };
      a.classList.toggle('active', href === map[path] || (path === 'home' && href === '#/'));
    });
  }

  async function route() {
    const hash = location.hash || '#/';
    const pathOnly = hash.replace(/^#\/?/, '').split('?')[0];
    const parts = pathOnly.split('/');
    const page = parts[0] || 'home';
    Object.values(views).forEach(v => v.classList.remove('active'));
    $('#navLinks').classList.remove('open');

    if (page === 'galeri') {
      views.galeri.classList.add('active'); setActiveNav('galeri');
      if (!cacheTeams.length) await loadTeams();
      renderGaleri();
    } else if (page === 'kit' || page === 'daftar') {
      views.daftar.classList.add('active'); setActiveNav('kit');
      await maybePrefillEditFromHash();
    } else if (page === 'tim' && parts[1]) {
      views.detail.classList.add('active'); setActiveNav('galeri');
      await renderDetail(parts[1]);
    } else {
      views.home.classList.add('active'); setActiveNav('home');
      await loadStats();
      if (!cacheTeams.length) await loadTeams();
      renderHomeTeams();
      observeReveal(document);
    }
  }

  function boot() {
    if (FutsalAPI.isDemo()) $('#demoBanner').hidden = false;
    $('#versiLabel').textContent = C.VERSI || '1.0.17';
    $('#pillTanggal').textContent = C.TANGGAL_EVENT || '8–12 November 2026';
    $('#menuToggle').onclick = () => $('#navLinks').classList.toggle('open');
    $('#qSearch') && $('#qSearch').addEventListener('input', renderGaleri);
    $('#qJenis') && $('#qJenis').addEventListener('change', renderGaleri);
    $('#qKategori') && $('#qKategori').addEventListener('change', renderGaleri);
    setupForm();
    window.addEventListener('hashchange', route);
    route();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
