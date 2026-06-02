import request from 'supertest';
import express, { Express } from 'express';

jest.mock('../../src/controllers/vehiculosController', () => ({
  getVehiculos: (_req: any, res: any) => res.status(200).json({ handler: 'getVehiculos' }),
  getVehiculoById: (_req: any, res: any) => res.status(200).json({ handler: 'getVehiculoById' }),
  createVehiculo: (_req: any, res: any) => res.status(201).json({ handler: 'createVehiculo' }),
  updateVehiculo: (_req: any, res: any) => res.status(200).json({ handler: 'updateVehiculo' }),
  deleteVehiculo: (_req: any, res: any) => res.status(200).json({ handler: 'deleteVehiculo' }),
  registrarServicio: (_req: any, res: any) => res.status(201).json({ handler: 'registrarServicio' }),
  getHistorialServicios: (_req: any, res: any) => res.status(200).json({ handler: 'getHistorialServicios' }),
  getVehiculosProximosAServicio: (_req: any, res: any) => res.status(200).json({ handler: 'getVehiculosProximosAServicio' }),
  getVehiculosServicioVencido: (_req: any, res: any) => res.status(200).json({ handler: 'getVehiculosServicioVencido' }),
  eliminarServicio: (_req: any, res: any) => res.status(200).json({ handler: 'eliminarServicio' }),
}));

import vehiculosRoutes from '../../src/routes/vehiculos';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/vehiculos', vehiculosRoutes);
});

describe('Route wiring - vehiculos', () => {
  it('GET /proximos-servicio', async () => {
    const res = await request(app).get('/api/vehiculos/proximos-servicio').expect(200);
    expect(res.body.handler).toBe('getVehiculosProximosAServicio');
  });

  it('GET /', async () => {
    const res = await request(app).get('/api/vehiculos').expect(200);
    expect(res.body.handler).toBe('getVehiculos');
  });

  it('POST /', async () => {
    const res = await request(app).post('/api/vehiculos').send({}).expect(201);
    expect(res.body.handler).toBe('createVehiculo');
  });

  it('POST /:id/servicios', async () => {
    const res = await request(app).post('/api/vehiculos/1/servicios').send({}).expect(201);
    expect(res.body.handler).toBe('registrarServicio');
  });
});
