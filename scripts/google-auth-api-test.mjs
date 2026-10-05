import assert from 'node:assert/strict';
import { createHmac, generateKeyPairSync, sign } from 'node:crypto';

const base = process.env.API_BASE_URL || 'http://localhost:5000';
const config = await fetch(`${base}/api/auth/google/config`).then(r => r.json());
assert.equal(config.enabled, true);
assert.ok(config.clientId.endsWith('.apps.googleusercontent.com'));
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const claims = { iss: 'https://accounts.google.com', aud: config.clientId, sub: 'qa-forged-google-subject', email: 'google-forged@example.com', email_verified: true, exp: Math.floor(Date.now()/1000)+3600 };
const unsigned = `${encode({alg:'none'})}.${encode(claims)}.`;
const hmacBody = `${encode({alg:'HS256'})}.${encode(claims)}`;
const hmac = `${hmacBody}.${createHmac('sha256','fake-google-key').update(hmacBody).digest('base64url')}`;
const { privateKey } = generateKeyPairSync('rsa', {modulusLength:2048});
const rsaBody = `${encode({alg:'RS256',kid:'qa-fake-key'})}.${encode(claims)}`;
const rsa = `${rsaBody}.${sign('RSA-SHA256',Buffer.from(rsaBody),privateKey).toString('base64url')}`;
for (const [label, body, expected] of [
  ['missing credential',{},400], ['malformed token',{credential:'invalid-token'},401],
  ['unsigned token',{credential:unsigned},401], ['forged HMAC',{credential:hmac},401],
  ['forged RSA',{credential:rsa},401],
]) {
  const response = await fetch(`${base}/api/auth/google`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal(response.status,expected,`${label}: ${await response.text()}`);
  console.log(`PASS ${label}: ${expected}`);
}
console.log('PASS public Google configuration and rejection of invalid credentials');
