/*
 * Catalogue change notifications.
 *
 * The AI catalogue cache subscribes with onCatalogChange(). Models that feed the
 * chatbot (Service, ExtraService, Therapist, Setting, BookingOption) call
 * attachCatalogInvalidation(schema) so that *every* write path - admin screens,
 * seed scripts, future endpoints - invalidates the cache, without editing each
 * controller. Models depend only on this file, never on AI code.
 *
 * Note: Vercel runs several isolated instances, and a hook can only reach the
 * instance that handled the write. Other instances catch up when their short TTL
 * expires (AI_CATALOG_CACHE_TTL_SECONDS, default 60s). That bounded staleness is
 * intentional and documented.
 */
const listeners = new Set();

export function onCatalogChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notifyCatalogChanged() {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      // A broken subscriber must never fail a database write.
    }
  }
}

const QUERY_WRITE_OPERATIONS = [
  'updateOne',
  'updateMany',
  'replaceOne',
  'findOneAndUpdate',
  'findOneAndReplace',
  'findOneAndDelete',
  'deleteOne',
  'deleteMany',
];

export function attachCatalogInvalidation(schema) {
  const notify = function notify() {
    notifyCatalogChanged();
  };

  schema.post('save', notify);
  schema.post('insertMany', notify);
  schema.post('deleteOne', { document: true, query: false }, notify);
  for (const operation of QUERY_WRITE_OPERATIONS) {
    schema.post(operation, notify);
  }
}
