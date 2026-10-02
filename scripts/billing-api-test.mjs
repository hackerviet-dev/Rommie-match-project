// Regression check for Premium billing and profile boost, run against a real API and PostgreSQL:
//   GET  /api/billing/plans | /health | /me/subscription
//   POST /api/billing/checkout
//   GET  /api/billing/payments | /payments/{id}
//   POST /api/billing/payments/{id}/refund
//   POST /api/billing/mock-gateway/{id}/complete      (Billing:Provider = mock)
//   POST /api/billing/payos/webhook                   (Billing:Provider = payos)
//   GET  /api/admin/billing/refund-requests
//   POST /api/admin/billing/refund-requests/{id}/approve | /reject
//   GET  /api/matching/me/usage, POST /api/matching/me/boost
// Usage:
//   node scripts/billing-api-test.mjs http://localhost:5000
// The script reads the configured provider from GET /api/billing/health and runs the matching
// half of the payment checks:
//   * mock  — checkout -> mock gateway -> paid -> Premium, automatic refund.
//   * payos — needs PAYOS_CHECKSUM_KEY set to the API's Billing:PayOs:ChecksumKey (a test key is
//     fine: no request ever reaches payOS). Orders are seeded with psql because checkout would
//     call payOS; the script then signs webhooks itself and drives the manual refund queue.
// Run it once per provider to cover both. The boost checks run in either mode.
// Requires the local PostgreSQL container for the Premium/expiry fixtures, the admin promotion
// and for reading stored rows (override the container with POSTGRES_CONTAINER).
// POST /api/auth/register shares a 10-requests-per-60s-per-IP limit; the script registers 4
// accounts, so leave a minute between two runs against the same API process.
//
// Covers: anonymous 401 on every private billing/boost endpoint and member 403 on the admin
// refund queue; public plans; checkout validation; payment detail/history isolation between
// accounts (404, never another member's order); paid -> Premium granted and stacked by a second
// order; repeated and concurrent confirmations granting Premium once; failed and expired orders
// never granting Premium; an expired subscription reading as free; payOS webhooks rejecting a bad
// signature, ignoring an amount mismatch and an unknown order code, and staying idempotent when
// repeated; refunds (auto for mock, admin-approved for payOS) taking the order's months back,
// refusing a second refund, a pending duplicate, a non-paid order and an order past the window;
// boost success, 30-minute window, boost_active while one runs (also under concurrent calls),
// profile_hidden, the 4-per-month quota, and premium_required once Premium lapses.
// Every account (and its payments, subscriptions, boosts and refund requests) is removed at the
// end, including on failure.
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const baseUrl = (process.argv[2] ?? process.env.API_URL ?? 'http://localhost:5000').replace(/\/+$/, '');
const container = process.env.POSTGRES_CONTAINER ?? 'roomiematch-postgres-1';
const checksumKey = process.env.PAYOS_CHECKSUM_KEY ?? '';
const password = 'RoomieTest123!';
const MONTHLY = 'premium_monthly';

function sql(query) {
  return execFileSync('docker', [
    'exec', container,
    'psql', '-U', 'roomiematch', '-d', 'roomiematch', '-t', '-A', '-c', query,
  ]).toString().trim();
}

