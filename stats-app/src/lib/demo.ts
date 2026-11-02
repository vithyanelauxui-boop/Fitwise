// Synthetic visits for previewing the dashboard locally (dev only: open /track/?demo with `pnpm dev`).
import type { Rec } from './data'
import catalog from './catalog.json'

const PRODUCTS = Object.entries((catalog as { products: Record<string, { cat: string }> }).products)
const SECS = ['intro', 'brief', 'industry', 'market', 'users', 'journeys', 'principles', 'ia', 'search', 'screens', 'system', 'metrics', 'next', 'end']
const PLACES = [
  ['IN', 'KA', 'Bengaluru', '560034', 12.93, 77.62], ['IN', 'KA', 'Bengaluru', '560102', 12.91, 77.64], ['IN', 'KA', 'Bengaluru', '560066', 12.97, 77.75],
  ['IN', 'TN', 'Chennai', '600017', 13.04, 80.23], ['IN', 'TN', 'Coimbatore', '641004', 11.03, 77.0], ['IN', 'MH', 'Mumbai', '400050', 19.06, 72.83],
  ['IN', 'MH', 'Pune', '411057', 18.59, 73.74], ['IN', 'DL', 'Delhi', '110016', 28.55, 77.2], ['IN', 'TG', 'Hyderabad', '500081', 17.45, 78.38],
  ['IN', 'HR', 'Gurugram', '122002', 28.47, 77.08], ['AE', 'DU', 'Dubai', '', 25.2, 55.27], ['US', 'CA', 'San Francisco', '94103', 37.77, -122.41],
] as const
const SOURCES: [string, Record<string, string>, string][] = [
  ['www.linkedin.com', {}, 'LinkedIn'], ['', {}, 'LinkedIn'], ['', { source: 'linkedin', medium: 'social', campaign: 'portfolio', content: 'featured' }, 'Chrome'],
  ['', {}, 'WhatsApp'], ['', {}, 'Chrome'], ['www.google.com', {}, 'Chrome'], ['mail.google.com', {}, 'Chrome'],
  ['', { source: 'resume', medium: 'pdf', campaign: 'job_apply' }, 'Safari'], ['app.slack.com', {}, 'Chrome'], ['x.com', {}, 'Safari'],
]
const DEVICES = [['Desktop', 'macOS', 1440], ['Desktop', 'Windows', 1536], ['Mobile', 'iOS', 390], ['Mobile', 'Android', 412], ['Tablet', 'iPadOS', 820]] as const

