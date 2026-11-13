// Regression check for staff payment history, revenue and the Premium filter on the member list,
// run against a real API and PostgreSQL:
//   GET /api/admin/billing/payments?status=&q=&page=
//   GET /api/admin/billing/revenue
//   GET /api/admin/users?plan=premium|free
// Usage:
//   node scripts/admin-billing-api-test.mjs http://localhost:5000
// Requires the local PostgreSQL container (override with POSTGRES_CONTAINER) to promote staff and
// seed orders. Registers 4 accounts (shares the 10-per-60s register limit). Every account and its
// payments/subscriptions is removed at the end, including on failure.
//
// Covers: anonymous 401 and member 403 on all three; moderator and admin both read payments and
// revenue; moderator still gets 403 on the admin-only refund queue; status/q validation (400);
// filters by status and buyer; revenue counts paid orders only, reports refunded apart, puts this
// month's order in the current month and counts active Premium users; plan=premium/free splits
// the member list by active Premium and rejects other values.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const baseUrl = (process.argv[2] ?? process.env.API_URL ?? 'http://localhost:5000').replace(/\/+$/, '');
const container = process.env.POSTGRES_CONTAINER ?? 'roomiematch-postgres-1';
const password = 'RoomieTest123!';
const stamp = Date.now();
const createdEmails = [];

function sql(query) {
  return execFileSync('docker', [
    'exec', container, 'psql', '-U', 'roomiematch', '-d', 'roomiematch', '-t', '-A', '-c', query,
  ]).toString().trim();
}

async function call(path, token) {
  const response = await fetch(baseUrl + path, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  const text = await response.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  return { status: response.status, json, text };
}

async function register(label) {
  const body = {
    email: `adminbill-${label}-${stamp}@example.com`,
    password,
    displayName: `AdminBill ${label} ${stamp}`,
    city: 'TP.HCM',
  };
  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => null);
  assert.equal(response.status, 200, `register ${label} returned ${response.status}`);
  createdEmails.push(body.email);
  return { email: body.email, userId: json.user.id };
}

async function login(email) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200, `login ${email} returned ${response.status}`);
  return (await response.json()).accessToken;
}

function seedPayment(userId, status, amount, { paidAgo = null } = {}) {
  const paidAt = paidAgo === null ? 'NULL' : `now() - interval '${paidAgo}'`;
  const refundedAt = status === 'refunded' ? 'now()' : 'NULL';
  return sql(`
    INSERT INTO payments (user_id, plan_code, amount, currency, provider, status, expires_at, paid_at, refunded_at)
    VALUES ('${userId}', 'premium_monthly', ${amount}, 'VND', 'mock', '${status}',
            now() + interval '15 minutes', ${paidAt}, ${refundedAt})
    RETURNING id`).split('\n')[0];
}

const revenue = async (token) => {
  const r = await call('/api/admin/billing/revenue', token);
  assert.equal(r.status, 200, `revenue returned ${r.status}: ${r.text.slice(0, 200)}`);
  return r.json;
};

