import mongoose from "mongoose";

const supportTicketSchema = new mongoose.Schema(
  {
    reference: {
      type: String,
      required: true,
      unique: true,
    },

    // Owner. Set only from the verified session (never from the request body).
    // null = guest ticket: it has no owner, cannot be read back through the API,
    // and is followed up by staff using the contact details supplied.
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    contact: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },

    contactType: {
      type: String,
      enum: ["email", "phone"],
      default: undefined,
    },

    message: {
      type: String,
      default: "",
      maxlength: 1000,
    },

    status: {
      type: String,
      enum: ["open", "in_progress", "resolved"],
      default: "open",
    },

    source: {
      type: String,
      default: "website_chat",
    },

    // Idempotency: identical submissions from the same owner inside one time
    // bucket collapse into a single ticket (see utils/supportTickets.js).
    dedupeKey: {
      type: String,
      default: undefined,
      select: false,
    },

    // Whether the staff e-mail was delivered. A failed e-mail never fails the ticket.
    notificationStatus: {
      type: String,
      enum: ["pending", "sent", "failed", "skipped"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

supportTicketSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

const SupportTicket =
  mongoose.models.SupportTicket ||
  mongoose.model("SupportTicket", supportTicketSchema);

export default SupportTicket;
