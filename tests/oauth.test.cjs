const assert = require('node:assert/strict');
const { test } = require('node:test');
const vm = require('node:vm');

const auth = require('../api/auth.js');
const callback = require('../api/callback.js');
const SITE_ORIGIN = 'https://regrowthinc.vercel.app';

function createResponse() {
  return {
    code: 200,
    headers: {},
    body: '',
    status(code) {
      this.code = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    },
    send(body) {
      this.body = body;
    },
    end(body) {
      this.body = body;
    },
    redirect(code, url) {
      this.code = code;
      this.location = url;
    },
  };
}

function callbackRequest(state, cookie, extra = '') {
  return {
    method: 'GET',
    url: `/api/callback?code=one-time-code&state=${state}${extra}`,
    headers: { cookie },
  };
}

function runPopupScript(html) {
  const script = html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script, 'callback should return a popup script');

  const messages = [];
  let closed = false;
  const window = {
    opener: {
      postMessage(data, targetOrigin) {
        messages.push({ data, targetOrigin });
      },
    },
    close() {
      closed = true;
    },
  };
  vm.runInNewContext(script, { window, document: { body: { textContent: '' } } });
  return { messages, closed };
}

test('OAuth callback returns the Decap protocol JSON as an origin-bound string', async () => {
  process.env.OAUTH_CLIENT_ID = 'test-client-id';
  process.env.OAUTH_CLIENT_SECRET = 'server-only-test-secret';
  const begin = createResponse();

  auth({
    method: 'GET',
    url: '/api/auth?provider=github&site_id=regrowthinc.vercel.app',
  }, begin);

  assert.equal(begin.code, 302);
  const authorizationUrl = new URL(begin.location);
  assert.equal(authorizationUrl.origin, 'https://github.com');
  assert.equal(authorizationUrl.pathname, '/login/oauth/authorize');
  assert.equal(authorizationUrl.searchParams.get('client_id'), 'test-client-id');
  assert.equal(authorizationUrl.searchParams.get('redirect_uri'), `${SITE_ORIGIN}/api/callback`);
  assert.equal(authorizationUrl.searchParams.get('scope'), 'public_repo,read:user');
  const state = authorizationUrl.searchParams.get('state');
  assert.match(state, /^[a-f0-9]{64}$/);
  const cookie = begin.headers['Set-Cookie'].split(';')[0];

  const originalFetch = global.fetch;
  const exchanges = [];
  global.fetch = async (url, options) => {
    exchanges.push({ url, options });
    return new Response(JSON.stringify({ access_token: 'gho-test-access-token' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const response = createResponse();
    await callback(callbackRequest(state, cookie, '&iss=https%3A%2F%2Fgithub.com'), response);

    assert.equal(response.code, 200);
    assert.equal(exchanges.length, 1);
    assert.equal(exchanges[0].url, 'https://github.com/login/oauth/access_token');
    const tokenRequest = JSON.parse(exchanges[0].options.body);
    assert.equal(tokenRequest.code, 'one-time-code');
    assert.equal(tokenRequest.client_id, 'test-client-id');
    assert.equal(tokenRequest.client_secret, 'server-only-test-secret');
    assert.equal(tokenRequest.redirect_uri, `${SITE_ORIGIN}/api/callback`);

    const { messages, closed } = runPopupScript(response.body);
    assert.equal(messages[0].data, 'authorizing:github');
    assert.equal(messages[0].targetOrigin, SITE_ORIGIN);
    assert.equal(messages[1].targetOrigin, SITE_ORIGIN);
    assert.match(messages[1].data, /^authorization:github:success:/);

    const decapPayload = JSON.parse(messages[1].data.match(/^authorization:github:success:(.+)$/)[1]);
    assert.deepEqual(JSON.parse(JSON.stringify(decapPayload)), {
      token: 'gho-test-access-token',
      provider: 'github',
    });
    assert.equal(closed, true);
    assert.doesNotMatch(response.body, /server-only-test-secret/);
    assert.match(response.headers['Content-Security-Policy'], /frame-ancestors 'none'/);
    assert.match(response.headers['Set-Cookie'], /Max-Age=0/);
  } finally {
    global.fetch = originalFetch;
  }
});

test('callback rejects an invalid state or unexpected GitHub issuer before exchange', async () => {
  process.env.OAUTH_CLIENT_ID = 'test-client-id';
  process.env.OAUTH_CLIENT_SECRET = 'server-only-test-secret';
  const begin = createResponse();
  auth({
    method: 'GET',
    url: '/api/auth?provider=github&site_id=regrowthinc.vercel.app',
  }, begin);
  const state = new URL(begin.location).searchParams.get('state');
  const cookie = begin.headers['Set-Cookie'].split(';')[0];
  const originalFetch = global.fetch;
  let exchanges = 0;
  global.fetch = async () => {
    exchanges += 1;
    throw new Error('Invalid callback must not exchange a token.');
  };

  try {
    for (const [returnedState, extra] of [
      ['0'.repeat(64), ''],
      [state, '&iss=https%3A%2F%2Fevil.example'],
    ]) {
      const response = createResponse();
      await callback(callbackRequest(returnedState, cookie, extra), response);
      assert.equal(response.code, 400);
      const { messages } = runPopupScript(response.body);
      assert.equal(messages[1].targetOrigin, SITE_ORIGIN);
      const decapError = JSON.parse(messages[1].data.match(/^authorization:github:error:(.+)$/)[1]);
      assert.ok(decapError.message);
    }
    assert.equal(exchanges, 0);
  } finally {
    global.fetch = originalFetch;
  }
});
