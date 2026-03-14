import { Router } from 'express';
import {
  createFreeDayHandler,
  getFreeDaysHandler,
} from '../controllers/resourceFreeDaysController.js';

const router = Router({ mergeParams: true });

router.get('/', getFreeDaysHandler);
router.post('/', createFreeDayHandler);

export default router;
