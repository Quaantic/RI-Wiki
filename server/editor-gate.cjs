// Server-only editor access gate. Never embed the access code in client JS.
const crypto = require('node:crypto');
const COOKIE = '__Host-ri-editor-gate';
const TTL_SECONDS = 8 * 60 * 60;

function gateKey() {
  const secret = process.env.OAUTH_CLIENT_SECRET;
  const accessCode = process.env.RI_EDITOR_ACCESS_CODE || '';
  if (!secret || !/^[A-Za-z0-9_-]{48,128}$/.test(accessCode)) return null;
  // Changing the access code immediately invalidates previously issued gates.
  return crypto.createHash('sha256').update(`ri-editor-gate-v1:${secret}:${accessCode}`).digest();
}
function validAccessCode(candidate) {
  const expected = process.env.RI_EDITOR_ACCESS_CODE || '';
  if (!/^[A-Za-z0-9_-]{48,128}$/.test(expected) || typeof candidate !== 'string') return false;
  const a = crypto.createHash('sha256').update(candidate).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}
function issueGateCookie() {
  const key = gateKey();
  if (!key) throw new Error('Editor access is not configured.');
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const nonce = crypto.randomBytes(16).toString('hex');
  const data = `${exp}.${nonce}`;
  const mac = crypto.createHmac('sha256', key).update(data).digest('hex');
  return `${COOKIE}=${data}.${mac}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${TTL_SECONDS}`;
}
function parseCookie(req, name) {
  const header = req.headers?.cookie || '';
  const match = header.split(';').map(x => x.trim()).find(x => x.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : '';
}
function hasGate(req) {
  const key = gateKey();
  if (!key || !/^[A-Za-z0-9_-]{48,128}$/.test(process.env.RI_EDITOR_ACCESS_CODE || '')) return false;
  const token = parseCookie(req, COOKIE);
  const match = /^(\d{10})\.([a-f0-9]{32})\.([a-f0-9]{64})$/.exec(token);
  if (!match) return false;
  const exp = Number(match[1]);
  if (!Number.isSafeInteger(exp) || exp <= Math.floor(Date.now() / 1000) || exp > Math.floor(Date.now() / 1000) + TTL_SECONDS) return false;
  const expected = crypto.createHmac('sha256', key).update(`${match[1]}.${match[2]}`).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(match[3], 'hex'), Buffer.from(expected, 'hex'));
}
function requireGate(req) {
  if (!hasGate(req)) throw Object.assign(new Error('Private editor access required. Open your private access URL first.'), {status: 403});
}
module.exports = {COOKIE, TTL_SECONDS, validAccessCode, issueGateCookie, hasGate, requireGate};
