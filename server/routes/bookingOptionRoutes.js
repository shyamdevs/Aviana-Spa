import { Router } from 'express';
import { protectAdmin } from '../middleware/adminAuth.js';
import { createBookingOption, deleteBookingOption, getAdminBookingOption, getPublicBookingOption, setBookingOptionActive, updateBookingOption } from '../controllers/bookingOptionController.js';

export const publicBookingOptionRouter = Router();
publicBookingOptionRouter.get('/booking-option', getPublicBookingOption);

export const adminBookingOptionRouter = Router();
adminBookingOptionRouter.get('/booking-option', protectAdmin, getAdminBookingOption);
adminBookingOptionRouter.post('/booking-option', protectAdmin, createBookingOption);
adminBookingOptionRouter.patch('/booking-option/:id', protectAdmin, updateBookingOption);
adminBookingOptionRouter.put('/booking-option/:id', protectAdmin, updateBookingOption);
adminBookingOptionRouter.patch('/booking-option/:id/status', protectAdmin, setBookingOptionActive);
adminBookingOptionRouter.delete('/booking-option/:id', protectAdmin, deleteBookingOption);
