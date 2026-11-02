import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ArrowDown, ArrowUp, X } from 'lucide-react'

/* one data hue (dataviz reference blue) + its sequential ramp; text always stays in ink, never the data colour */
export const BLUE = '#2a78d6'
export const RAMP = ['#f1f6fd', '#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#2a78d6', '#1c5cab', '#104281']
export const rampAt = (v: number, max: number) => (v <= 0 || max <= 0 ? RAMP[0] : RAMP[Math.min(RAMP.length - 1, 1 + Math.floor((v / max) * (RAMP.length - 1.01)))])
export const fmt = (n: number) => new Intl.NumberFormat('en-IN').format(Math.round(n))

export function Panel({ title, sub, right, children, className = '' }: { title: string; sub?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`min-w-0 rounded-2xl bg-card p-5 shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_1px_3px_rgb(0_0_0/0.04)] sm:p-6 ${className}`}>
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-[14.5px] font-semibold tracking-tight">{title}</h3>
        {sub && <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{sub}</p>}
      </div>
      {right && <div className="shrink-0 text-[13px] text-muted-foreground">{right}</div>}
    </div>
    {children}
  </section>
}
export const Empty = ({ children = 'No data for this period yet' }: { children?: ReactNode }) => <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>

export function Delta({ d, invert }: { d?: number | null; invert?: boolean }) {
  if (d == null || !Number.isFinite(d)) return null
  const good = d === 0 ? null : invert ? d < 0 : d > 0
  return <span className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[12px] font-semibold tabular-nums ${good == null ? 'bg-muted text-muted-foreground' : good ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
    {d > 0 ? <ArrowUp className="size-3" /> : d < 0 ? <ArrowDown className="size-3" /> : null}{Math.abs(d)}%
  </span>
}
export function Kpi({ label, value, hint, delta, invert }: { label: string; value: string; hint: string; delta?: number | null; invert?: boolean }) {
  return <div className="rounded-2xl bg-card p-4 shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_1px_3px_rgb(0_0_0/0.04)] sm:p-5">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[13px] font-medium text-muted-foreground">{label}</span><Delta d={delta} invert={invert} />
    </div>
    <div className="mt-2.5 text-[28px] font-semibold leading-none tracking-tight">{value}</div>
    <p className="mt-2.5 text-[12.5px] leading-snug text-muted-foreground">{hint}</p>
  </div>
}

/* ranked horizontal bars: label left, value right, thin bar under (reads like a list, scans like a chart) */
export function BarList({ rows, limit = 8, unit = (n: number) => fmt(n), extra, onPick, picked, empty }: { rows: [string, number][]; limit?: number; unit?: (n: number) => string; extra?: (k: string) => ReactNode; onPick?: (k: string) => void; picked?: string | null; empty?: string }) {
  const [all, setAll] = useState(false)
  if (!rows.length) return <Empty>{empty}</Empty>
  const max = Math.max(...rows.map((r) => r[1]), 1), shown = all ? rows : rows.slice(0, limit)
  return <div>
    <ul className="space-y-3">{shown.map(([k, n]) => <li key={k}>
      <button type="button" disabled={!onPick} onClick={() => onPick?.(k)} className={`block w-full text-left ${onPick ? 'cursor-pointer rounded-md hover:bg-muted/60' : 'cursor-default'} ${picked === k ? 'bg-muted/70' : ''}`}>
        <div className="flex items-center justify-between gap-3 text-[13.5px]">
          <span className="flex min-w-0 items-center gap-2"><span className="truncate">{k}</span>{extra?.(k)}</span>
          <span className="shrink-0 font-medium tabular-nums">{unit(n)}</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#eef2f7]"><div className="h-full rounded-full" style={{ width: `${Math.max(2, (n / max) * 100)}%`, background: BLUE }} /></div>
      </button>
    </li>)}</ul>
    {rows.length > limit && <button type="button" onClick={() => setAll(!all)} className="mt-3 text-[13px] font-medium text-foreground underline-offset-4 hover:underline">{all ? 'Show fewer' : `Show all ${rows.length}`}</button>}
  </div>
}

/* step funnel: each step's bar is its share of the first step; the gap to the previous step is the drop-off */
export function Funnel({ steps }: { steps: { label: string; n: number; hint?: string }[] }) {
  const top = steps[0]?.n || 0
  if (!top) return <Empty />
  return <ol className="space-y-3">{steps.map((s, i) => {
    const prev = i ? steps[i - 1].n : s.n, share = (s.n / top) * 100, drop = prev ? Math.round(((prev - s.n) / prev) * 100) : 0
    return <li key={s.label}>
      <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
        <span className="min-w-0 truncate"><span className="mr-2 inline-grid size-5 place-items-center rounded-full bg-muted text-[11px] font-semibold tabular-nums">{i + 1}</span>{s.label}</span>
        <span className="shrink-0 tabular-nums"><b className="font-semibold">{fmt(s.n)}</b> <span className="text-muted-foreground">· {Math.round(share)}%</span></span>
      </div>
      <div className="mt-1.5 h-7 overflow-hidden rounded-md bg-muted"><div className="h-full rounded-md" style={{ width: `${Math.max(1.5, share)}%`, background: rampAt(steps.length - i, steps.length + 1) }} /></div>
      {i > 0 && drop > 0 && <p className="mt-1 text-[12px] text-muted-foreground">{drop}% dropped off after the previous step{s.hint ? ` · ${s.hint}` : ''}</p>}
    </li>
  })}</ol>
}

/* one bar per day (or hour); hover shows the exact count. A single series, so the title names it and there is no legend */
export function Trend({ points, label }: { points: { key: string; label: string; n: number; sub?: string }[]; label: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...points.map((p) => p.n))
  if (!points.length) return <Empty />
  const ticks = [max, Math.round(max / 2), 0]
  return <div className="relative">
    <div className="flex gap-2">
      <div className="flex h-44 w-7 shrink-0 flex-col justify-between text-right text-[11px] tabular-nums text-muted-foreground">{ticks.map((t, i) => <span key={i}>{t}</span>)}</div>
      <div className="relative flex h-44 flex-1 items-end gap-[2px] border-b border-l border-border/80 pl-[2px]" onMouseLeave={() => setHover(null)}>
        {[0.5, 1].map((f) => <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border/70" style={{ bottom: `${f * 100}%` }} />)}
        {points.map((p, i) => <div key={p.key} className="relative flex h-full flex-1 items-end" onMouseEnter={() => setHover(i)}>
          <div className="w-full rounded-t-[4px] transition-opacity" style={{ height: `${(p.n / max) * 100}%`, minHeight: p.n ? 3 : 0, background: BLUE, opacity: hover == null || hover === i ? 1 : 0.45 }} />
        </div>)}
      </div>
    </div>
    <div className="mt-1.5 flex justify-between pl-9 text-[11px] text-muted-foreground"><span>{points[0].label}</span><span>{points[points.length - 1].label}</span></div>
    {hover != null && <div className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 rounded-lg bg-foreground px-2.5 py-1.5 text-[12px] text-background shadow-lg" style={{ left: `calc(36px + ${(hover + 0.5) / points.length} * (100% - 36px))` }}>
      <b className="tabular-nums">{fmt(points[hover].n)}</b> {label}<div className="text-background/70">{points[hover].label}{points[hover].sub ? ` · ${points[hover].sub}` : ''}</div>
    </div>}
  </div>
}

/* hour × weekday grid in one sequential hue */
export function HeatGrid({ cells, rows, cols }: { cells: number[][]; rows: string[]; cols: string[] }) {
  const max = Math.max(1, ...cells.flat())
  return <div className="overflow-x-auto">
    <table className="w-full border-separate border-spacing-[3px] text-[11px]">
      <thead><tr><th />{cols.map((c, i) => <th key={i} className="font-normal text-muted-foreground">{i % 3 === 0 ? c : ''}</th>)}</tr></thead>
      <tbody>{rows.map((r, ri) => <tr key={r}><th className="pr-2 text-right font-normal text-muted-foreground">{r}</th>
        {cells[ri].map((v, ci) => <td key={ci} title={`${r} ${cols[ci]}: ${v} session${v === 1 ? '' : 's'}`} className="h-6 min-w-5 rounded-[4px]" style={{ background: rampAt(v, max) }} />)}
      </tr>)}</tbody>
    </table>
    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">Fewer{RAMP.slice(1).map((c) => <span key={c} className="h-2.5 w-5 rounded-sm" style={{ background: c }} />)}More</div>
  </div>
}

/* sortable table, readable first: 14px text, roomy rows, numbers right-aligned in tabular figures */
export type Col<T> = { key: string; label: string; align?: 'right'; get: (r: T) => string | number; show?: (r: T) => ReactNode; width?: string }
export function DataTable<T>({ rows, cols, initial, onRow, limit = 12, empty }: { rows: T[]; cols: Col<T>[]; initial?: string; onRow?: (r: T) => void; limit?: number; empty?: string }) {
  const [sort, setSort] = useState<{ k: string; d: 1 | -1 }>({ k: initial || cols[0].key, d: -1 })
  const [all, setAll] = useState(false)
  const sorted = useMemo(() => {
    const c = cols.find((x) => x.key === sort.k) || cols[0]
    return [...rows].sort((a, b) => { const x = c.get(a), y = c.get(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.d })
  }, [rows, cols, sort])
  if (!rows.length) return <Empty>{empty}</Empty>
  const shown = all ? sorted : sorted.slice(0, limit)
  return <div>
    <div className="overflow-x-auto">
      <table className="w-full text-[13.5px]">
        <thead><tr className="border-b text-left text-[12px] text-muted-foreground">{cols.map((c) => <th key={c.key} style={{ width: c.width }} className={`py-2 pr-3 font-medium ${c.align === 'right' ? 'text-right' : ''}`}>
          <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setSort((s) => ({ k: c.key, d: s.k === c.key ? (s.d === 1 ? -1 : 1) : -1 }))}>
            {c.label}{sort.k === c.key && (sort.d === -1 ? <ArrowDown className="size-3" /> : <ArrowUp className="size-3" />)}
          </button></th>)}</tr></thead>
        <tbody>{shown.map((r, i) => <tr key={i} onClick={() => onRow?.(r)} className={`border-b border-border/60 last:border-0 ${onRow ? 'cursor-pointer hover:bg-muted/50' : ''}`}>
          {cols.map((c) => <td key={c.key} className={`py-2.5 pr-3 ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>{c.show ? c.show(r) : c.get(r)}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
    {rows.length > limit && <button type="button" onClick={() => setAll(!all)} className="mt-3 text-[13px] font-medium underline-offset-4 hover:underline">{all ? 'Show fewer' : `Show all ${rows.length}`}</button>}
  </div>
}

/* location map: OpenStreetMap tiles muted to grey (see index.css), one bubble per place (rounded lat/long ≈ 1 km), sized by sessions */
export function PlaceMap({ points, focus }: { points: { lat: number; lon: number; n: number; label: string }[]; focus?: { lat: number; lon: number } | null }) {
  const el = useRef<HTMLDivElement>(null), map = useRef<L.Map | null>(null), layer = useRef<L.LayerGroup | null>(null)
  useEffect(() => {
    if (!el.current || map.current) return
    const m = L.map(el.current, { zoomControl: true, scrollWheelZoom: false, attributionControl: true }).setView([22.5, 79], 4)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 18 }).addTo(m)
    map.current = m; layer.current = L.layerGroup().addTo(m)
    return () => { m.remove(); map.current = null }
  }, [])
  useEffect(() => {
    const m = map.current, g = layer.current
    if (!m || !g) return
    g.clearLayers()
    const max = Math.max(1, ...points.map((p) => p.n))
    for (const p of points) L.circleMarker([p.lat, p.lon], { radius: 5 + Math.sqrt(p.n / max) * 16, color: '#ffffff', weight: 2, fillColor: BLUE, fillOpacity: 0.55 }).bindTooltip(`<b>${p.label}</b><br>${p.n} session${p.n === 1 ? '' : 's'}`).addTo(g)
    if (focus) m.setView([focus.lat, focus.lon], 12)
    else if (points.length) { // frame India when most visits are there; far-off visits stay in the tables
      const india = points.filter((p) => p.lat > 6 && p.lat < 37 && p.lon > 68 && p.lon < 98), fit = india.length >= points.length / 2 ? india : points
      m.fitBounds(L.latLngBounds(fit.map((p) => [p.lat, p.lon] as [number, number])).pad(0.3), { maxZoom: 6 })
    }
    setTimeout(() => m.invalidateSize(), 50)
  }, [points, focus])
  return <div ref={el} className="h-[380px] w-full overflow-hidden rounded-xl" />
}

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [onClose])
  return <div className={`fixed inset-0 z-[1000] ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
    <div onClick={onClose} className={`absolute inset-0 bg-black/30 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} />
    <aside role="dialog" aria-modal="true" className={`absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-background shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex items-center justify-between gap-3 border-b px-5 py-4"><div className="min-w-0">{title}</div>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-9 place-items-center rounded-full hover:bg-muted"><X className="size-5" /></button></div>
      <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
    </aside>
  </div>
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return <div role="radiogroup" className="inline-flex rounded-full bg-card p-0.5 shadow-[0_0_0_1px_rgb(0_0_0/0.08)]">
    {options.map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
      className={`rounded-full px-2.5 py-1.5 text-[13px] font-medium tabular-nums transition ${value === v ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}`}>{l}</button>)}
  </div>
}
export function Pick({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return <label className={`inline-flex items-center gap-2 rounded-full py-1 pl-3 pr-1 text-[13px] ${value ? 'bg-foreground text-background' : 'bg-card shadow-[0_0_0_1px_rgb(0_0_0/0.08)]'}`}>
    <span className={value ? 'text-background/70' : 'text-muted-foreground'}>{label}</span>
    <select value={value} onChange={(e) => onChange(e.target.value)} className={`max-w-[150px] rounded-full px-2 py-1 font-medium outline-none ${value ? 'bg-white/15' : 'bg-muted'}`}>
      <option value="">All</option>{options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </label>
}
