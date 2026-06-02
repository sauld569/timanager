/**
 * ═══════════════════════════════════════════════════════════════════
 * PRUEBAS DE MODELO: CotizacionCanalizacion
 * ═══════════════════════════════════════════════════════════════════
 *
 * COBERTURA:
 *  1. CRUD básico
 *  2. Validaciones de campos requeridos
 *  3. Restricción unique en numeroPresupuesto
 *  4. Enums y valores por defecto
 *  5. Subdocumento items (validaciones y campo opcional materialCanalizacion)
 *  6. Método calcularTotales() — llamada manual
 *  7. Middleware pre('save') — auto-cálculo de totales
 *  8. Cálculo de utilidad: total = subtotal * (1 + utilidad / 100)
 *  9. Middleware pre('findOneAndUpdate') — actualiza fechaActualizacion
 * 10. Edge cases (trim, min:0, comentarios opcional, etc.)
 */

import mongoose from 'mongoose';
import CotizacionCanalizacion from '../../src/models/CotizacionCanalizacion';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';

// ── Helper para construir un documento mínimo válido ──────────────────────────
const baseDoc = (overrides: Record<string, unknown> = {}) => ({
  numeroPresupuesto: 'PRES-CANAL-001',
  cliente: 'Cliente Ejemplo S.A.',
  vigencia: new Date('2026-12-31'),
  ...overrides,
});

// ── Helper para un item de canalizacion válido ────────────────────────────────
const baseItem = (overrides: Record<string, unknown> = {}) => ({
  descripcion: 'Tubo conduit 1"',
  cantidad: 10,
  unidad: 'MTS',
  precioUnitario: 25,
  subtotal: 250,
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await connectDB();
});

afterAll(async () => {
  await disconnectDB();
});

beforeEach(async () => {
  await clearDB();
});

