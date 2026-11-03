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
          case 'listTeams': {
            let teams = D.teams.slice();
            if (payload && (payload.onlyVerified === true || payload.onlyVerified === 'true')) {
              teams = teams.filter(t => t.status === 'verified');
            }
            // strip kontak for public demo list
            teams = teams.map(t => {
              const x = Object.assign({}, t, { canEdit: t.status !== 'verified' });
              delete x.kontakWA; delete x.kontakNama; delete x.catatan; delete x.editCode; delete x.hasEditCode;
              return x;
            });
            resolve({ ok: true, teams, demo: true });
            break;
          }
          case 'getTeam': {
            const t = D.teams.find(x => x.id === (payload && payload.id));
            if (!t) resolve({ ok: false, error: 'Tim tidak ditemukan (demo).' });
            else {
              const x = Object.assign({}, t, { canEdit: t.status !== 'verified' });
              delete x.kontakWA; delete x.kontakNama; delete x.catatan; delete x.editCode; delete x.hasEditCode;
              resolve({ ok: true, team: x, demo: true });
            }
            break;
          }
          case 'register':
          case 'saveKit': {
            const updateId = String((payload && (payload.id || payload.teamId)) || '').trim();
            const files = (payload && payload.files) || {};
            const has = (k) => !!(files[k] && files[k].dataUrl);
            const kepalaIn = Array.isArray(payload && payload.kepala) ? payload.kepala : [];
            const hasKepalaFoto = has('fotoKepala') || has('kepala_1') || kepalaIn.some((_, i) => has('kepala_' + (i + 1)));
            if (updateId) {
              const row = D.teams.find(x => x.id === updateId);
              if (!row) { resolve({ ok: false, error: 'Tim tidak ditemukan.' }); break; }
              if (row.status === 'verified') {
                resolve({ ok: false, error: 'Kit sudah diverifikasi — terkunci. Hubungi panitia jika perlu perubahan.' });
                break;
              }
              Object.assign(row, {
                jenisInstansi: payload.jenisInstansi || row.jenisInstansi,
                namaInstansi: payload.namaInstansi || row.namaInstansi,
                namaTim: payload.namaTim || row.namaTim,
                kategoriTim: payload.kategoriTim || row.kategoriTim,
                namaKapten: payload.namaKapten || row.namaKapten,
                status: 'pending',
                canEdit: true
              });
              if (payload.kontakNama) row.kontakNama = payload.kontakNama;
              if (payload.kontakWA) row.kontakWA = payload.kontakWA;
              const logo = has('logo') || !!row.logoUrl;
              const jerseyUtama = has('jerseyUtama') || !!row.jerseyUtamaUrl;
              const fotoKapten = has('fotoKapten') || !!row.fotoKaptenUrl;
              const fotoKepala = hasKepalaFoto || !!(row.kepala && row.kepala[0] && row.kepala[0].fotoUrl);
              const n = [logo, jerseyUtama, fotoKapten, fotoKepala].filter(Boolean).length;
              const kit = { logo, jerseyUtama, fotoKapten, fotoKepala, jerseyCadangan: has('jerseyCadangan') || !!row.jerseyCadanganUrl, lengkap: n===4, persen: Math.round(n/4*100), jumlahKepala: Math.max(kepalaIn.length, row.kepala && row.kepala.length || 0, fotoKepala ? 1 : 0) };
              row.kit = kit;
              resolve({ ok: true, demo: true, id: updateId, updated: true, kit, kepala: kepalaIn.length ? kepalaIn : row.kepala,
                message: 'MODE DEMO: kit diperbarui. Menunggu verifikasi ulang.' });
              break;
            }
            const id = 'DEMO-NEW-' + Date.now();
            const logo = has('logo');
            const jerseyUtama = has('jerseyUtama');
            const fotoKapten = has('fotoKapten');
            const fotoKepala = hasKepalaFoto;
            const n = [logo, jerseyUtama, fotoKapten, fotoKepala].filter(Boolean).length;
            const kit = { logo, jerseyUtama, fotoKapten, fotoKepala, jerseyCadangan: has('jerseyCadangan'), lengkap: n===4, persen: Math.round(n/4*100), jumlahKepala: Math.max(kepalaIn.length, fotoKepala ? 1 : 0) };
            resolve({
              ok: true, demo: true, id, updated: false, kit, kepala: kepalaIn,
              message: 'MODE DEMO: kit baru tersimpan. Edit lewat Galeri selama belum diverifikasi. ID: ' + id
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
            const uid = String((payload && (payload.id || payload.teamId)) || '');
            if (uid) {
              const row = D.teams.find(x => x.id === uid);
              if (row && row.status === 'verified') {
                resolve({ ok: false, error: 'Kit sudah diverifikasi — terkunci.' }); break;
              }
            }
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
            else resolve({ ok: true, team: Object.assign({}, tt, { editHistory: tt.editHistory || [] }), demo: true });
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


          case 'adminUpdateTim':
          case 'adminEditTim': {
            if (!payload || !payload.token) { resolve({ ok: false, error: 'Token admin diperlukan.' }); break; }
            const pinU = String((payload && payload.pin) || '');
            if (pinU !== '1234' && pinU !== 'demo') { resolve({ ok: false, error: 'PIN admin salah.' }); break; }
            const idU = String((payload && payload.id) || '');
            const rowU = D.teams.find(x => x.id === idU);
            if (!rowU) { resolve({ ok: false, error: 'Peserta tidak ditemukan.' }); break; }
            const statusSebelum = rowU.status || 'pending';
            const fields = ['jenisInstansi','namaInstansi','namaTim','kategoriTim','namaKapten','kontakNama','kontakWA','warnaJersey','catatan','catatanAdmin','anggotaFaskes'];
            fields.forEach(f => {
              if (payload[f] != null) rowU[f] = payload[f];
            });
            rowU.timGabungan = !!(payload.timGabungan === true || payload.timGabungan === 'true' || payload.timGabungan === 1);
            if (payload.status) rowU.status = String(payload.status);
            if (Array.isArray(payload.kepala) && payload.kepala.length) {
              rowU.kepala = payload.kepala.map(k => Object.assign({}, k));
              rowU.namaKepala = rowU.kepala[0].nama || rowU.namaKepala;
            }
            const files = payload.files || {};
            const rem = payload.removeImages || [];
            const applyFile = (key, urlKey) => {
              if (files[key] && files[key].dataUrl) {
                rowU[urlKey] = files[key].dataUrl;
                if (!rowU.files) rowU.files = {};
                rowU.files[key] = { url: files[key].dataUrl, fileId: 'demo_' + key };
              } else if (rem.indexOf(key) >= 0) {
                rowU[urlKey] = '';
                if (rowU.files && rowU.files[key]) delete rowU.files[key];
              }
            };
            applyFile('logo', 'logoUrl');
            applyFile('fotoKapten', 'fotoKaptenUrl');
            applyFile('jerseyUtama', 'jerseyUtamaUrl');
            applyFile('jerseyCadangan', 'jerseyCadanganUrl');
            Object.keys(files).forEach(k => {
              if (k.indexOf('kepala_') === 0 && files[k] && files[k].dataUrl) {
                const ix = parseInt(k.split('_')[1], 10) - 1;
                if (!rowU.kepala) rowU.kepala = [];
                while (rowU.kepala.length <= ix) rowU.kepala.push({ nama: '', instansi: '', fotoUrl: '', fileId: '' });
                rowU.kepala[ix].fotoUrl = files[k].dataUrl;
                rowU.kepala[ix].fileId = 'demo_' + k;
              }
            });
            (rem || []).forEach(k => {
              if (k.indexOf('kepala_') === 0) {
                const ix = parseInt(k.split('_')[1], 10) - 1;
                if (rowU.kepala && rowU.kepala[ix]) { rowU.kepala[ix].fotoUrl = ''; rowU.kepala[ix].fileId = ''; }
              }
            });
            rowU.updatedAt = new Date().toISOString();
            if (!D._editHistory) D._editHistory = {};
            if (!D._editHistory[idU]) D._editHistory[idU] = [];
            D._editHistory[idU].unshift({
              waktu: new Date().toISOString(),
              fieldsChanged: JSON.stringify(['oleh:admin'].concat(Object.keys(files).map(k => 'file:' + k))),
              statusSebelum,
              statusSesudah: rowU.status
            });
            rowU.editHistory = D._editHistory[idU].slice(0, 20);
            resolve({
              ok: true, demo: true, id: idU, updated: true, status: rowU.status,
              team: Object.assign({}, rowU),
              message: 'MODE DEMO: kit diperbarui oleh admin. Status: ' + rowU.status + '.'
            });
            break;
          }

          case 'hapusTim':
          case 'adminHapusTim': {
            if (!payload || !payload.token) { resolve({ ok: false, error: 'Token admin diperlukan.' }); break; }
            const pin = String((payload && payload.pin) || '');
            if (pin !== '1234' && pin !== 'demo') { resolve({ ok: false, error: 'PIN admin salah.' }); break; }
            const id = String((payload && payload.id) || '');
            const row = D.teams.find(x => x.id === id);
            if (!row) { resolve({ ok: false, error: 'Peserta tidak ditemukan.' }); break; }
            const conf = String((payload && (payload.confirmNamaTim || payload.namaTimConfirm)) || '').trim().replace(/\s+/g, ' ');
            const actual = String(row.namaTim || '').trim().replace(/\s+/g, ' ');
            if (!conf) { resolve({ ok: false, error: 'Ketik nama tim untuk konfirmasi hapus.' }); break; }
            if (conf !== actual) { resolve({ ok: false, error: 'Nama tim tidak cocok. Ketik nama tim persis seperti tercatat.' }); break; }
            if (!D._arsip) D._arsip = [];
            const archived = Object.assign({}, row, { waktuHapus: new Date().toISOString(), arsip: true });
            D._arsip.unshift(archived);
            D.teams = D.teams.filter(x => x.id !== id);
            resolve({ ok: true, demo: true, id, namaTim: actual, folderTrashed: true,
              message: 'MODE DEMO: tim dipindah ke Arsip. Folder Drive di-trash (simulasi).' });
            break;
          }
          case 'adminListArsip': {
            if (!payload || !payload.token) { resolve({ ok: false, error: 'Token admin diperlukan.' }); break; }
            resolve({ ok: true, demo: true, teams: (D._arsip || []).slice() });
            break;
          }
          case 'pulihkanTim':
          case 'adminPulihkanTim': {
            if (!payload || !payload.token) { resolve({ ok: false, error: 'Token admin diperlukan.' }); break; }
            const pin2 = String((payload && payload.pin) || '');
            if (pin2 !== '1234' && pin2 !== 'demo') { resolve({ ok: false, error: 'PIN admin salah.' }); break; }
            const id2 = String((payload && payload.id) || '');
            if (!D._arsip) D._arsip = [];
            const ix = D._arsip.findIndex(x => x.id === id2);
            if (ix < 0) { resolve({ ok: false, error: 'Data arsip tidak ditemukan.' }); break; }
            const restored = D._arsip.splice(ix, 1)[0];
            delete restored.arsip; delete restored.waktuHapus;
            D.teams.push(restored);
            resolve({ ok: true, demo: true, id: id2, namaTim: restored.namaTim, folderRestored: true,
              message: 'MODE DEMO: tim dipulihkan ke daftar aktif.' });
            break;
          }
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
