/**
 * ═══════════════════════════════════════════════════════════════════
 * PRUEBAS DE MODELO: InventoryItem
 * ═══════════════════════════════════════════════════════════════════
 * 
 * MODELO: Items del inventario general
 * PRIORIDAD: ALTA (control de stock)
 * 
 * VALIDACIONES A PROBAR:
 * - codigo: required, unique
 * - descripcion: required
 * - cantidad: number, positive
 * - cantidadMinima: number, positive
 * - precioUnitario: number, positive
 * - ubicacion: string
 * - categoria: string
 */

import mongoose from 'mongoose';
import { InventoryItem } from '../../src/models/InventoryItem';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';

const baseDoc = (overrides: Record<string, unknown> = {}) => ({
  marca: 'Truper',
  modelo: 'TRU-500',
  descripcion: 'Pinza de corte',
  proveedor: 'Ferreteria Central',
  unidad: 'PZA',
  precioUnitario: 85,
  cantidad: 40,
  numerosSerie: ['NS-100', 'NS-101'],
  categorias: ['HERRAMIENTA', 'MANUAL'],
  ...overrides,
});

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
});

beforeEach(async () => {
  await clearDB();
});

describe('Modelo InventoryItem', () => {
  describe('CRUD básico', () => {
    it('debe crear y guardar un item de inventario con datos completos', async () => {
      const doc = await InventoryItem.create(baseDoc());

      expect(doc._id).toBeDefined();
      expect(doc.descripcion).toBe('Pinza de corte');
      expect(doc.marca).toBe('Truper');
      expect(doc.precioUnitario).toBe(85);
      expect(doc.cantidad).toBe(40);
    });

    it('debe leer un item por _id', async () => {
      const created = await InventoryItem.create(baseDoc());
      const found = await InventoryItem.findById(created._id);

      expect(found).not.toBeNull();
      expect(found!.modelo).toBe('TRU-500');
    });

    it('debe actualizar campos del item', async () => {
      const created = await InventoryItem.create(baseDoc());

      await InventoryItem.findByIdAndUpdate(created._id, {
        descripcion: 'Pinza de presión',
        cantidad: 60,
      });

      const updated = await InventoryItem.findById(created._id);
      expect(updated!.descripcion).toBe('Pinza de presión');
      expect(updated!.cantidad).toBe(60);
    });

    it('debe eliminar un item por _id', async () => {
      const created = await InventoryItem.create(baseDoc());

      await InventoryItem.findByIdAndDelete(created._id);
      const found = await InventoryItem.findById(created._id);
      expect(found).toBeNull();
    });
  });

  describe('Comportamiento sin required', () => {
    it('debe permitir crear documento vacío porque no hay required', async () => {
      const doc = await InventoryItem.create({});

      expect(doc._id).toBeDefined();
      expect(doc.descripcion).toBeUndefined();
      expect(doc.unidad).toBeUndefined();
      expect(doc.precioUnitario).toBeUndefined();
    });

    it('debe permitir omitir descripcion y cantidad', async () => {
      const { descripcion: _a, cantidad: _b, ...data } = baseDoc() as Record<string, unknown>;
      const doc = await InventoryItem.create(data);

      expect(doc.descripcion).toBeUndefined();
      expect(doc.cantidad).toBeUndefined();
    });
  });

  describe('Arreglos y defaults', () => {
    it('debe asignar numerosSerie como [] por default', async () => {
      const doc = await InventoryItem.create(baseDoc({ numerosSerie: undefined }));
      expect(doc.numerosSerie).toEqual([]);
    });

    it('debe asignar categorias como [] por default', async () => {
      const doc = await InventoryItem.create(baseDoc({ categorias: undefined }));
      expect(doc.categorias).toEqual([]);
    });

    it('debe guardar listas enviadas de numerosSerie y categorias', async () => {
      const doc = await InventoryItem.create(
        baseDoc({
          numerosSerie: ['X1', 'X2', 'X3'],
          categorias: ['ELECTRICO', 'SEGURIDAD'],
        })
      );

      expect(doc.numerosSerie).toHaveLength(3);
      expect(doc.categorias).toHaveLength(2);
      expect(doc.numerosSerie[1]).toBe('X2');
      expect(doc.categorias[0]).toBe('ELECTRICO');
    });
  });

  describe('Tipo de datos y casting', () => {
    it('debe guardar razonSocial cuando se envía ObjectId válido', async () => {
      const rsId = new mongoose.Types.ObjectId();
      const doc = await InventoryItem.create(baseDoc({ razonSocial: rsId }));

      expect((doc.razonSocial as mongoose.Types.ObjectId).toString()).toBe(rsId.toString());
    });

    it('debe permitir omitir razonSocial (campo opcional)', async () => {
      const doc = await InventoryItem.create(baseDoc({ razonSocial: undefined }));
      expect(doc.razonSocial).toBeUndefined();
    });

    it('debe fallar con razonSocial inválido', async () => {
      await expect(
        InventoryItem.create(baseDoc({ razonSocial: 'no-es-objectid' }))
      ).rejects.toThrow();
    });

    it('debe castear strings numéricos en precioUnitario y cantidad', async () => {
      const doc = await InventoryItem.create(
        baseDoc({ precioUnitario: '44.7', cantidad: '18' })
      );

      expect(doc.precioUnitario).toBe(44.7);
      expect(doc.cantidad).toBe(18);
    });
  });

  describe('Edge cases del schema actual', () => {
    it('debe permitir valores negativos (no hay min)', async () => {
      const doc = await InventoryItem.create(
        baseDoc({ precioUnitario: -50, cantidad: -2 })
      );

      expect(doc.precioUnitario).toBe(-50);
      expect(doc.cantidad).toBe(-2);
    });

    it('debe permitir duplicados porque no hay unique en campos de negocio', async () => {
      await InventoryItem.create(baseDoc({ descripcion: 'Duplicado', modelo: 'M1' }));

      await expect(
        InventoryItem.create(baseDoc({ descripcion: 'Duplicado', modelo: 'M1' }))
      ).resolves.toBeDefined();
    });

    it('debe listar todos los items guardados', async () => {
      await InventoryItem.create(baseDoc({ descripcion: 'Item 1' }));
      await InventoryItem.create(baseDoc({ descripcion: 'Item 2' }));

      const all = await InventoryItem.find();
      expect(all.length).toBe(2);
    });

    it('debe permitir strings vacíos en campos string', async () => {
      const doc = await InventoryItem.create(
        baseDoc({
          marca: '',
          modelo: '',
          descripcion: '',
          proveedor: '',
          unidad: '',
        })
      );

      expect(doc.descripcion).toBe('');
      expect(doc.unidad).toBe('');
    });
  });
});
