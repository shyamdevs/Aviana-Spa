import { Router } from 'express';
import { forgotPassword, googleLogin, login, logout, me, refresh, register, resetPassword, session } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
const router = Router();
router.post('/register', register); router.post('/login', login); router.post('/google', googleLogin); router.post('/refresh', refresh); router.post('/logout', logout); router.post('/forgot-password', forgotPassword); router.post('/reset-password', resetPassword); router.get('/me', protect, me); router.get('/session', session);
export default router;
