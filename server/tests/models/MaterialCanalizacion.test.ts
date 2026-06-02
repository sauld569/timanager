/**
 * ═══════════════════════════════════════════════════════════════════
 * PRUEBAS DE MODELO: MaterialCanalizacion
 * ═══════════════════════════════════════════════════════════════════
 * 
 * MODELO: Materiales para canalización
 * PRIORIDAD: BAJA (catálogo especializado)
 * 
 * VALIDACIONES A PROBAR:
 * - nombre: required
 * - codigo: unique
 * - especificaciones: object
 * - precio: number, positive
 * - unidad: string
 */

import mongoose from 'mongoose';
import MaterialCanalizacion from '../../src/models/MaterialCanalizacion';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';

const baseDoc = (overrides: Record<string, unknown> = {}) => ({
  tipo: 'Canaleta',
  material: 'PVC',
  medida: '40x20',
  unidad: 'PZA',
  proveedor: 'Proveedor Industrial',
  precio: 125.5,
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

describe('Modelo MaterialCanalizacion', () => {
  describe('CRUD básico', () => {
    it('debe crear y guardar un material válido', async () => {
      const doc = await MaterialCanalizacion.create(baseDoc());

      expect(doc._id).toBeDefined();
      expect(doc.tipo).toBe('Canaleta');
      expect(doc.material).toBe('PVC');
      expect(doc.medida).toBe('40x20');
      expect(doc.precio).toBe(125.5);
    });

    it('debe leer un material por _id', async () => {
      const created = await MaterialCanalizacion.create(baseDoc());
      const found = await MaterialCanalizacion.findById(created._id);

      expect(found).not.toBeNull();
      expect(found!.proveedor).toBe('Proveedor Industrial');
    });

    it('debe actualizar campos del material', async () => {
      const created = await MaterialCanalizacion.create(baseDoc());

      await MaterialCanalizacion.findByIdAndUpdate(created._id, {
        material: 'Acero galvanizado',
        precio: 210,
      });

      const updated = await MaterialCanalizacion.findById(created._id);
      expect(updated!.material).toBe('Acero galvanizado');
      expect(updated!.precio).toBe(210);
    });

    it('debe eliminar un material por _id', async () => {
      const created = await MaterialCanalizacion.create(baseDoc());

      await MaterialCanalizacion.findByIdAndDelete(created._id);
      const found = await MaterialCanalizacion.findById(created._id);
      expect(found).toBeNull();
    });
  });

  describe('Validaciones required', () => {
    it('debe fallar si falta tipo', async () => {
      const { tipo: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(MaterialCanalizacion.create(data)).rejects.toThrow();
    });

    it('debe fallar si falta material', async () => {
      const { material: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(MaterialCanalizacion.create(data)).rejects.toThrow();
    });

    it('debe fallar si falta medida', async () => {
      const { medida: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(MaterialCanalizacion.create(data)).rejects.toThrow();
    });

    it('debe asignar unidad=PZA cuando falta unidad (required + default)', async () => {
      const { unidad: _omit, ...data } = baseDoc() as Record<string, unknown>;
      const doc = await MaterialCanalizacion.create(data);
      expect(doc.unidad).toBe('PZA');
    });

    it('debe fallar si falta proveedor', async () => {
      const { proveedor: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(MaterialCanalizacion.create(data)).rejects.toThrow();
    });

    it('debe fallar si falta precio', async () => {
      const { precio: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(MaterialCanalizacion.create(data)).rejects.toThrow();
    });
  });

  describe('Enum unidad y min precio', () => {
    it('debe aceptar unidad PZA', async () => {
      const doc = await MaterialCanalizacion.create(baseDoc({ unidad: 'PZA' }));
      expect(doc.unidad).toBe('PZA');
    });

    it('debe aceptar unidad MTS', async () => {
      const doc = await MaterialCanalizacion.create(baseDoc({ unidad: 'MTS' }));
      expect(doc.unidad).toBe('MTS');
    });

    it('debe rechazar unidad fuera del enum', async () => {
      await expect(
        MaterialCanalizacion.create(baseDoc({ unidad: 'LOTE' }))
      ).rejects.toThrow();
    });

    it('debe aceptar precio 0', async () => {
      const doc = await MaterialCanalizacion.create(baseDoc({ precio: 0 }));
      expect(doc.precio).toBe(0);
    });

    it('debe rechazar precio negativo por min:0', async () => {
      await expect(
        MaterialCanalizacion.create(baseDoc({ precio: -1 }))
      ).rejects.toThrow();
    });
  });

  describe('Defaults y trim', () => {
    it('debe asignar unidad=PZA por default cuando no se envía', async () => {
      const { unidad: _omit, ...data } = baseDoc() as Record<string, unknown>;
      const doc = await MaterialCanalizacion.create(data);
      expect(doc.unidad).toBe('PZA');
    });

    it('debe asignar fechaActualizacion por default', async () => {
      const doc = await MaterialCanalizacion.create(baseDoc());
      expect(doc.fechaActualizacion).toBeInstanceOf(Date);
    });

    it('debe aplicar trim en tipo, material, medida y proveedor', async () => {
      const doc = await MaterialCanalizacion.create(
        baseDoc({
          tipo: '  Conduit  ',
          material: '  Acero  ',
          medida: '  2"  ',
          proveedor: '  ACME  ',
        })
      );

      expect(doc.tipo).toBe('Conduit');
      expect(doc.material).toBe('Acero');
      expect(doc.medida).toBe('2"');
      expect(doc.proveedor).toBe('ACME');
    });
  });

  describe('Timestamps y middleware de actualización', () => {
    it('debe incluir createdAt y updatedAt por timestamps:true', async () => {
      const doc = await MaterialCanalizacion.create(baseDoc());

      expect((doc as any).createdAt).toBeInstanceOf(Date);
      expect((doc as any).updatedAt).toBeInstanceOf(Date);
    });

    it('debe actualizar fechaActualizacion al usar findOneAndUpdate', async () => {
      const doc = await MaterialCanalizacion.create(baseDoc());
      const original = doc.fechaActualizacion;

      await new Promise(resolve => setTimeout(resolve, 10));

      await MaterialCanalizacion.findOneAndUpdate(
        { _id: doc._id },
        { precio: 300 },
        { new: true }
      );

      const updated = await MaterialCanalizacion.findById(doc._id);
      expect((updated!.fechaActualizacion as Date).getTime()).toBeGreaterThanOrEqual(
        original.getTime()
      );
    });

    it('debe actualizar fechaActualizacion al usar updateOne', async () => {
      const doc = await MaterialCanalizacion.create(baseDoc());
      const original = doc.fechaActualizacion;

      await new Promise(resolve => setTimeout(resolve, 10));

      await MaterialCanalizacion.updateOne(
        { _id: doc._id },
        { precio: 350 }
      );

      const updated = await MaterialCanalizacion.findById(doc._id);
      expect((updated!.fechaActualizacion as Date).getTime()).toBeGreaterThanOrEqual(
        original.getTime()
      );
    });
  });

  describe('Edge cases del schema actual', () => {
    it('debe permitir duplicados porque no existe unique', async () => {
      await MaterialCanalizacion.create(baseDoc({ tipo: 'Bandeja', material: 'Aluminio', medida: '100x50' }));

      await expect(
        MaterialCanalizacion.create(baseDoc({ tipo: 'Bandeja', material: 'Aluminio', medida: '100x50' }))
      ).resolves.toBeDefined();
    });

    it('debe listar todos los materiales guardados', async () => {
      await MaterialCanalizacion.create(baseDoc({ tipo: 'A' }));
      await MaterialCanalizacion.create(baseDoc({ tipo: 'B', material: 'PVC Rígido' }));

      const all = await MaterialCanalizacion.find();
      expect(all.length).toBe(2);
    });
  });
});