export function demoRecords(): Rec[] {
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)]
  const now = Date.now(), out: Rec[] = []
  const visitors = Array.from({ length: 70 }, (_, i) => ({ vid: `v${i}`, place: pick(PLACES), src: pick(SOURCES), dev: pick(DEVICES), n: 0, first: 0 }))
  for (let i = 0; i < 190; i++) {
    const v = pick(visitors), s0 = now - Math.floor(rnd() ** 1.4 * 60 * 864e5) - Math.floor(rnd() * 3600e3)
    v.n++; if (!v.first || s0 < v.first) v.first = s0
    const sid = `s${i}`, [country, region, city, postal, lat, lon] = v.place, [device, os, vw] = v.dev, [rh, utm, browser] = v.n > 1 && rnd() < 0.6 ? ['', {}, v.src[2]] as typeof v.src : v.src
    const bounce = rnd() < 0.24, reach = bounce ? 0 : Math.min(13, Math.floor(rnd() ** 0.8 * 14)), act = bounce ? Math.floor(rnd() * 8) : 20 + Math.floor(rnd() * 420)
    const sec: Record<string, number> = {}; for (let k = 0; k <= reach; k++) sec[SECS[k]] = 3 + Math.floor(rnd() * 50)
    const base = {
      sid, vid: v.vid, emb: 0 as const, at: s0, here: '/',
      ses: { s0, n: v.n, first: v.first, ret: (v.n > 1 ? 1 : 0) as 0 | 1, newSes: 1 as const },
      src: { ref: rh ? `https://${rh}/` : '', rh, utm, clid: rnd() < 0.04 ? 'gclid' : '', land: '/' },
      ft: { rh: v.src[0], utm: v.src[1], t: v.first },
      dev: { vw, vh: 800, dpr: 2, lang: pick(['en-IN', 'en-IN', 'en-US', 'en-GB']), tz: 'Asia/Kolkata', dark: (rnd() < 0.3 ? 1 : 0) as 0 | 1, touch: (device === 'Desktop' ? 0 : 1) as 0 | 1, conn: pick(['4g', '4g', 'wifi', '3g']) },
      perf: { ttfb: 120 + Math.floor(rnd() * 500), load: 900 + Math.floor(rnd() * 2000), lcp: (device === 'Mobile' ? 1800 : 900) + Math.floor(rnd() * 2400) },
      geo: { country, region, city, postal, lat, lon, tz: 'Asia/Kolkata' }, ua: { device, os, browser },
    }
    const ev: Rec['ev'] = SECS.slice(0, reach + 1).map((s, k) => ['reach', k * 12, { s }])
    const caseTaps: Record<string, number> = {}
    if (rnd() < 0.3) { const to = pick(SECS.slice(2, 12)); ev.push(['nav', 8, { to }]); caseTaps[`intro · ${to}`] = 1 }
    const proto = !bounce && rnd() < 0.55
    if (proto) ev.push(['open_prototype', Math.min(act, 60), { to: pick(['home', 'home', 'plp', 'pdp']), from: SECS[Math.max(0, reach - 1)] }]), caseTaps[`${SECS[Math.max(0, reach - 1)]} · open the prototype`] = 1
    out.push({ ...base, ctx: 'c-demo', page: 'case', t0: s0, t1: s0 + act * 1300, eng: { act, wall: act * 1.3, depth: Math.round(((reach + 1) / 14) * 100), reach: SECS[reach], sec }, views: [], vsec: {}, ev, taps: caseTaps })
    if (proto) {
      const t0 = s0 + 60e3, views: Rec['views'] = [['home', 0, '']], pev: Rec['ev'] = [], taps: Record<string, number> = { 'home · front brake discs': 1 }
      const [pid, p] = pick(PRODUCTS)
      if (rnd() < 0.75) { views.push(['plp', 14, p.cat]); taps[`plp · ${pick(['sort', 'in stock', 'brembo', 'under ₹5000'])}`] = 1 + Math.floor(rnd() * 3) }
      if (rnd() < 0.6) pev.push(['plate_lookup', 6, { type: pick(['car', 'car', 'tractor', 'truck']), ok: 1 }])
      if (rnd() < 0.35) pev.push(['search', 9, { pick: 'yes', q: pick(['brake disc creta', 'tyres for 575 di', 'jcb tracks', 'brembo']) }])
      if (rnd() < 0.3) pev.push(['ai_ask', 20, { q: pick(['which disc is best for highway use?', 'is this genuine?', 'cheapest tyre for tractor']), on: 'pdp' }])
      if (rnd() < 0.2) pev.push(['filter', 18, { k: 'brand', v: pick(['Brembo', 'Bosch', 'MRF']) }])
      if (rnd() < 0.15) pev.push(['coupon_copy', 30, { code: 'FIT10' }])
      if (views.length > 1 && rnd() < 0.7) {
        views.push(['pdp', 40, pid]); taps[`pdp · ${pick(['add to cart', 'reserve at store', 'specs', 'compatibility'])}`] = 1 + Math.floor(rnd() * 2)
        if (rnd() < 0.3) pev.push(['part_marker', 44, { at: 'Front disc: brakes' }])
        if (rnd() < 0.35) pev.push(['add_to_cart', 60, { id: pid }])
        if (rnd() < 0.3) { pev.push(['reserve_open', 70, { id: pid }]); if (rnd() < 0.55) pev.push(['reserve_done', 90, { id: pid, store: 'Koramangala' }]) }
      }
      const pact = 30 + Math.floor(rnd() * 240), vsec: Record<string, number> = {}
      views.forEach(([vv], k) => { vsec[vv] = (vsec[vv] || 0) + Math.round(pact / views.length) + k })
      out.push({ ...base, ctx: 'p-demo', page: 'proto', here: '/prototype.html', t0, t1: t0 + pact * 1200, eng: { act: pact, wall: pact * 1.2, depth: 0, reach: '', sec: {} }, views, vsec, ev: pev, taps })
    }
  }
  return out
}
