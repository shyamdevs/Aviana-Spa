/*
 * One-off: gives pre-existing chat conversations a retention expiry so the TTL index
 * can delete them. Safe to re-run (only touches documents with no expiresAt).
 *   npm --prefix server run migrate:chat-expiry
 */
import mongoose from 'mongoose';
import '../config/env.js';
import { aiConfig } from '../config/ai.js';
import { connectDB } from '../config/db.js';
import ChatConversation from '../models/ChatConversation.js';

await connectDB();
const days = aiConfig.chat.retentionDays;
const result = await ChatConversation.updateMany(
  { expiresAt: { $exists: false } },
  [{ $set: { expiresAt: { $dateAdd: { startDate: { $ifNull: ['$updatedAt', '$$NOW'] }, unit: 'day', amount: days } } } }]
);
console.log(`Backfilled expiry on ${result.modifiedCount} conversation(s) (retention ${days} days).`);
await mongoose.disconnect();
