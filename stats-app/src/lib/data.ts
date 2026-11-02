/* Turns raw page-context records from /api/stats into sessions and visitors, and computes every metric the dashboard shows.
   A session (sid) can have several records: the case study, a full prototype tab, and each embedded prototype frame. */

export type Rec = {
  sid: string; vid: string; ctx: string; page: 'case' | 'proto'; emb: 0 | 1; t0: number; t1: number; at: number; here: string
  ses: { s0: number; n: number; first: number; ret: 0 | 1; newSes: 0 | 1 }
  src: { ref: string; rh: string; utm: Record<string, string>; clid: string; land: string }
  ft: { rh: string; utm: Record<string, string>; t: number }
  dev: { vw: number; vh: number; dpr: number; lang: string; tz: string; dark: 0 | 1; touch: 0 | 1; conn: string }
  eng: { act: number; wall: number; depth: number; reach: string; sec: Record<string, number> }
  views: [string, number, string][]; vsec: Record<string, number>
  ev: [string, number, Record<string, string | number>?][]; taps: Record<string, number>
  perf: { ttfb: number; load: number; lcp: number }
  geo: { country: string; region: string; city: string; postal: string; lat: number | null; lon: number | null; tz: string }
  ua: { device: string; os: string; browser: string }
}

export type Ev = { name: string; at: number; where: 'Case study' | 'Prototype' | 'Embedded prototype'; p: Record<string, string | number> }
export type Session = {
  sid: string; vid: string; start: number; end: number; day: string; hourIST: number; dowIST: number
  n: number; returning: boolean; firstSeen: number
  channel: string; group: string; refHost: string; utm: Record<string, string>; clid: string; landing: string; ftChannel: string
  country: string; region: string; regionName: string; city: string; postal: string; lat: number | null; lon: number | null
  device: string; os: string; browser: string; vw: number; screen: string; lang: string; conn: string; dark: boolean
  engaged: number; wall: number; caseEngaged: number; protoEngaged: number
  depth: number; reachIdx: number; reach: string; secDwell: Record<string, number>
  readCase: boolean; openedProto: boolean; protoUsed: boolean; embedUsed: boolean
  views: { v: string; at: number; k: string }[]; vsec: Record<string, number>
  pdps: string[]; cats: string[]
  events: Ev[]; taps: Record<string, number>; tapCount: number
  addToCart: boolean; reserveOpen: boolean; reserveDone: boolean; buyNow: boolean; converted: boolean
  bounce: boolean; exit: string
  lcp: number | null; ttfb: number | null
  live: boolean
}

export const SECTIONS: { id: string; label: string }[] = [
  { id: 'intro', label: 'Opening' }, { id: 'brief', label: 'The brief' }, { id: 'industry', label: 'Industry' }, { id: 'market', label: 'Market scan' },
  { id: 'users', label: 'Users' }, { id: 'journeys', label: 'Journeys' }, { id: 'principles', label: 'Principles' }, { id: 'ia', label: 'Information architecture' },
  { id: 'search', label: 'Search and AI' }, { id: 'screens', label: 'Screens' }, { id: 'system', label: 'Design system' }, { id: 'metrics', label: 'Metrics' },
  { id: 'next', label: 'Future scope' }, { id: 'end', label: 'Finished' },
]
const SEC_IDX: Record<string, number> = Object.fromEntries(SECTIONS.map((s, i) => [s.id, i]))
export const VIEW_LABEL: Record<string, string> = { home: 'Home', plp: 'Product list (PLP)', pdp: 'Product page (PDP)' }
export const EVENT_LABEL: Record<string, string> = {
  open_prototype: 'Opened the prototype', search: 'Searched', ai_ask: 'Asked Vroom (AI)', copilot_open: 'Opened Ask Vroom', plate_lookup: 'Looked up a number plate',
  model_lookup: 'Picked brand and model', brand_pick: 'Picked a car brand', vehicle_switch: 'Switched vehicle', filter: 'Used a filter', compare: 'Compared products',
  wishlist: 'Saved to wishlist', coupon_copy: 'Copied a coupon', part_marker: 'Opened a part marker', add_to_cart: 'Added to cart', main_cta: 'Pressed the main buy button',
  reserve_open: 'Opened reserve at store', reserve_done: 'Completed a reservation', outbound: 'Left for another site', nav: 'Used the case study menu', reach: 'Reached a section',
}

