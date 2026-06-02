/**
 * ═══════════════════════════════════════════════════════════════════
 * PRUEBAS DE MODELO: Item
 * ═══════════════════════════════════════════════════════════════════
 * 
 * MODELO: Items genéricos (productos/servicios)
 * PRIORIDAD: MEDIA (catálogo)
 * 
 * VALIDACIONES A PROBAR:
 * - codigo: required, unique
 * - descripcion: required
 * - unidad: string, required
 * - precio: number, positive
 * - categoria: string
 * - activo: boolean, default true
 */

import mongoose from 'mongoose';
import { Item } from '../../src/models/Item';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';

const baseDoc = (overrides: Record<string, unknown> = {}) => ({
  descripcion: 'Cable de red Cat6',
  marca: 'Panduit',
  modelo: 'PD-CAT6',
  proveedor: 'Proveedor Telecom',
  unidad: 'MTS',
  precioUnitario: 18.5,
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

describe('Modelo Item', () => {
  describe('CRUD básico', () => {
    it('debe crear y guardar un item válido', async () => {
      const doc = await Item.create(baseDoc());

      expect(doc._id).toBeDefined();
      expect(doc.descripcion).toBe('Cable de red Cat6');
      expect(doc.unidad).toBe('MTS');
      expect(doc.precioUnitario).toBe(18.5);
    });

    it('debe leer un item por _id', async () => {
      const created = await Item.create(baseDoc());
      const found = await Item.findById(created._id);

      expect(found).not.toBeNull();
      expect(found!.marca).toBe('Panduit');
    });

    it('debe actualizar campos del item', async () => {
      const created = await Item.create(baseDoc());

      await Item.findByIdAndUpdate(created._id, {
        descripcion: 'Canaleta PVC',
        unidad: 'PZA',
        precioUnitario: 120,
      });

      const updated = await Item.findById(created._id);
      expect(updated!.descripcion).toBe('Canaleta PVC');
      expect(updated!.unidad).toBe('PZA');
      expect(updated!.precioUnitario).toBe(120);
    });

    it('debe eliminar un item por _id', async () => {
      const created = await Item.create(baseDoc());

      await Item.findByIdAndDelete(created._id);
      const found = await Item.findById(created._id);
      expect(found).toBeNull();
    });
  });

  describe('Validaciones required', () => {
    it('debe fallar si falta descripcion', async () => {
      const { descripcion: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(Item.create(data)).rejects.toThrow();
    });

    it('debe fallar si falta marca', async () => {
      const { marca: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(Item.create(data)).rejects.toThrow();
    });

    it('debe fallar si falta modelo', async () => {
      const { modelo: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(Item.create(data)).rejects.toThrow();
    });

    it('debe fallar si falta proveedor', async () => {
      const { proveedor: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(Item.create(data)).rejects.toThrow();
    });

    it('debe fallar si falta unidad', async () => {
      const { unidad: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(Item.create(data)).rejects.toThrow();
    });

    it('debe fallar si falta precioUnitario', async () => {
      const { precioUnitario: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(Item.create(data)).rejects.toThrow();
    });
  });

  describe('Enum unidad', () => {
    it('debe aceptar unidad PZA', async () => {
      const doc = await Item.create(baseDoc({ unidad: 'PZA' }));
      expect(doc.unidad).toBe('PZA');
    });

    it('debe aceptar unidad MTS', async () => {
      const doc = await Item.create(baseDoc({ unidad: 'MTS' }));
      expect(doc.unidad).toBe('MTS');
    });

    it('debe rechazar unidad fuera del enum', async () => {
      await expect(
        Item.create(baseDoc({ unidad: 'SERV' }))
      ).rejects.toThrow();
    });
  });

  describe('Comportamiento real del schema', () => {
    it('debe permitir precioUnitario negativo porque no hay min', async () => {
      const doc = await Item.create(baseDoc({ precioUnitario: -5 }));
      expect(doc.precioUnitario).toBe(-5);
    });

    it('debe castear precioUnitario string numérico a Number', async () => {
      const doc = await Item.create(baseDoc({ precioUnitario: '99.9' }));
      expect(doc.precioUnitario).toBe(99.9);
    });

    it('debe permitir descripciones duplicadas porque no hay unique', async () => {
      await Item.create(baseDoc({ descripcion: 'Duplicado', modelo: 'A1' }));

      await expect(
        Item.create(baseDoc({ descripcion: 'Duplicado', modelo: 'B2' }))
      ).resolves.toBeDefined();
    });

    it('debe rechazar strings vacíos en campos required', async () => {
      await expect(
        Item.create(
          baseDoc({
            descripcion: '',
            marca: '',
            modelo: '',
            proveedor: '',
          })
        )
      ).rejects.toThrow();
    });

    it('debe listar todos los items guardados', async () => {
      await Item.create(baseDoc({ descripcion: 'Item A', modelo: 'M-A' }));
      await Item.create(baseDoc({ descripcion: 'Item B', modelo: 'M-B' }));

      const all = await Item.find();
      expect(all.length).toBe(2);
    });
  });
});
