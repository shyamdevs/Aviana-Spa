import express from 'express';

import { protect, optionalProtect } from '../middleware/auth.js';
import { noStore, requireJsonBody } from '../middleware/requestGuards.js';
import {
  chatIpLimiter, chatUserLimiter, guestChatIpLimiter, historyLimiter, ticketIpLimiter, ticketUserLimiter,
} from '../utils/rateLimiters.js';
import {
  chatAuthenticated, chatGuest, createSupportTicket, deleteChatHistory, getChatHistory, getSupportTicket,
} from '../controllers/customerCareController.js';

/*
 * Aviana Care routes (mounted at /api).
 *
 *   PUBLIC  (no account data, nothing stored)
 *     POST /chat/guest              stateless service enquiries
 *     POST /support-tickets         guests allowed; owner set only if signed in
 *   PRIVATE (verified session required, scoped to req.user._id)
 *     POST   /chat                  saved conversation
 *     GET    /chat/history
 *     DELETE /chat/history
 *     GET    /support-tickets/:reference   owner only
 *
 * Rate limiters run BEFORE authentication so unauthenticated floods never reach
 * the database; per-user limits run after it.
 */
const router = express.Router();

router.use(['/chat', '/support-tickets'], noStore);

router.post('/chat/guest', requireJsonBody, guestChatIpLimiter, chatGuest);

router.post('/chat', requireJsonBody, chatIpLimiter, protect, chatUserLimiter, chatAuthenticated);
router.get('/chat/history', historyLimiter, protect, getChatHistory);
router.delete('/chat/history', historyLimiter, protect, deleteChatHistory);

const ticketUserGate = (req, res, next) => (req.user ? ticketUserLimiter(req, res, next) : next());
router.post('/support-tickets', requireJsonBody, ticketIpLimiter, optionalProtect, ticketUserGate, createSupportTicket);
router.get('/support-tickets/:reference', historyLimiter, protect, getSupportTicket);

export default router;
