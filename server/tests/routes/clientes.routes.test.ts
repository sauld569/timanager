import request from 'supertest';
import express, { Express } from 'express';
import clientesRoutes from '../../src/routes/clientes';
import Cliente from '../../src/models/Cliente';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';

let app: Express;

beforeAll(async () => {
  await connectDB();
  app = express();
  app.use(express.json());
  app.use('/api/clientes', clientesRoutes);
});

afterAll(async () => {
  await disconnectDB();
});

beforeEach(async () => {
  await clearDB();
});

describe('Rutas simples - clientes', () => {
  it('GET /api/clientes responde 200 con arreglo vacío', async () => {
    const res = await request(app).get('/api/clientes').expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });

  it('POST /api/clientes crea cliente y responde 201', async () => {
    const payload = {
      nombreEmpresa: 'Cliente Ruta SA',
      direccion: 'Calle 1',
      telefono: '5551234',
    };

    const res = await request(app)
      .post('/api/clientes')
      .send(payload)
      .expect(201);

    expect(res.body._id).toBeDefined();
    expect(res.body.nombreEmpresa).toBe('Cliente Ruta SA');

    const inDb = await Cliente.findById(res.body._id);
    expect(inDb).not.toBeNull();
  });

  it('PUT /api/clientes/:id actualiza y responde 200', async () => {
    const created = await Cliente.create({
      nombreEmpresa: 'Empresa Original',
      direccion: 'Dir A',
      telefono: '1111',
    });

    const res = await request(app)
      .put(`/api/clientes/${created._id}`)
      .send({ nombreEmpresa: 'Empresa Actualizada' })
      .expect(200);

    expect(res.body.nombreEmpresa).toBe('Empresa Actualizada');
  });

  it('DELETE /api/clientes/:id elimina y responde 200', async () => {
    const created = await Cliente.create({
      nombreEmpresa: 'Empresa Eliminar',
      direccion: 'Dir B',
      telefono: '2222',
    });

    const res = await request(app)
      .delete(`/api/clientes/${created._id}`)
      .expect(200);

    expect(res.body).toEqual({ message: 'Cliente eliminado' });
  });

  it('PUT /api/clientes/:id responde 404 si no existe', async () => {
    const fakeId = '507f1f77bcf86cd799439011';

    const res = await request(app)
      .put(`/api/clientes/${fakeId}`)
      .send({ nombreEmpresa: 'No existe' })
      .expect(404);

    expect(res.body.error).toBe('Cliente no encontrado');
  });
});
