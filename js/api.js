/**
 * Lapisan API — mode demo atau Google Apps Script Web App.
 */
(function (global) {
  const C = () => global.FUTSAL_CONFIG || {};
  const demo = () => !!(C().DEMO_MODE || !C().API_URL || global.__FORCE_DEMO);

  function withBusy(btn, fn) {
    return async function (...args) {
      if (btn && btn.dataset.busy === '1') return;
      if (btn) {
        btn.dataset.busy = '1';
        btn.disabled = true;
        btn.classList.add('is-busy');
        const spin = document.createElement('span');
        spin.className = 'btn-spin';
        spin.setAttribute('aria-hidden', 'true');
        btn.prepend(spin);
      }
      try {
        return await fn.apply(this, args);
      } finally {
        if (btn) {
          btn.dataset.busy = '0';
          btn.disabled = false;
          btn.classList.remove('is-busy');
          const s = btn.querySelector('.btn-spin');
          if (s) s.remove();
        }
      }
    };
  }

  async function post(action, payload) {
    let data;
    if (demo()) {
      data = await demoHandler(action, payload);
    } else {
      const url = C().API_URL;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, ...payload })
      });
      const text = await res.text();
      try { data = JSON.parse(text); } catch (e) {
        throw new Error('Respons server tidak valid.');
      }
    }
    if (!data || !data.ok) throw new Error((data && data.error) || 'Gagal memproses permintaan.');
    return data;
  }

  async function get(action, params) {
    let data;
    if (demo()) {
      data = await demoHandler(action, params || {});
    } else {
      const q = new URLSearchParams({ action, ...(params || {}) });
      const res = await fetch(C().API_URL + '?' + q.toString(), { method: 'GET' });
      const text = await res.text();
      try { data = JSON.parse(text); } catch (e) {
        throw new Error('Respons server tidak valid.');
      }
    }
    if (!data || !data.ok) throw new Error((data && data.error) || 'Gagal memuat data.');
    return data;
  }

  function demoHandler(action, payload) {
    const D = global.FUTSAL_DEMO || { teams: [], stats: {} };
    return new Promise((resolve) => {
      setTimeout(() => {
        switch (action) {
          case 'stats':
            resolve({ ok: true, stats: D.stats, demo: true });
            break;
          case 'listTeams':
            resolve({ ok: true, teams: D.teams.filter(t => t.status === 'verified' || payload?.includePending), demo: true });
            break;
          case 'getTeam': {
            const t = D.teams.find(x => x.id === (payload && payload.id));
            if (!t) resolve({ ok: false, error: 'Tim tidak ditemukan (demo).' });
            else resolve({ ok: true, team: t, demo: true });
            break;
          }
          case 'register':
          case 'saveKit': {
            const code = (payload && payload.editCode) ? String(payload.editCode).trim() : '';
            const id = code ? ('DEMO-UPD-' + Date.now()) : ('DEMO-NEW-' + Date.now());
            const editCode = code || ('KC5-' + Math.random().toString(36).slice(2, 10).toUpperCase());
            const files = (payload && payload.files) || {};
            const has = (k) => !!(files[k] && files[k].dataUrl);
            const kepalaIn = Array.isArray(payload && payload.kepala) ? payload.kepala : [];
            const hasKepalaFoto = has('fotoKepala') || has('kepala_1') || kepalaIn.some((_, i) => has('kepala_' + (i + 1)));
            const logo = has('logo') || !!code;
            const jerseyUtama = has('jerseyUtama') || !!code;
            const fotoKapten = has('fotoKapten') || !!code;
            const fotoKepala = hasKepalaFoto || !!code;
            const n = [logo, jerseyUtama, fotoKapten, fotoKepala].filter(Boolean).length;
            const kit = { logo, jerseyUtama, fotoKapten, fotoKepala, jerseyCadangan: has('jerseyCadangan'), lengkap: n===4, persen: Math.round(n/4*100), jumlahKepala: Math.max(kepalaIn.length, fotoKepala ? 1 : 0) };
            resolve({
              ok: true,
              demo: true,
              id: id,
              editCode: code ? undefined : editCode,
              updated: !!code,
              kit: kit,
              kepala: kepalaIn,
              message: code
                ? 'MODE DEMO: kit diperbarui (tidak disimpan permanen).'
                : 'MODE DEMO: kit baru (tidak disimpan). Simpan kode edit untuk pembaruan nanti.'
            });
            break;
          }
          case 'cekKodeEdit': {
            const code = String((payload && payload.editCode) || '').trim().toUpperCase();
            const ident = String((payload && (payload.identifikasi || payload.id || payload.namaTim)) || '').trim();
            if (!code) { resolve({ ok: false, error: 'Kode edit wajib diisi.' }); break; }
            if (!ident) { resolve({ ok: false, error: 'Isi ID Tim atau Nama Tim sebagai identitas.' }); break; }
            // Demo: kode DEMO-EDIT / demo / 1234-EDIT menerima tim yang cocok identitasnya
            const okCodes = ['DEMO-EDIT', 'KC5-DEMOEDIT', 'DEMO'];
            if (!okCodes.includes(code) && code !== 'KC5-DEMODEMO') {
              resolve({ ok: false, error: 'Kode edit tidak valid. Periksa kembali atau tunggu sebentar jika sudah beberapa kali salah.' });
              break;
            }
            const idUp = ident.toUpperCase();
            const idLow = ident.toLowerCase();
            let t = D.teams.find(x => String(x.id || '').toUpperCase() === idUp);
            if (!t) t = D.teams.find(x => String(x.namaTim || '').toLowerCase() === idLow);
            if (!t) t = D.teams.find(x => String(x.namaTim || '').toLowerCase().includes(idLow) && idLow.length >= 4);
            if (!t) {
              resolve({ ok: false, error: 'Identitas tim tidak cocok dengan kode edit. Pastikan ID Tim / Nama Tim benar.' });
              break;
            }
            // sertakan kontak untuk pemilik (demo teams sudah punya)
            // backfill demo admin copy
            if (!t.hasEditCode) { t.editCode = code; t.hasEditCode = true; t.editCodeLegacy = false; }
            const owner = Object.assign({}, t, {
              catatan: t.catatan || 'Catatan contoh pemilik',
              updatedAt: t.updatedAt || t.createdAt
            });
            delete owner.editCode;
            delete owner.hasEditCode;
            delete owner.editCodeLegacy;
            delete owner.kodeAdmin;
            resolve({
              ok: true,
              demo: true,
              team: owner,
              message: 'Kode edit valid. Data kit siap ditinjau. (MODE DEMO)'
            });
            break;
          }
          case 'uploadKitFile': {
            resolve({ ok: true, demo: true, key: payload && payload.key, url: 'assets/sintang_sm.png', message: 'MODE DEMO: file diterima.' });
            break;
          }
          case 'adminLogin': {
            const pin = String((payload && payload.pin) || '');
            if (pin === '1234' || pin === 'demo') {
              resolve({ ok: true, token: 'demo-token-' + Date.now(), demo: true });
            } else {
              resolve({ ok: false, error: 'PIN salah. Di mode demo gunakan 1234 atau demo.' });
            }
            break;
          }
          case 'adminList':
            if (!payload || !payload.token) { resolve({ ok: false, error: 'Token admin diperlukan.' }); break; }
            resolve({ ok: true, teams: D.teams, demo: true });
            break;
          case 'adminGetTeam': {
            if (!payload || !payload.token) { resolve({ ok: false, error: 'Token admin diperlukan.' }); break; }
            const tt = D.teams.find(x => x.id === (payload && payload.id));
            if (!tt) resolve({ ok: false, error: 'Peserta tidak ditemukan.' });
            else resolve({ ok: true, team: tt, demo: true });
            break;
          }
          case 'adminDownloadFile': {
            if (!payload || !payload.token) { resolve({ ok: false, error: 'Token admin diperlukan.' }); break; }
            // tiny 1x1 png
            const b64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
            resolve({ ok: true, demo: true, id: payload.id, key: payload.key, filename: 'demo_'+(payload.key||'file')+'.png', mime: 'image/png', base64: b64, size: 68 });
            break;
          }
          case 'adminSetStatus': {
            const idS = String((payload && payload.id) || '');
            const rowS = D.teams.find(x => x.id === idS);
            if (rowS && payload && payload.status) rowS.status = payload.status;
            if (rowS && payload && payload.kategoriTim) rowS.kategoriTim = String(payload.kategoriTim);
            if (rowS && payload && payload.catatanAdmin != null) rowS.catatanAdmin = String(payload.catatanAdmin || '');
            resolve({ ok: true, demo: true, message: 'MODE DEMO: status/kategori diperbarui (sementara).' });
            break;
          }
          case 'adminExport':
            resolve({ ok: true, demo: true, csv: demoCsv(D.teams), message: 'CSV contoh (demo).' });
            break;
          case 'adminResetEditCode': {
            if (!payload || !payload.token) { resolve({ ok: false, error: 'Token admin diperlukan.' }); break; }
            if (!(payload.confirm === true || payload.confirm === 'true')) {
              resolve({ ok: false, error: 'Konfirmasi wajib.' }); break;
            }
            const id = String((payload && payload.id) || '');
            const row = D.teams.find(x => x.id === id);
            if (!row) { resolve({ ok: false, error: 'Peserta tidak ditemukan.' }); break; }
            const code = 'KC5-' + Math.random().toString(36).slice(2, 10).toUpperCase();
            row.editCode = code; row.hasEditCode = true; row.editCodeLegacy = false;
            resolve({
              ok: true, demo: true, id, editCode: code, hasEditCode: true,
              message: 'MODE DEMO: kode edit baru dibuat. Salin dan sampaikan ke faskes.'
            });
            break;
          }
          default:
            resolve({ ok: false, error: 'Aksi tidak dikenal: ' + action });
        }
      }, 350);
    });
  }

  function demoCsv(teams) {
    const h = ['id','status','jenisInstansi','namaInstansi','namaTim','kategoriTim','namaKapten','namaKepala','kepalaSemua','timGabungan','anggotaFaskes','warnaJersey','kontakNama','kontakWA'];
    const rows = [h.join(',')];
    teams.forEach(t => {
      const kepala = Array.isArray(t.kepala) ? t.kepala : [];
      const map = {
        id: t.id, status: t.status, jenisInstansi: t.jenisInstansi, namaInstansi: t.namaInstansi,
        namaTim: t.namaTim, kategoriTim: t.kategoriTim || '', namaKapten: t.namaKapten, namaKepala: t.namaKepala || (kepala[0] && kepala[0].nama) || '',
        kepalaSemua: kepala.map(k => k.nama + (k.instansi ? ' (' + k.instansi + ')' : '')).join(' | '),
        timGabungan: t.timGabungan ? 'ya' : 'tidak',
        anggotaFaskes: t.anggotaFaskes || '',
        warnaJersey: t.warnaJersey, kontakNama: t.kontakNama, kontakWA: t.kontakWA
      };
      rows.push(h.map(k => '"' + String(map[k] || '').replace(/"/g, '""') + '"').join(','));
    });
    return rows.join('\n');
  }

  /** Kompres/resize gambar di client → dataURL JPEG/PNG. */
  function compressImage(file, maxPx, quality) {
    maxPx = maxPx || C().MAX_FOTO_PX || 1600;
    quality = quality == null ? 0.82 : quality;
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const maxMb = C().MAX_FILE_MB || 4;
      if (file.size > maxMb * 1024 * 1024 * 3) {
        return reject(new Error('File terlalu besar (maks ~' + maxMb + ' MB setelah kompresi).'));
      }
      const okType = /image\/(jpeg|jpg|png|webp)/i.test(file.type);
      if (!okType) return reject(new Error('Tipe file harus JPG, PNG, atau WebP.'));
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth, h = img.naturalHeight;
        const scale = Math.min(1, maxPx / Math.max(w, h));
        w = Math.round(w * scale); h = Math.round(h * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        const preferPng = /png/i.test(file.type) && file.size < 1.5 * 1024 * 1024;
        const mime = preferPng ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mime, quality);
        resolve({
          dataUrl,
          mime,
          name: file.name.replace(/\.[^.]+$/, preferPng ? '.png' : '.jpg'),
          width: w,
          height: h,
          bytesApprox: Math.round(dataUrl.length * 0.75)
        });
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Gagal membaca gambar.')); };
      img.src = url;
    });
  }

  global.FutsalAPI = { get, post, withBusy, compressImage, isDemo: demo };
})(window);
