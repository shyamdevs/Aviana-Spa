import mongoose from 'mongoose';

const supportMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true, maxlength: 1200 },
}, { _id: false });

const supportTicketSchema = new mongoose.Schema({
  reference: { type: String, required: true, unique: true, index: true },
  customerName: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, default: '', trim: true, lowercase: true, maxlength: 254 },
  phone: { type: String, default: '', trim: true, maxlength: 30 },
  messages: { type: [supportMessageSchema], default: [] },
  status: { type: String, enum: ['open', 'in_progress', 'closed'], default: 'open', index: true },
  source: { type: String, enum: ['website_chat'], default: 'website_chat' },
}, { timestamps: true });

supportTicketSchema.index({ createdAt: -1 });

export default mongoose.model('SupportTicket', supportTicketSchema);
