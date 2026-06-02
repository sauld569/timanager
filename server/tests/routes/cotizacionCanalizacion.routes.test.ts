import request from 'supertest';
import express, { Express } from 'express';

jest.mock('../../src/controllers/cotizacionCanalizacionController', () => ({
  getCotizacionesCanalizacion: (_req: any, res: any) => res.status(200).json({ handler: 'getCotizacionesCanalizacion' }),
  searchCotizacionesCanalizacion: (_req: any, res: any) => res.status(200).json({ handler: 'searchCotizacionesCanalizacion' }),
  getCotizacionCanalizacionById: (_req: any, res: any) => res.status(200).json({ handler: 'getCotizacionCanalizacionById' }),
  createCotizacionCanalizacion: (_req: any, res: any) => res.status(201).json({ handler: 'createCotizacionCanalizacion' }),
  updateCotizacionCanalizacion: (_req: any, res: any) => res.status(200).json({ handler: 'updateCotizacionCanalizacion' }),
  deleteCotizacionCanalizacion: (_req: any, res: any) => res.status(200).json({ handler: 'deleteCotizacionCanalizacion' }),
  cambiarEstadoCotizacion: (_req: any, res: any) => res.status(200).json({ handler: 'cambiarEstadoCotizacion' }),
  getPdfCotizacionCanalizacion: (_req: any, res: any) => res.status(200).json({ handler: 'getPdfCotizacionCanalizacion' }),
  descargarPdfCotizacionCanalizacion: (_req: any, res: any) => res.status(200).json({ handler: 'descargarPdfCotizacionCanalizacion' }),
}));

import cotizacionCanalizacionRoutes from '../../src/routes/cotizacionCanalizacion';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/cotizaciones-canalizacion', cotizacionCanalizacionRoutes);
});

describe('Route wiring - cotizacion canalizacion', () => {
  it('GET /', async () => {
    const res = await request(app).get('/api/cotizaciones-canalizacion').expect(200);
    expect(res.body.handler).toBe('getCotizacionesCanalizacion');
  });

  it('GET /search', async () => {
    const res = await request(app).get('/api/cotizaciones-canalizacion/search').expect(200);
    expect(res.body.handler).toBe('searchCotizacionesCanalizacion');
  });

  it('POST /', async () => {
    const res = await request(app).post('/api/cotizaciones-canalizacion').send({}).expect(201);
    expect(res.body.handler).toBe('createCotizacionCanalizacion');
  });

  it('GET /:id/pdf', async () => {
    const res = await request(app).get('/api/cotizaciones-canalizacion/1/pdf').expect(200);
    expect(res.body.handler).toBe('getPdfCotizacionCanalizacion');
  });
});