const REGIONS: Record<string, Record<string, string>> = {
  IN: { AN: 'Andaman and Nicobar', AP: 'Andhra Pradesh', AR: 'Arunachal Pradesh', AS: 'Assam', BR: 'Bihar', CH: 'Chandigarh', CT: 'Chhattisgarh', CG: 'Chhattisgarh', DN: 'Dadra and Nagar Haveli', DD: 'Daman and Diu', DL: 'Delhi', GA: 'Goa', GJ: 'Gujarat', HR: 'Haryana', HP: 'Himachal Pradesh', JK: 'Jammu and Kashmir', JH: 'Jharkhand', KA: 'Karnataka', KL: 'Kerala', LA: 'Ladakh', LD: 'Lakshadweep', MP: 'Madhya Pradesh', MH: 'Maharashtra', MN: 'Manipur', ML: 'Meghalaya', MZ: 'Mizoram', NL: 'Nagaland', OR: 'Odisha', OD: 'Odisha', PY: 'Puducherry', PB: 'Punjab', RJ: 'Rajasthan', SK: 'Sikkim', TN: 'Tamil Nadu', TG: 'Telangana', TS: 'Telangana', TR: 'Tripura', UP: 'Uttar Pradesh', UT: 'Uttarakhand', UK: 'Uttarakhand', WB: 'West Bengal' },
  AE: { DU: 'Dubai', AZ: 'Abu Dhabi', SH: 'Sharjah', AJ: 'Ajman' },
  US: { CA: 'California', NY: 'New York', TX: 'Texas', WA: 'Washington', NJ: 'New Jersey', IL: 'Illinois', MA: 'Massachusetts' },
}
export const COUNTRY: Record<string, string> = { IN: 'India', AE: 'UAE', US: 'United States', GB: 'United Kingdom', SG: 'Singapore', CA: 'Canada', AU: 'Australia', DE: 'Germany', NL: 'Netherlands', IE: 'Ireland', SA: 'Saudi Arabia', QA: 'Qatar' }
export const flag = (cc: string) => /^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 127397 + c.charCodeAt(0))) : '🏳️'

const IST = 19800000
export const istDay = (ms: number) => new Date(ms + IST).toISOString().slice(0, 10)
export const fmtSecs = (s: number | null | undefined) => s == null || !Number.isFinite(s) ? '–' : s < 60 ? `${Math.round(s)}s` : s < 3600 ? `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, '0')}s` : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0)
export const median = (a: number[]) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
export const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0)

