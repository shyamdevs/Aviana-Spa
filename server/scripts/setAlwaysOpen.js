/*
 * One-off: makes an EXISTING database run 24 hours a day, 7 days a week.
 *   - Settings: opening 00:00, closing 24:00
 *   - Every therapist: works all 7 days, shift 00:00-24:00
 * Existing bookings are not touched. Safe to re-run. Preview first with --dry-run.
 *
 *   npm --prefix server run migrate:always-open -- --dry-run
 *   npm --prefix server run migrate:always-open
 *
 * To go back to limited hours later, change them in Admin > Settings and Admin > Therapists.
 */
import mongoose from 'mongoose';
import '../config/env.js';
import { connectDB } from '../config/db.js';
import Setting from '../models/Setting.js';
import Therapist from '../models/Therapist.js';
import { ALL_DAYS, DEFAULT_CLOSING, DEFAULT_OPENING, DEFAULT_SHIFT_END, DEFAULT_SHIFT_START } from '../utils/availability.js';

const dryRun = process.argv.includes('--dry-run');
await connectDB();

try {
  const settings = await Setting.findOne({ key: 'global' }).select('openingTime closingTime').lean();
  const therapists = await Therapist.find().select('name workingDays shiftStart shiftEnd').lean();
  const needsChange = therapists.filter((t) =>
    t.shiftStart !== DEFAULT_SHIFT_START || t.shiftEnd !== DEFAULT_SHIFT_END
    || ALL_DAYS.some((day) => !(t.workingDays || []).includes(day)));

  console.log(`Current spa hours: ${settings?.openingTime ?? '(not set)'} - ${settings?.closingTime ?? '(not set)'}`);
  console.log(`Therapists: ${therapists.length} total, ${needsChange.length} need updating`);
  for (const t of needsChange) console.log(`  - ${t.name}: ${t.shiftStart}-${t.shiftEnd}, days [${(t.workingDays || []).join(',')}]`);

  if (dryRun) {
    console.log('\n--dry-run: nothing was changed.');
  } else {
    await Setting.updateOne({ key: 'global' }, { $set: { openingTime: DEFAULT_OPENING, closingTime: DEFAULT_CLOSING } }, { upsert: true });
    const result = await Therapist.updateMany({}, { $set: { workingDays: ALL_DAYS, shiftStart: DEFAULT_SHIFT_START, shiftEnd: DEFAULT_SHIFT_END } });
    console.log(`\nDone. Spa is now open ${DEFAULT_OPENING}-${DEFAULT_CLOSING}; ${result.modifiedCount} therapist(s) updated to work all 7 days, 24 hours.`);
    console.log('Customers see the new hours within about a minute (catalogue cache), booking slots immediately.');
  }
} finally {
  await mongoose.disconnect();
}
