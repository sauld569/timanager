import request from 'supertest';
import express, { Express } from 'express';

jest.mock('../../src/controllers/proyectoController', () => ({
  obtenerProyectos: (_req: any, res: any) => res.status(200).json({ handler: 'obtenerProyectos' }),
  obtenerProyectoPorId: (_req: any, res: any) => res.status(200).json({ handler: 'obtenerProyectoPorId' }),
  crearProyecto: (_req: any, res: any) => res.status(201).json({ handler: 'crearProyecto' }),
  actualizarProyecto: (_req: any, res: any) => res.status(200).json({ handler: 'actualizarProyecto' }),
  eliminarProyecto: (_req: any, res: any) => res.status(200).json({ handler: 'eliminarProyecto' }),
  obtenerCotizacionesProyecto: (_req: any, res: any) => res.status(200).json({ handler: 'obtenerCotizacionesProyecto' }),
  obtenerOrdenesCompraProyecto: (_req: any, res: any) => res.status(200).json({ handler: 'obtenerOrdenesCompraProyecto' }),
  obtenerEntregasProyecto: (_req: any, res: any) => res.status(200).json({ handler: 'obtenerEntregasProyecto' }),
}));

jest.mock('../../src/controllers/actividadController', () => ({
  obtenerActividadesProyecto: (_req: any, res: any) => res.status(200).json({ handler: 'obtenerActividadesProyecto' }),
  obtenerActividadPorId: (_req: any, res: any) => res.status(200).json({ handler: 'obtenerActividadPorId' }),
  crearActividad: (_req: any, res: any) => res.status(201).json({ handler: 'crearActividad' }),
  actualizarActividad: (_req: any, res: any) => res.status(200).json({ handler: 'actualizarActividad' }),
  eliminarActividad: (_req: any, res: any) => res.status(200).json({ handler: 'eliminarActividad' }),
}));

jest.mock('../../src/controllers/direccionIPController', () => ({
  obtenerDireccionesProyecto: (_req: any, res: any) => res.status(200).json({ handler: 'obtenerDireccionesProyecto' }),
  crearDireccionIP: (_req: any, res: any) => res.status(201).json({ handler: 'crearDireccionIP' }),
  actualizarDireccionIP: (_req: any, res: any) => res.status(200).json({ handler: 'actualizarDireccionIP' }),
  eliminarDireccionIP: (_req: any, res: any) => res.status(200).json({ handler: 'eliminarDireccionIP' }),
  generarPDFDirecciones: (_req: any, res: any) => res.status(200).json({ handler: 'generarPDFDirecciones' }),
}));

import proyectosRoutes from '../../src/routes/proyectos';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/proyectos', proyectosRoutes);
});

describe('Route wiring - proyectos', () => {
  it('GET /', async () => {
    const res = await request(app).get('/api/proyectos').expect(200);
    expect(res.body.handler).toBe('obtenerProyectos');
  });

  it('POST /', async () => {
    const res = await request(app).post('/api/proyectos').send({}).expect(201);
    expect(res.body.handler).toBe('crearProyecto');
  });

  it('GET /:proyectoId/actividades', async () => {
    const res = await request(app).get('/api/proyectos/1/actividades').expect(200);
    expect(res.body.handler).toBe('obtenerActividadesProyecto');
  });

  it('GET /:proyectoId/direcciones/pdf', async () => {
    const res = await request(app).get('/api/proyectos/1/direcciones/pdf').expect(200);
    expect(res.body.handler).toBe('generarPDFDirecciones');
  });
});
