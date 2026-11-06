import { Router } from 'express';
import { googleLogin, login, loginMfa, logout, me, refresh, session } from '../controllers/authController.js';
import { forgotPassword, completeReset, resendReset, verifyResetOtp } from '../controllers/passwordResetController.js';
import { resendRegistration, startRegistration, verifyRegistration } from '../controllers/registrationController.js';
import { mfaDisable, mfaEnable, mfaSetup, rotateRecoveryCodes } from '../controllers/mfaController.js';
import { logoutAll, mySessions, revokeMySession } from '../controllers/sessionController.js';
import { protect } from '../middleware/auth.js';
import { loginLimiters, mfaLimiter, otpResendLimiters, otpStartLimiters, otpVerifyLimiters, resetCompleteLimiter } from '../utils/authLimiters.js';

const router = Router();
// Registration: nothing is created until the e-mailed OTP is verified; no session is issued afterwards.
router.post('/register', ...otpStartLimiters, startRegistration);
router.post('/register/verify', ...otpVerifyLimiters, verifyRegistration);
router.post('/register/resend', ...otpResendLimiters, resendRegistration);
// Password recovery: OTP -> single-use reset-authorization token -> password-only change.
router.post('/password/forgot', ...otpStartLimiters, forgotPassword);
router.post('/password/verify-otp', ...otpVerifyLimiters, verifyResetOtp);
router.post('/password/resend', ...otpResendLimiters, resendReset);
router.post('/password/reset', resetCompleteLimiter, completeReset);
// Sessions
router.post('/login', ...loginLimiters, login);
router.post('/login/mfa', mfaLimiter, loginMfa);
router.post('/google', ...loginLimiters, googleLogin);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.get('/session', session);
router.get('/me', protect, me);
router.get('/sessions', protect, mySessions);
router.delete('/sessions/:id', protect, revokeMySession);
router.post('/logout-all', protect, logoutAll);
// Optional TOTP for customers
router.post('/mfa/setup', protect, mfaLimiter, mfaSetup);
router.post('/mfa/enable', protect, mfaLimiter, mfaEnable);
router.post('/mfa/disable', protect, mfaLimiter, mfaDisable);
router.post('/mfa/recovery-codes', protect, mfaLimiter, rotateRecoveryCodes);
export default router;
