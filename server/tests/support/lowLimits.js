// Imported BEFORE env.js so these win over the generous test defaults.
Object.assign(process.env, {
  CHAT_LIMIT_GUEST_PER_IP: '3',
  CHAT_LIMIT_PER_USER: '3',
  TICKET_LIMIT_PER_IP: '2',
  TICKET_LIMIT_PER_USER: '2',
  AI_DAILY_REQUEST_BUDGET: '4',
});
