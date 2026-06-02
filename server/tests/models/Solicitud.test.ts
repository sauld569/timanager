import Solicitud from '../../src/models/Solicitud';
import { Types } from 'mongoose';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';

// Retry a couple of times to absorb rare in-memory Mongo socket resets
jest.retryTimes(2);

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
beforeEach(async () => { await clearDB(); });

const colaboradorId = new Types.ObjectId();

const baseDoc = () => ({
  tipo: 'inventario',
  recursoId: new Types.ObjectId(),
  colaboradorId,
  accion: 'alta',
});

describe('Solicitud – creación básica', () => {
  it('crea una solicitud con todos los campos requeridos', async () => {
    const doc = await Solicitud.create(baseDoc());
    expect(doc._id).toBeDefined();
    expect(doc.tipo).toBe('inventario');
    expect(doc.accion).toBe('alta');
    expect((doc as any).colaboradorId.toString()).toBe(colaboradorId.toString());
  });

  it('estado por defecto es "pendiente"', async () => {
    const doc = await Solicitud.create(baseDoc());
    expect((doc as any).estado).toBe('pendiente');
  });

  it('fecha por defecto se genera automáticamente', async () => {
    const doc = await Solicitud.create(baseDoc());
    expect((doc as any).fecha).toBeDefined();
    expect((doc as any).fecha).toBeInstanceOf(Date);
  });

  it('detalles y detallesOriginal son opcionales', async () => {
    const doc = await Solicitud.create(baseDoc());
    expect((doc as any).detalles).toBeUndefined();
    expect((doc as any).detallesOriginal).toBeUndefined();
  });

  it('crea solicitud con detalles como objeto (Mixed)', async () => {
    const doc = await Solicitud.create({
      ...baseDoc(),
      detalles: { cantidad: 5, motivo: 'Reposición de stock' },
      detallesOriginal: { cantidad: 3 },
    });
    expect((doc as any).detalles.cantidad).toBe(5);
    expect((doc as any).detalles.motivo).toBe('Reposición de stock');
    expect((doc as any).detallesOriginal.cantidad).toBe(3);
  });

  it('recursoId acepta string como Mixed', async () => {
    const doc = await Solicitud.create({ ...baseDoc(), recursoId: 'recurso-externo-123' });
    expect((doc as any).recursoId).toBe('recurso-externo-123');
  });

  it('recursoId acepta número como Mixed', async () => {
    const doc = await Solicitud.create({ ...baseDoc(), recursoId: 42 });
    expect((doc as any).recursoId).toBe(42);
  });
});

describe('Solicitud – campos required', () => {
  it('falla sin tipo', async () => {
    const { tipo, ...rest } = baseDoc() as Record<string, unknown>;
    await expect(Solicitud.create(rest)).rejects.toThrow(/tipo/);
  });

  it('falla sin recursoId', async () => {
    const { recursoId, ...rest } = baseDoc() as Record<string, unknown>;
    await expect(Solicitud.create(rest)).rejects.toThrow(/recursoId/);
  });

  it('falla sin colaboradorId', async () => {
    const { colaboradorId: _, ...rest } = baseDoc() as Record<string, unknown>;
    await expect(Solicitud.create(rest)).rejects.toThrow(/colaboradorId/);
  });

  it('falla sin accion', async () => {
    const { accion, ...rest } = baseDoc() as Record<string, unknown>;
    await expect(Solicitud.create(rest)).rejects.toThrow(/accion/);
  });
});

describe('Solicitud – campo estado', () => {
  it('acepta estado "pendiente"', async () => {
    const doc = await Solicitud.create({ ...baseDoc(), estado: 'pendiente' });
    expect((doc as any).estado).toBe('pendiente');
  });

  it('acepta estado "aprobada"', async () => {
    const doc = await Solicitud.create({ ...baseDoc(), estado: 'aprobada' });
    expect((doc as any).estado).toBe('aprobada');
  });

  it('acepta estado "rechazada"', async () => {
    const doc = await Solicitud.create({ ...baseDoc(), estado: 'rechazada' });
    expect((doc as any).estado).toBe('rechazada');
  });

  it('acepta cualquier string en estado (sin enum definido en schema)', async () => {
    const doc = await Solicitud.create({ ...baseDoc(), estado: 'en_revision' });
    expect((doc as any).estado).toBe('en_revision');
  });
});

