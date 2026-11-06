/*
 * Privacy-safe operational metrics for Aviana Care. Records only numbers and
 * outcome labels - never message text, replies, user ids, IPs or contact details.
 * Each chat turn emits one JSON log line (searchable in Vercel logs) and updates a
 * small in-memory window so p50/p95 can be computed per instance.
 */
const WINDOW = 200;
const samples = [];
const outcomes = new Map();

export function recordChat({ outcome, totalMs, geminiMs = null, attempts = 0, mode, handoff = false, saved = null }) {
  samples.push({ totalMs, geminiMs });
  if (samples.length > WINDOW) samples.shift();
  outcomes.set(outcome, (outcomes.get(outcome) || 0) + 1);
  console.log(JSON.stringify({ event: 'care_chat', outcome, mode, totalMs, geminiMs, attempts, handoff, saved }));
}

const pct = (sorted, p) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] : null);

export function metricsSnapshot() {
  const total = samples.map((s) => s.totalMs).sort((a, b) => a - b);
  const overhead = samples.filter((s) => s.geminiMs !== null).map((s) => s.totalMs - s.geminiMs).sort((a, b) => a - b);
  return {
    count: samples.length,
    totalMsP50: pct(total, 50),
    totalMsP95: pct(total, 95),
    ownOverheadMsP50: pct(overhead, 50),
    ownOverheadMsP95: pct(overhead, 95),
    outcomes: Object.fromEntries(outcomes),
  };
}

export function resetMetricsForTests() {
  samples.length = 0;
  outcomes.clear();
}
