import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { chatCustomerCare, createSupportTicket } from '../controllers/customerCareController.js';

const router = Router();

const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { success: false, message: 'You have sent several messages. Please wait a few minutes and try again.' },
});

const ticketLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { success: false, message: 'Too many support requests were submitted. Please try again later.' },
});

router.post('/chat', chatLimiter, chatCustomerCare);
router.post('/tickets', ticketLimiter, createSupportTicket);

export default router;
