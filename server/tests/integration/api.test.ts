/**
 * ═══════════════════════════════════════════════════════════════════
 * EJEMPLO 3: PRUEBAS DE API ENDPOINTS (INTEGRATION TESTS)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * ¿QUÉ PROBAMOS?
 * - Endpoints HTTP completos (GET, POST, PUT, DELETE)
 * - Códigos de estado HTTP correctos
 * - Formato de respuestas JSON
 * - Validaciones de entrada
 * - Flujos completos (login → crear → actualizar → eliminar)
 * 
 * ¿POR QUÉ USAR SUPERTEST?
 * - Simula requests HTTP sin levantar servidor real
 * - Pruebas rápidas y aisladas
 * - Valida toda la capa de routing + controllers + models
 */

import request from 'supertest';
import express, { Express } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import authRoutes from '../../src/routes/auth';
import clientesRoutes from '../../src/routes/clientes';
import User from '../../src/models/User';
import Cliente from '../../src/models/Cliente';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';

// Crear aplicación Express para testing
let app: Express;

beforeAll(async () => {
  await connectDB();
  
  // Configurar app como en tu index.ts
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/clientes', clientesRoutes);
});

afterAll(async () => {
  await disconnectDB();
});

beforeEach(async () => {
  await clearDB();
});

describe('API - Auth Endpoints', () => {
  
  test('POST /api/auth/register - Debe registrar usuario nuevo', async () => {
    // ARRANGE
    const userData = {
      username: 'nuevouser',
      password: 'password123'
    };

    // ACT
    const response = await request(app)
      .post('/api/auth/register')
      .send(userData)
      .expect(201); // Esperamos status 201 (Created)

    // ASSERT
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toBe('Usuario registrado correctamente');
    
    // Verificar que se guardó en DB
    const userEnDB = await User.findOne({ username: 'nuevouser' });
    expect(userEnDB).toBeDefined();
    expect(userEnDB?.username).toBe('nuevouser');
  });

  test('POST /api/auth/register - Debe rechazar usuario duplicado', async () => {
    // ARRANGE: Crear usuario primero
    const hashedPassword = await bcrypt.hash('password123', 10);
    await new User({
      username: 'existente',
      password: hashedPassword
    }).save();

    // ACT: Intentar registrar el mismo username
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'existente',
        password: 'otrapassword'
      })
      .expect(409); // Conflict

    // ASSERT
    expect(response.body.message).toBe('El usuario ya existe');
  });

  test('POST /api/auth/register - Debe rechazar registro sin datos', async () => {
    // ACT: Request sin username ni password
    const response = await request(app)
      .post('/api/auth/register')
      .send({})
      .expect(400); // Bad Request

    // ASSERT
    expect(response.body.message).toBe('Usuario y contraseña requeridos');
  });

  test('POST /api/auth/login - Debe logear usuario con credenciales válidas', async () => {
    // ARRANGE: Crear usuario
    const hashedPassword = await bcrypt.hash('password123', 10);
    await new User({
      username: 'testuser',
      password: hashedPassword
    }).save();

    // ACT: Login
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'password123'
      })
      .expect(200);

    // ASSERT
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('username', 'testuser');
    expect(typeof response.body.token).toBe('string');
    expect(response.body.token.length).toBeGreaterThan(20);
  });

  test('POST /api/auth/login - Debe rechazar password incorrecta', async () => {
    // ARRANGE
    const hashedPassword = await bcrypt.hash('passwordcorrecta', 10);
    await new User({
      username: 'testuser',
      password: hashedPassword
    }).save();

    // ACT
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'passwordincorrecta'
      })
      .expect(401); // Unauthorized

    // ASSERT
    expect(response.body.message).toBe('Credenciales inválidas');
  });

  test('POST /api/auth/login - Debe rechazar usuario inexistente', async () => {
    // ACT
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'usuarioinexistente',
        password: 'cualquierpassword'
      })
      .expect(401);

    // ASSERT
    expect(response.body.message).toBe('Credenciales inválidas');
  });
});

