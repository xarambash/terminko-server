import { Router } from 'express';
import { getGuestsHandler } from '../controllers/guestsController.js';

const router = Router({ mergeParams: true });

router.get('/', getGuestsHandler);

export default router;
