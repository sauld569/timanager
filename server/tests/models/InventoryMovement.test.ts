/**
 * ═══════════════════════════════════════════════════════════════════
 * PRUEBAS DE MODELO: InventoryMovement
 * ═══════════════════════════════════════════════════════════════════
 * 
 * MODELO: Movimientos de inventario (entradas/salidas)
 * PRIORIDAD: ALTA (trazabilidad de stock)
 * 
 * VALIDACIONES A PROBAR:
 * - item: reference a InventoryItem, required
 * - tipo: enum ('entrada', 'salida', 'ajuste')
 * - cantidad: number, positive, required
 * - fecha: date, auto-generated
 * - motivo: required
 * - usuario: reference a User
 * - proyecto: reference a Proyecto (opcional)
 */

import mongoose from 'mongoose';
import { InventoryMovement } from '../../src/models/InventoryMovement';
import { InventoryItem } from '../../src/models/InventoryItem';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';

const baseDoc = (overrides: Record<string, unknown> = {}) => ({
  itemId: new mongoose.Types.ObjectId(),
  tipo: 'entrada',
  cantidad: 10,
  comentario: 'Entrada inicial de stock',
  usuario: 'almacen_general',
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

describe('Modelo InventoryMovement', () => {
  describe('CRUD básico', () => {
    it('debe crear y guardar un movimiento válido', async () => {
      const doc = await InventoryMovement.create(baseDoc());

      expect(doc._id).toBeDefined();
      expect(doc.tipo).toBe('entrada');
      expect(doc.cantidad).toBe(10);
      expect(doc.comentario).toBe('Entrada inicial de stock');
    });

    it('debe leer un movimiento por _id', async () => {
      const created = await InventoryMovement.create(baseDoc());
      const found = await InventoryMovement.findById(created._id);

      expect(found).not.toBeNull();
      expect(found!.usuario).toBe('almacen_general');
    });

    it('debe actualizar tipo y cantidad', async () => {
      const created = await InventoryMovement.create(baseDoc());

      await InventoryMovement.findByIdAndUpdate(created._id, {
        tipo: 'salida',
        cantidad: 4,
      });

      const updated = await InventoryMovement.findById(created._id);
      expect(updated!.tipo).toBe('salida');
      expect(updated!.cantidad).toBe(4);
    });

    it('debe eliminar un movimiento por _id', async () => {
      const created = await InventoryMovement.create(baseDoc());

      await InventoryMovement.findByIdAndDelete(created._id);
      const found = await InventoryMovement.findById(created._id);
      expect(found).toBeNull();
    });
  });

  describe('Validaciones required', () => {
    it('debe fallar si falta itemId', async () => {
      const { itemId: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(InventoryMovement.create(data)).rejects.toThrow();
    });

    it('debe fallar si falta tipo', async () => {
      const { tipo: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(InventoryMovement.create(data)).rejects.toThrow();
    });

    it('debe fallar si falta cantidad', async () => {
      const { cantidad: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(InventoryMovement.create(data)).rejects.toThrow();
    });

    it('debe fallar si itemId no es ObjectId válido', async () => {
      await expect(
        InventoryMovement.create(baseDoc({ itemId: 'no-es-objectid' }))
      ).rejects.toThrow();
    });
  });

  describe('Enum tipo', () => {
    it('debe aceptar tipo entrada', async () => {
      const doc = await InventoryMovement.create(baseDoc({ tipo: 'entrada' }));
      expect(doc.tipo).toBe('entrada');
    });

    it('debe aceptar tipo salida', async () => {
      const doc = await InventoryMovement.create(baseDoc({ tipo: 'salida' }));
      expect(doc.tipo).toBe('salida');
    });

    it('debe rechazar tipo fuera del enum', async () => {
      await expect(
        InventoryMovement.create(baseDoc({ tipo: 'ajuste' }))
      ).rejects.toThrow();
    });
  });

  describe('Fechas y opcionales', () => {
    it('debe asignar fecha por default', async () => {
      const doc = await InventoryMovement.create(baseDoc({ fecha: undefined }));
      expect(doc.fecha).toBeInstanceOf(Date);
    });

    it('debe permitir fecha explícita', async () => {
      const fecha = new Date('2026-07-01');
      const doc = await InventoryMovement.create(baseDoc({ fecha }));
      expect((doc.fecha as Date).getTime()).toBe(fecha.getTime());
    });

    it('debe guardar comentario y usuario cuando se envían', async () => {
      const doc = await InventoryMovement.create(
        baseDoc({ comentario: 'Salida por consumo', usuario: 'coordinador' })
      );

      expect(doc.comentario).toBe('Salida por consumo');
      expect(doc.usuario).toBe('coordinador');
    });

    it('debe permitir omitir comentario y usuario', async () => {
      const doc = await InventoryMovement.create(
        baseDoc({ comentario: undefined, usuario: undefined })
      );

      expect(doc.comentario).toBeUndefined();
      expect(doc.usuario).toBeUndefined();
    });
  });

  describe('Relación con InventoryItem y edge cases', () => {
    it('debe hacer populate de itemId cuando existe el item relacionado', async () => {
      const item = await InventoryItem.create({ descripcion: 'Conector BNC' });
      const mov = await InventoryMovement.create(baseDoc({ itemId: item._id }));

      const populated = await InventoryMovement.findById(mov._id).populate('itemId');
      const populatedItem = populated!.itemId as unknown as { _id: mongoose.Types.ObjectId; descripcion?: string };

      expect(populatedItem._id.toString()).toBe((item._id as mongoose.Types.ObjectId).toString());
      expect(populatedItem.descripcion).toBe('Conector BNC');
    });

    it('debe permitir cantidad negativa porque no hay min en el schema', async () => {
      const doc = await InventoryMovement.create(baseDoc({ cantidad: -8 }));
      expect(doc.cantidad).toBe(-8);
    });

    it('debe permitir cantidad 0', async () => {
      const doc = await InventoryMovement.create(baseDoc({ cantidad: 0 }));
      expect(doc.cantidad).toBe(0);
    });

    it('debe listar todos los movimientos guardados', async () => {
      await InventoryMovement.create(baseDoc({ tipo: 'entrada' }));
      await InventoryMovement.create(baseDoc({ tipo: 'salida', itemId: new mongoose.Types.ObjectId() }));

      const all = await InventoryMovement.find();
      expect(all.length).toBe(2);
    });

    it('debe mantener referencias independientes para diferentes itemId', async () => {
      const itemA = new mongoose.Types.ObjectId();
      const itemB = new mongoose.Types.ObjectId();

      const a = await InventoryMovement.create(baseDoc({ itemId: itemA, tipo: 'entrada', cantidad: 3 }));
      const b = await InventoryMovement.create(baseDoc({ itemId: itemB, tipo: 'salida', cantidad: 1 }));

      expect((a.itemId as mongoose.Types.ObjectId).toString()).toBe(itemA.toString());
      expect((b.itemId as mongoose.Types.ObjectId).toString()).toBe(itemB.toString());
      expect((a.itemId as mongoose.Types.ObjectId).toString()).not.toBe((b.itemId as mongoose.Types.ObjectId).toString());
    });
  });
});
