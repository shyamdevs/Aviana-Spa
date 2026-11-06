import { Router } from 'express';
import { guard } from '../middleware/adminAuth.js';
import { createBookingOption, deleteBookingOption, getAdminBookingOption, getPublicBookingOption, setBookingOptionActive, updateBookingOption } from '../controllers/bookingOptionController.js';

export const publicBookingOptionRouter = Router();
publicBookingOptionRouter.get('/booking-option', getPublicBookingOption);

export const adminBookingOptionRouter = Router();
adminBookingOptionRouter.get('/booking-option', ...guard('dashboard'), getAdminBookingOption);
adminBookingOptionRouter.post('/booking-option', ...guard('catalog:write'), createBookingOption);
adminBookingOptionRouter.patch('/booking-option/:id', ...guard('catalog:write'), updateBookingOption);
adminBookingOptionRouter.put('/booking-option/:id', ...guard('catalog:write'), updateBookingOption);
adminBookingOptionRouter.patch('/booking-option/:id/status', ...guard('catalog:write'), setBookingOptionActive);
adminBookingOptionRouter.delete('/booking-option/:id', ...guard('catalog:write'), deleteBookingOption);
