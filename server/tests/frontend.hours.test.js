import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { describeShift, groupSlots, isAllDay } from '../../src/utils/hours.js';

const slot = (time) => ({ time, therapistIds: [] });

test('describeShift: 24/7 reads naturally; restricted shifts keep days and hours', () => {
  assert.equal(describeShift({ shiftStart: '00:00', shiftEnd: '24:00', workingDays: [0, 1, 2, 3, 4, 5, 6] }), 'Every day, 24 hours');
  assert.equal(describeShift({ shiftStart: '09:00', shiftEnd: '20:00', workingDays: [1, 2, 3, 4, 5, 6] }), 'Mon, Tue, Wed, Thu, Fri, Sat · 09:00–20:00');
  assert.equal(describeShift({ shiftStart: '00:00', shiftEnd: '24:00', workingDays: [1, 2] }), 'Mon, Tue, 24 hours');
  assert.equal(describeShift(undefined), 'Every day, 24 hours', 'missing data defaults to the 24/7 schedule');
  assert.equal(describeShift({ workingDays: [] }), 'No fixed days, 24 hours');
  assert.equal(isAllDay('00:00', '24:00'), true);
  assert.equal(isAllDay('00:00', '23:59'), false);
  assert.equal(isAllDay('09:00', '24:00'), false);
});

test('groupSlots: a full 24-hour day is split into parts of the day, in order, each slot exactly once', () => {
  const all = [];
  for (let m = 0; m < 24 * 60; m += 15) all.push(slot(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`));
  const groups = groupSlots(all);
  assert.deepEqual(groups.map((g) => g.label), ['Overnight', 'Morning', 'Afternoon', 'Evening', 'Late evening']);
  assert.equal(groups.reduce((n, g) => n + g.slots.length, 0), all.length);
  assert.equal(groups[0].slots[0].time, '00:00');
  assert.equal(groups[0].slots.at(-1).time, '05:45');
  assert.equal(groups[1].slots[0].time, '06:00');
  assert.equal(groups[3].slots.at(-1).time, '20:45');
  assert.equal(groups[4].slots.at(-1).time, '23:45');
});

test('groupSlots: empty groups are dropped, and bad input is harmless', () => {
  assert.deepEqual(groupSlots([slot('09:00'), slot('10:30'), slot('19:00')]).map((g) => [g.label, g.slots.length]), [['Morning', 2], ['Evening', 1]]);
  assert.deepEqual(groupSlots([]), []);
  assert.deepEqual(groupSlots(undefined), []);
  assert.deepEqual(groupSlots([{ time: 'nonsense' }, null]), []);
});

// ------------------------------------------------------------------ the edited screens still load
register('./support/jsxLoader.mjs', import.meta.url);

test('edited pages compile and import without errors (BookingForm, Admin lists, Therapist detail, Contact data)', async () => {
  const { hours } = await import('../../src/pages/Contact/contactData.js');
  assert.deepEqual(hours, [{ days: 'Every day', time: 'Open 24 hours' }]);
  for (const file of ['pages/Booking/BookingForm.jsx', 'pages/Admin/AdminListPages.jsx', 'pages/Therapists/TherapistDetail.jsx']) {
    await assert.doesNotReject(() => import(`../../src/${file}`), file); // fully evaluates the module and its imports
  }
});
