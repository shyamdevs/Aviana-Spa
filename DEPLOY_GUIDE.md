# Aviana – Vercel Deployment Guide

The site runs as **two Vercel projects from one GitHub repo**:

| Project | Root Directory | What it is |
|---|---|---|
| `aviana-spa-server` (backend) | `server` | Express API + MongoDB |
| `aviana-spa` (frontend) | `.` (repo root) | React / Vite site |

The frontend calls **`/api/...` on its own domain**. `vercel.json` forwards those calls to the
backend. Because the browser only ever talks to one domain, login cookies are first-party and are
not blocked (this was the cause of the `401` errors).

---

## 0. Before you start (security – do this first)
The old ZIP contained real passwords/keys (`MongoDB`, `JWT`, `Razorpay`, `Gmail`, `Cloudinary`).
Treat them as leaked and **rotate them**: change the MongoDB user password, generate new JWT
secrets, regenerate the Razorpay secret/webhook secret, create a new Gmail App Password and a new
Cloudinary API secret. Never commit `.env` files (they are in `.gitignore`).

Generate JWT secrets:
```
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Run it three times: access, refresh, admin.

## 1. MongoDB Atlas
1. Atlas → **Network Access** → **Add IP Address** → `0.0.0.0/0` (Vercel has no fixed IPs).
2. **Database Access** → make sure the DB user/password matches the `MONGO_URI` you will use.
3. Use the connection string with a database name, e.g. `...mongodb.net/aviana?retryWrites=true&w=majority`.

## 2. Push to GitHub
```
git add .
git commit -m "Deploy-ready Aviana"
git push origin main
```

## 3. Deploy the backend
1. Vercel → **Add New → Project** → import the repo.
2. **Project Name:** `aviana-spa-server` (if you pick another name, see step 5).
3. **Root Directory:** `server`. Framework preset: *Other* (Express is auto-detected from `app.js`).
4. **Environment Variables** (Production + Preview):

| Key | Value |
|---|---|
| `MONGO_URI` | your Atlas connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` / `ADMIN_JWT_SECRET` | three different long random values |
| `CLIENT_URL` | **exact frontend URL**, e.g. `https://aviana-spa.vercel.app` (no trailing `/`) |
| `ALLOWED_ORIGINS` | optional, e.g. `https://aviana-spa-*.vercel.app` for preview deployments |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | from Razorpay dashboard |
| `SMTP_HOST`=`smtp.gmail.com`, `SMTP_PORT`=`587`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Gmail App Password |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | needed for image uploads on Vercel |
| `COOKIE_SAME_SITE` | `lax` |
| `HOME_VISIT_FEE`, `CANCELLATION_WINDOW_HOURS`, `RESCHEDULE_WINDOW_HOURS`, `REFUND_PERCENT` | e.g. `0`, `12`, `2`, `100` |
| `GOOGLE_CLIENT_ID` | only if you use Google sign-in |

   Do **not** set `NODE_ENV` (Vercel sets `production`). Cookies become `Secure` automatically.
5. Click **Deploy**. Open `https://<backend-domain>/api/health`. You must see
   `"configurationReady": true` and `"databaseConnected": true`.
   If you see a Vercel login page: Settings → **Deployment Protection** → disable it.

## 4. Create the admin account + sample data (once, from your computer)
```
cd server
npm install
copy .env.example .env      (Windows)   |   cp .env.example .env   (Mac/Linux)
```
Edit `server/.env`: set `MONGO_URI`, the JWT secrets, `ADMIN_SEED_EMAIL`, and a **strong**
`ADMIN_SEED_PASSWORD`. Then:
```
npm run seed
```
This creates the admin, settings, services and therapists. Use that email/password at `/admin/login`.

## 5. Point the frontend to the backend
Open `vercel.json` in the repo root and make sure both `destination` URLs use **your backend's real
domain** (the one that showed the health check). Default is `https://aviana-spa-server.vercel.app`.
Commit and push if you changed it.

## 6. Deploy the frontend
1. Vercel → **Add New → Project** → import the same repo.
2. **Root Directory:** `.` — Framework preset: **Vite** (build `npm run build`, output `dist`).
3. Environment variables:

| Key | Value |
|---|---|
| `VITE_API_URL` | `/api` (or leave it out) |
| `VITE_RAZORPAY_KEY_ID` | your Razorpay **Key ID** (public) |
| `VITE_GOOGLE_CLIENT_ID` | only for Google sign-in |

4. Deploy. Note the URL (e.g. `https://aviana-spa.vercel.app`).

## 7. Connect the two (important)
Go back to the **backend** project → Settings → Environment Variables → set `CLIENT_URL` to the
frontend URL from step 6 → **Deployments → ⋯ → Redeploy**. Env changes only apply after a redeploy.

## 8. Razorpay webhook
Razorpay Dashboard → Settings → Webhooks → Add:
* URL: `https://<frontend-domain>/api/payments/webhook`
* Secret: same as `RAZORPAY_WEBHOOK_SECRET`
* Events: `payment.authorized`, `payment.captured`, `payment.failed`, `order.paid`

Switch from `rzp_test_` keys to `rzp_live_` keys only when you are ready for real payments
(update both the backend secret and `VITE_RAZORPAY_KEY_ID`, then redeploy both projects).

## 9. Admin first steps
Login at `/admin/login` → open **Booking Payment** (`/admin/booking-payment`) and create the fixed
booking amount (needed for the “Booking amount” payment option). Upload real therapist photos
from the Therapists page.

## 10. Test checklist
1. Home page loads; Services show images.
2. Register a new user → refresh the page → still logged in.
3. Book a service → pay with a Razorpay test card → booking shows under *My bookings*.
4. Admin login → dashboard, bookings, users all load; change a booking status.

---

## Troubleshooting
| Symptom | Fix |
|---|---|
| `401` right after login | Frontend must call `/api` (check `VITE_API_URL`) and `vercel.json` destination must be the real backend URL. Redeploy frontend. |
| `403 Origin not allowed by CORS` (response body) | `CLIENT_URL` on backend ≠ the frontend URL in the address bar. Fix and **redeploy backend**. |
| `/api/health` says `configurationReady:false` | The listed variables are missing on the backend project. |
| `/api/health` says `databaseConnected:false` | Atlas Network Access (`0.0.0.0/0`) or wrong `MONGO_URI`. |
| `404` on `/api/...` from the frontend | `vercel.json` destination wrong / not pushed. |
| Image upload fails in admin | Add the three `CLOUDINARY_*` variables on the backend. |
| No emails | Use a Gmail **App Password**, not your normal password. Emails are logged to Vercel logs if SMTP is missing. |

### If you ever want to call the backend directly from another domain
Set backend `COOKIE_SAME_SITE=none`, set frontend `VITE_API_URL=https://<backend>/api`. Not
recommended: Safari and Chrome (incognito) block third-party cookies, so logins can still fail.
