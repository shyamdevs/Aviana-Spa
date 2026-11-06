/*
 * Turns an assistant reply (plain text) into a small, SAFE structure: paragraphs, bullet lists,
 * and links to Aviana's own pages. Only the whitelisted internal routes below can ever become
 * links; everything else stays plain text. Nothing here produces HTML.
 */
const ROUTES = /\/(?:services\/[a-z0-9-]+|services|booking|contact|therapists\/[a-z0-9-]+|therapists|packages|gallery|dashboard\/(?:bookings|payments|profile|settings)|dashboard|login|register)(?![\w/-])/g;

const LABELS = {
  '/services': 'Services page', '/booking': 'booking page', '/contact': 'Contact page', '/therapists': 'Therapists page',
  '/packages': 'Packages page', '/gallery': 'Gallery', '/dashboard': 'your dashboard', '/dashboard/bookings': 'My bookings',
  '/dashboard/payments': 'Payments', '/dashboard/profile': 'Profile', '/dashboard/settings': 'Settings', '/login': 'Sign in', '/register': 'Create account',
};

export function labelFor(path) {
  if (LABELS[path]) return LABELS[path];
  if (path.startsWith('/services/')) return 'service details';
  if (path.startsWith('/therapists/')) return 'therapist profile';
  return path;
}

/** Splits one line into text and link parts. A route only counts when it starts a "word". */
export function parseInline(line) {
  const parts = [];
  let last = 0;
  for (const match of line.matchAll(ROUTES)) {
    const before = line[match.index - 1];
    if (before && /[\w/.:-]/.test(before)) continue; // e.g. "and/or", "https://x/services"
    if (match.index > last) parts.push({ type: 'text', value: line.slice(last, match.index) });
    parts.push({ type: 'link', to: match[0], label: labelFor(match[0]) });
    last = match.index + match[0].length;
  }
  if (last < line.length) parts.push({ type: 'text', value: line.slice(last) });
  return parts.length ? parts : [{ type: 'text', value: line }];
}

const BULLET = /^\s*(?:[-*\u2022])\s+(.*)$/;

export function parseRichText(text) {
  const blocks = [];
  for (const raw of String(text ?? '').split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    const bullet = line.match(BULLET);
    if (bullet) {
      const last = blocks[blocks.length - 1];
      const item = parseInline(bullet[1]);
      if (last?.type === 'ul') last.items.push(item);
      else blocks.push({ type: 'ul', items: [item] });
    } else {
      blocks.push({ type: 'p', parts: parseInline(line.trim()) });
    }
  }
  return blocks;
}
