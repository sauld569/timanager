/**
 * ═══════════════════════════════════════════════════════════════════
 * PRUEBAS DE MODELO: Counter
 * ═══════════════════════════════════════════════════════════════════
 * 
 * MODELO: Contadores auto-incrementales
 * PRIORIDAD: ALTA (integridad de folios)
 * 
 * VALIDACIONES A PROBAR:
 * - _id: unique identifier (nombre del contador)
 * - seq: number, auto-increment
 * - Concurrencia: múltiples incrementos simultáneos
 * - Atomicidad: findOneAndUpdate correctamente
 * - No duplicados: sequencialidad garantizada
 */

import mongoose from 'mongoose';
import Counter from '../../src/models/Counter';
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

describe('Modelo Counter', () => {
  // ── 1. CREACION Y DEFAULTS ─────────────────────────────────────────────────
  describe('Creacion y defaults', () => {
    it('debe crear un contador con _id y asignar sequence_value=45 por defecto', async () => {
      const counter = await Counter.create({ _id: 'colaboradorId' });

      expect(counter._id).toBe('colaboradorId');
      expect(counter.sequence_value).toBe(45);
    });

    it('debe permitir establecer sequence_value manualmente al crear', async () => {
      const counter = await Counter.create({ _id: 'ordenCompraId', sequence_value: 120 });

      expect(counter.sequence_value).toBe(120);
    });

    it('debe fallar si falta _id', async () => {
      await expect(Counter.create({ sequence_value: 10 })).rejects.toThrow();
    });
  });

  // ── 2. UNICIDAD DE _id ─────────────────────────────────────────────────────
  describe('Unicidad de _id', () => {
    it('debe rechazar dos documentos con el mismo _id', async () => {
      await Counter.create({ _id: 'clienteId' });

      await expect(Counter.create({ _id: 'clienteId' })).rejects.toThrow();
    });

    it('debe permitir multiples contadores con _id diferentes', async () => {
      const a = await Counter.create({ _id: 'A' });
      const b = await Counter.create({ _id: 'B' });
      const c = await Counter.create({ _id: 'C' });

      expect(a._id).toBe('A');
      expect(b._id).toBe('B');
      expect(c._id).toBe('C');
    });
  });

  // ── 3. PROCESO DE INCREMENTO (findByIdAndUpdate + $inc) ───────────────────
  describe('Proceso de incremento', () => {
    it('debe incrementar sequence_value con $inc', async () => {
      await Counter.create({ _id: 'folioActividad' });

      const updated = await Counter.findByIdAndUpdate(
        'folioActividad',
        { $inc: { sequence_value: 1 } },
        { new: true }
      );

      expect(updated).not.toBeNull();
      expect(updated!.sequence_value).toBe(46);
    });

    it('debe incrementar de forma acumulativa en multiples operaciones', async () => {
      await Counter.create({ _id: 'folioProyecto' });

      await Counter.findByIdAndUpdate('folioProyecto', { $inc: { sequence_value: 1 } }, { new: true });
      await Counter.findByIdAndUpdate('folioProyecto', { $inc: { sequence_value: 3 } }, { new: true });
      await Counter.findByIdAndUpdate('folioProyecto', { $inc: { sequence_value: 6 } }, { new: true });

      const final = await Counter.findById('folioProyecto');
      expect(final!.sequence_value).toBe(55);
    });

    it('debe devolver el documento actualizado al usar { new: true }', async () => {
      await Counter.create({ _id: 'folioCotizacion' });

      const updated = await Counter.findByIdAndUpdate(
        'folioCotizacion',
        { $inc: { sequence_value: 5 } },
        { new: true }
      );

      expect(updated!.sequence_value).toBe(50);
    });

    it('debe soportar upsert cuando el contador no existe', async () => {
      const updated = await Counter.findByIdAndUpdate(
        'folioNuevo',
        { $inc: { sequence_value: 1 } },
        { upsert: true, new: true }
      );

      expect(updated).not.toBeNull();
      // Con upsert + $inc, Mongo inicializa el campo en 0 y luego incrementa
      expect(updated!.sequence_value).toBe(1);
    });
  });

  // ── 4. ATOMICIDAD Y CONCURRENCIA ───────────────────────────────────────────
  describe('Atomicidad y concurrencia', () => {
    it('debe procesar incrementos simultaneos sin duplicar secuencias', async () => {
      await Counter.create({ _id: 'concurrenteA' });

      const ops = Array.from({ length: 10 }).map(() =>
        Counter.findByIdAndUpdate(
          'concurrenteA',
          { $inc: { sequence_value: 1 } },
          { new: true }
        )
      );

      const results = await Promise.all(ops);
      const values = results
        .map(doc => doc?.sequence_value)
        .filter((v): v is number => typeof v === 'number')
        .sort((x, y) => x - y);

      expect(values).toHaveLength(10);
      expect(values[0]).toBe(46);
      expect(values[values.length - 1]).toBe(55);
      expect(new Set(values).size).toBe(10);
    });

    it('debe mantener secuencias independientes por cada _id', async () => {
      await Counter.create({ _id: 'secuenciaX' });
      await Counter.create({ _id: 'secuenciaY' });

      await Promise.all([
        Counter.findByIdAndUpdate('secuenciaX', { $inc: { sequence_value: 2 } }, { new: true }),
        Counter.findByIdAndUpdate('secuenciaY', { $inc: { sequence_value: 7 } }, { new: true })
      ]);

      const x = await Counter.findById('secuenciaX');
      const y = await Counter.findById('secuenciaY');

      expect(x!.sequence_value).toBe(47);
      expect(y!.sequence_value).toBe(52);
    });

    it('debe crear un solo documento bajo concurrencia con upsert sobre el mismo _id', async () => {
      const ops = Array.from({ length: 20 }).map(() =>
        Counter.findByIdAndUpdate(
          'upsertConcurrente',
          { $inc: { sequence_value: 1 } },
          { upsert: true, new: true }
        )
      );

      await Promise.all(ops);

      const docs = await Counter.find({ _id: 'upsertConcurrente' });
      expect(docs).toHaveLength(1);
      expect(docs[0].sequence_value).toBe(20);
    });
  });

  // ── 5. CONSULTAS Y BORRADO ─────────────────────────────────────────────────
  describe('Consultas y borrado', () => {
    it('debe encontrar un contador por _id', async () => {
      await Counter.create({ _id: 'buscarme', sequence_value: 88 });

      const found = await Counter.findById('buscarme');
      expect(found).not.toBeNull();
      expect(found!.sequence_value).toBe(88);
    });

    it('debe eliminar un contador y no encontrarlo despues', async () => {
      await Counter.create({ _id: 'eliminarme' });

      await Counter.findByIdAndDelete('eliminarme');
      const found = await Counter.findById('eliminarme');
      expect(found).toBeNull();
    });
  });
});
