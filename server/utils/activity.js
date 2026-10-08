import ActivityLog from '../models/ActivityLog.js';

export async function logActivity({ actorType, actorId, action, entityType, entityId, metadata, ip }) {
  try {
    await ActivityLog.create({ actorType, actorId, action, entityType, entityId, metadata, ip });
  } catch (error) {
    console.error('Activity log failed', error.message);
  }
}
