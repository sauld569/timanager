import request from 'supertest';
import express, { Express } from 'express';

jest.mock('../../src/controllers/guiaController', () => ({
  getGuias: (_req: any, res: any) => res.status(200).json({ handler: 'getGuias' }),
  createGuia: (_req: any, res: any) => res.status(201).json({ handler: 'createGuia' }),
  updateGuia: (_req: any, res: any) => res.status(200).json({ handler: 'updateGuia' }),
  deleteGuia: (_req: any, res: any) => res.status(200).json({ handler: 'deleteGuia' }),
}));

import guiasRoutes from '../../src/routes/guias';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/guias', guiasRoutes);
});

describe('Route wiring - guias', () => {
  it('GET /', async () => {
    const res = await request(app).get('/api/guias').expect(200);
    expect(res.body.handler).toBe('getGuias');
  });

  it('POST /', async () => {
    const res = await request(app).post('/api/guias').send({}).expect(201);
    expect(res.body.handler).toBe('createGuia');
  });

  it('PUT /:id', async () => {
    const res = await request(app).put('/api/guias/1').send({}).expect(200);
    expect(res.body.handler).toBe('updateGuia');
  });

  it('DELETE /:id', async () => {
    const res = await request(app).delete('/api/guias/1').expect(200);
    expect(res.body.handler).toBe('deleteGuia');
  });
});
