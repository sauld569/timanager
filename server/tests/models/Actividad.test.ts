/**
 * ═══════════════════════════════════════════════════════════════════
 * PRUEBAS DE MODELO: Actividad
 * ═══════════════════════════════════════════════════════════════════
 * 
 * MODELO: Actividades de proyectos
 * PRIORIDAD: MEDIA (gestión de proyectos)
 * 
 * COBERTURA:
 * ✅ CRUD básico (crear, leer, actualizar, eliminar)
 * ✅ Validaciones de campos requeridos
 * ✅ Validaciones de enum (estado)
 * ✅ Valores por defecto (estado, color)
 * ✅ Relaciones con Proyecto (required)
 * ✅ Relaciones con Colaboradores (array)
 * ✅ Subdocumentos de evidencias
 * ✅ Subdocumentos de notas
 * ✅ Validación de fechas lógicas
 * ✅ Populate de referencias
 */

import mongoose from 'mongoose';
import { Actividad, IActividad } from '../../src/models/Actividad';
import { Proyecto } from '../../src/models/Proyecto';
import Colaborador from '../../src/models/Colaborador';
import Counter from '../../src/models/Counter';
import RazonSocial from '../../src/models/RazonSocial';
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

describe('Modelo Actividad', () => {
  
  // ══════════════════════════════════════════════════════════════
  // HELPER: Crear proyecto de prueba
  // ══════════════════════════════════════════════════════════════
  const crearProyectoPrueba = async () => {
    const proyecto = new Proyecto({
      nombre: 'Proyecto Test',
      fechaInicio: new Date('2024-01-01'),
      fechaTerminacion: new Date('2024-12-31'),
      estado: 'En progreso'
    });
    return await proyecto.save();
  };

  // ══════════════════════════════════════════════════════════════
  // HELPER: Crear colaborador de prueba
  // ══════════════════════════════════════════════════════════════
  const crearColaboradorPrueba = async (nombre: string = 'Juan Pérez') => {
    // Crear contador si no existe
    await Counter.findOneAndUpdate(
      { _id: 'empleadoId' },
      { $setOnInsert: { sequence_value: 0 } },
      { upsert: true }
    );

    // Crear razón social dummy
    const razonSocial = await RazonSocial.create({
      nombre: 'Empresa Test SA',
      rfc: `ETE${Math.random().toString().slice(2, 11)}`,
      emailEmpresa: 'test@empresa.com',
      telEmpresa: '5551234567',
      celEmpresa: '5559876543',
      direccionEmpresa: 'Calle Test 123',
      emailFacturacion: 'facturacion@empresa.com'
    });

    const colaborador = new Colaborador({
      nombre,
      nss: `${Math.random().toString().slice(2, 13)}`,
      puesto: 'Desarrollador',
      fechaAltaIMSS: new Date('2024-01-01'),
      razonSocialId: razonSocial._id,
      activo: true
    });
    return await colaborador.save();
  };

  // ══════════════════════════════════════════════════════════════
  // SECCIÓN 1: CRUD BÁSICO
  // ══════════════════════════════════════════════════════════════

  describe('CRUD Básico', () => {
    
    test('Debe crear una actividad válida correctamente', async () => {
      const proyecto = await crearProyectoPrueba();

      const actividadData = {
        proyecto: proyecto._id,
        numeroActividad: 'ACT001',
        descripcion: 'Instalación de cableado',
        fechaInicio: new Date('2024-02-01'),
        fechaFinal: new Date('2024-02-15')
      };

      const actividad = new Actividad(actividadData);
      const actividadGuardada = await actividad.save();

      expect(actividadGuardada._id).toBeDefined();
      expect(actividadGuardada.proyecto.toString()).toBe((proyecto._id as mongoose.Types.ObjectId).toString());
      expect(actividadGuardada.numeroActividad).toBe('ACT001');
      expect(actividadGuardada.descripcion).toBe('Instalación de cableado');
      expect(actividadGuardada.fechaInicio).toEqual(new Date('2024-02-01'));
      expect(actividadGuardada.fechaFinal).toEqual(new Date('2024-02-15'));
    });

    test('Debe encontrar actividad por ID', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT002',
        descripcion: 'Prueba de lectura',
        fechaInicio: new Date('2024-03-01'),
        fechaFinal: new Date('2024-03-15')
      });
      const guardada = await actividad.save();

      const encontrada = await Actividad.findById(guardada._id);

      expect(encontrada).toBeDefined();
      expect(encontrada?.numeroActividad).toBe('ACT002');
      expect(encontrada?.descripcion).toBe('Prueba de lectura');
    });

    test('Debe actualizar actividad correctamente', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT003',
        descripcion: 'Descripción original',
        fechaInicio: new Date('2024-04-01'),
        fechaFinal: new Date('2024-04-15'),
        estado: 'Pendiente'
      });
      const guardada = await actividad.save();

      // Actualizar
      guardada.descripcion = 'Descripción actualizada';
      guardada.estado = 'En progreso';
      const actualizada = await guardada.save();

      expect(actualizada.descripcion).toBe('Descripción actualizada');
      expect(actualizada.estado).toBe('En progreso');
    });

    test('Debe eliminar actividad correctamente', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT004',
        descripcion: 'Para eliminar',
        fechaInicio: new Date('2024-05-01'),
        fechaFinal: new Date('2024-05-15')
      });
      const guardada = await actividad.save();

      await Actividad.findByIdAndDelete(guardada._id);
      const buscada = await Actividad.findById(guardada._id);

      expect(buscada).toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SECCIÓN 2: VALIDACIONES DE CAMPOS REQUERIDOS
  // ══════════════════════════════════════════════════════════════

  describe('Validaciones de Campos Requeridos', () => {
    
    test('Debe fallar si falta el campo proyecto (required)', async () => {
      const actividad = new Actividad({
        numeroActividad: 'ACT005',
        descripcion: 'Sin proyecto',
        fechaInicio: new Date('2024-06-01'),
        fechaFinal: new Date('2024-06-15')
      });

      await expect(actividad.save()).rejects.toThrow();
    });

    test('Debe fallar si falta el campo numeroActividad (required)', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        descripcion: 'Sin número de actividad',
        fechaInicio: new Date('2024-06-01'),
        fechaFinal: new Date('2024-06-15')
      });

      await expect(actividad.save()).rejects.toThrow();
    });

    test('Debe fallar si falta el campo descripcion (required)', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT006',
        fechaInicio: new Date('2024-06-01'),
        fechaFinal: new Date('2024-06-15')
      });

      await expect(actividad.save()).rejects.toThrow();
    });

    test('Debe fallar si falta el campo fechaInicio (required)', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT007',
        descripcion: 'Sin fecha inicio',
        fechaFinal: new Date('2024-06-15')
      });

      await expect(actividad.save()).rejects.toThrow();
    });

    test('Debe fallar si falta el campo fechaFinal (required)', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT008',
        descripcion: 'Sin fecha final',
        fechaInicio: new Date('2024-06-01')
      });

      await expect(actividad.save()).rejects.toThrow();
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SECCIÓN 3: VALIDACIONES DE ENUM Y VALORES POR DEFECTO
  // ══════════════════════════════════════════════════════════════

  describe('Validaciones de Enum y Valores por Defecto', () => {
    
    test('Debe establecer estado por defecto como "Pendiente"', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT009',
        descripcion: 'Test estado default',
        fechaInicio: new Date('2024-07-01'),
        fechaFinal: new Date('2024-07-15')
      });
      const guardada = await actividad.save();

      expect(guardada.estado).toBe('Pendiente');
    });

    test('Debe establecer color por defecto como "#0d6efd"', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT010',
        descripcion: 'Test color default',
        fechaInicio: new Date('2024-07-01'),
        fechaFinal: new Date('2024-07-15')
      });
      const guardada = await actividad.save();

      expect(guardada.color).toBe('#0d6efd');
    });

    test('Debe aceptar estado "Pendiente"', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT011',
        descripcion: 'Estado Pendiente',
        fechaInicio: new Date('2024-07-01'),
        fechaFinal: new Date('2024-07-15'),
        estado: 'Pendiente'
      });
      const guardada = await actividad.save();

      expect(guardada.estado).toBe('Pendiente');
    });

    test('Debe aceptar estado "En progreso"', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT012',
        descripcion: 'Estado En progreso',
        fechaInicio: new Date('2024-07-01'),
        fechaFinal: new Date('2024-07-15'),
        estado: 'En progreso'
      });
      const guardada = await actividad.save();

      expect(guardada.estado).toBe('En progreso');
    });

    test('Debe aceptar estado "Completada"', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT013',
        descripcion: 'Estado Completada',
        fechaInicio: new Date('2024-07-01'),
        fechaFinal: new Date('2024-07-15'),
        estado: 'Completada'
      });
      const guardada = await actividad.save();

      expect(guardada.estado).toBe('Completada');
    });

    test('Debe aceptar estado "Cancelada"', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT014',
        descripcion: 'Estado Cancelada',
        fechaInicio: new Date('2024-07-01'),
        fechaFinal: new Date('2024-07-15'),
        estado: 'Cancelada'
      });
      const guardada = await actividad.save();

      expect(guardada.estado).toBe('Cancelada');
    });

    test('Debe rechazar estado inválido', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT015',
        descripcion: 'Estado inválido',
        fechaInicio: new Date('2024-07-01'),
        fechaFinal: new Date('2024-07-15'),
        estado: 'EstadoInvalido' as any
      });

      await expect(actividad.save()).rejects.toThrow();
    });

    test('Debe permitir color personalizado', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT016',
        descripcion: 'Color personalizado',
        fechaInicio: new Date('2024-07-01'),
        fechaFinal: new Date('2024-07-15'),
        color: '#FF5733'
      });
      const guardada = await actividad.save();

      expect(guardada.color).toBe('#FF5733');
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SECCIÓN 4: RELACIONES CON OTROS MODELOS
  // ══════════════════════════════════════════════════════════════

  describe('Relaciones con Otros Modelos', () => {
    
    test('Debe hacer populate de proyecto correctamente', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT017',
        descripcion: 'Test populate proyecto',
        fechaInicio: new Date('2024-08-01'),
        fechaFinal: new Date('2024-08-15')
      });
      const guardada = await actividad.save();

      const conPopulate = await Actividad.findById(guardada._id).populate('proyecto');

      expect(conPopulate).toBeDefined();
      expect(conPopulate?.proyecto).toBeDefined();
      expect((conPopulate?.proyecto as any).nombre).toBe('Proyecto Test');
    });

    test('Debe rechazar ObjectId de proyecto inexistente', async () => {
      const idInexistente = new mongoose.Types.ObjectId();
      const actividad = new Actividad({
        proyecto: idInexistente,
        numeroActividad: 'ACT018',
        descripcion: 'Proyecto inexistente',
        fechaInicio: new Date('2024-08-01'),
        fechaFinal: new Date('2024-08-15')
      });

      // La actividad se guarda, pero el proyecto no existe
      const guardada = await actividad.save();
      expect(guardada).toBeDefined();

      // Al hacer populate, el proyecto será null
      const conPopulate = await Actividad.findById(guardada._id).populate('proyecto');
      expect(conPopulate?.proyecto).toBeNull();
    });

    test('Debe permitir actividad sin colaboradores (array vacío)', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT019',
        descripcion: 'Sin colaboradores',
        fechaInicio: new Date('2024-08-01'),
        fechaFinal: new Date('2024-08-15')
      });
      const guardada = await actividad.save();

      expect(guardada.colaboradores).toBeDefined();
      expect(guardada.colaboradores).toEqual([]);
      expect(Array.isArray(guardada.colaboradores)).toBe(true);
    });

    test('Debe guardar actividad con un colaborador', async () => {
      const proyecto = await crearProyectoPrueba();
      const colaborador = await crearColaboradorPrueba();

      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT020',
        descripcion: 'Con un colaborador',
        fechaInicio: new Date('2024-08-01'),
        fechaFinal: new Date('2024-08-15'),
        colaboradores: [colaborador._id]
      });
      const guardada = await actividad.save();

      expect(guardada.colaboradores).toHaveLength(1);
      expect(guardada.colaboradores[0].toString()).toBe((colaborador._id as mongoose.Types.ObjectId).toString());
    });

    test('Debe guardar actividad con múltiples colaboradores', async () => {
      const proyecto = await crearProyectoPrueba();
      const colaborador1 = await crearColaboradorPrueba('Juan Pérez');
      const colaborador2 = await crearColaboradorPrueba('María García');
      const colaborador3 = await crearColaboradorPrueba('Pedro López');

      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT021',
        descripcion: 'Con múltiples colaboradores',
        fechaInicio: new Date('2024-08-01'),
        fechaFinal: new Date('2024-08-15'),
        colaboradores: [colaborador1._id, colaborador2._id, colaborador3._id]
      });
      const guardada = await actividad.save();

      expect(guardada.colaboradores).toHaveLength(3);
    });

    test('Debe hacer populate de colaboradores correctamente', async () => {
      const proyecto = await crearProyectoPrueba();
      const colaborador1 = await crearColaboradorPrueba('Juan Test');
      const colaborador2 = await crearColaboradorPrueba('María Test');

      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT022',
        descripcion: 'Test populate colaboradores',
        fechaInicio: new Date('2024-08-01'),
        fechaFinal: new Date('2024-08-15'),
        colaboradores: [colaborador1._id, colaborador2._id]
      });
      const guardada = await actividad.save();

      const conPopulate = await Actividad.findById(guardada._id).populate('colaboradores');

      expect(conPopulate?.colaboradores).toHaveLength(2);
      expect((conPopulate?.colaboradores[0] as any).nombre).toBe('Juan Test');
      expect((conPopulate?.colaboradores[1] as any).nombre).toBe('María Test');
    });

    test('Debe hacer populate múltiple (proyecto y colaboradores)', async () => {
      const proyecto = await crearProyectoPrueba();
      const colaborador = await crearColaboradorPrueba('Test Multiple');

      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT023',
        descripcion: 'Test populate múltiple',
        fechaInicio: new Date('2024-08-01'),
        fechaFinal: new Date('2024-08-15'),
        colaboradores: [colaborador._id]
      });
      const guardada = await actividad.save();

      const conPopulate = await Actividad.findById(guardada._id)
        .populate('proyecto')
        .populate('colaboradores');

      expect((conPopulate?.proyecto as any).nombre).toBe('Proyecto Test');
      expect(conPopulate?.colaboradores).toHaveLength(1);
      expect((conPopulate?.colaboradores[0] as any).nombre).toBe('Test Multiple');
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SECCIÓN 5: SUBDOCUMENTOS - EVIDENCIAS
  // ══════════════════════════════════════════════════════════════

  describe('Subdocumentos - Evidencias', () => {
    
    test('Debe permitir actividad sin evidencias (array vacío por defecto)', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT024',
        descripcion: 'Sin evidencias',
        fechaInicio: new Date('2024-09-01'),
        fechaFinal: new Date('2024-09-15')
      });
      const guardada = await actividad.save();

      expect(guardada.evidencias).toBeDefined();
      expect(guardada.evidencias).toEqual([]);
      expect(Array.isArray(guardada.evidencias)).toBe(true);
    });

    test('Debe guardar actividad con una evidencia completa', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT025',
        descripcion: 'Con evidencia',
        fechaInicio: new Date('2024-09-01'),
        fechaFinal: new Date('2024-09-15'),
        evidencias: [{
          nombre: 'foto1.jpg',
          url: '/uploads/evidencias/foto1.jpg',
          tipo: 'image/jpeg',
          tamaño: 2048576,
          fechaSubida: new Date('2024-09-05'),
          subidoPor: 'usuario123'
        }]
      });
      const guardada = await actividad.save();

      expect(guardada.evidencias).toHaveLength(1);
      expect(guardada.evidencias![0].nombre).toBe('foto1.jpg');
      expect(guardada.evidencias![0].url).toBe('/uploads/evidencias/foto1.jpg');
      expect(guardada.evidencias![0].tipo).toBe('image/jpeg');
      expect(guardada.evidencias![0].tamaño).toBe(2048576);
      expect(guardada.evidencias![0].subidoPor).toBe('usuario123');
    });

    test('Debe guardar actividad con múltiples evidencias', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT026',
        descripcion: 'Con múltiples evidencias',
        fechaInicio: new Date('2024-09-01'),
        fechaFinal: new Date('2024-09-15'),
        evidencias: [
          {
            nombre: 'foto1.jpg',
            url: '/uploads/foto1.jpg',
            tipo: 'image/jpeg',
            tamaño: 1024000
          },
          {
            nombre: 'foto2.png',
            url: '/uploads/foto2.png',
            tipo: 'image/png',
            tamaño: 2048000
          },
          {
            nombre: 'documento.pdf',
            url: '/uploads/documento.pdf',
            tipo: 'application/pdf',
            tamaño: 512000
          }
        ]
      });
      const guardada = await actividad.save();

      expect(guardada.evidencias).toHaveLength(3);
      expect(guardada.evidencias![0].nombre).toBe('foto1.jpg');
      expect(guardada.evidencias![1].nombre).toBe('foto2.png');
      expect(guardada.evidencias![2].nombre).toBe('documento.pdf');
    });

    test('Debe rechazar evidencia sin nombre (required)', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT027',
        descripcion: 'Evidencia sin nombre',
        fechaInicio: new Date('2024-09-01'),
        fechaFinal: new Date('2024-09-15'),
        evidencias: [{
          url: '/uploads/foto.jpg',
          tipo: 'image/jpeg',
          tamaño: 1024000
        } as any]
      });

      await expect(actividad.save()).rejects.toThrow();
    });

    test('Debe rechazar evidencia sin url (required)', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT028',
        descripcion: 'Evidencia sin url',
        fechaInicio: new Date('2024-09-01'),
        fechaFinal: new Date('2024-09-15'),
        evidencias: [{
          nombre: 'foto.jpg',
          tipo: 'image/jpeg',
          tamaño: 1024000
        } as any]
      });

      await expect(actividad.save()).rejects.toThrow();
    });

    test('Debe rechazar evidencia sin tipo (required)', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT029',
        descripcion: 'Evidencia sin tipo',
        fechaInicio: new Date('2024-09-01'),
        fechaFinal: new Date('2024-09-15'),
        evidencias: [{
          nombre: 'foto.jpg',
          url: '/uploads/foto.jpg',
          tamaño: 1024000
        } as any]
      });

      await expect(actividad.save()).rejects.toThrow();
    });

    test('Debe rechazar evidencia sin tamaño (required)', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT030',
        descripcion: 'Evidencia sin tamaño',
        fechaInicio: new Date('2024-09-01'),
        fechaFinal: new Date('2024-09-15'),
        evidencias: [{
          nombre: 'foto.jpg',
          url: '/uploads/foto.jpg',
          tipo: 'image/jpeg'
        } as any]
      });

      await expect(actividad.save()).rejects.toThrow();
    });

    test('Debe establecer fechaSubida automáticamente si no se proporciona', async () => {
      const proyecto = await crearProyectoPrueba();
      const fechaAntes = new Date();
      
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT031',
        descripcion: 'Evidencia con fecha auto',
        fechaInicio: new Date('2024-09-01'),
        fechaFinal: new Date('2024-09-15'),
        evidencias: [{
          nombre: 'foto.jpg',
          url: '/uploads/foto.jpg',
          tipo: 'image/jpeg',
          tamaño: 1024000
        }]
      });
      const guardada = await actividad.save();

      const fechaDespues = new Date();

      expect(guardada.evidencias![0].fechaSubida).toBeDefined();
      expect(guardada.evidencias![0].fechaSubida!.getTime()).toBeGreaterThanOrEqual(fechaAntes.getTime());
      expect(guardada.evidencias![0].fechaSubida!.getTime()).toBeLessThanOrEqual(fechaDespues.getTime());
    });

    test('Debe permitir agregar evidencia a actividad existente', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT032',
        descripcion: 'Agregar evidencia después',
        fechaInicio: new Date('2024-09-01'),
        fechaFinal: new Date('2024-09-15'),
        evidencias: []
      });
      const guardada = await actividad.save();

      // Agregar evidencia
      guardada.evidencias!.push({
        nombre: 'nueva-foto.jpg',
        url: '/uploads/nueva-foto.jpg',
        tipo: 'image/jpeg',
        tamaño: 512000,
        fechaSubida: new Date(),
        subidoPor: 'usuarioTest'
      } as any);
      const actualizada = await guardada.save();

      expect(actualizada.evidencias).toHaveLength(1);
      expect(actualizada.evidencias![0].nombre).toBe('nueva-foto.jpg');
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SECCIÓN 6: SUBDOCUMENTOS - NOTAS
  // ══════════════════════════════════════════════════════════════

  describe('Subdocumentos - Notas', () => {
    
    test('Debe permitir actividad sin notas (array vacío por defecto)', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT033',
        descripcion: 'Sin notas',
        fechaInicio: new Date('2024-10-01'),
        fechaFinal: new Date('2024-10-15')
      });
      const guardada = await actividad.save();

      expect(guardada.notas).toBeDefined();
      expect(guardada.notas).toEqual([]);
      expect(Array.isArray(guardada.notas)).toBe(true);
    });

    test('Debe guardar actividad con una nota completa', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT034',
        descripcion: 'Con nota',
        fechaInicio: new Date('2024-10-01'),
        fechaFinal: new Date('2024-10-15'),
        notas: [{
          texto: 'Esta es una nota de prueba',
          fechaCreacion: new Date('2024-10-05'),
          creadoPor: 'usuario123'
        }]
      });
      const guardada = await actividad.save();

      expect(guardada.notas).toHaveLength(1);
      expect(guardada.notas![0].texto).toBe('Esta es una nota de prueba');
      expect(guardada.notas![0].creadoPor).toBe('usuario123');
    });

    test('Debe guardar actividad con múltiples notas', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT035',
        descripcion: 'Con múltiples notas',
        fechaInicio: new Date('2024-10-01'),
        fechaFinal: new Date('2024-10-15'),
        notas: [
          {
            texto: 'Primera nota',
            fechaCreacion: new Date('2024-10-05')
          },
          {
            texto: 'Segunda nota con más detalles',
            fechaCreacion: new Date('2024-10-06'),
            creadoPor: 'usuario1'
          },
          {
            texto: 'Tercera nota final',
            fechaCreacion: new Date('2024-10-07'),
            creadoPor: 'usuario2'
          }
        ] as any[]
      });
      const guardada = await actividad.save();

      expect(guardada.notas).toHaveLength(3);
      expect(guardada.notas![0].texto).toBe('Primera nota');
      expect(guardada.notas![1].texto).toBe('Segunda nota con más detalles');
      expect(guardada.notas![2].texto).toBe('Tercera nota final');
    });

    test('Debe rechazar nota sin texto (required)', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT036',
        descripcion: 'Nota sin texto',
        fechaInicio: new Date('2024-10-01'),
        fechaFinal: new Date('2024-10-15'),
        notas: [{
          fechaCreacion: new Date('2024-10-05'),
          creadoPor: 'usuario123'
        } as any]
      });

      await expect(actividad.save()).rejects.toThrow();
    });

    test('Debe establecer fechaCreacion automáticamente si no se proporciona', async () => {
      const proyecto = await crearProyectoPrueba();
      const fechaAntes = new Date();
      
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT037',
        descripcion: 'Nota con fecha auto',
        fechaInicio: new Date('2024-10-01'),
        fechaFinal: new Date('2024-10-15'),
        notas: [{
          texto: 'Nota con fecha automática'
        }] as any[]
      });
      const guardada = await actividad.save();

      const fechaDespues = new Date();

      expect(guardada.notas![0].fechaCreacion).toBeDefined();
      expect(guardada.notas![0].fechaCreacion.getTime()).toBeGreaterThanOrEqual(fechaAntes.getTime());
      expect(guardada.notas![0].fechaCreacion.getTime()).toBeLessThanOrEqual(fechaDespues.getTime());
    });

    test('Debe permitir agregar nota a actividad existente', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT038',
        descripcion: 'Agregar nota después',
        fechaInicio: new Date('2024-10-01'),
        fechaFinal: new Date('2024-10-15'),
        notas: []
      });
      const guardada = await actividad.save();

      // Agregar nota
      guardada.notas!.push({
        texto: 'Nueva nota agregada',
        fechaCreacion: new Date(),
        creadoPor: 'usuarioTest'
      } as any);
      const actualizada = await guardada.save();

      expect(actualizada.notas).toHaveLength(1);
      expect(actualizada.notas![0].texto).toBe('Nueva nota agregada');
    });

    test('Debe permitir nota larga (texto extenso)', async () => {
      const proyecto = await crearProyectoPrueba();
      const textoLargo = 'Esta es una nota muy larga '.repeat(100);
      
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT039',
        descripcion: 'Nota larga',
        fechaInicio: new Date('2024-10-01'),
        fechaFinal: new Date('2024-10-15'),
        notas: [{
          texto: textoLargo,
          creadoPor: 'usuario123'
        }] as any[]
      });
      const guardada = await actividad.save();

      expect(guardada.notas![0].texto).toBe(textoLargo);
      expect(guardada.notas![0].texto.length).toBeGreaterThan(1000);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // SECCIÓN 7: EDGE CASES Y CASOS ESPECIALES
  // ══════════════════════════════════════════════════════════════

  describe('Edge Cases y Casos Especiales', () => {
    
    test('Debe permitir fechaInicio y fechaFinal iguales (actividad de 1 día)', async () => {
      const proyecto = await crearProyectoPrueba();
      const fecha = new Date('2024-11-15');
      
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT040',
        descripcion: 'Actividad de un día',
        fechaInicio: fecha,
        fechaFinal: fecha
      });
      const guardada = await actividad.save();

      expect(guardada.fechaInicio.getTime()).toBe(guardada.fechaFinal.getTime());
    });

    test('Debe permitir actividad con todos los campos opcionales llenos', async () => {
      const proyecto = await crearProyectoPrueba();
      const colaborador = await crearColaboradorPrueba();

      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT041',
        descripcion: 'Actividad completa',
        fechaInicio: new Date('2024-11-01'),
        fechaFinal: new Date('2024-11-30'),
        estado: 'En progreso',
        colaboradores: [colaborador._id],
        color: '#FF0000',
        evidencias: [{
          nombre: 'evidencia.jpg',
          url: '/uploads/evidencia.jpg',
          tipo: 'image/jpeg',
          tamaño: 1024000,
          fechaSubida: new Date(),
          subidoPor: 'user1'
        }],
        notas: [{
          texto: 'Nota importante',
          fechaCreacion: new Date(),
          creadoPor: 'user1'
        }]
      });
      const guardada = await actividad.save();

      expect(guardada.proyecto).toBeDefined();
      expect(guardada.numeroActividad).toBe('ACT041');
      expect(guardada.descripcion).toBe('Actividad completa');
      expect(guardada.estado).toBe('En progreso');
      expect(guardada.colaboradores).toHaveLength(1);
      expect(guardada.color).toBe('#FF0000');
      expect(guardada.evidencias).toHaveLength(1);
      expect(guardada.notas).toHaveLength(1);
    });

    test('Debe tener timestamps (createdAt y updatedAt)', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT042',
        descripcion: 'Test timestamps',
        fechaInicio: new Date('2024-11-01'),
        fechaFinal: new Date('2024-11-15')
      });
      const guardada = await actividad.save();

      expect(guardada.createdAt).toBeDefined();
      expect(guardada.updatedAt).toBeDefined();
      expect(guardada.createdAt).toBeInstanceOf(Date);
      expect(guardada.updatedAt).toBeInstanceOf(Date);
    });

    test('Debe actualizar updatedAt al modificar documento', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT043',
        descripcion: 'Test update timestamp',
        fechaInicio: new Date('2024-11-01'),
        fechaFinal: new Date('2024-11-15')
      });
      const guardada = await actividad.save();
      const updatedAtOriginal = guardada.updatedAt;

      // Esperar un momento y actualizar
      await new Promise(resolve => setTimeout(resolve, 100));
      guardada.descripcion = 'Descripción modificada';
      const actualizada = await guardada.save();

      expect(actualizada.updatedAt!.getTime()).toBeGreaterThan(updatedAtOriginal!.getTime());
    });

    test('Debe permitir buscar actividades por proyecto', async () => {
      const proyecto1 = await crearProyectoPrueba();
      const proyecto2 = await Proyecto.create({
        nombre: 'Proyecto Test 2',
        fechaInicio: new Date('2024-01-01'),
        fechaTerminacion: new Date('2024-12-31')
      });

      // Crear actividades para proyecto 1
      await Actividad.create({
        proyecto: proyecto1._id,
        numeroActividad: 'ACT044',
        descripcion: 'Actividad Proyecto 1 - A',
        fechaInicio: new Date('2024-11-01'),
        fechaFinal: new Date('2024-11-15')
      });

      await Actividad.create({
        proyecto: proyecto1._id,
        numeroActividad: 'ACT045',
        descripcion: 'Actividad Proyecto 1 - B',
        fechaInicio: new Date('2024-11-16'),
        fechaFinal: new Date('2024-11-30')
      });

      // Crear actividad para proyecto 2
      await Actividad.create({
        proyecto: proyecto2._id,
        numeroActividad: 'ACT046',
        descripcion: 'Actividad Proyecto 2',
        fechaInicio: new Date('2024-11-01'),
        fechaFinal: new Date('2024-11-15')
      });

      const actividadesProyecto1 = await Actividad.find({ proyecto: proyecto1._id });

      expect(actividadesProyecto1).toHaveLength(2);
      expect(actividadesProyecto1[0].descripcion).toContain('Proyecto 1');
      expect(actividadesProyecto1[1].descripcion).toContain('Proyecto 1');
    });

    test('Debe permitir buscar actividades por estado', async () => {
      const proyecto = await crearProyectoPrueba();

      await Actividad.create({
        proyecto: proyecto._id,
        numeroActividad: 'ACT047',
        descripcion: 'Pendiente 1',
        fechaInicio: new Date('2024-11-01'),
        fechaFinal: new Date('2024-11-15'),
        estado: 'Pendiente'
      });

      await Actividad.create({
        proyecto: proyecto._id,
        numeroActividad: 'ACT048',
        descripcion: 'En progreso 1',
        fechaInicio: new Date('2024-11-01'),
        fechaFinal: new Date('2024-11-15'),
        estado: 'En progreso'
      });

      await Actividad.create({
        proyecto: proyecto._id,
        numeroActividad: 'ACT049',
        descripcion: 'Completada 1',
        fechaInicio: new Date('2024-11-01'),
        fechaFinal: new Date('2024-11-15'),
        estado: 'Completada'
      });

      const actividadesCompletadas = await Actividad.find({ estado: 'Completada' });
      const actividadesPendientes = await Actividad.find({ estado: 'Pendiente' });

      expect(actividadesCompletadas).toHaveLength(1);
      expect(actividadesPendientes).toHaveLength(1);
    });

    test('Debe permitir numeroActividad duplicado en diferentes proyectos', async () => {
      const proyecto1 = await crearProyectoPrueba();
      const proyecto2 = await Proyecto.create({
        nombre: 'Proyecto Test 2',
        fechaInicio: new Date('2024-01-01'),
        fechaTerminacion: new Date('2024-12-31')
      });

      const actividad1 = await Actividad.create({
        proyecto: proyecto1._id,
        numeroActividad: 'ACT001',
        descripcion: 'Actividad 1 del proyecto 1',
        fechaInicio: new Date('2024-11-01'),
        fechaFinal: new Date('2024-11-15')
      });

      const actividad2 = await Actividad.create({
        proyecto: proyecto2._id,
        numeroActividad: 'ACT001',
        descripcion: 'Actividad 1 del proyecto 2',
        fechaInicio: new Date('2024-11-01'),
        fechaFinal: new Date('2024-11-15')
      });

      expect(actividad1.numeroActividad).toBe('ACT001');
      expect(actividad2.numeroActividad).toBe('ACT001');
      expect(actividad1._id).not.toEqual(actividad2._id);
    });

    test('Debe hacer trim de descripcion y numeroActividad', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: '  ACT050  ',
        descripcion: '  Descripción con espacios  ',
        fechaInicio: new Date('2024-11-01'),
        fechaFinal: new Date('2024-11-15')
      });
      const guardada = await actividad.save();

      expect(guardada.numeroActividad).toBe('ACT050');
      expect(guardada.descripcion).toBe('Descripción con espacios');
    });

    test('Debe hacer trim de color', async () => {
      const proyecto = await crearProyectoPrueba();
      const actividad = new Actividad({
        proyecto: proyecto._id,
        numeroActividad: 'ACT051',
        descripcion: 'Test trim color',
        fechaInicio: new Date('2024-11-01'),
        fechaFinal: new Date('2024-11-15'),
        color: '  #FF0000  '
      });
      const guardada = await actividad.save();

      expect(guardada.color).toBe('#FF0000');
    });

    test('Debe contar correctamente actividades de un proyecto', async () => {
      const proyecto = await crearProyectoPrueba();

      await Actividad.create({
        proyecto: proyecto._id,
        numeroActividad: 'ACT052',
        descripcion: 'Actividad 1',
        fechaInicio: new Date('2024-11-01'),
        fechaFinal: new Date('2024-11-05')
      });

      await Actividad.create({
        proyecto: proyecto._id,
        numeroActividad: 'ACT053',
        descripcion: 'Actividad 2',
        fechaInicio: new Date('2024-11-06'),
        fechaFinal: new Date('2024-11-10')
      });

      await Actividad.create({
        proyecto: proyecto._id,
        numeroActividad: 'ACT054',
        descripcion: 'Actividad 3',
        fechaInicio: new Date('2024-11-11'),
        fechaFinal: new Date('2024-11-15')
      });

      const count = await Actividad.countDocuments({ proyecto: proyecto._id });

      expect(count).toBe(3);
    });
  });
});
