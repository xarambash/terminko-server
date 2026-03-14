import 'dotenv/config';
import express from 'express';
import { prisma } from './db.js';
import tenantsRoutes from './routes/tenantsRoutes.js';
import resourcesRoutes from './routes/resourcesRoutes.js';
import resourceServicesRoutes from './routes/resourceServicesRoutes.js';
import resourceWorkingHoursRoutes from './routes/resourceWorkingHoursRoutes.js';
import resourceFreeDaysRoutes from './routes/resourceFreeDaysRoutes.js';
import servicesRoutes from './routes/servicesRoutes.js';
import guestsRoutes from './routes/guestsRoutes.js';
import appointmentsRoutes from './routes/appointmentsRoutes.js';

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

app.use('/tenants/:tenantId/resources/:resourceId/services', resourceServicesRoutes);
app.use('/tenants/:tenantId/resources/:resourceId/working-hours', resourceWorkingHoursRoutes);
app.use('/tenants/:tenantId/resources/:resourceId/free-days', resourceFreeDaysRoutes);
app.use('/tenants/:tenantId/resources', resourcesRoutes);
app.use('/tenants/:tenantId/services', servicesRoutes);
app.use('/tenants/:tenantId/guests', guestsRoutes);
app.use('/tenants/:tenantId/appointments', appointmentsRoutes);
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
