import './support/env.js';
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startHarness, seedCatalog } from './support/harness.js';
import { oid } from './support/fakeDb.js';
import { ALL_DAYS, assertValidWindow, fromMinutes, toMinutes } from '../utils/availability.js';
import Service from '../models/Service.js';
import Booking from '../models/Booking.js';
import AvailabilityBlock from '../models/AvailabilityBlock.js';
import Therapist from '../models/Therapist.js';
import Setting from '../models/Setting.js';
import ActivityLog from '../models/ActivityLog.js';

const SUNDAY = '2099-01-04'; // verified: getUTCDay() === 0
const MONDAY = '2099-01-05';

// ------------------------------------------------------------------ pure time rules
test('toMinutes accepts 24:00 as end-of-day and still rejects invalid times', () => {
  assert.equal(toMinutes('00:00'), 0);
  assert.equal(toMinutes('23:59'), 23 * 60 + 59);
  assert.equal(toMinutes('24:00'), 1440);
  for (const bad of ['24:01', '25:00', '9:00', '09:60', '', null, undefined, '9am', '12:5', '-1:00']) assert.ok(Number.isNaN(toMinutes(bad)), String(bad));
  assert.equal(fromMinutes(0), '00:00');
  assert.equal(fromMinutes(23 * 60 + 45), '23:45');
});

test('assertValidWindow: end must be after start; 24:00 only as the end', () => {
  assert.doesNotThrow(() => assertValidWindow('00:00', '24:00'));
  assert.doesNotThrow(() => assertValidWindow('06:30', '22:15'));
  for (const [a, b] of [['09:00', '09:00'], ['20:00', '09:00'], ['24:00', '24:00'], ['9am', '5pm'], ['00:00', '24:01'], ['', '10:00']]) {
    assert.throws(() => assertValidWindow(a, b), (e) => e.status === 400, `${a}-${b}`);
  }
});

// ------------------------------------------------------------------ the real availability endpoint
let h;
before(async () => { h = await startHarness(); });
after(async () => { await h.close(); });

const serviceId = oid();
const therapist = (over = {}) => ({
  _id: oid(), name: 'Anita', gender: 'female', isActive: true, offersHomeService: true, services: [serviceId], rating: 4.8,
  workingDays: ALL_DAYS, shiftStart: '00:00', shiftEnd: '24:00', ...over,
});

function stubAvailability({ duration = 60, setting, therapists, bookings = [], blocks = [] }) {
  const q = (value) => ({ select: () => Promise.resolve(value), sort: () => Promise.resolve(value), then: (r, j) => Promise.resolve(value).then(r, j) });
  Service.findOne = async () => ({ _id: serviceId, title: 'Swedish Massage', slug: 's', category: 'Massage', durationMinutes: duration, spaPrice: 2000, homePrice: 2400, homeServiceAvailable: true, isActive: true });
  Setting.findOne = () => Promise.resolve(setting);
  Therapist.find = () => q(therapists);
  // releaseExpiredBookings() also calls Booking.find (for stale payment_pending rows): answer it with none.
  Booking.find = (filter) => q(filter?.bookingStatus === 'payment_pending' ? [] : bookings);
  AvailabilityBlock.find = () => q(blocks);
}
const slotsFor = async (date) => {
  const r = await h.call('GET', `/api/availability?serviceId=${serviceId}&date=${date}`);
  assert.equal(r.status, 200, r.text);
  return r.json.slots.map((s) => s.time);
};
beforeEach(() => h.reset());

test('24/7: slots run from 00:00 to the last start that still ends by midnight, on a SUNDAY too', async () => {
  stubAvailability({ setting: { openingTime: '00:00', closingTime: '24:00', slotIntervalMinutes: 15 }, therapists: [therapist()] });
  const sunday = await slotsFor(SUNDAY);
  assert.equal(sunday[0], '00:00');
  assert.equal(sunday.at(-1), '23:00'); // 60-minute service must end by 24:00
  assert.equal(sunday.length, (24 * 60 - 60) / 15 + 1);
  assert.ok(sunday.includes('03:15') && sunday.includes('12:00') && sunday.includes('22:45'));
  assert.deepEqual(await slotsFor(MONDAY), sunday);
});

test('24/7: a longer treatment stops early enough to finish by midnight', async () => {
  stubAvailability({ duration: 90, setting: { openingTime: '00:00', closingTime: '24:00', slotIntervalMinutes: 30 }, therapists: [therapist()] });
  const slots = await slotsFor(MONDAY);
  assert.equal(slots.at(-1), '22:30');
  assert.equal(slots.length, (24 * 60 - 90) / 30 + 1);
});

test('control: the OLD hours (09:00-20:00, Mon-Sat) give no Sunday slots and no night slots', async () => {
  const old = therapist({ workingDays: [1, 2, 3, 4, 5, 6], shiftStart: '09:00', shiftEnd: '20:00' });
  stubAvailability({ setting: { openingTime: '09:00', closingTime: '20:00', slotIntervalMinutes: 15 }, therapists: [old] });
  assert.deepEqual(await slotsFor(SUNDAY), []);
  const monday = await slotsFor(MONDAY);
  assert.equal(monday[0], '09:00');
  assert.equal(monday.at(-1), '19:00');
});

test('a spa with no Setting document at all defaults to 24 hours (not 9 to 8)', async () => {
  stubAvailability({ setting: null, therapists: [therapist()] });
  const slots = await slotsFor(MONDAY);
  assert.equal(slots[0], '00:00');
  assert.equal(slots.at(-1), '23:00');
});

