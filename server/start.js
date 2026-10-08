import app from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { releaseExpiredBookings } from './utils/availability.js';

await connectDB();
setInterval(() => releaseExpiredBookings().catch((error) => console.error('Booking cleanup failed', error.message)), 5 * 60 * 1000);
app.listen(env.port, () => console.log(`Aviana API listening on http://localhost:${env.port}`));
