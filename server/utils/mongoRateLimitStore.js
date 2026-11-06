import RateLimitHit from '../models/RateLimitHit.js';

/*
 * express-rate-limit store backed by MongoDB so limits hold across Vercel's
 * isolated serverless instances (the default MemoryStore is per-instance).
 * Fixed windows: one document per (key, window). The increment is a single atomic
 * upsert with $inc, so concurrent requests can never lose a count.
 */
export class MongoRateLimitStore {
  localKeys = false;

  constructor({ prefix, windowMs, model = RateLimitHit, now = Date.now }) {
    this.prefix = prefix;
    this.windowMs = windowMs;
    this.model = model;
    this.now = now;
  }

  init(options) {
    if (!this.windowMs) this.windowMs = options.windowMs;
  }

  #window() {
    const index = Math.floor(this.now() / this.windowMs);
    return { index, resetTime: new Date((index + 1) * this.windowMs) };
  }

  #id(key, index) {
    return `${this.prefix}:${key}:${index}`;
  }

  async increment(key) {
    const { index, resetTime } = this.#window();
    const _id = this.#id(key, index);
    const update = { $inc: { hits: 1 }, $setOnInsert: { expiresAt: new Date(resetTime.getTime() + 60_000) } };
    const options = { upsert: true, new: true };

    let doc;
    try {
      doc = await this.model.findOneAndUpdate({ _id }, update, options);
    } catch (error) {
      // Two first-ever requests can race on the upsert; the loser retries once.
      if (error?.code !== 11000) throw error;
      doc = await this.model.findOneAndUpdate({ _id }, update, options);
    }
    return { totalHits: Number(doc?.hits ?? 1), resetTime };
  }

  async decrement(key) {
    const { index } = this.#window();
    await this.model.updateOne({ _id: this.#id(key, index), hits: { $gt: 0 } }, { $inc: { hits: -1 } });
  }

  async resetKey(key) {
    const { index } = this.#window();
    await this.model.deleteOne({ _id: this.#id(key, index) });
  }
}
