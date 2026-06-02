import request from 'supertest';
import express, { Express } from 'express';

jest.mock('../../src/controllers/cotizacionController', () => ({
  getCotizaciones: (_req: any, res: any) => res.status(200).json({ handler: 'getCotizaciones' }),
  searchCotizaciones: (_req: any, res: any) => res.status(200).json({ handler: 'searchCotizaciones' }),
  getCotizacionById: (_req: any, res: any) => res.status(200).json({ handler: 'getCotizacionById' }),
  createCotizacion: (_req: any, res: any) => res.status(201).json({ handler: 'createCotizacion' }),
  updateCotizacion: (_req: any, res: any) => res.status(200).json({ handler: 'updateCotizacion' }),
  deleteCotizacion: (_req: any, res: any) => res.status(200).json({ handler: 'deleteCotizacion' }),
  cambiarEstadoCotizacion: (_req: any, res: any) => res.status(200).json({ handler: 'cambiarEstadoCotizacion' }),
  getPdfCotizacion: (_req: any, res: any) => res.status(200).json({ handler: 'getPdfCotizacion' }),
  descargarPdfCotizacion: (_req: any, res: any) => res.status(200).json({ handler: 'descargarPdfCotizacion' }),
  getPdfChecklistCotizacion: (_req: any, res: any) => res.status(200).json({ handler: 'getPdfChecklistCotizacion' }),
  descargarPdfChecklistCotizacion: (_req: any, res: any) => res.status(200).json({ handler: 'descargarPdfChecklistCotizacion' }),
  generateNumeroPresupuesto: (_req: any, res: any) => res.status(200).json({ handler: 'generateNumeroPresupuesto' }),
}));

import cotizacionRoutes from '../../src/routes/cotizacion';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/cotizaciones', cotizacionRoutes);
});

describe('Route wiring - cotizacion', () => {
  it('GET /', async () => {
    const res = await request(app).get('/api/cotizaciones').expect(200);
    expect(res.body.handler).toBe('getCotizaciones');
  });

  it('GET /search', async () => {
    const res = await request(app).get('/api/cotizaciones/search').expect(200);
    expect(res.body.handler).toBe('searchCotizaciones');
  });

  it('POST /generate-numero', async () => {
    const res = await request(app).post('/api/cotizaciones/generate-numero').send({}).expect(200);
    expect(res.body.handler).toBe('generateNumeroPresupuesto');
  });

  it('GET /:id/pdf', async () => {
    const res = await request(app).get('/api/cotizaciones/1/pdf').expect(200);
    expect(res.body.handler).toBe('getPdfCotizacion');
  });
});
