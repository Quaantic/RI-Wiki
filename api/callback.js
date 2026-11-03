const SITE_ORIGIN = 'https://regrowthinc.vercel.app';

function readCookie(req, name) {
  const cookieHeader = req.headers.cookie || '';
  const prefix = `${name}=`;
  const value = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return value ? value.slice(prefix.length) : '';
}

function sendPopup(res, payload, status = 200) {
  const nonce = require('node:crypto').randomBytes(16).toString('base64');
  const message = JSON.stringify(payload).replace(/</g, '\\u003c');
  const result = status === 200 ? 'success' : 'error';
  const script = `if(window.opener){window.opener.postMessage("authorizing:github",${JSON.stringify(SITE_ORIGIN)});window.opener.postMessage("authorization:github:${result}:"+${message},${JSON.stringify(SITE_ORIGIN)});window.close();}else{document.body.textContent="GitHub sign-in could not connect to the editor. Close this window and try again.";}`;

  res.status(status);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', `default-src 'none'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Set-Cookie', 'ri-cms-oauth-state=; Max-Age=0; Path=/api/callback; HttpOnly; Secure; SameSite=Lax');
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
  const savedState = readCookie(req, 'ri-cms-oauth-state');
  if (requestUrl.searchParams.has('error') || !code || !savedState
    || !/^[a-f0-9]{64}$/.test(returnedState)
    || returnedState.length !== savedState.length
    || !require('node:crypto').timingSafeEqual(Buffer.from(returnedState), Buffer.from(savedState))) {
    sendPopup(res, { message: 'GitHub sign-in was cancelled or could not be verified.' }, 400);
    return;
  }

  const clientId = process.env.OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    sendPopup(res, { message: 'GitHub sign-in is not configured.' }, 503);
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

  sendPopup(res, { token: tokenData.access_token, provider: 'github' });
};
