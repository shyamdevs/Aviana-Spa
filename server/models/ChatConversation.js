import mongoose from "mongoose";

/*
 * One conversation document per signed-in user (userId is unique). Guests are
 * never persisted. Every query against this collection MUST be scoped by a
 * userId taken from the verified session (req.user._id) - see utils/chatStore.js,
 * which is the only module allowed to touch this model.
 */
const chatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    // Client-generated idempotency key shared by the user message and its reply.
    // Lets a retry after a lost response return the stored reply instead of
    // calling Gemini again or saving the turn twice.
    requestId: {
      type: String,
      maxlength: 64,
      default: undefined,
    },
  },
  { timestamps: true }
);

const chatConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    messages: {
      type: [chatMessageSchema],
      default: [],
    },
    // Data minimisation: conversations are deleted automatically after the
    // configured retention period of inactivity (CHAT_RETENTION_DAYS).
    expiresAt: {
      type: Date,
      default: undefined,
    },
  },
  { timestamps: true }
);

chatConversationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const ChatConversation =
  mongoose.models.ChatConversation ||
  mongoose.model("ChatConversation", chatConversationSchema);

export default ChatConversation;
