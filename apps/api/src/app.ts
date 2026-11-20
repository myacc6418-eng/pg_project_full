import express, { NextFunction, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from './modules/auth/auth.routes';
import propertiesRoutes from './modules/properties/properties.routes';
import operationsRoutes from './modules/operations/operations.routes';
import monetizationRoutes from './modules/monetization/monetization.routes';
import eventsRoutes from './modules/events/events.routes';
import adminRoutes from './modules/admin/admin.routes';

export function createApiApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  app.get('/api/v1/health', (_req, res) => {
    res.json({ ok: true, service: 'pg-finder-modular-monolith', version: 'v1' });
  });

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/properties', propertiesRoutes);
  app.use('/api/v1/operations', operationsRoutes);
  app.use('/api/v1/monetization', monetizationRoutes);
  app.use('/api/v1/events', eventsRoutes);
  app.use('/api/v1/admin', adminRoutes);

  // Centralized API error handler
  app.use('/api', (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[API Error]', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
