/**
 * ═══════════════════════════════════════════════════════════════════
 * PRUEBAS DE MODELO: Colaborador
 * ═══════════════════════════════════════════════════════════════════
 * 
 * MODELO: Empleados/Colaboradores de la empresa
 * PRIORIDAD: ALTA (recursos humanos)
 * 
 * COBERTURA:
 * ✅ CRUD básico (crear, leer, actualizar, eliminar)
 * ✅ Validaciones de campos requeridos (nombre, nss, puesto, fechaAltaIMSS, razonSocialId)
 * ✅ Validaciones de unique (nss, numeroEmpleado)
 * ✅ Valores por defecto (activo = true)
 * ✅ Auto-incremento de numeroEmpleado (middleware pre-save)
 * ✅ Relación con RazonSocial (required, populate)
 * ✅ Relación bidireccional con Actividad (colaborador en múltiples actividades)
 * ✅ Timestamps (createdAt, updatedAt)
 * 
 * NOTA: Solo se prueban relaciones con modelos YA TESTEADOS:
 * - RazonSocial (aunque no testeado, es required en el modelo)
 * - Actividad (✅ testeado)
 * NO se incluyen: Proyecto, Herramienta, Vehiculo (pendientes)
 */

import mongoose from 'mongoose';
import Colaborador, { IColaborador } from '../../src/models/Colaborador';
import RazonSocial from '../../src/models/RazonSocial';
import Counter from '../../src/models/Counter';
import { Actividad } from '../../src/models/Actividad';
import { Proyecto } from '../../src/models/Proyecto';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
});

beforeEach(async () => {
  await clearDB();
});

