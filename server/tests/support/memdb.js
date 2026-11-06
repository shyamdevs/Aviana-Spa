import mongoose from 'mongoose';

/*
 * Generic in-memory stand-in for the Mongoose statics the security code uses (find/findOne/create/
 * findOneAndUpdate/updateOne/updateMany/...). It applies real schema defaults and validation and
 * emulates unique indexes, $set/$unset/$inc/$push/$pull and common query operators. It verifies OUR
 * logic, not MongoDB itself - no MongoDB server is available in this environment.
 */
const sid = (v) => String(v);
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && !(v instanceof mongoose.Types.ObjectId);
const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
function put(o, path, v) { const ks = path.split('.'); const last = ks.pop(); let c = o; for (const k of ks) { c[k] ??= {}; c = c[k]; } c[last] = v; }
const norm = (v) => (v instanceof Date ? v.getTime() : v instanceof mongoose.Types.ObjectId ? sid(v) : v);

function cond(val, c) {
  if (isObj(c) && Object.keys(c).some((k) => k.startsWith('$'))) {
    return Object.entries(c).every(([op, x]) => {
      if (op === '$gt') return val != null && norm(val) > norm(x);
      if (op === '$gte') return val != null && norm(val) >= norm(x);
      if (op === '$lt') return val != null && norm(val) < norm(x);
      if (op === '$lte') return val != null && norm(val) <= norm(x);
      if (op === '$ne') return Array.isArray(val) ? !val.map(norm).includes(norm(x)) : norm(val) !== norm(x);
      if (op === '$in') return (Array.isArray(val) ? val : [val]).some((v) => x.map(norm).includes(norm(v)));
      if (op === '$exists') return (val !== undefined) === x;
      if (op === '$regex') return new RegExp(x, c.$options).test(String(val ?? ''));
      return op === '$options';
    });
  }
  if (Array.isArray(val) && !Array.isArray(c)) return val.map(norm).includes(norm(c));
  return norm(val ?? null) === norm(c ?? null);
}
const match = (doc, f = {}) => Object.entries(f).every(([k, c]) => (k === '$or' ? c.some((x) => match(doc, x)) : k === '$and' ? c.every((x) => match(doc, x)) : cond(get(doc, k), c)));

function apply(doc, u) {
  const ops = Object.keys(u).some((k) => k.startsWith('$')) ? u : { $set: u };
  for (const [k, v] of Object.entries(ops.$set || {})) put(doc, k, v);
  for (const k of Object.keys(ops.$unset || {})) put(doc, k, undefined);
  for (const [k, v] of Object.entries(ops.$inc || {})) put(doc, k, (get(doc, k) || 0) + v);
  for (const [k, v] of Object.entries(ops.$push || {})) {
    const arr = [...(get(doc, k) || []), ...(v?.$each ?? [v])];
    put(doc, k, v?.$slice < 0 ? arr.slice(v.$slice) : arr);
  }
  for (const [k, v] of Object.entries(ops.$pull || {})) put(doc, k, (get(doc, k) || []).filter((x) => norm(x) !== norm(v)));
}

class Query {
  constructor(run) { this.run = run; this.exclude = []; }
  // Honours exclusion projections ("-meta -x") so tests can prove a field is really withheld.
  select(spec) { if (typeof spec === 'string') this.exclude.push(...spec.split(/\s+/).filter((t) => t.startsWith('-')).map((t) => t.slice(1))); return this; }
  strip(r) { if (r && this.exclude.length) for (const k of this.exclude) delete r[k]; return r; }
  sort() { return this; } limit() { return this; } skip() { return this; } lean() { return this; } populate() { return this; } maxTimeMS() { return this; }
  then(res, rej) { return Promise.resolve().then(() => this.run()).then((r) => (Array.isArray(r) ? r.map((x) => this.strip(x)) : this.strip(r))).then(res, rej); }
  catch(rej) { return this.then(undefined, rej); }
}

export function installMemDb(models) {
  const store = {};
  for (const [name, Model] of Object.entries(models)) {
    const rows = (store[name] = []);
    const unique = Object.entries(Model.schema.paths).filter(([, p]) => p.options?.unique).map(([k]) => k);
    const wrap = (row) => {
      if (!row) return null;
      const d = Object.create(null); Object.assign(d, row);
      Object.defineProperties(d, {
        save: { value: async () => { Object.assign(row, Object.fromEntries(Object.entries(d))); return d; } },
        populate: { value: () => d }, toObject: { value: () => ({ ...d }) }, toJSON: { value: () => ({ ...d }) },
        deleteOne: { value: async () => { rows.splice(rows.indexOf(row), 1); } },
      });
      return d;
    };
    const dup = (data, self) => unique.find((k) => get(data, k) != null && rows.some((r) => r !== self && norm(get(r, k)) === norm(get(data, k))));
    const find = (f) => rows.filter((r) => match(r, f));
    Model.create = async (data) => {
      const doc = new Model(data); await doc.validate();
      const obj = doc.toObject({ depopulate: true, minimize: false });
      const k = dup(obj); if (k) throw Object.assign(new Error('E11000 duplicate key'), { code: 11000, keyPattern: { [k]: 1 } });
      obj.createdAt = new Date(); obj.updatedAt = new Date(); rows.push(obj); return wrap(obj);
    };
    Model.findOne = (f) => new Query(() => wrap(find(f)[0]));
    Model.findById = (id) => Model.findOne({ _id: id });
    Model.find = (f) => new Query(() => find(f).map(wrap));
    Model.exists = (f) => new Query(() => (find(f)[0] ? { _id: find(f)[0]._id } : null));
    Model.countDocuments = (f) => new Query(() => find(f).length);
    Model.findOneAndUpdate = (f, u, o = {}) => new Query(async () => {
      let row = find(f)[0]; const before = row ? structuredClone(row) : null;
      if (!row) {
        if (!o.upsert) return null;
        const seed = Object.fromEntries(Object.entries(f).filter(([k, c]) => !k.startsWith('$') && !isObj(c))); Object.assign(seed, u.$setOnInsert || {});
        row = { _id: seed._id ?? new mongoose.Types.ObjectId(), ...seed }; rows.push(row);
      }
      apply(row, u); row.updatedAt = new Date();
      return wrap(o.new ? row : before);
    });
    Model.findByIdAndUpdate = (id, u, o) => Model.findOneAndUpdate({ _id: id }, u, o);
    Model.updateOne = (f, u) => new Query(async () => { const r = find(f)[0]; if (r) { apply(r, u); r.updatedAt = new Date(); } return { modifiedCount: r ? 1 : 0, matchedCount: r ? 1 : 0 }; });
    Model.updateMany = (f, u) => new Query(async () => { const rs = find(f); rs.forEach((r) => apply(r, u)); return { modifiedCount: rs.length }; });
    Model.deleteOne = (f) => new Query(async () => { const r = find(f)[0]; if (r) rows.splice(rows.indexOf(r), 1); return { deletedCount: r ? 1 : 0 }; });
    Model.deleteMany = (f) => new Query(async () => { const rs = find(f); rs.forEach((r) => rows.splice(rows.indexOf(r), 1)); return { deletedCount: rs.length }; });
    Model.findByIdAndDelete = (id) => new Query(async () => { const r = find({ _id: id })[0]; if (r) rows.splice(rows.indexOf(r), 1); return wrap(r); });
  }
  return { store, clear: () => Object.values(store).forEach((r) => { r.length = 0; }) };
}
