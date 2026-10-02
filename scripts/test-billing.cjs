const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '../functions/src');

function harness() {
  const records = new Map();
  const cache = new Map();
  let queue = Promise.resolve();
  const ref = p => ({ path: p, get: async () => snapshot(p), set: async (data, options) => write(p, data, options) });
  const snapshot = p => ({ exists: records.has(p), data: () => records.has(p) ? structuredClone(records.get(p)) : undefined });
  const write = (p, data, options) => {
    const next = options?.merge ? { ...(records.get(p) || {}) } : {};
    for (const [key, value] of Object.entries(data)) next[key] = value?.increment !== undefined ? (next[key] || 0) + value.increment : value;
    records.set(p, next);
  };
  const db = { doc: ref, collection: p => ({doc: id => ref(`${p}/${id}`)}), runTransaction: fn => {
    const result = queue.then(async () => {
      const writes = [];
      const result = await fn({get: async r => snapshot(r.path), set: (r, data, options) => writes.push([r.path, data, options])});
      writes.forEach(args => write(...args)); return result;
    });
    queue = result.catch(() => {}); return result;
  }};
  class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
  const user = {uid: 'test-user', email: 'test@example.com', displayName: 'Tester'};
  const razorpay = {
    createRazorpayOrder: async input => ({ id: `order-${records.size}`, amount: input.amount, currency: input.currency, status: 'created' }),
    verifyRazorpayOrderSignature: input => input.signature === 'valid',
    fetchRazorpayOrder: async input => ({ ...records.get(`billing_razorpay_live_orders/${input.orderId}`), status: 'paid' }),
  };
  function load(relative) {
    const file = path.resolve(root, relative);
    if (cache.has(file)) return cache.get(file);
    const exports = {};
    cache.set(file, exports);
    let source = fs.readFileSync(file, 'utf8');
    if (file.endsWith('billingController.ts')) source += '\nexport { applyRazorpayOrderEntitlement, getLiveOrderPricing };';
    const code = ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS}}).outputText;
    const requireMock = id => {
      if (id === 'firebase-admin/firestore') return {FieldValue: {serverTimestamp: () => 'timestamp', increment: n => ({increment: n})}, Timestamp: class Timestamp {}};
      if (id === 'firebase-functions/v2/https') return {HttpsError};
      if (id.endsWith('/utils/auth.js')) return {db, requireAuth: req => {if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in'); return user;}};
      if (id.endsWith('/services/razorpayTestService.js')) return razorpay;
      if (id.endsWith('/controllers/usageController.js') || id === './usageController.js') return {ensureUsageDocuments: async () => {
        const usage = load('utils/usage.ts'); const refs = usage.getUserRefs(user.uid);
        return {monthKey: refs.usagePath.split('/').pop(), subscription: usage.materializeSubscription(records.get(refs.subscriptionPath)), usage: usage.materializeUsage(records.get(refs.usagePath)), freeTrialUsage: {sttSecondsUsed: 0, promptCount: 0, screenshotCount: 0}};
      }};
      if (id.startsWith('node:')) return require(id);
      if (id.startsWith('.')) {
        const resolved = path.resolve(path.dirname(file), id.replace(/\.js$/, '.ts'));
        return load(path.relative(root, resolved));
      }
      return require(path.resolve(__dirname, '../functions/node_modules', id));
    };
    vm.runInNewContext(code, {exports, require: requireMock, console, process, Buffer, Date, URL, fetch, setTimeout, clearTimeout}, {filename: file});
    return exports;
  }
  // Assistant imports service implementations, but none is called by usage tracking.
  const plans = load('config/plans.ts'); const usage = load('utils/usage.ts');
  const billing = load('controllers/billingController.ts'); const assistant = load('controllers/assistantController.ts');
  const refs = usage.getUserRefs(user.uid);
  records.set(refs.usagePath, {sttSecondsUsed: 0, monthKey: refs.usagePath.split('/').pop()});
  records.set(refs.userPath, {});
  const activate = (id, orderId = `order-${id}`) => billing.applyRazorpayOrderEntitlement({uid: user.uid, email: user.email, orderId, paymentId: `pay-${orderId}`, mappedPlan: {planId: id, interval: plans.NEW_PAID_PLANS[id].interval}, amount: plans.NEW_PAID_PLANS[id].amount, currency: 'INR', providerPayload: {}});
  return {records, plans, usage, billing, assistant, refs, user, activate};
}

