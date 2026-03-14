import 'dotenv/config';
import express from 'express';
import { prisma } from './db.js';
import {
  optionalAuth,
  requireAuth,
  requireOwner,
  requireOwnerOrOwnResource,
  requireTenantAccess,
} from './middleware/authMiddleware.js';
import tenantsRoutes from './routes/tenantsRoutes.js';
import resourcesRoutes from './routes/resourcesRoutes.js';
import resourceServicesRoutes from './routes/resourceServicesRoutes.js';
import resourceWorkingHoursRoutes from './routes/resourceWorkingHoursRoutes.js';
import resourceFreeDaysRoutes from './routes/resourceFreeDaysRoutes.js';
import servicesRoutes from './routes/servicesRoutes.js';
import guestsRoutes from './routes/guestsRoutes.js';
import appointmentsRoutes from './routes/appointmentsRoutes.js';
import authRoutes from './routes/authRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.use('/auth', authRoutes);

app.use(
  '/tenants/:tenantId/appointments',
  (req, res, next) => (req.method === 'POST' ? next() : optionalAuth(req, res, next)),
  (req, res, next) => (req.user ? requireTenantAccess(req, res, next) : next()),
  appointmentsRoutes
);

app.use(
  '/tenants/:tenantId/resources/:resourceId/services',
  requireAuth,
  requireTenantAccess,
  requireOwnerOrOwnResource,
  resourceServicesRoutes
);
app.use(
  '/tenants/:tenantId/resources/:resourceId/working-hours',
  requireAuth,
  requireTenantAccess,
  requireOwnerOrOwnResource,
  resourceWorkingHoursRoutes
);
app.use(
  '/tenants/:tenantId/resources/:resourceId/free-days',
  requireAuth,
  requireTenantAccess,
  requireOwnerOrOwnResource,
  resourceFreeDaysRoutes
);
app.use(
  '/tenants/:tenantId/resources',
  requireAuth,
  requireTenantAccess,
  (req, res, next) => (req.method === 'POST' ? requireOwner(req, res, next) : next()),
  resourcesRoutes
);
app.use('/tenants/:tenantId/services', requireAuth, requireTenantAccess, servicesRoutes);
app.use('/tenants/:tenantId/guests', requireAuth, requireTenantAccess, guestsRoutes);
app.use('/tenants', tenantsRoutes);

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});
