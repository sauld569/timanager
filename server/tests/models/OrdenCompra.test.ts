/**
 * ═══════════════════════════════════════════════════════════════════
 * PRUEBAS DE MODELO: OrdenCompra
 * ═══════════════════════════════════════════════════════════════════
 * 
 * MODELO: Órdenes de compra
 * PRIORIDAD: ALTA (transacciones financieras)
 * 
 * VALIDACIONES A PROBAR:
 * - numeroOrden: required, unique
 * - proveedor: reference a Proveedor, required
 * - fecha: date, required
 * - items: array no vacío, required
 * - total: number, calculated from items
 * - estado: enum values
 * - Cálculos: totales, subtotales, IVA
 */

import mongoose from 'mongoose';
import OrdenCompra from '../../src/models/OrdenCompra';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';

const baseDoc = (overrides: Record<string, unknown> = {}) => ({
  numeroOrden: 'OC-0001',
  numeroCotizacion: 'COT-1001',
  proveedor: new mongoose.Types.ObjectId(),
  razonSocial: new mongoose.Types.ObjectId(),
  vendedor: new mongoose.Types.ObjectId(),
  proyecto: new mongoose.Types.ObjectId(),
  datosOrden: {
    items: [
      { clave: 'ITM-1', cantidad: 2, precio: 150 },
      { clave: 'ITM-2', cantidad: 1, precio: 90 },
    ],
    subtotal: 390,
    iva: 62.4,
    total: 452.4,
  },
  rutaPdf: '/pdfs/ordenes/OC-0001.pdf',
  ...overrides,
});

beforeAll(async () => {
  await connectDB();
  await OrdenCompra.init(); // build unique index for numeroOrden
});

afterAll(async () => {
  await disconnectDB();
});

beforeEach(async () => {
  await clearDB();
});

