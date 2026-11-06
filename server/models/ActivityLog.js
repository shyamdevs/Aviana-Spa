import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  actorType: { type: String, enum: ['user', 'admin', 'system'], required: true },
  actorId: mongoose.Schema.Types.ObjectId,
  action: { type: String, required: true },
  entityType: { type: String, required: true },
  entityId: mongoose.Schema.Types.ObjectId,
  metadata: mongoose.Schema.Types.Mixed,
  ip: String
}, { timestamps: true });

export default mongoose.model('ActivityLog', activityLogSchema);
