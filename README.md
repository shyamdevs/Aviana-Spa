# Aviana — Full-Stack Luxury Spa Booking Platform

Aviana is an existing luxury spa booking application upgraded into a real MERN-style production application: React/Vite/Tailwind on the client, Express/Mongoose on the server, MongoDB Atlas as the source of truth, secure cookie-based auth, live therapist availability, Razorpay payment verification/refunds, SMTP email, and a separate admin portal.

## What was fixed and completed

The booking retrieval path now scopes every customer query to the authenticated user and returns populated service/therapist information, including therapist photo, gender, specialization and experience. A dedicated `/dashboard/bookings/:id` detail page and responsive booking history states were added.

Therapists are now first-class database records with profile media, bio, experience, specialization, rating, services, working days, shifts, home-service eligibility and active state. Eight seeded fictional therapists (four women, four men) are included with generated fictional professional imagery. Public therapist listing/profile pages, services-page therapist cards and booking selection all read from MongoDB.

Services are fully database-backed on the homepage, public services page, booking flow, detail pages and admin. The admin can create/edit/activate/deactivate/delete safe-to-delete services and therapists and can upload replacement images.

Admin payments now populate customer + booking + nested service/therapist data and support search/filter/pagination plus idempotent full/partial refunds. Dashboard statistics are calculated by MongoDB aggregation/count queries instead of frontend demo numbers.

Availability is validated server-side for therapist working days, shifts, spa hours, home-service eligibility, service duration, blocked dates/times, existing appointments and current India time. A unique therapist/date/slot-key index adds a database-level race-condition guard.

Authentication pages were redesigned with a luxury two-panel visual treatment, password visibility controls, password-strength feedback, validation/error messaging and responsive mobile stacking. Password reset remains tokenized and expiring. Refresh tokens rotate and remain in HTTP-only cookies.

The API layer now centralizes credentials, JSON/FormData handling, environment-based URLs, refresh-on-401 and user-friendly API errors. Admin API calls use the same environment-based API origin.

## Stack

- React 19 + Vite 8
- React Router 7
- Tailwind CSS 4
- Motion + Lucide
- Node.js + Express 5
- MongoDB + Mongoose 8
- HTTP-only cookie auth with access/refresh rotation
- Razorpay
- Nodemailer/SMTP
- Multer with 5MB image validation
- Optional Cloudinary persistent media storage

## Project structure

```text
src/
├── components/
├── pages/
├── layouts/
├── hooks/
├── store/
├── services/
├── utils/
├── routes/
├── assets/
└── App.jsx

server/
├── config/
├── controllers/
├── middleware/
├── models/
├── routes/
├── utils/
├── validators/
├── uploads/
├── app.js
└── start.js
```

## Local setup

Use Node.js 22+.

Frontend terminal:

```powershell
npm install
copy .env.example .env
npm run dev
```

Backend terminal:

```powershell
cd server
npm install
copy .env.example .env
npm run dev
```

Or from the project root for the backend:

```powershell
npm run server:dev
```

The API health URL is `http://localhost:5000/api/health` by default.

## Environment variables

The frontend and backend use separate environment files. Vite reads the frontend `.env` from the project root; the Express server reads `server/.env`.

Create the frontend file from the checked-in template:

```powershell
copy .env.example .env
```

Frontend `.env`:

```env
VITE_API_URL=/api
VITE_RAZORPAY_KEY_ID=rzp_test_...
VITE_HOME_VISIT_FEE=500
VITE_GOOGLE_CLIENT_ID=
```

Create the backend file from the checked-in template:

```powershell
copy server/.env.example server/.env
```

Backend `server/.env`:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/aviana
CLIENT_URL=http://localhost:5173

JWT_ACCESS_SECRET=long-random-secret
JWT_REFRESH_SECRET=different-long-random-secret
ADMIN_JWT_SECRET=another-long-random-secret
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax

RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
GOOGLE_CLIENT_ID=

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=...
SMTP_PASS=...
MAIL_FROM=Aviana <...>

ADMIN_SEED_EMAIL=admin@aviana.local
ADMIN_SEED_PASSWORD=change-this-immediately

HOME_VISIT_FEE=500
CANCELLATION_WINDOW_HOURS=12
RESCHEDULE_WINDOW_HOURS=2
REFUND_PERCENT=100

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

The backend loader explicitly checks `server/.env` for local development and also accepts normal process environment variables for hosted deployments. Environment values are never returned to the browser.

## Seed data

From `server/`:

```powershell
npm run seed
```

Seed creates/updates:

