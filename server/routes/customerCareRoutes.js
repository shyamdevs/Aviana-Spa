
const express = require("express");
const crypto = require("node:crypto");
const { GoogleGenAI } = require("@google/genai");
const nodemailer = require("nodemailer");
const SupportTicket = require("../models/SupportTicket");

const router = express.Router();

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

const smtpPort = Number(process.env.SMTP_PORT || 587);

const mailer =
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    : null;

/*
  IMPORTANT:
  Replace this placeholder with verified Aviana service
  names, prices, durations and policies before launch.
  Do not put private keys or customer information here.
*/
const BUSINESS_CONTEXT = `
You are Aviana Spa's polite customer-care assistant.

Use only verified information about Aviana Spa.
Never invent service prices, durations, therapist availability,
booking status, discounts, refunds or payment status.

If exact information is unavailable, tell the visitor politely
that the team or the website's service listing can confirm it.

Never ask for passwords, OTPs or full payment-card details.
For booking changes, payment disputes, complaints or account
problems requiring access to private records, offer human support.

Keep responses friendly, professional and concise.
`;

function wantsHumanSupport(message) {
  return /\b(customer care|customer support|human|real person|live agent|support agent|representative|talk to.*(person|agent|support|customer care|someone|somebody)|speak to.*(person|agent|support|customer care|someone|somebody)|connect me with.*(support|person|agent|customer care))\b/i.test(
    message
  );
}

/* POST /api/chat */
router.post("/chat", async (req, res) => {
  try {
    const message =
      typeof req.body?.message === "string"
        ? req.body.message.trim()
        : "";

    if (!message) {
      return res.status(400).json({
        error: "Please enter a message.",
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        error: "Message is too long. Please use 2000 characters or fewer.",
      });
    }

    // Allow human handoff even if the AI key is unavailable.
    if (wantsHumanSupport(message)) {
      return res.json({
        reply:
          "Of course! Our customer-care team can help you with this. Please fill out the form below so the team can follow up with you.",
        handoff: true,
      });
    }

    if (!ai) {
      return res.status(503).json({
        error: "Aviana Care is not configured yet. Please try again later.",
      });
    }

    const interaction = await ai.interactions.create({
      model,
      system_instruction: BUSINESS_CONTEXT,
      input: message,
      generation_config: {
        max_output_tokens: 300,
      },
    });

    const reply = interaction.output_text?.trim();

    if (!reply) {
      return res.status(502).json({
        error: "Aviana Care couldn't generate a reply. Please try again.",
      });
    }

    return res.json({
      reply,
      handoff: false,
    });
  } catch (error) {
    console.error("Aviana Care chat error:", error.message);

    return res.status(502).json({
      error: "Aviana Care is temporarily unavailable. Please try again.",
    });
  }
});

/* POST /api/support-tickets */
router.post("/support-tickets", async (req, res) => {
  try {
    const name =
      typeof req.body?.name === "string" ? req.body.name.trim() : "";

    const contact =
      typeof req.body?.contact === "string"
        ? req.body.contact.trim()
        : "";

    const message =
      typeof req.body?.message === "string"
        ? req.body.message.trim()
        : "";

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({
        error: "Please enter a name between 2 and 100 characters.",
      });
    }

    if (contact.length < 4 || contact.length > 200) {
      return res.status(400).json({
        error: "Please enter a valid email address or phone contact.",
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        error: "Your message must be 1000 characters or fewer.",
      });
    }

    const reference =
      "AVC-" + crypto.randomBytes(4).toString("hex").toUpperCase();

    // Save the ticket in the existing MongoDB database.
    await SupportTicket.create({
      reference,
      name,
      contact,
      message,
      status: "open",
      source: "website_chat",
    });

    // Optional email notification to the support team.
    // A mail failure must not undo the saved ticket.
    if (mailer && process.env.CUSTOMER_CARE_EMAIL) {
      try {
        await mailer.sendMail({
          from: process.env.MAIL_FROM || process.env.SMTP_USER,
          to: process.env.CUSTOMER_CARE_EMAIL,
          subject: `New Aviana Care ticket: ${reference}`,
          text: [
            `Reference: ${reference}`,
            `Name: ${name}`,
            `Contact: ${contact}`,
            `Message: ${message || "No additional message provided."}`,
            "",
            "Please follow up with this customer.",
          ].join("\n"),
        });
      } catch (mailError) {
        console.error(
          "Aviana Care email notification failed:",
          mailError.message
        );
      }
    }

    return res.status(201).json({ reference });
  } catch (error) {
    console.error("Aviana Care ticket error:", error.message);

    return res.status(500).json({
      error: "We couldn't save your support request. Please try again.",
    });
  }
});

module.exports = router;
