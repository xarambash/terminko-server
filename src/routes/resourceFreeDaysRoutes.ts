import { Router } from 'express';
import {
  createFreeDayHandler,
  deleteFreeDayHandler,
  getFreeDaysHandler,
} from '../controllers/resourceFreeDaysController.js';

const router = Router({ mergeParams: true });

router.get('/', getFreeDaysHandler);
router.post('/', createFreeDayHandler);
router.delete('/:freeDayId', deleteFreeDayHandler);

export default router;
