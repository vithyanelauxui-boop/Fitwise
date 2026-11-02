/* Fitwise analytics. Anonymous, no cookies, no IP stored (location is derived server-side from Vercel's edge headers).
   One record per page context (the case study, a full prototype tab, each embedded prototype frame), all sharing a session id,
   so the dashboard can stitch a person's whole visit back together.

   Session: 30 minutes of inactivity ends it, shared across tabs (localStorage), like GA. Visitor: one id per browser.
   Records are cumulative and re-sent: on load, every 30s while engaged, a few seconds after key actions, and when the tab hides.

   ?me on any URL switches tracking off in this browser, ?notme switches it back on. Off on localhost unless ?fwdebug.
   Prototype actions are observed from outside app.js (see the bottom of this file). */
(function () {
  'use strict';
  var W = window, D = document, L = location, q = new URLSearchParams(L.search);
  var store = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } };
  var rid = function () { return Math.random().toString(36).slice(2, 12); };
  var now = function () { return Date.now(); };

  if (q.has('me')) store('fw-me', '1');
  if (q.has('notme')) store('fw-me', null);
  var debug = q.has('fwdebug');
  var off = !!store('fw-me') || (!debug && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(L.hostname));
  W.fwTrack = function () {};
  if (off) return;

  /* ---------- who: visitor, session, first touch ---------- */
  var EMB = false; try { EMB = W.top !== W.self; } catch (e) { EMB = true; }
  var t0 = now();
  var vid = store('fw-vid'), returning = !!vid;
  if (!vid) { vid = rid(); store('fw-vid', vid); store('fw-first', String(t0)); }
  var first = +store('fw-first') || t0;
  var sid = store('fw-sid'), last = +store('fw-last') || 0, newSession = false;
  if (!sid || t0 - last > 30 * 60 * 1000) { sid = rid(); newSession = true; store('fw-sid', sid); store('fw-s0', String(t0)); store('fw-n', String((+store('fw-n') || 0) + 1)); }
  var s0 = +store('fw-s0') || t0, sn = +store('fw-n') || 1;
  var touch = function () { store('fw-last', String(now())); };
  touch();

  /* source: the session's own entry (kept for every page of the session), plus the visitor's first ever touch */
  var refHost = ''; try { refHost = D.referrer ? new URL(D.referrer).hostname : ''; } catch (e) { }
  var internal = refHost && refHost === L.hostname;
  var utm = {}; ['source', 'medium', 'campaign', 'content', 'term'].forEach(function (k) { var v = q.get('utm_' + k); if (v) utm[k] = v.slice(0, 60); });
  var clid = ['gclid', 'fbclid', 'li_fat_id', 'msclkid', 'ttclid'].filter(function (k) { return q.has(k); })[0] || '';
  var here = (L.pathname.replace(/\/index\.html$/, '/') + L.hash).slice(0, 80);
  var src = null;
  if (!newSession) { try { src = JSON.parse(store('fw-src') || 'null'); } catch (e) { } }
  if (!src || (!internal && (refHost || Object.keys(utm).length) && !EMB)) {
    if (!src || newSession) src = { ref: internal ? '' : (D.referrer || '').slice(0, 200), rh: internal ? '' : refHost, utm: utm, clid: clid, land: here };
    store('fw-src', JSON.stringify(src));
  }
  var ft = null; try { ft = JSON.parse(store('fw-ft') || 'null'); } catch (e) { }
  if (!ft) { ft = { rh: src.rh, utm: src.utm, t: t0 }; store('fw-ft', JSON.stringify(ft)); }

  var page = /prototype/.test(L.pathname) ? 'proto' : 'case';
  var ctx = (page === 'proto' ? (EMB ? 'e' : 'p') : 'c') + '-' + rid().slice(0, 5);

  /* ---------- state for this page context ---------- */
  var act = 0, maxDepth = 0, lastInput = now(), vis = !D.hidden, dirty = true, lastSent = '';
  var taps = {}, tapKeys = 0, ev = [], secDwell = {}, reach = -1, views = [], vsec = {}, cur = null, perf = {};
  var since = function () { return Math.round((now() - t0) / 1000); };

  function addEv(name, p) {
    if (ev.length >= 180) return;
    var x = [String(name).slice(0, 32), since()];
    if (p && typeof p === 'object') { var o = {}, n = 0; for (var k in p) { if (n++ > 6) break; var v = p[k]; if (v == null) continue; o[String(k).slice(0, 16)] = typeof v === 'number' ? v : String(v).slice(0, 60); } x.push(o); }
    ev.push(x); dirty = true;
  }

  /* case study: sections in order, read at the line 40% down the viewport */
  var secs = page === 'case' ? [].slice.call(D.querySelectorAll('header.hero, section.s[id], footer')) : [];
  var secId = function (el) { return el.id || (el.tagName === 'FOOTER' ? 'end' : 'intro'); };
  function curSec() {
    var y = innerHeight * 0.4, c = -1;
    for (var i = 0; i < secs.length; i++) if (secs[i].getBoundingClientRect().top <= y) c = i;
    return c;
  }
  function measure() {
    var h = D.documentElement, d = Math.round((scrollY + innerHeight) / Math.max(1, h.scrollHeight) * 100);
    if (d > maxDepth) { maxDepth = Math.min(100, d); dirty = true; }
    if (secs.length) { var c = curSec(); if (c > reach) { reach = c; dirty = true; if (c >= 0) addEv('reach', { s: secId(secs[c]) }); } }
  }

  /* prototype: views come from the page (fwTrack('view', ...)); time is credited to the open view */
  function openView(name, p) {
    if (cur && cur.v === name && cur.k === (p && (p.id || p.cat)) ) return;
    cur = { v: name, k: p && (p.id || p.cat) };
    if (views.length < 80) views.push([name, since(), (p && (p.id || p.cat)) || '']);
    dirty = true;
  }

  /* engaged-time heartbeat: counts only while the tab is visible and someone touched it in the last 30s */
  setInterval(function () {
    if (!(vis && now() - lastInput < 30000)) return;
    act++; dirty = true;
    if (secs.length) { var c = curSec(); if (c >= 0) { var id = secId(secs[c]); secDwell[id] = (secDwell[id] || 0) + 1; } }
    if (cur) vsec[cur.v] = (vsec[cur.v] || 0) + 1;
    if (act % 15 === 0) touch();
    measure();
  }, 1000);
  ['scroll', 'mousemove', 'keydown', 'touchstart', 'pointerdown', 'wheel'].forEach(function (t) { addEventListener(t, function () { lastInput = now(); }, { passive: true, capture: true }); });
  addEventListener('scroll', measure, { passive: true });
  setTimeout(measure, 700);

  /* every tap on anything tappable, labelled by its text / aria-label, scoped to the page or prototype view */
  function slug(t) { return String(t || '').toLowerCase().replace(/[^a-z0-9₹%]+/g, ' ').trim().replace(/\s+/g, ' ').slice(0, 34); }
  function tapLabel(el) {
    for (var node = el, hops = 0; node && node.nodeType === 1 && hops < 6; node = node.parentNode, hops++) {
      var tag = node.tagName;
      if (/^(A|BUTTON|SUMMARY|SELECT|INPUT|LABEL)$/.test(tag) || /^(button|tab|link|menuitem)$/.test(node.getAttribute('role') || '') || getComputedStyle(node).cursor === 'pointer') {
        var raw = node.getAttribute('data-track') || node.getAttribute('aria-label') || node.getAttribute('title') || (node.innerText || node.textContent || '').trim().split('\n')[0] || (node.getAttribute('class') || '').split(' ')[0] || tag;
        return slug(raw) || slug(tag);
      }
    }
    return null;
  }
  D.addEventListener('click', function (e) {
    lastInput = now();
    var l = e.target && e.target.nodeType === 1 ? tapLabel(e.target) : null;
    if (l) {
      var k = (cur ? cur.v : page === 'case' ? (secs.length && reach >= 0 ? secId(secs[Math.max(0, curSec())]) : 'case') : 'proto') + ' · ' + l;
      if (k in taps || tapKeys < 120) { if (!(k in taps)) tapKeys++; taps[k] = (taps[k] || 0) + 1; dirty = true; }
    }
    var a = e.target.closest && e.target.closest('a[href]');
    if (a) {
      var href = a.getAttribute('href') || '';
      if (/prototype\.html/.test(href)) addEv('open_prototype', { to: href.split('#')[1] || 'home', from: page === 'case' && reach >= 0 ? secId(secs[Math.max(0, curSec())]) : page });
      else if (/^https?:/.test(href) && a.hostname !== L.hostname) addEv('outbound', { host: a.hostname });
      else if (/^#/.test(href) && page === 'case') addEv('nav', { to: href.slice(1) });
    }
    soon();
  }, true);

  /* page speed, read once the page has settled */
  try {
    new PerformanceObserver(function (l) { var e = l.getEntries(); if (e.length) perf.lcp = Math.round(e[e.length - 1].startTime); }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) { }
  addEventListener('load', function () {
    setTimeout(function () {
      try { var n = performance.getEntriesByType('navigation')[0]; if (n) { perf.ttfb = Math.round(n.responseStart); perf.load = Math.round(n.loadEventStart || n.domComplete); } } catch (e) { }
      dirty = true; send(false);
    }, 1200);
  });

  /* ---------- send ---------- */
  var sendT;
  function soon() { clearTimeout(sendT); sendT = setTimeout(function () { send(false); }, 3500); }
  function record() {
    var c = null;
    try { var nc = navigator.connection; if (nc) c = nc.effectiveType || null; } catch (e) { }
    return {
      v: 1, sid: sid, vid: vid, ctx: ctx, page: page, emb: EMB ? 1 : 0, t0: t0, t1: now(), here: here,
      ses: { s0: s0, n: sn, first: first, ret: returning ? 1 : 0, newSes: newSession ? 1 : 0 },
      src: src, ft: ft,
      dev: { vw: innerWidth, vh: innerHeight, dpr: Math.round((W.devicePixelRatio || 1) * 10) / 10, lang: (navigator.language || '').slice(0, 12), tz: (Intl.DateTimeFormat().resolvedOptions().timeZone || '').slice(0, 40), dark: W.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 1 : 0, touch: navigator.maxTouchPoints > 0 ? 1 : 0, conn: c },
      eng: { act: act, wall: since(), depth: maxDepth, reach: reach >= 0 && secs[reach] ? secId(secs[reach]) : '', sec: secDwell },
      views: views, vsec: vsec, ev: ev, taps: taps, perf: perf
    };
  }
  function send(beacon) {
    var body = record(), sig = JSON.stringify([body.eng, body.views.length, body.ev.length, body.taps, body.vsec, body.perf]);
    if (sig === lastSent) return;
    lastSent = sig; dirty = false;
    var payload = JSON.stringify(body);
    if (debug) console.log('[fw-track]', body);
    if (beacon && navigator.sendBeacon && navigator.sendBeacon('/api/hit', new Blob([payload], { type: 'application/json' }))) return;
    fetch('/api/hit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: payload.length < 60000 }).catch(function () { });
  }
  D.addEventListener('visibilitychange', function () {
    if (D.hidden) { vis = false; touch(); send(true); } else { vis = true; lastInput = now(); }
  });
  addEventListener('pagehide', function () { touch(); send(true); });
  setInterval(function () { if (dirty && vis) send(false); }, 30000);

  /* ---------- page API ---------- */
  W.fwTrack = function (name, p) {
    if (name === 'view') { openView(p && p.v || 'home', p); soon(); return; }
    addEv(name, p); soon();
    if (/^(reserve_done|buy_now|add_to_cart)$/.test(name)) send(false);
  };

  /* ---------- prototype: observed from the outside, so the product's own code stays untouched ----------
     app.js is a classic script, so its top-level functions live on window and its state S is a shared global.
     This runs once app.js has booted (parser scripts finish before DOMContentLoaded). */
  if (page === 'proto') D.addEventListener('DOMContentLoaded', function () {
    var T = W.fwTrack;
    function st() { try { return S; } catch (e) { return {}; } }
    function vt() { try { return vtype; } catch (e) { return ''; } }
    function val(sel) { var el = D.querySelector(sel); return el ? String(el.value || '').trim() : ''; }
    function view() { var s = st(); if (s.view) T('view', { v: s.view, id: s.view === 'pdp' ? s.pdp : s.view === 'plp' ? s.cat : '' }); }
    function before(name, fn) {
      var f = W[name]; if (typeof f !== 'function') return;
      W[name] = function () { try { fn.apply(null, arguments); } catch (e) { } return f.apply(this, arguments); };
    }
    var go0 = W.go;
    if (typeof go0 === 'function') W.go = function () { var r = go0.apply(this, arguments); try { view(); } catch (e) { } return r; };
    view();
    before('addToCart', function (p, n) { T('add_to_cart', { id: p && p.id, n: n || 1, from: st().view }); });
    before('findVehicle', function () { var raw = val('#plateIn').replace(/\s/g, ''); T('plate_lookup', { type: vt(), ok: raw.length >= (vt() === 'excavator' ? 5 : 8) ? 1 : 0 }); });
    before('doCmd', function (a) { T('search', { pick: String(a).split(':')[0], q: val('#cmdIn').slice(0, 50) }); });
    before('openCopilot', function (q) { T('copilot_open', { on: st().view, preset: q ? 1 : 0 }); });
    before('runAI', function (q) { T('ai_ask', { q: String(q || '').slice(0, 60), on: st().view }); });
    before('openReserve', function (p) { T('reserve_open', { id: p && p.id }); });

    // controls handled inside app.js closures: read them on the way down, before the app sees the click
    D.addEventListener('click', function (e) {
      var t = e.target; if (!t || !t.closest) return;
      var s = st(), el;
      if ((el = t.closest('[data-wish]'))) T('wishlist', { id: el.dataset.wish });
      else if ((el = t.closest('[data-veh]'))) T('vehicle_switch', { to: el.dataset.veh });
      else if (t.closest('#findBtn2')) T('model_lookup', { type: vt() });
      else if ((el = t.closest('#logos [data-brand]'))) T('brand_pick', { brand: el.dataset.brand, type: vt() });
      else if ((el = t.closest('#vhots .hdot'))) T('part_marker', { at: el.getAttribute('aria-label') || '' });
      else if ((el = t.closest('.code[data-code]'))) T('coupon_copy', { code: el.dataset.code });
      else if ((el = t.closest('.fo[data-fk]'))) T('filter', { k: el.dataset.fk, v: el.dataset.fv });
      else if ((el = t.closest('[data-cmp]'))) T('compare', { id: el.dataset.cmp });
      else if (t.closest('#mainCta')) T('main_cta', { mode: s.ful, id: s.pdp });
    }, true);

    // a finished reservation shows the #done panel
    var seen = [];
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var n = list[i].target;
        if (n.id === 'done' && n.classList.contains('on') && seen.indexOf(n) < 0) { seen.push(n); T('reserve_done', { id: st().pdp, store: st().store }); }
      }
    }).observe(D.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
  });
})();
