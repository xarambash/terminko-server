import { Router } from 'express';
import { createServiceHandler, getServicesHandler } from '../controllers/servicesController.js';

const router = Router({ mergeParams: true });

router.get('/', getServicesHandler);
router.post('/', createServiceHandler);

export default router;
