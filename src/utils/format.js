export const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;
export const prettyDate = (value) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
export const titleCase = (value) => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