test('24/7 still respects existing bookings and admin blocks (no double booking at night)', async () => {
  const t = therapist();
  stubAvailability({
    setting: { openingTime: '00:00', closingTime: '24:00', slotIntervalMinutes: 60 },
    therapists: [t],
    bookings: [{ therapist: t._id, time: '02:00', durationMinutes: 60 }],
    blocks: [{ therapist: null, startTime: '23:00', endTime: '24:00' }], // admin blocks the last hour for everyone
  });
  const slots = await slotsFor(MONDAY);
  assert.ok(!slots.includes('02:00'), 'booked night slot must not be offered');
  assert.ok(slots.includes('01:00') && slots.includes('03:00'));
  assert.ok(!slots.includes('23:00'), 'a block ending at 24:00 is honoured');
  assert.ok(slots.includes('22:00'));
});

test('a therapist with a restricted shift is only offered inside it, even when the spa is open 24h', async () => {
  const night = therapist({ shiftStart: '20:00', shiftEnd: '24:00' });
  stubAvailability({ setting: { openingTime: '00:00', closingTime: '24:00', slotIntervalMinutes: 60 }, therapists: [night] });
  assert.deepEqual(await slotsFor(MONDAY), ['20:00', '21:00', '22:00', '23:00']);
});

// ------------------------------------------------------------------ admin validation (real controllers)
const adminCtx = { admin: { _id: oid() }, ip: '127.0.0.1' };
const fakeRes = () => { const res = { body: null, json(b) { this.body = b; return this; }, status() { return this; } }; return res; };

test('admin Settings: accepts 00:00-24:00, rejects malformed or reversed hours before saving anything', async () => {
  const { updateSettings } = await import('../controllers/adminController.js');
  let saved = null;
  Setting.findOne = () => ({ select: () => ({ lean: async () => ({ openingTime: '09:00', closingTime: '20:00' }) }) });
  Setting.findOneAndUpdate = async (filter, payload) => { saved = payload; return { _id: oid(), ...payload }; };
  ActivityLog.create = async () => ({});

  for (const body of [{ openingTime: '9am' }, { closingTime: '08:00' }, { openingTime: '24:00', closingTime: '24:00' }, { closingTime: '24:30' }, { openingTime: '21:00' }]) {
    saved = null;
    await assert.rejects(() => updateSettings({ ...adminCtx, body }, fakeRes()), (e) => e.status === 400, JSON.stringify(body));
    assert.equal(saved, null, 'nothing is saved when hours are invalid');
  }
  const res = fakeRes();
  await updateSettings({ ...adminCtx, body: { openingTime: '00:00', closingTime: '24:00' } }, res);
  assert.equal(res.body.success, true);
  assert.deepEqual([saved.openingTime, saved.closingTime], ['00:00', '24:00']);
});

test('admin Therapists: a shift must be a real window; 00:00-24:00 is accepted', async () => {
  const { createTherapist } = await import('../controllers/adminController.js');
  let created = null;
  Therapist.create = async (payload) => { created = payload; return { _id: oid(), ...payload }; };
  ActivityLog.create = async () => ({});
  const base = { name: 'Night Nurse', gender: 'female', specialization: 'Deep tissue', services: [], workingDays: [0, 1, 2, 3, 4, 5, 6] };

  for (const shifts of [{ shiftStart: '9am', shiftEnd: '5pm' }, { shiftStart: '20:00', shiftEnd: '08:00' }, { shiftStart: '24:00', shiftEnd: '24:00' }]) {
    created = null;
    await assert.rejects(() => createTherapist({ ...adminCtx, body: { ...base, ...shifts } }, fakeRes()), (e) => e.status === 400, JSON.stringify(shifts));
    assert.equal(created, null);
  }
  const res = fakeRes();
  await createTherapist({ ...adminCtx, body: { ...base, shiftStart: '00:00', shiftEnd: '24:00' } }, res);
  assert.equal(created.shiftEnd, '24:00');
  assert.deepEqual(created.workingDays, [0, 1, 2, 3, 4, 5, 6]);
});

test('new records are 24/7 by default (schema defaults), so seeded/new data needs no extra setup', () => {
  assert.equal(Setting.schema.path('openingTime').defaultValue, '00:00');
  assert.equal(Setting.schema.path('closingTime').defaultValue, '24:00');
  assert.equal(Therapist.schema.path('shiftStart').defaultValue, '00:00');
  assert.equal(Therapist.schema.path('shiftEnd').defaultValue, '24:00');
  assert.deepEqual([...Therapist.schema.path('workingDays').getDefault()], ALL_DAYS);
});

test('chatbot is told the spa is open 24 hours and describes therapists accordingly', async () => {
  const { buildSnapshot, renderCatalog } = await import('../utils/chatCatalog.js');
  seedCatalog(h.db);
  const open = { ...h.db.catalog.setting, openingTime: '00:00', closingTime: '24:00' };
  const service = h.db.catalog.services[0];
  const text = renderCatalog(buildSnapshot({
    services: [service], extras: [], bookingOption: null, setting: open,
    therapists: [{ ...h.db.catalog.therapists[0], workingDays: ALL_DAYS, shiftStart: '00:00', shiftEnd: '24:00' }],
  }), 'hours');
  assert.match(text, /Booking hours: open 24 hours a day \(India time\)/);
  assert.match(text, /usually every day, 24 hours/);
  assert.doesNotMatch(text, /09:00-20:00/);
});