/* channel: UTM wins, then the referrer, then the in-app browser it was opened in */
export function channelOf(rh: string, utm: Record<string, string>, browser: string): [string, string] {
  const u = (utm.source || '').toLowerCase(), h = (rh || '').toLowerCase()
  const pick = (x: string) => {
    if (/linkedin|lnkd/.test(x)) return ['LinkedIn', 'Social']
    if (/whatsapp|wa\.me/.test(x)) return ['WhatsApp', 'Messaging']
    if (/instagram/.test(x)) return ['Instagram', 'Social']
    if (/facebook|fb\.com/.test(x)) return ['Facebook', 'Social']
    if (/^t\.co$|twitter|x\.com/.test(x)) return ['X (Twitter)', 'Social']
    if (/mail\.google|gmail/.test(x)) return ['Gmail', 'Email']
    if (/outlook|live\.com|office\.com/.test(x)) return ['Outlook', 'Email']
    if (/^email|newsletter/.test(x)) return ['Email', 'Email']
    if (/slack/.test(x)) return ['Slack', 'Messaging']
    if (/telegram|t\.me/.test(x)) return ['Telegram', 'Messaging']
    if (/teams\.microsoft|teams/.test(x)) return ['Microsoft Teams', 'Messaging']
    if (/google\./.test(x) || x === 'google') return ['Google Search', 'Search']
    if (/bing|duckduckgo|yahoo/.test(x)) return ['Other search', 'Search']
    if (/notion|figma|behance|dribbble|github|vercel|medium/.test(x)) return [x.replace(/^www\./, ''), 'Referral']
    return null
  }
  if (u) return (pick(u) as [string, string]) || [utm.source.charAt(0).toUpperCase() + utm.source.slice(1), 'Campaign']
  const byRef = pick(h); if (byRef) return byRef as [string, string]
  if (/LinkedIn/.test(browser)) return ['LinkedIn', 'Social']
  if (/WhatsApp/.test(browser)) return ['WhatsApp', 'Messaging']
  if (/Instagram/.test(browser)) return ['Instagram', 'Social']
  if (/Slack/.test(browser)) return ['Slack', 'Messaging']
  if (h) return [h.replace(/^www\./, ''), 'Referral']
  return ['Direct / unknown', 'Direct']
}

