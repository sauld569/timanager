import request from 'supertest';
import express, { Express } from 'express';

jest.mock('../../src/controllers/materialCanalizacionController', () => ({
  getMaterialesCanalizacion: (_req: any, res: any) => res.status(200).json({ handler: 'getMaterialesCanalizacion' }),
  searchMaterialesCanalizacion: (_req: any, res: any) => res.status(200).json({ handler: 'searchMaterialesCanalizacion' }),
  getMaterialCanalizacionById: (_req: any, res: any) => res.status(200).json({ handler: 'getMaterialCanalizacionById' }),
  createMaterialCanalizacion: (_req: any, res: any) => res.status(201).json({ handler: 'createMaterialCanalizacion' }),
  updateMaterialCanalizacion: (_req: any, res: any) => res.status(200).json({ handler: 'updateMaterialCanalizacion' }),
  deleteMaterialCanalizacion: (_req: any, res: any) => res.status(200).json({ handler: 'deleteMaterialCanalizacion' }),
}));

import materialCanalizacionRoutes from '../../src/routes/materialCanalizacion';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/materiales-canalizacion', materialCanalizacionRoutes);
});

describe('Route wiring - materialCanalizacion', () => {
  it('GET /', async () => {
    const res = await request(app).get('/api/materiales-canalizacion').expect(200);
    expect(res.body.handler).toBe('getMaterialesCanalizacion');
  });

  it('GET /search', async () => {
    const res = await request(app).get('/api/materiales-canalizacion/search').expect(200);
    expect(res.body.handler).toBe('searchMaterialesCanalizacion');
  });

  it('POST /', async () => {
    const res = await request(app).post('/api/materiales-canalizacion').send({}).expect(201);
    expect(res.body.handler).toBe('createMaterialCanalizacion');
  });

  it('DELETE /:id', async () => {
    const res = await request(app).delete('/api/materiales-canalizacion/1').expect(200);
    expect(res.body.handler).toBe('deleteMaterialCanalizacion');
  });
});
