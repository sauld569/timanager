import request from 'supertest';
import express, { Express } from 'express';
import multer from 'multer';

const uploadSingleMock = jest.fn((_field?: string) => (req: any, res: any, cb: any) => cb());

jest.mock('../../src/utils/uploadConfig', () => ({
  __esModule: true,
  default: { single: (field: string) => uploadSingleMock(field) },
  uploadSingleMock,
}));

jest.mock('../../src/controllers/colaboradorController', () => ({
  getColaboradores: (_req: any, res: any) => res.status(200).json({ handler: 'getColaboradores' }),
  getColaboradorById: (_req: any, res: any) => res.status(200).json({ handler: 'getColaboradorById' }),
  createColaborador: (_req: any, res: any) => res.status(201).json({ handler: 'createColaborador' }),
  updateColaborador: (_req: any, res: any) => res.status(200).json({ handler: 'updateColaborador' }),
  deleteColaborador: (_req: any, res: any) => res.status(200).json({ handler: 'deleteColaborador' }),
  getFotografia: (_req: any, res: any) => res.status(200).json({ handler: 'getFotografia' }),
}));

import colaboradoresRoutes from '../../src/routes/colaboradores';

let app: Express;

beforeEach(() => {
  uploadSingleMock.mockImplementation(() => (req: any, res: any, cb: any) => cb());
});

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/colaboradores', colaboradoresRoutes);
});

describe('Route wiring - colaboradores', () => {
  it('GET /', async () => {
    const res = await request(app).get('/api/colaboradores').expect(200);
    expect(res.body.handler).toBe('getColaboradores');
  });

  it('GET /:id', async () => {
    const res = await request(app).get('/api/colaboradores/1').expect(200);
    expect(res.body.handler).toBe('getColaboradorById');
  });

  it('POST /', async () => {
    const res = await request(app).post('/api/colaboradores').send({}).expect(201);
    expect(res.body.handler).toBe('createColaborador');
  });

  it('POST / maneja MulterError', async () => {
    uploadSingleMock.mockImplementation(() => (req: any, res: any, cb: any) => cb(new multer.MulterError('LIMIT_FILE_SIZE')));

    const res = await request(app)
      .post('/api/colaboradores')
      .attach('fotografia', Buffer.from('data'), { filename: 'foto.jpg', contentType: 'image/jpeg' })
      .expect(400);

    expect(res.body.error).toMatch(/demasiado grande/i);
  });

  it('POST / maneja error generico de carga', async () => {
    uploadSingleMock.mockImplementation(() => (req: any, res: any, cb: any) => cb(new Error('fallo')));

    const res = await request(app)
      .post('/api/colaboradores')
      .attach('fotografia', Buffer.from('data'), { filename: 'foto.jpg', contentType: 'image/jpeg' })
      .expect(400);

    expect(res.body.error).toBe('fallo');
  });

  it('GET /foto/:nombre', async () => {
    const res = await request(app).get('/api/colaboradores/foto/a.jpg').expect(200);
    expect(res.body.handler).toBe('getFotografia');
  });
});
