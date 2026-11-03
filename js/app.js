(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const C = window.FUTSAL_CONFIG;
  const uploads = {};

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function kitMeta(t) {
    if (t.kit) return t.kit;
    const logo = !!t.logoUrl;
    const jerseyUtama = !!t.jerseyUtamaUrl;
    const fotoKapten = !!t.fotoKaptenUrl;
    const fotoKepala = !!t.fotoKepalaUrl;
    const n = [logo, jerseyUtama, fotoKapten, fotoKepala].filter(Boolean).length;
    return {
      logo, jerseyUtama, fotoKapten, fotoKepala,
      jerseyCadangan: !!t.jerseyCadanganUrl,
      lengkap: n === 4,
      persen: Math.round((n / 4) * 100)
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
          '<li class="' + (k.fotoKepala ? 'yes' : '') + '">Kepala</li>' +
        '</ul>' +
      '</div>'
    );
  }

  function ph(label) {
    return '<div class="ph">' + esc(label) + '</div>';
  }
  function imgOrPh(url, label) {
    if (url) return '<img src="' + esc(url) + '" alt="' + esc(label) + '" loading="lazy">';
    return ph(label + ' (belum ada)');
  }

  function teamCard(t) {
    const jenis = t.jenisInstansi === 'RS' ? 'RS' : 'Puskesmas';
    const badgeJenis = jenis === 'RS' ? 'badge-rs' : 'badge-pk';
    const statusBadge = t.status === 'verified'
      ? '<span class="badge badge-ok">Kit terverifikasi</span>'
      : t.status === 'rejected'
        ? '<span class="badge badge-demo">Ditolak</span>'
        : '<span class="badge badge-pending">Menunggu verifikasi</span>';
    const demo = t._contoh ? ' <span class="badge badge-demo">CONTOH</span>' : '';
    return (
      '<article class="card team-card reveal">' +
        '<div class="cover">' +
          '<span class="logo-badge"><img src="' + esc(t.logoUrl || 'assets/kc5_sm.png') + '" alt="Logo ' + esc(t.namaTim) + '"></span>' +
        '</div>' +
        '<div class="body">' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">' +
            '<span class="badge ' + badgeJenis + '">' + esc(jenis) + '</span>' + statusBadge + demo +
          '</div>' +
          '<h3>' + esc(t.namaTim) + '</h3>' +
          '<div class="meta">' + esc(t.namaInstansi) + '</div>' +
          kitBar(t) +
          '<div class="team-mini">' +
            '<figure>' + imgOrPh(t.fotoKaptenUrl, 'Kapten') + '<figcaption>Kapten: ' + esc(t.namaKapten) + '</figcaption></figure>' +
            '<figure>' + imgOrPh(t.jerseyUtamaUrl, 'Jersey') + '<figcaption>Jersey utama</figcaption></figure>' +
          '</div>' +
          '<div style="margin-top:12px"><a class="btn btn-outline" style="width:100%" href="#/tim/' + esc(t.id) + '" data-nav>Lihat kit</a></div>' +
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
    let list = cacheTeams.slice();
    if (jenis) list = list.filter(t => t.jenisInstansi === jenis);
    if (q) {
      list = list.filter(t =>
        (t.namaTim || '').toLowerCase().includes(q) ||
        (t.namaInstansi || '').toLowerCase().includes(q) ||
        (t.namaKapten || '').toLowerCase().includes(q)
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
      const pemain = Array.isArray(t.pemain) ? t.pemain : [];
      const k = kitMeta(t);
      const demo = t._contoh ? '<span class="badge badge-demo">DATA CONTOH</span> ' : '';
      box.innerHTML =
        '<p><a href="#/galeri" data-nav>← Kembali ke galeri</a></p>' +
        '<div class="detail-hero reveal">' +
          '<span class="logo-badge"><img src="' + esc(t.logoUrl || 'assets/kc5_sm.png') + '" alt="Logo"></span>' +
          '<div>' + demo +
            '<div class="pill-row" style="margin-bottom:8px">' +
              '<span class="pill">' + esc(t.jenisInstansi === 'RS' ? 'Rumah Sakit' : 'Puskesmas') + '</span>' +
              (t.status === 'verified' ? '<span class="pill ghost">Kit terverifikasi</span>' : '<span class="pill ghost">Menunggu verifikasi</span>') +
            '</div>' +
            '<h2 style="margin:0 0 4px;font-family:var(--display);font-size:2rem;text-transform:uppercase">' + esc(t.namaTim) + '</h2>' +
            '<div style="opacity:.9">' + esc(t.namaInstansi) + '</div>' +
            (t.warnaJersey ? '<div style="margin-top:8px;font-size:.9rem">Warna jersey: <strong>' + esc(t.warnaJersey) + '</strong></div>' : '') +
          '</div>' +
        '</div>' +
        '<div class="form-card reveal" style="margin-bottom:16px">' + kitBar(t) + '</div>' +
        '<div class="gallery-4 stagger" style="margin-bottom:18px">' +
          '<figure class="reveal">' + imgOrPh(t.fotoKaptenUrl, 'Kapten') + '<figcaption>Kapten · ' + esc(t.namaKapten) + '</figcaption></figure>' +
          '<figure class="reveal">' + imgOrPh(t.fotoKepalaUrl, 'Kepala') + '<figcaption>Kepala / Direktur · ' + esc(t.namaKepala) + '</figcaption></figure>' +
          '<figure class="reveal">' + imgOrPh(t.jerseyUtamaUrl, 'Jersey') + '<figcaption>Jersey utama</figcaption></figure>' +
          '<figure class="reveal">' + imgOrPh(t.jerseyCadanganUrl || t.logoUrl, t.jerseyCadanganUrl ? 'Cadangan' : 'Logo') +
            '<figcaption>' + (t.jerseyCadanganUrl ? 'Jersey cadangan' : 'Logo tim') + '</figcaption></figure>' +
        '</div>' +
        '<div class="form-card reveal">' +
          '<h3 style="margin-top:0;color:var(--navy)">Kontak</h3>' +
          '<p style="margin:0;color:var(--muted)">Manajer: <strong style="color:var(--ink)">' + esc(t.kontakNama) + '</strong>' +
          (t.kontakWA ? ' · WA: <a href="https://wa.me/62' + esc(String(t.kontakWA).replace(/^0/, '').replace(/\D/g, '')) + '" target="_blank" rel="noopener">' + esc(t.kontakWA) + '</a>' : '') +
          '</p>' +
          (pemain.length
            ? '<h3 style="color:var(--navy);margin-top:18px">Skuad</h3><div class="table-wrap"><table class="data"><thead><tr><th>#</th><th>Nama</th><th>Posisi</th></tr></thead><tbody>' +
              pemain.map(p => '<tr><td>' + esc(p.nomor || '—') + '</td><td>' + esc(p.nama) + '</td><td>' + esc(p.posisi || '—') + '</td></tr>').join('') +
              '</tbody></table></div>'
            : '') +
        '</div>';
      observeReveal(box);
    } catch (e) {
      box.innerHTML = '<div class="alert alert-err">' + esc(e.message) + '</div><p><a href="#/galeri" data-nav>← Galeri</a></p>';
    }
  }

  function setupUploads() {
    $$('.upload').forEach(box => {
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
    });
  }

  function addPlayerRow(data) {
    data = data || {};
    const row = document.createElement('div');
    row.className = 'player-row';
    row.innerHTML =
      '<input type="text" placeholder="Nama pemain" value="' + esc(data.nama || '') + '" data-p="nama">' +
      '<input type="number" placeholder="No" min="0" max="99" value="' + esc(data.nomor != null ? data.nomor : '') + '" data-p="nomor">' +
      '<input type="text" placeholder="Posisi" value="' + esc(data.posisi || '') + '" data-p="posisi">' +
      '<button type="button" class="x" title="Hapus">×</button>';
    $('.x', row).onclick = () => row.remove();
    $('#playersBox').appendChild(row);
  }

  function collectPlayers() {
    return $$('#playersBox .player-row').map(row => ({
      nama: ($('[data-p=nama]', row).value || '').trim(),
      nomor: ($('[data-p=nomor]', row).value || '').trim(),
      posisi: ($('[data-p=posisi]', row).value || '').trim()
    })).filter(p => p.nama);
  }

  function setupForm() {
    setupUploads();
    $('#btnAddPlayer').onclick = () => addPlayerRow();
    addPlayerRow();
    const form = $('#formDaftar');
    const btn = $('#btnSubmit');
    form.addEventListener('submit', FutsalAPI.withBusy(btn, async (e) => {
      e.preventDefault();
      const msg = $('#formMsg');
      msg.hidden = true;
      const fd = new FormData(form);
      const editCode = String(fd.get('editCode') || '').trim();
      const requiredUploads = ['fotoKapten', 'fotoKepala', 'logo', 'jerseyUtama'];
      if (!editCode) {
        for (const k of requiredUploads) {
          if (!uploads[k] || !uploads[k].dataUrl) {
            msg.hidden = false; msg.className = 'alert alert-err';
            msg.textContent = 'Untuk kit baru, unggah wajib: kapten, kepala, logo, dan jersey utama.';
            return;
          }
        }
      }
      const wa = String(fd.get('kontakWA') || '').replace(/\D/g, '');
      if (wa.length < 10) {
        msg.hidden = false; msg.className = 'alert alert-err';
        msg.textContent = 'Nomor WA tidak valid.';
        return;
      }
      const payload = {
        editCode: editCode || null,
        jenisInstansi: fd.get('jenisInstansi'),
        namaInstansi: String(fd.get('namaInstansi') || '').trim(),
        namaTim: String(fd.get('namaTim') || '').trim(),
        namaKapten: String(fd.get('namaKapten') || '').trim(),
        namaKepala: String(fd.get('namaKepala') || '').trim(),
        kontakNama: String(fd.get('kontakNama') || '').trim(),
        kontakWA: wa,
        warnaJersey: String(fd.get('warnaJersey') || '').trim(),
        catatan: String(fd.get('catatan') || '').trim(),
        pemain: collectPlayers(),
        files: {
          fotoKapten: uploads.fotoKapten || null,
          fotoKepala: uploads.fotoKepala || null,
          logo: uploads.logo || null,
          jerseyUtama: uploads.jerseyUtama || null,
          jerseyCadangan: uploads.jerseyCadangan || null
        }
      };
      try {
        const res = await FutsalAPI.post('saveKit', payload);
        msg.hidden = false; msg.className = 'alert alert-ok';
        let text = res.message || 'Kit tersimpan.';
        if (res.editCode) {
          text += ' Kode edit Anda (simpan sekarang): ' + res.editCode;
          try { localStorage.setItem('futsal_kc5_edit_' + (res.id || 'last'), res.editCode); } catch (_) {}
        }
        if (res.kit) text += ' · Kelengkapan ' + res.kit.persen + '%';
        msg.textContent = text;
        if (!editCode) {
          form.reset();
          Object.keys(uploads).forEach(k => delete uploads[k]);
          $$('.upload').forEach(u => { u.classList.remove('has-file'); $('.name', u).textContent = ''; });
          $('#playersBox').innerHTML = '';
          addPlayerRow();
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
    const parts = hash.replace(/^#\/?/, '').split('/');
    const page = parts[0] || 'home';
    Object.values(views).forEach(v => v.classList.remove('active'));
    $('#navLinks').classList.remove('open');

    if (page === 'galeri') {
      views.galeri.classList.add('active'); setActiveNav('galeri');
      if (!cacheTeams.length) await loadTeams();
      renderGaleri();
    } else if (page === 'kit' || page === 'daftar') {
      views.daftar.classList.add('active'); setActiveNav('kit');
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
    $('#versiLabel').textContent = C.VERSI || '1.0.2';
    $('#pillTanggal').textContent = C.TANGGAL_EVENT || '8–12 November 2026';
    $('#menuToggle').onclick = () => $('#navLinks').classList.toggle('open');
    $('#qSearch') && $('#qSearch').addEventListener('input', renderGaleri);
    $('#qJenis') && $('#qJenis').addEventListener('change', renderGaleri);
    setupForm();
    window.addEventListener('hashchange', route);
    route();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
