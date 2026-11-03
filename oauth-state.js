const crypto = require('node:crypto');

const STATE_TTL_MS = 10 * 60 * 1000;

function signState(stateData, clientSecret) {
  return crypto.createHmac('sha256', clientSecret).update(stateData).digest('hex');
}

function createState(clientSecret) {
  const stateData = `${Date.now()}.${crypto.randomBytes(32).toString('hex')}`;
  return `${stateData}.${signState(stateData, clientSecret)}`;
}

function verifyState(state, clientSecret, now = Date.now()) {
  const match = /^(\d{13})\.([a-f0-9]{64})\.([a-f0-9]{64})$/.exec(state);
  if (!match) return false;

  const [, timestamp, nonce, signature] = match;
  const issuedAt = Number(timestamp);
  if (!Number.isSafeInteger(issuedAt) || issuedAt > now || now - issuedAt > STATE_TTL_MS) {
    return false;
  }

  const expected = signState(`${timestamp}.${nonce}`, clientSecret);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

module.exports = { createState, verifyState };
