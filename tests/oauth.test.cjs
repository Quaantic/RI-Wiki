const assert = require('node:assert/strict');
const { test } = require('node:test');
const vm = require('node:vm');

const auth = require('../api/auth.js');
const callback = require('../api/callback.js');
const { createState, verifyState } = require('../api/oauth-state.js');
const SITE_ORIGIN = 'https://regrowthinc.vercel.app';
const CLIENT_SECRET = 'server-only-test-secret';

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

function callbackRequest(state, extra = '') {
  return {
    method: 'GET',
    url: `/api/callback?code=one-time-code&state=${state}${extra}`,
    headers: {},
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
  process.env.OAUTH_CLIENT_SECRET = CLIENT_SECRET;
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
  assert.equal(authorizationUrl.searchParams.get('scope'), 'repo,read:user');
  const state = authorizationUrl.searchParams.get('state');
  assert.ok(verifyState(state, CLIENT_SECRET));
  assert.equal(begin.headers['Set-Cookie'], undefined);

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
    await callback(callbackRequest(state, '&iss=https%3A%2F%2Fgithub.com'), response);

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
  } finally {
    global.fetch = originalFetch;
  }
});

test('callback rejects invalid, expired or tampered state and unexpected issuer before exchange', async () => {
  process.env.OAUTH_CLIENT_ID = 'test-client-id';
  process.env.OAUTH_CLIENT_SECRET = CLIENT_SECRET;
  const begin = createResponse();
  auth({
    method: 'GET',
    url: '/api/auth?provider=github&site_id=regrowthinc.vercel.app',
  }, begin);
  const state = new URL(begin.location).searchParams.get('state');
  const originalFetch = global.fetch;
  let exchanges = 0;
  global.fetch = async () => {
    exchanges += 1;
    throw new Error('Invalid callback must not exchange a token.');
  };

  try {
    const [timestamp, nonce, signature] = state.split('.');
    const tamperedState = `${timestamp}.${'0'.repeat(64)}.${signature}`;
    const expiredState = createState(CLIENT_SECRET);
    const [expiredTimestamp, expiredNonce, expiredSignature] = expiredState.split('.');
    const pastState = `${Number(expiredTimestamp) - 11 * 60 * 1000}.${expiredNonce}.${expiredSignature}`;

    for (const [returnedState, extra] of [
      ['invalid-state', ''],
      [tamperedState, ''],
      [pastState, ''],
      [state, '&iss=https%3A%2F%2Fevil.example'],
      [state, '&iss=https%3A%2F%2Fgithub.com%2F%40evil.example'],
    ]) {
      const response = createResponse();
      await callback(callbackRequest(returnedState, extra), response);
      assert.equal(response.code, 400);
      const { messages } = runPopupScript(response.body);
      assert.equal(messages[1].targetOrigin, SITE_ORIGIN);
      const decapError = JSON.parse(messages[1].data.match(/^authorization:github:error:(.+)$/)[1]);
      assert.ok(decapError.message);
    }
    assert.equal(exchanges, 0);
    assert.equal(verifyState(state, 'different-secret'), false);

    const slashIssuerResponse = createResponse();
    global.fetch = async () => new Response(JSON.stringify({ access_token: 'gho-test-access-token' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    await callback(callbackRequest(state, '&iss=https%3A%2F%2Fgithub.com%2F'), slashIssuerResponse);
    assert.equal(slashIssuerResponse.code, 200);
  } finally {
    global.fetch = originalFetch;
  }
});