async function call(method, path, { token, body, form, redirect } = {}) {
  const headers = { ...(token ? { authorization: `Bearer ${token}` } : {}) };
  let payload;
  if (form !== undefined) {
    headers['content-type'] = 'application/x-www-form-urlencoded';
    payload = new URLSearchParams(form).toString();
  } else if (body !== undefined) {
    headers['content-type'] = 'application/json';
    payload = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const response = await fetch(baseUrl + path, { method, headers, body: payload, redirect: redirect ?? 'follow' });
  const text = await response.text();
  let json = null;
  try {
    json = text.length > 0 ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { status: response.status, json, text, location: response.headers.get('location') };
}

const stamp = Date.now();
const createdEmails = [];

async function register(label) {
  const body = {
    email: `billing-${label}-${stamp}@example.com`,
    password,
    displayName: `Billing ${label} ${stamp}`,
    city: 'TP.HCM',
  };
  const { status, json, text } = await call('POST', '/api/auth/register', { body });
  assert.equal(status, 200, `register ${label} returned ${status}: ${text.slice(0, 200)}`);
  createdEmails.push(body.email);
  return { email: body.email, token: json.accessToken, userId: json.user.id };
}

async function login(email) {
  const { status, json } = await call('POST', '/api/auth/login', { body: { email, password } });
  assert.equal(status, 200, `login ${email} returned ${status}`);
  return json.accessToken;
}

const subscription = async (token) => {
  const { status, json } = await call('GET', '/api/billing/me/subscription', { token });
  assert.equal(status, 200);
  return json;
};

const payment = async (token, id) => call('GET', `/api/billing/payments/${id}`, { token });

// The active Premium end date as stored, so month arithmetic is checked by PostgreSQL itself.
const activeEndsAt = (userId) => sql(
  `SELECT ends_at FROM subscriptions WHERE user_id = '${userId}' AND status = 'active' AND ends_at > now() ORDER BY ends_at DESC LIMIT 1`);
const isMonthLater = (later, earlier) =>
  sql(`SELECT '${later}'::timestamptz = '${earlier}'::timestamptz + interval '1 month'`) === 't';

// --- payOS webhook signing: HMAC-SHA256 over the data fields sorted by name, "k=v" joined by "&".
function signData(data, key) {
  const text = Object.keys(data).sort()
    .map((name) => `${name}=${data[name] === null || data[name] === undefined ? '' : data[name]}`)
    .join('&');
  return createHmac('sha256', key).update(text).digest('hex');
}

function webhookBody(orderCode, { amount = 20000, success = true, reference, key = checksumKey } = {}) {
  const data = {
    orderCode,
    amount,
    description: `RM${orderCode}`,
    accountNumber: '0000000000',
    reference: reference ?? `FT${orderCode}`,
    transactionDateTime: '2026-10-03 10:00:00',
    currency: 'VND',
    paymentLinkId: `link-${orderCode}`,
    code: success ? '00' : '01',
    desc: success ? 'success' : 'failed',
    counterAccountBankId: '',
    counterAccountBankName: '',
    counterAccountName: '',
    counterAccountNumber: '',
    virtualAccountName: '',
    virtualAccountNumber: '',
  };
  return JSON.stringify({ code: '00', desc: 'success', success, data, signature: signData(data, key) });
}

// A pending payOS order seeded straight into payments, exactly as checkout would write it before
// calling payOS. Returns { id, orderCode }.
function seedPayOsOrder(userId, { plan = MONTHLY, amount = 20000 } = {}) {
  const [id, orderCode] = sql(`
    INSERT INTO payments (user_id, plan_code, amount, currency, provider, provider_order_code, expires_at)
    VALUES ('${userId}', '${plan}', ${amount}, 'VND', 'payos', nextval('payments_provider_order_code_seq'),
            now() + interval '15 minutes')
    RETURNING id, provider_order_code`).split('\n')[0].split('|');
  return { id, orderCode: Number(orderCode) };
}

async function sharedChecks({ a, b, admin }) {
  // 0. Anonymous callers are refused everywhere private; members cannot reach the admin queue.
  const someId = '00000000-0000-0000-0000-000000000001';
  for (const [method, path, body] of [
    ['GET', '/api/billing/me/subscription'],
    ['POST', '/api/billing/checkout', { planCode: MONTHLY }],
    ['GET', '/api/billing/payments'],
    ['GET', `/api/billing/payments/${someId}`],
    ['POST', `/api/billing/payments/${someId}/refund`],
    ['GET', '/api/matching/me/usage'],
    ['POST', '/api/matching/me/boost'],
    ['GET', '/api/admin/billing/refund-requests'],
    ['POST', `/api/admin/billing/refund-requests/${someId}/approve`, { transferReference: 'x' }],
    ['POST', `/api/admin/billing/refund-requests/${someId}/reject`, { note: 'x' }],
  ]) {
    const { status } = await call(method, path, { body });
    assert.equal(status, 401, `${method} ${path} without a token returned ${status}`);
  }
  for (const [method, path, body] of [
    ['GET', '/api/admin/billing/refund-requests'],
    ['POST', `/api/admin/billing/refund-requests/${someId}/approve`, { transferReference: 'x' }],
    ['POST', `/api/admin/billing/refund-requests/${someId}/reject`, { note: 'x' }],
  ]) {
    const { status } = await call(method, path, { token: a.token, body });
    assert.equal(status, 403, `member ${method} ${path} returned ${status}`);
  }
  assert.equal((await call('GET', '/api/admin/billing/refund-requests?status=bogus', { token: admin.token })).status, 400);
  assert.equal((await call('POST', `/api/admin/billing/refund-requests/${someId}/approve`, { token: admin.token, body: { transferReference: 'FT1' } })).status, 404);

  // 1. Plans are public and priced by the server.
  const plans = await call('GET', '/api/billing/plans');
  assert.equal(plans.status, 200);
  const monthly = plans.json.find((plan) => plan.code === MONTHLY);
  assert.ok(monthly && monthly.price === 20000 && monthly.durationMonths === 1, 'premium_monthly must cost 20000 VND for 1 month');

  // 2. A fresh account is free, has no payments and cannot boost.
  const free = await subscription(a.token);
  assert.equal(free.isPremium, false);
  assert.equal(free.tier, 'free');
  assert.deepEqual((await call('GET', '/api/billing/payments', { token: a.token })).json, []);
  const freeBoost = await call('POST', '/api/matching/me/boost', { token: a.token });
  assert.equal(freeBoost.status, 403);
  assert.equal(freeBoost.json.code, 'premium_required');

  // 3. Checkout refuses unknown and free plans and never takes an amount from the client.
  for (const planCode of ['premium_lifetime', 'free', '']) {
    const { status } = await call('POST', '/api/billing/checkout', { token: a.token, body: { planCode } });
    assert.equal(status, 400, `checkout ${JSON.stringify(planCode)} returned ${status}`);
  }

  // 4. Another member never sees, nor refunds, someone else's order (404, not 403).
  return {
    assertIsolated: async (paymentId) => {
      assert.equal((await payment(b.token, paymentId)).status, 404, 'B must not read A\'s payment');
      assert.ok(!(await call('GET', '/api/billing/payments', { token: b.token })).json.some((p) => p.id === paymentId));
      assert.equal((await call('POST', `/api/billing/payments/${paymentId}/refund`, { token: b.token })).status, 404);
    },
  };
}

async function mockChecks({ a }, { assertIsolated }) {
  // Webhook is payOS-only.
  assert.equal((await call('POST', '/api/billing/payos/webhook', { body: '{}' })).status, 404);

  const checkout = async () => {
    const response = await call('POST', '/api/billing/checkout', { token: a.token, body: { planCode: MONTHLY } });
    assert.equal(response.status, 200, `checkout returned ${response.status}: ${response.text.slice(0, 200)}`);
    return response.json;
  };
  const complete = (id, result = 'success') =>
    call('POST', `/api/billing/mock-gateway/${id}/complete`, { form: { result }, redirect: 'manual' });

  // 5. Checkout opens a pending order at the server's price.
  const first = await checkout();
  assert.equal(first.amount, 20000);
  assert.equal(first.planCode, MONTHLY);
  assert.ok(first.paymentUrl.endsWith(`/api/billing/mock-gateway/${first.paymentId}`), 'paymentUrl must point at the mock gateway');
  assert.equal((await payment(a.token, first.paymentId)).json.status, 'pending');
  await assertIsolated(first.paymentId);

  // 6. Paying grants Premium for a month; the redirect carries the payment id back.
  const paid = await complete(first.paymentId);
  assert.equal(paid.status, 302);
  assert.ok(paid.location.includes(`paymentId=${first.paymentId}`) && paid.location.includes('status=paid'));
  const firstPaid = (await payment(a.token, first.paymentId)).json;
  assert.equal(firstPaid.status, 'paid');
  assert.ok(firstPaid.paidAt && firstPaid.refundableUntil, 'a paid order inside the window must be refundable');
  assert.equal(firstPaid.refundRequest, null);
  assert.equal(Date.parse(firstPaid.refundableUntil) - Date.parse(firstPaid.paidAt), 7 * 24 * 3600 * 1000);
  const premium = await subscription(a.token);
  assert.equal(premium.isPremium, true);
  const endsAfterFirst = activeEndsAt(a.userId);
  assert.equal(sql(`SELECT '${endsAfterFirst}'::timestamptz BETWEEN now() + interval '1 month' - interval '5 minutes' AND now() + interval '1 month'`), 't');

  // 7. A repeated callback changes nothing.
  assert.equal((await complete(first.paymentId)).status, 302);
  assert.equal(activeEndsAt(a.userId), endsAfterFirst, 'a repeated confirmation must not extend Premium again');

  // 8. A second order stacks onto the same subscription, even when confirmed twice at once.
  const second = await checkout();
  const both = await Promise.all([complete(second.paymentId), complete(second.paymentId)]);
  assert.deepEqual(both.map((r) => r.status), [302, 302]);
  const endsAfterSecond = activeEndsAt(a.userId);
  assert.ok(isMonthLater(endsAfterSecond, endsAfterFirst), 'a second month must be added exactly once');
  assert.equal((await subscription(a.token)).subscriptionId, premium.subscriptionId);

  // 9. A failed payment and a payment confirmed after it expired never grant Premium.
  const failed = await checkout();
  await complete(failed.paymentId, 'failed');
  assert.equal((await payment(a.token, failed.paymentId)).json.status, 'failed');
  const notPaid = await call('POST', `/api/billing/payments/${failed.paymentId}/refund`, { token: a.token });
  assert.equal(notPaid.status, 409);
  assert.equal(notPaid.json.code, 'payment_not_refundable');

  const late = await checkout();
  sql(`UPDATE payments SET expires_at = now() - interval '1 minute' WHERE id = '${late.paymentId}'`);
  assert.equal((await payment(a.token, late.paymentId)).json.status, 'expired', 'an abandoned order reads as expired');
  await complete(late.paymentId);
  assert.equal((await payment(a.token, late.paymentId)).json.status, 'expired');
  assert.equal(activeEndsAt(a.userId), endsAfterSecond, 'paying an expired order must not grant Premium');

  // 10. History lists only the caller's orders, newest first.
  const history = (await call('GET', '/api/billing/payments', { token: a.token })).json;
  assert.deepEqual(history.map((p) => p.id), [late.paymentId, failed.paymentId, second.paymentId, first.paymentId]);

  // 11. Refund: two concurrent requests refund once and take one month back.
  const refunds = await Promise.all([1, 2].map(() =>
    call('POST', `/api/billing/payments/${second.paymentId}/refund`, { token: a.token, body: { reason: '  Đổi ý  ' } })));
  const statuses = refunds.map((r) => r.status).sort();
  assert.deepEqual(statuses, [200, 409], `concurrent refunds returned ${statuses}`);
  assert.equal(refunds.find((r) => r.status === 409).json.code, 'already_refunded');
  const refunded = refunds.find((r) => r.status === 200).json;
  assert.equal(refunded.status, 'refunded');
  assert.ok(refunded.refundedAt);
  assert.equal(refunded.refundableUntil, null);
  assert.equal(sql(`SELECT refund_reason || '|' || (provider_refund_id LIKE 'MOCK-REFUND-%') FROM payments WHERE id = '${second.paymentId}'`), 'Đổi ý|true');
  assert.equal(activeEndsAt(a.userId), endsAfterFirst, 'the refunded month must come off the subscription');
  assert.equal((await subscription(a.token)).isPremium, true, 'the other paid month keeps Premium');

  // 12. Past the 7-day window an order is no longer refundable.
  sql(`UPDATE payments SET paid_at = now() - interval '8 days' WHERE id = '${first.paymentId}'`);
  assert.equal((await payment(a.token, first.paymentId)).json.refundableUntil, null);
  const tooLate = await call('POST', `/api/billing/payments/${first.paymentId}/refund`, { token: a.token });
  assert.equal(tooLate.status, 409);
  assert.equal(tooLate.json.code, 'refund_window_expired');

  // 13. Refund body is validated.
  const longReason = await call('POST', `/api/billing/payments/${first.paymentId}/refund`, { token: a.token, body: { reason: 'x'.repeat(1001) } });
  assert.equal(longReason.status, 400);
  console.log('  mock checkout/confirm/refund: ok');
}

async function payOsChecks({ a, admin }, { assertIsolated }) {
  assert.ok(checksumKey, 'Billing:Provider is payos: set PAYOS_CHECKSUM_KEY to the API\'s checksum key to sign webhooks');
  assert.equal((await call('GET', `/api/billing/mock-gateway/${'00000000-0000-0000-0000-000000000001'}`)).status, 404, 'the mock gateway must be off');

  const webhook = (body) => call('POST', '/api/billing/payos/webhook', { body });

  // 5. Webhook authentication: a wrong signature or a malformed body is refused and changes nothing.
  const order = seedPayOsOrder(a.userId);
  await assertIsolated(order.id);
  assert.equal((await webhook(webhookBody(order.orderCode, { key: 'not-the-checksum-key' }))).status, 400);
  const tampered = JSON.parse(webhookBody(order.orderCode));
  tampered.data.amount = 1;
  assert.equal((await webhook(JSON.stringify(tampered))).status, 400, 'a body edited after signing must be refused');
  assert.equal((await webhook('not json')).status, 400);
  assert.equal((await webhook(JSON.stringify({ success: true, data: { orderCode: order.orderCode } }))).status, 400);
  assert.equal((await payment(a.token, order.id)).json.status, 'pending');
  assert.equal((await subscription(a.token)).isPremium, false);

  // 6. A signed webhook for another amount grants nothing; an unknown order code is acknowledged.
  const mismatch = await webhook(webhookBody(order.orderCode, { amount: 10000 }));
  assert.equal(mismatch.status, 200);
  assert.equal((await payment(a.token, order.id)).json.status, 'pending');
  assert.equal((await subscription(a.token)).isPremium, false, 'an amount mismatch must not grant Premium');
  const unknown = await webhook(webhookBody(123));
  assert.equal(unknown.status, 200, 'payOS\'s sample order code must be acknowledged');
  assert.equal(unknown.json.paymentId, null);

  // 7. The genuine webhook marks the order paid and grants Premium once, even when repeated.
  const genuine = webhookBody(order.orderCode, { reference: `FT-${stamp}` });
  const results = await Promise.all([webhook(genuine), webhook(genuine)]);
  assert.deepEqual(results.map((r) => r.status), [200, 200]);
  assert.equal(results[0].json.paymentId, order.id);
  const paid = (await payment(a.token, order.id)).json;
  assert.equal(paid.status, 'paid');
  assert.equal(paid.provider, 'payos');
  assert.equal(sql(`SELECT provider_transaction_id FROM payments WHERE id = '${order.id}'`), `FT-${stamp}`);
  assert.equal((await subscription(a.token)).isPremium, true);
  const endsAfterPaid = activeEndsAt(a.userId);
  assert.equal(sql(`SELECT count(*) FROM subscriptions WHERE user_id = '${a.userId}'`), '1');
  assert.equal((await webhook(genuine)).status, 200);
  assert.equal(activeEndsAt(a.userId), endsAfterPaid, 'a repeated webhook must not extend Premium');

  // 8. A failure webhook closes another order as failed; a later success for it grants nothing.
  const failedOrder = seedPayOsOrder(a.userId);
  assert.equal((await webhook(webhookBody(failedOrder.orderCode, { success: false }))).status, 200);
  assert.equal((await payment(a.token, failedOrder.id)).json.status, 'failed');
  assert.equal((await webhook(webhookBody(failedOrder.orderCode))).status, 200);
  assert.equal((await payment(a.token, failedOrder.id)).json.status, 'failed');
  assert.equal(activeEndsAt(a.userId), endsAfterPaid);

  // 9. Refunding a payOS order files a request for an admin: 202, nothing refunded yet.
  const filed = await call('POST', `/api/billing/payments/${order.id}/refund`, { token: a.token, body: { reason: 'Không dùng nữa' } });
  assert.equal(filed.status, 202, `payOS refund returned ${filed.status}: ${filed.text.slice(0, 200)}`);
  assert.equal(filed.json.status, 'paid');
  assert.equal(filed.json.refundableUntil, null, 'no new refund is offered while one waits');
  assert.equal(filed.json.refundRequest.status, 'pending');
  assert.equal(filed.json.refundRequest.reason, 'Không dùng nữa');
  assert.equal((await subscription(a.token)).isPremium, true, 'Premium stays until an admin approves');
  const duplicate = await call('POST', `/api/billing/payments/${order.id}/refund`, { token: a.token });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.json.code, 'refund_pending');
  const historyItem = (await call('GET', '/api/billing/payments', { token: a.token })).json.find((p) => p.id === order.id);
  assert.equal(historyItem.refundRequest.id, filed.json.refundRequest.id);

  // 10. The admin queue shows it with what is needed to reconcile the transfer.
  const queue = await call('GET', '/api/admin/billing/refund-requests?status=pending&pageSize=50', { token: admin.token });
  assert.equal(queue.status, 200);
  const queued = queue.json.items.find((r) => r.paymentId === order.id);
  assert.ok(queued, 'the pending request must be in the admin queue');
  assert.equal(queued.userEmail, a.email);
  assert.equal(queued.amount, 20000);
  assert.equal(queued.providerOrderCode, order.orderCode);
  assert.equal(queued.providerTransactionId, `FT-${stamp}`);
  assert.equal(queue.json.totalCount, Number(sql("SELECT count(*) FROM payment_refund_requests WHERE status = 'pending'")));

  // 11. Rejecting needs a note, keeps the order paid and lets the buyer ask again.
  const rejectPath = `/api/admin/billing/refund-requests/${queued.id}/reject`;
  assert.equal((await call('POST', rejectPath, { token: admin.token, body: { note: '  ' } })).status, 400);
  const rejected = await call('POST', rejectPath, { token: admin.token, body: { note: 'Đơn đã dùng quá nửa thời gian.' } });
  assert.equal(rejected.status, 200);
  assert.equal(rejected.json.status, 'rejected');
  assert.equal(rejected.json.resolvedBy, admin.userId);
  assert.equal((await call('POST', rejectPath, { token: admin.token, body: { note: 'again' } })).status, 404);
  const afterReject = (await payment(a.token, order.id)).json;
  assert.equal(afterReject.status, 'paid');
  assert.equal(afterReject.refundRequest.status, 'rejected');
  assert.equal(afterReject.refundRequest.resolutionNote, 'Đơn đã dùng quá nửa thời gian.');
  assert.ok(afterReject.refundableUntil, 'a rejected request leaves the order refundable inside the window');
  assert.equal(activeEndsAt(a.userId), endsAfterPaid);

  // 12. A second request, approved by two admins at once, refunds once and ends Premium.
  const again = await call('POST', `/api/billing/payments/${order.id}/refund`, { token: a.token });
  assert.equal(again.status, 202);
  const requestId = again.json.refundRequest.id;
  assert.notEqual(requestId, queued.id);
  const approvePath = `/api/admin/billing/refund-requests/${requestId}/approve`;
  assert.equal((await call('POST', approvePath, { token: admin.token, body: { transferReference: '' } })).status, 400);
  assert.equal((await call('POST', approvePath, { token: admin.token, body: {} })).status, 400);
  const approvals = await Promise.all([1, 2].map(() =>
    call('POST', approvePath, { token: admin.token, body: { transferReference: ` HOAN-${stamp} `, note: 'Đã chuyển khoản' } })));
  assert.deepEqual(approvals.map((r) => r.status).sort(), [200, 404], 'two approvals must refund once');
  const approved = approvals.find((r) => r.status === 200).json;
  assert.equal(approved.status, 'approved');
  assert.equal(approved.transferReference, `HOAN-${stamp}`);
  assert.equal(approved.paymentStatus, 'refunded');
  const refunded = (await payment(a.token, order.id)).json;
  assert.equal(refunded.status, 'refunded');
  assert.ok(refunded.refundedAt);
  assert.equal(refunded.refundRequest.status, 'approved');
  assert.equal(sql(`SELECT provider_refund_id FROM payments WHERE id = '${order.id}'`), `HOAN-${stamp}`);
  assert.equal((await subscription(a.token)).isPremium, false, 'refunding the only month ends Premium');
  assert.equal(sql(`SELECT status FROM subscriptions WHERE user_id = '${a.userId}'`), 'cancelled');
  const afterRefund = await call('POST', `/api/billing/payments/${order.id}/refund`, { token: a.token });
  assert.equal(afterRefund.status, 409);
  assert.equal(afterRefund.json.code, 'already_refunded');

  // 13. A request filed in time stays pending past the window; a new one past it is refused.
  const lateOrder = seedPayOsOrder(a.userId);
  assert.equal((await webhook(webhookBody(lateOrder.orderCode))).status, 200);
  sql(`UPDATE payments SET paid_at = now() - interval '8 days' WHERE id = '${lateOrder.id}'`);
  const tooLate = await call('POST', `/api/billing/payments/${lateOrder.id}/refund`, { token: a.token });
  assert.equal(tooLate.status, 409);
  assert.equal(tooLate.json.code, 'refund_window_expired');
  console.log('  payOS webhook/manual refund: ok');
}

async function boostChecks(c) {
  // 14. Premium fixture for the boost account.
  sql(`INSERT INTO subscriptions (user_id, plan, status, starts_at, ends_at) VALUES ('${c.userId}', 'premium', 'active', now(), now() + interval '1 month')`);
  const usage = async () => (await call('GET', '/api/matching/me/usage', { token: c.token })).json;
  const boost = () => call('POST', '/api/matching/me/boost', { token: c.token });
  const boostRows = () => Number(sql(`SELECT count(*) FROM profile_boosts WHERE user_id = '${c.userId}'`));
  // Moves every boost of C into the past while keeping it inside this month's quota period.
  const expireBoosts = () => sql(`UPDATE profile_boosts SET starts_at = now() - interval '31 minutes', ends_at = now() - interval '1 minute' WHERE user_id = '${c.userId}' AND ends_at > now()`);

  const before = await usage();
  assert.equal(before.isPremium, true);
  assert.equal(before.boostsUsed, 0);
  assert.equal(before.boostsLimit, 4);
  assert.equal(before.activeBoost, null);

  // 15. A hidden profile cannot burn a boost.
  sql(`UPDATE profiles SET is_public = false WHERE user_id = '${c.userId}'`);
  const hidden = await boost();
  assert.equal(hidden.status, 409);
  assert.equal(hidden.json.code, 'profile_hidden');
  sql(`UPDATE profiles SET is_public = true WHERE user_id = '${c.userId}'`);
  assert.equal(boostRows(), 0);

  // 16. Three concurrent boosts: exactly one starts, the others see it running.
  const burst = await Promise.all([1, 2, 3].map(() => boost()));
  assert.deepEqual(burst.map((r) => r.status).sort(), [200, 409, 409], `concurrent boosts returned ${burst.map((r) => r.status)}`);
  const started = burst.find((r) => r.status === 200).json;
  assert.equal(Date.parse(started.endsAt) - Date.parse(started.startsAt), 30 * 60 * 1000, 'a boost lasts 30 minutes');
  for (const refused of burst.filter((r) => r.status === 409)) {
    assert.equal(refused.json.code, 'boost_active');
    assert.equal(refused.json.boost.id, started.id);
  }
  assert.equal(boostRows(), 1);
  const during = await usage();
  assert.equal(during.boostsUsed, 1);
  assert.equal(during.activeBoost.id, started.id);

  // 17. Once it ends the next one can start, up to 4 a month; the 5th is refused.
  for (let used = 1; used < 4; used += 1) {
    expireBoosts();
    const next = await boost();
    assert.equal(next.status, 200, `boost #${used + 1} returned ${next.status}: ${next.text.slice(0, 200)}`);
  }
  expireBoosts();
  const afterExpiry = await usage();
  assert.equal(afterExpiry.boostsUsed, 4);
  assert.equal(afterExpiry.activeBoost, null, 'an ended boost is no longer active');
  const exhausted = await boost();
  assert.equal(exhausted.status, 403);
  assert.equal(exhausted.json.code, 'boost_quota_exceeded');
  assert.equal(exhausted.json.resetsAt, afterExpiry.periodResetsAt);
  assert.equal(boostRows(), 4, 'a refused boost must not be stored');

  // 18. When Premium lapses the account reads as free and boosting needs Premium again.
  sql(`UPDATE subscriptions SET starts_at = now() - interval '2 months', ends_at = now() - interval '1 minute' WHERE user_id = '${c.userId}'`);
  const lapsed = await subscription(c.token);
  assert.equal(lapsed.isPremium, false);
  assert.equal(lapsed.endsAt, null);
  const lapsedUsage = await usage();
  assert.equal(lapsedUsage.isPremium, false);
  assert.equal(lapsedUsage.boostsLimit, 0);
  const lapsedBoost = await boost();
  assert.equal(lapsedBoost.status, 403);
  assert.equal(lapsedBoost.json.code, 'premium_required');
  console.log('  boost: ok');
}

async function run() {
  const health = await call('GET', '/health');
  assert.equal(health.status, 200, `API ${baseUrl} is not healthy (${health.status})`);
  const billing = await call('GET', '/api/billing/health');
  assert.equal(billing.status, 200);
  const provider = billing.json.provider;
  assert.ok(['mock', 'payos'].includes(provider),
    `Billing:Provider is "${provider}"; start the API with Billing__Provider=mock or payos to run this script`);
  console.log(`billing-api-test against ${baseUrl} (provider ${provider})`);

  const a = await register('a');
  const b = await register('b');
  const c = await register('c');
  const adminAccount = await register('admin');
  sql(`UPDATE users SET role = 'admin' WHERE id = '${adminAccount.userId}'`);
  const admin = { ...adminAccount, token: await login(adminAccount.email) };

  const shared = await sharedChecks({ a, b, admin });
  console.log('  auth/plans/checkout validation: ok');
  if (provider === 'mock') {
    await mockChecks({ a }, shared);
  } else {
    await payOsChecks({ a, admin }, shared);
  }
  await boostChecks(c);
}

try {
  await run();
  console.log('billing-api-test: all checks passed');
} finally {
  if (createdEmails.length > 0) {
    const emails = createdEmails.map((email) => `'${email}'`).join(', ');
    sql(`DELETE FROM users WHERE email IN (${emails})`);
  }
}
