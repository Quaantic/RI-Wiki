const SITE_ORIGIN = 'https://regrowthinc.vercel.app';
const SITE_ID = new URL(SITE_ORIGIN).host;

module.exports = function auth(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).send('Method not allowed.');
    return;
  }

  const clientId = process.env.OAUTH_CLIENT_ID;
  if (!clientId) {
    res.status(503).send('GitHub sign-in is not configured.');
    return;
  }

  const requestUrl = new URL(req.url, SITE_ORIGIN);
  if (requestUrl.searchParams.get('provider') !== 'github'
    || requestUrl.searchParams.get('site_id') !== SITE_ID) {
    res.status(400).send('Invalid CMS sign-in request.');
    return;
  }

  const state = require('node:crypto').randomBytes(32).toString('hex');
  const authorizationUrl = new URL('https://github.com/login/oauth/authorize');
  authorizationUrl.searchParams.set('client_id', clientId);
  authorizationUrl.searchParams.set('redirect_uri', `${SITE_ORIGIN}/api/callback`);
  authorizationUrl.searchParams.set('scope', 'public_repo,read:user');
  authorizationUrl.searchParams.set('state', state);

  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Set-Cookie', `ri-cms-oauth-state=${state}; Max-Age=600; Path=/api/callback; HttpOnly; Secure; SameSite=Lax`);
  res.redirect(302, authorizationUrl.toString());
};
