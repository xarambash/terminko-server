import { Router } from 'express';
import {
  createWorkingHourHandler,
  getWorkingHoursHandler,
} from '../controllers/resourceWorkingHoursController.js';

const router = Router({ mergeParams: true });

router.get('/', getWorkingHoursHandler);
router.post('/', createWorkingHourHandler);

export default router;
