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
Edit `server/.env`: set `MONGO_URI`, the JWT/OTP secrets and `DATA_ENCRYPTION_KEYS` (see
`SECURITY_REPORT.md`). Admins are created with `npm run server:admin:provision`. Then:
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


---

# Aviana Care (AI customer care) - deployment notes

## Architecture in one minute

| Concern | Where |
| --- | --- |
| Routes (public vs private) | `server/routes/customerCareRoutes.js` |
| Handlers | `server/controllers/customerCareController.js` |
| Validation | `server/validators/chat.js` |
| Prompt, context, injection/leak guards | `server/utils/aiPrompt.js` |
| Verified service data (cache + mapping) | `server/utils/chatCatalog.js`, `server/utils/catalogEvents.js` |
| Gemini client (timeouts, retries, concurrency) | `server/utils/gemini.js`, `server/config/ai.js` |
| Conversation storage (owner-scoped) | `server/utils/chatStore.js`, `server/models/ChatConversation.js` |
| Rate limits + daily budget (shared via MongoDB) | `server/utils/rateLimiters.js`, `server/utils/mongoRateLimitStore.js`, `server/models/RateLimitHit.js` |
| Support tickets | `server/utils/supportTickets.js`, `server/models/SupportTicket.js` |
| Frontend | `src/components/CustomerCare.jsx`, `src/components/care/*` |

API (all under `/api`):

* `POST /chat/guest` - public, stateless, nothing stored.
* `POST /chat`, `GET /chat/history`, `DELETE /chat/history` - **sign-in required**, always scoped to the verified session user.
* `POST /support-tickets` - guests allowed (ticket has no owner); signed-in tickets are owned by the session user.
* `GET /support-tickets/:reference` - owner only (others get 404).

Guest vs account chat: guests keep their last few turns **in browser memory only** (lost on refresh). Signed-in chats are saved server-side, auto-deleted after `CHAT_RETENTION_DAYS` of inactivity, and can be cleared by the user. Nothing is written to localStorage/sessionStorage/cookies.

## Environment variables (backend Vercel project only)

Existing names are unchanged. **Never** prefix any of these with `VITE_`.

| Variable | Required | Notes |
| --- | --- | --- |
| `GEMINI_API_KEY` | yes | Server only. |
| `GEMINI_MODEL` | recommended | Default `gemini-3.5-flash-lite`. **Check this in Vercel**: remove `gemini-flash-latest`/`-latest` aliases and any `gemini-2.5-*` value. |
| `CUSTOMER_CARE_EMAIL`, `SMTP_*`, `MAIL_FROM` | for ticket e-mails | Unchanged. Tickets are saved even if e-mail fails. |
| `AI_TOTAL_DEADLINE_MS` | optional | Default 12000. Keep it **below your Vercel function time limit**. |
| Others | optional | See `server/.env.example` (all range-checked). |

## Commands

```bash
# local
npm install && npm --prefix server install
npm --prefix server run dev          # API
npm run dev                          # frontend (separate terminal)

# checks
npm run lint
npm run test:server                  # 100+ automated checks, no network/DB needed
npm run build                        # production build

# one-off (existing chat data only): give old conversations a retention expiry
npm --prefix server run migrate:chat-expiry
```

## Safe Vercel rollout

1. In the **backend** project set/verify `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.5-flash-lite`.
2. Deploy the **backend first**, then the **frontend**. (Between the two deploys a visitor with an old cached frontend can't chat as a guest until they reload, because guest chat moved to `/api/chat/guest`.)
3. Run `npm --prefix server run migrate:chat-expiry` once (needs `MONGO_URI`).
4. Indexes (TTL on chats and rate-limit counters, unique ticket de-dupe key) are created automatically by Mongoose on first start.

## Manual checks after deploying

* Ask "price of <a real service> at home" and compare with the Services page: home total = home price + home visit fee.
* Log in as user A, chat, log out, log in as user B: B's panel starts empty.
* Open `/login`, `/register`, `/forgot-password`, `/reset-password`, `/admin`, `/admin/login`: no chat button.
* On a phone at `/booking`: the chat button sits above the bottom action bar; Razorpay checkout still opens above everything.
* Submit a ticket as guest and signed in; confirm the reference appears and the staff e-mail arrives.
* Look at Vercel logs for `"event":"care_chat"` lines: `totalMs`, `geminiMs`, `outcome` give real latency/error rates (no message text is logged).
* Confirm per-IP limits work behind your frontend rewrite: from two different networks, check that one network being rate-limited does not block the other. (If every visitor appears to share one IP, per-IP limits would be shared too; the per-user and daily-budget limits still protect you.)


## Troubleshooting Aviana Care

Run the self-check first. It tests your key against each model and your real database, and never prints the key:

```bash
npm --prefix server run check:ai
```

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Guest chat: "taking longer than usual…" (HTTP 503) | Wrong/missing `GEMINI_API_KEY`, retired `GEMINI_MODEL`, no quota for the model, or a thinking model | Read the server terminal for `[care] gemini failure {...}`. In development the 503 response also has a `debug` object (browser console shows `[Aviana Care] server diagnostic`). |
| `kind: "auth"` | Google rejected the key | New key at https://aistudio.google.com/apikey, set `GEMINI_API_KEY`, restart the server |
| `kind: "model_unavailable"` | `GEMINI_MODEL` retired/misspelled | Set `GEMINI_MODEL=gemini-3.5-flash-lite` (a fallback chain also tries safe models automatically) |
| `kind: "quota"` | Billing/free-tier limit for that model | Enable billing or use another model |
| `kind: "empty_truncated"` | A thinking model spent all tokens thinking | Use a Flash-Lite model, or `GEMINI_THINKING_LEVEL=minimal` |
| Signed-in panel stuck on "Loading your conversation…" | Fixed (the history request was aborted by its own effect) | Hard-refresh the browser (Ctrl+Shift+R) so the new frontend loads |

`debug` details are only returned when `NODE_ENV` is not `production`; on Vercel customers only ever see a generic message.


## Open 24 hours, 7 days a week

The booking system now defaults to **24/7**: spa hours `00:00`-`24:00`, every therapist working all 7 days, shift `00:00`-`24:00`. `24:00` means midnight at the end of the day and is accepted only as a closing time / shift end.

**Your existing database still has the old values (09:00-20:00, Mon-Sat). Apply 24/7 to it once:**

```bash
npm --prefix server run migrate:always-open -- --dry-run   # preview, changes nothing
npm --prefix server run migrate:always-open                # apply
```

It updates the global Settings and every therapist. Existing bookings are not touched. You can also do it by hand: **Admin > Settings > "Open 24 hours"** and **Admin > Therapists > "Works 24 hours"** (and tick Sun).

Things to know:
* Appointments cannot cross midnight. A 60-minute treatment can start as late as 23:00, a 90-minute one at 22:30.
* Slots are grouped as Overnight / Morning / Afternoon / Evening / Late evening in the booking form.
* Admin Settings now rejects malformed or reversed hours (e.g. `9am`, or closing before opening).
* The chatbot reads the hours from Settings, so it says "open 24 hours" once the migration has run (within about a minute).
* The **Contact page** hours are static text in `src/pages/Contact/contactData.js` (now "Every day - Open 24 hours"); they do not follow Admin Settings.
* 24/7 means real staff must be rostered for night slots. Per-therapist shifts and **Admin > Availability** blocks still apply, so you can limit individual people or dates.
