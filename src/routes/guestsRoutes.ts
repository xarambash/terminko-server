import { Router } from 'express';
import { createGuestHandler, getGuestsHandler } from '../controllers/guestsController.js';

const router = Router({ mergeParams: true });

router.get('/', getGuestsHandler);
router.post('/', createGuestHandler);

export default router;
