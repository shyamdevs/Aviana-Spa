import { Router } from 'express'; import { createContact } from '../controllers/contactController.js';
const router = Router(); router.post('/contact', createContact); export default router;
