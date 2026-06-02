import request from 'supertest';
import express, { Express } from 'express';

jest.mock('../../src/controllers/actividadController', () => ({
  obtenerActividadPorId: (_req: any, res: any) => res.status(200).json({ handler: 'obtenerActividadPorId' }),
  actualizarActividad: (_req: any, res: any) => res.status(200).json({ handler: 'actualizarActividad' }),
  eliminarActividad: (_req: any, res: any) => res.status(200).json({ handler: 'eliminarActividad' }),
  subirEvidencia: (_req: any, res: any) => res.status(200).json({ handler: 'subirEvidencia' }),
  eliminarEvidencia: (_req: any, res: any) => res.status(200).json({ handler: 'eliminarEvidencia' }),
  agregarNota: (_req: any, res: any) => res.status(200).json({ handler: 'agregarNota' }),
  actualizarNota: (_req: any, res: any) => res.status(200).json({ handler: 'actualizarNota' }),
  eliminarNota: (_req: any, res: any) => res.status(200).json({ handler: 'eliminarNota' }),
}));

import actividadesRoutes from '../../src/routes/actividades';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/actividades', actividadesRoutes);
});

describe('Route wiring - actividades', () => {
  it('GET /:id', async () => {
    const res = await request(app).get('/api/actividades/1').expect(200);
    expect(res.body.handler).toBe('obtenerActividadPorId');
  });

  it('PUT /:id', async () => {
    const res = await request(app).put('/api/actividades/1').send({}).expect(200);
    expect(res.body.handler).toBe('actualizarActividad');
  });

  it('DELETE /:id', async () => {
    const res = await request(app).delete('/api/actividades/1').expect(200);
    expect(res.body.handler).toBe('eliminarActividad');
  });

  it('POST /:id/evidencias', async () => {
    const res = await request(app).post('/api/actividades/1/evidencias').send({}).expect(200);
    expect(res.body.handler).toBe('subirEvidencia');
  });

  it('POST /:id/evidencias acepta imagen', async () => {
    const res = await request(app)
      .post('/api/actividades/1/evidencias')
      .attach('evidencia', Buffer.from('imagen'), { filename: 'foto.png', contentType: 'image/png' })
      .expect(200);

    expect(res.body.handler).toBe('subirEvidencia');
  });

  it('POST /:id/evidencias rechaza tipo invalido', async () => {
    const res = await request(app)
      .post('/api/actividades/1/evidencias')
      .attach('evidencia', Buffer.from('texto'), { filename: 'nota.txt', contentType: 'text/plain' })
      .expect(500);

    expect(res.status).toBe(500);
  });

  it('DELETE /:id/evidencias/:evidenciaId', async () => {
    const res = await request(app).delete('/api/actividades/1/evidencias/e1').expect(200);
    expect(res.body.handler).toBe('eliminarEvidencia');
  });

  it('POST /:id/notas', async () => {
    const res = await request(app).post('/api/actividades/1/notas').send({ texto: 'nota' }).expect(200);
    expect(res.body.handler).toBe('agregarNota');
  });

  it('PUT /:id/notas/:notaId', async () => {
    const res = await request(app).put('/api/actividades/1/notas/n1').send({ texto: 'editada' }).expect(200);
    expect(res.body.handler).toBe('actualizarNota');
  });

  it('DELETE /:id/notas/:notaId', async () => {
    const res = await request(app).delete('/api/actividades/1/notas/n1').expect(200);
    expect(res.body.handler).toBe('eliminarNota');
  });
});
