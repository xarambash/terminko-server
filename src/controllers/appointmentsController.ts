import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  createAppointment,
  getAppointments,
  cancelAppointment,
  cancelAppointmentByCode,
} from '../services/appointmentsService.js';
import type { GetAppointmentsFilters } from '../types/appointments.js';
import { getTenantId } from '../utils/requestUtils.js';
import { DATE_REGEX } from '../utils/validation.js';

const createAppointmentSchema = z.object({
  resourceId: z.uuid(),
  serviceId: z.uuid(),
  guest: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
  }),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  priceAtBooking: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

export async function getAppointmentsHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req)!;
  const resourceIdFromQuery =
    typeof req.query.resourceId === 'string' ? req.query.resourceId : undefined;
  const guestId = typeof req.query.guestId === 'string' ? req.query.guestId : undefined;
  const date = typeof req.query.date === 'string' && DATE_REGEX.test(req.query.date)
    ? req.query.date
    : undefined;

  try {
    const filters: GetAppointmentsFilters = { tenantId };

    if (req.user?.role === 'staff') {
      if (!req.user.resourceId) {
        res.status(403).json({ error: 'Staff account is not linked to a resource' });
        return;
      }
      filters.resourceId = req.user.resourceId;
    } else if (resourceIdFromQuery) {
      filters.resourceId = resourceIdFromQuery;
    }

    if (guestId) filters.guestId = guestId;
    if (date) filters.date = date;
    const appointments = await getAppointments(filters);
    res.json(appointments);
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
}

export async function createAppointmentHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req)!;
  const parsed = createAppointmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;

  if (data.endAt <= data.startAt) {
    res.status(400).json({ error: 'endAt must be after startAt' });
    return;
  }

  try {
    const appointment = await createAppointment({
      tenantId,
      resourceId: data.resourceId,
      serviceId: data.serviceId,
      guest: data.guest,
      startAt: data.startAt,
      endAt: data.endAt,
      priceAtBooking: data.priceAtBooking,
      notes: data.notes,
    });
    if (!appointment) {
      res.status(400).json({
        error: 'Invalid request: resource or service not found; or resource does not offer this service; or time slot is already booked',
      });
      return;
    }
    res.status(201).json(appointment);
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
}

const cancelAppointmentSchema = z.object({
  cancellationCode: z.string().min(1),
});

export async function cancelAppointmentHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req)!;
  const appointmentId = req.params.id;
  const appointmentIdStr = typeof appointmentId === 'string' ? appointmentId : appointmentId?.[0];

  if (!appointmentIdStr) {
    res.status(400).json({ error: 'Appointment ID is required' });
    return;
  }

  const parsed = cancelAppointmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  try {
    const appointment = await cancelAppointment(
      appointmentIdStr,
      tenantId,
      parsed.data.cancellationCode
    );
    if (!appointment) {
      res.status(404).json({
        error: 'Appointment not found, already canceled, or cancellation code does not match',
      });
      return;
    }
    res.json(appointment);
  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
}

export async function cancelAppointmentByCodeHandler(req: Request, res: Response) {
  const tenantId = getTenantId(req)!;
  const parsed = cancelAppointmentSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten() });
    return;
  }

  try {
    const appointment = await cancelAppointmentByCode(tenantId, parsed.data.cancellationCode);
    if (!appointment) {
      res.status(404).json({
        error: 'Appointment not found, already canceled, or cancellation code does not match',
      });
      return;
    }
    res.json(appointment);
  } catch (error) {
    console.error('Cancel appointment by code error:', error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
}
