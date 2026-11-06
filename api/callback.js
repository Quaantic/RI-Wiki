const SITE_ORIGIN = 'https://regrowthinc.vercel.app';
const { verifyState } = require('./oauth-state');

// GitHub sends iss per RFC 9207. Its issuer is https://github.com/login/oauth
// (older redirects used https://github.com). Both are accepted; nothing else is.
const GITHUB_ISSUERS = new Set(['https://github.com', 'https://github.com/login/oauth']);

function isGitHubIssuer(issuer) {
  try {
    const parsedIssuer = new URL(issuer);
    if (parsedIssuer.search || parsedIssuer.hash || parsedIssuer.username || parsedIssuer.password) {
      return false;
    }
    const normalized = `${parsedIssuer.origin}${parsedIssuer.pathname.replace(/\/+$/, '')}`;
    return GITHUB_ISSUERS.has(normalized);
  } catch {
    return false;
  }
}

function sendPopup(res, payload, status = 200) {
  const nonce = require('node:crypto').randomBytes(16).toString('base64');
  const result = status === 200 ? 'success' : 'error';
  const protocolMessage = `authorization:github:${result}:${JSON.stringify(payload)}`;
  const script = `if(window.opener){window.opener.postMessage("authorizing:github",${JSON.stringify(SITE_ORIGIN)});window.opener.postMessage(${JSON.stringify(protocolMessage)},${JSON.stringify(SITE_ORIGIN)});window.close();}else{document.body.textContent="GitHub sign-in could not connect to the editor. Close it and try again.";}`;

  res.status(status);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><title>GitHub sign-in</title><body><script nonce="${nonce}">${script}</script></body></html>`);
}

module.exports = async function callback(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).send('Method not allowed.');
    return;
  }

  const requestUrl = new URL(req.url, SITE_ORIGIN);
  const code = requestUrl.searchParams.get('code');
  const returnedState = requestUrl.searchParams.get('state') || '';
  const issuer = requestUrl.searchParams.get('iss');
  if (requestUrl.searchParams.has('error')) {
    sendPopup(res, { message: 'GitHub sign-in was cancelled.' }, 400);
    return;
  }

  if (issuer && !isGitHubIssuer(issuer)) {
    console.warn('[cms-auth] OAuth callback rejected: unexpected issuer.', issuer);
    sendPopup(res, { message: 'GitHub sign-in could not be verified. Please try again.' }, 400);
    return;
  }

  if (!code) {
    console.warn('[cms-auth] OAuth callback rejected: authorization code is missing.');
    sendPopup(res, { message: 'GitHub did not return an authorization code. Please try again.' }, 400);
    return;
  }

  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    sendPopup(res, { message: 'GitHub sign-in is not configured.' }, 503);
    return;
  }

  if (!verifyState(returnedState, clientSecret)) {
    console.warn('[cms-auth] OAuth callback rejected: state signature is invalid or expired.');
    sendPopup(res, { message: 'GitHub sign-in could not be verified. Please close this window and try again.' }, 400);
    return;
  }

  let tokenResponse;
  try {
    tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${SITE_ORIGIN}/api/callback`,
      }),
    });
  } catch (error) {
    console.error('[cms-auth] GitHub token exchange failed:', error);
    sendPopup(res, { message: 'GitHub could not complete sign-in. Please try again.' }, 502);
    return;
  }

  if (!tokenResponse.ok) {
    console.error('[cms-auth] GitHub token exchange returned HTTP', tokenResponse.status);
    sendPopup(res, { message: 'GitHub could not complete sign-in. Please try again.' }, 502);
    return;
  }

  let tokenData;
  try {
    tokenData = await tokenResponse.json();
  } catch (error) {
    console.error('[cms-auth] GitHub returned an invalid token response:', error);
    sendPopup(res, { message: 'GitHub returned an invalid sign-in response.' }, 502);
    return;
  }

  if (typeof tokenData.access_token !== 'string' || !tokenData.access_token) {
    console.error('[cms-auth] GitHub token response did not contain an access token.');
    sendPopup(res, { message: 'GitHub did not authorize this sign-in.' }, 403);
    return;
  }

  res.setHeader('Set-Cookie', require('../server/editor-auth.cjs').cookie(tokenData.access_token));
  sendPopup(res, { token: 'ri-session', provider: 'github' });
};
