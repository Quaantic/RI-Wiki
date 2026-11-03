const assert = require('node:assert/strict');
const { test } = require('node:test');
const vm = require('node:vm');

const auth = require('../api/auth.js');
const callback = require('../api/callback.js');
const { createState, verifyState } = require('../api/oauth-state.js');
const SITE_ORIGIN = 'https://regrowthinc.vercel.app';
const CLIENT_SECRET = 'server-only-test-secret';
const AUTH_URL = '/api/auth?provider=github&site_id=regrowthinc.vercel.app';

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

function decapPayload(message) {
  return JSON.parse(message.match(/^authorization:github:(?:success|error):(.+)$/)[1]);
}

function withEnv(fn) {
  process.env.OAUTH_CLIENT_ID = 'test-client-id';
  process.env.OAUTH_CLIENT_SECRET = CLIENT_SECRET;
  return fn();
}

function freshState() {
  const begin = createResponse();
  auth({ method: 'GET', url: AUTH_URL }, begin);
  assert.equal(begin.code, 302, '/api/auth must redirect to GitHub');
  return new URL(begin.location).searchParams.get('state');
}

const okTokenFetch = () => async () => new Response(JSON.stringify({ access_token: 'gho-test-access-token' }), {
  status: 200,
  headers: { 'Content-Type': 'application/json' },
});

test('state generation: unique, signed, expiring within the TTL', () => {
  const a = createState(CLIENT_SECRET);
  const b = createState(CLIENT_SECRET);
  assert.notEqual(a, b, 'two states must never collide');
  assert.match(a, /^\d{13}\.[a-f0-9]{64}\.[a-f0-9]{64}$/);
  assert.equal(verifyState(a, CLIENT_SECRET), true);
  assert.equal(verifyState(a, 'different-secret'), false, 'signature must be bound to the secret');
});

test('auth: redirects to GitHub with private-repo scope, rejects bad requests', () => withEnv(() => {
  const begin = createResponse();
  auth({ method: 'GET', url: AUTH_URL }, begin);
  assert.equal(begin.code, 302);
  const authorizationUrl = new URL(begin.location);
  assert.equal(authorizationUrl.origin, 'https://github.com');
  assert.equal(authorizationUrl.pathname, '/login/oauth/authorize');
  assert.equal(authorizationUrl.searchParams.get('client_id'), 'test-client-id');
  assert.equal(authorizationUrl.searchParams.get('redirect_uri'), `${SITE_ORIGIN}/api/callback`);
  assert.equal(authorizationUrl.searchParams.get('scope'), 'repo,read:user');
  assert.ok(verifyState(authorizationUrl.searchParams.get('state'), CLIENT_SECRET));
  assert.equal(begin.headers['Set-Cookie'], undefined);

  const post = createResponse();
  auth({ method: 'POST', url: AUTH_URL }, post);
  assert.equal(post.code, 405);

  const badProvider = createResponse();
  auth({ method: 'GET', url: '/api/auth?provider=gitlab&site_id=regrowthinc.vercel.app' }, badProvider);
  assert.equal(badProvider.code, 400);

  const badSite = createResponse();
  auth({ method: 'GET', url: '/api/auth?provider=github&site_id=evil.example' }, badSite);
  assert.equal(badSite.code, 400);

  delete process.env.OAUTH_CLIENT_SECRET;
  const noSecret = createResponse();
  auth({ method: 'GET', url: AUTH_URL }, noSecret);
  assert.equal(noSecret.code, 503);
  process.env.OAUTH_CLIENT_SECRET = CLIENT_SECRET;
}));

test('full success flow: state survives GitHub, token exchanged, Decap protocol message posted', async () => withEnv(async () => {
  const state = freshState();
  const exchanges = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    exchanges.push({ url, options });
    return okTokenFetch()();
  };

  try {
    const response = createResponse();
    await callback(callbackRequest(state, '&iss=https%3A%2F%2Fgithub.com%2Flogin%2Foauth'), response);

    assert.equal(response.code, 200);
    assert.equal(exchanges.length, 1);
    assert.equal(exchanges[0].url, 'https://github.com/login/oauth/access_token');
    const tokenRequest = JSON.parse(exchanges[0].options.body);
    assert.equal(tokenRequest.code, 'one-time-code');
    assert.equal(tokenRequest.client_id, 'test-client-id');
    assert.equal(tokenRequest.client_secret, CLIENT_SECRET);
    assert.equal(tokenRequest.redirect_uri, `${SITE_ORIGIN}/api/callback`);

    const { messages, closed } = runPopupScript(response.body);
    assert.equal(messages[0].data, 'authorizing:github');
    assert.equal(messages[0].targetOrigin, SITE_ORIGIN);
    assert.equal(messages[1].targetOrigin, SITE_ORIGIN);
    assert.match(messages[1].data, /^authorization:github:success:/);
    assert.deepEqual(decapPayload(messages[1].data), {
      token: 'gho-test-access-token',
      provider: 'github',
    });
    assert.equal(closed, true);
    assert.doesNotMatch(response.body, /server-only-test-secret/);
    assert.match(response.headers['Content-Security-Policy'], /frame-ancestors 'none'/);
  } finally {
    global.fetch = originalFetch;
  }
}));

test('GitHub iss variants (RFC 9207): github.com and github.com/login/oauth are accepted', async () => withEnv(async () => {
  const originalFetch = global.fetch;
  try {
    for (const iss of [
      'https://github.com',
      'https://github.com/',
      'https://github.com/login/oauth',
      'https://github.com/login/oauth/',
    ]) {
      const state = freshState();
      const response = createResponse();
      let exchanges = 0;
      global.fetch = async () => {
        exchanges += 1;
        return okTokenFetch()();
      };
      await callback(callbackRequest(state, `&iss=${encodeURIComponent(iss)}`), response);
      assert.equal(response.code, 200, `iss=${iss} must be accepted`);
      assert.equal(exchanges, 1, `iss=${iss} must reach the token exchange`);
    }
  } finally {
    global.fetch = originalFetch;
  }
}));