export function buildSessions(recs: Rec[], now: number): Session[] {
  const by = new Map<string, Rec[]>()
  for (const r of recs) { if (!r?.sid) continue; const a = by.get(r.sid) || []; a.push(r); by.set(r.sid, a) }
  const out: Session[] = []
  for (const [sid, rs] of by) {
    rs.sort((a, b) => a.t0 - b.t0)
    const top = rs.filter((r) => !r.emb), tops = top.length ? top : rs
    const lead = tops[0], geoRec = rs.find((r) => r.geo?.city) || lead
    const embUsed = rs.filter((r) => r.emb && (Object.keys(r.taps || {}).length || (r.ev || []).length))
    const protoTop = top.filter((r) => r.page === 'proto'), caseRecs = top.filter((r) => r.page === 'case')
    const start = Math.min(...rs.map((r) => r.ses?.s0 || r.t0)), end = Math.max(...rs.map((r) => r.t1 || r.at || r.t0))
    const [channel, group] = channelOf(lead.src?.rh, lead.src?.utm || {}, lead.ua?.browser || '')
    const [ftChannel] = channelOf(lead.ft?.rh, lead.ft?.utm || {}, '')

    const secDwell: Record<string, number> = {}; let reachIdx = -1, depth = 0
    for (const r of caseRecs) {
      for (const [k, v] of Object.entries(r.eng?.sec || {})) secDwell[k] = (secDwell[k] || 0) + v
      reachIdx = Math.max(reachIdx, SEC_IDX[r.eng?.reach] ?? -1); depth = Math.max(depth, r.eng?.depth || 0)
    }
    const views: Session['views'] = [], vsec: Record<string, number> = {}
    for (const r of [...protoTop, ...embUsed]) {
      for (const [v, at, k] of r.views || []) views.push({ v, at: r.t0 + at * 1000, k })
      for (const [k, v] of Object.entries(r.vsec || {})) vsec[k] = (vsec[k] || 0) + v
    }
    views.sort((a, b) => a.at - b.at)
    const events: Ev[] = []
    const taps: Record<string, number> = {}
    for (const r of rs) {
      const where: Ev['where'] = r.page === 'case' ? 'Case study' : r.emb ? 'Embedded prototype' : 'Prototype'
      for (const [name, sec, p] of r.ev || []) events.push({ name, at: r.t0 + sec * 1000, where, p: p || {} })
      const pre = r.page === 'case' ? 'Case study' : r.emb ? 'Embedded' : 'Prototype'
      for (const [k, n] of Object.entries(r.taps || {})) taps[`${pre} · ${k}`] = (taps[`${pre} · ${k}`] || 0) + n
    }
    events.sort((a, b) => a.at - b.at)
    const has = (n: string) => events.some((e) => e.name === n && (e.where !== 'Embedded prototype' || embUsed.length > 0))
    const tapCount = Object.values(taps).reduce((a, b) => a + b, 0)
    const caseEngaged = caseRecs.reduce((a, r) => a + (r.eng?.act || 0), 0)
    const protoEngaged = protoTop.reduce((a, r) => a + (r.eng?.act || 0), 0)
    const engaged = caseEngaged + protoEngaged
    const openedProto = protoTop.length > 0 || events.some((e) => e.name === 'open_prototype')
    const pdps = [...new Set(views.filter((v) => v.v === 'pdp' && v.k).map((v) => v.k))]
    const cats = [...new Set(views.filter((v) => v.v === 'plp' && v.k).map((v) => v.k))]
    const reserveDone = has('reserve_done'), addToCart = has('add_to_cart'), buyNow = events.some((e) => e.name === 'main_cta' && e.p?.mode === 'ship')
    const contexts = new Set(top.map((r) => r.page))
    const bounce = engaged < 10 && tapCount === 0 && contexts.size <= 1 && reachIdx <= 1 && views.length <= 1
    const exit = (() => {
      const lastTop = [...tops].sort((a, b) => b.t1 - a.t1)[0]
      if (lastTop?.page === 'proto') { const lv = [...(lastTop.views || [])].pop(); return lv ? `Prototype · ${VIEW_LABEL[lv[0]] || lv[0]}` : 'Prototype' }
      return reachIdx >= 0 ? `Case study · ${SECTIONS[reachIdx].label}` : 'Case study · Opening'
    })()
    const vw = lead.dev?.vw || 0, istD = new Date(start + IST)
    const lcpRec = tops.find((r) => r.perf?.lcp)
    out.push({
      sid, vid: lead.vid, start, end, day: istDay(start), hourIST: istD.getUTCHours(), dowIST: (istD.getUTCDay() + 6) % 7,
      n: Math.max(...rs.map((r) => r.ses?.n || 1)), returning: rs.some((r) => r.ses?.ret) && Math.max(...rs.map((r) => r.ses?.n || 1)) > 1, firstSeen: Math.min(...rs.map((r) => r.ses?.first || start)),
      channel, group, refHost: lead.src?.rh || '', utm: lead.src?.utm || {}, clid: lead.src?.clid || '', landing: lead.src?.land || lead.here || '/', ftChannel,
      country: geoRec.geo?.country || '', region: geoRec.geo?.region || '', regionName: REGIONS[geoRec.geo?.country]?.[geoRec.geo?.region] || geoRec.geo?.region || '',
      city: geoRec.geo?.city || '', postal: geoRec.geo?.postal || '', lat: geoRec.geo?.lat ?? null, lon: geoRec.geo?.lon ?? null,
      device: lead.ua?.device || 'Desktop', os: lead.ua?.os || 'Other', browser: lead.ua?.browser || 'Other', vw, screen: vw < 640 ? 'Phone (<640px)' : vw < 1100 ? 'Tablet / small laptop' : vw < 1500 ? 'Laptop (1100–1500px)' : 'Large desktop (1500px+)',
      lang: lead.dev?.lang || '', conn: lead.dev?.conn || '', dark: !!lead.dev?.dark,
      engaged, wall: Math.max(0, Math.round((end - start) / 1000)), caseEngaged, protoEngaged,
      depth, reachIdx, reach: reachIdx >= 0 ? SECTIONS[reachIdx].label : '–', secDwell,
      readCase: caseRecs.length > 0, openedProto, protoUsed: protoTop.length > 0 || embUsed.length > 0, embedUsed: embUsed.length > 0,
      views, vsec, pdps, cats, events, taps, tapCount,
      addToCart, reserveOpen: has('reserve_open'), reserveDone, buyNow, converted: reserveDone || addToCart || buyNow,
      bounce, exit, lcp: lcpRec ? lcpRec.perf.lcp : null, ttfb: lcpRec ? lcpRec.perf.ttfb : null,
      live: now - end < 5 * 60 * 1000,
    })
  }
  return out.sort((a, b) => b.start - a.start)
}

