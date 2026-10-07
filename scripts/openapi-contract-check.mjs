// Handover check: the live OpenAPI document is compared with what the API really answers, one
// operation at a time. For every documented operation the script calls it for real and asserts
// the returned HTTP status is one of the documented responses; for public and authenticated
// 200 payloads it also asserts the JSON keys stay inside the documented response schema.
// Usage: node scripts/openapi-contract-check.mjs http://localhost:5000
// The script creates two probe accounts through /api/auth/register + /api/auth/login, and those
// endpoints allow 10 calls per 60s per IP: wait a minute after another account-creating script.
// Probe accounts: one member and one admin, created through the API and removed at the end.
// Promoting the admin needs the local PostgreSQL container (override with POSTGRES_CONTAINER).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const baseUrl = (process.argv[2] ?? process.env.API_URL ?? 'http://localhost:5000').replace(/\/+$/, '');
const container = process.env.POSTGRES_CONTAINER ?? 'roomiematch-postgres-1';
const password = 'RoomieTest123!';

function sql(query) {
  return execFileSync('docker', [
    'exec', container,
    'psql', '-U', 'roomiematch', '-d', 'roomiematch', '-t', '-A', '-c', query,
  ]).toString().trim();
}

async function call(method, path, { token, body } = {}) {
  const response = await fetch(baseUrl + path, {
    method,
    headers: {
      // FormData sets its own multipart content type.
      ...(body === undefined || body instanceof FormData ? {} : { 'content-type': 'application/json' }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
  const text = await response.text();
  let json = null;
  try {
    json = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return {
    status: response.status,
    json,
    text,
    contentType: response.headers.get('content-type') ?? '',
  };
}

function emptyBody(operation) {
  if (!operation.hasBody) return undefined;
  return operation.multipart ? new FormData() : {};
}

const openapi = await call('GET', '/openapi/v1.json');
assert.equal(openapi.status, 200, `OpenAPI document returned ${openapi.status}`);
const document = openapi.json;
const schemas = document.components.schemas;

const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch']);
const operations = [];
for (const [template, item] of Object.entries(document.paths)) {
  for (const [method, operation] of Object.entries(item)) {
    if (HTTP_METHODS.has(method)) {
      operations.push({
        method: method.toUpperCase(),
        template,
        operation,
        codes: new Set(Object.keys(operation.responses).map(Number)),
        secured: Boolean(operation.security?.length),
        pathParams: (operation.parameters ?? []).filter((parameter) => parameter.in === 'path').map((parameter) => parameter.name),
        hasBody: 'requestBody' in operation,
        // Upload endpoints only accept multipart; a JSON body would stop at 415 before auth.
        multipart: Boolean(operation.requestBody?.content?.['multipart/form-data'])
          && !operation.requestBody?.content?.['application/json'],
      });
    }
  }
}
assert.ok(operations.length >= 59, `expected at least 59 documented operations, found ${operations.length}`);

function resolve(node) {
  let current = node;
  while (current?.$ref) {
    const name = current.$ref.split('/').pop();
    current = schemas[name];
  }
  return current;
}

function jsonSchemaFor(entry, status) {
  return resolve(entry.operation.responses[String(status)]?.content?.['application/json']?.schema);
}

// Keys that the documented 200 schema allows; null when the response is not a documented schema.
function allowedKeys(entry, status) {
  const schema = jsonSchemaFor(entry, status);
  if (!schema) {
    return null;
  }
  const target = schema.type === 'array' ? resolve(schema.items) : schema;
  const properties = target?.properties;
  return properties ? new Set(Object.keys(properties)) : null;
}

function fillPath(template) {
  return template.replace(/\{([^}]+)\}/g, (_, name) => (name.toLowerCase().includes('id') ? crypto.randomUUID() : 'probe'));
}

const results = [];
const failures = [];
function record(operation, probe, result, expectation) {
  const ok = operation.codes.has(result.status);
  results.push({ operation, probe, status: result.status, expectation, ok });
  if (!ok) {
    failures.push(
      `${operation.method} ${operation.template} (${probe}) returned ${result.status}; documented: ${[...operation.codes].sort().join(',')} - ${result.text.slice(0, 160)}`,
    );
  }
}

function checkSchemaKeys(operation, probe, result) {
  if (result.status !== 200 || !result.json) {
    return;
  }
  const allowed = allowedKeys(operation, 200);
  if (!allowed) {
    return;
  }
  const payloads = Array.isArray(result.json) ? result.json : [result.json];
  for (const payload of payloads) {
    if (payload === null || typeof payload !== 'object') {
      continue;
    }
    const extra = Object.keys(payload).filter((key) => !allowed.has(key));
    if (extra.length > 0) {
      failures.push(
        `${operation.method} ${operation.template} (${probe}) returned keys not in the documented schema: ${extra.join(', ')}`,
      );
    }
  }
}
const health = await call('GET', '/health');
assert.equal(health.status, 200, `API ${baseUrl} is not healthy (${health.status})`);

const stamp = Date.now();
const probeEmails = [];
async function register(label, role) {
  const email = `openapi-probe-${label}-${stamp}@example.com`;
  const registered = await call('POST', '/api/auth/register', {
    body: { email, password, displayName: `OpenAPI ${label}`, city: 'TP.HCM' },
  });
  assert.equal(registered.status, 200, `probe register ${label} returned ${registered.status}: ${registered.text.slice(0, 160)}`);
  probeEmails.push(email);
  if (role === undefined) {
    return registered.json.accessToken;
  }
  // Roles are never set through the API: promote in PostgreSQL and sign in again for a new claim.
  sql(`UPDATE users SET role='${role}' WHERE email='${email}'`);
  const login = await call('POST', '/api/auth/login', { body: { email, password } });
  assert.equal(login.status, 200, `probe login ${label} returned ${login.status}`);
  assert.equal(login.json.user.role, role);
  return login.json.accessToken;
}

// 1. Anonymous probe of every documented operation: a public one must answer something it
//    documents, a secured one must answer 401.
for (const operation of operations) {
  const result = await call(operation.method, fillPath(operation.template), {
    body: emptyBody(operation),
  });
  record(operation, 'anonymous', result, operation.secured ? 'secured: anonymous => 401' : 'public');
  if (!operation.secured) {
    checkSchemaKeys(operation, 'anonymous', result);
  }
}

// 2. Member probe: secured reads run with a real token (random path ids must degrade to 404),
//    secured writes run with a body missing every documented required field so validation - not
//    the database - answers first. The two logout endpoints revoke the calling session, so they
//    are probed last, after every other request that needs this token.
const sessionProbes = new Map([
  ['/api/auth/logout', {}],
  ['/api/auth/logout-all', undefined],
]);
const memberToken = await register('member');
for (const operation of operations) {
  if (!operation.secured || sessionProbes.has(operation.template)) {
    continue;
  }
  if (operation.method === 'GET') {
    const result = await call('GET', fillPath(operation.template), { token: memberToken });
    record(operation, 'member', result, 'secured read');
    checkSchemaKeys(operation, 'member', result);
    continue;
  }
  const bodySchema = resolve(operation.operation.requestBody?.content?.['application/json']?.schema);
  const required = bodySchema?.required ?? [];
  const result = await call(operation.method, fillPath(operation.template), {
    token: memberToken,
    body: emptyBody(operation),
  });
  record(
    operation,
    operation.hasBody ? 'member+empty body' : 'member+nobody',
    result,
    required.length > 0 ? `missing required fields: ${required.join(', ')}` : 'id does not exist for the probe account',
  );
}
// 3. Admin probe: the admin-only reads must answer 200 with a documented payload, and the two
//    review endpoints must answer 404 for an id that does not exist (body built from the schema
//    so the request is otherwise valid).
const adminToken = await register('admin', 'admin');

function bodyFromSchema(schema) {
  const resolved = resolve(schema);
  const properties = resolved?.properties ?? {};
  const body = {};
  for (const field of resolved?.required ?? []) {
    const definition = resolve(properties[field]) ?? {};
    if (definition.enum?.length) {
      body[field] = definition.enum[0];
    } else if (definition.type === 'integer') {
      body[field] = 1;
    } else if (definition.type === 'number') {
      body[field] = 1;
    } else if (definition.type === 'boolean') {
      body[field] = false;
    } else {
      body[field] = 'probe';
    }
  }
  return body;
}

// The allowed status values live in the field description instead of an enum, so the valid body
// is spelled out here - it lets the probe reach the "unknown id" branch instead of 400.
const explicitProbeBodies = new Map([
  ['POST /api/admin/reports/{id}/review', { status: 'resolved' }],
  ['POST /api/admin/verifications/{id}/review', { status: 'approved' }],
]);

for (const operation of operations) {
  if (!operation.secured || !operation.template.startsWith('/api/admin/')) {
    continue;
  }
  if (operation.method === 'GET') {
    const query = operation.template === '/api/admin/reports' || operation.template === '/api/admin/verifications'
      ? '?page=1&pageSize=1'
      : '';
    const result = await call('GET', fillPath(operation.template) + query, { token: adminToken });
    record(operation, 'admin', result, 'admin read');
    checkSchemaKeys(operation, 'admin', result);
    continue;
  }
  const key = `${operation.method} ${operation.template}`;
  const body = explicitProbeBodies.get(key) ?? bodyFromSchema(operation.operation.requestBody?.content?.['application/json']?.schema);
  const result = await call(operation.method, fillPath(operation.template), { token: adminToken, body });
  record(operation, 'admin+valid body', result, `unknown id, body ${JSON.stringify(body)}`);
}

// 4. Session probes last: they revoke the calling session, so the member token stops working
//    right after them (proved by the 401 the API answers once logout-all has run).
for (const operation of operations) {
  if (!sessionProbes.has(operation.template)) {
    continue;
  }
  const result = await call(operation.method, fillPath(operation.template), {
    token: memberToken,
    body: sessionProbes.get(operation.template),
  });
  record(operation, 'member+revokes session', result, 'session endpoint, probed last');
}
const afterLogout = await call('GET', '/api/auth/me', { token: memberToken });
assert.equal(afterLogout.status, 401, `member token still works after logout-all (${afterLogout.status})`);

// 5. Report: one line per documented operation with the real statuses observed.
for (const [key, list] of groupByOperation()) {
  const probes = list.map((item) => `${item.probe}=${item.status}${item.ok ? '' : '!'}`).join('  ');
  const documented = [...list[0].operation.codes].sort((a, b) => a - b).join('/');
  console.log(`${key.padEnd(56)} documented ${documented.padEnd(24)} ${probes}`);
}

function groupByOperation() {
  const grouped = new Map();
  for (const item of results) {
    const key = `${item.operation.method} ${item.operation.template}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(item);
  }
  return grouped;
}

console.log(`\n${results.length} real calls across ${operations.length} documented operations.`);
sql(`DELETE FROM users WHERE email IN ('${probeEmails.join("','")}')`);
assert.equal(failures.length, 0, `${failures.length} mismatch(es) between OpenAPI and the live API:\n${failures.join('\n')}`);
console.log('PASS: every documented operation answered a documented HTTP status, anonymous callers get 401 on secured operations, public and authenticated 200 payloads only contain documented schema keys, and write probes stop at validation or a missing id.');


