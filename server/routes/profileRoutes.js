import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { changePassword, getProfile, updateProfile, uploadProfileImage } from '../controllers/profileController.js';
import { imageUpload } from '../utils/upload.js';

const router = Router();
router.get('/profile', protect, getProfile);
router.patch('/profile', protect, updateProfile);
router.post('/profile/image', protect, imageUpload.single('image'), uploadProfileImage);
router.post('/profile/change-password', protect, changePassword);
export default router;