test('catalog publishes exactly the requested INR and USD prices and intervals', () => {
  const h = harness(); const prices = h.billing.getLiveBillingPlansController().data.prices;
  assert.deepEqual(Array.from(h.billing.getLiveBillingPlansController().data.currencies), ['INR','USD']);
  assert.equal(prices.length, 10);
  for (const [currency, amounts] of [['INR', [49900,149900,349900,799900,1949900]], ['USD', [599,1699,3999,8999,21999]]]) {
    const rows = prices.filter(p => p.currency === currency);
    assert.deepEqual(Array.from(rows, p => p.amountSubunits), amounts);
    assert.deepEqual(Array.from(rows, p => p.interval), ['hour','hour','month','quarter','year']);
  }
  assert.equal(prices.find(p=>p.planId==='hour3' && p.currency==='USD').displayPrice, '$5.99');
  assert.equal(prices.find(p=>p.planId==='annual200' && p.currency==='USD').displayMonthlyPrice, '$18.33');
});
test('checkout rejects tampered interval, old products and unsupported currency', async () => {
  const h = harness();
  for (const data of [{planId:'hour3', interval:'year'}, {planId:'plus', interval:'month'}, {planId:'monthly200', interval:'month', currency:'EUR'}]) {
    await assert.rejects(h.billing.createRazorpayLiveOrderController({auth: {}, data}, {keyId:'test', keySecret:'test'}), err => err.code === 'invalid-argument');
  }
});
test('USD checkout uses server cents and verifies the same allowance as INR', async () => {
  for (const [id, cents] of [['hour3',599],['hour10',1699],['monthly200',3999],['quarterly200',8999],['annual200',21999]]) {
    const h = harness();
    const order = await h.billing.createRazorpayLiveOrderController({auth:{},data:{planId:id,interval:h.plans.NEW_PAID_PLANS[id].interval,currency:'USD',amount:1}}, {keyId:'test',keySecret:'test'});
    assert.equal(order.data.amount,cents);
    assert.equal(order.data.currency,'USD');
    await h.billing.verifyRazorpayLiveOrderPaymentController({auth:{},data:{razorpay_order_id:order.data.orderId,razorpay_payment_id:'pay-usd',razorpay_signature:'valid'}}, {keyId:'test',keySecret:'test'});
    assert.equal(h.records.get(h.refs.subscriptionPath).sttSecondsLimit, h.plans.NEW_PAID_PLANS[id].hours * 3600);
  }
});
test('exhausted hourly balances can buy new hourly hours or switch to monthly in either currency', async () => {
  for (const currency of ['INR','USD']) {
    for (const id of ['hour3','hour10','monthly200','quarterly200']) {
      const h = harness(); await h.activate('hour3');
      h.records.get(h.refs.subscriptionPath).planSttSecondsUsed = 10800;
      assert.equal(h.usage.buildPlanStatus(h.usage.materializeSubscription(h.records.get(h.refs.subscriptionPath)),h.usage.materializeUsage()).remaining.sttSeconds,0);
      const env = {keyId:'test',keySecret:'test'};
      const order = await h.billing.createRazorpayLiveOrderController({auth:{},data:{planId:id,interval:h.plans.NEW_PAID_PLANS[id].interval,currency}},env);
      await h.billing.verifyRazorpayLiveOrderPaymentController({auth:{},data:{razorpay_order_id:order.data.orderId,razorpay_payment_id:'pay-new',razorpay_signature:'valid'}},env);
      const sub = h.usage.materializeSubscription(h.records.get(h.refs.subscriptionPath));
      assert.equal(sub.plan,id);
      assert.equal(h.usage.buildPlanStatus(sub,h.usage.materializeUsage()).remaining.sttSeconds,h.plans.NEW_PAID_PLANS[id].hours*3600);
    }
  }
});
test('hourly topups preserve remaining credits and payment replay grants nothing twice', async () => {
  const h = harness(); await h.activate('hour3');
  let sub = h.records.get(h.refs.subscriptionPath); sub.planSttSecondsUsed = 3600;
  await h.activate('hour10');
  sub = h.usage.materializeSubscription(h.records.get(h.refs.subscriptionPath));
  assert.equal(sub.sttSecondsLimit, 13 * 3600);
  assert.equal(h.usage.buildPlanStatus(sub, h.usage.materializeUsage()).remaining.sttSeconds, 12 * 3600);
  await h.activate('hour10');
  assert.equal(h.records.get(h.refs.subscriptionPath).prepaidSecondsGranted, 13 * 3600);
  // Calendar usage rollover does not replenish hourly credits.
  assert.equal(h.usage.getPlanPeriodUsage(sub, h.usage.materializeUsage({monthKey:'2099-01'})).sttSecondsUsed, 3600);
});
test('monthly, quarterly and yearly grant only 200 hours with calendar-month expiry', async () => {
  for (const id of ['monthly200', 'quarterly200', 'annual200']) {
    const h = harness(); await h.activate(id);
    const sub = h.usage.materializeSubscription(h.records.get(h.refs.subscriptionPath));
    assert.equal(sub.sttSecondsLimit, 720000);
    assert.equal(sub.expiresAt, h.usage.addBillingMonths(new Date(sub.startedAt), h.plans.NEW_PAID_PLANS[id].months).toISOString());
    sub.planSttSecondsUsed = 720000;
    assert.equal(h.usage.buildPlanStatus(sub, h.usage.materializeUsage()).remaining.sttSeconds, 0);
    sub.usageWindowStart = '2000-01-01T00:00:00.000Z';
    assert.equal(h.usage.buildPlanStatus(sub, h.usage.materializeUsage()).remaining.sttSeconds, 720000);
  }
});
test('billing anniversaries handle leap years, month ends and no early calendar reset', () => {
  const h = harness(); const start = new Date('2024-01-31T10:00:00.000Z');
  assert.equal(h.usage.addBillingMonths(start, 1).toISOString(), '2024-02-29T10:00:00.000Z');
  assert.equal(h.usage.addBillingMonths(start, 2).toISOString(), '2024-03-31T10:00:00.000Z');
  const sub = h.usage.materializeSubscription({plan:'annual200', startedAt:start.toISOString(), billingInterval:'year'});
  assert.equal(h.usage.getListeningWindowStart(sub, new Date('2024-02-01T10:00:00Z')), start.toISOString());
  assert.equal(h.usage.getListeningWindowStart(sub, new Date('2024-02-29T10:00:00Z')), '2024-02-29T10:00:00.000Z');
});
test('transactional metering is idempotent, consumes final seconds and blocks exhaustion', async () => {
  const h = harness(); await h.activate('hour3');
  const sub = h.records.get(h.refs.subscriptionPath); sub.planSttSecondsUsed = 10795;
  const first = await h.assistant.trackSttUsageForAuthenticatedUser(h.user, {durationSeconds:10, reportId:'report-1'});
  assert.equal(first.success, true); assert.equal(first.remaining.sttSecondsRemaining, 0);
  assert.equal(h.records.get(h.refs.subscriptionPath).planSttSecondsUsed, 10800);
  const duplicate = await h.assistant.trackSttUsageForAuthenticatedUser(h.user, {durationSeconds:10, reportId:'report-1'});
  assert.equal(duplicate.success, true); assert.equal(h.records.get(h.refs.subscriptionPath).planSttSecondsUsed, 10800);
  const failed = await h.assistant.trackSttUsageForAuthenticatedUser(h.user, {durationSeconds:1, reportId:'report-2'});
  assert.equal(failed.success, false);
  await assert.rejects(h.assistant.trackSttUsageForAuthenticatedUser(h.user, {durationSeconds:Infinity}), err => err.code === 'invalid-argument');
});
test('concurrent usage reports cannot exceed the purchased balance', async () => {
  const h = harness(); await h.activate('hour3'); h.records.get(h.refs.subscriptionPath).planSttSecondsUsed = 10785;
  await Promise.all([1,2,3].map(i => h.assistant.trackSttUsageForAuthenticatedUser(h.user, {durationSeconds:10, reportId:`parallel-${i}`})));
  assert.equal(h.records.get(h.refs.subscriptionPath).planSttSecondsUsed, 10800);
});
test('legacy subscribers keep their existing limits', () => {
  const h = harness(); assert.equal(h.usage.materializeSubscription({plan:'plus'}).sttSecondsLimit, 36000);
  assert.equal(h.usage.materializeSubscription({plan:'pro'}).sttSecondsLimit, Number.MAX_SAFE_INTEGER);
});

