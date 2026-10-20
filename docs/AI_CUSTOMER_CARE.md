# Aviana Care — Gemini AI and human-support handoff

## Local setup
1. Create a Gemini API key: https://aistudio.google.com/apikey
2. Copy `server/.env.example` to `server/.env`.
3. Set `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-2.5-flash`, and `CUSTOMER_CARE_EMAIL`.
4. Keep existing MongoDB and SMTP settings configured.
5. Run frontend and backend in separate terminals and test locally first.

## Deployment
Add `GEMINI_API_KEY`, `GEMINI_MODEL`, and `CUSTOMER_CARE_EMAIL` to the backend Vercel project (Preview first), then redeploy. Never expose the API key through a VITE_ variable.

## Handoff
Human requests create a MongoDB support ticket and notify the configured support inbox over SMTP. This is ticket/email handoff, not real-time agent chat.

## Privacy
Gemini free tier has quotas and may use submitted content to improve Google products. Tell visitors their messages are AI processed and don't request sensitive medical/payment information. Check https://ai.google.dev/gemini-api/docs/pricing.