describe('API - Clientes Endpoints (con autenticación)', () => {
  let authToken: string;

  // Crear usuario y obtener token ANTES de cada test
  beforeEach(async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await new User({
      username: 'testuser',
      password: hashedPassword,
      isAdmin: true
    }).save();

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'password123'
      });

    authToken = loginResponse.body.token;
  });

  test('GET /api/clientes - Debe listar todos los clientes', async () => {
    // ARRANGE: Crear algunos clientes
    await Cliente.create({ nombreEmpresa: 'Empresa A', direccion: 'Dir A', telefono: '111' });
    await Cliente.create({ nombreEmpresa: 'Empresa B', direccion: 'Dir B', telefono: '222' });

    // ACT
    const response = await request(app)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // ASSERT
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(2);
    expect(response.body[0].nombreEmpresa).toBe('Empresa A');
    expect(response.body[1].nombreEmpresa).toBe('Empresa B');
  });

  test('POST /api/clientes - Debe crear cliente nuevo', async () => {
    // ARRANGE
    const nuevoCliente = {
      nombreEmpresa: 'Nueva Empresa',
      direccion: 'Calle Nueva 123',
      telefono: '555-1234',
      contactos: []
    };

    // ACT
    const response = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${authToken}`)
      .send(nuevoCliente)
      .expect(201);

    // ASSERT
    expect(response.body).toHaveProperty('_id');
    expect(response.body.nombreEmpresa).toBe('Nueva Empresa');
    
    // Verificar en DB
    const clienteEnDB = await Cliente.findById(response.body._id);
    expect(clienteEnDB).toBeDefined();
    expect(clienteEnDB?.telefono).toBe('555-1234');
  });

  test('PUT /api/clientes/:id - Debe actualizar cliente existente', async () => {
    // ARRANGE: Crear cliente
    const cliente = await Cliente.create({
      nombreEmpresa: 'Empresa Original',
      direccion: 'Dir Original',
      telefono: '111'
    });

    // ACT: Actualizar
    const response = await request(app)
      .put(`/api/clientes/${cliente._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        nombreEmpresa: 'Empresa Actualizada',
        telefono: '999'
      })
      .expect(200);

    // ASSERT
    expect(response.body.nombreEmpresa).toBe('Empresa Actualizada');
    expect(response.body.telefono).toBe('999');
  });

  test('DELETE /api/clientes/:id - Debe eliminar cliente', async () => {
    // ARRANGE
    const cliente = await Cliente.create({
      nombreEmpresa: 'Empresa a Eliminar',
      direccion: 'Dir',
      telefono: '123'
    });

    // ACT
    const response = await request(app)
      .delete(`/api/clientes/${cliente._id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // ASSERT
    expect(response.body.message).toBe('Cliente eliminado');
    
    // Verificar que ya no existe
    const clienteEnDB = await Cliente.findById(cliente._id);
    expect(clienteEnDB).toBeNull();
  });

  test('GET /api/clientes - Funciona sin token (sin auth implementado aún)', async () => {
    // ACT: Request SIN token
    // TODO: Cambiar a .expect(401) cuando se implemente authMiddleware en rutas de clientes
    await request(app)
      .get('/api/clientes')
      .expect(200); // Por ahora permite acceso sin token
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════
 * PATRÓN AAA (ARRANGE-ACT-ASSERT)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Todas las pruebas siguen este patrón:
 * 
 * 1. ARRANGE (Preparar)
 *    - Configurar datos de prueba
 *    - Crear registros necesarios en DB
 *    - Configurar mocks
 * 
 * 2. ACT (Actuar)
 *    - Ejecutar la acción que queremos probar
 *    - Hacer el request HTTP
 *    - Llamar la función
 * 
 * 3. ASSERT (Afirmar)
 *    - Verificar que el resultado es correcto
 *    - Comprobar efectos secundarios (DB, etc.)
 *    - Validar errores esperados
 */
