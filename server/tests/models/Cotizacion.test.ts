/**
 * ═══════════════════════════════════════════════════════════════════
 * PRUEBAS DE MODELO: Cotizacion
 * ═══════════════════════════════════════════════════════════════════
 * 
 * MODELO: Cotizaciones a clientes
 * PRIORIDAD: ALTA (ventas)
 * 
 * COBERTURA MÍNIMA NECESARIA:
 * - numeroPresupuesto: required, unique, trim
 * - cliente: referencia a Cliente (required, populate)
 * - vigencia: required
 * - estado y moneda: enums + defaults
 * - items: validaciones de subdocumento
 * - calcularTotales(): subtotal, ivaImporte, total, fechaActualizacion
 *
 * Relación aplicada en esta etapa:
 * - Cliente (modelo ya probado)
 *
 * No se agregan relaciones con Actividad/Colaborador porque
 * este esquema no las define directamente.
 */

import mongoose from 'mongoose';
import Cotizacion from '../../src/models/Cotizacion';
import Cliente from '../../src/models/Cliente';
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

describe('Modelo Cotizacion', () => {
  const crearClientePrueba = async () => {
    return await Cliente.create({
      nombreEmpresa: 'Cliente Cotizacion SA',
      direccion: 'Av. Principal 123',
      telefono: '5551234567'
    });
  };

  const itemValido = {
    clave: 1,
    concepto: 'Servicio de instalacion',
    cantidad: 2,
    unidad: 'SERV' as const,
    precioUnitario: 1000,
    porcentajeGanancia: 10,
    ganancia: 100,
    importe: 2200,
    aplicarIva: true
  };

  describe('CRUD basico', () => {
    test('Debe crear una cotizacion valida correctamente', async () => {
      const cliente = await crearClientePrueba();

      const cotizacion = new Cotizacion({
        numeroPresupuesto: 'COT-001',
        cliente: cliente._id,
        vigencia: new Date('2026-12-31'),
        items: [itemValido]
      });

      const guardada = await cotizacion.save();

      expect(guardada._id).toBeDefined();
      expect(guardada.numeroPresupuesto).toBe('COT-001');
      expect(guardada.cliente.toString()).toBe((cliente._id as mongoose.Types.ObjectId).toString());
      expect(guardada.items).toHaveLength(1);
    });

    test('Debe encontrar cotizacion por ID', async () => {
      const cliente = await crearClientePrueba();
      const guardada = await Cotizacion.create({
        numeroPresupuesto: 'COT-002',
        cliente: cliente._id,
        vigencia: new Date('2026-12-31'),
        items: [itemValido]
      });

      const encontrada = await Cotizacion.findById(guardada._id);

      expect(encontrada).toBeDefined();
      expect(encontrada?.numeroPresupuesto).toBe('COT-002');
    });

    test('Debe actualizar cotizacion correctamente', async () => {
      const cliente = await crearClientePrueba();
      const guardada = await Cotizacion.create({
        numeroPresupuesto: 'COT-003',
        cliente: cliente._id,
        vigencia: new Date('2026-12-31'),
        estado: 'Borrador',
        items: [itemValido]
      });

      guardada.estado = 'Enviada';
      guardada.comentariosInternos = 'Revisada por ventas';
      const actualizada = await guardada.save();

      expect(actualizada.estado).toBe('Enviada');
      expect(actualizada.comentariosInternos).toBe('Revisada por ventas');
    });

    test('Debe eliminar cotizacion correctamente', async () => {
      const cliente = await crearClientePrueba();
      const guardada = await Cotizacion.create({
        numeroPresupuesto: 'COT-004',
        cliente: cliente._id,
        vigencia: new Date('2026-12-31'),
        items: [itemValido]
      });

      await Cotizacion.findByIdAndDelete(guardada._id);
      const eliminada = await Cotizacion.findById(guardada._id);

      expect(eliminada).toBeNull();
    });
  });

  describe('Validaciones requeridas y unique', () => {
    test('Debe fallar si falta numeroPresupuesto (required)', async () => {
      const cliente = await crearClientePrueba();
      const cotizacion = new Cotizacion({
        cliente: cliente._id,
        vigencia: new Date('2026-12-31'),
        items: [itemValido]
      });

      await expect(cotizacion.save()).rejects.toThrow();
    });

    test('Debe fallar si falta cliente (required)', async () => {
      const cotizacion = new Cotizacion({
        numeroPresupuesto: 'COT-005',
        vigencia: new Date('2026-12-31'),
        items: [itemValido]
      });

      await expect(cotizacion.save()).rejects.toThrow();
    });

    test('Debe fallar si falta vigencia (required)', async () => {
      const cliente = await crearClientePrueba();
      const cotizacion = new Cotizacion({
        numeroPresupuesto: 'COT-006',
        cliente: cliente._id,
        items: [itemValido]
      });

      await expect(cotizacion.save()).rejects.toThrow();
    });

    test('Debe rechazar numeroPresupuesto duplicado (unique)', async () => {
      const cliente = await crearClientePrueba();

      await Cotizacion.create({
        numeroPresupuesto: 'COT-007',
        cliente: cliente._id,
        vigencia: new Date('2026-12-31'),
        items: [itemValido]
      });

      const duplicada = new Cotizacion({
        numeroPresupuesto: 'COT-007',
        cliente: cliente._id,
        vigencia: new Date('2026-12-31'),
        items: [itemValido]
      });

      await expect(duplicada.save()).rejects.toThrow();
    });

    test('Debe hacer trim en numeroPresupuesto', async () => {
      const cliente = await crearClientePrueba();
      const guardada = await Cotizacion.create({
        numeroPresupuesto: '  COT-008  ',
        cliente: cliente._id,
        vigencia: new Date('2026-12-31'),
        items: [itemValido]
      });

      expect(guardada.numeroPresupuesto).toBe('COT-008');
    });
  });

  describe('Enums y defaults', () => {
    test('Debe establecer defaults correctos', async () => {
      const cliente = await crearClientePrueba();
      const guardada = await Cotizacion.create({
        numeroPresupuesto: 'COT-009',
        cliente: cliente._id,
        vigencia: new Date('2026-12-31'),
        items: [itemValido]
      });

      expect(guardada.estado).toBe('Borrador');
      expect(guardada.moneda).toBe('MXN');
      expect(guardada.iva).toBe(8);
      expect(guardada.subtotal).toBe(0);
      expect(guardada.ivaImporte).toBe(0);
      expect(guardada.total).toBe(0);
      expect(guardada.mostrarContenidoConceptos).toBe(false);
      expect(guardada.ultimaClave).toBe(0);
      expect(guardada.fechaCreacion).toBeInstanceOf(Date);
      expect(guardada.fechaActualizacion).toBeInstanceOf(Date);
    });

    test('Debe aceptar estados validos', async () => {
      const cliente = await crearClientePrueba();
      const estados = ['Borrador', 'Enviada', 'Aceptada', 'Rechazada', 'Vencida'] as const;

      for (let i = 0; i < estados.length; i++) {
        const creada = await Cotizacion.create({
          numeroPresupuesto: `COT-EST-${i}`,
          cliente: cliente._id,
          vigencia: new Date('2026-12-31'),
          estado: estados[i],
          items: [itemValido]
        });
        expect(creada.estado).toBe(estados[i]);
      }
    });

    test('Debe rechazar estado invalido', async () => {
      const cliente = await crearClientePrueba();
      const cotizacion = new Cotizacion({
        numeroPresupuesto: 'COT-010',
        cliente: cliente._id,
        vigencia: new Date('2026-12-31'),
        estado: 'Invalido' as any,
        items: [itemValido]
      });

      await expect(cotizacion.save()).rejects.toThrow();
    });

    test('Debe aceptar monedas validas y rechazar invalidas', async () => {
      const cliente = await crearClientePrueba();

      const mxn = await Cotizacion.create({
        numeroPresupuesto: 'COT-011',
        cliente: cliente._id,
        vigencia: new Date('2026-12-31'),
        moneda: 'MXN',
        items: [itemValido]
      });
      expect(mxn.moneda).toBe('MXN');

      const usd = await Cotizacion.create({
        numeroPresupuesto: 'COT-012',
        cliente: cliente._id,
        vigencia: new Date('2026-12-31'),
        moneda: 'USD',
        items: [itemValido]
      });
      expect(usd.moneda).toBe('USD');

      const invalida = new Cotizacion({
        numeroPresupuesto: 'COT-013',
        cliente: cliente._id,
        vigencia: new Date('2026-12-31'),
        moneda: 'EUR',
        items: [itemValido]
      });

      await expect(invalida.save()).rejects.toThrow();
    });
  });

  describe('Items y metodo calcularTotales', () => {
    test('Debe guardar item valido y aplicar defaults del subdocumento', async () => {
      const cliente = await crearClientePrueba();

      const guardada = await Cotizacion.create({
        numeroPresupuesto: 'COT-014',
        cliente: cliente._id,
        vigencia: new Date('2026-12-31'),
        items: [{
          clave: 1,
          concepto: 'Cableado estructurado',
          cantidad: 10,
          unidad: 'MTS',
          precioUnitario: 50,
          importe: 500,
          aplicarIva: false
        }]
      });

      expect(guardada.items).toHaveLength(1);
      expect(guardada.items[0].porcentajeGanancia).toBe(0);
      expect(guardada.items[0].ganancia).toBe(0);
      expect(guardada.items[0].esCanalizacion).toBe(false);
      expect(guardada.items[0].esSeparador).toBe(false);
      expect(guardada.items[0].esConceptoAgrupado).toBe(false);
    });

    test('Debe rechazar item sin campos requeridos', async () => {
      const cliente = await crearClientePrueba();
      const cotizacion = new Cotizacion({
        numeroPresupuesto: 'COT-015',
        cliente: cliente._id,
        vigencia: new Date('2026-12-31'),
        items: [{
          clave: 1,
          cantidad: 1,
          unidad: 'PZA',
          precioUnitario: 100,
          importe: 100,
          aplicarIva: true
        } as any]
      });

      await expect(cotizacion.save()).rejects.toThrow();
    });

    test('Debe rechazar unidad invalida en items', async () => {
      const cliente = await crearClientePrueba();
      const cotizacion = new Cotizacion({
        numeroPresupuesto: 'COT-016',
        cliente: cliente._id,
        vigencia: new Date('2026-12-31'),
        items: [{
          clave: 1,
          concepto: 'Prueba unidad invalida',
          cantidad: 1,
          unidad: 'KG',
          precioUnitario: 100,
          importe: 100,
          aplicarIva: true
        } as any]
      });

      await expect(cotizacion.save()).rejects.toThrow();
    });

    test('Debe calcular totales correctamente con calcularTotales()', async () => {
      const cliente = await crearClientePrueba();
      const cotizacion = new Cotizacion({
        numeroPresupuesto: 'COT-017',
        cliente: cliente._id,
        vigencia: new Date('2026-12-31'),
        iva: 8,
        items: [
          {
            clave: 1,
            concepto: 'Item 1',
            cantidad: 1,
            unidad: 'PZA',
            precioUnitario: 100,
            importe: 100,
            aplicarIva: true
          },
          {
            clave: 2,
            concepto: 'Item 2',
            cantidad: 2,
            unidad: 'SERV',
            precioUnitario: 200,
            importe: 400,
            aplicarIva: true
          }
        ]
      });

      cotizacion.calcularTotales();
      const guardada = await cotizacion.save();

      expect(guardada.subtotal).toBe(500);
      expect(guardada.ivaImporte).toBeCloseTo(40);
      expect(guardada.total).toBeCloseTo(540);
      expect(guardada.fechaActualizacion).toBeInstanceOf(Date);
    });
  });

  describe('Relacion con Cliente', () => {
    test('Debe hacer populate de cliente correctamente', async () => {
      const cliente = await crearClientePrueba();
      const cotizacion = await Cotizacion.create({
        numeroPresupuesto: 'COT-018',
        cliente: cliente._id,
        vigencia: new Date('2026-12-31'),
        items: [itemValido]
      });

      const conPopulate = await Cotizacion.findById(cotizacion._id).populate('cliente');

      expect(conPopulate).toBeDefined();
      expect((conPopulate?.cliente as any).nombreEmpresa).toBe('Cliente Cotizacion SA');
    });

    test('Debe permitir cliente inexistente a nivel esquema pero retornar null al populate', async () => {
      const idInexistente = new mongoose.Types.ObjectId();
      const cotizacion = await Cotizacion.create({
        numeroPresupuesto: 'COT-019',
        cliente: idInexistente,
        vigencia: new Date('2026-12-31'),
        items: [itemValido]
      });

      const conPopulate = await Cotizacion.findById(cotizacion._id).populate('cliente');
      expect(conPopulate?.cliente).toBeNull();
    });
  });
});