- default admin account from `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD`
- default Aviana global settings
- 8 services
- 8 fictional therapists: Aanya Sharma, Mira Kapoor, Naina Mehta, Rhea Malhotra, Arjun Singh, Kabir Mehta, Aarav Kapoor and Vihaan Sharma

The therapist seed portraits are fictional generated artwork and are stored as project seed media. Replace them with your licensed production imagery from the admin UI as appropriate.

## User booking flow

```text
Home / Services
      ↓
Choose treatment
      ↓
Spa or Home
      ↓
Any / Female / Male therapist
      ↓
Date
      ↓
Live available time
      ↓
Account sign-in / registration
      ↓
Customer details
      ↓
Booking summary
      ↓
Razorpay Checkout
      ↓
Server signature + amount + capture verification
      ↓
Confirmed booking + payment record
      ↓
Confirmation email
      ↓
Dashboard / booking detail / payment history
```

The browser never chooses the final price. The server loads the service, calculates the spa/home price plus configured home-visit fee, validates availability again and only then creates the booking.

## Cancellation and rescheduling

Customer cancellation checks the configured cancellation window. Eligible paid bookings use an idempotent refund lock before calling Razorpay and then update both payment and booking state. Rescheduling checks ownership, eligibility, therapist working day/shift, spa hours, blocked times and overlapping appointments before updating the stored slot keys.

Admin refunds use the same remaining-refund protection and support partial or full amounts without permitting an amount above the remaining refundable balance.

## Admin portal

Admin URL: `/admin/login`

Admin features:

- live dashboard totals and payment/booking health meters
- user search, detail, block/unblock and delete
- booking search/filter/pagination and status management
- payments search/filter/pagination and full/partial refunds
- therapist CRUD, status, services, schedule and image upload
- service CRUD, pricing, duration, home-service availability and image upload
- availability blocks for all therapists or a specific therapist
- booking rules/settings
- activity logs

Deletion is intentionally safe: therapist/service records referenced by booking history are protected and must be deactivated instead of physically deleted, preventing orphaned historical records.

## API inventory

User/public:

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/google
POST   /api/auth/refresh
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/auth/me

GET    /api/services
GET    /api/services/:id-or-slug
GET    /api/therapists
GET    /api/therapists/:id
GET    /api/availability

POST   /api/bookings
GET    /api/bookings/my
GET    /api/bookings/:id
PATCH  /api/bookings/:id/cancel
PATCH  /api/bookings/:id/reschedule

POST   /api/payments/create-order
POST   /api/payments/verify
POST   /api/payments/failed
GET    /api/payments/my
POST   /api/payments/webhook

