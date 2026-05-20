import { Router } from 'express';
import {
  createResourceServiceHandler,
  deleteResourceServiceHandler,
  getResourceServicesHandler,
  updateResourceServiceHandler,
} from '../controllers/resourceServicesController.js';

const router = Router({ mergeParams: true });

router.get('/', getResourceServicesHandler);
router.post('/', createResourceServiceHandler);
router.patch('/:resourceServiceId', updateResourceServiceHandler);
router.delete('/:resourceServiceId', deleteResourceServiceHandler);

export default router;
