import { API_URL } from '../services/api';

const API_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export function mediaUrl(value) {
  if (!value) return '';
  const source = String(value);
  if (/^(https?:|data:|blob:)/i.test(source)) return source;
  if (source.startsWith('/uploads/')) return `${API_ORIGIN}${source}`;
  return source.startsWith('/') ? source : `/${source}`;
}

export function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'A';
}