// =============================================================================
describe('Modelo CotizacionCanalizacion', () => {

  // ── 1. CRUD BÁSICO ──────────────────────────────────────────────────────────
  describe('CRUD básico', () => {
    it('debe crear y guardar una cotización mínima válida', async () => {
      const doc = await CotizacionCanalizacion.create(baseDoc());

      expect(doc._id).toBeDefined();
      expect(doc.numeroPresupuesto).toBe('PRES-CANAL-001');
      expect(doc.cliente).toBe('Cliente Ejemplo S.A.');
      expect(doc.vigencia).toBeInstanceOf(Date);
    });

    it('debe leer una cotización existente por _id', async () => {
      const created = await CotizacionCanalizacion.create(baseDoc());
      const found = await CotizacionCanalizacion.findById(created._id);

      expect(found).not.toBeNull();
      expect(found!.numeroPresupuesto).toBe('PRES-CANAL-001');
    });

    it('debe actualizar el campo cliente correctamente', async () => {
      const doc = await CotizacionCanalizacion.create(baseDoc());
      await CotizacionCanalizacion.findByIdAndUpdate(doc._id, { cliente: 'Nuevo Cliente' });
      const updated = await CotizacionCanalizacion.findById(doc._id);

      expect(updated!.cliente).toBe('Nuevo Cliente');
    });

    it('debe eliminar una cotización por _id', async () => {
      const doc = await CotizacionCanalizacion.create(baseDoc());
      await CotizacionCanalizacion.findByIdAndDelete(doc._id);
      const found = await CotizacionCanalizacion.findById(doc._id);

      expect(found).toBeNull();
    });
  });

  // ── 2. VALIDACIONES DE CAMPOS REQUERIDOS ────────────────────────────────────
  describe('Validaciones de campos requeridos', () => {
    it('debe fallar si falta numeroPresupuesto', async () => {
      const { numeroPresupuesto: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(CotizacionCanalizacion.create(data)).rejects.toThrow();
    });

    it('debe fallar si falta cliente', async () => {
      const { cliente: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(CotizacionCanalizacion.create(data)).rejects.toThrow();
    });

    it('debe fallar si falta vigencia', async () => {
      const { vigencia: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(CotizacionCanalizacion.create(data)).rejects.toThrow();
    });

    it('debe aceptar un documento sin comentarios (campo opcional)', async () => {
      const doc = await CotizacionCanalizacion.create(baseDoc());
      expect(doc.comentarios).toBeUndefined();
    });

    it('debe aceptar un documento sin razonSocial (campo opcional)', async () => {
      const doc = await CotizacionCanalizacion.create(baseDoc());
      expect(doc.razonSocial).toBeUndefined();
    });
  });

  // ── 3. UNIQUE EN numeroPresupuesto ──────────────────────────────────────────
  describe('Restricción unique en numeroPresupuesto', () => {
    it('debe rechazar dos cotizaciones con el mismo numeroPresupuesto', async () => {
      await CotizacionCanalizacion.create(baseDoc());
      await expect(
        CotizacionCanalizacion.create(baseDoc({ numeroPresupuesto: 'PRES-CANAL-001' }))
      ).rejects.toThrow();
    });

    it('debe permitir numeroPresupuesto distintos sin conflicto', async () => {
      const a = await CotizacionCanalizacion.create(baseDoc({ numeroPresupuesto: 'CANAL-A' }));
      const b = await CotizacionCanalizacion.create(baseDoc({ numeroPresupuesto: 'CANAL-B' }));

      expect((a._id as mongoose.Types.ObjectId).toString()).not.toBe(
        (b._id as mongoose.Types.ObjectId).toString()
      );
    });
  });

  // ── 4. ENUMS Y VALORES POR DEFECTO ──────────────────────────────────────────
  describe('Enums y valores por defecto', () => {
    it('debe asignar estado "Borrador" por defecto', async () => {
      const doc = await CotizacionCanalizacion.create(baseDoc());
      expect(doc.estado).toBe('Borrador');
    });

    it('debe aceptar todos los estados válidos', async () => {
      const estados = ['Borrador', 'Enviada', 'Aceptada', 'Rechazada', 'Vencida'] as const;

      for (const estado of estados) {
        const doc = await CotizacionCanalizacion.create(
          baseDoc({ numeroPresupuesto: `CANAL-${estado}`, estado })
        );
        expect(doc.estado).toBe(estado);
        await CotizacionCanalizacion.findByIdAndDelete(doc._id);
      }
    });

    it('debe rechazar un estado fuera del enum', async () => {
      await expect(
        CotizacionCanalizacion.create(baseDoc({ estado: 'Pendiente' }))
      ).rejects.toThrow();
    });

    it('debe asignar subtotal, utilidad y total con valor 0 por defecto', async () => {
      const doc = await CotizacionCanalizacion.create(baseDoc());
      expect(doc.subtotal).toBe(0);
      expect(doc.utilidad).toBe(0);
      expect(doc.total).toBe(0);
    });

    it('debe asignar fecha y fechaCreacion automáticamente', async () => {
      const doc = await CotizacionCanalizacion.create(baseDoc());
      expect(doc.fecha).toBeInstanceOf(Date);
      expect(doc.fechaCreacion).toBeInstanceOf(Date);
      expect(doc.fechaActualizacion).toBeInstanceOf(Date);
    });
  });

  // ── 5. SUBDOCUMENTO ITEMS ───────────────────────────────────────────────────
  describe('Subdocumento items', () => {
    it('debe crear una cotización con un item válido', async () => {
      const doc = await CotizacionCanalizacion.create(
        baseDoc({ items: [baseItem()] })
      );

      expect(doc.items).toHaveLength(1);
      expect(doc.items[0].descripcion).toBe('Tubo conduit 1"');
      expect(doc.items[0].unidad).toBe('MTS');
      expect(doc.items[0].precioUnitario).toBe(25);
      expect(doc.items[0].subtotal).toBe(250);
    });

    it('debe crear una cotización con múltiples items', async () => {
      const items = [
        baseItem({ descripcion: 'Tubo 1', subtotal: 100 }),
        baseItem({ descripcion: 'Tubo 2', unidad: 'PZA', subtotal: 200 }),
        baseItem({ descripcion: 'Tubo 3', subtotal: 300 }),
      ];
      const doc = await CotizacionCanalizacion.create(baseDoc({ items }));
      expect(doc.items).toHaveLength(3);
    });

    it('debe aceptar item con unidad PZA', async () => {
      const doc = await CotizacionCanalizacion.create(
        baseDoc({ items: [baseItem({ unidad: 'PZA' })] })
      );
      expect(doc.items[0].unidad).toBe('PZA');
    });

    it('debe rechazar un item con unidad inválida', async () => {
      await expect(
        CotizacionCanalizacion.create(
          baseDoc({ items: [baseItem({ unidad: 'KG' })] })
        )
      ).rejects.toThrow();
    });

    it('debe rechazar un item sin descripcion', async () => {
      const { descripcion: _omit, ...itemSinDesc } = baseItem() as Record<string, unknown>;
      await expect(
        CotizacionCanalizacion.create(baseDoc({ items: [itemSinDesc] }))
      ).rejects.toThrow();
    });

    it('debe rechazar un item con cantidad negativa', async () => {
      await expect(
        CotizacionCanalizacion.create(
          baseDoc({ items: [baseItem({ cantidad: -1 })] })
        )
      ).rejects.toThrow();
    });

    it('debe rechazar un item con precioUnitario negativo', async () => {
      await expect(
        CotizacionCanalizacion.create(
          baseDoc({ items: [baseItem({ precioUnitario: -5 })] })
        )
      ).rejects.toThrow();
    });

    it('debe aceptar item con materialCanalizacion string (campo opcional)', async () => {
      const doc = await CotizacionCanalizacion.create(
        baseDoc({
          items: [baseItem({ materialCanalizacion: 'MAT-001' })],
        })
      );
      expect(doc.items[0].materialCanalizacion).toBe('MAT-001');
    });

    it('debe aceptar item sin materialCanalizacion (campo opcional)', async () => {
      const doc = await CotizacionCanalizacion.create(
        baseDoc({ items: [baseItem()] })
      );
      // materialCanalizacion no fue enviado — no debe lanzar error
      expect(doc.items[0].descripcion).toBe('Tubo conduit 1"');
    });
  });

  // ── 6. MÉTODO calcularTotales() — LLAMADA MANUAL ────────────────────────────
  describe('Método calcularTotales()', () => {
    it('debe calcular subtotal como suma de items[].subtotal', async () => {
      const doc = await CotizacionCanalizacion.create(
        baseDoc({
          items: [
            baseItem({ subtotal: 300 }),
            baseItem({ subtotal: 200 }),
          ],
          utilidad: 0,
        })
      );

      // El middleware pre('save') ya lo calculó; verificamos luego de llamada manual
      doc.items[0].subtotal = 500;
      doc.items[1].subtotal = 100;
      doc.calcularTotales();

      expect(doc.subtotal).toBe(600);
    });

    it('debe calcular total = subtotal * (1 + utilidad/100)', async () => {
      const doc = await CotizacionCanalizacion.create(
        baseDoc({ items: [baseItem({ subtotal: 1000 })], utilidad: 20 })
      );

      // Llamada manual con nuevos valores de items
      doc.items[0].subtotal = 1000;
      doc.utilidad = 20;
      doc.calcularTotales();

      expect(doc.subtotal).toBe(1000);
      expect(doc.total).toBeCloseTo(1200, 2);
    });

    it('debe resultar total = subtotal cuando utilidad es 0', async () => {
      const doc = await CotizacionCanalizacion.create(
        baseDoc({ items: [baseItem({ subtotal: 500 })], utilidad: 0 })
      );

      doc.items[0].subtotal = 500;
      doc.utilidad = 0;
      doc.calcularTotales();

      expect(doc.total).toBeCloseTo(500, 2);
    });

    it('debe resultar total = 0 con lista de items vacía', async () => {
      const doc = new CotizacionCanalizacion(baseDoc({ items: [], utilidad: 10 }));
      doc.calcularTotales();

      expect(doc.subtotal).toBe(0);
      expect(doc.total).toBe(0);
    });
  });

  // ── 7. MIDDLEWARE pre('save') — AUTO-CÁLCULO ────────────────────────────────
  describe('Middleware pre(save) — auto-cálculo de totales', () => {
    it('debe auto-calcular subtotal y total al guardar con items', async () => {
      const doc = await CotizacionCanalizacion.create(
        baseDoc({
          items: [
            baseItem({ subtotal: 200 }),
            baseItem({ subtotal: 300 }),
          ],
          utilidad: 10,
        })
      );

      // subtotal = 200 + 300 = 500; total = 500 * 1.10 = 550
      expect(doc.subtotal).toBe(500);
      expect(doc.total).toBeCloseTo(550, 2);
    });

    it('no debe recalcular si la lista de items está vacía al guardar', async () => {
      const doc = await CotizacionCanalizacion.create(
        baseDoc({ items: [], subtotal: 999, total: 999 })
      );

      // El middleware no se activa con items vacíos, así que los valores manuales permanecen
      expect(doc.subtotal).toBe(999);
      expect(doc.total).toBe(999);
    });

    it('debe recalcular al guardar por segunda vez con items modificados', async () => {
      const doc = await CotizacionCanalizacion.create(
        baseDoc({ items: [baseItem({ subtotal: 100 })], utilidad: 0 })
      );

      expect(doc.subtotal).toBe(100);

      doc.items[0].subtotal = 400;
      doc.utilidad = 25;
      await doc.save();

      expect(doc.subtotal).toBe(400);
      expect(doc.total).toBeCloseTo(500, 2);
    });
  });

  // ── 8. CÁLCULO DE UTILIDAD ──────────────────────────────────────────────────
  describe('Cálculo de utilidad', () => {
    it('debe aplicar 10% de utilidad correctamente', async () => {
      const doc = await CotizacionCanalizacion.create(
        baseDoc({ items: [baseItem({ subtotal: 1000 })], utilidad: 10 })
      );
      expect(doc.total).toBeCloseTo(1100, 2);
    });

    it('debe aplicar 50% de utilidad correctamente', async () => {
      const doc = await CotizacionCanalizacion.create(
        baseDoc({ items: [baseItem({ subtotal: 200 })], utilidad: 50 })
      );
      expect(doc.total).toBeCloseTo(300, 2);
    });

    it('debe aplicar 100% de utilidad correctamente (duplica el subtotal)', async () => {
      const doc = await CotizacionCanalizacion.create(
        baseDoc({ items: [baseItem({ subtotal: 500 })], utilidad: 100 })
      );
      expect(doc.total).toBeCloseTo(1000, 2);
    });

    it('debe rechazar utilidad negativa (min: 0)', async () => {
      await expect(
        CotizacionCanalizacion.create(baseDoc({ utilidad: -5 }))
      ).rejects.toThrow();
    });
  });

  // ── 9. MIDDLEWARE pre('findOneAndUpdate') — fechaActualizacion ──────────────
  describe('Middleware pre(findOneAndUpdate)', () => {
    it('debe actualizar fechaActualizacion al usar findOneAndUpdate', async () => {
      const doc = await CotizacionCanalizacion.create(baseDoc());
      const fechaOriginal = doc.fechaActualizacion;

      // Esperar un pequeño delta para que la fecha cambie
      await new Promise(resolve => setTimeout(resolve, 10));

      await CotizacionCanalizacion.findOneAndUpdate(
        { _id: doc._id },
        { cliente: 'Nuevo Cliente' },
        { new: true }
      );

      const updated = await CotizacionCanalizacion.findById(doc._id);
      expect(updated!.fechaActualizacion.getTime()).toBeGreaterThanOrEqual(
        fechaOriginal.getTime()
      );
    });
  });

  // ── 10. EDGE CASES ──────────────────────────────────────────────────────────
  describe('Edge cases', () => {
    it('debe aplicar trim a numeroPresupuesto', async () => {
      const doc = await CotizacionCanalizacion.create(
        baseDoc({ numeroPresupuesto: '  CANAL-TRIM  ' })
      );
      expect(doc.numeroPresupuesto).toBe('CANAL-TRIM');
    });

    it('debe aplicar trim a cliente', async () => {
      const doc = await CotizacionCanalizacion.create(
        baseDoc({ cliente: '  Mi Cliente  ' })
      );
      expect(doc.cliente).toBe('Mi Cliente');
    });

    it('debe almacenar comentarios cuando se proporciona', async () => {
      const doc = await CotizacionCanalizacion.create(
        baseDoc({ comentarios: 'Cotización urgente' })
      );
      expect(doc.comentarios).toBe('Cotización urgente');
    });

    it('debe aplicar trim a comentarios', async () => {
      const doc = await CotizacionCanalizacion.create(
        baseDoc({ comentarios: '  con espacios  ' })
      );
      expect(doc.comentarios).toBe('con espacios');
    });

    it('debe rechazar subtotal negativo', async () => {
      await expect(
        CotizacionCanalizacion.create(baseDoc({ subtotal: -1 }))
      ).rejects.toThrow();
    });

    it('debe rechazar total negativo', async () => {
      await expect(
        CotizacionCanalizacion.create(baseDoc({ total: -1 }))
      ).rejects.toThrow();
    });

    it('debe permitir crear múltiples cotizaciones con diferente numeroPresupuesto', async () => {
      const docs = await Promise.all(
        ['CANAL-1', 'CANAL-2', 'CANAL-3'].map(n =>
          CotizacionCanalizacion.create(baseDoc({ numeroPresupuesto: n }))
        )
      );
      expect(docs).toHaveLength(3);
      const ids = docs.map(d => (d._id as mongoose.Types.ObjectId).toString());
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    it('debe listar todas las cotizaciones de canalizacion correctamente', async () => {
      await CotizacionCanalizacion.create(baseDoc({ numeroPresupuesto: 'LIST-A' }));
      await CotizacionCanalizacion.create(baseDoc({ numeroPresupuesto: 'LIST-B' }));
      const all = await CotizacionCanalizacion.find();
      expect(all.length).toBe(2);
    });

    it('debe calcular subtotal correcto con items de distintas cantidades', async () => {
      const doc = await CotizacionCanalizacion.create(
        baseDoc({
          items: [
            baseItem({ cantidad: 5, precioUnitario: 10, subtotal: 50 }),
            baseItem({ cantidad: 2, precioUnitario: 100, subtotal: 200 }),
            baseItem({ cantidad: 1, precioUnitario: 350, subtotal: 350 }),
          ],
          utilidad: 0,
        })
      );
      expect(doc.subtotal).toBe(600);
      expect(doc.total).toBeCloseTo(600, 2);
    });
  });
});

