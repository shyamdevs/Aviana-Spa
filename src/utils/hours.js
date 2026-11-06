/*
 * Opening-hours helpers shared by the public pages and the admin screens.
 * "24:00" means midnight at the END of a day (the server accepts it only as a closing/shift end).
 */
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const isAllDay = (start, end) => start === '00:00' && end === '24:00';

function describeDays(days) {
  const list = [...new Set((days || []).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b);
  if (list.length === 7) return 'every day';
  if (!list.length) return 'no fixed days';
  return list.map((d) => DAY_NAMES[d]).join(', ');
}

/** "Every day, 24 hours" or "Mon, Tue, Wed · 09:00–20:00" for a therapist's availability object. */
export function describeShift(availability) {
  const { shiftStart = '00:00', shiftEnd = '24:00', workingDays } = availability || {};
  const days = describeDays(workingDays ?? [0, 1, 2, 3, 4, 5, 6]);
  const text = isAllDay(shiftStart, shiftEnd) ? `${days}, 24 hours` : `${days} · ${shiftStart}–${shiftEnd}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const GROUPS = [
  { key: 'overnight', label: 'Overnight', from: 0, to: 6 },
  { key: 'morning', label: 'Morning', from: 6, to: 12 },
  { key: 'afternoon', label: 'Afternoon', from: 12, to: 17 },
  { key: 'evening', label: 'Evening', from: 17, to: 21 },
  { key: 'late', label: 'Late evening', from: 21, to: 24 },
];

/** Groups booking slots by part of the day so a 24-hour list stays easy to scan. Empty groups are dropped. */
export function groupSlots(slots) {
  const buckets = GROUPS.map((g) => ({ ...g, slots: [] }));
  for (const slot of slots || []) {
    const hour = Number.parseInt(String(slot?.time).slice(0, 2), 10);
    const bucket = buckets.find((g) => hour >= g.from && hour < g.to);
    if (bucket) bucket.slots.push(slot);
  }
  return buckets.filter((g) => g.slots.length);
}
