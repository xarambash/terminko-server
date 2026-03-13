import { Router } from 'express';
import { createTenantHandler, getTenantBySlugHandler } from '../controllers/tenantsController.js';

const router = Router();

router.get('/:slug', getTenantBySlugHandler);
router.post('/', createTenantHandler);

export default router;
