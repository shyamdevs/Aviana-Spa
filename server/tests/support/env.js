// Must be imported FIRST by every test file: config modules read process.env at import time.
const defaults = {
  NODE_ENV: 'test',
  MONGO_URI: 'mongodb://127.0.0.1:1/never-used',
  // Random-looking 256-bit test secrets so production-mode startup validation passes in tests.
  JWT_ACCESS_SECRET: 'c1f0a7d93b5e48a2961d7e0b3a4c58f2e9d6b1a0734c5f8e2d91a6b7c3e04f58',
  JWT_REFRESH_SECRET: '7e2b9d04a1c6f38e5b70d29a4c1e8f63b5a0d7c2e94f1a68b3d05c7e92a4f1b6',
  ADMIN_JWT_SECRET: '4a8d1f6c3e0b9275d4a1c8e6f30b5927e1d4a7c0f86b3592d1e4a7c0b6f38e25',
  OTP_HMAC_SECRET: '9b3e6a1d4f70c285e9b3a6d1f4c07285b9e3a6d0f1c47285e9b2a6d1f3c07b94',
  DATA_ENCRYPTION_KEYS: '1:' + Buffer.alloc(32, 7).toString('base64') + ',2:' + Buffer.alloc(32, 9).toString('base64'),
  DATA_ENCRYPTION_ACTIVE_KEY: '1',
  BCRYPT_COST: '4',
  CLIENT_URL: 'http://localhost:5173',
  GEMINI_API_KEY: 'test-gemini-key-not-real',
  GEMINI_MODEL: 'gemini-3.5-flash-lite',
  GEMINI_FALLBACK_MODELS: '', // deterministic call counts; fallback chain has its own tests
  CUSTOMER_CARE_EMAIL: 'care@example.test',
  AI_DAILY_REQUEST_BUDGET: '100000',
  CHAT_LIMIT_PER_USER: '1000',
  CHAT_LIMIT_PER_IP: '1000',
  CHAT_LIMIT_GUEST_PER_IP: '1000',
  CHAT_HISTORY_LIMIT_PER_IP: '1000',
  TICKET_LIMIT_PER_IP: '1000',
  TICKET_LIMIT_PER_USER: '1000',
  AI_REQUEST_TIMEOUT_MS: '2000',
  AI_TOTAL_DEADLINE_MS: '3000',
};
for (const [key, value] of Object.entries(defaults)) {
  if (process.env[key] === undefined) process.env[key] = value;
}
