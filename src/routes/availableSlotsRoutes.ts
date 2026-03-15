import { Router } from 'express';
import { getAvailableSlotsHandler } from '../controllers/availableSlotsController.js';

const router = Router({ mergeParams: true });

router.get('/', getAvailableSlotsHandler);

export default router;