test('verified checkout grants the new product and rejects invalid signature/owner/amount', async () => {
  const env = {keyId:'test', keySecret:'test'};
  for (const fault of [null, 'signature', 'owner', 'amount']) {
    const h = harness();
    const order = await h.billing.createRazorpayLiveOrderController({auth:{}, data:{planId:'annual200',interval:'year',currency:'INR'}}, env);
    const orderId = order.data.orderId;
    assert.equal(order.data.amount,1949900);
    const data = {razorpay_order_id:orderId,razorpay_payment_id:'pay-test',razorpay_signature:fault === 'signature' ? 'invalid' : 'valid'};
    if (fault === 'owner') h.records.get(`billing_razorpay_live_orders/${orderId}`).uid = 'another-user';
    if (fault === 'amount') h.records.get(`billing_razorpay_live_orders/${orderId}`).amount = 1;
    if (fault) await assert.rejects(h.billing.verifyRazorpayLiveOrderPaymentController({auth:{},data},env));
    else {
      await h.billing.verifyRazorpayLiveOrderPaymentController({auth:{},data},env);
      assert.equal(h.records.get(h.refs.subscriptionPath).plan,'annual200');
      assert.equal(h.records.get(h.refs.subscriptionPath).sttSecondsLimit,720000);
      await h.billing.verifyRazorpayLiveOrderPaymentController({auth:{},data},env);
      assert.equal(h.records.get(h.refs.subscriptionPath).sttSecondsLimit,720000);
    }
  }
});
test('paid order access expires while hourly packs have no time-based expiry', async () => {
  const h = harness(); await h.activate('quarterly200');
  const sub = h.records.get(h.refs.subscriptionPath);
  sub.expiresAt = '2000-01-01T00:00:00.000Z';
  assert.equal(h.usage.isExpiredLiveOrderEntitlement(sub),true);
  await h.activate('hour3');
  assert.equal(h.records.get(h.refs.subscriptionPath).expiresAt,null);
  assert.equal(h.usage.isExpiredLiveOrderEntitlement(h.records.get(h.refs.subscriptionPath)),false);
});
