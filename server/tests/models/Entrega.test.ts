/**
 * ═══════════════════════════════════════════════════════════════════
 * PRUEBAS DE MODELO: Entrega
 * ═══════════════════════════════════════════════════════════════════
 * 
 * MODELO: Entregas de productos/servicios
 * PRIORIDAD: MEDIA (logística)
 * 
 * VALIDACIONES A PROBAR:
 * - ordenCompra: reference a OrdenCompra
 * - proyecto: reference a Proyecto
 * - fechaEntrega: date, required
 * - items: array no vacío
 * - estado: enum values
 * - recibidoPor: string/reference
 * - evidencia: file path
 */

import mongoose from 'mongoose';
import Entrega from '../../src/models/Entrega';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';

const baseItem = (overrides: Record<string, unknown> = {}) => ({
  clave: 1,
  concepto: 'Canaleta PVC',
  cantidad: 10,
  unidad: 'PZA',
  ...overrides,
});

const baseDoc = (overrides: Record<string, unknown> = {}) => ({
  numeroEntrega: 'ENT-001',
  cliente: 'Cliente Demo',
  items: [baseItem()],
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

describe('Modelo Entrega', () => {
  describe('CRUD básico', () => {
    it('debe crear y guardar una entrega válida', async () => {
      const doc = await Entrega.create(baseDoc());

      expect(doc._id).toBeDefined();
      expect(doc.numeroEntrega).toBe('ENT-001');
      expect(doc.cliente).toBe('Cliente Demo');
      expect(doc.items).toHaveLength(1);
    });

    it('debe leer una entrega por _id', async () => {
      const created = await Entrega.create(baseDoc());
      const found = await Entrega.findById(created._id);

      expect(found).not.toBeNull();
      expect(found!.numeroEntrega).toBe('ENT-001');
    });

    it('debe actualizar una entrega', async () => {
      const created = await Entrega.create(baseDoc());

      await Entrega.findByIdAndUpdate(created._id, {
        cliente: 'Cliente Actualizado',
        comentarios: 'Entrega parcial',
      });

      const updated = await Entrega.findById(created._id);
      expect(updated!.cliente).toBe('Cliente Actualizado');
      expect(updated!.comentarios).toBe('Entrega parcial');
    });

    it('debe eliminar una entrega', async () => {
      const created = await Entrega.create(baseDoc());

      await Entrega.findByIdAndDelete(created._id);
      const found = await Entrega.findById(created._id);

      expect(found).toBeNull();
    });
  });

  describe('Validaciones required y unique', () => {
    it('debe fallar si falta numeroEntrega', async () => {
      const { numeroEntrega: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(Entrega.create(data)).rejects.toThrow();
    });

    it('debe fallar si falta cliente', async () => {
      const { cliente: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(Entrega.create(data)).rejects.toThrow();
    });

    it('debe rechazar numeroEntrega duplicado', async () => {
      await Entrega.create(baseDoc({ numeroEntrega: 'ENT-DUP' }));

      await expect(
        Entrega.create(baseDoc({ numeroEntrega: 'ENT-DUP', cliente: 'Otro Cliente' }))
      ).rejects.toThrow();
    });

    it('debe permitir numeroEntrega distintos', async () => {
      const a = await Entrega.create(baseDoc({ numeroEntrega: 'ENT-A' }));
      const b = await Entrega.create(baseDoc({ numeroEntrega: 'ENT-B' }));

      expect((a._id as mongoose.Types.ObjectId).toString()).not.toBe(
        (b._id as mongoose.Types.ObjectId).toString()
      );
    });
  });

  describe('Subdocumento items', () => {
    it('debe crear entrega con multiples items válidos', async () => {
      const doc = await Entrega.create(
        baseDoc({
          items: [
            baseItem({ clave: 1, concepto: 'Canaleta', cantidad: 3, unidad: 'PZA' }),
            baseItem({ clave: 2, concepto: 'Cable UTP', cantidad: 50, unidad: 'MTS' }),
            baseItem({ clave: 3, concepto: 'Instalación', cantidad: 1, unidad: 'SERV' }),
          ],
        })
      );

      expect(doc.items).toHaveLength(3);
      expect(doc.items[1].unidad).toBe('MTS');
    });

    it('debe rechazar item sin clave', async () => {
      const { clave: _omit, ...item } = baseItem() as Record<string, unknown>;
      await expect(Entrega.create(baseDoc({ items: [item] }))).rejects.toThrow();
    });

    it('debe rechazar item sin concepto', async () => {
      const { concepto: _omit, ...item } = baseItem() as Record<string, unknown>;
      await expect(Entrega.create(baseDoc({ items: [item] }))).rejects.toThrow();
    });

    it('debe rechazar item con cantidad negativa', async () => {
      await expect(
        Entrega.create(baseDoc({ items: [baseItem({ cantidad: -1 })] }))
      ).rejects.toThrow();
    });

    it('debe aceptar cantidad 0 por min:0', async () => {
      const doc = await Entrega.create(baseDoc({ items: [baseItem({ cantidad: 0 })] }));
      expect(doc.items[0].cantidad).toBe(0);
    });

    it('debe aceptar todas las unidades válidas del enum', async () => {
      const unidades = ['PZA', 'MTS', 'SERV', 'LOTE'] as const;

      for (let i = 0; i < unidades.length; i++) {
        const doc = await Entrega.create(
          baseDoc({
            numeroEntrega: `ENT-UNI-${i}`,
            items: [baseItem({ clave: i + 1, unidad: unidades[i] })],
          })
        );

        expect(doc.items[0].unidad).toBe(unidades[i]);
        await Entrega.findByIdAndDelete(doc._id);
      }
    });

    it('debe rechazar unidad fuera del enum', async () => {
      await expect(
        Entrega.create(baseDoc({ items: [baseItem({ unidad: 'KG' })] }))
      ).rejects.toThrow();
    });

    it('debe permitir inventarioItemId opcional', async () => {
      const invId = new mongoose.Types.ObjectId();
      const doc = await Entrega.create(
        baseDoc({
          items: [baseItem({ inventarioItemId: invId })],
        })
      );

      expect((doc.items[0].inventarioItemId as mongoose.Types.ObjectId).toString()).toBe(invId.toString());
    });

    it('debe permitir item sin inventarioItemId', async () => {
      const doc = await Entrega.create(baseDoc({ items: [baseItem()] }));
      expect(doc.items[0].concepto).toBe('Canaleta PVC');
    });
  });

  describe('Defaults y opcionales del documento', () => {
    it('debe asignar fecha por default', async () => {
      const doc = await Entrega.create(baseDoc());
      expect(doc.fecha).toBeInstanceOf(Date);
    });

    it('debe asignar fechaCreacion y fechaActualizacion por default', async () => {
      const doc = await Entrega.create(baseDoc());
      expect(doc.fechaCreacion).toBeInstanceOf(Date);
      expect(doc.fechaActualizacion).toBeInstanceOf(Date);
    });

    it('debe asignar ultimaClave=0 por default', async () => {
      const doc = await Entrega.create(baseDoc());
      expect(doc.ultimaClave).toBe(0);
    });

    it('debe permitir establecer ultimaClave manualmente', async () => {
      const doc = await Entrega.create(baseDoc({ ultimaClave: 8 }));
      expect(doc.ultimaClave).toBe(8);
    });

    it('debe permitir comentarios, razonSocial y proyecto opcionales', async () => {
      const razonSocialId = new mongoose.Types.ObjectId();
      const proyectoId = new mongoose.Types.ObjectId();

      const doc = await Entrega.create(
        baseDoc({
          comentarios: 'Entrega completa',
          razonSocial: razonSocialId,
          proyecto: proyectoId,
        })
      );

      expect(doc.comentarios).toBe('Entrega completa');
      expect((doc.razonSocial as unknown as mongoose.Types.ObjectId).toString()).toBe(razonSocialId.toString());
      expect((doc.proyecto as unknown as mongoose.Types.ObjectId).toString()).toBe(proyectoId.toString());
    });
  });

  describe('Edge cases', () => {
    it('debe aplicar trim a numeroEntrega y cliente', async () => {
      const doc = await Entrega.create(
        baseDoc({
          numeroEntrega: '  ENT-TRIM  ',
          cliente: '  Cliente Trim  ',
        })
      );

      expect(doc.numeroEntrega).toBe('ENT-TRIM');
      expect(doc.cliente).toBe('Cliente Trim');
    });

    it('debe aplicar trim a concepto en items', async () => {
      const doc = await Entrega.create(
        baseDoc({
          items: [baseItem({ concepto: '  Concepto con espacios  ' })],
        })
      );

      expect(doc.items[0].concepto).toBe('Concepto con espacios');
    });

    it('debe listar todas las entregas guardadas', async () => {
      await Entrega.create(baseDoc({ numeroEntrega: 'ENT-L1' }));
      await Entrega.create(baseDoc({ numeroEntrega: 'ENT-L2' }));

      const all = await Entrega.find();
      expect(all.length).toBe(2);
    });
  });
});
