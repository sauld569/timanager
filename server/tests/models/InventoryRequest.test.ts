/**
 * ═══════════════════════════════════════════════════════════════════
 * PRUEBAS DE MODELO: InventoryRequest
 * ═══════════════════════════════════════════════════════════════════
 * 
 * MODELO: Solicitudes de inventario
 * PRIORIDAD: MEDIA (workflow de solicitudes)
 * 
 * VALIDACIONES A PROBAR:
 * - solicitadoPor: reference a User/Colaborador, required
 * - items: array no vacío, required
 * - proyecto: reference a Proyecto (opcional)
 * - estado: enum ('pendiente', 'aprobada', 'rechazada', 'completada')
 * - fechaSolicitud: date, auto-generated
 * - fechaAprobacion: date
 */

import mongoose from 'mongoose';
import { InventoryRequest } from '../../src/models/InventoryRequest';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';

const baseDoc = (overrides: Record<string, unknown> = {}) => ({
  tipoMovimiento: 'ENTRADA',
  inventarioTipo: 'INTERIOR',
  itemId: new mongoose.Types.ObjectId(),
  cantidad: 5,
  solicitanteId: new mongoose.Types.ObjectId(),
  motivoSolicitud: 'Reposición de stock',
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

describe('Modelo InventoryRequest', () => {
  describe('CRUD básico', () => {
    it('debe crear y guardar una solicitud válida', async () => {
      const doc = await InventoryRequest.create(baseDoc());

      expect(doc._id).toBeDefined();
      expect(doc.tipoMovimiento).toBe('ENTRADA');
      expect(doc.inventarioTipo).toBe('INTERIOR');
      expect(doc.cantidad).toBe(5);
      expect(doc.motivoSolicitud).toBe('Reposición de stock');
    });

    it('debe leer una solicitud por _id', async () => {
      const created = await InventoryRequest.create(baseDoc());
      const found = await InventoryRequest.findById(created._id);

      expect(found).not.toBeNull();
      expect(found!.estado).toBe('PENDIENTE');
    });

    it('debe actualizar estado y aprobador', async () => {
      const created = await InventoryRequest.create(baseDoc());
      const aprobadorId = new mongoose.Types.ObjectId();
      const fechaAprobacion = new Date('2026-08-01');

      await InventoryRequest.findByIdAndUpdate(created._id, {
        estado: 'APROBADA',
        aprobadorId,
        fechaAprobacion,
      });

      const updated = await InventoryRequest.findById(created._id);
      expect(updated!.estado).toBe('APROBADA');
      expect((updated!.aprobadorId as mongoose.Types.ObjectId).toString()).toBe(aprobadorId.toString());
      expect((updated!.fechaAprobacion as Date).getTime()).toBe(fechaAprobacion.getTime());
    });

    it('debe eliminar una solicitud por _id', async () => {
      const created = await InventoryRequest.create(baseDoc());

      await InventoryRequest.findByIdAndDelete(created._id);
      const found = await InventoryRequest.findById(created._id);

      expect(found).toBeNull();
    });
  });

  describe('Validaciones required y min', () => {
    it('debe fallar si falta tipoMovimiento', async () => {
      const { tipoMovimiento: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(InventoryRequest.create(data)).rejects.toThrow();
    });

    it('debe fallar si falta inventarioTipo', async () => {
      const { inventarioTipo: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(InventoryRequest.create(data)).rejects.toThrow();
    });

    it('debe fallar si falta itemId', async () => {
      const { itemId: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(InventoryRequest.create(data)).rejects.toThrow();
    });

    it('debe fallar si falta cantidad', async () => {
      const { cantidad: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(InventoryRequest.create(data)).rejects.toThrow();
    });

    it('debe fallar si falta motivoSolicitud', async () => {
      const { motivoSolicitud: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(InventoryRequest.create(data)).rejects.toThrow();
    });

    it('debe fallar si cantidad es 0 (min:1)', async () => {
      await expect(
        InventoryRequest.create(baseDoc({ cantidad: 0 }))
      ).rejects.toThrow();
    });

    it('debe fallar si cantidad es negativa', async () => {
      await expect(
        InventoryRequest.create(baseDoc({ cantidad: -3 }))
      ).rejects.toThrow();
    });

    it('debe aceptar cantidad = 1', async () => {
      const doc = await InventoryRequest.create(baseDoc({ cantidad: 1 }));
      expect(doc.cantidad).toBe(1);
    });
  });

  describe('Enums', () => {
    it('debe aceptar tipoMovimiento ENTRADA y SALIDA', async () => {
      const a = await InventoryRequest.create(baseDoc({ tipoMovimiento: 'ENTRADA' }));
      const b = await InventoryRequest.create(
        baseDoc({ tipoMovimiento: 'SALIDA', itemId: new mongoose.Types.ObjectId() })
      );

      expect(a.tipoMovimiento).toBe('ENTRADA');
      expect(b.tipoMovimiento).toBe('SALIDA');
    });

    it('debe rechazar tipoMovimiento fuera de enum', async () => {
      await expect(
        InventoryRequest.create(baseDoc({ tipoMovimiento: 'AJUSTE' }))
      ).rejects.toThrow();
    });

    it('debe aceptar inventarioTipo INTERIOR y EXTERIOR', async () => {
      const a = await InventoryRequest.create(baseDoc({ inventarioTipo: 'INTERIOR' }));
      const b = await InventoryRequest.create(
        baseDoc({ inventarioTipo: 'EXTERIOR', itemId: new mongoose.Types.ObjectId() })
      );

      expect(a.inventarioTipo).toBe('INTERIOR');
      expect(b.inventarioTipo).toBe('EXTERIOR');
    });

    it('debe rechazar inventarioTipo fuera de enum', async () => {
      await expect(
        InventoryRequest.create(baseDoc({ inventarioTipo: 'MIXTO' }))
      ).rejects.toThrow();
    });

    it('debe aceptar estados válidos', async () => {
      const estados = ['PENDIENTE', 'APROBADA', 'RECHAZADA'] as const;

      for (let i = 0; i < estados.length; i++) {
        const doc = await InventoryRequest.create(
          baseDoc({
            estado: estados[i],
            itemId: new mongoose.Types.ObjectId(),
          })
        );
        expect(doc.estado).toBe(estados[i]);
      }
    });

    it('debe rechazar estado fuera de enum', async () => {
      await expect(
        InventoryRequest.create(baseDoc({ estado: 'COMPLETADA' }))
      ).rejects.toThrow();
    });
  });

  describe('Defaults y opcionales', () => {
    it('debe asignar fechaSolicitud por default', async () => {
      const doc = await InventoryRequest.create(baseDoc({ fechaSolicitud: undefined }));
      expect(doc.fechaSolicitud).toBeInstanceOf(Date);
    });

    it('debe asignar estado=PENDIENTE por default', async () => {
      const doc = await InventoryRequest.create(baseDoc({ estado: undefined }));
      expect(doc.estado).toBe('PENDIENTE');
    });

    it('debe permitir omitir solicitanteId (schema actual)', async () => {
      const { solicitanteId: _omit, ...data } = baseDoc() as Record<string, unknown>;
      const doc = await InventoryRequest.create(data);
      expect(doc.solicitanteId).toBeUndefined();
    });

    it('debe permitir aprobadorId y fechaAprobacion opcionales', async () => {
      const doc = await InventoryRequest.create(baseDoc());
      expect(doc.aprobadorId).toBeUndefined();
      expect(doc.fechaAprobacion).toBeUndefined();
    });

    it('debe permitir motivoRechazo opcional', async () => {
      const doc = await InventoryRequest.create(baseDoc({ motivoRechazo: 'Sin stock suficiente' }));
      expect(doc.motivoRechazo).toBe('Sin stock suficiente');
    });

    it('debe permitir numerosSerie como arreglo opcional', async () => {
      const doc = await InventoryRequest.create(baseDoc({ numerosSerie: ['SN-A', 'SN-B'] }));
      expect(doc.numerosSerie).toEqual(['SN-A', 'SN-B']);
    });
  });

  describe('Casting y edge cases', () => {
    it('debe fallar con itemId inválido', async () => {
      await expect(
        InventoryRequest.create(baseDoc({ itemId: 'no-es-objectid' }))
      ).rejects.toThrow();
    });

    it('debe castear cantidad string numérico a Number', async () => {
      const doc = await InventoryRequest.create(baseDoc({ cantidad: '7' }));
      expect(doc.cantidad).toBe(7);
    });

    it('debe listar todas las solicitudes guardadas', async () => {
      await InventoryRequest.create(baseDoc({ motivoSolicitud: 'Solicitud 1' }));
      await InventoryRequest.create(
        baseDoc({
          itemId: new mongoose.Types.ObjectId(),
          motivoSolicitud: 'Solicitud 2',
          tipoMovimiento: 'SALIDA',
        })
      );

      const all = await InventoryRequest.find();
      expect(all.length).toBe(2);
    });
  });
});