test('unexpected issuers are rejected before any exchange', async () => withEnv(async () => {
  const originalFetch = global.fetch;
  let exchanges = 0;
  global.fetch = async () => {
    exchanges += 1;
    return okTokenFetch()();
  };

  try {
    for (const iss of [
      'https://evil.example',
      'https://github.com.evil.example',
      'https://evil.github.com',
      'https://github.com/login/oauth/extra',
      'https://github.com/login?x=1',
      'not-a-url',
    ]) {
      const state = freshState();
      const response = createResponse();
      await callback(callbackRequest(state, `&iss=${encodeURIComponent(iss)}`), response);
      assert.equal(response.code, 400, `iss=${iss} must be rejected`);
      const { messages } = runPopupScript(response.body);
      assert.equal(messages[0].data, 'authorizing:github');
      assert.equal(messages[1].targetOrigin, SITE_ORIGIN);
      assert.match(messages[1].data, /^authorization:github:error:/);
      assert.equal(decapPayload(messages[1].data).message, 'GitHub sign-in could not be verified. Please try again.');
    }
    assert.equal(exchanges, 0, 'no token exchange may happen for rejected issuers');
  } finally {
    global.fetch = originalFetch;
  }
}));

test('callback rejects invalid, expired or tampered state before exchange', async () => withEnv(async () => {
  const state = freshState();
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

    for (const returnedState of ['invalid-state', tamperedState, pastState, '']) {
      const response = createResponse();
      await callback(callbackRequest(returnedState), response);
      assert.equal(response.code, 400);
      const { messages } = runPopupScript(response.body);
      assert.equal(messages[1].targetOrigin, SITE_ORIGIN);
      assert.match(messages[1].data, /^authorization:github:error:/);
      assert.ok(decapPayload(messages[1].data).message);
    }
    assert.equal(exchanges, 0);
  } finally {
    global.fetch = originalFetch;
  }
}));

test('callback without a code returns a Decap error and never exchanges', async () => withEnv(async () => {
  const state = freshState();
  const originalFetch = global.fetch;
  let exchanges = 0;
  global.fetch = async () => {
    exchanges += 1;
    return okTokenFetch()();
  };

  try {
    const response = createResponse();
    await callback({ method: 'GET', url: `/api/callback?state=${state}` }, response);
    assert.equal(response.code, 400);
    const { messages } = runPopupScript(response.body);
    assert.match(messages[1].data, /^authorization:github:error:/);
    assert.equal(exchanges, 0);
  } finally {
    global.fetch = originalFetch;
  }
}));

test('token exchange failures surface as Decap errors, never as leaks', async () => withEnv(async () => {
  const originalFetch = global.fetch;

  try {
    const networkError = createResponse();
    global.fetch = async () => {
      throw new Error('ENOTFOUND github.com');
    };
    await callback(callbackRequest(freshState()), networkError);
    assert.equal(networkError.code, 502);
    assert.match(decapPayload(runPopupScript(networkError.body).messages[1].data).message, /try again/i);
    assert.doesNotMatch(networkError.body, /ENOTFOUND/);

    const httpError = createResponse();
    global.fetch = async () => new Response('error=bad_verification_code&error_description=The+code+passed+is+incorrect+or+expired.', { status: 403 });
    await callback(callbackRequest(freshState()), httpError);
    assert.equal(httpError.code, 502);
    assert.doesNotMatch(httpError.body, /bad_verification_code/);

    const garbage = createResponse();
    global.fetch = async () => new Response('<html>not json</html>', { status: 200, headers: { 'Content-Type': 'text/html' } });
    await callback(callbackRequest(freshState()), garbage);
    assert.equal(garbage.code, 502);

    const noToken = createResponse();
    global.fetch = async () => new Response(JSON.stringify({ error: 'bad_verification_code', error_description: 'The code passed is incorrect or expired.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    await callback(callbackRequest(freshState()), noToken);
    assert.equal(noToken.code, 403);
    assert.doesNotMatch(noToken.body, /incorrect or expired/);
  } finally {
    global.fetch = originalFetch;
  }
}));

test('callback rejects non-GET requests and missing credentials', () => withEnv(() => {
  const state = freshState();
  const post = createResponse();
  callback({ method: 'POST', url: '/api/callback?code=x&state=y' }, post);
  assert.equal(post.code, 405);

  delete process.env.OAUTH_CLIENT_ID;
  const noCreds = createResponse();
  callback(callbackRequest(state), noCreds);
  assert.equal(noCreds.code, 503);
  process.env.OAUTH_CLIENT_ID = 'test-client-id';
}));

test('cancelled sign-in (error param) reports a clean Decap error', async () => withEnv(async () => {
  const originalFetch = global.fetch;
  let exchanges = 0;
  global.fetch = async () => {
    exchanges += 1;
    return okTokenFetch()();
  };
  try {
    const response = createResponse();
    await callback({ method: 'GET', url: '/api/callback?error=access_denied&error_description=User+cancelled&state=x' }, response);
    assert.equal(response.code, 400);
    const { messages } = runPopupScript(response.body);
    assert.match(messages[1].data, /^authorization:github:error:/);
    assert.equal(exchanges, 0);
  } finally {
    global.fetch = originalFetch;
  }
}));
