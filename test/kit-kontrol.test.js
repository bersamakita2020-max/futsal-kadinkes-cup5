/**
 * Uji roster jadwal, pencocokan kit, privasi, dan PDF laporan.
 * Penyusun: Anara Tech
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('node:child_process');
const vm = require('node:vm');

const roster = require('../js/schedule-roster');
const kontrol = require('../js/kit-kontrol');
const laporan = require('../js/laporan-kelengkapan-pdf');
const contoh = require('./fixtures/kits-contoh-uji');
const jspdf = require('../assets/vendor/jspdf.umd.min.js');

function assess(kits, extra) {
  return kontrol.assess(kits, Object.assign({
    roster: roster,
    loadState: 'ready',
    contoh: true,
    now: new Date('2026-11-07T12:00:00+07:00')
  }, extra || {}));
}

function row(model, idPart) {
  return model.allRows.find(r => r.id.indexOf(idPart) >= 0);
}

test('halaman admin memasang laporan terpisah dan tidak menyentuh majalah', () => {
  const html = fs.readFileSync(path.join(__dirname, '../admin.html'), 'utf8');
  const adminJs = fs.readFileSync(path.join(__dirname, '../js/admin.js'), 'utf8');
  const mag = fs.readFileSync(path.join(__dirname, '../js/magazine-pdf.js'), 'utf8');
  assert.match(html, /Kontrol Kit Sesuai Jadwal/);
  assert.match(html, /Unduh PDF Laporan Kelengkapan Faskes/);
  assert.match(html, /js\/laporan-kelengkapan-pdf\.js/);
  assert.match(html, /js\/magazine-pdf\.js/);
  assert.equal(html.includes('pendaftaran'), false);
  assert.equal(adminJs.includes('pendaftaran'), false);
  assert.doesNotMatch(mag, /Laporan Kelengkapan Kit Faskes/);
  assert.match(mag, /Penyusun: Anara Tech/);
});

test('jadwal: 13 pertandingan Hari 1 pagi dan istirahat 16.40-18.30', () => {
  const pagi = roster.MATCHES.filter(m => m.halaman === 2);
  assert.equal(pagi.length, 13);
  assert.equal(pagi[0].waktu, '08.00–08.40');
  assert.equal(pagi[12].waktu, '16.00–16.40');
  const br = roster.BREAKS.find(b => b.halaman === 2);
  assert.equal(br.waktu, '16.40–18.30');
  assert.equal(roster.MATCHES.length, 38);
  const deleted = roster.MATCHES.filter(m =>
    m.gender === 'Putri' &&
    /dkbp3a/i.test(m.kiri + m.kanan) &&
    /ade/i.test(m.kiri + m.kanan) &&
    !roster.isPlaceholderName(m.kiri) &&
    !roster.isPlaceholderName(m.kanan)
  );
  assert.equal(deleted.length, 0);
});

test('roster mendedupe tim konkret per gender, placeholder bukan peserta', () => {
  assert.equal(roster.teams.length, 45);
  assert.equal(roster.teams.filter(t => t.gender === 'Putra').length, 25);
  assert.equal(roster.teams.filter(t => t.gender === 'Putri').length, 20);
  roster.teams.forEach(t => assert.equal(roster.isPlaceholderName(t.display), false));
  const ids = roster.teams.map(t => t.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(roster.placeholders().length, 6);
  assert.ok(roster.AMBIGUITIES.some(a => a.id === 'amb-dkbp3a-ade-putri'));
  assert.equal(roster.teams.some(t => t.gender === 'Putri' && /dkbp3a|ade m/i.test(t.display)), false);
  assert.ok(roster.teams.some(t => t.id === 'putra-dp3ap2kb'));
  assert.ok(roster.teams.some(t => t.id === 'putra-rsud-ade-m-djoen'));
  ['Pusk. Senaning', 'Pusk. Merakai', 'Pusk. Sungai Durian', 'Pusk. Tanjung Puri'].forEach(name => {
    assert.equal(roster.teams.some(t => t.gender === 'Putra' && t.display === name), false, name);
  });
  assert.ok(roster.teams.some(t => t.id === 'putra-puskesmas-senaning-merakai' && t.joint && t.headCount === 2));
  assert.ok(roster.teams.some(t => t.id === 'putra-puskesmas-sungai-durian-tanjung-puri' && t.joint));
  assert.ok(roster.teams.some(t => t.id === 'putri-dinkes-x-puskesmas-merakai' && t.joint && t.headCount === 2));
  assert.ok(roster.teams.some(t => t.id === 'putri-puskesmas-mensiku-x-puskesmas-serangas' && t.joint));
  assert.ok(roster.teams.some(t => t.id === 'putri-puskesmas-senaning' && !t.joint));
  assert.ok(roster.teams.some(t => t.id === 'putri-puskesmas-tanjung-puri' && !t.joint));
  assert.equal(roster.teams.some(t => t.gender === 'Putri' && t.display === 'Pusk. Merakai'), false);
  assert.equal(roster.teams.some(t => t.gender === 'Putri' && t.display === 'Pusk. Sungai Durian'), false);
  assert.ok(roster.teams.some(t => t.id === 'putra-puskesmas-mensiku' && !t.joint));
  assert.ok(roster.teams.some(t => t.id === 'putra-puskesmas-serangas' && !t.joint));
  assert.equal(roster.teams.some(t => t.gender === 'Putri' && t.display === 'Pusk. Mensiku'), false);
  assert.equal(roster.teams.some(t => t.gender === 'Putri' && t.display === 'Pusk. Serangas'), false);
});

test('alias, tim gabungan, dan gender tidak salah cocok', () => {
  const model = assess(contoh.teams);
  const c = model.counts;
  assert.equal(c.diharapkan, 45);
  assert.equal(c.lengkap, 5);
  assert.equal(c.belumLengkap, 3);
  assert.equal(c.duplikat, 2);
  assert.equal(c.perluDicocokkan, 3);
  assert.equal(c.sudahInput, 10);
  assert.equal(c.belumInput, 32);
  assert.equal(c.sudahInput + c.belumInput + c.perluDicocokkan, c.diharapkan);

  const pandan = row(model, 'putra-puskesmas-pandan');
  assert.equal(pandan.status, 'lengkap');
  assert.equal(pandan.kits[0].kit.namaTim, 'Pusk. Pandan');
  assert.equal(pandan.kits[0].verifikasi, 'Terverifikasi');

  const joint = row(model, 'putra-puskesmas-senaning-merakai');
  assert.equal(joint.status, 'lengkap');
  assert.equal(joint.kits.length, 1);
  assert.equal(joint.kits[0].completeness.kepala.ada, 2);
  assert.ok(joint.candidates.some(k => k.id === 'UJI-MERAKAI'));

  const ade = row(model, 'putra-rsud-ade-m-djoen');
  assert.equal(ade.status, 'lengkap');
  const lab = row(model, 'putra-labkesda');
  assert.equal(lab.status, 'belum-lengkap');
  assert.equal(lab.kits[0].verifikasi, 'Ditolak');
  assert.ok(lab.kits[0].completeness.missing.some(m => /pimpinan/i.test(m)));
  const rsp = row(model, 'putra-rsp-serawai');
  const pk = row(model, 'putra-puskesmas-serawai');
  assert.equal(rsp.status, 'belum-lengkap');
  assert.equal(rsp.kits[0].kit.id, 'UJI-RSP');
  assert.equal(pk.status, 'lengkap');
  assert.equal(pk.kits[0].kit.id, 'UJI-SERAWAI');

  const dkbp = row(model, 'putra-dp3ap2kb');
  assert.equal(dkbp.status, 'belum-lengkap');
  assert.equal(dkbp.kits[0].kit.id, 'UJI-DKBP');

  const tebPutra = row(model, 'putra-puskesmas-tebidah');
  const tebPutri = row(model, 'putri-puskesmas-tebidah');
  assert.equal(tebPutra.status, 'lengkap');
  assert.equal(tebPutra.kits.length, 1);
  assert.equal(tebPutri.status, 'duplikat');
  assert.equal(tebPutri.kits.length, 2);
  assert.equal(tebPutri.lengkap, false);

  const tmp = row(model, 'putri-puskesmas-tempunak');
  assert.equal(tmp.status, 'duplikat');
  assert.ok(tmp.kits.some(k => k.kit.namaTim === 'TPK Pride'));
  assert.equal(row(model, 'putra-puskesmas-tempunak').status, 'belum-input');

  const dxm = row(model, 'putri-dinkes-x-puskesmas-merakai');
  assert.equal(dxm.status, 'perlu-dicocokkan');
  assert.ok(dxm.candidates.some(k => k.id === 'UJI-DINKES-PUTRI'));
  assert.equal(dxm.kits.length, 0);

  const dedaiP = row(model, 'putra-puskesmas-dedai');
  const dedaiW = row(model, 'putri-puskesmas-dedai');
  assert.equal(dedaiP.status, 'perlu-dicocokkan');
  assert.equal(dedaiW.status, 'perlu-dicocokkan');

  const sungai = row(model, 'putra-puskesmas-sungai-durian-tanjung-puri');
  assert.equal(sungai.status, 'belum-input');
  assert.equal(roster.teams.some(t => t.gender === 'Putri' && /dkbp3a|ade/i.test(t.display)), false);
  assert.ok(model.unmatched.some(k => k.id === 'UJI-LUAR'));
  assert.equal(model.unmatched.some(k => k.id === 'UJI-DEDAI'), false);
});

test('pimpinan ganda tim gabungan dan konstituen tidak otomatis lengkap', () => {
  const partial = assess([{
    id: 'SATU',
    namaTim: 'Dinkes x Pusk. Merakai',
    namaInstansi: 'Dinas Kesehatan',
    kategoriTim: 'Putri',
    logoUrl: 'a',
    fotoKaptenUrl: 'a',
    jerseyUtamaUrl: 'a',
    kepala: [{ nama: 'A', instansi: 'Dinas Kesehatan', fotoUrl: 'a' }]
  }]);
  const dxm = row(partial, 'putri-dinkes-x-puskesmas-merakai');
  assert.equal(dxm.status, 'belum-lengkap');
  assert.ok(dxm.kits[0].completeness.missing.some(m => /Merakai/i.test(m)));

  const only = assess([{
    id: 'SEN',
    namaTim: 'Puskesmas Senaning',
    kategoriTim: 'Putra',
    logoUrl: 'a', fotoKaptenUrl: 'a', jerseyUtamaUrl: 'a',
    kepala: [{ nama: 'A', instansi: 'Puskesmas Senaning', fotoUrl: 'a' }]
  }]);
  const joint = row(only, 'putra-puskesmas-senaning-merakai');
  assert.equal(joint.status, 'perlu-dicocokkan');
  assert.equal(joint.lengkap, false);
  assert.equal(row(only, 'putri-puskesmas-senaning').status, 'belum-input');
});

test('gagal muat dan sedang memuat tidak dianggap belum input', () => {
  const loading = kontrol.assess([], { roster: roster, loadState: 'loading' });
  assert.equal(loading.counts, null);
  assert.equal(loading.allRows.length, 0);
  assert.match(kontrol.renderKontrol(loading), /Memuat data kit/);
  assert.doesNotMatch(kontrol.renderKontrol(loading), /Belum ada kit/);

  const error = kontrol.assess([], { roster: roster, loadState: 'error', errorMessage: 'Jaringan putus' });
  assert.equal(error.counts, null);
  const html = kontrol.renderKontrol(error);
  assert.match(html, /Jaringan putus/);
  assert.match(html, /tidak ditampilkan/);
  assert.doesNotMatch(html, /Belum ada kit yang masuk/);
  assert.throws(() => kontrol.sliceForPdf(error, 'penuh'), /belum siap|tidak dibuat|Jaringan/);
});

test('tampilan, CSV, dan PDF tidak memuat kontak atau token', () => {
  const model = assess(contoh.teams);
  const html = kontrol.renderKontrol(model);
  const csv = kontrol.toCsv(model, 'penuh');
  [html, csv, JSON.stringify(model.rows), JSON.stringify(model.unmatched)].forEach(text => {
    assert.equal(text.includes(contoh.SECRET_WA), false);
    assert.equal(text.includes(contoh.SECRET_CODE), false);
    assert.equal(text.includes(contoh.SECRET_TOKEN), false);
    assert.equal(/pendaftaran/i.test(text), false);
  });
  assert.match(html, /Kontrol|Diharapkan|Perlu dicocokkan|Duplikat/);
  assert.match(csv, /Seluruh roster/);
});

test('API publik tetap menyensor kontak, adminList tetap butuh token', () => {
  const demoTeams = [{
    id: 'PRIV-1',
    namaTim: 'Privasi',
    status: 'pending',
    kontakWA: '081200011122',
    kontakNama: 'Nama Rahasia',
    editCode: 'KC5-PRIVASI',
    catatan: 'rahasia'
  }];
  const context = {
    console: console,
    setTimeout: setTimeout,
    window: {
      FUTSAL_CONFIG: { DEMO_MODE: true, API_URL: '' },
      FUTSAL_DEMO: { teams: demoTeams, stats: { total: 1 } }
    }
  };
  context.window.window = context.window;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/api.js'), 'utf8'), context);
  return Promise.all([
    context.window.FutsalAPI.get('listTeams'),
    context.window.FutsalAPI.post('adminList', { token: 'demo-token' }),
    context.window.FutsalAPI.post('adminList', {}).then(() => null, err => err)
  ]).then(([pub, admin, denied]) => {
    assert.equal(pub.teams[0].kontakWA, undefined);
    assert.equal(pub.teams[0].editCode, undefined);
    assert.equal(pub.teams[0].kontakNama, undefined);
    assert.equal(admin.teams[0].kontakWA, '081200011122');
    assert.match(String(denied && denied.message), /Token admin/);
  });
});

test('PDF laporan terpisah: teks, halaman, angka, dan batas halaman', () => {
  const model = assess(contoh.teams);
  const slice = kontrol.sliceForPdf(model, 'penuh');
  assert.equal(slice.counts.diharapkan, model.counts.diharapkan);
  const result = laporan.generate({ model: slice, jsPDF: jspdf.jsPDF });
  assert.ok(result.pages >= 2);
  assert.match(result.filename, /CONTOH_DATA_UJI/);
  assert.equal(result.counts.lengkap, 5);
  const out = path.join(__dirname, 'tmp-laporan-contoh.pdf');
  fs.writeFileSync(out, Buffer.from(result.doc.output('arraybuffer')));
  const py = spawnSync('python3', ['-c', `
import fitz, json, sys
doc = fitz.open(sys.argv[1])
pages = []
boxes = []
for i, page in enumerate(doc):
    pages.append(page.get_text())
    for b in page.get_text('dict')['blocks']:
        if b.get('type') != 0: continue
        for line in b.get('lines', []):
            for s in line.get('spans', []):
                x0,y0,x1,y1 = s['bbox']
                boxes.append((i+1, x0, y0, x1, y1, s['text']))
print(json.dumps({'n': doc.page_count, 'pages': pages, 'boxes': boxes}))
`, out], { encoding: 'utf8' });
  assert.equal(py.status, 0, py.stderr);
  const parsed = JSON.parse(py.stdout);
  assert.equal(parsed.n, result.pages);
  const all = parsed.pages.join('\n');
  assert.match(all, /CONTOH DATA UJI/);
  assert.match(all, /Penyusun: Anara Tech/);
  assert.match(all, /Diharapkan/);
  assert.match(all, /Sudah input/);
  assert.match(all, /Belum input/);
  assert.match(all, /Belum lengkap/);
  assert.match(all, /Lengkap/);
  assert.match(all, /Perlu dicocokkan/);
  assert.match(all, /Duplikat/);
  assert.match(all, /Pemenang DKBP3A \/ Ade M\. Djoen|placeholder hilir|tidak menambah peserta/);
  assert.match(all, /Sungai Durian/);
  assert.match(all, /TPK Pride/);
  assert.match(all, /Faskes belum input/);
  assert.doesNotMatch(all, new RegExp(contoh.SECRET_WA));
  assert.doesNotMatch(all, new RegExp(contoh.SECRET_CODE));
  assert.doesNotMatch(all, new RegExp(contoh.SECRET_TOKEN));
  assert.doesNotMatch(all, /pendaftaran/i);
  const headerPages = parsed.pages.filter(p => p.includes('Faskes di jadwal')).length;
  assert.ok(headerPages >= 2, 'header tabel harus berulang');
  assert.match(parsed.pages[0], /Hal\. 1 \/ /);
  assert.match(parsed.pages[parsed.n - 1], new RegExp('Hal\\. ' + parsed.n + ' \\/ ' + parsed.n));
  parsed.boxes.forEach(b => {
    const x0 = b[1], y0 = b[2], x1 = b[3], y1 = b[4], text = b[5];
    assert.ok(x0 >= -1, text);
    assert.ok(y0 >= -1, text);
    assert.ok(x1 <= 596, text + ' x1=' + x1);
    assert.ok(y1 <= 842, text + ' y1=' + y1);
  });
  fs.unlinkSync(out);

  const filtered = kontrol.sliceForPdf(assess(contoh.teams, {
    filters: { gender: 'Putri', status: '', q: '' }
  }), 'filter');
  assert.match(filtered.filterText, /Putri/);
  assert.ok(filtered.counts.diharapkan < 45);
  assert.equal(filtered.fullCounts.diharapkan, 45);
  const empty = assess([]);
  assert.equal(empty.counts.belumInput, 45);
  assert.equal(empty.counts.sudahInput, 0);
  const emptyPdf = laporan.generate({ model: kontrol.sliceForPdf(empty, 'penuh'), jsPDF: jspdf.jsPDF });
  assert.match(emptyPdf.doc.output('arraybuffer') ? 'ok' : '', /ok/);
  assert.ok(emptyPdf.pages >= 2);
});
