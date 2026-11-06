const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const wrap = (body) => `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#201e1a"><h1 style="font-family:Georgia,serif;letter-spacing:.08em">Aviana</h1>${body}<p style="font-size:12px;color:#7c725f;margin-top:28px">If you did not request this, you can safely ignore this email. Never share this code with anyone - Aviana staff will never ask for it.</p></div>`;
const code = (otp) => `<p style="font-size:32px;letter-spacing:.35em;font-weight:bold;margin:18px 0">${esc(otp)}</p>`;

const COPY = {
  register: { subject: 'Your Aviana verification code', lead: 'Use this code to verify your email and finish creating your Aviana account.' },
  reset: { subject: 'Your Aviana password reset code', lead: 'Use this code to reset your Aviana password.' },
};

export function otpEmail(purpose, otp, minutes = 5) {
  const c = COPY[purpose];
  return {
    subject: c.subject,
    html: wrap(`<p>${c.lead}</p>${code(otp)}<p>This code expires in <strong>${minutes} minutes</strong> and can be used once.</p>`),
    text: `${c.lead}\n\nCode: ${otp}\n\nIt expires in ${minutes} minutes and can be used once. Do not share this code with anyone.`,
  };
}

export const passwordChangedEmail = (name) => ({
  subject: 'Your Aviana password was changed',
  html: wrap(`<p>Hello ${esc(name)},</p><p>Your password was just changed and you were signed out of all devices. If this was not you, reset your password immediately and contact us.</p>`),
  text: 'Your Aviana password was changed and all devices were signed out. If this was not you, reset your password immediately.',
});

export const adminLoginEmail = (name, when, ua) => ({
  subject: 'New Aviana admin sign-in',
  html: wrap(`<p>Hello ${esc(name)},</p><p>A new admin session started at <strong>${esc(when)}</strong> from <em>${esc(String(ua).slice(0, 120))}</em>.</p><p>If this was not you, sign out all sessions and rotate your credentials now.</p>`),
  text: `A new admin session started at ${when}. If this was not you, revoke all sessions and rotate credentials now.`,
});

export const alertEmail = (type, summary) => ({
  subject: `[Aviana security] ${type}`,
  html: wrap(`<p><strong>${esc(type)}</strong></p><p>${esc(summary)}</p>`),
  text: `${type}: ${summary}`,
});
