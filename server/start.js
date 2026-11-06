import app from './app.js';
import { connectDB } from './config/db.js';
import { env, runtimeConfig } from './config/env.js';

if (env.isProduction && !runtimeConfig.ready) { console.error('Refusing to start: unsafe or incomplete production configuration.'); process.exit(1); }
import { releaseExpiredBookings } from './utils/availability.js';

await connectDB();
setInterval(() => releaseExpiredBookings().catch((error) => console.error('Booking cleanup failed', error.message)), 5 * 60 * 1000);
app.listen(env.port, () => console.log(`Aviana API listening on http://localhost:${env.port}`));
