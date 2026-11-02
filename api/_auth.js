import crypto from 'node:crypto';

// Shared helpers for the stats lock. The signing secret is STATS_KEY when set; otherwise it is derived from the
// Blob store's token, which is already a server-only secret, so connecting the store is enough. Never in the repo.
const secret = () => process.env.STATS_KEY || (process.env.BLOB_READ_WRITE_TOKEN ? crypto.createHash('sha256').update('vroom-stats-key:' + process.env.BLOB_READ_WRITE_TOKEN).digest('hex') : '');
// what still needs switching on in Vercel; the lock screen shows it instead of failing silently
export const setup = () => ({ blob: !!process.env.BLOB_READ_WRITE_TOKEN, password: true });
export const sha256 = (b) => crypto.createHash('sha256').update(b).digest();
export const sign = (s) => crypto.createHmac('sha256', secret()).update(s).digest('base64url');
const eq = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const makeSession = (days = 0.5) => { const exp = Date.now() + days * 864e5; return `${exp}.${sign('s' + exp)}`; };
// no Max-Age = a browser-session cookie, gone when the browser closes
export const sessionCookie = (val, maxAge) => `fw_stats=${val}; Path=/; HttpOnly; Secure; SameSite=Strict${maxAge != null ? `; Max-Age=${maxAge}` : ''}`;
export function isAuthed(req) {
  if (!secret()) return false;
  const m = (req.headers.cookie || '').match(/(?:^|;\s*)fw_stats=([^;]+)/);
  if (!m || !secret()) return false;
  const [exp, sig] = m[1].split('.');
  if (!exp || !sig || +exp < Date.now()) return false;
  return eq(sig, sign('s' + exp));
}

// Stateless WebAuthn challenges: random + timestamp + signature, valid for 2 minutes.
export function makeChallenge() {
  const body = `${crypto.randomBytes(16).toString('base64url')}.${Date.now().toString(36)}`;
  return `${body}.${sign('c' + body)}`;
}
export function checkChallenge(ch) {
  const p = String(ch).split('.');
  if (p.length !== 3) return false;
  const body = `${p[0]}.${p[1]}`;
  if (!eq(sign('c' + body), p[2])) return false;
  const age = Date.now() - parseInt(p[1], 36);
  return age >= 0 && age < 120000;
}

// The password is never in the repo. STATS_PASSWORD (Vercel env) wins when set; otherwise the given password is
// checked against this salted scrypt hash, so /track works straight after merging with no setup.
const PW = { salt: 'a6f7f62eb4cf2205f4986d23e64d4887', hash: '8273d78600d9cd0efb26c64a56c9ca2f300b55e9b8b2f98374c6281942e75627' };
export const passwordOk = (given) => {
  const g = String(given || '').trim().toLowerCase();
  const want = String(process.env.STATS_PASSWORD || '').trim().toLowerCase();
  if (want) return crypto.timingSafeEqual(sha256(g), sha256(want));
  if (!g || g.length > 128) return false;
  const a = crypto.scryptSync(g, PW.salt, 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return crypto.timingSafeEqual(a, Buffer.from(PW.hash, 'hex'));
};

export const clientHash = (req) => {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  return crypto.createHmac('sha256', secret()).update('ip' + ip).digest('hex').slice(0, 16);
};