async function run() {
  const buyer = await register('buyer');
  const free = await register('free');
  const mod = await register('mod');
  const admin = await register('admin');
  sql(`UPDATE users SET role = 'moderator' WHERE id = '${mod.userId}'`);
  sql(`UPDATE users SET role = 'admin' WHERE id = '${admin.userId}'`);
  // Finish onboarding for the member so its 403s below come from the role check, not the
  // onboarding gate.
  sql(`UPDATE profiles SET onboarding_completed_at = now(), onboarding_data = '{}'::jsonb WHERE user_id = '${free.userId}'`);
  const memberToken = await login(free.email);
  const modToken = await login(mod.email);
  const adminToken = await login(admin.email);

  for (const path of ['/api/admin/billing/payments', '/api/admin/billing/revenue', '/api/admin/users?plan=premium']) {
    assert.equal((await call(path)).status, 401, `anonymous ${path}`);
    const member = await call(path, memberToken);
    assert.equal(member.status, 403, `member ${path}`);
    assert.ok(!member.text.includes('onboarding_required'), `member ${path} hit the onboarding gate`);
  }
  assert.equal((await call('/api/admin/billing/refund-requests', modToken)).status, 403,
    'refund queue must stay admin only');
  assert.equal((await call('/api/admin/billing/payments?status=bogus', modToken)).status, 400);
  assert.equal((await call(`/api/admin/billing/payments?q=${'x'.repeat(121)}`, modToken)).status, 400);
  assert.equal((await call('/api/admin/users?plan=gold', modToken)).status, 400);

  const before = await revenue(modToken);
  assert.equal(before.months.length, 6, 'six months of revenue');

  const paidNow = seedPayment(buyer.userId, 'paid', 20000, { paidAgo: '1 minute' });
  const paidOld = seedPayment(buyer.userId, 'paid', 180000, { paidAgo: '2 months' });
  const refunded = seedPayment(buyer.userId, 'refunded', 20000, { paidAgo: '3 minutes' });
  seedPayment(buyer.userId, 'pending', 20000);
  seedPayment(free.userId, 'failed', 20000);
  sql(`INSERT INTO subscriptions (user_id, plan, status, starts_at, ends_at)
       VALUES ('${buyer.userId}', 'premium', 'active', now(), now() + interval '1 month')`);

  for (const token of [modToken, adminToken]) {
    const after = await revenue(token);
    assert.equal(after.totalRevenue - before.totalRevenue, 200000, 'total counts paid orders only');
    assert.equal(after.paidOrders - before.paidOrders, 2);
    assert.equal(after.refundedAmount - before.refundedAmount, 20000);
    assert.equal(after.refundedOrders - before.refundedOrders, 1);
    assert.equal(after.pendingOrders - before.pendingOrders, 1);
    assert.equal(after.activePremiumUsers - before.activePremiumUsers, 1);
    const last = after.months.at(-1), lastBefore = before.months.at(-1);
    // A paid order made a minute ago may fall in the previous VN month right after midnight on
    // the 1st; the sum over all months is exact either way.
    const sum = (r) => r.months.reduce((n, m) => n + m.revenue, 0);
    assert.equal(sum(after) - sum(before), 200000, 'both seeded orders fall within the 6 months');
    assert.equal(after.revenueThisMonth - before.revenueThisMonth, last.revenue - lastBefore.revenue,
      'revenueThisMonth matches the last month bucket');
    assert.ok([0, 20000].includes(last.revenue - lastBefore.revenue), 'this month gains only the fresh order');
  }

  const byBuyer = await call(`/api/admin/billing/payments?q=${encodeURIComponent(buyer.email)}`, modToken);
  assert.equal(byBuyer.status, 200);
  assert.equal(byBuyer.json.totalCount, 4, 'buyer has 4 orders');
  assert.ok(byBuyer.json.items.every((p) => p.userId === buyer.userId && p.userEmail === buyer.email));
  const paidOnly = await call(`/api/admin/billing/payments?status=paid&q=${encodeURIComponent(buyer.email)}`, adminToken);
  assert.deepEqual(new Set(paidOnly.json.items.map((p) => p.id)), new Set([paidNow, paidOld]));
  const refundedOnly = await call(`/api/admin/billing/payments?status=refunded&q=AdminBill%20buyer%20${stamp}`, adminToken);
  assert.deepEqual(refundedOnly.json.items.map((p) => p.id), [refunded], 'q also matches display name');
  assert.ok(refundedOnly.json.items[0].refundedAt);

  const premium = await call(`/api/admin/users?plan=premium&q=${stamp}`, modToken);
  assert.equal(premium.status, 200);
  assert.deepEqual(premium.json.items.map((u) => u.id), [buyer.userId]);
  assert.ok(premium.json.items.every((u) => u.isPremium));
  const freeList = await call(`/api/admin/users?plan=free&q=${stamp}`, adminToken);
  assert.deepEqual(new Set(freeList.json.items.map((u) => u.id)), new Set([free.userId, mod.userId, admin.userId]));
  assert.ok(freeList.json.items.every((u) => !u.isPremium));

  // An expired subscription no longer counts as Premium.
  sql(`UPDATE subscriptions SET ends_at = now() - interval '1 second' WHERE user_id = '${buyer.userId}'`);
  const lapsed = await call(`/api/admin/users?plan=premium&q=${stamp}`, modToken);
  assert.equal(lapsed.json.totalCount, 0, 'lapsed Premium leaves the premium filter');
}

try {
  await run();
  console.log('admin billing api test: all checks passed');
} finally {
  if (createdEmails.length) {
    const emails = createdEmails.map((e) => `'${e}'`).join(',');
    sql(`DELETE FROM users WHERE email IN (${emails})`);
  }
}
