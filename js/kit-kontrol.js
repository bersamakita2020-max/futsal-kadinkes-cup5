/**
 * Kontrol kit terhadap roster jadwal. Hanya baca.
 * Tidak memverifikasi, menghapus, mengarsip, atau mengirim pesan.
 * Penyusun: Anara Tech
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.FutsalKitKontrol = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const DROP = {
    uptd: 1, kabupaten: 1, kab: 1, kota: 1, sintang: 1, contoh: 1, cabang: 1,
    fc: 1, united: 1, tim: 1, nakes: 1, kesehatan: 1, dan: 1, x: 1
  };

  /** Alias yakin, hanya jika gender kit sama. Bukan tebakan fuzzy. */
  const NICKNAMES = {
    'putri-puskesmas-tempunak': [
      'tpk pride',
      'tpk pride putri',
      'tpk pride tempunak',
      'tpk pride putri tempunak'
    ]
  };

  /** Bentuk resmi yang tidak selalu identik setelah normalisasi. */
  const EXPLICIT_KEYS = {
    'putra-rsp-serawai': ['rs pratama serawai'],
    'putra-rsj-sudiyanto': ['rs jiwa sudiyanto'],
    'putri-rsj-sudiyanto': ['rs jiwa sudiyanto']
  };

  /** Mirip tetapi tidak boleh jadi cocok yakin. */
  const CANDIDATE_ONLY = {
    'putra-rsp-serawai': ['rs serawai', 'rumah sakit serawai']
  };

  function canon(input) {
    let s = String(input == null ? '' : input).toLowerCase();
    s = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    s = s.replace(/['’`]/g, '');
    s = s.replace(/&/g, ' dan ');
    s = s.replace(/[^\p{L}\p{N}]+/gu, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    const phrases = [
      [/ade muhammad djoen/g, 'ade m djoen'],
      [/ade mohammad djoen/g, 'ade m djoen'],
      [/ade moh djoen/g, 'ade m djoen'],
      [/rumah sakit jiwa/g, 'rsj'],
      [/rumah sakit pratama/g, 'rsp'],
      [/rumah sakit umum daerah/g, 'rsud'],
      [/dinas kesehatan/g, 'dinkes'],
      [/dkbp\s*3\s*a/g, 'dp3ap2kb'],
      [/dp3a\s*p2kb/g, 'dp3ap2kb']
    ];
    phrases.forEach(([re, to]) => { s = s.replace(re, to); });
    s = s.replace(/\b(pkm|pusk)\b/g, 'puskesmas');
    s = s.split(' ').filter(tok => tok && !DROP[tok]).join(' ');
    return s.replace(/\s+/g, ' ').trim();
  }

  function hasPhrase(hay, phrase) {
    if (!hay || !phrase) return false;
    if (hay === phrase) return true;
    let from = 0;
    while (from <= hay.length) {
      const i = hay.indexOf(phrase, from);
      if (i < 0) return false;
      const before = i === 0 || hay.charAt(i - 1) === ' ';
      const end = i + phrase.length;
      const after = end === hay.length || hay.charAt(end) === ' ';
      if (before && after) return true;
      from = i + 1;
    }
    return false;
  }

  function distinctive(c) {
    return String(c || '').replace(/^(puskesmas|rsud|rsj|rsp|dinkes|dp3ap2kb|labkesda|bpjs)\s+/, '');
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

  function urlish(v) {
    return typeof v === 'string' && v.trim().length > 0;
  }

  function realFileId(id) {
    const s = String(id || '').trim();
    if (!s) return false;
    if (/^demo[-_]/i.test(s)) return false;
    return true;
  }

  function prepareRoster(roster) {
    const teams = (roster && roster.teams ? roster.teams : []).map(t => {
      const constituents = (t.constituents || []).map(c => {
        const key = canon(c.label);
        return { label: c.label, jenis: c.jenis, key: key, short: distinctive(key) };
      });
      const keys = new Set();
      const full = canon(t.display);
      if (full) keys.add(full);
      constituents.forEach(c => { if (!t.joint && c.key) keys.add(c.key); });
      if (t.joint) {
        const bare = constituents.map(c => c.short).filter(Boolean).join(' ');
        const joined = constituents.map(c => c.key).filter(Boolean).join(' ');
        if (bare) keys.add(bare);
        if (joined) keys.add(joined);
      }
      (EXPLICIT_KEYS[t.id] || []).forEach(k => keys.add(canon(k)));
      (NICKNAMES[t.id] || []).forEach(k => keys.add(canon(k)));
      return Object.assign({}, t, {
        constituents: constituents,
        keys: Array.from(keys).filter(Boolean),
        nicknameKeys: (NICKNAMES[t.id] || []).map(canon),
        candidateOnlyKeys: (CANDIDATE_ONLY[t.id] || []).map(canon)
      });
    });
    const byGender = { Putra: [], Putri: [] };
    teams.forEach(t => { if (byGender[t.gender]) byGender[t.gender].push(t); });
    ['Putra', 'Putri'].forEach(g => {
      const freq = {};
      byGender[g].forEach(t => {
        if (t.joint) return;
        const d = distinctive(canon(t.display));
        if (!d || d === canon(t.display)) {
          if (d) freq[d] = (freq[d] || 0) + 1;
          return;
        }
        freq[d] = (freq[d] || 0) + 1;
      });
      byGender[g].forEach(t => {
        t.constituents.forEach(c => {
          if (c.short) freq[c.short] = (freq[c.short] || 0) + (t.joint ? 0 : 0);
        });
      });
      const constituentShorts = new Set();
      byGender[g].forEach(t => {
        if (!t.joint) return;
        t.constituents.forEach(c => { if (c.short) constituentShorts.add(c.short); });
      });
      byGender[g].forEach(t => {
        if (t.joint) return;
        const d = distinctive(canon(t.display));
        if (!d || freq[d] !== 1) return;
        if (constituentShorts.has(d)) return;
        if (!t.keys.includes(d)) t.keys.push(d);
        t.shortKey = d;
      });
    });
    return teams;
  }

  function kitStrings(kit) {
    const out = [];
    const add = (raw, source) => {
      const c = canon(raw);
      if (!c) return;
      out.push({ canon: c, source: source, raw: String(raw).trim() });
    };
    add(kit.namaTim, 'namaTim');
    add(kit.namaInstansi, 'namaInstansi');
    if (kit.anggotaFaskes) {
      add(kit.anggotaFaskes, 'anggotaGabungan');
      String(kit.anggotaFaskes).split(/[,;|]|\bdan\b|\bserta\b/i).forEach(part => add(part, 'anggotaFaskes'));
    }
    (Array.isArray(kit.kepala) ? kit.kepala : []).forEach(k => {
      if (k && k.instansi) add(k.instansi, 'faskesAsal');
    });
    return out;
  }

  function blobOf(strs) {
    return strs.map(s => s.canon).join(' | ');
  }

  function coversJoint(team, strs) {
    if (!team.joint) return false;
    const blob = blobOf(strs);
    return team.constituents.every(c => hasPhrase(blob, c.key) || hasPhrase(blob, c.short));
  }

  function relation(team, kit, strs) {
    const gender = normalizeKategori(kit.kategoriTim);
    if (gender && gender !== team.gender) return null;
    const unknown = !gender;
    const exact = strs.some(s => team.keys.indexOf(s.canon) >= 0);
    const candidateOnly = strs.some(s => team.candidateOnlyKeys.indexOf(s.canon) >= 0);
    if (exact) return unknown ? 'candidate' : 'confident';
    if (team.joint && coversJoint(team, strs)) return unknown ? 'candidate' : 'confident';
    if (candidateOnly) return 'candidate';
    if (team.joint) {
      const hits = team.constituents.filter(c => strs.some(s => s.canon === c.key || s.canon === c.short));
      if (hits.length === 1) return 'candidate';
    }
    return null;
  }

  function assetOn(team, urlKey, fileKey, kitKey) {
    if (urlish(team[urlKey])) return true;
    const f = team.files && team.files[fileKey];
    if (f) {
      if (urlish(f.url) || urlish(f.dataUrl) || urlish(f.driveUrl)) return true;
      if (realFileId(f.fileId)) return true;
    }
    const idKey = urlKey.replace(/Url$/, 'Id');
    if (realFileId(team[idKey])) return true;
    const explicitEmpty = team[urlKey] === '' || team[urlKey] === null;
    if (!explicitEmpty && team[urlKey] == null && !(f && ('url' in f)) && team.kit && team.kit[kitKey] === true) return true;
    return false;
  }

  function headHasPhoto(k) {
    if (!k) return false;
    if (urlish(k.fotoUrl) || urlish(k.url)) return true;
    if (realFileId(k.fileId)) return true;
    return false;
  }

  function resolveHeads(team) {
    let list = Array.isArray(team.kepala) ? team.kepala.filter(Boolean) : [];
    if (!list.length) {
      if (team.namaKepala || urlish(team.fotoKepalaUrl) || realFileId(team.fotoKepalaId)) {
        list = [{
          nama: team.namaKepala || '',
          instansi: '',
          fotoUrl: team.fotoKepalaUrl || '',
          fileId: team.fotoKepalaId || ''
        }];
      }
    } else if (!headHasPhoto(list[0]) && urlish(team.fotoKepalaUrl)) {
      list = list.slice();
      list[0] = Object.assign({}, list[0], { fotoUrl: team.fotoKepalaUrl });
    }
    if (!list.length && team.kit && team.kit.fotoKepala === true && team.fotoKepalaUrl == null && team.kepala == null) {
      return [{ nama: '', instansi: '', hasPhoto: true }];
    }
    return list.map(k => ({
      nama: k.nama || '',
      instansi: k.instansi || '',
      hasPhoto: headHasPhoto(k)
    }));
  }

  function headCheck(kit, expected) {
    const heads = resolveHeads(kit);
    const photos = heads.filter(h => h.hasPhoto);
    const missing = [];
    if (!expected.joint) {
      if (!photos.length) missing.push('Foto kepala/pimpinan');
      else heads.forEach((h, i) => {
        if (!h.hasPhoto) missing.push('Foto kepala/pimpinan #' + (i + 1) + (h.nama ? ' · ' + h.nama : ''));
      });
      return {
        ok: missing.length === 0,
        ada: photos.length,
        butuh: Math.max(1, heads.length || 1),
        missing: missing
      };
    }
    const need = expected.constituents || [];
    const matched = new Set();
    photos.forEach(h => {
      const c = canon(h.instansi);
      need.forEach((con, idx) => {
        if (matched.has(idx) || !c) return;
        if (c === con.key || c === con.short || hasPhrase(c, con.short) || hasPhrase(c, con.key)) matched.add(idx);
      });
    });
    if (photos.length < need.length) {
      if (!matched.size) {
        missing.push('Foto kepala/pimpinan gabungan (butuh ' + need.length + ', ada ' + photos.length + ')');
      } else {
        need.forEach((con, idx) => {
          if (!matched.has(idx)) missing.push('Foto kepala/pimpinan · ' + con.label);
        });
      }
    } else {
      heads.forEach((h, i) => {
        if (!h.hasPhoto) missing.push('Foto kepala/pimpinan #' + (i + 1) + (h.nama ? ' · ' + h.nama : ''));
      });
    }
    return { ok: missing.length === 0, ada: photos.length, butuh: need.length, missing: missing };
  }

  function kitCompleteness(kit, expected) {
    const logo = assetOn(kit, 'logoUrl', 'logo', 'logo');
    const kapten = assetOn(kit, 'fotoKaptenUrl', 'fotoKapten', 'fotoKapten');
    const jersey = assetOn(kit, 'jerseyUtamaUrl', 'jerseyUtama', 'jerseyUtama');
    const cadangan = assetOn(kit, 'jerseyCadanganUrl', 'jerseyCadangan', 'jerseyCadangan');
    const kepala = headCheck(kit, expected);
    const missing = [];
    if (!logo) missing.push('Logo');
    if (!kapten) missing.push('Foto kapten');
    if (!jersey) missing.push('Jersey utama');
    kepala.missing.forEach(m => missing.push(m));
    return {
      logo: logo,
      kapten: kapten,
      jerseyUtama: jersey,
      jerseyCadangan: cadangan,
      kepala: kepala,
      missing: missing,
      lengkap: missing.length === 0
    };
  }

  function verificationLabel(status) {
    if (status === 'verified') return 'Terverifikasi';
    if (status === 'rejected') return 'Ditolak';
    if (status === 'pending') return 'Menunggu verifikasi';
    return 'Menunggu verifikasi';
  }

  function publicKit(kit) {
    return {
      id: kit.id || '',
      namaTim: kit.namaTim || '',
      namaInstansi: kit.namaInstansi || '',
      kategoriTim: normalizeKategori(kit.kategoriTim),
      jenisInstansi: kit.jenisInstansi || '',
      status: kit.status || 'pending',
      timGabungan: !!kit.timGabungan
    };
  }

  function assess(kits, options) {
    const opts = options || {};
    const loadState = opts.loadState || 'ready';
    const roster = opts.roster;
    if (!roster || !roster.teams) {
      return { ok: false, loadState: 'error', errorMessage: 'Roster jadwal tidak tersedia.', counts: null, rows: [], allRows: [] };
    }
    if (loadState === 'loading') {
      return {
        ok: false,
        loadState: 'loading',
        errorMessage: '',
        counts: null,
        rows: [],
        allRows: [],
        source: roster.SOURCE,
        ambiguities: roster.AMBIGUITIES || []
      };
    }
    if (loadState === 'error') {
      return {
        ok: false,
        loadState: 'error',
        errorMessage: opts.errorMessage || 'Gagal memuat data kit.',
        counts: null,
        rows: [],
        allRows: [],
        source: roster.SOURCE,
        ambiguities: roster.AMBIGUITIES || []
      };
    }
    const prepared = prepareRoster(roster);
    const list = Array.isArray(kits) ? kits : [];
    const kitMeta = list.map((kit, index) => ({
      kit: kit,
      index: index,
      strs: kitStrings(kit),
      pub: publicKit(kit)
    }));
    const links = [];
    prepared.forEach(team => {
      kitMeta.forEach(meta => {
        const level = relation(team, meta.kit, meta.strs);
        if (!level) return;
        links.push({ teamId: team.id, kitIndex: meta.index, level: level });
      });
    });
    const byKit = {};
    links.forEach(link => {
      if (!byKit[link.kitIndex]) byKit[link.kitIndex] = [];
      byKit[link.kitIndex].push(link);
    });
    const teamById = {};
    prepared.forEach(t => { teamById[t.id] = t; });
    kitMeta.forEach(meta => {
      const coveredJoints = prepared.filter(t => t.joint && coversJoint(t, meta.strs));
      if (!coveredJoints.length) return;
      links.forEach(link => {
        if (link.kitIndex !== meta.index || link.level !== 'confident') return;
        const team = teamById[link.teamId];
        if (!team || team.joint) return;
        const sig = canon(team.display);
        const hit = coveredJoints.some(j => j.constituents.some(c => c.key === sig || c.short === distinctive(sig)));
        if (hit) link.level = 'candidate';
      });
    });
    Object.keys(byKit).forEach(idx => {
      const group = byKit[idx];
      const confident = group.filter(l => l.level === 'confident');
      if (confident.length < 2) return;
      const joints = confident.filter(l => teamById[l.teamId] && teamById[l.teamId].joint);
      if (joints.length === 1) {
        const joint = teamById[joints[0].teamId];
        const constituentKeys = new Set(joint.constituents.map(c => c.key));
        confident.forEach(l => {
          if (l.teamId === joint.id) return;
          const other = teamById[l.teamId];
          if (other && !other.joint && constituentKeys.has(canon(other.display))) l.level = 'drop';
        });
      }
      const still = group.filter(l => l.level === 'confident');
      if (still.length > 1) still.forEach(l => { l.level = 'candidate'; });
    });
    const liveLinks = links.filter(l => l.level === 'confident' || l.level === 'candidate');

    const allRows = prepared.map(team => {
      const own = liveLinks.filter(l => l.teamId === team.id);
      const confidentIdx = own.filter(l => l.level === 'confident').map(l => l.kitIndex);
      const candidateIdx = own.filter(l => l.level === 'candidate').map(l => l.kitIndex);
      const confidentKits = confidentIdx.map(i => kitMeta[i]);
      const candidateKits = candidateIdx.map(i => kitMeta[i]);
      let status = 'belum-input';
      let lengkap = false;
      const details = confidentKits.map(meta => {
        const c = kitCompleteness(meta.kit, team);
        return {
          kit: meta.pub,
          completeness: c,
          verifikasi: verificationLabel(meta.pub.status),
          statusKode: meta.pub.status || 'pending'
        };
      });
      if (confidentKits.length >= 2) {
        status = 'duplikat';
        lengkap = false;
      } else if (confidentKits.length === 1) {
        lengkap = !!details[0].completeness.lengkap;
        status = lengkap ? 'lengkap' : 'belum-lengkap';
      } else if (candidateKits.length) {
        status = 'perlu-dicocokkan';
      }
      return {
        id: team.id,
        gender: team.gender,
        display: team.display,
        jenis: team.jenis,
        jenisLabel: team.jenisLabel,
        joint: !!team.joint,
        constituents: team.constituents.map(c => ({ label: c.label, jenis: c.jenis })),
        headCount: team.headCount,
        appearances: team.appearances,
        status: status,
        lengkap: status === 'lengkap',
        kits: details,
        candidates: candidateKits.map(meta => meta.pub),
        verifikasi: details.length === 1 ? details[0].verifikasi : (details.length > 1 ? 'Lebih dari satu kit' : ''),
        statusKode: details.length === 1 ? details[0].statusKode : ''
      };
    });

    const counts = countRows(allRows);
    const unmatched = kitMeta.filter(meta => {
      return !liveLinks.some(l => l.kitIndex === meta.index);
    }).map(meta => meta.pub);

    const filters = normalizeFilters(opts.filters);
    const rows = allRows.filter(row => rowMatchesFilter(row, filters));
    return {
      ok: true,
      loadState: 'ready',
      errorMessage: '',
      counts: counts,
      filteredCounts: countRows(rows),
      rows: rows,
      allRows: allRows,
      unmatched: unmatched,
      filters: filters,
      filtersActive: filtersActive(filters),
      source: roster.SOURCE,
      ambiguities: roster.AMBIGUITIES || [],
      breaks: roster.BREAKS || [],
      generatedAt: opts.now || new Date(),
      contoh: !!opts.contoh,
      scope: 'penuh'
    };
  }

  function countRows(rows) {
    const counts = {
      diharapkan: rows.length,
      sudahInput: 0,
      belumInput: 0,
      belumLengkap: 0,
      lengkap: 0,
      perluDicocokkan: 0,
      duplikat: 0,
      putra: 0,
      putri: 0
    };
    rows.forEach(r => {
      if (r.gender === 'Putra') counts.putra++;
      if (r.gender === 'Putri') counts.putri++;
      if (r.status === 'lengkap') counts.lengkap++;
      else if (r.status === 'belum-lengkap') counts.belumLengkap++;
      else if (r.status === 'duplikat') counts.duplikat++;
      else if (r.status === 'belum-input') counts.belumInput++;
      else if (r.status === 'perlu-dicocokkan') counts.perluDicocokkan++;
    });
    counts.sudahInput = counts.lengkap + counts.belumLengkap + counts.duplikat;
    return counts;
  }

  function normalizeFilters(f) {
    const src = f || {};
    const gender = src.gender === 'Putra' || src.gender === 'Putri' ? src.gender : '';
    const q = String(src.q || src.search || '').trim().toLowerCase();
    const status = String(src.status || '');
    return { gender: gender, q: q, status: status };
  }

  function filtersActive(f) {
    return !!(f.gender || f.q || f.status);
  }

  function rowMatchesFilter(row, f) {
    if (f.gender && row.gender !== f.gender) return false;
    if (f.status) {
      if (f.status === 'sudah-input') {
        if (row.status !== 'lengkap' && row.status !== 'belum-lengkap' && row.status !== 'duplikat') return false;
      } else if (f.status === 'verified' || f.status === 'pending' || f.status === 'rejected') {
        const hit = (row.kits || []).some(k => (k.statusKode || 'pending') === f.status);
        if (!hit) return false;
      } else if (row.status !== f.status) return false;
    }
    if (f.q) {
      const hay = [
        row.display,
        row.jenisLabel,
        row.gender
      ].concat((row.kits || []).map(k => k.kit.namaTim + ' ' + k.kit.namaInstansi))
        .concat((row.candidates || []).map(c => c.namaTim + ' ' + c.namaInstansi))
        .join(' ').toLowerCase();
      if (hay.indexOf(f.q) < 0) return false;
    }
    return true;
  }

  function statusLabel(status) {
    if (status === 'lengkap') return 'Lengkap';
    if (status === 'belum-lengkap') return 'Belum lengkap';
    if (status === 'belum-input') return 'Belum input';
    if (status === 'perlu-dicocokkan') return 'Perlu dicocokkan';
    if (status === 'duplikat') return 'Duplikat · perlu ditinjau';
    return status || '';
  }

  function adaKurang(flag) {
    return flag ? 'Ada' : 'Kurang';
  }

  function formatWIB(date) {
    const d = date instanceof Date ? date : new Date(date || Date.now());
    let text = '';
    try {
      text = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Jakarta',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      }).format(d);
    } catch (e) {
      text = d.toISOString();
    }
    return text + ' WIB';
  }

  function filterDescription(filters) {
    if (!filters || !filtersActive(filters)) return 'Seluruh roster (tanpa filter tampilan)';
    const bits = [];
    if (filters.gender) bits.push('kategori ' + filters.gender);
    if (filters.status) bits.push('status ' + statusLabel(filters.status === 'sudah-input' ? 'sudah-input' : filters.status).toLowerCase() || filters.status);
    if (filters.status === 'sudah-input') bits[bits.length - 1] = 'status sudah input';
    if (filters.status === 'verified') bits[bits.length - 1] = 'verifikasi terverifikasi';
    if (filters.status === 'pending') bits[bits.length - 1] = 'verifikasi menunggu';
    if (filters.status === 'rejected') bits[bits.length - 1] = 'verifikasi ditolak';
    if (filters.q) bits.push('cari "' + filters.q + '"');
    return bits.join(', ');
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function assetListHtml(detail) {
    const c = detail.completeness;
    const kepalaText = c.kepala.butuh > 1
      ? ('Pimpinan ' + c.kepala.ada + '/' + c.kepala.butuh)
      : ('Pimpinan ' + adaKurang(c.kepala.ok));
    return '<ul class="kit-check kontrol-assets">' +
      '<li class="' + (c.logo ? 'yes' : '') + '">Logo ' + adaKurang(c.logo) + '</li>' +
      '<li class="' + (c.kapten ? 'yes' : '') + '">Kapten ' + adaKurang(c.kapten) + '</li>' +
      '<li class="' + (c.jerseyUtama ? 'yes' : '') + '">Jersey ' + adaKurang(c.jerseyUtama) + '</li>' +
      '<li class="' + (c.kepala.ok ? 'yes' : '') + '">' + esc(kepalaText) + '</li>' +
      '</ul>';
  }

  function renderKontrol(model) {
    if (!model || model.loadState === 'loading') {
      return '<div class="alert" role="status">Memuat data kit… Perbandingan roster belum ditampilkan.</div>';
    }
    if (!model || model.loadState === 'error' || model.ok === false) {
      return '<div class="alert alert-err" role="alert">' +
        esc(model && model.errorMessage ? model.errorMessage : 'Gagal memuat data kit.') +
        ' Daftar belum input tidak ditampilkan agar tidak tertukar dengan kegagalan muat data.</div>';
    }
    const c = model.counts;
    const chips = [
      ['Diharapkan', c.diharapkan],
      ['Sudah input', c.sudahInput],
      ['Belum input', c.belumInput],
      ['Belum lengkap', c.belumLengkap],
      ['Lengkap', c.lengkap],
      ['Perlu dicocokkan', c.perluDicocokkan],
      ['Duplikat', c.duplikat]
    ];
    let html = '<div class="kontrol-stats">';
    chips.forEach(([label, n]) => {
      html += '<div class="kontrol-stat"><b>' + esc(n) + '</b><span>' + esc(label) + '</span></div>';
    });
    html += '</div>';
    html += '<p class="kontrol-meta">Putra ' + esc(c.putra) + ' · Putri ' + esc(c.putri) +
      '. Angka di atas seluruh roster, tidak mengikuti filter tabel. Dicetak dari data ' +
      esc(formatWIB(model.generatedAt)) + '.</p>';
    if (model.filtersActive) {
      html += '<p class="kontrol-meta">Tabel disaring: ' + esc(filterDescription(model.filters)) +
        '. Menampilkan ' + esc(model.rows.length) + ' dari ' + esc(model.allRows.length) +
        ' tim. PDF utama tetap seluruh roster.</p>';
    }
    (model.ambiguities || []).forEach(a => {
      html += '<div class="alert alert-warn"><strong>Catatan jadwal.</strong> ' + esc(a.penjelasan) + '</div>';
    });
    if (!model.rows.length) {
      html += '<div class="empty">Tidak ada tim roster sesuai filter.</div>';
    } else {
      html += model.rows.map(renderRow).join('');
    }
    const outside = (model.unmatched || []).filter(k => {
      if (!model.filtersActive) return true;
      if (model.filters.gender && normalizeKategori(k.kategoriTim) && normalizeKategori(k.kategoriTim) !== model.filters.gender) return false;
      return true;
    });
    if (outside.length && !model.filters.status) {
      html += '<h3 class="section-sub">Kit tersimpan di luar roster</h3>';
      html += '<p class="kontrol-meta">Tidak dihitung sebagai belum input. Tidak dicocokkan otomatis ke peserta jadwal.</p>';
      html += '<ul class="kontrol-outside">' + outside.map(k =>
        '<li>' + esc(k.namaTim || k.id) + ' · ' + esc(k.namaInstansi || '—') +
        ' · ' + esc(normalizeKategori(k.kategoriTim) || 'kategori kosong') + '</li>'
      ).join('') + '</ul>';
    }
    return html;
  }

  function renderRow(row) {
    const joint = row.joint ? ' <span class="badge badge-gabungan">Tim gabungan</span>' : '';
    let body = '';
    if (row.status === 'belum-input') {
      body = '<p class="kontrol-miss">Belum ada kit yang masuk untuk tim ini.</p>';
    } else if (row.status === 'perlu-dicocokkan') {
      body = '<p>Kandidat, belum dihitung input atau belum lengkap:</p><ul class="kontrol-outside">' +
        row.candidates.map(k => '<li>' + esc(k.namaTim || k.id) + ' · ' + esc(k.namaInstansi || '—') +
          ' · ' + esc(k.kategoriTim || 'kategori kosong') + '</li>').join('') + '</ul>';
    } else {
      body = row.kits.map(detail => {
        const miss = detail.completeness.missing.length
          ? '<p class="kontrol-miss">Kurang: ' + esc(detail.completeness.missing.join(', ')) + '</p>'
          : '<p class="kontrol-ok">Unggahan wajib lengkap.</p>';
        const cad = detail.completeness.jerseyCadangan ? 'Jersey cadangan: ada (opsional).' : 'Jersey cadangan: tidak ada (opsional).';
        return '<div class="kontrol-kit">' +
          '<div><strong>' + esc(detail.kit.namaTim || detail.kit.id) + '</strong>' +
          '<div class="meta">' + esc(detail.kit.namaInstansi || '—') + ' · ' + esc(detail.kit.id) + '</div></div>' +
          assetListHtml(detail) + miss +
          '<p class="meta">' + esc(cad) + ' Verifikasi: ' + esc(detail.verifikasi) + ' (terpisah dari kelengkapan).</p>' +
          '<button type="button" class="btn btn-navy" data-kontrol-preview="' + esc(detail.kit.id) + '">Preview Kit</button>' +
          '</div>';
      }).join('');
      if (row.candidates.length) {
        body += '<p class="meta">Unggahan mirip yang tidak dihitung otomatis: ' +
          esc(row.candidates.map(k => k.namaTim || k.id).join(', ')) + '</p>';
      }
    }
    return '<article class="kontrol-card" data-kontrol-id="' + esc(row.id) + '" data-status="' + esc(row.status) + '">' +
      '<div class="admin-card-badges">' +
        '<span class="badge ' + (row.gender === 'Putri' ? 'badge-putri' : 'badge-putra') + '">' + esc(row.gender) + '</span> ' +
        '<span class="badge">' + esc(row.jenisLabel) + '</span> ' +
        '<span class="badge">' + esc(statusLabel(row.status)) + '</span>' + joint +
      '</div>' +
      '<h3>' + esc(row.display) + '</h3>' +
      body +
      '</article>';
  }

  function csvCell(v) {
    return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  }

  function toCsv(model, scope) {
    if (!model || model.loadState !== 'ready') {
      throw new Error(model && model.errorMessage ? model.errorMessage : 'Data kit belum siap.');
    }
    const useFilter = scope === 'filter';
    const rows = useFilter ? model.rows : model.allRows;
    const filters = useFilter ? model.filters : { gender: '', q: '', status: '' };
    const header = ['kategori', 'faskes_jadwal', 'jenis', 'status_kontrol', 'nama_kit', 'instansi_kit', 'id_kit', 'logo', 'kapten', 'jersey_utama', 'pimpinan', 'daftar_kurang', 'verifikasi', 'jersey_cadangan'];
    const lines = [
      csvCell('keterangan') + ',' + csvCell(useFilter ? ('Filter tampilan: ' + filterDescription(filters)) : 'Seluruh roster jadwal'),
      csvCell('waktu_wib') + ',' + csvCell(formatWIB(model.generatedAt)),
      header.map(csvCell).join(',')
    ];
    rows.forEach(row => {
      if (!row.kits.length) {
        lines.push([
          row.gender, row.display, row.jenisLabel, statusLabel(row.status),
          row.candidates.map(k => k.namaTim).join(' | '),
          '', '', '', '', '', '',
          row.status === 'perlu-dicocokkan' ? 'Perlu dicocokkan, bukan belum input' : '',
          '', ''
        ].map(csvCell).join(','));
        return;
      }
      row.kits.forEach(detail => {
        const c = detail.completeness;
        lines.push([
          row.gender,
          row.display,
          row.jenisLabel,
          statusLabel(row.status),
          detail.kit.namaTim,
          detail.kit.namaInstansi,
          detail.kit.id,
          adaKurang(c.logo),
          adaKurang(c.kapten),
          adaKurang(c.jerseyUtama),
          c.kepala.ada + '/' + c.kepala.butuh,
          c.missing.join('; '),
          detail.verifikasi,
          c.jerseyCadangan ? 'Ada (opsional)' : 'Tidak ada (opsional)'
        ].map(csvCell).join(','));
      });
    });
    return lines.join('\n');
  }

  function sliceForPdf(model, scope) {
    if (!model || model.loadState !== 'ready') {
      throw new Error(model && model.errorMessage ? model.errorMessage : 'Data kit belum siap. Laporan tidak dibuat.');
    }
    const filtered = scope === 'filter';
    const rows = filtered ? model.rows : model.allRows;
    const counts = filtered ? model.filteredCounts : model.counts;
    return {
      contoh: !!model.contoh,
      generatedAt: model.generatedAt,
      generatedAtText: formatWIB(model.generatedAt),
      source: model.source,
      ambiguities: model.ambiguities || [],
      filtersActive: filtered && !!model.filtersActive,
      filterText: filtered ? filterDescription(model.filters) : 'Seluruh roster (tanpa filter tampilan)',
      counts: counts,
      fullCounts: model.counts,
      rows: rows,
      unmatched: filtered ? [] : (model.unmatched || []),
      scope: filtered ? 'filter' : 'penuh'
    };
  }

  return {
    canon: canon,
    hasPhrase: hasPhrase,
    normalizeKategori: normalizeKategori,
    prepareRoster: prepareRoster,
    assess: assess,
    kitCompleteness: kitCompleteness,
    renderKontrol: renderKontrol,
    toCsv: toCsv,
    sliceForPdf: sliceForPdf,
    formatWIB: formatWIB,
    statusLabel: statusLabel,
    filterDescription: filterDescription,
    countRows: countRows,
    NICKNAMES: NICKNAMES
  };
});
