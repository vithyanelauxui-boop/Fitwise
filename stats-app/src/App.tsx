import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { BookOpen, ChevronRight, Fingerprint, Gauge, Link2, Lock as LockIcon, MapPin, RefreshCw, Repeat, Rows3, Smartphone } from 'lucide-react'
import { Lock, enableTouchId, hasLocalPasskey, post, touchIdSupported } from '@/Lock'
import { BarList, DataTable, Delta, Drawer, Empty, Funnel, HeatGrid, Kpi, Panel, Pick, PlaceMap, Seg, Trend, fmt, rampAt, type Col } from '@/ui'
import { COUNTRY, EVENT_LABEL, SECTIONS, VIEW_LABEL, avg, buildSessions, byDim, cohorts, flag, fmtSecs, median, pct, summary, tally, type DimRow, type Rec, type Session } from '@/lib/data'
import catalog from '@/lib/catalog.json'
import { VroomMark } from '@/lib/logo'

const CAT = catalog as { products: Record<string, { cat: string; name: string }>; categories: Record<string, string>; vehicles: Record<string, string> }
const prodName = (id: string) => CAT.products[id]?.name || id
const catName = (id: string) => CAT.categories[id] || id
const IST = 19800000
const ago = (ms: number, now: number) => { const s = Math.max(0, (now - ms) / 1000); return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)}m ago` : s < 86400 ? `${Math.floor(s / 3600)}h ago` : `${Math.floor(s / 86400)}d ago` }
const when = (ms: number) => new Date(ms).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
const delta = (a: number, b: number | null | undefined) => (b == null || !b ? null : Math.round(((a - b) / b) * 100))
type Tab = 'overview' | 'acq' | 'aud' | 'read' | 'proto' | 'ret' | 'sess'
const TABS: [Tab, string, string][] = [
  ['overview', 'Overview', 'The whole picture'], ['acq', 'Sources', 'Where people come from'], ['aud', 'Audience', 'Who and where they are'],
  ['read', 'Case study', 'What they read'], ['proto', 'Prototype', 'What they do in the app'], ['ret', 'Retention', 'Do they come back'], ['sess', 'Sessions', 'Every visit, one by one'],
]
const ICON: Record<Tab, typeof Gauge> = { overview: Gauge, acq: Link2, aud: MapPin, read: BookOpen, proto: Smartphone, ret: Repeat, sess: Rows3 }

function dimCols(first: string): Col<DimRow>[] {
  return [
    { key: 'key', label: first, get: (r) => r.key, show: (r) => <span className="font-medium">{r.key}</span> },
    { key: 'sessions', label: 'Sessions', align: 'right', get: (r) => r.sessions },
    { key: 'visitors', label: 'Visitors', align: 'right', get: (r) => r.visitors },
    { key: 'engaged', label: 'Avg time', align: 'right', get: (r) => r.engaged, show: (r) => fmtSecs(r.engaged) },
    { key: 'bounce', label: 'Bounce', align: 'right', get: (r) => r.bounce, show: (r) => `${r.bounce}%` },
    { key: 'proto', label: 'Used prototype', align: 'right', get: (r) => r.proto, show: (r) => `${r.proto}%` },
    { key: 'conv', label: 'Converted', align: 'right', get: (r) => r.conv, show: (r) => `${r.conv}%` },
  ]
}

export default function App() {
  const [raw, setRaw] = useState<{ now: number; records: Rec[] } | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'locked' | 'error'>('loading')
  const [range, setRange] = useState<'1' | '7' | '30' | '90'>('30')
  const [tab, setTab] = useState<Tab>('overview')
  const [fChan, setFChan] = useState(''), [fDev, setFDev] = useState(''), [fCity, setFCity] = useState('')
  const [open, setOpen] = useState<Session | null>(null)
  const [spin, setSpin] = useState(false)
  const [canTid, setCanTid] = useState(false), [tidMsg, setTidMsg] = useState('')
  const demo = import.meta.env.DEV && new URLSearchParams(location.search).has('demo')

  useEffect(() => { touchIdSupported().then((ok) => setCanTid(ok && !hasLocalPasskey())) }, [])
  async function addTouchId() { setTidMsg(''); try { await enableTouchId(); setCanTid(false); setTidMsg('Touch ID is on for this device.') } catch (e) { setTidMsg((e as Error).message === 'Cancelled' ? '' : (e as Error).message) } }

  const load = useCallback(async () => {
    setSpin(true)
    try {
      if (demo) { const { demoRecords } = await import('@/lib/demo'); setRaw({ now: Date.now(), records: demoRecords() }); setState('ok'); return }
      const r = await fetch(`/api/stats?days=${Math.min(180, +range * 2 + 1)}`, { cache: 'no-store' })
      if (r.status === 401) { setRaw(null); setState('locked'); return }
      if (!r.ok) throw new Error('error')
      setRaw(await r.json()); setState('ok')
    } catch { setState('error') } finally { setTimeout(() => setSpin(false), 400) }
  }, [range, demo])
  // every page load starts locked, exactly like YourDOST: end any old session first
  const stateRef = useRef(state); stateRef.current = state
  useEffect(() => {
    if (demo) { load(); return }
    const relock = () => { post('logout').finally(() => { setRaw(null); setState('locked') }) }
    relock()
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) relock() }
    addEventListener('pageshow', onShow)
    return () => removeEventListener('pageshow', onShow)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { if (stateRef.current === 'ok') load() }, [range, load])
  useEffect(() => { const t = setInterval(() => { if (document.visibilityState === 'visible' && stateRef.current === 'ok') load() }, 60000); return () => clearInterval(t) }, [load])

  const all = useMemo(() => (raw ? buildSessions(raw.records, raw.now) : []), [raw])
  const now = raw?.now || Date.now()
  const span = +range * 864e5
  const pass = useCallback((s: Session) => (!fChan || s.channel === fChan) && (!fDev || s.device === fDev) && (!fCity || s.city === fCity), [fChan, fDev, fCity])
  const cur = useMemo(() => all.filter((s) => s.start > now - span && pass(s)), [all, now, span, pass])
  const prev = useMemo(() => all.filter((s) => s.start <= now - span && s.start > now - 2 * span && pass(s)), [all, now, span, pass])
  const sm = useMemo(() => summary(cur), [cur]), pm = useMemo(() => summary(prev), [prev])
  const live = all.filter((s) => s.live)

  if (state === 'locked') return <Lock onUnlocked={() => { setState('loading'); load() }} />
  if (state === 'loading' || !raw) return <div className="grid h-dvh place-items-center text-sm text-muted-foreground">{state === 'error' ? 'Could not load the stats. Refresh to try again.' : 'Loading…'}</div>

  const filtersOn = fChan || fDev || fCity
  const [, title, about] = TABS.find((t) => t[0] === tab)!
  const period = `${{ '1': 'Last 24 hours', '7': 'Last 7 days', '30': 'Last 30 days', '90': 'Last 90 days' }[range]} · IST`
  const lock = () => { post('logout').finally(() => { setRaw(null); setState('locked') }) }
  const pickTab = (k: Tab) => { setTab(k); scrollTo({ top: 0 }) }
  return <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
    {/* ---------- sidebar (desktop) ---------- */}
    <aside className="sticky top-0 hidden h-dvh flex-col border-r px-3 pb-4 pt-5 lg:flex">
      <div className="flex items-center gap-2.5 px-3 pb-7"><VroomMark className="size-8 shrink-0" /><div className="leading-tight"><div className="text-[17px] font-bold tracking-[-0.04em]">Vroom</div><div className="text-[12px] text-muted-foreground">Analytics</div></div></div>
      <nav className="space-y-0.5" aria-label="Sections">{TABS.map(([k, l]) => { const Ic = ICON[k]; return <button key={k} type="button" onClick={() => pickTab(k)} aria-current={tab === k ? 'page' : undefined}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[14px] transition ${tab === k ? 'bg-card font-medium text-foreground shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_1px_2px_rgb(0_0_0/0.05)]' : 'text-muted-foreground hover:bg-black/[0.04] hover:text-foreground'}`}>
        <Ic className="size-4 shrink-0" strokeWidth={1.75} />{l}</button> })}</nav>
      <div className="mt-auto space-y-0.5">
        <div className="flex items-center gap-3 px-3 py-2 text-[13.5px]" title="Sessions active in the last 5 minutes"><span className={`size-2 rounded-full ${live.length ? 'animate-pulse bg-emerald-500' : 'bg-muted-foreground/40'}`} /><span><b className="font-semibold tabular-nums">{live.length}</b> <span className="text-muted-foreground">live now</span></span></div>
        {canTid && !demo && <button type="button" onClick={addTouchId} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] text-muted-foreground hover:bg-black/[0.04] hover:text-foreground"><Fingerprint className="size-4" strokeWidth={1.75} />Set up Touch ID</button>}
        {!demo && <button type="button" onClick={lock} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] text-muted-foreground hover:bg-black/[0.04] hover:text-foreground"><LockIcon className="size-4" strokeWidth={1.75} />Lock</button>}
      </div>
    </aside>

    <div className="min-w-0">
      {/* ---------- top bar ---------- */}
      <header className="sticky top-0 z-[500] border-b bg-background/85 backdrop-blur-md">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-8">
          <div className="flex min-w-0 items-center gap-2 lg:hidden"><VroomMark className="size-7 shrink-0" /><div className="leading-tight"><div className="text-[15px] font-bold tracking-[-0.04em]">Vroom</div><div className="text-[11.5px] text-muted-foreground">Analytics</div></div></div>
          <div className="hidden min-w-0 leading-tight lg:block">
            <div className="truncate text-[17px] font-semibold tracking-tight">{title}</div>
            <div className="truncate text-[12.5px] text-muted-foreground">{about}</div>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-1.5 text-[13px] sm:inline-flex lg:hidden"><span className={`size-2 rounded-full ${live.length ? 'animate-pulse bg-emerald-500' : 'bg-muted-foreground/40'}`} />{live.length} live</span>
            <Seg value={range} onChange={setRange} options={[['1', '24h'], ['7', '7d'], ['30', '30d'], ['90', '90d']]} />
            <button type="button" onClick={load} aria-label="Refresh" className="grid size-9 place-items-center rounded-full bg-card shadow-[0_0_0_1px_rgb(0_0_0/0.08)] hover:bg-muted"><RefreshCw className={`size-4 ${spin ? 'animate-spin' : ''}`} strokeWidth={1.75} /></button>
            {!demo && <button type="button" onClick={lock} aria-label="Lock" className="grid size-9 place-items-center rounded-full bg-card shadow-[0_0_0_1px_rgb(0_0_0/0.08)] hover:bg-muted lg:hidden"><LockIcon className="size-4" strokeWidth={1.75} /></button>}
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 [scrollbar-width:none] lg:hidden" aria-label="Sections">
          {TABS.map(([k, l]) => <button key={k} type="button" onClick={() => pickTab(k)} className={`relative whitespace-nowrap px-2.5 pb-2.5 pt-1 text-[14px] font-medium ${tab === k ? 'text-foreground' : 'text-muted-foreground'}`}>
            {l}{tab === k && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-foreground" />}</button>)}
        </nav>
      </header>

      <main className="mx-auto max-w-[1240px] space-y-5 px-4 py-6 sm:px-8">
        {tidMsg && <p className="rounded-xl bg-card px-4 py-2.5 text-sm shadow-[0_0_0_1px_rgb(0_0_0/0.06)]">{tidMsg}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-auto text-[13px] text-muted-foreground">{period}{filtersOn ? ' · filtered' : ''} · <b className="font-medium text-foreground tabular-nums">{fmt(cur.length)}</b> sessions</span>
          <Pick label="Source" value={fChan} onChange={setFChan} options={tally(all, (s) => s.channel).map((x) => x[0])} />
          <Pick label="Device" value={fDev} onChange={setFDev} options={tally(all, (s) => s.device).map((x) => x[0])} />
          <Pick label="City" value={fCity} onChange={setFCity} options={tally(all, (s) => s.city).map((x) => x[0])} />
          {filtersOn && <button type="button" onClick={() => { setFChan(''); setFDev(''); setFCity('') }} className="px-1 text-[13px] font-medium underline-offset-4 hover:underline">Clear</button>}
        </div>
        {!cur.length ? <Panel title="No visits in this period"><Empty>{all.length ? 'Try a longer range or clear the filters.' : 'Visits appear here a few seconds after someone opens the case study or the prototype. Your own visits are skipped if you open any page once with ?me.'}</Empty></Panel>
          : tab === 'overview' ? <Overview cur={cur} sm={sm} pm={pm} now={now} range={+range} onOpen={setOpen} onTab={pickTab} />
          : tab === 'acq' ? <Acquisition cur={cur} />
          : tab === 'aud' ? <Audience cur={cur} />
          : tab === 'read' ? <Reading cur={cur} />
          : tab === 'proto' ? <Prototype cur={cur} />
          : tab === 'ret' ? <Retention cur={cur} all={all.filter(pass)} />
          : <Sessions cur={cur} now={now} onOpen={setOpen} />}
        <p className="pb-6 pt-2 text-center text-[12px] leading-relaxed text-muted-foreground">Times in IST · location comes from the visitor's network and is approximate inside a city · no cookies or IP addresses stored · open any page once with ?me to exclude your own visits</p>
      </main>
    </div>
    <Drawer open={!!open} onClose={() => setOpen(null)} title={open && <SessionTitle s={open} />}>{open && <SessionDetail s={open} />}</Drawer>
  </div>
}

/* ================= Overview ================= */
function Overview({ cur, sm, pm, now, range, onOpen, onTab }: { cur: Session[]; sm: ReturnType<typeof summary>; pm: ReturnType<typeof summary>; now: number; range: number; onOpen: (s: Session) => void; onTab: (t: Tab) => void }) {
  const hourly = range === 1, step = hourly ? 3600000 : 864e5
  const floor = (ms: number) => Math.floor((ms + IST) / step) * step - IST
  const counts = new Map<number, number>(); for (const s of cur) counts.set(floor(s.start), (counts.get(floor(s.start)) || 0) + 1)
  const pts = []; for (let t = floor(now - range * 864e5 + step); t <= floor(now); t += step) pts.push({ key: String(t), n: counts.get(t) || 0, label: new Date(t).toLocaleString('en-IN', hourly ? { timeZone: 'Asia/Kolkata', hour: 'numeric' } : { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' }) })
  const n = cur.length, prevLabel = range === 1 ? 'the 24 hours before' : `the ${range} days before`
  const side: [string, string, number | null, boolean, string][] = [
    ['Visitors', fmt(sm.visitors), delta(sm.visitors, pm.visitors), false, 'Unique browsers in this period'],
    ['Avg engaged time', fmtSecs(sm.engaged), delta(sm.engaged, pm.engaged), false, `Active time on screen; median ${fmtSecs(sm.medianEngaged)}`],
    ['Bounce rate', `${sm.bounce}%`, delta(sm.bounce, pm.bounce), true, 'Left within 10s without a tap or scrolling past the opening'],
    ['Used the prototype', `${sm.protoRate}%`, delta(sm.protoRate, pm.protoRate), false, 'Opened it, or tapped inside an embedded screen'],
    ['Conversion', `${sm.conv}%`, delta(sm.conv, pm.conv), false, 'Added to cart, bought, or reserved at a store'],
  ]
  return <>
    <section className="grid overflow-hidden rounded-2xl bg-card shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_1px_3px_rgb(0_0_0/0.04)] lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 p-5 sm:p-6">
        <div className="text-[13.5px] font-medium text-muted-foreground">Sessions</div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[44px] font-semibold leading-none tracking-tight">{fmt(n)}</span>
          <Delta d={delta(sm.sessions, pm.sessions)} /><span className="text-[13px] text-muted-foreground">vs {prevLabel}</span>
        </div>
        <p className="mt-2 text-[13px] text-muted-foreground">{sm.pagesPerSession.toFixed(1)} pages per session · {Math.round(sm.readDepth)}% average read depth</p>
        <div className="mt-6"><Trend points={pts} label="sessions" /></div>
      </div>
      <dl className="grid grid-cols-2 border-t lg:grid-cols-1 lg:border-l lg:border-t-0">{side.map(([l, v, d, inv, hint]) => <div key={l} className="flex flex-col items-start gap-2 border-b px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-3 last:col-span-2 last:border-b-0 odd:border-r lg:odd:border-r-0 lg:last:col-span-1" title={hint}>
        <div><dt className="text-[13px] text-muted-foreground">{l}</dt><dd className="mt-1.5 text-[22px] font-semibold leading-none tracking-tight">{v}</dd></div>
        <Delta d={d} invert={inv} />
      </div>)}</dl>
    </section>
    <Insights cur={cur} sm={sm} onTab={onTab} />
    <div className="grid gap-5 lg:grid-cols-5">
      <Panel className="lg:col-span-3" title="Journey funnel" sub="Of every session, how far people got">
        <Funnel steps={[
          { label: 'Landed', n },
          { label: 'Read past the brief, or opened the app', n: cur.filter((s) => s.reachIdx >= 2 || s.protoUsed).length },
          { label: 'Used the prototype', n: cur.filter((s) => s.protoUsed).length },
          { label: 'Viewed a product page', n: cur.filter((s) => s.views.some((v) => v.v === 'pdp')).length },
          { label: 'Added to cart or opened reserve', n: cur.filter((s) => s.addToCart || s.reserveOpen || s.buyNow).length },
          { label: 'Completed a reservation', n: cur.filter((s) => s.reserveDone).length },
        ]} />
      </Panel>
      <Panel className="lg:col-span-2" title="Top sources" sub="Where sessions came from" right={<More onClick={() => onTab('acq')} />}><BarList rows={tally(cur, (s) => s.channel)} limit={7} /></Panel>
    </div>
    <div className="grid gap-5 lg:grid-cols-5">
      <Panel className="lg:col-span-2" title="Top cities" sub="From the visitor's network" right={<More onClick={() => onTab('aud')} />}><BarList rows={tally(cur, (s) => s.city ? `${s.city}${s.regionName && s.regionName !== s.city ? `, ${s.regionName}` : ''}` : null)} limit={7} /></Panel>
      <Panel className="lg:col-span-3" title="Latest sessions" sub="Tap one to see everything they did" right={<More onClick={() => onTab('sess')} />}>
        <ul className="-mx-2">{cur.slice(0, 7).map((s) => <li key={s.sid}><button type="button" onClick={() => onOpen(s)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-muted">
          <span className="text-[18px] leading-none">{flag(s.country)}</span>
          <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-medium">{s.city || 'Unknown city'} · {s.channel}</span>
            <span className="block truncate text-[12.5px] text-muted-foreground">{s.device} · {fmtSecs(s.engaged)} · {s.readCase ? `read to ${s.reach}` : 'prototype only'}</span></span>
          <Outcome s={s} />
          <span className="w-16 shrink-0 text-right text-[12px] text-muted-foreground">{s.live ? <span className="font-medium text-emerald-600">live</span> : ago(s.end, now)}</span>
        </button></li>)}</ul>
      </Panel>
    </div>
  </>
}
const More = ({ onClick }: { onClick: () => void }) => <button type="button" onClick={onClick} className="inline-flex items-center gap-0.5 font-medium text-foreground hover:underline underline-offset-4">See all<ChevronRight className="size-3.5" /></button>

/* the "so what": plain sentences computed from the same numbers, each linking to the tab that explains it */
function Insights({ cur, sm, onTab }: { cur: Session[]; sm: ReturnType<typeof summary>; onTab: (t: Tab) => void }) {
  const n = cur.length, out: { tab: Tab; text: ReactNode }[] = []
  if (n >= 3) {
    const ch = byDim(cur, (s) => s.channel).sort((a, b) => b.sessions - a.sessions)
    if (ch[0]) out.push({ tab: 'acq', text: <><b>{ch[0].key}</b> brings the most visits: <b>{Math.round(pct(ch[0].sessions, n))}%</b> of sessions.</> })
    const best = ch.filter((r) => r.sessions >= Math.max(3, n * 0.05) && r.key !== ch[0]?.key).sort((a, b) => b.conv - a.conv || b.engaged - a.engaged)[0]
    if (best && best.conv > sm.conv) out.push({ tab: 'acq', text: <><b>{best.key}</b> visitors convert best: <b>{best.conv}%</b> against {sm.conv}% overall.</> })
    const readers = cur.filter((s) => s.readCase)
    if (readers.length >= 3) {
      const reached = SECTIONS.map((_, i) => readers.filter((s) => s.reachIdx >= i).length)
      let bi = 1, bd = -1; for (let i = 1; i < reached.length; i++) if (reached[i - 1] - reached[i] > bd) { bd = reached[i - 1] - reached[i]; bi = i }
      out.push({ tab: 'read', text: <>The biggest drop in the case study comes after <b>{SECTIONS[bi - 1].label}</b>: <b>{Math.round(pct(bd, readers.length))}%</b> of readers stop there.</> })
    }
    const pdp = cur.filter((s) => s.views.some((v) => v.v === 'pdp')), acted = pdp.filter((s) => s.addToCart || s.reserveOpen || s.buyNow)
    if (pdp.length >= 3) out.push({ tab: 'proto', text: <><b>{Math.round(pct(pdp.length - acted.length, pdp.length))}%</b> of people who open a product page leave without adding to cart or reserving.</> })
    const mob = cur.filter((s) => s.device === 'Mobile'), desk = cur.filter((s) => s.device === 'Desktop')
    if (mob.length >= 3 && desk.length >= 3) out.push({ tab: 'aud', text: <><b>{Math.round(pct(mob.length, n))}%</b> of visits are on mobile, staying <b>{fmtSecs(avg(mob.map((s) => s.engaged)))}</b> against {fmtSecs(avg(desk.map((s) => s.engaged)))} on desktop.</> })
    const city = tally(cur, (s) => s.city || null)[0]
    if (city) out.push({ tab: 'aud', text: <><b>{city[0]}</b> is the top city, with <b>{Math.round(pct(city[1], n))}%</b> of sessions.</> })
  }
  if (!out.length) return null
  return <Panel title="What stands out" sub="Worked out from this period's numbers">
    <ul className="-mx-2 grid gap-x-6 md:grid-cols-2">{out.slice(0, 6).map((x, i) => { const Ic = ICON[x.tab]; return <li key={i}>
      <button type="button" onClick={() => onTab(x.tab)} className="group flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-muted">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#eaf2fc] text-[#1c5cab]"><Ic className="size-4" strokeWidth={2} /></span>
        <span className="min-w-0 flex-1 pt-1 text-[13.5px] leading-snug text-foreground/80 [&_b]:font-semibold [&_b]:text-foreground">{x.text}</span>
        <ChevronRight className="mt-2 size-4 shrink-0 text-muted-foreground/50 transition group-hover:translate-x-0.5 group-hover:text-foreground" />
      </button></li> })}</ul>
  </Panel>
}

/* ================= Acquisition ================= */
function Acquisition({ cur }: { cur: Session[] }) {
  type U = DimRow & { s: string; m: string; c: string; ct: string; t: string }
  const utmRows: U[] = byDim(cur.filter((s) => Object.keys(s.utm).length), (s) => [s.utm.source, s.utm.medium, s.utm.campaign, s.utm.content, s.utm.term].map((x) => x || '–').join('|'))
    .map((r) => { const [s, m, c, ct, t] = r.key.split('|'); return { ...r, s, m, c, ct, t } })
  const tagged = pct(cur.filter((s) => Object.keys(s.utm).length).length, cur.length)
  return <>
    <Panel title="Channels" sub="Each source with how well it engages and converts. UTM tags win over the referrer; in-app browsers (LinkedIn, WhatsApp, Slack) are recognised even when the referrer is hidden."><DataTable rows={byDim(cur, (s) => s.channel)} cols={dimCols('Channel')} initial="sessions" /></Panel>
    <div className="grid gap-5 lg:grid-cols-3">
      <Panel title="Channel type" sub="Social, messaging, email, search, referral, campaign or direct"><BarList rows={tally(cur, (s) => s.group)} /></Panel>
      <Panel title="Referring sites" sub="The exact site that sent them"><BarList rows={tally(cur, (s) => s.refHost || null)} empty="No referrer was sent (direct, apps, or private links)" /></Panel>
      <Panel title="Landing page" sub="The first page of the session"><BarList rows={tally(cur, (s) => s.landing.includes('prototype') ? `Prototype ${s.landing.split('#')[1] ? `· ${VIEW_LABEL[s.landing.split('#')[1]] || s.landing.split('#')[1]}` : ''}` : 'Case study')} /></Panel>
    </div>
    <Panel title="UTM campaigns" sub={`${tagged}% of sessions carried UTM tags. Add ?utm_source=…&utm_medium=…&utm_campaign=… to links you share to see them here.`}>
      <DataTable rows={utmRows} initial="sessions" empty="No tagged links used yet" cols={[
        { key: 's', label: 'Source', get: (r) => r.s, show: (r) => <span className="font-medium">{r.s}</span> }, { key: 'm', label: 'Medium', get: (r) => r.m }, { key: 'c', label: 'Campaign', get: (r) => r.c },
        { key: 'ct', label: 'Content', get: (r) => r.ct }, { key: 't', label: 'Term', get: (r) => r.t },
        { key: 'sessions', label: 'Sessions', align: 'right', get: (r) => r.sessions }, { key: 'engaged', label: 'Avg time', align: 'right', get: (r) => r.engaged, show: (r) => fmtSecs(r.engaged) },
        { key: 'conv', label: 'Converted', align: 'right', get: (r) => r.conv, show: (r) => `${r.conv}%` },
      ]} />
    </Panel>
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="First touch" sub="How each visitor first found Vroom, even if they came back another way"><BarList rows={tally([...new Map(cur.map((s) => [s.vid, s])).values()], (s) => s.ftChannel)} /></Panel>
      <Panel title="Ad click IDs" sub="Sessions that arrived from a paid click (gclid, fbclid, li_fat_id…)"><BarList rows={tally(cur, (s) => s.clid || null)} empty="No paid clicks" /></Panel>
    </div>
  </>
}

/* ================= Audience and location ================= */
function Audience({ cur }: { cur: Session[] }) {
  const [city, setCity] = useState<string | null>(null)
  const [areas, setAreas] = useState<Record<string, string>>(() => { try { return JSON.parse(localStorage.getItem('fw-pin') || '{}') } catch { return {} } })
  const pts = useMemo(() => {
    const m = new Map<string, { lat: number; lon: number; n: number; label: string }>()
    for (const s of cur) { if (s.lat == null || s.lon == null) continue; const k = `${s.lat},${s.lon}`; const p = m.get(k) || { lat: s.lat, lon: s.lon, n: 0, label: [s.postal && (areas[s.postal] || `PIN ${s.postal}`), s.city, s.regionName].filter(Boolean).join(', ') }; p.n++; m.set(k, p) }
    return [...m.values()]
  }, [cur, areas])
  const inCity = city ? cur.filter((s) => s.city === city) : []
  const pins = byDim(inCity, (s) => s.postal || 'Unknown')
  const focus = city ? (() => { const a = inCity.filter((s) => s.lat != null); return a.length ? { lat: avg(a.map((s) => s.lat!)), lon: avg(a.map((s) => s.lon!)) } : null })() : null
  useEffect(() => { // name PIN codes with India Post's public directory (cached in this browser)
    const want = [...new Set(cur.filter((s) => s.country === 'IN' && /^\d{6}$/.test(s.postal) && !areas[s.postal]).map((s) => s.postal))].slice(0, 25)
    if (!want.length) return
    let live = true
    Promise.all(want.map((p) => fetch(`https://api.postalpincode.in/pincode/${p}`).then((r) => r.json()).then((j) => [p, j?.[0]?.PostOffice?.[0] ? `${j[0].PostOffice[0].Name}` : ''] as const).catch(() => [p, ''] as const)))
      .then((res) => { if (!live) return; const next = { ...areas }; for (const [p, n] of res) if (n) next[p] = n; setAreas(next); try { localStorage.setItem('fw-pin', JSON.stringify(next)) } catch { /* ignore */ } })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur])
  const heat = Array.from({ length: 7 }, () => Array(24).fill(0)); for (const s of cur) heat[s.dowIST][s.hourIST]++
  const lcpBy = (d: string) => median(cur.filter((s) => s.device === d && s.lcp).map((s) => s.lcp!))
  return <>
    <div className="grid gap-5 lg:grid-cols-5">
      <Panel className="lg:col-span-3" title={city ? `Inside ${city}` : 'Where they are'} sub={city ? 'Each bubble is an area about 1 km across, from the visitor’s network. Areas are approximate.' : 'Each bubble is a place about 1 km across. Pick a city on the right to zoom into its areas.'}
        right={city && <button type="button" onClick={() => setCity(null)} className="font-medium text-foreground underline-offset-4 hover:underline">Back to India</button>}>
        <PlaceMap points={city ? pts.filter((p) => inCity.some((s) => s.lat === p.lat && s.lon === p.lon)) : pts} focus={focus} />
      </Panel>
      <Panel className="lg:col-span-2" title="Cities" sub="Tap a city to see its areas"><BarList rows={tally(cur, (s) => s.city || null)} limit={9} onPick={setCity} picked={city} extra={(k) => { const s = cur.find((x) => x.city === k); return s ? <span className="text-[12px] text-muted-foreground">{s.regionName}</span> : null }} /></Panel>
    </div>
    {city && <Panel title={`Areas in ${city}`} sub="By PIN code from the visitor’s network, named from India Post’s directory"><DataTable rows={pins} cols={dimCols('Area').map((c) => c.key === 'key' ? { ...c, show: (r: DimRow) => <span className="font-medium">{areas[r.key] ? `${areas[r.key]} · ${r.key}` : r.key}</span> } : c)} initial="sessions" /></Panel>}
    <div className="grid gap-5 lg:grid-cols-3">
      <Panel title="States" sub="Sessions by state or region"><BarList rows={tally(cur, (s) => s.regionName || null)} /></Panel>
      <Panel title="Countries"><BarList rows={tally(cur, (s) => s.country ? `${flag(s.country)} ${COUNTRY[s.country] || s.country}` : null)} /></Panel>
      <Panel title="New or returning" sub="Was this the visitor’s first session ever?"><BarList rows={tally(cur, (s) => (s.n > 1 ? 'Returning visitor' : 'New visitor'))} /></Panel>
    </div>
    <div className="grid gap-5 lg:grid-cols-4">
      <Panel title="Device"><BarList rows={tally(cur, (s) => s.device)} /></Panel>
      <Panel title="Operating system"><BarList rows={tally(cur, (s) => s.os)} /></Panel>
      <Panel title="Browser"><BarList rows={tally(cur, (s) => s.browser)} /></Panel>
      <Panel title="Screen size"><BarList rows={tally(cur, (s) => s.screen)} /></Panel>
    </div>
    <div className="grid gap-5 lg:grid-cols-3">
      <Panel className="lg:col-span-2" title="When they visit" sub="Sessions by hour and weekday, IST"><HeatGrid cells={heat} rows={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']} cols={Array.from({ length: 24 }, (_, h) => (h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h - 12}p`))} /></Panel>
      <Panel title="Page speed" sub="Median largest paint, by device (under 2.5s is good)">
        <ul className="space-y-3 text-[13.5px]">{['Desktop', 'Mobile', 'Tablet'].map((d) => { const v = lcpBy(d); return <li key={d} className="flex items-center justify-between"><span>{d}</span><span className="tabular-nums font-medium">{v ? `${(v / 1000).toFixed(1)}s` : '–'} {v ? <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[11px] ${v < 2500 ? 'bg-emerald-50 text-emerald-700' : v < 4000 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>{v < 2500 ? 'Good' : v < 4000 ? 'Needs work' : 'Slow'}</span> : null}</span></li> })}</ul>
        <div className="mt-5 border-t pt-4"><h4 className="mb-3 text-[13px] font-medium text-muted-foreground">Language and network</h4><BarList rows={[...tally(cur, (s) => s.lang || null).slice(0, 3), ...tally(cur, (s) => (s.conn ? `Network ${s.conn}` : null)).slice(0, 3)]} limit={6} /></div>
      </Panel>
    </div>
  </>
}

/* ================= Case study reading ================= */
function Reading({ cur }: { cur: Session[] }) {
  const readers = cur.filter((s) => s.readCase), n = readers.length
  if (!n) return <Panel title="No case study readers in this period"><Empty /></Panel>
  const opens = cur.flatMap((s) => s.events.filter((e) => e.name === 'open_prototype'))
  return <>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi label="Readers" value={fmt(n)} hint="Sessions that opened the case study" />
      <Kpi label="Avg reading time" value={fmtSecs(avg(readers.map((s) => s.caseEngaged)))} hint={`Median ${fmtSecs(median(readers.map((s) => s.caseEngaged)))}`} />
      <Kpi label="Avg scroll depth" value={`${Math.round(avg(readers.map((s) => s.depth)))}%`} hint="How far down the page they got" />
      <Kpi label="Read to the end" value={`${pct(readers.filter((s) => s.reachIdx >= SECTIONS.length - 2).length, n)}%`} hint="Reached Future scope or the closing note" />
    </div>
    <Panel title="Section by section" sub="How many readers reached each section, how long they stayed, and where they stopped reading">
      <div className="overflow-x-auto"><table className="w-full text-[13.5px]">
        <thead><tr className="border-b text-left text-[12px] text-muted-foreground"><th className="py-2 pr-3 font-medium">Section</th><th className="py-2 pr-3 font-medium">Reached</th><th className="py-2 pr-3 text-right font-medium">Avg time there</th><th className="py-2 text-right font-medium">Stopped here</th></tr></thead>
        <tbody>{SECTIONS.map((sec, i) => {
          const reached = readers.filter((s) => s.reachIdx >= i).length, here = readers.filter((s) => s.secDwell[sec.id]), dwell = avg(here.map((s) => s.secDwell[sec.id] || 0)), stop = readers.filter((s) => s.reachIdx === i && !s.protoUsed).length, r = pct(reached, n)
          return <tr key={sec.id} className="border-b border-border/60 last:border-0">
            <td className="py-2.5 pr-3 font-medium">{sec.label}</td>
            <td className="w-[38%] py-2.5 pr-3"><div className="flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${r}%`, background: rampAt(r, 100) }} /></div><span className="w-11 text-right tabular-nums">{Math.round(r)}%</span></div></td>
            <td className="py-2.5 pr-3 text-right tabular-nums">{here.length ? fmtSecs(dwell) : '–'}</td>
            <td className="py-2.5 text-right tabular-nums">{stop ? <span className="font-medium">{stop}</span> : <span className="text-muted-foreground">0</span>}</td>
          </tr>
        })}</tbody>
      </table></div>
    </Panel>
    <div className="grid gap-5 lg:grid-cols-3">
      <Panel title="Scroll depth" sub="Readers by the furthest point they scrolled"><BarList rows={(['0–25%', '25–50%', '50–75%', '75–100%'] as const).map((b, i) => [b, readers.filter((s) => Math.min(3, Math.floor(s.depth / 25.01)) === i).length] as [string, number])} /></Panel>
      <Panel title="Where they opened the prototype" sub={`${opens.length} opens from the case study`}><BarList rows={tally(opens, (e) => SECTIONS.find((x) => x.id === e.p.from)?.label || String(e.p.from || 'Masthead'))} empty="No one has opened it from the page yet" /></Panel>
      <Panel title="Which screen they opened" sub="Home, product list or product page"><BarList rows={tally(opens, (e) => VIEW_LABEL[String(e.p.to)] || String(e.p.to))} empty="No opens yet" /></Panel>
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Menu jumps" sub="Sections people jumped to from the top menu"><BarList rows={tally(cur.flatMap((s) => s.events.filter((e) => e.name === 'nav')), (e) => SECTIONS.find((x) => x.id === e.p.to)?.label || String(e.p.to))} empty="No menu jumps yet" /></Panel>
      <Panel title="Most tapped on the case study"><BarList rows={tapRows(cur, 'Case study')} empty="No taps yet" /></Panel>
    </div>
  </>
}
function tapRows(list: Session[], prefix: string): [string, number][] {
  const m = new Map<string, number>()
  for (const s of list) for (const [k, n] of Object.entries(s.taps)) if (k.startsWith(prefix)) { const label = k.slice(prefix.length + 3); m.set(label, (m.get(label) || 0) + n) }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => [k.replace(/^(\w+) · /, (_, v) => `${VIEW_LABEL[v] || SECTIONS.find((x) => x.id === v)?.label || v} · `), n])
}

/* ================= Prototype ================= */
function Prototype({ cur }: { cur: Session[] }) {
  const ps = cur.filter((s) => s.protoUsed), n = ps.length
  if (!n) return <Panel title="No one has used the prototype in this period"><Empty /></Panel>
  const saw = (v: string) => ps.filter((s) => s.views.some((x) => x.v === v)).length
  const evs = ps.flatMap((s) => s.events)
  const feat = Object.keys(EVENT_LABEL).filter((k) => !['reach', 'nav', 'open_prototype', 'outbound'].includes(k)).map((k) => [EVENT_LABEL[k], ps.filter((s) => s.events.some((e) => e.name === k)).length] as [string, number]).filter((x) => x[1]).sort((a, b) => b[1] - a[1])
  const asks = tally(evs.filter((e) => e.name === 'ai_ask' || e.name === 'search'), (e) => (e.p.q ? `${e.name === 'ai_ask' ? 'Asked' : 'Searched'}: “${e.p.q}”` : null))
  return <>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi label="Prototype sessions" value={fmt(n)} hint={`${pct(n, cur.length)}% of all sessions`} />
      <Kpi label="Avg time in the app" value={fmtSecs(avg(ps.map((s) => s.protoEngaged + Object.values(s.vsec).reduce((a, b) => a + b, 0) * (s.protoEngaged ? 0 : 1))))} hint="Active time in the prototype" />
      <Kpi label="Product pages per session" value={avg(ps.map((s) => s.pdps.length)).toFixed(1)} hint="Distinct product pages opened" />
      <Kpi label="Conversion" value={`${pct(ps.filter((s) => s.converted).length, n)}%`} hint="Cart, buy or reserve, of prototype sessions" />
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Shopping funnel" sub="Of prototype sessions, how far they went">
        <Funnel steps={[
          { label: 'Used the prototype', n },
          { label: 'Saw the product list (PLP)', n: saw('plp') },
          { label: 'Opened a product page (PDP)', n: saw('pdp') },
          { label: 'Added to cart, bought or opened reserve', n: ps.filter((s) => s.addToCart || s.reserveOpen || s.buyNow).length },
          { label: 'Completed a reservation', n: ps.filter((s) => s.reserveDone).length },
        ]} />
      </Panel>
      <Panel title="Pages" sub="Sessions that saw each page, and time spent there">
        <DataTable rows={['home', 'plp', 'pdp'].map((v) => ({ v, sessions: saw(v), views: ps.reduce((a, s) => a + s.views.filter((x) => x.v === v).length, 0), secs: Math.round(avg(ps.filter((s) => s.vsec[v]).map((s) => s.vsec[v]))) }))} initial="sessions" cols={[
          { key: 'v', label: 'Page', get: (r) => r.v, show: (r) => <span className="font-medium">{VIEW_LABEL[r.v]}</span> },
          { key: 'sessions', label: 'Sessions', align: 'right', get: (r) => r.sessions }, { key: 'views', label: 'Page views', align: 'right', get: (r) => r.views },
          { key: 'secs', label: 'Avg time', align: 'right', get: (r) => r.secs, show: (r) => fmtSecs(r.secs) },
        ]} />
        <div className="mt-5 border-t pt-4"><h4 className="mb-3 text-[13px] font-medium text-muted-foreground">Exit page: where the session ended</h4><BarList rows={tally(cur, (s) => s.exit)} limit={5} /></div>
      </Panel>
    </div>
    <div className="grid gap-5 lg:grid-cols-3">
      <Panel title="Features used" sub="Sessions that used each feature at least once"><BarList rows={feat} limit={10} unit={(x) => `${x} · ${pct(x, n)}%`} /></Panel>
      <Panel title="Products viewed"><BarList rows={tally(ps, (s) => s.pdps.map(prodName))} empty="No product pages yet" /></Panel>
      <Panel title="Categories browsed"><BarList rows={tally(ps, (s) => s.cats.map(catName))} empty="No product lists yet" /></Panel>
    </div>
    <div className="grid gap-5 lg:grid-cols-3">
      <Panel title="What they searched and asked" sub="Search terms and Ask Vroom questions"><BarList rows={asks} limit={10} empty="No searches or questions yet" /></Panel>
      <Panel title="Vehicles" sub="Number plate lookups, brands and vehicle switches"><BarList rows={[...tally(evs.filter((e) => e.name === 'plate_lookup'), (e) => `Plate lookup · ${e.p.type}`), ...tally(evs.filter((e) => e.name === 'brand_pick'), (e) => `Brand · ${e.p.brand}`), ...tally(evs.filter((e) => e.name === 'vehicle_switch'), (e) => `Switched to ${CAT.vehicles[String(e.p.to)] || e.p.to}`)].sort((a, b) => b[1] - a[1])} empty="No vehicle actions yet" /></Panel>
      <Panel title="Offers, filters and markers"><BarList rows={[...tally(evs.filter((e) => e.name === 'coupon_copy'), (e) => `Copied ${e.p.code}`), ...tally(evs.filter((e) => e.name === 'filter'), (e) => `Filter · ${e.p.k}: ${e.p.v}`), ...tally(evs.filter((e) => e.name === 'part_marker'), (e) => `Marker · ${String(e.p.at).split(':')[0]}`)].sort((a, b) => b[1] - a[1])} empty="None yet" /></Panel>
    </div>
    <Panel title="Every tap in the prototype" sub="Grouped by the page it happened on; includes taps inside the screens embedded in the case study"><BarList rows={[...tapRows(ps, 'Prototype'), ...tapRows(ps, 'Embedded').map(([k, v]) => [`Embedded · ${k}`, v] as [string, number])].sort((a, b) => b[1] - a[1])} limit={14} /></Panel>
  </>
}

/* ================= Retention ================= */
function Retention({ cur, all }: { cur: Session[]; all: Session[] }) {
  const vids = new Set(cur.map((s) => s.vid))
  const per = new Map<string, Session[]>(); for (const s of all) if (vids.has(s.vid)) { const a = per.get(s.vid) || []; a.push(s); per.set(s.vid, a) }
  const counts = [...per.values()].map((a) => Math.max(a.length, ...a.map((s) => s.n)))
  const gaps = [...per.values()].flatMap((a) => { const t = a.map((s) => s.start).sort((x, y) => x - y); return t.slice(1).map((x, i) => (x - t[i]) / 864e5) })
  const rows = cohorts(all.filter((s) => vids.has(s.vid))).slice(0, 14)
  return <>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi label="Returning visitors" value={`${pct(counts.filter((c) => c > 1).length, counts.length)}%`} hint="Visitors with more than one session" />
      <Kpi label="Sessions per visitor" value={avg(counts).toFixed(1)} hint="Average, all time" />
      <Kpi label="Came back 2+ times" value={fmt(counts.filter((c) => c > 2).length)} hint="Visitors with three or more sessions" />
      <Kpi label="Days between visits" value={gaps.length ? `${median(gaps).toFixed(1)}` : '–'} hint="Median gap for returning visitors" />
    </div>
    <Panel title="Return by first-visit day" sub="Each row is the visitors who first came that day; each cell is the share who came back N days later">
      {rows.length ? <div className="overflow-x-auto"><table className="w-full border-separate border-spacing-[3px] text-[13px]">
        <thead><tr className="text-[12px] text-muted-foreground"><th className="pr-3 text-left font-medium">First visit</th><th className="pr-3 text-right font-medium">Visitors</th>{Array.from({ length: 8 }, (_, d) => <th key={d} className="font-medium">{d === 0 ? 'Day 0' : `+${d}`}</th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={r.day}><td className="pr-3 font-medium">{new Date(r.day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td><td className="pr-3 text-right tabular-nums">{r.size}</td>
          {r.back.map((b, d) => { const v = pct(b, r.size); const future = Date.parse(r.day) + d * 864e5 > Date.now(); return <td key={d} className="h-9 min-w-12 rounded-md text-center tabular-nums" style={{ background: future ? 'transparent' : rampAt(d === 0 ? 0 : v, 60), color: v > 35 && d ? '#fff' : undefined }}>{future ? '' : d === 0 ? '100%' : `${Math.round(v)}%`}</td> })}</tr>)}</tbody>
      </table></div> : <Empty />}
    </Panel>
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Sessions by visit number" sub="How many sessions were someone’s 1st, 2nd, 3rd visit"><BarList rows={tally(cur, (s) => (s.n >= 4 ? '4th visit or later' : ['', '1st visit', '2nd visit', '3rd visit'][s.n]))} /></Panel>
      <Panel title="What returning visitors do" sub="Compared with first-time visitors">
        {(['New visitor', 'Returning visitor'] as const).map((k) => { const g = cur.filter((s) => (s.n > 1) === (k === 'Returning visitor')); return <div key={k} className="mb-4 last:mb-0"><div className="mb-1 text-[13.5px] font-medium">{k} · {g.length}</div>
          <div className="grid grid-cols-3 gap-2 text-[12.5px]"><Mini l="Avg time" v={fmtSecs(avg(g.map((s) => s.engaged)))} /><Mini l="Used app" v={`${pct(g.filter((s) => s.protoUsed).length, g.length)}%`} /><Mini l="Converted" v={`${pct(g.filter((s) => s.converted).length, g.length)}%`} /></div></div> })}
      </Panel>
    </div>
  </>
}
const Mini = ({ l, v }: { l: string; v: string }) => <div className="rounded-lg bg-muted/60 px-3 py-2"><div className="text-muted-foreground">{l}</div><div className="mt-0.5 text-[15px] font-semibold tabular-nums">{v}</div></div>

/* ================= Sessions ================= */
function Sessions({ cur, now, onOpen }: { cur: Session[]; now: number; onOpen: (s: Session) => void }) {
  return <Panel title={`${fmt(cur.length)} sessions`} sub="Newest first. Tap a row for the full timeline: source, location, every section, page, tap and action.">
    <DataTable rows={cur} onRow={onOpen} limit={40} initial="start" cols={[
      { key: 'start', label: 'When', get: (s) => s.start, show: (s) => <span className="whitespace-nowrap">{s.live ? <span className="font-medium text-emerald-600">Live · </span> : null}{when(s.start)}<span className="block text-[12px] text-muted-foreground">{ago(s.end, now)}</span></span> },
      { key: 'where', label: 'Where', get: (s) => s.city, show: (s) => <span>{flag(s.country)} {s.city || '–'}<span className="block text-[12px] text-muted-foreground">{[s.postal, s.regionName].filter(Boolean).join(' · ')}</span></span> },
      { key: 'channel', label: 'Source', get: (s) => s.channel, show: (s) => <span>{s.channel}<span className="block text-[12px] text-muted-foreground">{s.utm.campaign || s.refHost || ''}</span></span> },
      { key: 'device', label: 'Device', get: (s) => s.device, show: (s) => <span>{s.device}<span className="block text-[12px] text-muted-foreground">{s.os} · {s.browser}</span></span> },
      { key: 'engaged', label: 'Time', align: 'right', get: (s) => s.engaged, show: (s) => fmtSecs(s.engaged) },
      { key: 'reach', label: 'Read to', get: (s) => s.reachIdx, show: (s) => s.readCase ? s.reach : <span className="text-muted-foreground">–</span> },
      { key: 'proto', label: 'Prototype', get: (s) => s.views.length, show: (s) => s.protoUsed ? `${new Set(s.views.map((v) => v.v)).size} pages · ${s.pdps.length} PDP` : <span className="text-muted-foreground">–</span> },
      { key: 'out', label: 'Outcome', get: (s) => (s.reserveDone ? 3 : s.converted ? 2 : s.bounce ? 0 : 1), show: (s) => <Outcome s={s} /> },
    ]} />
  </Panel>
}
function Outcome({ s }: { s: Session }) {
  const [t, c] = s.reserveDone ? ['Reserved', 'bg-emerald-50 text-emerald-700'] : s.converted ? ['Added to cart', 'bg-emerald-50 text-emerald-700'] : s.bounce ? ['Bounced', 'bg-rose-50 text-rose-700'] : s.protoUsed ? ['Explored app', 'bg-blue-50 text-blue-700'] : ['Read', 'bg-muted text-muted-foreground']
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[12px] font-medium ${c}`}>{t}</span>
}
function SessionTitle({ s }: { s: Session }) {
  return <div><div className="truncate text-[16px] font-semibold">{flag(s.country)} {[s.city, s.regionName].filter(Boolean).join(', ') || 'Unknown location'}</div>
    <div className="text-[12.5px] text-muted-foreground">{when(s.start)} · {s.channel} · {s.device}</div></div>
}
function SessionDetail({ s }: { s: Session }) {
  const facts: [string, ReactNode][] = [
    ['Outcome', <Outcome s={s} />], ['Engaged time', fmtSecs(s.engaged)], ['Visit length', fmtSecs(s.wall)], ['Visit number', `${s.n}${s.n === 1 ? ' (first ever)' : ''}`],
    ['First seen', new Date(s.firstSeen).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })], ['Source', s.channel], ['Referrer', s.refHost || 'none'], ['Landing', s.landing || '/'],
    ['UTM', Object.keys(s.utm).length ? Object.entries(s.utm).map(([k, v]) => `${k}=${v}`).join(' · ') : 'none'], ['First touch', s.ftChannel],
    ['Area', [s.postal, s.city, s.regionName, COUNTRY[s.country] || s.country].filter(Boolean).join(', ') || '–'], ['Device', `${s.device} · ${s.os} · ${s.browser}`],
    ['Screen', `${s.vw}px wide${s.dark ? ' · dark mode' : ''}`], ['Language', s.lang || '–'], ['Page speed', s.lcp ? `${(s.lcp / 1000).toFixed(1)}s largest paint` : '–'],
  ]
  const tl = [
    ...s.views.map((v) => ({ at: v.at, t: `Opened ${VIEW_LABEL[v.v] || v.v}${v.k ? ` · ${v.v === 'pdp' ? prodName(v.k) : catName(v.k)}` : ''}`, w: 'Prototype' })),
    ...s.events.filter((e) => e.name !== 'reach' || true).map((e) => ({ at: e.at, t: `${EVENT_LABEL[e.name] || e.name}${e.name === 'reach' ? ` · ${SECTIONS.find((x) => x.id === e.p.s)?.label || e.p.s}` : Object.keys(e.p).length ? ` · ${Object.entries(e.p).map(([k, v]) => (k === 'id' ? prodName(String(v)) : k === 'to' && CAT.vehicles[String(v)] ? CAT.vehicles[String(v)] : String(v))).join(' · ')}` : ''}`, w: e.where })),
  ].sort((a, b) => a.at - b.at)
  const taps = Object.entries(s.taps).sort((a, b) => b[1] - a[1])
  return <div className="space-y-6">
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">{facts.map(([k, v]) => <div key={k} className="min-w-0"><dt className="text-muted-foreground">{k}</dt><dd className="mt-0.5 break-words font-medium">{v}</dd></div>)}</dl>
    {s.readCase && <div><h4 className="mb-3 text-[14px] font-semibold">Case study · time per section</h4>
      <BarList rows={SECTIONS.filter((x) => s.secDwell[x.id]).map((x) => [x.label, s.secDwell[x.id]] as [string, number])} unit={fmtSecs} limit={14} empty="Did not stay long enough on any section" /></div>}
    <div><h4 className="mb-3 text-[14px] font-semibold">Timeline</h4>
      {tl.length ? <ol className="relative space-y-3 border-l pl-4">{tl.map((x, i) => <li key={i} className="relative text-[13px]"><span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-background" style={{ background: x.w === 'Case study' ? '#86b6ef' : '#2a78d6' }} />
        <span className="tabular-nums text-muted-foreground">+{fmtSecs(Math.max(0, Math.round((x.at - s.start) / 1000)))}</span> · {x.t} <span className="text-muted-foreground">({x.w})</span></li>)}</ol> : <Empty>No actions recorded</Empty>}
    </div>
    <div><h4 className="mb-3 text-[14px] font-semibold">Taps · {s.tapCount}</h4><BarList rows={taps} limit={12} empty="No taps" /></div>
  </div>
}