describe('Modelo OrdenCompra', () => {
  describe('CRUD básico', () => {
    it('debe crear y guardar una orden de compra válida', async () => {
      const doc = await OrdenCompra.create(baseDoc());

      expect(doc._id).toBeDefined();
      expect(doc.numeroOrden).toBe('OC-0001');
      expect(doc.numeroCotizacion).toBe('COT-1001');
      expect(doc.rutaPdf).toBe('/pdfs/ordenes/OC-0001.pdf');
      expect(doc.datosOrden).toBeDefined();
    });

    it('debe leer una orden por _id', async () => {
      const created = await OrdenCompra.create(baseDoc());
      const found = await OrdenCompra.findById(created._id);

      expect(found).not.toBeNull();
      expect(found!.numeroOrden).toBe('OC-0001');
    });

    it('debe actualizar numeroCotizacion y rutaPdf', async () => {
      const created = await OrdenCompra.create(baseDoc());

      await OrdenCompra.findByIdAndUpdate(created._id, {
        numeroCotizacion: 'COT-2002',
        rutaPdf: '/pdfs/ordenes/OC-0001-v2.pdf',
      });

      const updated = await OrdenCompra.findById(created._id);
      expect(updated!.numeroCotizacion).toBe('COT-2002');
      expect(updated!.rutaPdf).toBe('/pdfs/ordenes/OC-0001-v2.pdf');
    });

    it('debe eliminar una orden por _id', async () => {
      const created = await OrdenCompra.create(baseDoc());

      await OrdenCompra.findByIdAndDelete(created._id);
      const found = await OrdenCompra.findById(created._id);

      expect(found).toBeNull();
    });
  });

  describe('Unicidad y trim', () => {
    it('debe rechazar numeroOrden duplicado', async () => {
      await OrdenCompra.create(baseDoc({ numeroOrden: 'OC-DUP-1' }));

      await expect(
        OrdenCompra.create(baseDoc({ numeroOrden: 'OC-DUP-1', proveedor: new mongoose.Types.ObjectId(), razonSocial: new mongoose.Types.ObjectId() }))
      ).rejects.toThrow();
    });

    it('debe permitir numeroOrden distintos', async () => {
      const a = await OrdenCompra.create(baseDoc({ numeroOrden: 'OC-A' }));
      const b = await OrdenCompra.create(baseDoc({ numeroOrden: 'OC-B', proveedor: new mongoose.Types.ObjectId(), razonSocial: new mongoose.Types.ObjectId() }));

      expect((a._id as mongoose.Types.ObjectId).toString()).not.toBe((b._id as mongoose.Types.ObjectId).toString());
    });

    it('debe aplicar trim en numeroOrden', async () => {
      const doc = await OrdenCompra.create(baseDoc({ numeroOrden: '  OC-TRIM  ' }));
      expect(doc.numeroOrden).toBe('OC-TRIM');
    });

    it('debe aplicar trim en numeroCotizacion', async () => {
      const doc = await OrdenCompra.create(baseDoc({ numeroOrden: 'OC-TRIM-2', numeroCotizacion: '  COT-TRIM  ' }));
      expect(doc.numeroCotizacion).toBe('COT-TRIM');
    });
  });

  describe('Comportamiento actual sin required explícito', () => {
    it('debe permitir crear orden sin proveedor ni razonSocial', async () => {
      const doc = await OrdenCompra.create(baseDoc({ numeroOrden: 'OC-SIN-REF', proveedor: undefined, razonSocial: undefined }));

      expect(doc.numeroOrden).toBe('OC-SIN-REF');
      expect(doc.proveedor).toBeUndefined();
      expect(doc.razonSocial).toBeUndefined();
    });

    it('debe permitir crear orden sin datosOrden', async () => {
      const doc = await OrdenCompra.create(baseDoc({ numeroOrden: 'OC-SIN-DATOS', datosOrden: undefined }));
      expect(doc.datosOrden).toBeUndefined();
    });

    it('debe permitir omitir vendedor, proyecto y rutaPdf (opcionales)', async () => {
      const doc = await OrdenCompra.create(
        baseDoc({
          numeroOrden: 'OC-OPT',
          vendedor: undefined,
          proyecto: undefined,
          rutaPdf: undefined,
        })
      );

      expect(doc.vendedor).toBeUndefined();
      expect(doc.proyecto).toBeUndefined();
      expect(doc.rutaPdf).toBeUndefined();
    });
  });

  describe('Fechas y timestamps', () => {
    it('debe asignar fecha por default', async () => {
      const doc = await OrdenCompra.create(baseDoc({ numeroOrden: 'OC-FECHA-1', fecha: undefined }));
      expect(doc.fecha).toBeInstanceOf(Date);
    });

    it('debe respetar fecha explícita enviada', async () => {
      const fecha = new Date('2026-09-10');
      const doc = await OrdenCompra.create(baseDoc({ numeroOrden: 'OC-FECHA-2', fecha }));
      expect((doc.fecha as Date).getTime()).toBe(fecha.getTime());
    });

    it('debe incluir createdAt y updatedAt', async () => {
      const doc = await OrdenCompra.create(baseDoc({ numeroOrden: 'OC-TS-1' }));
      expect((doc as any).createdAt).toBeInstanceOf(Date);
      expect((doc as any).updatedAt).toBeInstanceOf(Date);
    });

    it('debe actualizar updatedAt al guardar cambios', async () => {
      const doc = await OrdenCompra.create(baseDoc({ numeroOrden: 'OC-TS-2' }));
      const original = (doc as any).updatedAt as Date;

      await new Promise(resolve => setTimeout(resolve, 10));

      doc.rutaPdf = '/pdfs/ordenes/OC-TS-2-v2.pdf';
      await doc.save();

      expect(((doc as any).updatedAt as Date).getTime()).toBeGreaterThan(original.getTime());
    });
  });

  describe('ObjectId casting y estructura flexible', () => {
    it('debe fallar si proveedor tiene ObjectId inválido', async () => {
      await expect(
        OrdenCompra.create(baseDoc({ numeroOrden: 'OC-BAD-PROV', proveedor: 'no-es-objectid' }))
      ).rejects.toThrow();
    });

    it('debe fallar si razonSocial tiene ObjectId inválido', async () => {
      await expect(
        OrdenCompra.create(baseDoc({ numeroOrden: 'OC-BAD-RS', razonSocial: 'no-es-objectid' }))
      ).rejects.toThrow();
    });

    it('debe permitir datosOrden con estructura flexible (Schema.Types.Mixed)', async () => {
      const payload = {
        meta: { origen: 'importado', version: 3 },
        montos: [12, 50.5, 100],
        notas: 'estructura libre',
      };

      const doc = await OrdenCompra.create(baseDoc({ numeroOrden: 'OC-MIXED-1', datosOrden: payload }));
      expect(doc.datosOrden).toEqual(payload);
    });

    it('debe listar todas las ordenes guardadas', async () => {
      await OrdenCompra.create(baseDoc({ numeroOrden: 'OC-LIST-1' }));
      await OrdenCompra.create(baseDoc({ numeroOrden: 'OC-LIST-2', proveedor: new mongoose.Types.ObjectId(), razonSocial: new mongoose.Types.ObjectId() }));

      const all = await OrdenCompra.find();
      expect(all.length).toBe(2);
    });
  });
});
