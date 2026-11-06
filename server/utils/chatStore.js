import mongoose from 'mongoose';
import ChatConversation from '../models/ChatConversation.js';
import { aiConfig } from '../config/ai.js';

/*
 * Conversation persistence for SIGNED-IN users only.
 *
 * Ownership rule: every function takes `userId` as its first argument and puts it
 * in the query filter. Callers must pass req.user._id from the verified session;
 * nothing in this module reads a user id from a request. There is deliberately no
 * function that looks a conversation up by anything other than the owner's id.
 */

function ownerId(userId) {
  if (!userId || !mongoose.isValidObjectId(userId)) {
    const error = new Error('A verified user is required.');
    error.status = 401;
    throw error;
  }
  return userId;
}

const toPlain = (m) => ({
  id: String(m._id),
  role: m.role,
  content: m.content,
  requestId: m.requestId,
  createdAt: m.createdAt,
});

/** Newest `limit` messages, oldest first. Only the slice is read from MongoDB. */
export async function loadRecentMessages(userId, limit) {
  const owner = ownerId(userId);
  const doc = await ChatConversation.findOne({ userId: owner })
    .select({ messages: { $slice: -Math.max(1, limit) } })
    .maxTimeMS(2500)
    .lean();
  return (doc?.messages ?? []).map(toPlain);
}

/** If this requestId already completed for this user, returns the stored reply. */
export async function findCompletedReply(userId, requestId) {
  if (!requestId) return null;
  const owner = ownerId(userId);
  const doc = await ChatConversation.findOne({
    userId: owner,
    messages: { $elemMatch: { requestId, role: 'assistant' } },
  })
    .select({ 'messages.$': 1 })
    .maxTimeMS(2500)
    .lean();
  return doc?.messages?.[0]?.content ?? null;
}

/**
 * Atomically appends one user+assistant pair (a single $push, so a pair can never
 * be split or interleaved with another request's pair). Idempotent per requestId.
 * @returns {'saved'|'duplicate'}
 */
export async function appendTurn(userId, { requestId, userText, assistantText }) {
  const owner = ownerId(userId);
  const { maxStoredMessages, retentionDays } = aiConfig.chat;
  const filter = { userId: owner, ...(requestId ? { 'messages.requestId': { $ne: requestId } } : {}) };
  const update = {
    $set: { expiresAt: new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000) },
    $push: {
      messages: {
        $each: [
          { role: 'user', content: userText, ...(requestId ? { requestId } : {}) },
          { role: 'assistant', content: assistantText, ...(requestId ? { requestId } : {}) },
        ],
        $slice: -maxStoredMessages,
      },
    },
  };

  try {
    await ChatConversation.findOneAndUpdate(filter, update, { upsert: true, new: true, setDefaultsOnInsert: true }).maxTimeMS(3000);
    return 'saved';
  } catch (error) {
    // E11000 on the unique userId index means either the pair already exists (the
    // $ne filter excluded the document) or two first messages raced. Re-check.
    if (error?.code === 11000) {
      if (requestId && (await findCompletedReply(owner, requestId))) return 'duplicate';
      await ChatConversation.findOneAndUpdate({ userId: owner }, update, { upsert: true }).maxTimeMS(3000);
      return 'saved';
    }
    throw error;
  }
}

/** Deletes the owner's entire conversation document. */
export async function deleteConversation(userId) {
  const owner = ownerId(userId);
  const result = await ChatConversation.deleteOne({ userId: owner });
  return result.deletedCount ?? 0;
}
