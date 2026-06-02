/**
 * ═══════════════════════════════════════════════════════════════════
 * EJEMPLO 1: PRUEBAS DE MODELO (MONGOOSE SCHEMA)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * ¿QUÉ PROBAMOS?
 * - Validaciones del schema
 * - Creación y guardado de documentos
 * - Valores por defecto
 * - Relaciones entre modelos
 * 
 * ¿POR QUÉ ES IMPORTANTE?
 * - Asegura que los datos se guarden correctamente
 * - Valida que las restricciones funcionen
 * - Evita datos corruptos en producción
 */

import mongoose from 'mongoose';
import Cliente, { ICliente } from '../../src/models/Cliente';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';

// beforeAll: Se ejecuta UNA VEZ antes de TODAS las pruebas de este archivo
beforeAll(async () => {
  await connectDB();
});

// afterAll: Se ejecuta UNA VEZ después de TODAS las pruebas
afterAll(async () => {
  await disconnectDB();
});

// beforeEach: Se ejecuta ANTES de CADA prueba (aislamiento)
beforeEach(async () => {
  await clearDB();
});

/**
 * describe: Agrupa pruebas relacionadas
 * Es como un "capítulo" de tu libro de pruebas
 */
describe('Modelo Cliente', () => {
  
  /**
   * test() o it(): Define UNA prueba específica
   * Debe ser descriptiva: explica QUÉ prueba y QUÉ espera
   */
  test('Debe crear un cliente válido correctamente', async () => {
    // ARRANGE: Preparar datos de prueba
    const clienteData = {
      nombreEmpresa: 'Empresa Test S.A.',
      direccion: 'Calle Falsa 123',
      telefono: '555-1234',
      contactos: [
        {
          nombre: 'Juan Pérez',
          puesto: 'Gerente',
          contacto: {
            correo: 'juan@test.com',
            telefono: '555-5678',
            extension: '101'
          }
        }
      ]
    };

    // ACT: Ejecutar la acción a probar
    const cliente = new Cliente(clienteData);
    const clienteGuardado = await cliente.save();

    // ASSERT: Verificar que el resultado sea el esperado
    expect(clienteGuardado._id).toBeDefined(); // Debe tener un ID
    expect(clienteGuardado.nombreEmpresa).toBe('Empresa Test S.A.');
    expect(clienteGuardado.contactos).toHaveLength(1);
    expect(clienteGuardado.contactos[0].nombre).toBe('Juan Pérez');
  });

  test('Debe permitir cliente sin contactos (array vacío por defecto)', async () => {
    const clienteData = {
      nombreEmpresa: 'Empresa Sin Contactos',
      direccion: 'Av. Principal 456',
      telefono: '555-9999'
    };

    const cliente = new Cliente(clienteData);
    const clienteGuardado = await cliente.save();

    // Verificar que contactos sea un array vacío
    expect(clienteGuardado.contactos).toBeDefined();
    expect(clienteGuardado.contactos).toEqual([]);
    expect(Array.isArray(clienteGuardado.contactos)).toBe(true);
  });

  test('Debe guardar cliente con múltiples contactos', async () => {
    const clienteData = {
      nombreEmpresa: 'Empresa Grande Corp',
      direccion: 'Boulevard 789',
      telefono: '555-0000',
      contactos: [
        {
          nombre: 'María García',
          puesto: 'Directora',
          contacto: {
            correo: 'maria@test.com',
            telefono: '555-1111'
          }
        },
        {
          nombre: 'Pedro López',
          puesto: 'Supervisor',
          contacto: {
            correo: 'pedro@test.com',
            telefono: '555-2222',
            extension: '202'
          }
        }
      ]
    };

    const cliente = new Cliente(clienteData);
    const clienteGuardado = await cliente.save();

    expect(clienteGuardado.contactos).toHaveLength(2);
    expect(clienteGuardado.contactos[0].nombre).toBe('María García');
    expect(clienteGuardado.contactos[1].nombre).toBe('Pedro López');
    expect(clienteGuardado.contactos[1].contacto.extension).toBe('202');
  });

  test('Debe encontrar cliente por ID', async () => {
    // Crear cliente
    const cliente = new Cliente({
      nombreEmpresa: 'Buscar Test',
      direccion: 'Calle 1',
      telefono: '555-3333'
    });
    const guardado = await cliente.save();

    // Buscar por ID
    const encontrado = await Cliente.findById(guardado._id);

    expect(encontrado).toBeDefined();
    expect(encontrado?.nombreEmpresa).toBe('Buscar Test');
  });

  test('Debe actualizar cliente correctamente', async () => {
    // Crear cliente original
    const cliente = new Cliente({
      nombreEmpresa: 'Nombre Original',
      direccion: 'Dirección Original',
      telefono: '555-4444'
    });
    const guardado = await cliente.save();

    // Actualizar
    guardado.nombreEmpresa = 'Nombre Actualizado';
    guardado.telefono = '555-5555';
    const actualizado = await guardado.save();

    expect(actualizado.nombreEmpresa).toBe('Nombre Actualizado');
    expect(actualizado.telefono).toBe('555-5555');
    expect(actualizado.direccion).toBe('Dirección Original'); // No cambió
  });

  test('Debe eliminar cliente correctamente', async () => {
    // Crear cliente
    const cliente = new Cliente({
      nombreEmpresa: 'Cliente a Eliminar',
      direccion: 'Calle Borrar',
      telefono: '555-6666'
    });
    const guardado = await cliente.save();
    const id = guardado._id;

    // Eliminar
    await Cliente.findByIdAndDelete(id);

    // Verificar que no existe
    const buscado = await Cliente.findById(id);
    expect(buscado).toBeNull();
  });
});

/**
 * ═══════════════════════════════════════════════════════════════════
 * RESULTADO ESPERADO AL CORRER: npm test Cliente.test.ts
 * ═══════════════════════════════════════════════════════════════════
 * 
 * PASS  tests/models/Cliente.test.ts
 *   Modelo Cliente
 *     ✓ Debe crear un cliente válido correctamente (45ms)
 *     ✓ Debe permitir cliente sin contactos (12ms)
 *     ✓ Debe guardar cliente con múltiples contactos (18ms)
 *     ✓ Debe encontrar cliente por ID (15ms)
 *     ✓ Debe actualizar cliente correctamente (20ms)
 *     ✓ Debe eliminar cliente correctamente (16ms)
 * 
 * Test Suites: 1 passed, 1 total
 * Tests:       6 passed, 6 total
 * Time:        2.145s
 */
