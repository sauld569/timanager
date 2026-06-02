import request from 'supertest';
import express, { Express } from 'express';

jest.mock('../../src/controllers/ordenCompraController', () => ({
  getOrdenesCompra: (_req: any, res: any) => res.status(200).json({ handler: 'getOrdenesCompra' }),
  getOrdenesByDateRange: (_req: any, res: any) => res.status(200).json({ handler: 'getOrdenesByDateRange' }),
  getOrdenesByProveedor: (_req: any, res: any) => res.status(200).json({ handler: 'getOrdenesByProveedor' }),
  getOrdenesByRazonSocial: (_req: any, res: any) => res.status(200).json({ handler: 'getOrdenesByRazonSocial' }),
  getOrdenCompraById: (_req: any, res: any) => res.status(200).json({ handler: 'getOrdenCompraById' }),
  createOrdenCompra: (_req: any, res: any) => res.status(201).json({ handler: 'createOrdenCompra' }),
  updateOrdenCompra: (_req: any, res: any) => res.status(200).json({ handler: 'updateOrdenCompra' }),
  updateOrdenCompraConPdf: (_req: any, res: any) => res.status(200).json({ handler: 'updateOrdenCompraConPdf' }),
  deleteOrdenCompra: (_req: any, res: any) => res.status(200).json({ handler: 'deleteOrdenCompra' }),
  procesarPdf: (_req: any, res: any) => res.status(200).json({ handler: 'procesarPdf' }),
  crearOrdenDesdePdf: (_req: any, res: any) => res.status(201).json({ handler: 'crearOrdenDesdePdf' }),
  generarPdfOrdenCompra: (_req: any, res: any) => res.status(200).json({ handler: 'generarPdfOrdenCompra' }),
  crearOrdenCompraConPdf: (_req: any, res: any) => res.status(201).json({ handler: 'crearOrdenCompraConPdf' }),
  getPdfOrdenCompra: (_req: any, res: any) => res.status(200).json({ handler: 'getPdfOrdenCompra' }),
  descargarPdfOrdenCompra: (_req: any, res: any) => res.status(200).json({ handler: 'descargarPdfOrdenCompra' }),
}));

import ordenesCompraRoutes from '../../src/routes/ordenesCompra';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/ordenes-compra', ordenesCompraRoutes);
});

describe('Route wiring - ordenesCompra', () => {
  it('GET /', async () => {
    const res = await request(app).get('/api/ordenes-compra').expect(200);
    expect(res.body.handler).toBe('getOrdenesCompra');
  });

  it('GET /fecha-rango', async () => {
    const res = await request(app).get('/api/ordenes-compra/fecha-rango').expect(200);
    expect(res.body.handler).toBe('getOrdenesByDateRange');
  });

  it('POST /', async () => {
    const res = await request(app).post('/api/ordenes-compra').send({}).expect(201);
    expect(res.body.handler).toBe('createOrdenCompra');
  });

  it('GET /:id/pdf', async () => {
    const res = await request(app).get('/api/ordenes-compra/1/pdf').expect(200);
    expect(res.body.handler).toBe('getPdfOrdenCompra');
  });

  it('POST /procesar-pdf acepta PDF', async () => {
    const res = await request(app)
      .post('/api/ordenes-compra/procesar-pdf')
      .attach('pdf', Buffer.from('%PDF-1.4'), { filename: 'archivo.pdf', contentType: 'application/pdf' })
      .expect(200);

    expect(res.body.handler).toBe('procesarPdf');
  });

  it('POST /procesar-pdf rechaza no-PDF', async () => {
    const res = await request(app)
      .post('/api/ordenes-compra/procesar-pdf')
      .attach('pdf', Buffer.from('texto'), { filename: 'archivo.txt', contentType: 'text/plain' })
      .expect(500);

    expect(res.status).toBe(500);
  });
});
