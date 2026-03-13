import { Router } from 'express';
import {
  createResourceServiceHandler,
  getResourceServicesHandler,
} from '../controllers/resourceServicesController.js';

const router = Router({ mergeParams: true });

router.get('/', getResourceServicesHandler);
router.post('/', createResourceServiceHandler);

export default router;
