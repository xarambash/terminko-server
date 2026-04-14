import { Router } from 'express';
import {
  createResourceHandler,
  deleteResourceHandler,
  getResourcesHandler,
} from '../controllers/resourcesController.js';

const router = Router({ mergeParams: true });

router.get('/', getResourcesHandler);
router.post('/', createResourceHandler);
router.delete('/:resourceId', deleteResourceHandler);

export default router;
