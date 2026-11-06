import mongoose from 'mongoose';

/*
 * In-memory stand-ins for the exact Mongoose operations the customer-care code
 * uses. They emulate MongoDB semantics for those operations only (equality on
 * userId, $elemMatch, $ne, $push/$each/$slice, positional and $slice projection,
 * unique indexes, upsert). They exist because no MongoDB server is available in
 * the test environment; they verify our logic, not MongoDB itself.
 */
const clone = (v) => (v === undefined ? v : structuredClone(v));
const idOf = (v) => String(v);
let seq = 0;
const newId = () => new mongoose.Types.ObjectId();

class Query {
  constructor(run) { this.run = run; this.spec = null; }
  select(spec) { this.spec = spec; return this; }
  sort() { return this; } limit() { return this; } maxTimeMS() { return this; } lean() { return this; } populate() { return this; }
  then(resolve, reject) { return Promise.resolve().then(() => this.run(this)).then(resolve, reject); }
  catch(reject) { return this.then(undefined, reject); }
}

function dup(keyPattern) {
  const error = new Error('E11000 duplicate key error');
  error.code = 11000;
  error.keyPattern = keyPattern;
  return error;
}

export function installFakeDb({ User, ChatConversation, SupportTicket, RateLimitHit, Service, ExtraService, Therapist, Setting, BookingOption }) {
  const db = {
    users: new Map(),
    conversations: new Map(),
    tickets: [],
    rateHits: new Map(),
    catalog: { services: [], extras: [], therapists: [], setting: null, bookingOption: null },
    conversationFilters: [], // every filter ever used against ChatConversation (ownership audit)
    failures: { catalog: false, conversationWrite: false, ticketCreate: false },
    catalogQueries: 0,
  };

  User.findById = (id) => new Query(() => { const u = db.users.get(idOf(id)); return u ? { ...u } : null; }); // shallow copy keeps the real ObjectId

  // ----- ChatConversation
  ChatConversation.findOne = (filter) => new Query((q) => {
    db.conversationFilters.push(clone(filter));
    const doc = db.conversations.get(idOf(filter.userId));
    if (!doc) return null;
    if (filter.messages?.$elemMatch) {
      const { requestId, role } = filter.messages.$elemMatch;
      const hit = doc.messages.find((m) => m.requestId === requestId && m.role === role);
      return hit ? { _id: doc._id, userId: doc.userId, messages: [clone(hit)] } : null;
    }
    const out = clone(doc);
    const slice = q.spec?.messages?.$slice;
    if (typeof slice === 'number') out.messages = slice < 0 ? out.messages.slice(slice) : out.messages.slice(0, slice);
    return out;
  });

  ChatConversation.findOneAndUpdate = (filter, update, options = {}) => new Query(() => {
    db.conversationFilters.push(clone(filter));
    if (db.failures.conversationWrite) throw new Error('simulated write failure');
    const key = idOf(filter.userId);
    let doc = db.conversations.get(key);
    const ne = filter['messages.requestId']?.$ne;
    const matches = doc && !(ne && doc.messages.some((m) => m.requestId === ne));
    if (!matches) {
      if (doc) throw dup({ userId: 1 }); // upsert would insert a second doc for the same unique userId
      if (!options.upsert) return null;
      doc = { _id: newId(), userId: filter.userId, messages: [], expiresAt: null };
      db.conversations.set(key, doc);
    }
    if (update.$set?.expiresAt) doc.expiresAt = update.$set.expiresAt;
    const push = update.$push?.messages;
    if (push) {
      for (const m of push.$each) doc.messages.push({ _id: newId(), createdAt: new Date(), ...m });
      if (push.$slice < 0) doc.messages = doc.messages.slice(push.$slice);
    }
    return clone(doc);
  });

  ChatConversation.deleteOne = (filter) => new Query(() => {
    db.conversationFilters.push(clone(filter));
    return { deletedCount: db.conversations.delete(idOf(filter.userId)) ? 1 : 0 };
  });

  // ----- SupportTicket
  SupportTicket.create = async (data) => {
    if (db.failures.ticketCreate) throw new Error('simulated ticket failure');
    if (db.tickets.some((t) => t.reference === data.reference)) throw dup({ reference: 1 });
    if (data.dedupeKey && db.tickets.some((t) => t.dedupeKey === data.dedupeKey)) throw dup({ dedupeKey: 1 });
    const doc = { _id: newId(), status: 'open', notificationStatus: 'pending', createdAt: new Date(), ...clone(data), userId: data.userId ? new mongoose.Types.ObjectId(String(data.userId)) : null };
    db.tickets.push(doc);
    return doc;
  };
  SupportTicket.findOne = (filter) => new Query(() => {
    const hit = db.tickets.find((t) => {
      if (filter.dedupeKey !== undefined) return t.dedupeKey === filter.dedupeKey;
      return t.reference === filter.reference && idOf(t.userId) === idOf(filter.userId);
    });
    return hit ? clone(hit) : null;
  });
  SupportTicket.updateOne = (filter, update) => new Query(() => {
    const hit = db.tickets.find((t) => idOf(t._id) === idOf(filter._id));
    if (hit && update.$set) Object.assign(hit, update.$set);
    return { modifiedCount: hit ? 1 : 0 };
  });

  // ----- RateLimitHit
  RateLimitHit.findOneAndUpdate = (filter, update) => new Query(() => {
    let doc = db.rateHits.get(filter._id);
    if (!doc) { doc = { _id: filter._id, hits: 0, expiresAt: update.$setOnInsert?.expiresAt }; db.rateHits.set(filter._id, doc); }
    doc.hits += update.$inc.hits;
    return clone(doc);
  });
  RateLimitHit.updateOne = (filter, update) => new Query(() => {
    const doc = db.rateHits.get(filter._id);
    if (doc && doc.hits > 0) doc.hits += update.$inc.hits;
    return {};
  });
  RateLimitHit.deleteOne = (filter) => new Query(() => { db.rateHits.delete(filter._id); return {}; });

  // ----- Catalogue collections
  const finder = (name, pick) => (filter = {}) => new Query(() => {
    db.catalogQueries += 1;
    if (db.failures.catalog) throw new Error('simulated catalogue outage');
    return clone(pick().filter((d) => filter.isActive === undefined || d.isActive === filter.isActive));
  });
  Service.find = finder('services', () => db.catalog.services);
  ExtraService.find = finder('extras', () => db.catalog.extras);
  Therapist.find = finder('therapists', () => db.catalog.therapists);
  Setting.findOne = () => new Query(() => { if (db.failures.catalog) throw new Error('simulated outage'); return clone(db.catalog.setting); });
  BookingOption.findOne = () => new Query(() => { if (db.failures.catalog) throw new Error('simulated outage'); return clone(db.catalog.bookingOption); });

  void seq;
  return db;
}

export const oid = () => new mongoose.Types.ObjectId();
