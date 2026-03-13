import { Router } from 'express';
import { createResourceHandler, getResourcesHandler } from '../controllers/resourcesController.js';

const router = Router({ mergeParams: true });

router.get('/', getResourcesHandler);
router.post('/', createResourceHandler);

export default router;
