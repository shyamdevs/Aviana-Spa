// Not part of `npm test`. Run: node tests/bench/overhead.bench.js
// Measures ONLY this server's own overhead per chat request with Gemini + MongoDB stubbed to
// zero latency. Real-world latency = this + MongoDB round trips + Gemini time (see Vercel logs).
import '../support/env.js';
import { startHarness } from '../support/harness.js';
import { metricsSnapshot } from '../../utils/aiMetrics.js';

const log = console.log;
const h = await startHarness();
// Silence the per-request JSON log line during the loop.
console.log = () => {};
const a = h.addUser();
const timings = [];
for (let i = 0; i < 300; i += 1) {
  const t = performance.now();
  const r = await h.call('POST', '/api/chat', { cookie: a.cookie, body: { message: `What is the price of Swedish massage? #${i}`, requestId: `bench-${String(i).padStart(6, '0')}` } });
  timings.push(performance.now() - t);
  if (r.status !== 200) throw new Error(`unexpected ${r.status}`);
}
console.log = log;
timings.sort((x, y) => x - y);
const q = (p) => timings[Math.floor((p / 100) * timings.length)].toFixed(1);
log(`requests=300 (authenticated, warm catalogue cache, in-process HTTP incl. client)`);
log(`end-to-end p50=${q(50)}ms p95=${q(95)}ms p99=${q(99)}ms`);
const m = metricsSnapshot();
log(`server-measured: total p50=${m.totalMsP50}ms p95=${m.totalMsP95}ms | own overhead (total - gemini) p50=${m.ownOverheadMsP50}ms p95=${m.ownOverheadMsP95}ms`);
log(`catalogue DB queries for 300 requests: ${h.db.catalogQueries} (cache TTL ${process.env.AI_CATALOG_CACHE_TTL_SECONDS || 60}s)`);
const sys = h.gemini.calls.at(-1).body.systemInstruction.parts[0].text;
log(`system prompt size: ${sys.length} chars (~${Math.round(sys.length / 4)} tokens) for ${h.db.catalog.services.length} services`);
await h.close();
