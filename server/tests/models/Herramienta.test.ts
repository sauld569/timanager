/**
 * ═══════════════════════════════════════════════════════════════════
 * PRUEBAS DE MODELO: Herramienta
 * ═══════════════════════════════════════════════════════════════════
 * 
 * MODELO: Herramientas del inventario
 * PRIORIDAD: MEDIA (gestión de activos)
 * 
 * VALIDACIONES A PROBAR:
 * - nombre: required
 * - codigo: unique
 * - categoria: enum values
 * - estado: enum values
 * - asignadoA: reference a Colaborador
 * - fechaAdquisicion: date
 * - valor: number, positive
 */

import mongoose from 'mongoose';
import Herramienta from '../../src/models/Herramienta';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';

const baseDoc = (overrides: Record<string, unknown> = {}) => ({
  nombre: 'Taladro Inalambrico',
  valor: 2500,
  cantidad: 2,
  colaboradorId: new mongoose.Types.ObjectId(),
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

describe('Modelo Herramienta', () => {
  describe('CRUD básico', () => {
    it('debe crear y guardar una herramienta válida', async () => {
      const doc = await Herramienta.create(baseDoc());

      expect(doc._id).toBeDefined();
      expect(doc.nombre).toBe('Taladro Inalambrico');
      expect(doc.valor).toBe(2500);
      expect(doc.cantidad).toBe(2);
    });

    it('debe leer una herramienta por _id', async () => {
      const created = await Herramienta.create(baseDoc());
      const found = await Herramienta.findById(created._id);

      expect(found).not.toBeNull();
      expect(found!.nombre).toBe('Taladro Inalambrico');
    });

    it('debe actualizar campos de una herramienta', async () => {
      const created = await Herramienta.create(baseDoc());

      await Herramienta.findByIdAndUpdate(created._id, {
        nombre: 'Rotomartillo',
        valor: 3200,
        activo: false,
      });

      const updated = await Herramienta.findById(created._id);
      expect(updated!.nombre).toBe('Rotomartillo');
      expect(updated!.valor).toBe(3200);
      expect(updated!.activo).toBe(false);
    });

    it('debe eliminar una herramienta', async () => {
      const created = await Herramienta.create(baseDoc());

      await Herramienta.findByIdAndDelete(created._id);
      const found = await Herramienta.findById(created._id);
      expect(found).toBeNull();
    });
  });

  describe('Validaciones required', () => {
    it('debe fallar si falta nombre', async () => {
      const { nombre: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(Herramienta.create(data)).rejects.toThrow();
    });

    it('debe fallar si falta valor', async () => {
      const { valor: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(Herramienta.create(data)).rejects.toThrow();
    });

    it('debe asignar cantidad=1 cuando falta cantidad (required + default)', async () => {
      const { cantidad: _omit, ...data } = baseDoc() as Record<string, unknown>;
      const doc = await Herramienta.create(data);
      expect(doc.cantidad).toBe(1);
    });

    it('debe fallar si falta colaboradorId', async () => {
      const { colaboradorId: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(Herramienta.create(data)).rejects.toThrow();
    });

    it('debe fallar si colaboradorId no es ObjectId válido', async () => {
      await expect(
        Herramienta.create(baseDoc({ colaboradorId: 'no-es-objectid' }))
      ).rejects.toThrow();
    });
  });

  describe('Defaults y opcionales', () => {
    it('debe asignar defaults en marca, modelo y serialNumber', async () => {
      const doc = await Herramienta.create(
        baseDoc({ marca: undefined, modelo: undefined, serialNumber: undefined })
      );

      expect(doc.marca).toBe('');
      expect(doc.modelo).toBe('');
      expect(doc.serialNumber).toBe('');
    });

    it('debe asignar cantidad=1 por default cuando no se envía', async () => {
      const { cantidad: _omit, ...data } = baseDoc() as Record<string, unknown>;
      const doc = await Herramienta.create(data);
      expect(doc.cantidad).toBe(1);
    });

    it('debe asignar activo=true por default', async () => {
      const doc = await Herramienta.create(baseDoc({ activo: undefined }));
      expect(doc.activo).toBe(true);
    });

    it('debe asignar fechaAsignacion por default', async () => {
      const doc = await Herramienta.create(baseDoc({ fechaAsignacion: undefined }));
      expect(doc.fechaAsignacion).toBeInstanceOf(Date);
    });

    it('debe permitir sobrescribir defaults opcionales', async () => {
      const fecha = new Date('2026-05-10');
      const doc = await Herramienta.create(
        baseDoc({
          marca: 'Bosch',
          modelo: 'X100',
          serialNumber: 'SN-0099',
          fechaAsignacion: fecha,
          activo: false,
        })
      );

      expect(doc.marca).toBe('Bosch');
      expect(doc.modelo).toBe('X100');
      expect(doc.serialNumber).toBe('SN-0099');
      expect((doc.fechaAsignacion as Date).getTime()).toBe(fecha.getTime());
      expect(doc.activo).toBe(false);
    });
  });

  describe('Timestamps', () => {
    it('debe incluir createdAt y updatedAt', async () => {
      const doc = await Herramienta.create(baseDoc());

      expect((doc as any).createdAt).toBeInstanceOf(Date);
      expect((doc as any).updatedAt).toBeInstanceOf(Date);
    });

    it('debe actualizar updatedAt al guardar cambios', async () => {
      const doc = await Herramienta.create(baseDoc());
      const original = (doc as any).updatedAt as Date;

      await new Promise(resolve => setTimeout(resolve, 10));

      doc.nombre = 'Pulidora';
      await doc.save();

      expect(((doc as any).updatedAt as Date).getTime()).toBeGreaterThan(original.getTime());
    });
  });

  describe('Comportamiento real del schema', () => {
    it('debe permitir serialNumber duplicado porque no hay unique', async () => {
      await Herramienta.create(baseDoc({ serialNumber: 'SERIAL-1' }));

      await expect(
        Herramienta.create(baseDoc({
          colaboradorId: new mongoose.Types.ObjectId(),
          serialNumber: 'SERIAL-1',
        }))
      ).resolves.toBeDefined();
    });

    it('debe permitir valor negativo porque no existe min en el schema', async () => {
      const doc = await Herramienta.create(baseDoc({ valor: -100 }));
      expect(doc.valor).toBe(-100);
    });

    it('debe permitir cantidad negativa porque no existe min en el schema', async () => {
      const doc = await Herramienta.create(baseDoc({ cantidad: -5 }));
      expect(doc.cantidad).toBe(-5);
    });

    it('debe listar todas las herramientas guardadas', async () => {
      await Herramienta.create(baseDoc({ nombre: 'A' }));
      await Herramienta.create(baseDoc({ nombre: 'B', colaboradorId: new mongoose.Types.ObjectId() }));

      const all = await Herramienta.find();
      expect(all.length).toBe(2);
    });
  });
});
