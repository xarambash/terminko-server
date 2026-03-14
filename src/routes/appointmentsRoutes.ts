import { Router } from 'express';
import {
  createAppointmentHandler,
  getAppointmentsHandler,
} from '../controllers/appointmentsController.js';

const router = Router({ mergeParams: true });

router.get('/', getAppointmentsHandler);
router.post('/', createAppointmentHandler);

export default router;
