// Enter via the long private path configured by Vercel rewrites.
const {validAccessCode, issueGateCookie} = require('../server/editor-gate.cjs');
module.exports = function editorEntry(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  if (req.method !== 'GET') return res.status(405).send('Method not allowed.');
  const url = new URL(req.url, 'https://regrowthinc.vercel.app');
  if (!validAccessCode(url.searchParams.get('code'))) return res.status(404).send('Not found.');
  try { res.setHeader('Set-Cookie', issueGateCookie()); }
  catch { return res.status(503).send('Private editor is not configured.'); }
  return res.redirect(302, '/');
};
