/*
 * Aviana Care self-check. Tells you exactly why the chatbot would fail:
 *   npm --prefix server run check:ai            (key + models + database catalogue)
 *   npm --prefix server run check:ai -- --no-db (skip the database part)
 * Never prints the API key.
 */
import mongoose from 'mongoose';
import '../config/env.js';
import { aiConfig, modelAdvisory } from '../config/ai.js';
import { probeModel } from '../utils/gemini.js';

const ok = (m) => console.log(`  \u2705 ${m}`);
const bad = (m) => console.log(`  \u274C ${m}`);
const info = (m) => console.log(`  \u2022 ${m}`);
let failed = false;

console.log('\nAviana Care self-check\n');
console.log('Configuration');
if (aiConfig.apiKey) ok(`GEMINI_API_KEY is set (${aiConfig.apiKey.length} characters, starts with "${aiConfig.apiKey.slice(0, 4)}")`);
else { bad('GEMINI_API_KEY is NOT set. Put it in server/.env and restart.'); failed = true; }
info(`Models tried in order: ${aiConfig.models.join(' -> ')}`);
info(`Timeout per attempt ${aiConfig.attemptTimeoutMs}ms, total deadline ${aiConfig.totalDeadlineMs}ms, maxOutputTokens ${aiConfig.maxOutputTokens}`);
info(`Thinking setting for ${aiConfig.models[0]}: ${JSON.stringify(aiConfig.thinkingFor(aiConfig.models[0]))}`);
const advisory = modelAdvisory();
if (advisory) bad(advisory);

if (aiConfig.apiKey) {
  console.log('\nGemini');
  let anyWorks = false;
  for (const model of aiConfig.models) {
    const r = await probeModel(model);
    if (r.ok) { ok(`${model} answered in ${r.ms}ms ("${r.text}")`); anyWorks = true; }
    else {
      bad(`${model} failed after ${r.ms}ms: ${r.kind}${r.status ? ` (HTTP ${r.status})` : ''}`);
      if (r.detail) info(`Google said: ${r.detail}`);
      if (r.advice) info(`Fix: ${r.advice}`);
    }
  }
  if (!anyWorks) failed = true;
}

if (!process.argv.includes('--no-db')) {
  console.log('\nDatabase catalogue');
  if (!process.env.MONGO_URI) {
    bad('MONGO_URI is not set; skipping.');
    failed = true;
  } else {
    try {
      const { connectDB } = await import('../config/db.js');
      const { getCatalogSnapshot, renderCatalog } = await import('../utils/chatCatalog.js');
      await connectDB();
      const snapshot = await getCatalogSnapshot();
      if (!snapshot) { bad('Could not load the catalogue from MongoDB.'); failed = true; }
      else {
        ok(`Loaded ${snapshot.services.length} services, ${snapshot.extras.length} add-ons, ${snapshot.therapists.length} therapists`);
        const text = renderCatalog(snapshot, 'price');
        info(`Prompt data size: ${text.length} characters (~${Math.round(text.length / 4)} tokens)`);
        const missing = snapshot.services.filter((s) => !s.spaPrice || !s.durationMinutes);
        if (missing.length) info(`These services have a missing price or duration (the bot will say "team can confirm"): ${missing.map((s) => s.title).join(', ')}`);
        if (!snapshot.services.length) bad('No ACTIVE services found: the bot will have nothing to quote.');
      }
    } catch (error) {
      bad(`Database check failed: ${error?.name}: ${String(error?.message).slice(0, 200)}`);
      failed = true;
    } finally {
      await mongoose.disconnect().catch(() => {});
    }
  }
}

console.log(failed ? '\nResult: problems found (see \u274C above).\n' : '\nResult: everything looks good.\n');
process.exit(failed ? 1 : 0);
