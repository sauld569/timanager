import request from 'supertest';
import express, { Express } from 'express';

jest.mock('../../src/controllers/entregaController', () => ({
  getEntregas: (_req: any, res: any) => res.status(200).json({ handler: 'getEntregas' }),
  searchEntregas: (_req: any, res: any) => res.status(200).json({ handler: 'searchEntregas' }),
  getEntregaById: (_req: any, res: any) => res.status(200).json({ handler: 'getEntregaById' }),
  createEntrega: (_req: any, res: any) => res.status(201).json({ handler: 'createEntrega' }),
  updateEntrega: (_req: any, res: any) => res.status(200).json({ handler: 'updateEntrega' }),
  deleteEntrega: (_req: any, res: any) => res.status(200).json({ handler: 'deleteEntrega' }),
  getPdfEntrega: (_req: any, res: any) => res.status(200).json({ handler: 'getPdfEntrega' }),
  descargarPdfEntrega: (_req: any, res: any) => res.status(200).json({ handler: 'descargarPdfEntrega' }),
}));

import entregaRoutes from '../../src/routes/entrega';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/entregas', entregaRoutes);
});

describe('Route wiring - entrega', () => {
  it('GET /', async () => {
    const res = await request(app).get('/api/entregas').expect(200);
    expect(res.body.handler).toBe('getEntregas');
  });

  it('GET /search', async () => {
    const res = await request(app).get('/api/entregas/search').expect(200);
    expect(res.body.handler).toBe('searchEntregas');
  });

  it('POST /', async () => {
    const res = await request(app).post('/api/entregas').send({}).expect(201);
    expect(res.body.handler).toBe('createEntrega');
  });

  it('GET /:id/pdf', async () => {
    const res = await request(app).get('/api/entregas/1/pdf').expect(200);
    expect(res.body.handler).toBe('getPdfEntrega');
  });
});
