(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const C = window.FUTSAL_CONFIG;
  let token = sessionStorage.getItem(C.ADMIN_SESSION_KEY || 'futsal_kc5_admin_token') || '';
  let teams = [];
  let previewTeam = null;
  let lightboxCtx = null;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showPanel(ok) {
    $('#loginBox').hidden = ok;
    $('#adminPanel').hidden = !ok;
    $('#btnLogout').hidden = !ok;
  }

  function jenisLabel(j) {
    if (j === 'RS') return 'Rumah Sakit';
    if (j === 'Labkesda') return 'Labkesda';
    if (j === 'BPJS') return 'BPJS';
    if (j === 'DP3AP2KB') return 'DP3AP2KB';
    return j || 'Puskesmas';
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
  function statusLabel(s) {
    if (s === 'verified') return '<span class="badge badge-ok">Kit terverifikasi</span>';
    if (s === 'rejected') return '<span class="badge badge-demo">Ditolak</span>';
    return '<span class="badge badge-pending">Menunggu</span>';
  }
  function kitMeta(t) {
    if (t.kit) return t.kit;
    return { lengkap: false, persen: 0, logo: false, jerseyUtama: false, fotoKapten: false, fotoKepala: false };
  }
  function waLink(wa) {
    const n = String(wa || '').replace(/\D/g, '').replace(/^0/, '');
    if (!n) return '';
    return 'https://wa.me/62' + n;
  }
  function thumb(url) {
    return url || 'assets/kc5_sm.png';
  }

  function filtered() {
    const st = $('#fStatus').value;
    const jenis = $('#fJenis').value;
    const kit = $('#fKit').value;
    const kat = ($('#fKategori') && $('#fKategori').value) || '';
    const q = ($('#fSearch').value || '').toLowerCase().trim();
    let list = teams.slice();
    if (st) list = list.filter(t => t.status === st);
    if (jenis) list = list.filter(t => t.jenisInstansi === jenis);
    if (kit === 'lengkap') list = list.filter(t => kitMeta(t).lengkap);
    if (kit === 'belum') list = list.filter(t => !kitMeta(t).lengkap);
    if (kat === '__empty') list = list.filter(t => !normalizeKategori(t.kategoriTim));
    else if (kat) list = list.filter(t => normalizeKategori(t.kategoriTim) === kat);
    if (q) {
      list = list.filter(t =>
        (t.namaTim || '').toLowerCase().includes(q) ||
        (t.namaInstansi || '').toLowerCase().includes(q) ||
        (t.namaKapten || '').toLowerCase().includes(q) ||
        (t.id || '').toLowerCase().includes(q)
      );
    }
    return list;
  }

  function thumbStrip(t) {
    const items = [
      { u: t.logoUrl, l: 'Logo' },
      { u: t.fotoKaptenUrl, l: 'Kapten' },
      { u: t.fotoKepalaUrl, l: 'Pimpinan' },
      { u: t.jerseyUtamaUrl, l: 'Jersey' }
    ];
    return '<div class="admin-thumbs">' + items.map(it =>
      it.u
        ? '<img src="' + esc(thumb(it.u)) + '" alt="' + esc(it.l) + '" loading="lazy">'
        : '<span class="admin-thumb-ph">' + esc(it.l) + '</span>'
    ).join('') + '</div>';
  }

  function kitDots(t) {
    const k = kitMeta(t);
    return (
      '<ul class="kit-check admin-kit-mini">' +
        '<li class="' + (k.logo ? 'yes' : '') + '">Logo</li>' +
        '<li class="' + (k.jerseyUtama ? 'yes' : '') + '">Jersey</li>' +
        '<li class="' + (k.fotoKapten ? 'yes' : '') + '">Kapten</li>' +
        '<li class="' + (k.fotoKepala ? 'yes' : '') + '">Pimpinan</li>' +
      '</ul>'
    );
  }

  function listRoot() {
    // v1.0.6+ = #adminList; cache lama / HTML lama = #adminRows
    return $('#adminList') || $('#adminRows');
  }

  function showAdminError(msg) {
    const el = $('#adminMsg');
    if (!el) { console.error(msg); return; }
    el.hidden = false;
    el.className = 'alert alert-err';
    el.textContent = msg;
  }


  function maskCode(code) {
    const s = String(code || '');
    if (s.length <= 4) return '••••';
    return s.slice(0, 4) + '••••' + s.slice(-2);
  }

  function kodeEditHtml(t, opts) {
    opts = opts || {};
    const compact = !!opts.compact;
    const id = esc(t.id);
    if (t.hasEditCode && t.editCode) {
      return (
        '<div class="kode-box" data-kode-id="' + id + '">' +
          '<div class="kode-label">Kode edit</div>' +
          '<div class="kode-row">' +
            '<code class="kode-val" data-kode-display data-masked="1" data-full="' + esc(t.editCode) + '">' + esc(maskCode(t.editCode)) + '</code>' +
            '<button type="button" class="btn btn-outline kode-btn" data-kode-toggle>Lihat</button>' +
            '<button type="button" class="btn btn-navy kode-btn" data-kode-copy>Salin</button>' +
          '</div>' +
        '</div>'
      );
    }
    return (
      '<div class="kode-box kode-missing" data-kode-id="' + id + '">' +
        '<div class="kode-label">Kode edit</div>' +
        '<div class="kode-row">' +
          '<span class="kode-missing-txt">Kode belum tersimpan' +
            (t.editCodeLegacy ? ' (data lama)' : '') +
          '</span>' +
          '<button type="button" class="btn btn-primary kode-btn" data-kode-reset>Buat Kode Baru</button>' +
        '</div>' +
        (compact ? '' : '<div class="hint" style="margin-top:6px">Hanya admin yang bisa membuat kode baru. Kode lama (jika ada) akan diganti.</div>') +
      '</div>'
    );
  }

  async function copyText(text) {
    const s = String(text || '');
    if (!s) return false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(s);
        return true;
      }
    } catch (_) {}
    try {
      const ta = document.createElement('textarea');
      ta.value = s; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (_) { return false; }
  }

  function bindKodeControls(root) {
    (root || document).querySelectorAll('[data-kode-toggle]').forEach(btn => {
      if (btn.dataset.boundKode === '1') return;
      btn.dataset.boundKode = '1';
      btn.onclick = () => {
        const box = btn.closest('[data-kode-id]');
        const el = box && box.querySelector('[data-kode-display]');
        if (!el) return;
        const masked = el.getAttribute('data-masked') === '1';
        if (masked) {
          el.textContent = el.getAttribute('data-full') || '';
          el.setAttribute('data-masked', '0');
          btn.textContent = 'Sembunyikan';
        } else {
          el.textContent = maskCode(el.getAttribute('data-full') || '');
          el.setAttribute('data-masked', '1');
          btn.textContent = 'Lihat';
        }
      };
    });
    (root || document).querySelectorAll('[data-kode-copy]').forEach(btn => {
      if (btn.dataset.boundKode === '1') return;
      btn.dataset.boundKode = '1';
      btn.onclick = FutsalAPI.withBusy(btn, async () => {
        const box = btn.closest('[data-kode-id]');
        const el = box && box.querySelector('[data-kode-display]');
        const full = el && el.getAttribute('data-full');
        const ok = await copyText(full);
        const msg = $('#adminMsg');
        if (msg) {
          msg.hidden = false;
          msg.className = ok ? 'alert alert-ok' : 'alert alert-err';
          msg.textContent = ok ? 'Kode edit disalin.' : 'Gagal menyalin. Salin manual.';
        }
      });
    });
    (root || document).querySelectorAll('[data-kode-reset]').forEach(btn => {
      if (btn.dataset.boundKode === '1') return;
      btn.dataset.boundKode = '1';
      btn.onclick = FutsalAPI.withBusy(btn, async () => {
        const box = btn.closest('[data-kode-id]');
        const id = box && box.getAttribute('data-kode-id');
        if (!id) return;
        const t = teams.find(x => x.id === id) || (previewTeam && previewTeam.id === id ? previewTeam : null);
        const nama = (t && t.namaTim) || id;
        const ok = window.confirm(
          'Buat kode edit BARU untuk "' + nama + '"?\\n\\n' +
          'Kode lama (jika masih diingat faskes) tidak berlaku lagi. Lanjutkan?'
        );
        if (!ok) return;
        const msg = $('#adminMsg');
        try {
          const res = await FutsalAPI.post('adminResetEditCode', { token, id, confirm: true });
          const code = res.editCode;
          const row = teams.find(x => x.id === id);
          if (row) {
            row.editCode = code;
            row.hasEditCode = true;
            row.editCodeLegacy = false;
          }
          if (previewTeam && previewTeam.id === id) {
            previewTeam.editCode = code;
            previewTeam.hasEditCode = true;
            previewTeam.editCodeLegacy = false;
          }
          if (msg) {
            msg.hidden = false;
            msg.className = 'alert alert-ok';
            msg.textContent = (res.message || 'Kode baru dibuat.') + (code ? (' Kode: ' + code) : '');
          }
          if (code) await copyText(code);
          render();
          if (previewTeam && previewTeam.id === id && !$('#previewModal').hidden) {
            renderPreviewBody(previewTeam);
            bindKodeControls($('#previewBody'));
          }
          if (code) window.alert('Kode edit baru:\\n\\n' + code + '\\n\\nSudah dicoba disalin ke clipboard. Sampaikan ke faskes.');
        } catch (e) {
          if (msg) {
            msg.hidden = false;
            msg.className = 'alert alert-err';
            msg.textContent = e.message || 'Gagal membuat kode baru.';
          }
          throw e;
        }
      });
    });
  }

  function render() {

    const list = filtered();
    const box = listRoot();
    if (!box) {
      showAdminError('Elemen daftar admin (#adminList / #adminRows) tidak ditemukan. Hard-refresh (Ctrl+F5) atau bersihkan cache browser.');
      return;
    }
    if (!list.length) {
      box.innerHTML = '<div class="empty">Tidak ada data sesuai filter.</div>';
      return;
    }
    box.innerHTML = list.map(t => {
      const k = kitMeta(t);
      const gab = t.timGabungan ? ' <span class="badge badge-gabungan">Gabungan</span>' : '';
      return (
        '<article class="admin-card" data-id="' + esc(t.id) + '">' +
          '<div class="admin-card-main">' +
            thumbStrip(t) +
            '<div class="admin-card-info">' +
              '<div class="admin-card-badges">' +
                '<span class="badge">' + esc(jenisLabel(t.jenisInstansi)) + '</span> ' +
                kategoriBadge(t) + ' ' +
                statusLabel(t.status) + gab +
                (t._contoh ? ' <span class="badge badge-demo">CONTOH</span>' : '') +
              '</div>' +
              '<h3>' + esc(t.namaTim) + '</h3>' +
              '<div class="meta">' + esc(t.namaInstansi) + '</div>' +
              '<div class="meta" style="font-size:.78rem">' + esc(t.id) +
                ' · Kit ' + k.persen + '%' + (k.lengkap ? ' lengkap' : '') +
              '</div>' +
              kitDots(t) +
              kodeEditHtml(t, { compact: true }) +
            '</div>' +
          '</div>' +
          '<div class="admin-card-actions">' +
            '<button type="button" class="btn btn-navy" data-preview>Preview Kit</button>' +
            '<button type="button" class="btn btn-primary" data-act="verified">Kit OK</button>' +
            '<button type="button" class="btn btn-outline" data-act="pending">Tunda</button>' +
            '<button type="button" class="btn btn-danger" data-act="rejected">Tolak</button>' +
            '<button type="button" class="btn btn-outline" data-zip-one>ZIP</button>' +
          '</div>' +
        '</article>'
      );
    }).join('');

    box.querySelectorAll('[data-preview]').forEach(btn => {
      btn.onclick = () => openPreview(btn.closest('[data-id]').getAttribute('data-id'));
    });
    box.querySelectorAll('button[data-act]').forEach(btn => {
      btn.onclick = FutsalAPI.withBusy(btn, async () => {
        const id = btn.closest('[data-id]').getAttribute('data-id');
        await setStatus(id, btn.getAttribute('data-act'), '');
      });
    });
    box.querySelectorAll('[data-zip-one]').forEach(btn => {
      btn.onclick = FutsalAPI.withBusy(btn, async () => {
        const id = btn.closest('[data-id]').getAttribute('data-id');
        const t = teams.find(x => x.id === id);
        if (t) await downloadTeamZip(t, btn);
      });
    });
    bindKodeControls(box);
  }

  async function setStatus(id, status, note) {
    const msg = $('#adminMsg');
    try {
      await FutsalAPI.post('adminSetStatus', { token, id, status, catatanAdmin: note || '' });
      const row = teams.find(x => x.id === id);
      if (row) {
        row.status = status;
        if (note) row.catatanAdmin = note;
      }
      msg.hidden = false;
      msg.className = 'alert alert-ok';
      msg.textContent = 'Status ' + id + ' → ' + status + (FutsalAPI.isDemo() ? ' (demo)' : '');
      render();
      if (previewTeam && previewTeam.id === id) {
        previewTeam.status = status;
        if (note) previewTeam.catatanAdmin = note;
        renderPreviewBody(previewTeam);
      }
    } catch (e) {
      msg.hidden = false;
      msg.className = 'alert alert-err';
      msg.textContent = e.message;
      throw e;
    }
  }

  function fileEntries(t) {
    const out = [];
    if (t.files && t.files.logo && t.files.logo.fileId) out.push({ key: 'logo', label: 'Logo', ...t.files.logo });
    else if (t.logoUrl || t.logoId) out.push({ key: 'logo', label: 'Logo', url: t.logoUrl, fileId: t.logoId, driveUrl: t.logoId ? 'https://drive.google.com/file/d/' + t.logoId + '/view' : '' });
    if (t.files && t.files.fotoKapten && t.files.fotoKapten.fileId) out.push({ key: 'fotoKapten', label: 'Kapten', ...t.files.fotoKapten });
    else if (t.fotoKaptenUrl || t.fotoKaptenId) out.push({ key: 'fotoKapten', label: 'Kapten', url: t.fotoKaptenUrl, fileId: t.fotoKaptenId, driveUrl: '' });
    if (t.files && t.files.jerseyUtama && t.files.jerseyUtama.fileId) out.push({ key: 'jerseyUtama', label: 'Jersey utama', ...t.files.jerseyUtama });
    else if (t.jerseyUtamaUrl || t.jerseyUtamaId) out.push({ key: 'jerseyUtama', label: 'Jersey utama', url: t.jerseyUtamaUrl, fileId: t.jerseyUtamaId, driveUrl: '' });
    if (t.files && t.files.jerseyCadangan && t.files.jerseyCadangan.fileId) out.push({ key: 'jerseyCadangan', label: 'Jersey cadangan', ...t.files.jerseyCadangan });
    else if (t.jerseyCadanganUrl || t.jerseyCadanganId) out.push({ key: 'jerseyCadangan', label: 'Jersey cadangan', url: t.jerseyCadanganUrl, fileId: t.jerseyCadanganId, driveUrl: '' });
    const kepala = Array.isArray(t.kepala) ? t.kepala : [];
    kepala.forEach((k, i) => {
      if (k.fotoUrl || k.fileId) {
        out.push({
          key: k.key || ('kepala_' + (i + 1)),
          label: 'Pimpinan #' + (i + 1) + (k.nama ? ' · ' + k.nama : ''),
          url: k.fotoUrl,
          fileId: k.fileId,
          driveUrl: k.driveUrl || ''
        });
      }
    });
    return out;
  }

  function renderPreviewBody(t) {
    const k = kitMeta(t);
    const kepala = Array.isArray(t.kepala) ? t.kepala : [];
    const files = fileEntries(t);
    const wa = waLink(t.kontakWA);
    $('#previewTitle').textContent = t.namaTim || 'Preview Kit';
    $('#previewSub').innerHTML =
      esc(jenisLabel(t.jenisInstansi)) + ' · ' + esc(t.namaInstansi) + '<br>' +
      statusLabel(t.status) + ' · Kit ' + k.persen + '%' +
      (t.timGabungan ? ' · <span class="badge badge-gabungan">Tim gabungan</span>' : '');

    let kepalaHtml = kepala.map((kh, i) =>
      '<div class="preview-person">' +
        (kh.fotoUrl ? '<img src="' + esc(kh.fotoUrl) + '" alt="" data-lb="' + esc(kh.fotoUrl) + '" data-drive="' + esc(kh.driveUrl || '') + '" data-key="' + esc(kh.key || ('kepala_' + (i + 1))) + '">' : '<div class="ph">Foto</div>') +
        '<div><strong>' + esc(kh.nama || ('Pimpinan #' + (i + 1))) + '</strong>' +
        (kh.instansi ? '<div class="meta">' + esc(kh.instansi) + '</div>' : '') +
        '</div></div>'
    ).join('') || '<div class="empty">Belum ada pimpinan.</div>';

    let gallery = files.map(f =>
      '<figure class="preview-shot">' +
        (f.url ? '<img src="' + esc(f.url) + '" alt="' + esc(f.label) + '" data-lb="' + esc(f.url) + '" data-drive="' + esc(f.driveUrl || '') + '" data-key="' + esc(f.key) + '">' : '<div class="ph">Kosong</div>') +
        '<figcaption>' +
          '<span>' + esc(f.label) + '</span>' +
          '<span class="preview-shot-acts">' +
            (f.driveUrl ? '<a href="' + esc(f.driveUrl) + '" target="_blank" rel="noopener">Drive</a>' : '') +
            '<button type="button" class="linkish" data-dl="' + esc(f.key) + '">Unduh</button>' +
          '</span>' +
        '</figcaption>' +
      '</figure>'
    ).join('');

    $('#previewBody').innerHTML =
      '<div class="preview-grid">' +
        '<section class="form-card">' +
          '<h3 style="margin-top:0;color:var(--navy)">Identitas</h3>' +
          '<dl class="preview-dl">' +
            '<div><dt>ID</dt><dd>' + esc(t.id) + '</dd></div>' +
            '<div><dt>Jenis</dt><dd>' + esc(jenisLabel(t.jenisInstansi)) + '</dd></div>' +
            '<div><dt>Instansi</dt><dd>' + esc(t.namaInstansi) + '</dd></div>' +
            '<div><dt>Nama tim</dt><dd>' + esc(t.namaTim) + '</dd></div>' +
            '<div><dt>Kategori</dt><dd>' + kategoriBadge(t) +
              ' <label class="kode-inline" style="display:inline-flex;gap:6px;align-items:center;margin-left:8px;font-size:.8rem">Ubah ' +
              '<select data-admin-kategori style="font:inherit;border-radius:8px;padding:4px 8px;border:1px solid var(--line)">' +
                '<option value="">—</option>' +
                '<option value="Putra"' + (normalizeKategori(t.kategoriTim)==='Putra'?' selected':'') + '>Putra</option>' +
                '<option value="Putri"' + (normalizeKategori(t.kategoriTim)==='Putri'?' selected':'') + '>Putri</option>' +
              '</select></label></dd></div>' +
            (t.timGabungan ? '<div><dt>Tim gabungan</dt><dd>' + esc(t.anggotaFaskes || 'ya') + '</dd></div>' : '') +
            '<div><dt>Kapten</dt><dd>' + esc(t.namaKapten) + '</dd></div>' +
            '<div><dt>Warna jersey</dt><dd>' + esc(t.warnaJersey || '—') + '</dd></div>' +
            '<div><dt>Catatan faskes</dt><dd>' + esc(t.catatan || '—') + '</dd></div>' +
            '<div><dt>Catatan admin</dt><dd>' + esc(t.catatanAdmin || '—') + '</dd></div>' +
            '<div><dt>Dibuat</dt><dd>' + esc(t.createdAt || '—') + '</dd></div>' +
            '<div><dt>Diperbarui</dt><dd>' + esc(t.updatedAt || '—') + '</dd></div>' +
          '</dl>' +
          kitDots(t) +
          '<div style="margin-top:12px">' + kodeEditHtml(t) + '</div>' +
        '</section>' +
        '<section class="form-card">' +
          '<h3 style="margin-top:0;color:var(--navy)">Kontak</h3>' +
          '<p style="margin:0">' + esc(t.kontakNama || '—') +
          (t.kontakWA ? (' · ' + (wa ? '<a href="' + esc(wa) + '" target="_blank" rel="noopener">' + esc(t.kontakWA) + '</a>' : esc(t.kontakWA))) : '') +
          '</p>' +
          (t.folderUrl ? '<p style="margin:10px 0 0"><a href="' + esc(t.folderUrl) + '" target="_blank" rel="noopener">📁 Buka folder Drive tim</a></p>' : '') +
          '<h3 style="color:var(--navy)">Kepala / Pimpinan</h3>' +
          '<div class="preview-kepala">' + kepalaHtml + '</div>' +
        '</section>' +
      '</div>' +
      '<h3 class="section-sub">Semua foto unggahan</h3>' +
      '<div class="preview-gallery">' + (gallery || '<div class="empty">Belum ada foto.</div>') + '</div>';

    $('#previewBody').querySelectorAll('img[data-lb]').forEach(img => {
      img.style.cursor = 'zoom-in';
      img.onclick = () => openLightbox({
        url: img.getAttribute('data-lb'),
        drive: img.getAttribute('data-drive'),
        key: img.getAttribute('data-key'),
        teamId: t.id
      });
    });
    $('#previewBody').querySelectorAll('[data-dl]').forEach(btn => {
      btn.onclick = FutsalAPI.withBusy(btn, async () => {
        await downloadOne(t.id, btn.getAttribute('data-dl'), btn);
      });
    });
    bindKodeControls($('#previewBody'));
    const katSel = $('#previewBody [data-admin-kategori]');
    if (katSel) {
      katSel.onchange = FutsalAPI.withBusy(katSel, async () => {
        const val = katSel.value;
        if (!val) return;
        const msg = $('#adminMsg');
        try {
          await FutsalAPI.post('adminSetStatus', {
            token, id: t.id, status: t.status || 'pending', kategoriTim: val
          });
          t.kategoriTim = val;
          const row = teams.find(x => x.id === t.id);
          if (row) row.kategoriTim = val;
          if (msg) { msg.hidden = false; msg.className = 'alert alert-ok'; msg.textContent = 'Kategori → ' + val; }
          render();
          renderPreviewBody(t);
        } catch (e) {
          if (msg) { msg.hidden = false; msg.className = 'alert alert-err'; msg.textContent = e.message; }
          throw e;
        }
      });
    }
  }

  async function openPreview(id) {
    let t = teams.find(x => x.id === id);
    try {
      if (!FutsalAPI.isDemo()) {
        const res = await FutsalAPI.post('adminGetTeam', { token, id });
        if (res.team) {
          t = res.team;
          const ix = teams.findIndex(x => x.id === id);
          if (ix >= 0) teams[ix] = t;
        }
      } else if (t && !t.files) {
        // enrich demo
        t = enrichDemoAdmin(t);
      }
    } catch (e) {
      alert(e.message);
      return;
    }
    if (!t) return;
    previewTeam = t;
    $('#previewNote').value = t.catatanAdmin || '';
    renderPreviewBody(t);
    $('#previewModal').hidden = false;
    document.body.classList.add('modal-open');
  }

  function enrichDemoAdmin(t) {
    const kepala = (t.kepala || []).map((k, i) => Object.assign({}, k, {
      fileId: k.fileId || ('demo-kepala-' + i),
      driveUrl: k.fotoUrl || '',
      key: 'kepala_' + (i + 1)
    }));
    return Object.assign({}, t, {
      kontakWA: t.kontakWA || '081234567890',
      catatan: t.catatan || 'Catatan CONTOH',
      catatanAdmin: t.catatanAdmin || '',
      updatedAt: t.updatedAt || t.createdAt,
      folderId: 'DEMO_FOLDER',
      folderUrl: '#',
      logoId: 'demo-logo',
      fotoKaptenId: 'demo-kapten',
      jerseyUtamaId: 'demo-jersey',
      jerseyCadanganId: t.jerseyCadanganUrl ? 'demo-jersey2' : '',
      kepala,
      files: {
        logo: { url: t.logoUrl, fileId: 'demo-logo', driveUrl: t.logoUrl, key: 'logo' },
        fotoKapten: { url: t.fotoKaptenUrl, fileId: 'demo-kapten', driveUrl: t.fotoKaptenUrl, key: 'fotoKapten' },
        jerseyUtama: { url: t.jerseyUtamaUrl, fileId: 'demo-jersey', driveUrl: t.jerseyUtamaUrl, key: 'jerseyUtama' },
        jerseyCadangan: { url: t.jerseyCadanganUrl, fileId: t.jerseyCadanganUrl ? 'demo-jersey2' : '', driveUrl: t.jerseyCadanganUrl || '', key: 'jerseyCadangan' },
        kepala
      }
    });
  }

  function closePreview() {
    $('#previewModal').hidden = true;
    document.body.classList.remove('modal-open');
    previewTeam = null;
  }

  function openLightbox(ctx) {
    lightboxCtx = ctx;
    $('#lightboxImg').src = ctx.url;
    const a = $('#lightboxDrive');
    if (ctx.drive) { a.hidden = false; a.href = ctx.drive; }
    else { a.hidden = true; a.removeAttribute('href'); }
    $('#lightbox').hidden = false;
  }
  function closeLightbox() {
    $('#lightbox').hidden = true;
    lightboxCtx = null;
    $('#lightboxImg').removeAttribute('src');
  }

  function b64ToBlob(b64, mime) {
    const bin = atob(b64);
    const len = bin.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime || 'application/octet-stream' });
  }

  function triggerDownload(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  async function downloadOne(teamId, key, btn) {
    const msg = $('#adminMsg');
    if (FutsalAPI.isDemo()) {
      // demo: fetch image url as blob if possible
      const t = teams.find(x => x.id === teamId) || previewTeam;
      const f = fileEntries(t || {}).find(x => x.key === key);
      if (f && f.url) {
        const res = await fetch(f.url);
        const blob = await res.blob();
        triggerDownload(blob, (t && t.namaTim ? t.namaTim : 'kit') + '_' + key + '.jpg');
        return;
      }
      throw new Error('File demo tidak tersedia.');
    }
    const res = await FutsalAPI.post('adminDownloadFile', { token, id: teamId, key });
    const blob = b64ToBlob(res.base64, res.mime);
    triggerDownload(blob, res.filename || (key + '.bin'));
    if (msg) {
      msg.hidden = false;
      msg.className = 'alert alert-ok';
      msg.textContent = 'Unduhan: ' + (res.filename || key);
    }
  }

  function teamDataText(t) {
    const lines = [
      'ID: ' + (t.id || ''),
      'Status: ' + (t.status || ''),
      'Jenis: ' + (t.jenisInstansi || ''),
      'Instansi: ' + (t.namaInstansi || ''),
      'Tim: ' + (t.namaTim || ''),
      'Kapten: ' + (t.namaKapten || ''),
      'Tim gabungan: ' + (t.timGabungan ? 'ya' : 'tidak'),
      'Anggota: ' + (t.anggotaFaskes || ''),
      'Warna jersey: ' + (t.warnaJersey || ''),
      'Kontak: ' + (t.kontakNama || ''),
      'WA: ' + (t.kontakWA || ''),
      'Catatan: ' + (t.catatan || ''),
      'Catatan admin: ' + (t.catatanAdmin || ''),
      'Dibuat: ' + (t.createdAt || ''),
      'Diperbarui: ' + (t.updatedAt || ''),
      '',
      'Kepala/Pimpinan:'
    ];
    (t.kepala || []).forEach((k, i) => {
      lines.push('  ' + (i + 1) + '. ' + (k.nama || '') + ' — ' + (k.instansi || ''));
    });
    return lines.join('\n');
  }

  async function fetchFileForZip(t, key) {
    if (FutsalAPI.isDemo()) {
      const f = fileEntries(t).find(x => x.key === key);
      if (!f || !f.url) return null;
      const res = await fetch(f.url);
      const blob = await res.blob();
      const ext = (blob.type || '').includes('png') ? 'png' : 'jpg';
      return { filename: (t.namaTim || 'tim').replace(/\s+/g, '_') + '_' + key + '.' + ext, blob };
    }
    const res = await FutsalAPI.post('adminDownloadFile', { token, id: t.id, key });
    return { filename: res.filename, blob: b64ToBlob(res.base64, res.mime) };
  }

  async function downloadTeamZip(t, btn) {
    if (typeof JSZip === 'undefined') throw new Error('JSZip belum dimuat.');
    const zip = new JSZip();
    const folder = zip.folder((t.namaTim || t.id || 'kit').replace(/[\\/:*?"<>|]+/g, '-'));
    folder.file('data.txt', teamDataText(t));
    folder.file('data.csv', [
      'field,value',
      ...Object.entries({
        id: t.id, status: t.status, jenisInstansi: t.jenisInstansi, namaInstansi: t.namaInstansi,
        namaTim: t.namaTim, namaKapten: t.namaKapten, kontakNama: t.kontakNama, kontakWA: t.kontakWA,
        warnaJersey: t.warnaJersey, catatan: t.catatan, catatanAdmin: t.catatanAdmin,
        timGabungan: t.timGabungan ? 'ya' : 'tidak', anggotaFaskes: t.anggotaFaskes
      }).map(([k, v]) => '"' + k + '","' + String(v == null ? '' : v).replace(/"/g, '""') + '"')
    ].join('\n'));
    const keys = fileEntries(t).map(f => f.key);
    let done = 0;
    for (const key of keys) {
      try {
        const file = await fetchFileForZip(t, key);
        if (file) folder.file(file.filename, file.blob);
      } catch (e) {
        folder.file('ERROR_' + key + '.txt', String(e.message || e));
      }
      done++;
      if (btn) btn.textContent = 'ZIP ' + done + '/' + keys.length;
    }
    const blob = await zip.generateAsync({ type: 'blob' }, meta => {
      if (btn && meta.percent) btn.textContent = 'Pack ' + Math.round(meta.percent) + '%';
    });
    triggerDownload(blob, (t.namaTim || t.id || 'kit').replace(/\s+/g, '_') + '_kit.zip');
    if (btn) btn.textContent = btn.hasAttribute('data-zip-one') ? 'ZIP' : 'Unduh Semua Kit (ZIP)';
  }

  async function refresh() {
    try {
      const res = await FutsalAPI.post('adminList', { token });
      teams = (res.teams || []).map(t => t._contoh ? enrichDemoAdmin(t) : t);
      if (FutsalAPI.isDemo()) teams = teams.map(enrichDemoAdmin);
      render();
    } catch (err) {
      showAdminError(err.message || String(err));
      throw err;
    }
  }

  function boot() {
    if (FutsalAPI.isDemo()) $('#demoBanner').hidden = false;
    const v = $('#adminVersi');
    if (v) v.textContent = (C && C.VERSI) || '1.0.7';

    $$('[data-close-preview]').forEach(el => el.addEventListener('click', closePreview));
    $('#lightboxClose').onclick = closeLightbox;
    $('#lightbox').addEventListener('click', (e) => {
      if (e.target.id === 'lightbox') closeLightbox();
    });
    $('#lightboxDl').onclick = FutsalAPI.withBusy($('#lightboxDl'), async () => {
      if (!lightboxCtx) return;
      await downloadOne(lightboxCtx.teamId, lightboxCtx.key, $('#lightboxDl'));
    });

    $('#btnPreviewVerify').onclick = FutsalAPI.withBusy($('#btnPreviewVerify'), async () => {
      if (!previewTeam) return;
      await setStatus(previewTeam.id, 'verified', $('#previewNote').value);
    });
    $('#btnPreviewReject').onclick = FutsalAPI.withBusy($('#btnPreviewReject'), async () => {
      if (!previewTeam) return;
      await setStatus(previewTeam.id, 'rejected', $('#previewNote').value);
    });
    $('#btnPreviewPending').onclick = FutsalAPI.withBusy($('#btnPreviewPending'), async () => {
      if (!previewTeam) return;
      await setStatus(previewTeam.id, 'pending', $('#previewNote').value);
    });
    $('#btnPreviewZip').onclick = FutsalAPI.withBusy($('#btnPreviewZip'), async () => {
      if (!previewTeam) return;
      await downloadTeamZip(previewTeam, $('#btnPreviewZip'));
    });

    if (token) {
      showPanel(true);
      refresh().catch(e => {
        token = '';
        sessionStorage.removeItem(C.ADMIN_SESSION_KEY);
        showPanel(false);
        alert(e.message);
      });
    }

    $('#btnLogin').onclick = FutsalAPI.withBusy($('#btnLogin'), async () => {
      const pin = $('#pinInput').value;
      const msg = $('#loginMsg');
      try {
        const res = await FutsalAPI.post('adminLogin', { pin });
        token = res.token;
        sessionStorage.setItem(C.ADMIN_SESSION_KEY, token);
        showPanel(true);
        await refresh();
      } catch (e) {
        msg.hidden = false;
        msg.className = 'alert alert-err';
        msg.textContent = e.message;
      }
    });

    $('#btnLogout').onclick = () => {
      token = '';
      sessionStorage.removeItem(C.ADMIN_SESSION_KEY);
      showPanel(false);
      closePreview();
    };

    $('#btnRefresh').onclick = FutsalAPI.withBusy($('#btnRefresh'), refresh);
    $('#btnExport').onclick = FutsalAPI.withBusy($('#btnExport'), async () => {
      const res = await FutsalAPI.post('adminExport', { token });
      triggerDownload(new Blob([res.csv || ''], { type: 'text/csv;charset=utf-8' }), 'kit-faskes-kc5.csv');
    });
    $('#btnZipAll').onclick = FutsalAPI.withBusy($('#btnZipAll'), async () => {
      if (typeof JSZip === 'undefined') throw new Error('JSZip belum dimuat.');
      const list = filtered();
      if (!list.length) throw new Error('Tidak ada tim di filter.');
      if (list.length > 20 && !confirm('Unduh ZIP untuk ' + list.length + ' tim? Bisa lama di HP.')) return;
      const zip = new JSZip();
      let i = 0;
      for (const t of list) {
        i++;
        $('#btnZipAll').textContent = 'Tim ' + i + '/' + list.length;
        const folder = zip.folder((t.namaTim || t.id).replace(/[\\/:*?"<>|]+/g, '-'));
        folder.file('data.txt', teamDataText(t));
        for (const f of fileEntries(t)) {
          try {
            const file = await fetchFileForZip(t, f.key);
            if (file) folder.file(file.filename, file.blob);
          } catch (_) {}
        }
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      triggerDownload(blob, 'semua_kit_faskes_kc5.zip');
      $('#btnZipAll').textContent = 'Unduh semua (ZIP)';
    });

    ['fStatus', 'fJenis', 'fKit', 'fKategori'].forEach(id => { const el = $('#' + id); if (el) el.onchange = render; });
    $('#fSearch').oninput = render;
    $('#pinInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') $('#btnLogin').click();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
