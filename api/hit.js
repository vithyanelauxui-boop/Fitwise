import { put } from '@vercel/blob';

// Collects one record per page context (case study, full prototype tab, each embedded prototype frame).
// The browser re-sends its whole record as it grows, so each write overwrites s/<session-day>/<sid>~<ctx>.json.
// The server adds location from Vercel's edge headers (country, state, city, PIN, rounded lat/long) and device facts
// from the user agent. No IP address is stored.
const str = (v, n = 60) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const num = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
const id = (v) => (/^[a-z0-9]{4,16}$/.test(String(v || '')) ? String(v) : '');
const dec = (v) => { try { return decodeURIComponent(v || ''); } catch { return v || ''; } };
const geo = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? Math.round(n * 100) / 100 : null; }; // ~1 km

function browserOf(ua) {
  if (/FBAN|FBAV|Instagram/i.test(ua)) return 'Instagram in-app';
  if (/LinkedInApp/i.test(ua)) return 'LinkedIn in-app';
  if (/WhatsApp/i.test(ua)) return 'WhatsApp in-app';
  if (/Slack/i.test(ua)) return 'Slack in-app';
  if (/GSA\//.test(ua)) return 'Google app';
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\//.test(ua)) return 'Opera';
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet';
  if (/Firefox|FxiOS/.test(ua)) return 'Firefox';
  if (/CriOS|Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Other';
}
const osOf = (ua) => /iPhone|iPad/.test(ua) ? 'iOS' : /Android/i.test(ua) ? 'Android' : /Mac OS/i.test(ua) ? 'macOS' : /Windows/i.test(ua) ? 'Windows' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/i.test(ua) ? 'Linux' : 'Other';
const deviceOf = (ua, vw) => /iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && vw && vw < 1100 && vw > 700) ? 'Tablet' : /Mobi|Android|iPhone/i.test(ua) ? 'Mobile' : 'Desktop';

function clean(b) {
  const o = (x) => (x && typeof x === 'object' && !Array.isArray(x) ? x : {});
  const ses = o(b.ses), src = o(b.src), ft = o(b.ft), dev = o(b.dev), eng = o(b.eng), perf = o(b.perf);
  const utm = (u) => { const r = {}; for (const k of ['source', 'medium', 'campaign', 'content', 'term']) if (o(u)[k]) r[k] = str(o(u)[k]); return r; };
  const map = (m, maxKeys, maxVal) => { const r = {}; let n = 0; for (const [k, v] of Object.entries(o(m))) { if (n++ >= maxKeys) break; r[str(k, 48)] = num(v, maxVal); } return r; };
  return {
    v: 1, sid: id(b.sid), vid: id(b.vid), ctx: /^[cpe]-[a-z0-9]{3,8}$/.test(b.ctx) ? b.ctx : 'x-0000', page: b.page === 'proto' ? 'proto' : 'case', emb: b.emb ? 1 : 0,
    t0: num(b.t0, 9e15), t1: num(b.t1, 9e15), here: str(b.here, 80),
    ses: { s0: num(ses.s0, 9e15), n: num(ses.n, 100000), first: num(ses.first, 9e15), ret: ses.ret ? 1 : 0, newSes: ses.newSes ? 1 : 0 },
    src: { ref: str(src.ref, 200), rh: str(src.rh, 80), utm: utm(src.utm), clid: str(src.clid, 12), land: str(src.land, 80) },
    ft: { rh: str(ft.rh, 80), utm: utm(ft.utm), t: num(ft.t, 9e15) },
    dev: { vw: num(dev.vw, 10000), vh: num(dev.vh, 10000), dpr: Math.min(5, Number(dev.dpr) || 1), lang: str(dev.lang, 12), tz: str(dev.tz, 40), dark: dev.dark ? 1 : 0, touch: dev.touch ? 1 : 0, conn: str(dev.conn, 8) },
    eng: { act: num(eng.act, 86400), wall: num(eng.wall, 86400), depth: num(eng.depth, 100), reach: str(eng.reach, 24), sec: map(eng.sec, 40, 86400) },
    views: (Array.isArray(b.views) ? b.views : []).slice(0, 80).map((x) => [str(x[0], 16), num(x[1], 86400), str(x[2], 24)]),
    vsec: map(b.vsec, 20, 86400),
    ev: (Array.isArray(b.ev) ? b.ev : []).slice(0, 180).map((x) => { const r = [str(x[0], 32), num(x[1], 86400)]; if (x[2] && typeof x[2] === 'object') { const p = {}; let n = 0; for (const [k, v] of Object.entries(x[2])) { if (n++ > 6) break; p[str(k, 16)] = typeof v === 'number' ? v : str(v); } r.push(p); } return r; }),
    taps: map(b.taps, 120, 100000),
    perf: { ttfb: num(perf.ttfb, 120000), load: num(perf.load, 120000), lcp: num(perf.lcp, 120000) },
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(204).end(); // storage not connected yet: stay silent
  const h = req.headers, ua = String(h['user-agent'] || '');
  if (/bot|crawl|spider|preview|headless|lighthouse|monitor|facebookexternalhit|slackbot|whatsapp\/|linkedinbot|embedly|vercel-screenshot/i.test(ua)) return res.status(204).end();
  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch { return res.status(204).end(); }
  try {
    const r = clean(body);
    if (!r.sid || !r.vid) return res.status(204).end();
    const start = r.ses.s0 || r.t0 || Date.now();
    if (Math.abs(Date.now() - start) > 3 * 864e5) return res.status(204).end(); // stale or forged clocks
    r.geo = {
      country: str(h['x-vercel-ip-country'], 4), region: str(h['x-vercel-ip-country-region'], 8), city: str(dec(h['x-vercel-ip-city']), 48),
      postal: str(h['x-vercel-ip-postal-code'], 12), lat: geo(h['x-vercel-ip-latitude']), lon: geo(h['x-vercel-ip-longitude']), tz: str(h['x-vercel-ip-timezone'], 40),
    };
    r.ua = { device: deviceOf(ua, r.dev.vw), os: osOf(ua), browser: browserOf(ua) };
    r.at = Date.now();
    const day = new Date(start + 19800000).toISOString().slice(0, 10); // IST calendar day of the session start
    await put(`s/${day}/${r.sid}~${r.ctx}.json`, JSON.stringify(r), { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
  } catch { /* analytics must never break the page */ }
  res.status(204).end();
}
