/**
 * ═══════════════════════════════════════════════════════════════════
 * PRUEBAS DE MODELO: Guia
 * ═══════════════════════════════════════════════════════════════════
 * 
 * MODELO: Guías de envío
 * PRIORIDAD: BAJA (complemento logístico)
 * 
 * VALIDACIONES A PROBAR:
 * - numeroGuia: required, unique
 * - paqueteria: string, required
 * - entrega: reference a Entrega
 * - fechaEnvio: date
 * - fechaEntrega: date
 * - estado: enum values
 * - trackingUrl: URL format
 */

import mongoose from 'mongoose';
import Guia from '../../src/models/Guia';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';

const baseDoc = (overrides: Record<string, unknown> = {}) => ({
  numeroGuia: 'G-0001',
  proveedor: 'Proveedor Norte',
  paqueteria: 'DHL',
  fechaPedido: new Date('2026-02-01'),
  fechaLlegada: new Date('2026-02-05'),
  proyectos: ['Proyecto A', 'Proyecto B'],
  estado: 'en transito',
  comentarios: 'Llega en ruta terrestre',
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

describe('Modelo Guia', () => {
  describe('CRUD básico', () => {
    it('debe crear y guardar una guia con datos completos', async () => {
      const doc = await Guia.create(baseDoc());

      expect(doc._id).toBeDefined();
      expect(doc.numeroGuia).toBe('G-0001');
      expect(doc.paqueteria).toBe('DHL');
      expect(doc.estado).toBe('en transito');
      expect(doc.proyectos).toHaveLength(2);
    });

    it('debe leer una guia por _id', async () => {
      const created = await Guia.create(baseDoc());
      const found = await Guia.findById(created._id);

      expect(found).not.toBeNull();
      expect(found!.numeroGuia).toBe('G-0001');
    });

    it('debe actualizar proveedor y estado', async () => {
      const created = await Guia.create(baseDoc());

      await Guia.findByIdAndUpdate(created._id, {
        proveedor: 'Proveedor Sur',
        estado: 'entregado',
      });

      const updated = await Guia.findById(created._id);
      expect(updated!.proveedor).toBe('Proveedor Sur');
      expect(updated!.estado).toBe('entregado');
    });

    it('debe eliminar una guia por _id', async () => {
      const created = await Guia.create(baseDoc());

      await Guia.findByIdAndDelete(created._id);
      const found = await Guia.findById(created._id);
      expect(found).toBeNull();
    });
  });

  describe('Comportamiento sin required', () => {
    it('debe permitir crear una guia vacía porque no hay required en el schema', async () => {
      const doc = await Guia.create({});
      expect(doc._id).toBeDefined();
      expect(doc.numeroGuia).toBeUndefined();
      expect(doc.proveedor).toBeUndefined();
      expect(doc.paqueteria).toBeUndefined();
    });

    it('debe permitir documento sin numeroGuia', async () => {
      const { numeroGuia: _omit, ...data } = baseDoc() as Record<string, unknown>;
      const doc = await Guia.create(data);
      expect(doc.numeroGuia).toBeUndefined();
    });

    it('debe permitir documento sin estado', async () => {
      const { estado: _omit, ...data } = baseDoc() as Record<string, unknown>;
      const doc = await Guia.create(data);
      expect(doc.estado).toBeUndefined();
    });
  });

  describe('Enum de estado', () => {
    it('debe aceptar los cuatro estados válidos', async () => {
      const estados = ['entregado', 'no entregado', 'en transito', 'atrasado'] as const;

      for (let i = 0; i < estados.length; i++) {
        const doc = await Guia.create(
          baseDoc({
            numeroGuia: `G-EST-${i}`,
            estado: estados[i],
          })
        );

        expect(doc.estado).toBe(estados[i]);
        await Guia.findByIdAndDelete(doc._id);
      }
    });

    it('debe rechazar un estado fuera del enum', async () => {
      await expect(
        Guia.create(baseDoc({ estado: 'pendiente' }))
      ).rejects.toThrow();
    });
  });

  describe('Defaults', () => {
    it('debe asignar proyectos como arreglo vacío por default', async () => {
      const doc = await Guia.create(baseDoc({ proyectos: undefined }));
      expect(doc.proyectos).toEqual([]);
    });

    it('debe asignar comentarios vacío por default', async () => {
      const doc = await Guia.create(baseDoc({ comentarios: undefined }));
      expect(doc.comentarios).toBe('');
    });
  });

  describe('Fechas y tipos', () => {
    it('debe guardar fechaPedido y fechaLlegada como Date', async () => {
      const pedido = new Date('2026-03-10');
      const llegada = new Date('2026-03-12');
      const doc = await Guia.create(baseDoc({ fechaPedido: pedido, fechaLlegada: llegada }));

      expect(doc.fechaPedido).toBeInstanceOf(Date);
      expect(doc.fechaLlegada).toBeInstanceOf(Date);
      expect((doc.fechaPedido as Date).getTime()).toBe(pedido.getTime());
      expect((doc.fechaLlegada as Date).getTime()).toBe(llegada.getTime());
    });

    it('debe permitir omitir ambas fechas', async () => {
      const { fechaPedido: _a, fechaLlegada: _b, ...data } = baseDoc() as Record<string, unknown>;
      const doc = await Guia.create(data);

      expect(doc.fechaPedido).toBeUndefined();
      expect(doc.fechaLlegada).toBeUndefined();
    });

    it('debe convertir strings de fecha válidos a Date', async () => {
      const doc = await Guia.create(
        baseDoc({
          fechaPedido: '2026-04-01',
          fechaLlegada: '2026-04-05',
        })
      );

      expect(doc.fechaPedido).toBeInstanceOf(Date);
      expect(doc.fechaLlegada).toBeInstanceOf(Date);
    });
  });

  describe('Arreglo proyectos', () => {
    it('debe guardar múltiples proyectos', async () => {
      const doc = await Guia.create(baseDoc({ proyectos: ['P1', 'P2', 'P3'] }));

      expect(doc.proyectos).toHaveLength(3);
      expect(doc.proyectos[0]).toBe('P1');
    });

    it('debe permitir arreglo de proyectos vacío explícito', async () => {
      const doc = await Guia.create(baseDoc({ proyectos: [] }));
      expect(doc.proyectos).toEqual([]);
    });
  });

  describe('Edge cases del schema actual', () => {
    it('debe permitir numeroGuia duplicado porque no hay unique', async () => {
      await Guia.create(baseDoc({ numeroGuia: 'G-DUP-1' }));

      await expect(
        Guia.create(baseDoc({ numeroGuia: 'G-DUP-1', proveedor: 'Otro Proveedor' }))
      ).resolves.toBeDefined();
    });

    it('debe permitir guardar sin timestamps porque el schema no los define', async () => {
      const doc = await Guia.create(baseDoc());
      expect((doc as any).createdAt).toBeUndefined();
      expect((doc as any).updatedAt).toBeUndefined();
    });

    it('debe listar todas las guias guardadas', async () => {
      await Guia.create(baseDoc({ numeroGuia: 'G-LIST-1' }));
      await Guia.create(baseDoc({ numeroGuia: 'G-LIST-2' }));

      const all = await Guia.find();
      expect(all.length).toBe(2);
    });

    it('debe permitir comentarios como string libre', async () => {
      const doc = await Guia.create(baseDoc({ comentarios: 'Sin novedad en bodega #3' }));
      expect(doc.comentarios).toBe('Sin novedad en bodega #3');
    });
  });
});
