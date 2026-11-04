/* Lightbox galeri publik KC5 — v1.0.16 · Penyusun: Anara Tech */
(function (global) {
  'use strict';
  let root, stage, img, cap, count, spin, fail, items = [], idx = 0, team = '';
  let scale = 1, tx = 0, ty = 0, lastTap = 0, pointers = new Map(), pinch0 = null, drag0 = null, swipe0 = null, lastFocus = null;
  const svg = (d) => '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>';

  function build() {
    if (root) return;
    root = document.createElement('div');
    root.className = 'klb'; root.hidden = true;
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Pratinjau foto');
    root.innerHTML =
      '<div class="klb-top"><div class="klb-count"></div>' +
        '<div class="klb-tools">' +
          '<button type="button" class="klb-btn" data-act="zoomout" aria-label="Perkecil">' + svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M8 11h6"/>') + '</button>' +
          '<button type="button" class="klb-btn" data-act="zoomin" aria-label="Perbesar">' + svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3M8 11h6M11 8v6"/>') + '</button>' +
          '<button type="button" class="klb-btn klb-close" data-act="close" aria-label="Tutup">' + svg('<path d="M6 6l12 12M18 6L6 18"/>') + '</button>' +
        '</div></div>' +
      '<button type="button" class="klb-nav klb-prev" data-act="prev" aria-label="Sebelumnya">' + svg('<path d="M15 5l-7 7 7 7"/>') + '</button>' +
      '<div class="klb-stage"><div class="klb-spin" aria-hidden="true"></div>' +
        '<div class="klb-fail" hidden>Gambar gagal dimuat.<br><a target="_blank" rel="noopener">Buka di tab baru</a></div>' +
        '<img class="klb-img" alt="" draggable="false" referrerpolicy="no-referrer"></div>' +
      '<button type="button" class="klb-nav klb-next" data-act="next" aria-label="Berikutnya">' + svg('<path d="M9 5l7 7-7 7"/>') + '</button>' +
      '<div class="klb-cap"></div>';
    document.body.appendChild(root);
    stage = root.querySelector('.klb-stage'); img = root.querySelector('.klb-img');
    cap = root.querySelector('.klb-cap'); count = root.querySelector('.klb-count');
    spin = root.querySelector('.klb-spin'); fail = root.querySelector('.klb-fail');

    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (b) { const a = b.getAttribute('data-act');
        if (a === 'close') close(); else if (a === 'prev') go(-1); else if (a === 'next') go(1);
        else if (a === 'zoomin') zoomTo(scale * 1.6); else if (a === 'zoomout') zoomTo(scale / 1.6);
        return; }
      if (e.target === root || e.target === stage) close();
    });
    img.addEventListener('load', () => { spin.hidden = true; img.classList.add('in'); });
    img.addEventListener('error', () => {
      const it = items[idx]; const rest = img._srcs || [];
      if (rest.length) { img.src = rest.shift(); return; }
      spin.hidden = true; img.classList.remove('in'); fail.hidden = false;
      fail.querySelector('a').href = it ? it.url : '#';
    });
    stage.addEventListener('wheel', (e) => { e.preventDefault(); zoomTo(scale * (e.deltaY < 0 ? 1.2 : 1 / 1.2)); }, { passive: false });
    stage.addEventListener('dblclick', (e) => { e.preventDefault(); zoomTo(scale > 1 ? 1 : 2.5); });
    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => stage.addEventListener(n, onUp));
    document.addEventListener('keydown', (e) => {
      if (root.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === '+' || e.key === '=') zoomTo(scale * 1.6);
      else if (e.key === '-') zoomTo(scale / 1.6);
    });
  }
  function apply() { img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')'; root.classList.toggle('zoomed', scale > 1.01); }
  function zoomTo(s) { scale = Math.min(5, Math.max(1, s)); if (scale === 1) { tx = 0; ty = 0; } apply(); }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function onDown(e) {
    stage.setPointerCapture && stage.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = { d: dist(a, b), s: scale }; swipe0 = null; drag0 = null; return; }
    if (e.pointerType !== 'mouse') {
      const now = Date.now();
      if (now - lastTap < 300) { zoomTo(scale > 1 ? 1 : 2.5); lastTap = 0; return; }
      lastTap = now;
    }
    if (scale > 1) drag0 = { x: e.clientX - tx, y: e.clientY - ty };
    else swipe0 = { x: e.clientX, y: e.clientY, t: Date.now() };
  }
  function onMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch0 && pointers.size === 2) { const [a, b] = [...pointers.values()]; zoomTo(pinch0.s * dist(a, b) / pinch0.d); return; }
    if (drag0) { tx = e.clientX - drag0.x; ty = e.clientY - drag0.y; apply(); }
    else if (swipe0) { img.style.transform = 'translateX(' + (e.clientX - swipe0.x) + 'px)'; }
  }
  function onUp(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch0 = null;
    if (swipe0) { const dx = e.clientX - swipe0.x, dy = e.clientY - swipe0.y; swipe0 = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && items.length > 1) { go(dx < 0 ? 1 : -1); return; }
      if (dy > 110 && Math.abs(dy) > Math.abs(dx)) { close(); return; }
      apply(); }
    drag0 = null;
  }
  function show() {
    const it = items[idx]; if (!it) return;
    scale = 1; tx = 0; ty = 0; apply();
    img.classList.remove('in'); fail.hidden = true; spin.hidden = false;
    const srcs = (it.srcs && it.srcs.length ? it.srcs : [it.url]).slice();
    img._srcs = srcs.slice(1); img.alt = it.label; img.src = srcs[0];
    cap.innerHTML = ''; const b = document.createElement('strong'); b.textContent = team;
    const s = document.createElement('span'); s.textContent = it.label; cap.append(b, s);
    count.textContent = items.length > 1 ? (idx + 1) + ' / ' + items.length : '';
    root.classList.toggle('single', items.length < 2);
    // preload tetangga
    [idx + 1, idx - 1].forEach(j => { const n = items[(j + items.length) % items.length]; if (n) { const p = new Image(); p.referrerPolicy = 'no-referrer'; p.src = (n.srcs || [n.url])[0]; } });
  }
  function go(d) { if (items.length < 2) return; idx = (idx + d + items.length) % items.length; show(); }
  function open(list, start, teamName) {
    if (!list || !list.length) return;
    build(); items = list; idx = start || 0; team = teamName || '';
    lastFocus = document.activeElement;
    root.hidden = false; document.documentElement.classList.add('klb-lock');
    requestAnimationFrame(() => root.classList.add('open'));
    show(); root.querySelector('.klb-close').focus({ preventScroll: true });
  }
  function close() {
    if (!root || root.hidden) return;
    root.classList.remove('open'); document.documentElement.classList.remove('klb-lock');
    setTimeout(() => { root.hidden = true; img.removeAttribute('src'); }, 220);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  global.FutsalLightbox = { open: open, close: close, isOpen: () => !!root && !root.hidden };
})(window);
