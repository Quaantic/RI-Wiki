const crypto = require('node:crypto');
const ORIGIN = 'https://regrowthinc.vercel.app';
const REPO = 'Quaantic/RI-Wiki';
const PREFIX = `/repos/${REPO}`;
const COOKIE = '__Host-ri-session';
const PUBLISHERS = new Set([279064860, 352400146]);
function key() {
  if (!process.env.OAUTH_CLIENT_SECRET) throw new Error('Authentication is not configured.');
  return crypto.createHash('sha256').update(`ri-session-v1:${process.env.OAUTH_CLIENT_SECRET}`).digest();
}
function seal(token) {
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify({ token, exp: Date.now() + 8 * 3600000 })), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString('base64url');
}
function unseal(value) {
  try {
    const data = Buffer.from(value, 'base64url');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), data.subarray(0,12));
    decipher.setAuthTag(data.subarray(12,28));
    const session = JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString());
    if (session.exp <= Date.now() || typeof session.token !== 'string') throw Error();
    return session.token;
  } catch { throw Object.assign(new Error('Permission denied. Sign in again.'), { status: 401 }); }
}
function cookie(token) { return `${COOKIE}=${seal(token)}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=28800`; }
function checkRequest(req) {
  if (req.method !== 'POST') throw Object.assign(new Error('Method not allowed.'), { status: 405 });
  if (req.headers.origin !== ORIGIN || req.headers['x-ri-editor'] !== '1') throw Object.assign(new Error('Permission denied.'), { status: 403 });
}
async function github(token, path, method='GET', body) {
  const response = await fetch(`https://api.github.com${path}`, {
    method, redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(20000),
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type':'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json().catch(()=>({}));
  if (!response.ok) throw Object.assign(new Error(data.message || 'GitHub request failed.'), {status:response.status});
  return data;
}
async function authorize(req, publish=false) {
  checkRequest(req);
  const cookies = Object.fromEntries((req.headers.cookie || '').split(';').map(item=>item.trim().split('=')));
  const token = unseal(cookies[COOKIE] || '');
  const user = await github(token, '/user');
  if (!Number.isSafeInteger(user.id)) throw Object.assign(new Error('Permission denied.'), {status:403});
  const repository = await github(token, PREFIX);
  if (!repository.permissions?.push) throw Object.assign(new Error('Permission denied. Repository write access is required.'), {status:403});
  const canPublish = PUBLISHERS.has(user.id);
  if (publish && !canPublish) throw Object.assign(new Error('Permission denied. Only Quaantic and zzinss can publish.'), {status:403});
  return {token,user,canPublish};
}
function fail(res,error) {
  const status = Number.isInteger(error.status) ? error.status : 502;
  res.status(status).json({ message: status === 502 ? 'GitHub could not complete the operation. Your draft is preserved; retry.' : error.message });
}
module.exports={ORIGIN,REPO,PREFIX,COOKIE,PUBLISHERS,cookie,unseal,checkRequest,github,authorize,fail};
