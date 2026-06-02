import request from 'supertest';
import express, { Express } from 'express';

jest.mock('../../src/controllers/herramientaController', () => ({
  getHerramientas: (_req: any, res: any) => res.status(200).json({ handler: 'getHerramientas' }),
  getHerramientasByColaborador: (_req: any, res: any) => res.status(200).json({ handler: 'getHerramientasByColaborador' }),
  createHerramienta: (_req: any, res: any) => res.status(201).json({ handler: 'createHerramienta' }),
  updateHerramienta: (_req: any, res: any) => res.status(200).json({ handler: 'updateHerramienta' }),
  deleteHerramienta: (_req: any, res: any) => res.status(200).json({ handler: 'deleteHerramienta' }),
  generateHerramientasPDF: (_req: any, res: any) => res.status(200).json({ handler: 'generateHerramientasPDF' }),
}));

import herramientasRoutes from '../../src/routes/herramientas';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/herramientas', herramientasRoutes);
});

describe('Route wiring - herramientas', () => {
  it('GET /', async () => {
    const res = await request(app).get('/api/herramientas').expect(200);
    expect(res.body.handler).toBe('getHerramientas');
  });

  it('GET /colaborador/:id', async () => {
    const res = await request(app).get('/api/herramientas/colaborador/1').expect(200);
    expect(res.body.handler).toBe('getHerramientasByColaborador');
  });

  it('POST /', async () => {
    const res = await request(app).post('/api/herramientas').send({}).expect(201);
    expect(res.body.handler).toBe('createHerramienta');
  });

  it('GET /pdf/:colaboradorId', async () => {
    const res = await request(app).get('/api/herramientas/pdf/1').expect(200);
    expect(res.body.handler).toBe('generateHerramientasPDF');
  });
});