describe('Solicitud – campo tipo y accion (sin enum)', () => {
  it('acepta tipo "herramienta"', async () => {
    const doc = await Solicitud.create({ ...baseDoc(), tipo: 'herramienta' });
    expect(doc.tipo).toBe('herramienta');
  });

  it('acepta accion "baja"', async () => {
    const doc = await Solicitud.create({ ...baseDoc(), accion: 'baja' });
    expect((doc as any).accion).toBe('baja');
  });

  it('acepta accion "asignar"', async () => {
    const doc = await Solicitud.create({ ...baseDoc(), accion: 'asignar' });
    expect((doc as any).accion).toBe('asignar');
  });

  it('acepta accion "remover"', async () => {
    const doc = await Solicitud.create({ ...baseDoc(), accion: 'remover' });
    expect((doc as any).accion).toBe('remover');
  });
});

describe('Solicitud – lectura', () => {
  it('findById recupera la solicitud correcta', async () => {
    const created = await Solicitud.create(baseDoc());
    const found = await Solicitud.findById(created._id);
    expect(found).not.toBeNull();
    expect(found!.tipo).toBe('inventario');
  });

  it('find retorna todas las solicitudes', async () => {
    await Solicitud.create(baseDoc());
    await Solicitud.create({ ...baseDoc(), tipo: 'herramienta' });
    const all = await Solicitud.find();
    expect(all).toHaveLength(2);
  });

  it('findOne por estado', async () => {
    await Solicitud.create({ ...baseDoc(), estado: 'aprobada' });
    const found = await Solicitud.findOne({ estado: 'aprobada' });
    expect(found).not.toBeNull();
  });

  it('retorna null para _id inexistente', async () => {
    const found = await Solicitud.findById(new Types.ObjectId());
    expect(found).toBeNull();
  });
});

describe('Solicitud – actualización', () => {
  it('findByIdAndUpdate cambia estado a aprobada', async () => {
    const doc = await Solicitud.create(baseDoc());
    const updated = await Solicitud.findByIdAndUpdate(
      doc._id,
      { estado: 'aprobada' },
      { new: true }
    );
    expect((updated as any).estado).toBe('aprobada');
  });

  it('findByIdAndUpdate agrega detalles', async () => {
    const doc = await Solicitud.create(baseDoc());
    const updated = await Solicitud.findByIdAndUpdate(
      doc._id,
      { detalles: { nota: 'Revisado por supervisor' } },
      { new: true }
    );
    expect((updated as any).detalles.nota).toBe('Revisado por supervisor');
  });
});

describe('Solicitud – eliminación', () => {
  it('findByIdAndDelete elimina la solicitud', async () => {
    const doc = await Solicitud.create(baseDoc());
    await Solicitud.findByIdAndDelete(doc._id);
    const found = await Solicitud.findById(doc._id);
    expect(found).toBeNull();
  });

  it('deleteMany elimina todas', async () => {
    await Solicitud.create(baseDoc());
    await Solicitud.create({ ...baseDoc(), tipo: 'herramienta' });
    await Solicitud.deleteMany({});
    expect(await Solicitud.countDocuments()).toBe(0);
  });
});

describe('Solicitud – sin restricciones únicas', () => {
  it('permite múltiples solicitudes con el mismo tipo y accion', async () => {
    await Solicitud.create(baseDoc());
    await expect(Solicitud.create(baseDoc())).resolves.toBeDefined();
    expect(await Solicitud.countDocuments()).toBe(2);
  });
});
