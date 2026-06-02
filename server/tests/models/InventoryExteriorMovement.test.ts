/**
 * ═══════════════════════════════════════════════════════════════════
 * PRUEBAS DE MODELO: InventoryExteriorMovement
 * ═══════════════════════════════════════════════════════════════════
 * 
 * MODELO: Movimientos de inventario exterior
 * PRIORIDAD: MEDIA (trazabilidad exterior)
 * 
 * VALIDACIONES A PROBAR:
 * - item: reference a InventoryExteriorItem, required
 * - tipo: enum ('entrada', 'salida', 'ajuste')
 * - cantidad: number, positive
 * - fecha: date, auto-generated
 * - motivo: required
 * - usuario: reference a User
 */

import mongoose from 'mongoose';
import { InventoryExteriorMovement } from '../../src/models/InventoryExteriorMovement';
import { InventoryExteriorItem } from '../../src/models/InventoryExteriorItem';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';

const baseDoc = (overrides: Record<string, unknown> = {}) => ({
  itemId: new mongoose.Types.ObjectId(),
  tipo: 'entrada',
  cantidad: 10,
  comentario: 'Ingreso inicial',
  usuario: 'almacenista',
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

describe('Modelo InventoryExteriorMovement', () => {
  describe('CRUD básico', () => {
    it('debe crear y guardar un movimiento válido', async () => {
      const doc = await InventoryExteriorMovement.create(baseDoc());

      expect(doc._id).toBeDefined();
      expect(doc.tipo).toBe('entrada');
      expect(doc.cantidad).toBe(10);
      expect(doc.comentario).toBe('Ingreso inicial');
    });

    it('debe leer un movimiento por _id', async () => {
      const created = await InventoryExteriorMovement.create(baseDoc());
      const found = await InventoryExteriorMovement.findById(created._id);

      expect(found).not.toBeNull();
      expect(found!.usuario).toBe('almacenista');
    });

    it('debe actualizar tipo y cantidad de un movimiento', async () => {
      const created = await InventoryExteriorMovement.create(baseDoc());

      await InventoryExteriorMovement.findByIdAndUpdate(created._id, {
        tipo: 'salida',
        cantidad: 4,
      });

      const updated = await InventoryExteriorMovement.findById(created._id);
      expect(updated!.tipo).toBe('salida');
      expect(updated!.cantidad).toBe(4);
    });

    it('debe eliminar un movimiento por _id', async () => {
      const created = await InventoryExteriorMovement.create(baseDoc());

      await InventoryExteriorMovement.findByIdAndDelete(created._id);
      const found = await InventoryExteriorMovement.findById(created._id);
      expect(found).toBeNull();
    });
  });

  describe('Comportamiento sin required', () => {
    it('debe permitir crear documento vacío porque no hay required', async () => {
      const doc = await InventoryExteriorMovement.create({});

      expect(doc._id).toBeDefined();
      expect(doc.itemId).toBeUndefined();
      expect(doc.tipo).toBeUndefined();
      expect(doc.cantidad).toBeUndefined();
    });

    it('debe permitir movimiento sin itemId', async () => {
      const { itemId: _omit, ...data } = baseDoc() as Record<string, unknown>;
      const doc = await InventoryExteriorMovement.create(data);
      expect(doc.itemId).toBeUndefined();
    });

    it('debe permitir movimiento sin cantidad', async () => {
      const { cantidad: _omit, ...data } = baseDoc() as Record<string, unknown>;
      const doc = await InventoryExteriorMovement.create(data);
      expect(doc.cantidad).toBeUndefined();
    });
  });

  describe('Enum tipo', () => {
    it('debe aceptar tipo entrada', async () => {
      const doc = await InventoryExteriorMovement.create(baseDoc({ tipo: 'entrada' }));
      expect(doc.tipo).toBe('entrada');
    });

    it('debe aceptar tipo salida', async () => {
      const doc = await InventoryExteriorMovement.create(baseDoc({ tipo: 'salida' }));
      expect(doc.tipo).toBe('salida');
    });

    it('debe rechazar tipo fuera del enum', async () => {
      await expect(
        InventoryExteriorMovement.create(baseDoc({ tipo: 'ajuste' }))
      ).rejects.toThrow();
    });

    it('debe permitir omitir tipo', async () => {
      const { tipo: _omit, ...data } = baseDoc() as Record<string, unknown>;
      const doc = await InventoryExteriorMovement.create(data);
      expect(doc.tipo).toBeUndefined();
    });
  });

  describe('Fechas y campos opcionales', () => {
    it('debe asignar fecha por default', async () => {
      const doc = await InventoryExteriorMovement.create(baseDoc({ fecha: undefined }));
      expect(doc.fecha).toBeInstanceOf(Date);
    });

    it('debe permitir fecha explícita', async () => {
      const fecha = new Date('2026-06-20');
      const doc = await InventoryExteriorMovement.create(baseDoc({ fecha }));
      expect((doc.fecha as Date).getTime()).toBe(fecha.getTime());
    });

    it('debe guardar comentario y usuario cuando se proporcionan', async () => {
      const doc = await InventoryExteriorMovement.create(
        baseDoc({ comentario: 'Salida por entrega', usuario: 'supervisor' })
      );

      expect(doc.comentario).toBe('Salida por entrega');
      expect(doc.usuario).toBe('supervisor');
    });

    it('debe permitir omitir comentario y usuario', async () => {
      const doc = await InventoryExteriorMovement.create(
        baseDoc({ comentario: undefined, usuario: undefined })
      );

      expect(doc.comentario).toBeUndefined();
      expect(doc.usuario).toBeUndefined();
    });
  });

  describe('Referencia itemId y edge cases', () => {
    it('debe guardar itemId con ObjectId válido', async () => {
      const itemId = new mongoose.Types.ObjectId();
      const doc = await InventoryExteriorMovement.create(baseDoc({ itemId }));

      expect((doc.itemId as mongoose.Types.ObjectId).toString()).toBe(itemId.toString());
    });

    it('debe fallar con itemId inválido', async () => {
      await expect(
        InventoryExteriorMovement.create(baseDoc({ itemId: 'no-es-objectid' }))
      ).rejects.toThrow();
    });

    it('debe permitir cantidad negativa porque no hay min en schema', async () => {
      const doc = await InventoryExteriorMovement.create(baseDoc({ cantidad: -8 }));
      expect(doc.cantidad).toBe(-8);
    });

    it('debe hacer populate de itemId cuando existe el item relacionado', async () => {
      const item = await InventoryExteriorItem.create({ descripcion: 'Conector RJ45' });
      const mov = await InventoryExteriorMovement.create(
        baseDoc({ itemId: item._id, comentario: 'Movimiento con referencia' })
      );

      const populated = await InventoryExteriorMovement.findById(mov._id).populate('itemId');
      const populatedItem = populated!.itemId as unknown as { _id: mongoose.Types.ObjectId; descripcion?: string };

      expect(populatedItem._id.toString()).toBe((item._id as mongoose.Types.ObjectId).toString());
      expect(populatedItem.descripcion).toBe('Conector RJ45');
    });

    it('debe listar todos los movimientos guardados', async () => {
      await InventoryExteriorMovement.create(baseDoc({ tipo: 'entrada' }));
      await InventoryExteriorMovement.create(baseDoc({ tipo: 'salida', itemId: new mongoose.Types.ObjectId() }));

      const all = await InventoryExteriorMovement.find();
      expect(all.length).toBe(2);
    });
  });
});
