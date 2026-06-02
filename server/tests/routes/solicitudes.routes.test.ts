import request from 'supertest';
import express, { Express } from 'express';

jest.mock('../../src/middleware/auth', () => ({
  isAuthenticated: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../src/controllers/solicitudController', () => ({
  crearSolicitud: (_req: any, res: any) => res.status(201).json({ handler: 'crearSolicitud' }),
  obtenerSolicitudes: (_req: any, res: any) => res.status(200).json({ handler: 'obtenerSolicitudes' }),
  obtenerMisSolicitudesHerramientas: (_req: any, res: any) => res.status(200).json({ handler: 'obtenerMisSolicitudesHerramientas' }),
  actualizarSolicitud: (_req: any, res: any) => res.status(200).json({ handler: 'actualizarSolicitud' }),
  eliminarSolicitud: (_req: any, res: any) => res.status(200).json({ handler: 'eliminarSolicitud' }),
}));

import solicitudesRoutes from '../../src/routes/solicitudes';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/solicitudes', solicitudesRoutes);
});

describe('Route wiring - solicitudes', () => {
  it('POST /', async () => {
    const res = await request(app).post('/api/solicitudes').send({}).expect(201);
    expect(res.body.handler).toBe('crearSolicitud');
  });

  it('GET /', async () => {
    const res = await request(app).get('/api/solicitudes').expect(200);
    expect(res.body.handler).toBe('obtenerSolicitudes');
  });

  it('GET /herramientas/mis-solicitudes', async () => {
    const res = await request(app).get('/api/solicitudes/herramientas/mis-solicitudes').expect(200);
    expect(res.body.handler).toBe('obtenerMisSolicitudesHerramientas');
  });

  it('PUT /:id', async () => {
    const res = await request(app).put('/api/solicitudes/1').send({}).expect(200);
    expect(res.body.handler).toBe('actualizarSolicitud');
  });
});