GET    /api/profile
PATCH  /api/profile
POST   /api/profile/image
POST   /api/profile/change-password
POST   /api/contact
```

Admin:

```text
POST   /api/admin/auth/login
POST   /api/admin/auth/logout
GET    /api/admin/dashboard
GET    /api/admin/users
GET    /api/admin/users/:id
PATCH  /api/admin/users/:id/block
PATCH  /api/admin/users/:id/unblock
DELETE /api/admin/users/:id
GET    /api/admin/bookings
PATCH  /api/admin/bookings/:id/status
GET    /api/admin/payments
POST   /api/admin/payments/:id/refund
GET    /api/admin/therapists
POST   /api/admin/therapists
PATCH  /api/admin/therapists/:id
PATCH  /api/admin/therapists/:id/status
DELETE /api/admin/therapists/:id
POST   /api/admin/therapists/:id/image
GET    /api/admin/services
POST   /api/admin/services
PATCH  /api/admin/services/:id
PATCH  /api/admin/services/:id/status
DELETE /api/admin/services/:id
POST   /api/admin/services/:id/image
GET    /api/admin/availability/blocks
POST   /api/admin/availability/blocks
DELETE /api/admin/availability/blocks/:id
GET    /api/admin/activity-logs
GET    /api/admin/settings
PATCH  /api/admin/settings
```

All admin endpoints require the separate admin HTTP-only cookie/JWT. Customer endpoints use the customer auth cookie. Normal users do not receive admin access simply by having a role field in frontend state.

## Media storage

Seed therapist/service images live under `server/uploads/*-seed` and are part of the deployable application. New uploads use local `/uploads` in development. For a stateless production platform, configure Cloudinary with the three `CLOUDINARY_*` variables; the same admin/user upload endpoints will then upload to persistent cloud storage and store the returned HTTPS URL in MongoDB.

Never commit customer/private runtime uploads. The repository ignore rules keep generic runtime uploads out of Git while explicitly allowing only the checked-in seed media.

## Security notes

- password hashes use bcryptjs
- auth cookies are HTTP-only
- access tokens are short-lived
- refresh tokens are rotated and stored hashed
- reset tokens are hashed and expire after 30 minutes
- auth/admin login endpoints have rate limits
- CORS is allow-listed by `CLIENT_URL`; credentialed requests never use `*`
- server errors are sanitized in production
- file size/type checks happen server-side
- booking ownership is checked server-side
- prices and payment state are re-read server-side
- Razorpay signature, order, payment amount and capture status are verified server-side
- payment/refund flows are guarded against repeat processing
- Mongoose strict queries + schema validation + field allow-lists reduce injection/mass-assignment risk

## Vercel deployment (backend)

If you deploy the Express server on Vercel, create a separate Vercel project using this repository with **Root Directory = `server`**. Vercel detects `app.js` as the Express entry point. Do not use the frontend project for the server.

Set these required environment variables in Vercel (Preview and Production as needed): `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_JWT_SECRET`, and the Razorpay variables for live payments. Set `CLIENT_URL` to the deployed frontend origin. Use Node.js 22 or 24 for new Vercel deployments.

The backend exposes `/api/health` and `/` for deployment checks. `/api/health` returns a 503 JSON response listing missing required configuration instead of crashing the Vercel function.

For Vercel image uploads, configure Cloudinary. Vercel Functions have a read-only application filesystem with writable `/tmp` scratch space, so local `server/uploads` must not be used as persistent storage.

## Production deployment

### Backend

Deploy the `server/` directory to a Node host such as Render, Railway, Fly.io, or a container platform.

Set:

```env
NODE_ENV=production
PORT=10000
CLIENT_URL=https://your-frontend-domain.com
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
MONGO_URI=...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
ADMIN_JWT_SECRET=...
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
SMTP_*=...
CLOUDINARY_*=...
```

Start command:

```text
npm start
```

Health check:

```text
GET /api/health
```

Make MongoDB Atlas allow only the deployment network/IP range required by the backend.

### Frontend

Build the root project:

```powershell
npm install
npm run build
```

Deploy `dist/` to Vercel, Netlify, Cloudflare Pages, an Nginx static host, or another static hosting provider. Set:

```env
VITE_API_URL=/api
VITE_RAZORPAY_KEY_ID=rzp_live_...
VITE_GOOGLE_CLIENT_ID=...
```

Configure SPA fallback so every React Router URL serves `index.html`.

### Razorpay

Configure the webhook URL:

```text
https://your-api-domain.com/api/payments/webhook
```

Use the production webhook secret as `RAZORPAY_WEBHOOK_SECRET`.

### SMTP

Use Gmail App Password for testing, or a production SMTP provider/domain for a business sender. Keep SMTP credentials server-side only.

### Google OAuth

Google sign-in is optional. The backend already supports verified Google ID tokens. A Google button should only be enabled when `GOOGLE_CLIENT_ID`/`VITE_GOOGLE_CLIENT_ID` are actually configured; otherwise the UI stays clean instead of showing a broken provider button.

## Verification performed in this workspace

- full server JavaScript syntax check: passed
- full frontend/server ESLint pass: passed with the project lint configuration
- public application source JSX parsing via ESLint: passed
- backend app import/config loading: passed
- local API `/api/health` and static `/uploads` route logic were inspected and the server reached the Mongo connection phase

The final runtime smoke test could not reach the supplied MongoDB Atlas cluster from this sandbox because outbound DNS/network access is unavailable here. Razorpay and SMTP were therefore not falsely marked as end-to-end verified. With real deployment credentials/network access, run the exact user/admin/payment acceptance checklist in the next section.

## Final acceptance checklist

User:

```text
register → login → logout
forgot password → reset password
services → therapist → availability
booking → Razorpay → verify
booking history → booking detail
cancel → refund policy
reschedule → availability
payment history
profile update → profile image → change password
```

Admin:

```text
admin login
→ dashboard aggregates
→ users + detail
→ bookings + status
→ payments + refund
→ therapists CRUD + images + availability
→ services CRUD + images
→ availability blocks
→ activity logs
→ settings
```

Responsive QA targets:

```text
320 / 375 / 390 / 414 / 480 / 768 / 1024 / 1280 / 1440+
```

### Vercel CORS
For the deployed frontend, set the backend Vercel environment variable `CLIENT_URL` to the exact frontend origin, for example `https://aviana-spa.vercel.app` (no trailing slash). For preview deployments, add their exact origins to `ALLOWED_ORIGINS` as a comma-separated list. After changing environment variables, redeploy the backend.
