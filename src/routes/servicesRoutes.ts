import { Router } from 'express';
import {
  createServiceHandler,
  deleteServiceHandler,
  getServicesHandler,
  updateServiceHandler,
} from '../controllers/servicesController.js';

const router = Router({ mergeParams: true });

router.get('/', getServicesHandler);
router.post('/', createServiceHandler);
router.patch('/:serviceId', updateServiceHandler);
router.delete('/:serviceId', deleteServiceHandler);

export default router;
