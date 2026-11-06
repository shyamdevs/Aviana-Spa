import './support/razorpayEnv.js';
import test, { before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { startSecurityHarness } from './support/secHarness.js';
import { login, resetClock, seedUser } from './support/helpers.js';

let h;
before(async () => { h = await startSecurityHarness(); });
after(async () => { await h.close(); });
beforeEach(() => { h.reset(); resetClock(); });
const oid = () => new mongoose.Types.ObjectId();

async function world() {
  const a = await seedUser(h); const b = await seedUser(h, { email: 'ben@example.com', fullName: 'Ben Roy' });
  const booking = { _id: oid(), user: a._id, customerEmail: a.email, customerName: 'Asha', date: new Date(Date.now() + 864e5), time: '10:00', bookingStatus: 'payment_pending', paymentStatus: 'PENDING', paymentType: 'FULL', totalAmount: 2000, price: 2000, paidAmount: 0, remainingAmount: 2000, service: { title: 'Swedish' }, therapist: { name: 'Anita' }, slotKeys: [] };
  h.mem.store.Booking.push(booking);
  const payment = { _id: oid(), booking: booking._id, user: a._id, provider: 'razorpay', orderId: 'order_A1', razorpayOrderId: 'order_A1', amount: 2000, currency: 'INR', status: 'created', paymentPurpose: 'INITIAL', paymentType: 'FULL', meta: { secretNote: 'x' }, refundAmount: 0, refundInProgress: false };
  h.mem.store.Payment.push(payment);
  return { a, b, booking, payment, ca: (await login(h)).c, cb: (await login(h, 'ben@example.com')).c };
}
const sign = (body) => crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(body).digest('hex');
const hook = (event, extra = {}, id = `evt_${crypto.randomUUID()}`, amount = 200000) => {
  const raw = JSON.stringify({ id, event, payload: { payment: { entity: { id: 'pay_X1', order_id: 'order_A1', amount, currency: 'INR', status: 'captured', method: 'upi', ...extra } } } });
  return { raw, id, headers: { 'x-razorpay-signature': sign(raw), 'x-razorpay-event-id': id } };
};
const send = (w, over = {}) => h.call('POST', '/api/payments/webhook', { raw: w.raw, headers: { ...w.headers, ...over }, csrf: false });

test('12/13. users cannot read or act on ANOTHER user\'s booking or payment', async () => {
  const { booking, cb, ca } = await world();
  assert.equal((await h.call('GET', `/api/bookings/${booking._id}`, { client: cb })).status, 404);
  assert.equal((await h.call('PATCH', `/api/bookings/${booking._id}/cancel`, { client: cb, body: {} })).status, 404);
  assert.equal((await h.call('POST', '/api/payments/create-order', { client: cb, body: { bookingId: String(booking._id) } })).status, 404);
  const mine = await h.call('GET', '/api/payments/my', { client: cb }); assert.deepEqual(mine.json.payments, []);
  const sig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update('order_A1|pay_X1').digest('hex');
  assert.equal((await h.call('POST', '/api/payments/verify', { client: cb, body: { razorpay_order_id: 'order_A1', razorpay_payment_id: 'pay_X1', razorpay_signature: sig } })).status, 404, 'valid signature but not the owner');
  const own = await h.call('GET', '/api/payments/my', { client: ca });
  assert.equal(own.json.payments.length, 1); assert.equal(own.json.payments[0].meta, undefined, 'internal meta is not exposed');
});

test('22. payment signature manipulation is rejected and changes nothing', async () => {
  const { ca, payment } = await world();
  const v = (sig, order = 'order_A1') => h.call('POST', '/api/payments/verify', { client: ca, body: { razorpay_order_id: order, razorpay_payment_id: 'pay_X1', razorpay_signature: sig } });
  assert.equal((await v('0'.repeat(64))).status, 400);
  assert.equal((await v('short')).status, 400);
  assert.equal((await v(crypto.createHmac('sha256', 'wrong-key').update('order_A1|pay_X1').digest('hex'))).status, 400);
  assert.equal((await v(crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update('order_A1|pay_X1').digest('hex'), 'order_OTHER')).status, 404);
  assert.equal(h.mem.store.Payment.find((p) => p._id === payment._id).status, 'created', 'no state change');
  assert.equal((await h.call('POST', '/api/payments/verify', { client: ca, body: { razorpay_order_id: { $ne: 1 }, razorpay_payment_id: 'p', razorpay_signature: 's' } })).status, 400);
});

test('webhook: signature required (missing, wrong, tampered body) and "payment success" flags from clients are meaningless', async () => {
  const { payment } = await world(); const w = hook('payment.captured');
  assert.equal((await send(w, { 'x-razorpay-signature': '' })).status, 400);
  assert.equal((await send(w, { 'x-razorpay-signature': 'a'.repeat(64) })).status, 400);
  const tampered = { ...w, raw: w.raw.replace('200000', '1') };
  assert.equal((await h.call('POST', '/api/payments/webhook', { raw: tampered.raw, headers: w.headers, csrf: false })).status, 400);
  assert.equal(h.mem.store.Payment.find((p) => p._id === payment._id).status, 'created');
});

test('23. duplicate and concurrent webhook deliveries apply the payment exactly once', async () => {
  const { booking, payment } = await world(); const w = hook('payment.captured');
  const rs = await Promise.all(Array.from({ length: 6 }, () => send(w)));
  assert.ok(rs.every((r) => r.status === 200));
  const b = h.mem.store.Booking.find((x) => x._id === booking._id);
  assert.equal(b.paidAmount, 2000, 'paid exactly once, not 12000'); assert.equal(b.bookingStatus, 'confirmed');
  assert.equal(h.mem.store.Payment.find((p) => p._id === payment._id).status, 'paid');
  assert.equal(h.mem.store.WebhookEvent.length, 1);
  const replay = await send(w); assert.equal(replay.json.duplicate, true);
  assert.equal(h.mem.store.Booking.find((x) => x._id === booking._id).paidAmount, 2000);
});

test('webhook with a wrong amount or currency is ignored and raises a payment-anomaly alert', async () => {
  const { booking } = await world();
  await send(hook('payment.captured', {}, undefined, 100));
  await send(hook('payment.captured', { currency: 'USD' }));
  assert.equal(h.mem.store.Booking.find((x) => x._id === booking._id).paidAmount, 0);
  assert.ok(h.mem.store.SecurityEvent.some((e) => e.type === 'payment_amount_mismatch' && e.severity === 'alert'));
  assert.ok(h.mem.store.SecurityEvent.some((e) => e.type === 'payment_currency_mismatch'));
});

test('client-supplied amount cannot change what is charged (server computes it)', async () => {
  const { ca, booking } = await world();
  const r = await h.call('POST', '/api/payments/create-order', { client: ca, body: { bookingId: String(booking._id), amount: 1, currency: 'USD' } });
  assert.ok(r.status !== 201 || r.json.order?.amount === 200000, 'any order created uses the server amount');
});
