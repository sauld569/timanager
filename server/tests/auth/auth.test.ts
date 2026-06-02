/**
 * ═══════════════════════════════════════════════════════════════════
 * EJEMPLO 2: PRUEBAS DE AUTENTICACIÓN Y MIDDLEWARE
 * ═══════════════════════════════════════════════════════════════════
 * 
 * ¿QUÉ PROBAMOS?
 * - JWT token generation
 * - Token validation
 * - Login con credenciales correctas/incorrectas
 * - Middleware de autenticación
 * - Manejo de errores de seguridad
 * 
 * ¿POR QUÉ ES CRÍTICO?
 * - La seguridad es FUNDAMENTAL
 * - Evita bugs que exponen datos sensibles
 * - Prueba edge cases (tokens expirados, malformados, etc.)
 */

import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../../src/models/User';
import { authMiddleware } from '../../src/routes/auth';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';
import { Request, Response } from 'express';

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
});

beforeEach(async () => {
  await clearDB();
});

describe('Autenticación - JWT', () => {
  
  test('Debe generar un token JWT válido', () => {
    // ARRANGE
    const payload = {
      id: '123456',
      username: 'testuser',
      isAdmin: false
    };
    const secret = 'test-secret-key';

    // ACT
    const token = jwt.sign(payload, secret, { expiresIn: '2h' });

    // ASSERT
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT tiene 3 partes
    
    // Verificar que se puede decodificar
    const decoded = jwt.verify(token, secret) as any;
    expect(decoded.username).toBe('testuser');
    expect(decoded.isAdmin).toBe(false);
  });

  test('Debe detectar token expirado', (done) => {
    // ARRANGE: Crear token que expire en 1 segundo
    const payload = { id: '123', username: 'test' };
    const secret = 'test-secret-key';
    const token = jwt.sign(payload, secret, { expiresIn: '1s' });

    // ACT & ASSERT: Esperar a que expire
    setTimeout(() => {
      expect(() => {
        jwt.verify(token, secret);
      }).toThrow(jwt.TokenExpiredError);
      done();
    }, 1500); // Esperar 1.5 segundos
  });

  test('Debe rechazar token con firma inválida', () => {
    // ARRANGE
    const token = jwt.sign({ id: '123' }, 'secret-correcto');

    // ACT & ASSERT: Intentar verificar con secreto incorrecto
    expect(() => {
      jwt.verify(token, 'secret-incorrecto');
    }).toThrow(jwt.JsonWebTokenError);
  });

  test('Debe rechazar token malformado', () => {
    // ARRANGE
    const tokenMalformado = 'esto.no.es.un.token.valido';

    // ACT & ASSERT
    expect(() => {
      jwt.verify(tokenMalformado, 'cualquier-secret');
    }).toThrow();
  });
});

describe('Autenticación - Bcrypt Password Hashing', () => {
  
  test('Debe hashear password correctamente', async () => {
    // ARRANGE
    const passwordPlain = 'miPasswordSeguro123!';

    // ACT
    const passwordHash = await bcrypt.hash(passwordPlain, 10);

    // ASSERT
    expect(passwordHash).toBeDefined();
    expect(passwordHash).not.toBe(passwordPlain); // No debe ser igual
    expect(passwordHash.length).toBeGreaterThan(50); // Hash bcrypt es largo
    expect(passwordHash.startsWith('$2')).toBe(true); // Formato bcrypt
  });

  test('Debe comparar passwords correctamente', async () => {
    // ARRANGE
    const passwordPlain = 'password123';
    const passwordHash = await bcrypt.hash(passwordPlain, 10);

    // ACT & ASSERT: Password correcta
    const esValida = await bcrypt.compare(passwordPlain, passwordHash);
    expect(esValida).toBe(true);

    // ACT & ASSERT: Password incorrecta
    const esInvalida = await bcrypt.compare('passwordIncorrecto', passwordHash);
    expect(esInvalida).toBe(false);
  });

  test('Debe generar hashes diferentes para la misma password (salt)', async () => {
    // ARRANGE
    const password = 'mismaPassword';

    // ACT: Hashear la misma password dos veces
    const hash1 = await bcrypt.hash(password, 10);
    const hash2 = await bcrypt.hash(password, 10);

    // ASSERT: Los hashes deben ser diferentes (por el salt)
    expect(hash1).not.toBe(hash2);
    
    // Pero ambos deben validar la password original
    expect(await bcrypt.compare(password, hash1)).toBe(true);
    expect(await bcrypt.compare(password, hash2)).toBe(true);
  });
});

describe('Middleware de Autenticación', () => {
  
  test('Debe permitir acceso con token válido', async () => {
    // ARRANGE: Crear usuario y token
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = new User({
      username: 'testuser',
      password: hashedPassword,
      isAdmin: false
    });
    await user.save();

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || 'test-secret-key',
      { expiresIn: '2h' }
    );

    // Mock de Request, Response, Next
    const req = {
      headers: {
        authorization: `Bearer ${token}`
      }
    } as any;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as any;

    const next = jest.fn();

    // ACT
    await authMiddleware(req, res, next);

    // ASSERT: Debe llamar next() sin errores
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled(); // No debe haber error
    expect(req.user).toBeDefined();
    expect(req.user.username).toBe('testuser');
  });

  test('Debe rechazar request sin token', async () => {
    // ARRANGE: Request sin header de autorización
    const req = {
      headers: {}
    } as any;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as any;

    const next = jest.fn();

    // ACT
    await authMiddleware(req, res, next);

    // ASSERT
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Token requerido' });
  });

  test('Debe rechazar token inválido', async () => {
    // ARRANGE: Token malformado
    const req = {
      headers: {
        authorization: 'Bearer token-invalido-123'
      }
    } as any;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as any;

    const next = jest.fn();

    // ACT
    await authMiddleware(req, res, next);

    // ASSERT
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403); // 403 Forbidden (token inválido)
  });

  test('Debe rechazar token de usuario inexistente', async () => {
    // ARRANGE: Token válido pero usuario eliminado
    const fakeUserId = new mongoose.Types.ObjectId();
    const token = jwt.sign(
      { id: fakeUserId, username: 'usuarioeliminado' },
      process.env.JWT_SECRET || 'test-secret-key',
      { expiresIn: '2h' }
    );

    const req = {
      headers: {
        authorization: `Bearer ${token}`
      }
    } as any;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    } as any;

    const next = jest.fn();

    // ACT
    await authMiddleware(req, res, next);

    // ASSERT
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Usuario no encontrado' });
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════
 * CONCEPTOS CLAVE UTILIZADOS
 * ═══════════════════════════════════════════════════════════════════
 * 
 * 1. MOCKING: jest.fn()
 *    - Crea funciones "falsas" para simular comportamiento
 *    - Ejemplo: res.status = jest.fn().mockReturnThis()
 *    - Nos permite verificar si se llamó y con qué argumentos
 * 
 * 2. ASSERTIONS COMUNES:
 *    - expect(valor).toBe(esperado)        → Igualdad estricta (===)
 *    - expect(valor).toEqual(esperado)     → Igualdad profunda (objetos)
 *    - expect(valor).toBeDefined()         → No es undefined
 *    - expect(valor).toBeNull()            → Es null
 *    - expect(fn).toHaveBeenCalled()       → Función fue llamada
 *    - expect(fn).toHaveBeenCalledWith(x)  → Llamada con parámetro x
 *    - expect(fn).toThrow()                → Lanza excepción
 * 
 * 3. DONE CALLBACK:
 *    - Para pruebas asíncronas con delays
 *    - Ejemplo: test('...', (done) => { ... done() })
 */
