import { Router } from 'express';
import {
  createAppointmentHandler,
  getAppointmentsHandler,
  cancelAppointmentHandler,
  cancelAppointmentByCodeHandler,
} from '../controllers/appointmentsController.js';

const router = Router({ mergeParams: true });

router.get('/', getAppointmentsHandler);
router.post('/', createAppointmentHandler);
router.patch('/cancel-by-code', cancelAppointmentByCodeHandler);
router.patch('/:id', cancelAppointmentHandler);

export default router;
