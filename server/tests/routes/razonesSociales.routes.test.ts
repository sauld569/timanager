import request from 'supertest';
import express, { Express } from 'express';

jest.mock('../../src/controllers/razonSocialController', () => ({
  getRazonesSociales: (_req: any, res: any) => res.status(200).json({ handler: 'getRazonesSociales' }),
  getRazonSocialById: (_req: any, res: any) => res.status(200).json({ handler: 'getRazonSocialById' }),
  getRazonSocialByRfc: (_req: any, res: any) => res.status(200).json({ handler: 'getRazonSocialByRfc' }),
  createRazonSocial: (_req: any, res: any) => res.status(201).json({ handler: 'createRazonSocial' }),
  updateRazonSocial: (_req: any, res: any) => res.status(200).json({ handler: 'updateRazonSocial' }),
  deleteRazonSocial: (_req: any, res: any) => res.status(200).json({ handler: 'deleteRazonSocial' }),
}));

import razonesSocialesRoutes from '../../src/routes/razonesSociales';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/razones-sociales', razonesSocialesRoutes);
});

describe('Route wiring - razonesSociales', () => {
  it('GET /', async () => {
    const res = await request(app).get('/api/razones-sociales').expect(200);
    expect(res.body.handler).toBe('getRazonesSociales');
  });

  it('GET /id/:id', async () => {
    const res = await request(app).get('/api/razones-sociales/id/1').expect(200);
    expect(res.body.handler).toBe('getRazonSocialById');
  });

  it('POST /', async () => {
    const res = await request(app).post('/api/razones-sociales').send({}).expect(201);
    expect(res.body.handler).toBe('createRazonSocial');
  });

  it('DELETE /:id', async () => {
    const res = await request(app).delete('/api/razones-sociales/1').expect(200);
    expect(res.body.handler).toBe('deleteRazonSocial');
  });
});