export function tally<T>(list: T[], fn: (v: T) => string | string[] | null | undefined) {
  const m = new Map<string, number>()
  for (const v of list) { const k = fn(v); if (k == null || k === '') continue; for (const x of Array.isArray(k) ? k : [k]) m.set(x, (m.get(x) || 0) + 1) }
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

/* one row per value of a dimension, with the PM's standard columns */
export type DimRow = { key: string; sessions: number; visitors: number; engaged: number; bounce: number; proto: number; conv: number }
export function byDim(list: Session[], fn: (s: Session) => string | null | undefined): DimRow[] {
  const g = new Map<string, Session[]>()
  for (const s of list) { const k = fn(s); if (!k) continue; const a = g.get(k) || []; a.push(s); g.set(k, a) }
  return [...g.entries()].map(([key, a]) => ({
    key, sessions: a.length, visitors: new Set(a.map((s) => s.vid)).size, engaged: Math.round(avg(a.map((s) => s.engaged))),
    bounce: pct(a.filter((s) => s.bounce).length, a.length), proto: pct(a.filter((s) => s.protoUsed).length, a.length), conv: pct(a.filter((s) => s.converted).length, a.length),
  })).sort((a, b) => b.sessions - a.sessions)
}

export function summary(list: Session[]) {
  const visitors = new Set(list.map((s) => s.vid))
  const byVisitor = new Map<string, number>(); for (const s of list) byVisitor.set(s.vid, (byVisitor.get(s.vid) || 0) + 1)
  return {
    sessions: list.length, visitors: visitors.size,
    engaged: avg(list.map((s) => s.engaged)), medianEngaged: median(list.map((s) => s.engaged)),
    bounce: pct(list.filter((s) => s.bounce).length, list.length),
    protoRate: pct(list.filter((s) => s.protoUsed).length, list.length),
    conv: pct(list.filter((s) => s.converted).length, list.length),
    returningVisitors: pct(new Set(list.filter((s) => s.n > 1 || (byVisitor.get(s.vid) || 0) > 1).map((s) => s.vid)).size, visitors.size),
    pagesPerSession: avg(list.map((s) => (s.readCase ? 1 : 0) + new Set(s.views.map((v) => v.v + v.k)).size)),
    readDepth: avg(list.filter((s) => s.readCase).map((s) => s.depth)),
  }
}

/* cohorts: visitors by the IST day they first came, and the share who came back N days later */
export function cohorts(all: Session[], maxDay = 7) {
  const vis = new Map<string, Set<string>>()
  const first = new Map<string, string>()
  for (const s of all) {
    const d = istDay(s.start); const set = vis.get(s.vid) || new Set(); set.add(d); vis.set(s.vid, set)
    const f = istDay(s.firstSeen || s.start); if (!first.has(s.vid) || f < first.get(s.vid)!) first.set(s.vid, f)
  }
  const rows = new Map<string, { size: number; back: number[] }>()
  for (const [vid, days] of vis) {
    const f = first.get(vid)!, r = rows.get(f) || { size: 0, back: Array(maxDay + 1).fill(0) }
    r.size++
    for (const d of days) { const k = Math.round((Date.parse(d) - Date.parse(f)) / 864e5); if (k >= 0 && k <= maxDay) r.back[k]++ }
    rows.set(f, r)
  }
  return [...rows.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([day, r]) => ({ day, size: r.size, back: r.back }))
}
