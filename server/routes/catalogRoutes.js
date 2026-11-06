import { Router } from 'express'; import { getService, getTherapist, listServices, listTherapists } from '../controllers/catalogController.js';
import { listPublicExtraServices } from '../controllers/extraServiceController.js';
const router = Router(); router.get('/services', listServices); router.get('/services/:id', getService); router.get('/therapists', listTherapists); router.get('/therapists/:id', getTherapist); router.get('/extra-services', listPublicExtraServices); export default router;
