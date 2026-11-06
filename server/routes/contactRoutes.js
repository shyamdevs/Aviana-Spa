import { Router } from 'express';
import { createContact } from '../controllers/contactController.js';
import { contactLimiters } from '../utils/authLimiters.js';

const router = Router();
router.post('/contact', ...contactLimiters, createContact);
export default router;
