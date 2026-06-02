import request from 'supertest';
import express, { Express } from 'express';

jest.mock('../../src/controllers/documentoController', () => ({
  getAllDocumentos: (_req: any, res: any) => res.status(200).json({ handler: 'getAllDocumentos' }),
  getDocumentosByColaborador: (_req: any, res: any) => res.status(200).json({ handler: 'getDocumentosByColaborador' }),
  createDocumento: (_req: any, res: any) => res.status(201).json({ handler: 'createDocumento' }),
  updateDocumento: (_req: any, res: any) => res.status(200).json({ handler: 'updateDocumento' }),
  deleteDocumento: (_req: any, res: any) => res.status(200).json({ handler: 'deleteDocumento' }),
  verDocumento: (_req: any, res: any) => res.status(200).json({ handler: 'verDocumento' }),
}));

import documentosRoutes from '../../src/routes/documentos';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/documentos', documentosRoutes);
});

describe('Route wiring - documentos', () => {
  it('GET /', async () => {
    const res = await request(app).get('/api/documentos').expect(200);
    expect(res.body.handler).toBe('getAllDocumentos');
  });

  it('GET /colaborador/:id', async () => {
    const res = await request(app).get('/api/documentos/colaborador/1').expect(200);
    expect(res.body.handler).toBe('getDocumentosByColaborador');
  });

  it('POST /', async () => {
    const res = await request(app).post('/api/documentos').send({}).expect(201);
    expect(res.body.handler).toBe('createDocumento');
  });

  it('POST / acepta PDF', async () => {
    const res = await request(app)
      .post('/api/documentos')
      .attach('documento', Buffer.from('%PDF-1.4'), { filename: 'doc.pdf', contentType: 'application/pdf' })
      .expect(201);

    expect(res.body.handler).toBe('createDocumento');
  });

  it('POST / rechaza tipo invalido', async () => {
    const res = await request(app)
      .post('/api/documentos')
      .attach('documento', Buffer.from('texto'), { filename: 'doc.txt', contentType: 'text/plain' })
      .expect(500);

    expect(res.status).toBe(500);
  });

  it('GET /ver/:nombre', async () => {
    const res = await request(app).get('/api/documentos/ver/file.pdf').expect(200);
    expect(res.body.handler).toBe('verDocumento');
  });
});
