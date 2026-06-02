import request from 'supertest';
import express, { Express } from 'express';
import vendedoresRoutes from '../../src/routes/vendedores';
import Vendedor from '../../src/models/Vendedor';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';

let app: Express;

beforeAll(async () => {
  await connectDB();
  app = express();
  app.use(express.json());
  app.use('/api/vendedores', vendedoresRoutes);
});

afterAll(async () => {
  await disconnectDB();
});

beforeEach(async () => {
  await clearDB();
});

describe('Rutas simples - vendedores', () => {
  it('GET /api/vendedores responde 200 y arreglo', async () => {
    const res = await request(app).get('/api/vendedores').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/vendedores crea vendedor y responde 200', async () => {
    const payload = {
      nombre: 'Vendedor Ruta',
      correo: 'ruta@venta.com',
      telefono: '5552222',
    };

    const res = await request(app)
      .post('/api/vendedores')
      .send(payload)
      .expect(200);

    expect(res.body._id).toBeDefined();
    expect(res.body.nombre).toBe('Vendedor Ruta');
  });

  it('PUT /api/vendedores/:id actualiza y responde 200', async () => {
    const created = await Vendedor.create({
      nombre: 'Vendedor Original',
      correo: 'orig@venta.com',
      telefono: '1111',
    });

    const res = await request(app)
      .put(`/api/vendedores/${created._id}`)
      .send({ nombre: 'Vendedor Actualizado' })
      .expect(200);

    expect(res.body.nombre).toBe('Vendedor Actualizado');
  });

  it('DELETE /api/vendedores/:id elimina y responde mensaje esperado', async () => {
    const created = await Vendedor.create({
      nombre: 'Vendedor Eliminar',
      correo: 'del@venta.com',
      telefono: '3333',
    });

    const res = await request(app)
      .delete(`/api/vendedores/${created._id}`)
      .expect(200);

    expect(res.body).toEqual({ mensaje: 'Vendedor eliminado' });
  });
});
