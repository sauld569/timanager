import request from 'supertest';
import express, { Express } from 'express';
import proveedoresRoutes from '../../src/routes/proveedores';
import Proveedor from '../../src/models/Proveedor';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';

let app: Express;

beforeAll(async () => {
  await connectDB();
  app = express();
  app.use(express.json());
  app.use('/api/proveedores', proveedoresRoutes);
});

afterAll(async () => {
  await disconnectDB();
});

beforeEach(async () => {
  await clearDB();
});

describe('Rutas simples - proveedores', () => {
  it('GET /api/proveedores responde 200 con arreglo', async () => {
    const res = await request(app).get('/api/proveedores').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/proveedores crea proveedor y responde 201', async () => {
    const payload = {
      empresa: 'Proveedor Ruta SA',
      direccion: 'Av. Principal',
      telefono: '5557777',
    };

    const res = await request(app)
      .post('/api/proveedores')
      .send(payload)
      .expect(201);

    expect(res.body._id).toBeDefined();
    expect(res.body.empresa).toBe('Proveedor Ruta SA');
  });

  it('GET /api/proveedores/:id devuelve proveedor existente', async () => {
    const created = await Proveedor.create({ empresa: 'Prov X', direccion: 'Dir X', telefono: '1' });

    const res = await request(app)
      .get(`/api/proveedores/${created._id}`)
      .expect(200);

    expect(res.body._id).toBeDefined();
    expect(res.body.empresa).toBe('Prov X');
  });

  it('PUT /api/proveedores/:id actualiza y responde 200', async () => {
    const created = await Proveedor.create({ empresa: 'Prov A', direccion: 'Dir A', telefono: '2' });

    const res = await request(app)
      .put(`/api/proveedores/${created._id}`)
      .send({ empresa: 'Prov A Updated' })
      .expect(200);

    expect(res.body.empresa).toBe('Prov A Updated');
  });

  it('DELETE /api/proveedores/:id elimina y responde 200', async () => {
    const created = await Proveedor.create({ empresa: 'Prov D', direccion: 'Dir D', telefono: '3' });

    const res = await request(app)
      .delete(`/api/proveedores/${created._id}`)
      .expect(200);

    expect(res.body.message).toBe('Proveedor eliminado exitosamente');
  });

  it('GET /api/proveedores/:id responde 404 si no existe', async () => {
    const fakeId = '507f1f77bcf86cd799439011';

    const res = await request(app)
      .get(`/api/proveedores/${fakeId}`)
      .expect(404);

    expect(res.body.error).toBe('Proveedor no encontrado');
  });
});
