/**
 * ═══════════════════════════════════════════════════════════════════
 * PRUEBAS DE MODELO: DireccionIP
 * ═══════════════════════════════════════════════════════════════════
 * 
 * MODELO: Direcciones IP del sistema
 * PRIORIDAD: BAJA (infraestructura)
 * 
 * VALIDACIONES A PROBAR:
 * - ip: required, formato IPv4/IPv6 válido, unique
 * - dispositivo: string
 * - ubicacion: string
 * - activa: boolean
 * - Validación de formato IP
 */

import mongoose from 'mongoose';
import { DireccionIP } from '../../src/models/DireccionIP';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';

const baseDoc = (overrides: Record<string, unknown> = {}) => ({
  proyecto: new mongoose.Types.ObjectId(),
  equipo: 'Router Principal',
  usuario: 'admin',
  contrasena: 'secret123',
  direccion: '192.168.1.10',
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

describe('Modelo DireccionIP', () => {
  describe('CRUD básico', () => {
    it('debe crear una direccion IP valida con campos requeridos', async () => {
      const doc = await DireccionIP.create(baseDoc());

      expect(doc._id).toBeDefined();
      expect(doc.equipo).toBe('Router Principal');
      expect(doc.usuario).toBe('admin');
      expect(doc.direccion).toBe('192.168.1.10');
    });

    it('debe leer una direccion IP por _id', async () => {
      const created = await DireccionIP.create(baseDoc());
      const found = await DireccionIP.findById(created._id);

      expect(found).not.toBeNull();
      expect(found!.equipo).toBe('Router Principal');
    });

    it('debe actualizar campos de la direccion IP', async () => {
      const created = await DireccionIP.create(baseDoc());

      await DireccionIP.findByIdAndUpdate(created._id, {
        equipo: 'Switch Core',
        usuario: 'root',
      });

      const updated = await DireccionIP.findById(created._id);
      expect(updated!.equipo).toBe('Switch Core');
      expect(updated!.usuario).toBe('root');
    });

    it('debe eliminar una direccion IP', async () => {
      const created = await DireccionIP.create(baseDoc());
      await DireccionIP.findByIdAndDelete(created._id);

      const found = await DireccionIP.findById(created._id);
      expect(found).toBeNull();
    });
  });

  describe('Validaciones required', () => {
    it('debe fallar si falta proyecto', async () => {
      const { proyecto: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(DireccionIP.create(data)).rejects.toThrow();
    });

    it('debe fallar si falta equipo', async () => {
      const { equipo: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(DireccionIP.create(data)).rejects.toThrow();
    });

    it('debe fallar si falta usuario', async () => {
      const { usuario: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(DireccionIP.create(data)).rejects.toThrow();
    });

    it('debe fallar si falta contrasena', async () => {
      const { contrasena: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(DireccionIP.create(data)).rejects.toThrow();
    });

    it('debe fallar si falta direccion', async () => {
      const { direccion: _omit, ...data } = baseDoc() as Record<string, unknown>;
      await expect(DireccionIP.create(data)).rejects.toThrow();
    });

    it('debe fallar si proyecto no es ObjectId valido', async () => {
      await expect(
        DireccionIP.create(baseDoc({ proyecto: 'no-es-objectid' }))
      ).rejects.toThrow();
    });
  });

  describe('Defaults y campos opcionales', () => {
    it('debe asignar esRango=false por defecto', async () => {
      const doc = await DireccionIP.create(baseDoc());
      expect(doc.esRango).toBe(false);
    });

    it('debe permitir esRango=true', async () => {
      const doc = await DireccionIP.create(baseDoc({ esRango: true }));
      expect(doc.esRango).toBe(true);
    });

    it('debe permitir direccionFin cuando esRango=true', async () => {
      const doc = await DireccionIP.create(
        baseDoc({ esRango: true, direccionFin: '192.168.1.254' })
      );

      expect(doc.direccionFin).toBe('192.168.1.254');
    });

    it('debe permitir esRango=true sin direccionFin (no es required)', async () => {
      const doc = await DireccionIP.create(baseDoc({ esRango: true }));
      expect(doc.direccionFin).toBeUndefined();
    });
  });

  describe('Trim y timestamps', () => {
    it('debe aplicar trim en equipo, usuario, direccion y direccionFin', async () => {
      const doc = await DireccionIP.create(
        baseDoc({
          equipo: '  Router Borde  ',
          usuario: '  operador  ',
          direccion: '  10.0.0.1  ',
          esRango: true,
          direccionFin: '  10.0.0.20  ',
        })
      );

      expect(doc.equipo).toBe('Router Borde');
      expect(doc.usuario).toBe('operador');
      expect(doc.direccion).toBe('10.0.0.1');
      expect(doc.direccionFin).toBe('10.0.0.20');
    });

    it('debe incluir createdAt y updatedAt', async () => {
      const doc = await DireccionIP.create(baseDoc());

      expect(doc.createdAt).toBeInstanceOf(Date);
      expect(doc.updatedAt).toBeInstanceOf(Date);
    });

    it('debe actualizar updatedAt al modificar y guardar', async () => {
      const doc = await DireccionIP.create(baseDoc());
      const updatedAtOriginal = doc.updatedAt as Date;

      await new Promise(resolve => setTimeout(resolve, 10));

      doc.equipo = 'Firewall Perimetral';
      await doc.save();

      expect((doc.updatedAt as Date).getTime()).toBeGreaterThan(updatedAtOriginal.getTime());
    });
  });

  describe('Comportamiento actual del schema', () => {
    it('debe permitir direcciones duplicadas (no existe unique en direccion)', async () => {
      await DireccionIP.create(baseDoc({ direccion: '172.16.0.10' }));
      await expect(
        DireccionIP.create(baseDoc({ proyecto: new mongoose.Types.ObjectId(), direccion: '172.16.0.10' }))
      ).resolves.toBeDefined();
    });

    it('debe aceptar direccion con formato libre porque no hay regex de validacion IP', async () => {
      const doc = await DireccionIP.create(baseDoc({ direccion: 'NO_ES_IP' }));
      expect(doc.direccion).toBe('NO_ES_IP');
    });

    it('debe listar todos los documentos guardados', async () => {
      await DireccionIP.create(baseDoc({ direccion: '10.10.10.1' }));
      await DireccionIP.create(baseDoc({ proyecto: new mongoose.Types.ObjectId(), direccion: '10.10.10.2' }));

      const all = await DireccionIP.find();
      expect(all.length).toBe(2);
    });
  });
});
