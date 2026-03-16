import { Router } from 'express';
import {
  createAppointmentHandler,
  getAppointmentsHandler,
  cancelAppointmentHandler,
} from '../controllers/appointmentsController.js';

const router = Router({ mergeParams: true });

router.get('/', getAppointmentsHandler);
router.post('/', createAppointmentHandler);
router.patch('/:id', cancelAppointmentHandler);

export default router;
