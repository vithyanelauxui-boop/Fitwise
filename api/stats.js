import { list, get } from '@vercel/blob';
import { isAuthed } from './_auth.js';

// Data endpoint for the private dashboard (/track). Needs the signed session cookie from /api/auth.
// Returns every page-context record for sessions that started in the last `days` days (IST); the dashboard
// stitches records into sessions and visitors, and computes every metric client-side.
async function listAll(prefix) {
  const out = [];
  let cursor;
  do {
    const r = await list({ prefix, cursor, limit: 1000 });
    out.push(...r.blobs);
    cursor = r.hasMore ? r.cursor : undefined;
  } while (cursor && out.length < 20000);
  return out;
}
async function read(pathname) {
  try {
    const r = await get(pathname, { access: 'private', useCache: false });
    if (!r || !r.stream) return null;
    return JSON.parse(await new Response(r.stream).text());
  } catch { return null; }
}
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!isAuthed(req)) return res.status(401).json({ error: 'locked' });
  const days = Math.max(1, Math.min(180, parseInt(req.query?.days, 10) || 90));
  const cutoff = new Date(Date.now() + 19800000 - days * 864e5).toISOString().slice(0, 10);
  const blobs = (await listAll('s/')).filter((b) => b.pathname.slice(2, 12) >= cutoff);
  const records = (await pool(blobs.map((b) => b.pathname), 24, read)).filter(Boolean);
  res.status(200).json({ now: Date.now(), days, records });
}
