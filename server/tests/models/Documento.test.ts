/**
 * ═══════════════════════════════════════════════════════════════════
 * PRUEBAS DE MODELO: Documento
 * ═══════════════════════════════════════════════════════════════════
 * 
 * MODELO: Documentos del sistema
 * PRIORIDAD: MEDIA (gestión documental)
 * 
 * VALIDACIONES A PROBAR:
 * - titulo: required
 * - tipo: enum values
 * - archivo: required, file path validation
 * - fechaSubida: date, auto-generated
 * - subidoPor: reference a User
 * - proyecto: reference a Proyecto (opcional)
 * - tamaño: number, positive
 */

import mongoose from 'mongoose';
import Documento from '../../src/models/Documento';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';

const baseDoc = (overrides: Record<string, unknown> = {}) => ({
  nombre: 'INE Frente',
  url: '/uploads/documentos/ine-frente.pdf',
  colaboradorId: new mongoose.Types.ObjectId(),
  tipo: 'pdf',
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

describe('Modelo Documento', () => {
  // ── 1. CRUD BASICO ─────────────────────────────────────────────────────────
  describe('CRUD básico', () => {
    it('debe crear y guardar un documento válido', async () => {
      const doc = await Documento.create(baseDoc());

      expect(doc._id).toBeDefined();
      expect(doc.nombre).toBe('INE Frente');
      expect(doc.url).toBe('/uploads/documentos/ine-frente.pdf');
      expect((doc.colaboradorId as mongoose.Types.ObjectId).toString()).toBeDefined();
      expect(doc.tipo).toBe('pdf');
    });

    it('debe leer un documento por _id', async () => {
      const created = await Documento.create(baseDoc());
      const found = await Documento.findById(created._id);

      expect(found).not.toBeNull();
      expect(found!.nombre).toBe('INE Frente');
    });

    it('debe actualizar nombre y tipo de un documento', async () => {
      const created = await Documento.create(baseDoc());

      await Documento.findByIdAndUpdate(created._id, {
        nombre: 'Pasaporte',
        tipo: 'image',
      });

      const updated = await Documento.findById(created._id);
      expect(updated!.nombre).toBe('Pasaporte');
      expect(updated!.tipo).toBe('image');
    });

    it('debe eliminar un documento por _id', async () => {
      const created = await Documento.create(baseDoc());

      await Documento.findByIdAndDelete(created._id);
      const found = await Documento.findById(created._id);
      expect(found).toBeNull();
    });
  });

  // ── 2. VALIDACIONES REQUIRED ───────────────────────────────────────────────
  describe('Validaciones required', () => {
    it('debe fallar si falta nombre', async () => {
      const { nombre: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(Documento.create(data)).rejects.toThrow();
    });

    it('debe fallar si falta url', async () => {
      const { url: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(Documento.create(data)).rejects.toThrow();
    });

    it('debe fallar si falta colaboradorId', async () => {
      const { colaboradorId: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(Documento.create(data)).rejects.toThrow();
    });

    it('debe fallar si falta tipo', async () => {
      const { tipo: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(Documento.create(data)).rejects.toThrow();
    });

    it('debe fallar si colaboradorId no es ObjectId válido', async () => {
      await expect(
        Documento.create(baseDoc({ colaboradorId: 'no-es-objectid' }))
      ).rejects.toThrow();
    });
  });

  // ── 3. ENUM tipo ───────────────────────────────────────────────────────────
  describe('Enum tipo', () => {
    it('debe aceptar tipo "pdf"', async () => {
      const doc = await Documento.create(baseDoc({ tipo: 'pdf' }));
      expect(doc.tipo).toBe('pdf');
    });

    it('debe aceptar tipo "image"', async () => {
      const doc = await Documento.create(baseDoc({ tipo: 'image' }));
      expect(doc.tipo).toBe('image');
    });

    it('debe rechazar tipos fuera del enum', async () => {
      await expect(
        Documento.create(baseDoc({ tipo: 'docx' }))
      ).rejects.toThrow();
    });
  });

  // ── 4. AUTO-INCREMENTO documentoId ─────────────────────────────────────────
  describe('Auto-incremento documentoId', () => {
    it('debe asignar documentoId=1 al primer documento', async () => {
      const doc = await Documento.create(baseDoc());
      expect(doc.documentoId).toBe(1);
    });

    it('debe asignar documentoId secuencial al crear múltiples documentos', async () => {
      const a = await Documento.create(baseDoc({ nombre: 'Doc A' }));
      const b = await Documento.create(baseDoc({ nombre: 'Doc B', url: '/b.pdf' }));
      const c = await Documento.create(baseDoc({ nombre: 'Doc C', url: '/c.pdf' }));

      expect(a.documentoId).toBe(1);
      expect(b.documentoId).toBe(2);
      expect(c.documentoId).toBe(3);
    });

    it('debe sobrescribir documentoId manual cuando el documento es nuevo', async () => {
      const doc = await Documento.create(baseDoc({ documentoId: 999 }));
      expect(doc.documentoId).toBe(1);
    });

    it('no debe recalcular documentoId al actualizar un documento existente', async () => {
      const doc = await Documento.create(baseDoc());
      const originalId = doc.documentoId;

      doc.nombre = 'Actualizado';
      await doc.save();

      expect(doc.documentoId).toBe(originalId);
      expect(doc.documentoId).toBe(1);
    });
  });

  // ── 5. FECHAS Y TIMESTAMPS ─────────────────────────────────────────────────
  describe('Fechas y timestamps', () => {
    it('debe asignar fechaSubida por default', async () => {
      const doc = await Documento.create(baseDoc());
      expect(doc.fechaSubida).toBeInstanceOf(Date);
    });

    it('debe permitir fechaVencimiento opcional', async () => {
      const vigencia = new Date('2027-01-01');
      const doc = await Documento.create(baseDoc({ fechaVencimiento: vigencia }));
      expect(doc.fechaVencimiento).toEqual(vigencia);
    });

    it('debe incluir createdAt y updatedAt', async () => {
      const doc = await Documento.create(baseDoc());
      expect((doc as any).createdAt).toBeInstanceOf(Date);
      expect((doc as any).updatedAt).toBeInstanceOf(Date);
    });

    it('debe actualizar updatedAt al guardar cambios', async () => {
      const doc = await Documento.create(baseDoc());
      const updatedAtOriginal = (doc as any).updatedAt as Date;

      await new Promise(resolve => setTimeout(resolve, 10));

      doc.url = '/uploads/documentos/ine-reverso.pdf';
      await doc.save();

      expect(((doc as any).updatedAt as Date).getTime()).toBeGreaterThan(updatedAtOriginal.getTime());
    });
  });

  // ── 6. EDGE CASES ──────────────────────────────────────────────────────────
  describe('Edge cases', () => {
    it('debe permitir URLs repetidas porque no existe unique en url', async () => {
      await Documento.create(baseDoc({ nombre: 'Doc 1', url: '/shared.pdf' }));

      await expect(
        Documento.create(baseDoc({
          nombre: 'Doc 2',
          colaboradorId: new mongoose.Types.ObjectId(),
          url: '/shared.pdf',
        }))
      ).resolves.toBeDefined();
    });

    it('debe fallar en insertMany sin documentoId porque no corre pre(save)', async () => {
      await expect(
        Documento.insertMany([
          baseDoc({ nombre: 'Lote 1', url: '/l1.pdf' }),
          baseDoc({ nombre: 'Lote 2', url: '/l2.pdf' }),
        ])
      ).rejects.toThrow();
    });

    it('debe listar todos los documentos guardados', async () => {
      await Documento.create(baseDoc({ nombre: 'A', url: '/a.pdf' }));
      await Documento.create(baseDoc({ nombre: 'B', url: '/b.pdf', colaboradorId: new mongoose.Types.ObjectId() }));

      const all = await Documento.find();
      expect(all.length).toBe(2);
    });
  });
});
