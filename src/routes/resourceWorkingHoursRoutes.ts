import { Router } from 'express';
import {
  createWorkingHourHandler,
  deleteWorkingHourHandler,
  getWorkingHoursHandler,
  updateWorkingHourHandler,
} from '../controllers/resourceWorkingHoursController.js';

const router = Router({ mergeParams: true });

router.get('/', getWorkingHoursHandler);
router.post('/', createWorkingHourHandler);
router.patch('/:workingHourId', updateWorkingHourHandler);
router.delete('/:workingHourId', deleteWorkingHourHandler);

export default router;
