(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const C = window.FUTSAL_CONFIG;
  let token = sessionStorage.getItem(C.ADMIN_SESSION_KEY || 'futsal_kc5_admin_token') || '';
  let teams = [];

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
    if (j === 'BPJS') return 'BPJS';
    if (j === 'DP3AP2KB') return 'DP3AP2KB';
    return j || 'Puskesmas';
  }
  function statusLabel(s) {
    if (s === 'verified') return '<span class="badge badge-ok">Kit terverifikasi</span>';
    if (s === 'rejected') return '<span class="badge badge-demo">Ditolak</span>';
    return '<span class="badge badge-pending">Menunggu</span>';
  }

  function render() {
    const st = $('#fStatus').value;
    const q = ($('#fSearch').value || '').toLowerCase().trim();
    let list = teams.slice();
    if (st) list = list.filter(t => t.status === st);
    if (q) list = list.filter(t =>
      (t.namaTim || '').toLowerCase().includes(q) ||
      (t.namaInstansi || '').toLowerCase().includes(q)
    );
    const tb = $('#adminRows');
    if (!list.length) {
      tb.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted)">Tidak ada data.</td></tr>';
      return;
    }
    tb.innerHTML = list.map(t =>
      '<tr data-id="' + esc(t.id) + '">' +
        '<td><strong>' + esc(t.namaTim) + '</strong>' + (t._contoh ? ' <span class="badge badge-demo">CONTOH</span>' : '') +
          '<div style="font-size:.78rem;color:var(--muted)">' + esc(t.id) + '</div></td>' +
        '<td>' + esc(jenisLabel(t.jenisInstansi)) + '<br><span style="color:var(--muted);font-size:.84rem">' + esc(t.namaInstansi) + '</span></td>' +
        '<td>' + statusLabel(t.status) + '</td>' +
        '<td style="font-size:.84rem">' + esc(t.kontakNama) + '<br>' + esc(t.kontakWA) + '</td>' +
        '<td style="white-space:nowrap">' +
          '<button type="button" class="btn btn-primary" style="padding:6px 10px;font-size:.78rem;margin:2px" data-act="verified">Kit OK</button>' +
          '<button type="button" class="btn btn-outline" style="padding:6px 10px;font-size:.78rem;margin:2px" data-act="pending">Tunda</button>' +
          '<button type="button" class="btn btn-danger" style="padding:6px 10px;font-size:.78rem;margin:2px" data-act="rejected">Tolak</button>' +
        '</td>' +
      '</tr>'
    ).join('');

    tb.querySelectorAll('button[data-act]').forEach(btn => {
      btn.onclick = FutsalAPI.withBusy(btn, async () => {
        const id = btn.closest('tr').getAttribute('data-id');
        const status = btn.getAttribute('data-act');
        const msg = $('#adminMsg');
        try {
          await FutsalAPI.post('adminSetStatus', { token, id, status });
          const row = teams.find(x => x.id === id);
          if (row) row.status = status;
          msg.hidden = false;
          msg.className = 'alert alert-ok';
          msg.textContent = 'Status ' + id + ' → ' + status + (FutsalAPI.isDemo() ? ' (demo)' : '');
          render();
        } catch (e) {
          msg.hidden = false;
          msg.className = 'alert alert-err';
          msg.textContent = e.message;
        }
      });
    });
  }

  async function refresh() {
    const res = await FutsalAPI.post('adminList', { token });
    teams = res.teams || [];
    render();
  }

  function boot() {
    if (FutsalAPI.isDemo()) $('#demoBanner').hidden = false;
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
    };

    $('#btnRefresh').onclick = FutsalAPI.withBusy($('#btnRefresh'), refresh);
    $('#btnExport').onclick = FutsalAPI.withBusy($('#btnExport'), async () => {
      const res = await FutsalAPI.post('adminExport', { token });
      const blob = new Blob([res.csv || ''], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'kit-faskes-kc5.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    });
    $('#fStatus').onchange = render;
    $('#fSearch').oninput = render;
    $('#pinInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') $('#btnLogin').click();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