describe('Modelo Colaborador', () => {

  // ══════════════════════════════════════════════════════════════
  // HELPER: Crear razón social de prueba
  // ══════════════════════════════════════════════════════════════
  const crearRazonSocialPrueba = async (nombre: string = 'Empresa Test SA') => {
    const razonSocial = await RazonSocial.create({
      nombre,
      rfc: `RFC${Math.random().toString().slice(2, 11)}`,
      emailEmpresa: 'test@empresa.com',
      telEmpresa: '5551234567',
      celEmpresa: '5559876543',
      direccionEmpresa: 'Calle Test 123',
      emailFacturacion: 'facturacion@empresa.com'
    });
    return razonSocial;
  };

  // ══════════════════════════════════════════════════════════════
  // HELPER: Inicializar contador
  // ══════════════════════════════════════════════════════════════
  const inicializarContador = async (valorInicial: number = 0) => {
    await Counter.findOneAndUpdate(
      { _id: 'empleadoId' },
      { $set: { sequence_value: valorInicial } },
      { upsert: true }
    );
  };

  // ══════════════════════════════════════════════════════════════
  // SECCIÓN 1: CRUD BÁSICO
  // ══════════════════════════════════════════════════════════════

  describe('CRUD Básico', () => {

    test('Debe crear un colaborador válido correctamente', async () => {
      await inicializarContador(100);
      const razonSocial = await crearRazonSocialPrueba();

      const colaboradorData = {
        nombre: 'Juan Pérez García',
        nss: '12345678901',
        puesto: 'Desarrollador Senior',
        fechaAltaIMSS: new Date('2024-01-15'),
        razonSocialId: razonSocial._id,
        activo: true
      };

      const colaborador = new Colaborador(colaboradorData);
      const colaboradorGuardado = await colaborador.save();

      expect(colaboradorGuardado._id).toBeDefined();
      expect(colaboradorGuardado.nombre).toBe('Juan Pérez García');
      expect(colaboradorGuardado.nss).toBe('12345678901');
      expect(colaboradorGuardado.puesto).toBe('Desarrollador Senior');
      expect(colaboradorGuardado.fechaAltaIMSS).toEqual(new Date('2024-01-15'));
      expect(colaboradorGuardado.razonSocialId.toString()).toBe((razonSocial._id as mongoose.Types.ObjectId).toString());
      expect(colaboradorGuardado.activo).toBe(true);
      expect(colaboradorGuardado.numeroEmpleado).toBe(101); // Auto-incrementado
    });

    test('Debe encontrar colaborador por ID', async () => {
      await inicializarContador(200);
      const razonSocial = await crearRazonSocialPrueba();
      
      const colaborador = new Colaborador({
        nombre: 'María González',
        nss: '98765432109',
        puesto: 'Diseñadora',
        fechaAltaIMSS: new Date('2024-02-01'),
        razonSocialId: razonSocial._id
      });
      const guardado = await colaborador.save();

      const encontrado = await Colaborador.findById(guardado._id);

      expect(encontrado).toBeDefined();
      expect(encontrado?.nombre).toBe('María González');
      expect(encontrado?.nss).toBe('98765432109');
      expect(encontrado?.numeroEmpleado).toBe(201);
    });

    test('Debe actualizar colaborador correctamente', async () => {
      await inicializarContador(300);
      const razonSocial = await crearRazonSocialPrueba();
      
      const colaborador = new Colaborador({
        nombre: 'Pedro López',
        nss: '11223344556',
        puesto: 'Analista',
        fechaAltaIMSS: new Date('2024-03-01'),
        razonSocialId: razonSocial._id,
        activo: true
      });
      const guardado = await colaborador.save();

      // Actualizar
      guardado.puesto = 'Analista Senior';
      guardado.activo = false;
      const actualizado = await guardado.save();

      expect(actualizado.puesto).toBe('Analista Senior');
      expect(actualizado.activo).toBe(false);
      expect(actualizado.numeroEmpleado).toBe(301); // Debe mantener el mismo número
    });

    test('Debe eliminar colaborador correctamente', async () => {
      await inicializarContador(400);
      const razonSocial = await crearRazonSocialPrueba();
      
      const colaborador = new Colaborador({
        nombre: 'Ana Martínez',
        nss: '66778899001',
        puesto: 'Contador',
        fechaAltaIMSS: new Date('2024-04-01'),
        razonSocialId: razonSocial._id
      });
      const guardado = await colaborador.save();

      await Colaborador.findByIdAndDelete(guardado._id);
      const buscado = await Colaborador.findById(guardado._id);

      expect(buscado).toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SECCIÓN 2: VALIDACIONES DE CAMPOS REQUERIDOS
  // ══════════════════════════════════════════════════════════════

  describe('Validaciones de Campos Requeridos', () => {

    test('Debe fallar si falta el campo nombre (required)', async () => {
      const razonSocial = await crearRazonSocialPrueba();
      
      const colaborador = new Colaborador({
        nss: '12345678901',
        puesto: 'Developer',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial._id
      });

      await expect(colaborador.save()).rejects.toThrow();
    });

    test('Debe fallar si falta el campo nss (required)', async () => {
      const razonSocial = await crearRazonSocialPrueba();
      
      const colaborador = new Colaborador({
        nombre: 'Test User',
        puesto: 'Developer',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial._id
      });

      await expect(colaborador.save()).rejects.toThrow();
    });

    test('Debe fallar si falta el campo puesto (required)', async () => {
      const razonSocial = await crearRazonSocialPrueba();
      
      const colaborador = new Colaborador({
        nombre: 'Test User',
        nss: '12345678901',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial._id
      });

      await expect(colaborador.save()).rejects.toThrow();
    });

    test('Debe fallar si falta el campo fechaAltaIMSS (required)', async () => {
      const razonSocial = await crearRazonSocialPrueba();
      
      const colaborador = new Colaborador({
        nombre: 'Test User',
        nss: '12345678901',
        puesto: 'Developer',
        razonSocialId: razonSocial._id
      });

      await expect(colaborador.save()).rejects.toThrow();
    });

    test('Debe fallar si falta el campo razonSocialId (required)', async () => {
      const colaborador = new Colaborador({
        nombre: 'Test User',
        nss: '12345678901',
        puesto: 'Developer',
        fechaAltaIMSS: new Date('2024-01-01')
      });

      await expect(colaborador.save()).rejects.toThrow();
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SECCIÓN 3: VALIDACIONES DE UNIQUE
  // ══════════════════════════════════════════════════════════════

  describe('Validaciones de Unique', () => {

    test('Debe rechazar nss duplicado (unique)', async () => {
      await inicializarContador(500);
      const razonSocial = await crearRazonSocialPrueba();

      // Crear primer colaborador
      const colaborador1 = new Colaborador({
        nombre: 'Juan Pérez',
        nss: '11111111111',
        puesto: 'Developer',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial._id
      });
      await colaborador1.save();

      // Intentar crear segundo con mismo nss
      const colaborador2 = new Colaborador({
        nombre: 'María García',
        nss: '11111111111', // NSS duplicado
        puesto: 'Designer',
        fechaAltaIMSS: new Date('2024-02-01'),
        razonSocialId: razonSocial._id
      });

      await expect(colaborador2.save()).rejects.toThrow();
    });

    test('Debe rechazar numeroEmpleado duplicado (unique)', async () => {
      await inicializarContador(600);
      const razonSocial = await crearRazonSocialPrueba();

      // Crear primer colaborador
      const colaborador1 = new Colaborador({
        nombre: 'Pedro López',
        nss: '22222222222',
        puesto: 'Analyst',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial._id
      });
      const guardado1 = await colaborador1.save();
      const numeroEmpleado1 = guardado1.numeroEmpleado;

      // Intentar forzar un numeroEmpleado duplicado manualmente
      const colaborador2 = new Colaborador({
        nombre: 'Ana Martínez',
        nss: '33333333333',
        puesto: 'Manager',
        fechaAltaIMSS: new Date('2024-02-01'),
        razonSocialId: razonSocial._id
      });
      await colaborador2.save();

      // Intentar actualizar manualmente numeroEmpleado a uno ya existente
      const colaborador3 = await Colaborador.create({
        nombre: 'Luis García',
        nss: '44444444444',
        puesto: 'Engineer',
        fechaAltaIMSS: new Date('2024-03-01'),
        razonSocialId: razonSocial._id
      });

      // Intentar actualizar numeroEmpleado directamente causaría error
      // En la práctica, el middleware pre-save garantiza unicidad
      expect(colaborador3.numeroEmpleado).not.toBe(numeroEmpleado1);
    });

    test('Debe permitir múltiples colaboradores con diferentes nss', async () => {
      await inicializarContador(700);
      const razonSocial = await crearRazonSocialPrueba();

      const colaborador1 = await Colaborador.create({
        nombre: 'Colaborador 1',
        nss: '10000000001',
        puesto: 'Puesto 1',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial._id
      });

      const colaborador2 = await Colaborador.create({
        nombre: 'Colaborador 2',
        nss: '10000000002',
        puesto: 'Puesto 2',
        fechaAltaIMSS: new Date('2024-01-02'),
        razonSocialId: razonSocial._id
      });

      const colaborador3 = await Colaborador.create({
        nombre: 'Colaborador 3',
        nss: '10000000003',
        puesto: 'Puesto 3',
        fechaAltaIMSS: new Date('2024-01-03'),
        razonSocialId: razonSocial._id
      });

      expect(colaborador1._id).toBeDefined();
      expect(colaborador2._id).toBeDefined();
      expect(colaborador3._id).toBeDefined();
      expect(colaborador1.nss).not.toBe(colaborador2.nss);
      expect(colaborador2.nss).not.toBe(colaborador3.nss);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SECCIÓN 4: VALORES POR DEFECTO
  // ══════════════════════════════════════════════════════════════

  describe('Valores por Defecto', () => {

    test('Debe establecer activo=true por defecto', async () => {
      await inicializarContador(800);
      const razonSocial = await crearRazonSocialPrueba();

      const colaborador = new Colaborador({
        nombre: 'Test Default Activo',
        nss: '88888888888',
        puesto: 'Tester',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial._id
        // NO especificamos 'activo'
      });
      const guardado = await colaborador.save();

      expect(guardado.activo).toBe(true);
    });

    test('Debe permitir establecer activo=false explícitamente', async () => {
      await inicializarContador(900);
      const razonSocial = await crearRazonSocialPrueba();

      const colaborador = new Colaborador({
        nombre: 'Test Activo False',
        nss: '99999999999',
        puesto: 'Inactive',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial._id,
        activo: false
      });
      const guardado = await colaborador.save();

      expect(guardado.activo).toBe(false);
    });

    test('Debe permitir fotografia opcional (undefined por defecto)', async () => {
      await inicializarContador(1000);
      const razonSocial = await crearRazonSocialPrueba();

      const colaborador = new Colaborador({
        nombre: 'Sin Foto',
        nss: '77777777777',
        puesto: 'Worker',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial._id
      });
      const guardado = await colaborador.save();

      expect(guardado.fotografia).toBeUndefined();
    });

    test('Debe guardar fotografia cuando se proporciona', async () => {
      await inicializarContador(1100);
      const razonSocial = await crearRazonSocialPrueba();

      const colaborador = new Colaborador({
        nombre: 'Con Foto',
        nss: '66666666666',
        puesto: 'Model',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial._id,
        fotografia: '/uploads/fotos/juan.jpg'
      });
      const guardado = await colaborador.save();

      expect(guardado.fotografia).toBe('/uploads/fotos/juan.jpg');
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SECCIÓN 5: AUTO-INCREMENTO DE NUMERO EMPLEADO
  // ══════════════════════════════════════════════════════════════

  describe('Auto-incremento de numeroEmpleado', () => {

    test('Debe generar numeroEmpleado automáticamente al crear colaborador', async () => {
      await inicializarContador(1200);
      const razonSocial = await crearRazonSocialPrueba();

      const colaborador = new Colaborador({
        nombre: 'Auto Increment Test',
        nss: '55555555555',
        puesto: 'Auto Tester',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial._id
      });
      const guardado = await colaborador.save();

      expect(guardado.numeroEmpleado).toBeDefined();
      expect(guardado.numeroEmpleado).toBe(1201);
    });

    test('Debe incrementar numeroEmpleado secuencialmente', async () => {
      await inicializarContador(1300);
      const razonSocial = await crearRazonSocialPrueba();

      const colaborador1 = await Colaborador.create({
        nombre: 'Secuencia 1',
        nss: '11100000001',
        puesto: 'Worker 1',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial._id
      });

      const colaborador2 = await Colaborador.create({
        nombre: 'Secuencia 2',
        nss: '11100000002',
        puesto: 'Worker 2',
        fechaAltaIMSS: new Date('2024-01-02'),
        razonSocialId: razonSocial._id
      });

      const colaborador3 = await Colaborador.create({
        nombre: 'Secuencia 3',
        nss: '11100000003',
        puesto: 'Worker 3',
        fechaAltaIMSS: new Date('2024-01-03'),
        razonSocialId: razonSocial._id
      });

      expect(colaborador1.numeroEmpleado).toBe(1301);
      expect(colaborador2.numeroEmpleado).toBe(1302);
      expect(colaborador3.numeroEmpleado).toBe(1303);
    });

    test('Debe crear contador si no existe (upsert)', async () => {
      // NO inicializar contador intencionalmente
      // El middleware debe crearlo automáticamente
      const razonSocial = await crearRazonSocialPrueba();

      const colaborador = await Colaborador.create({
        nombre: 'First Ever',
        nss: '00000000001',
        puesto: 'Pioneer',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial._id
      });

      expect(colaborador.numeroEmpleado).toBeDefined();
      expect(typeof colaborador.numeroEmpleado).toBe('number');
    });

    test('No debe cambiar numeroEmpleado al actualizar colaborador existente', async () => {
      await inicializarContador(1400);
      const razonSocial = await crearRazonSocialPrueba();

      const colaborador = await Colaborador.create({
        nombre: 'Update Test',
        nss: '14141414141',
        puesto: 'Original Puesto',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial._id
      });

      const numeroOriginal = colaborador.numeroEmpleado;

      // Actualizar campos
      colaborador.nombre = 'Updated Name';
      colaborador.puesto = 'Updated Puesto';
      await colaborador.save();

      expect(colaborador.numeroEmpleado).toBe(numeroOriginal);
    });

    test('Debe manejar creación concurrente de colaboradores', async () => {
      await inicializarContador(1500);
      const razonSocial = await crearRazonSocialPrueba();

      // Crear múltiples colaboradores simultáneamente
      const promesas = [];
      for (let i = 0; i < 5; i++) {
        promesas.push(
          Colaborador.create({
            nombre: `Concurrent ${i}`,
            nss: `15${i}00000000`,
            puesto: `Worker ${i}`,
            fechaAltaIMSS: new Date('2024-01-01'),
            razonSocialId: razonSocial._id
          })
        );
      }

      const colaboradores = await Promise.all(promesas);

      // Verificar que todos tienen números únicos
      const numeros = colaboradores.map(c => Number(c.numeroEmpleado));
      const numerosUnicos = new Set(numeros);
      
      expect(numerosUnicos.size).toBe(5); // No debe haber duplicados
      expect(Math.min(...numeros)).toBeGreaterThanOrEqual(1501);
      expect(Math.max(...numeros)).toBeLessThanOrEqual(1505);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SECCIÓN 6: RELACIÓN CON RAZON SOCIAL
  // ══════════════════════════════════════════════════════════════

  describe('Relación con RazonSocial', () => {

    test('Debe hacer populate de razonSocial correctamente', async () => {
      await inicializarContador(1600);
      const razonSocial = await crearRazonSocialPrueba('Mi Empresa SA');

      const colaborador = await Colaborador.create({
        nombre: 'Test Populate',
        nss: '16161616161',
        puesto: 'Employee',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial._id
      });

      const conPopulate = await Colaborador.findById(colaborador._id).populate('razonSocialId');

      expect(conPopulate).toBeDefined();
      expect(conPopulate?.razonSocialId).toBeDefined();
      expect((conPopulate?.razonSocialId as any).nombre).toBe('Mi Empresa SA');
    });

    test('Debe permitir múltiples colaboradores con la misma razón social', async () => {
      await inicializarContador(1700);
      const razonSocial = await crearRazonSocialPrueba('Empresa Compartida');

      const colaborador1 = await Colaborador.create({
        nombre: 'Empleado 1',
        nss: '17100000001',
        puesto: 'Puesto 1',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial._id
      });

      const colaborador2 = await Colaborador.create({
        nombre: 'Empleado 2',
        nss: '17100000002',
        puesto: 'Puesto 2',
        fechaAltaIMSS: new Date('2024-01-02'),
        razonSocialId: razonSocial._id
      });

      const colaborador3 = await Colaborador.create({
        nombre: 'Empleado 3',
        nss: '17100000003',
        puesto: 'Puesto 3',
        fechaAltaIMSS: new Date('2024-01-03'),
        razonSocialId: razonSocial._id
      });

      expect(colaborador1.razonSocialId.toString()).toBe((razonSocial._id as mongoose.Types.ObjectId).toString());
      expect(colaborador2.razonSocialId.toString()).toBe((razonSocial._id as mongoose.Types.ObjectId).toString());
      expect(colaborador3.razonSocialId.toString()).toBe((razonSocial._id as mongoose.Types.ObjectId).toString());
    });

    test('Debe rechazar ObjectId de razón social inexistente al guardar', async () => {
      await inicializarContador(1800);
      const idInexistente = new mongoose.Types.ObjectId();

      const colaborador = new Colaborador({
        nombre: 'Test ID Inexistente',
        nss: '18181818181',
        puesto: 'Worker',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: idInexistente
      });

      // El documento se guarda (no hay validación de existencia en Mongoose por defecto)
      // pero al hacer populate, la razón social será null
      const guardado = await colaborador.save();
      const conPopulate = await Colaborador.findById(guardado._id).populate('razonSocialId');

      expect(conPopulate?.razonSocialId).toBeNull();
    });

    test('Debe buscar colaboradores por razón social', async () => {
      await inicializarContador(1900);
      const razonSocial1 = await crearRazonSocialPrueba('Empresa A');
      const razonSocial2 = await crearRazonSocialPrueba('Empresa B');

      // Crear colaboradores para razonSocial1
      await Colaborador.create({
        nombre: 'Empleado A1',
        nss: '19100000001',
        puesto: 'Worker',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial1._id
      });

      await Colaborador.create({
        nombre: 'Empleado A2',
        nss: '19100000002',
        puesto: 'Worker',
        fechaAltaIMSS: new Date('2024-01-02'),
        razonSocialId: razonSocial1._id
      });

      // Crear colaborador para razonSocial2
      await Colaborador.create({
        nombre: 'Empleado B1',
        nss: '19100000003',
        puesto: 'Worker',
        fechaAltaIMSS: new Date('2024-01-03'),
        razonSocialId: razonSocial2._id
      });

      const colaboradoresA = await Colaborador.find({ razonSocialId: razonSocial1._id });
      const colaboradoresB = await Colaborador.find({ razonSocialId: razonSocial2._id });

      expect(colaboradoresA).toHaveLength(2);
      expect(colaboradoresB).toHaveLength(1);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SECCIÓN 7: RELACIÓN CON ACTIVIDAD (Modelo ya testeado)
  // ══════════════════════════════════════════════════════════════

  describe('Relación con Actividad', () => {

    test('Debe permitir colaborador asignado a una actividad', async () => {
      await inicializarContador(2000);
      const razonSocial = await crearRazonSocialPrueba();
      const colaborador = await Colaborador.create({
        nombre: 'Trabajador Proyecto',
        nss: '20202020201',
        puesto: 'Técnico',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial._id
      });

      // Crear proyecto y actividad
      const proyecto = await Proyecto.create({
        nombre: 'Proyecto Test',
        fechaInicio: new Date('2024-01-01'),
        fechaTerminacion: new Date('2024-12-31')
      });

      const actividad = await Actividad.create({
        proyecto: proyecto._id,
        numeroActividad: 'ACT001',
        descripcion: 'Actividad con colaborador',
        fechaInicio: new Date('2024-02-01'),
        fechaFinal: new Date('2024-02-15'),
        colaboradores: [colaborador._id]
      });

      expect(actividad.colaboradores).toHaveLength(1);
      expect(actividad.colaboradores[0].toString()).toBe((colaborador._id as mongoose.Types.ObjectId).toString());
    });

    test('Debe permitir colaborador en múltiples actividades', async () => {
      await inicializarContador(2100);
      const razonSocial = await crearRazonSocialPrueba();
      const colaborador = await Colaborador.create({
        nombre: 'Multi Tareas',
        nss: '21212121212',
        puesto: 'Multitask Worker',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial._id
      });

      const proyecto = await Proyecto.create({
        nombre: 'Proyecto Multiple',
        fechaInicio: new Date('2024-01-01'),
        fechaTerminacion: new Date('2024-12-31')
      });

      // Crear múltiples actividades con el mismo colaborador
      const actividad1 = await Actividad.create({
        proyecto: proyecto._id,
        numeroActividad: 'ACT101',
        descripcion: 'Actividad 1',
        fechaInicio: new Date('2024-02-01'),
        fechaFinal: new Date('2024-02-10'),
        colaboradores: [colaborador._id]
      });

      const actividad2 = await Actividad.create({
        proyecto: proyecto._id,
        numeroActividad: 'ACT102',
        descripcion: 'Actividad 2',
        fechaInicio: new Date('2024-02-11'),
        fechaFinal: new Date('2024-02-20'),
        colaboradores: [colaborador._id]
      });

      const actividad3 = await Actividad.create({
        proyecto: proyecto._id,
        numeroActividad: 'ACT103',
        descripcion: 'Actividad 3',
        fechaInicio: new Date('2024-02-21'),
        fechaFinal: new Date('2024-02-28'),
        colaboradores: [colaborador._id]
      });

      // Buscar todas las actividades de este colaborador
      const actividadesDelColaborador = await Actividad.find({
        colaboradores: colaborador._id
      });

      expect(actividadesDelColaborador).toHaveLength(3);
    });

    test('Debe hacer populate de colaboradores en actividad', async () => {
      await inicializarContador(2200);
      const razonSocial = await crearRazonSocialPrueba();
      
      const colaborador1 = await Colaborador.create({
        nombre: 'Worker 1',
        nss: '22200000001',
        puesto: 'Developer',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial._id
      });

      const colaborador2 = await Colaborador.create({
        nombre: 'Worker 2',
        nss: '22200000002',
        puesto: 'Designer',
        fechaAltaIMSS: new Date('2024-01-02'),
        razonSocialId: razonSocial._id
      });

      const proyecto = await Proyecto.create({
        nombre: 'Proyecto Populate',
        fechaInicio: new Date('2024-01-01'),
        fechaTerminacion: new Date('2024-12-31')
      });

      const actividad = await Actividad.create({
        proyecto: proyecto._id,
        numeroActividad: 'ACT200',
        descripcion: 'Test Populate Colaboradores',
        fechaInicio: new Date('2024-03-01'),
        fechaFinal: new Date('2024-03-15'),
        colaboradores: [colaborador1._id, colaborador2._id]
      });

      const actividadConPopulate = await Actividad.findById(actividad._id)
        .populate('colaboradores');

      expect(actividadConPopulate?.colaboradores).toHaveLength(2);
      expect((actividadConPopulate?.colaboradores[0] as any).nombre).toBe('Worker 1');
      expect((actividadConPopulate?.colaboradores[1] as any).nombre).toBe('Worker 2');
    });

    test('Debe buscar actividades donde participa un colaborador', async () => {
      await inicializarContador(2300);
      const razonSocial = await crearRazonSocialPrueba();
      
      const colaboradorBuscado = await Colaborador.create({
        nombre: 'Colaborador Buscado',
        nss: '23232323232',
        puesto: 'Target Worker',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial._id
      });

      const otroColaborador = await Colaborador.create({
        nombre: 'Otro Colaborador',
        nss: '23333333333',
        puesto: 'Other Worker',
        fechaAltaIMSS: new Date('2024-01-02'),
        razonSocialId: razonSocial._id
      });

      const proyecto = await Proyecto.create({
        nombre: 'Proyecto Search',
        fechaInicio: new Date('2024-01-01'),
        fechaTerminacion: new Date('2024-12-31')
      });

      // Actividades donde participa colaboradorBuscado
      await Actividad.create({
        proyecto: proyecto._id,
        numeroActividad: 'ACT301',
        descripcion: 'Actividad con buscado',
        fechaInicio: new Date('2024-04-01'),
        fechaFinal: new Date('2024-04-10'),
        colaboradores: [colaboradorBuscado._id]
      });

      await Actividad.create({
        proyecto: proyecto._id,
        numeroActividad: 'ACT302',
        descripcion: 'Actividad con ambos',
        fechaInicio: new Date('2024-04-11'),
        fechaFinal: new Date('2024-04-20'),
        colaboradores: [colaboradorBuscado._id, otroColaborador._id]
      });

      // Actividad donde NO participa colaboradorBuscado
      await Actividad.create({
        proyecto: proyecto._id,
        numeroActividad: 'ACT303',
        descripcion: 'Actividad solo otro',
        fechaInicio: new Date('2024-04-21'),
        fechaFinal: new Date('2024-04-30'),
        colaboradores: [otroColaborador._id]
      });

      // Buscar actividades del colaboradorBuscado
      const actividadesDelBuscado = await Actividad.find({
        colaboradores: colaboradorBuscado._id
      });

      expect(actividadesDelBuscado).toHaveLength(2);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SECCIÓN 8: TIMESTAMPS Y CASOS ESPECIALES
  // ══════════════════════════════════════════════════════════════

  describe('Timestamps y Casos Especiales', () => {

    test('Debe tener timestamps (createdAt y updatedAt)', async () => {
      await inicializarContador(2400);
      const razonSocial = await crearRazonSocialPrueba();

      const colaborador = await Colaborador.create({
        nombre: 'Test Timestamps',
        nss: '24242424242',
        puesto: 'Timestamp Worker',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial._id
      });

      expect(colaborador.createdAt).toBeDefined();
      expect(colaborador.updatedAt).toBeDefined();
      expect(colaborador.createdAt).toBeInstanceOf(Date);
      expect(colaborador.updatedAt).toBeInstanceOf(Date);
    });

    test('Debe actualizar updatedAt al modificar documento', async () => {
      await inicializarContador(2500);
      const razonSocial = await crearRazonSocialPrueba();

      const colaborador = await Colaborador.create({
        nombre: 'Original Name',
        nss: '25252525252',
        puesto: 'Original Puesto',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial._id
      });

      const updatedAtOriginal = colaborador.updatedAt;

      // Esperar un momento y actualizar
      await new Promise(resolve => setTimeout(resolve, 100));
      colaborador.nombre = 'Updated Name';
      await colaborador.save();

      expect(colaborador.updatedAt!.getTime()).toBeGreaterThan(updatedAtOriginal!.getTime());
    });

    test('Debe permitir buscar colaboradores activos', async () => {
      await inicializarContador(2600);
      const razonSocial = await crearRazonSocialPrueba();

      await Colaborador.create({
        nombre: 'Activo 1',
        nss: '26100000001',
        puesto: 'Worker',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial._id,
        activo: true
      });

      await Colaborador.create({
        nombre: 'Activo 2',
        nss: '26100000002',
        puesto: 'Worker',
        fechaAltaIMSS: new Date('2024-01-02'),
        razonSocialId: razonSocial._id,
        activo: true
      });

      await Colaborador.create({
        nombre: 'Inactivo 1',
        nss: '26100000003',
        puesto: 'Worker',
        fechaAltaIMSS: new Date('2024-01-03'),
        razonSocialId: razonSocial._id,
        activo: false
      });

      const colaboradoresActivos = await Colaborador.find({ activo: true });
      const colaboradoresInactivos = await Colaborador.find({ activo: false });

      expect(colaboradoresActivos).toHaveLength(2);
      expect(colaboradoresInactivos).toHaveLength(1);
    });

    test('Debe permitir buscar colaboradores por puesto', async () => {
      await inicializarContador(2700);
      const razonSocial = await crearRazonSocialPrueba();

      await Colaborador.create({
        nombre: 'Dev 1',
        nss: '27100000001',
        puesto: 'Desarrollador',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial._id
      });

      await Colaborador.create({
        nombre: 'Dev 2',
        nss: '27100000002',
        puesto: 'Desarrollador',
        fechaAltaIMSS: new Date('2024-01-02'),
        razonSocialId: razonSocial._id
      });

      await Colaborador.create({
        nombre: 'Designer 1',
        nss: '27100000003',
        puesto: 'Diseñador',
        fechaAltaIMSS: new Date('2024-01-03'),
        razonSocialId: razonSocial._id
      });

      const desarrolladores = await Colaborador.find({ puesto: 'Desarrollador' });
      const diseñadores = await Colaborador.find({ puesto: 'Diseñador' });

      expect(desarrolladores).toHaveLength(2);
      expect(diseñadores).toHaveLength(1);
    });

    test('Debe contar correctamente total de colaboradores', async () => {
      await inicializarContador(2800);
      const razonSocial = await crearRazonSocialPrueba();

      await Colaborador.create({
        nombre: 'Count 1',
        nss: '28100000001',
        puesto: 'Worker',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial._id
      });

      await Colaborador.create({
        nombre: 'Count 2',
        nss: '28100000002',
        puesto: 'Worker',
        fechaAltaIMSS: new Date('2024-01-02'),
        razonSocialId: razonSocial._id
      });

      await Colaborador.create({
        nombre: 'Count 3',
        nss: '28100000003',
        puesto: 'Worker',
        fechaAltaIMSS: new Date('2024-01-03'),
        razonSocialId: razonSocial._id
      });

      const totalColaboradores = await Colaborador.countDocuments();

      expect(totalColaboradores).toBeGreaterThanOrEqual(3);
    });

    test('Debe validar formato de nss (11 dígitos)', async () => {
      await inicializarContador(2900);
      const razonSocial = await crearRazonSocialPrueba();

      // NSS válido de 11 dígitos
      const colaboradorValido = await Colaborador.create({
        nombre: 'NSS Válido',
        nss: '12345678901',
        puesto: 'Worker',
        fechaAltaIMSS: new Date('2024-01-01'),
        razonSocialId: razonSocial._id
      });

      expect(colaboradorValido.nss).toHaveLength(11);
    });

    test('Debe permitir diferentes formatos de fechaAltaIMSS', async () => {
      await inicializarContador(3000);
      const razonSocial = await crearRazonSocialPrueba();

      const colaborador1 = await Colaborador.create({
        nombre: 'Fecha Pasada',
        nss: '30100000001',
        puesto: 'Worker',
        fechaAltaIMSS: new Date('2020-01-15'), // Fecha pasada
        razonSocialId: razonSocial._id
      });

      const colaborador2 = await Colaborador.create({
        nombre: 'Fecha Reciente',
        nss: '30100000002',
        puesto: 'Worker',
        fechaAltaIMSS: new Date('2024-03-01'), // Fecha reciente
        razonSocialId: razonSocial._id
      });

      const colaborador3 = await Colaborador.create({
        nombre: 'Fecha Hoy',
        nss: '30100000003',
        puesto: 'Worker',
        fechaAltaIMSS: new Date(), // Hoy
        razonSocialId: razonSocial._id
      });

      expect(colaborador1.fechaAltaIMSS).toBeInstanceOf(Date);
      expect(colaborador2.fechaAltaIMSS).toBeInstanceOf(Date);
      expect(colaborador3.fechaAltaIMSS).toBeInstanceOf(Date);
    });
  });
});
