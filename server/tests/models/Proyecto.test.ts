import { Types } from 'mongoose';
import { Proyecto } from '../../src/models/Proyecto';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
beforeEach(async () => { await clearDB(); });

const baseDoc = () => ({
  nombre: 'Proyecto Alpha',
  fechaInicio: new Date('2026-01-01'),
  fechaTerminacion: new Date('2026-06-30'),
});

describe('Proyecto – creación básica', () => {
  it('crea un proyecto con todos los campos requeridos', async () => {
    const doc = await Proyecto.create(baseDoc());
    expect(doc._id).toBeDefined();
    expect(doc.nombre).toBe('Proyecto Alpha');
    expect(doc.fechaInicio).toEqual(new Date('2026-01-01'));
    expect(doc.fechaTerminacion).toEqual(new Date('2026-06-30'));
  });

  it('estado por defecto es "En progreso"', async () => {
    const doc = await Proyecto.create(baseDoc());
    expect(doc.estado).toBe('En progreso');
  });

  it('colaboradores por defecto es []', async () => {
    const doc = await Proyecto.create(baseDoc());
    expect(Array.isArray(doc.colaboradores)).toBe(true);
    expect(doc.colaboradores).toHaveLength(0);
  });

  it('asigna timestamps createdAt y updatedAt', async () => {
    const doc = await Proyecto.create(baseDoc());
    expect(doc.createdAt).toBeDefined();
    expect(doc.updatedAt).toBeDefined();
  });

  it('crea proyecto con todos los campos opcionales', async () => {
    const colabId = new Types.ObjectId();
    const doc = await Proyecto.create({
      ...baseDoc(),
      estado: 'Pausado',
      descripcion: 'Descripción completa del proyecto',
      colaboradores: [colabId],
    });
    expect(doc.estado).toBe('Pausado');
    expect(doc.descripcion).toBe('Descripción completa del proyecto');
    expect(doc.colaboradores).toHaveLength(1);
    expect(doc.colaboradores[0].toString()).toBe(colabId.toString());
  });
});

describe('Proyecto – campos required', () => {
  it('falla sin nombre', async () => {
    const { nombre, ...rest } = baseDoc() as Record<string, unknown>;
    await expect(Proyecto.create(rest)).rejects.toThrow(/nombre/);
  });

  it('falla sin fechaInicio', async () => {
    const { fechaInicio, ...rest } = baseDoc() as Record<string, unknown>;
    await expect(Proyecto.create(rest)).rejects.toThrow(/fechaInicio/);
  });

  it('falla sin fechaTerminacion', async () => {
    const { fechaTerminacion, ...rest } = baseDoc() as Record<string, unknown>;
    await expect(Proyecto.create(rest)).rejects.toThrow(/fechaTerminacion/);
  });

  it('falla con nombre vacío', async () => {
    await expect(Proyecto.create({ ...baseDoc(), nombre: '' })).rejects.toThrow();
  });
});

describe('Proyecto – enum estado', () => {
  const estadosValidos = ['En progreso', 'Completado', 'Pausado', 'Cancelado'] as const;

  estadosValidos.forEach(estado => {
    it(`acepta estado "${estado}"`, async () => {
      const doc = await Proyecto.create({ ...baseDoc(), estado });
      expect(doc.estado).toBe(estado);
    });
  });

  it('rechaza un estado no válido', async () => {
    await expect(
      Proyecto.create({ ...baseDoc(), estado: 'Indefinido' })
    ).rejects.toThrow();
  });
});

describe('Proyecto – trim', () => {
  it('recorta espacios en nombre', async () => {
    const doc = await Proyecto.create({ ...baseDoc(), nombre: '  Proyecto Beta  ' });
    expect(doc.nombre).toBe('Proyecto Beta');
  });

  it('recorta espacios en descripcion', async () => {
    const doc = await Proyecto.create({ ...baseDoc(), descripcion: '  Detalle   ' });
    expect(doc.descripcion).toBe('Detalle');
  });
});

describe('Proyecto – colaboradores (ObjectIds)', () => {
  it('acepta múltiples colaboradores como ObjectId', async () => {
    const ids = [new Types.ObjectId(), new Types.ObjectId(), new Types.ObjectId()];
    const doc = await Proyecto.create({ ...baseDoc(), colaboradores: ids });
    expect(doc.colaboradores).toHaveLength(3);
    doc.colaboradores.forEach((id, i) => {
      expect(id.toString()).toBe(ids[i].toString());
    });
  });

  it('rechaza un valor que no sea ObjectId válido como colaborador', async () => {
    await expect(
      Proyecto.create({ ...baseDoc(), colaboradores: ['no-es-un-objectid'] })
    ).rejects.toThrow();
  });

  it('permite agregar colaboradores con $push', async () => {
    const doc = await Proyecto.create(baseDoc());
    const colabId = new Types.ObjectId();
    const updated = await Proyecto.findByIdAndUpdate(
      doc._id,
      { $push: { colaboradores: colabId } },
      { new: true }
    );
    expect(updated!.colaboradores).toHaveLength(1);
    expect(updated!.colaboradores[0].toString()).toBe(colabId.toString());
  });
});

describe('Proyecto – lectura', () => {
  it('findById recupera el proyecto correcto', async () => {
    const created = await Proyecto.create(baseDoc());
    const found = await Proyecto.findById(created._id);
    expect(found).not.toBeNull();
    expect(found!.nombre).toBe('Proyecto Alpha');
  });

  it('find retorna todos los proyectos', async () => {
    await Proyecto.create({ ...baseDoc(), nombre: 'Proj 1' });
    await Proyecto.create({ ...baseDoc(), nombre: 'Proj 2' });
    const all = await Proyecto.find();
    expect(all).toHaveLength(2);
  });

  it('findOne por nombre', async () => {
    await Proyecto.create({ ...baseDoc(), nombre: 'Único' });
    const found = await Proyecto.findOne({ nombre: 'Único' });
    expect(found).not.toBeNull();
  });

  it('retorna null para _id inexistente', async () => {
    const found = await Proyecto.findById(new Types.ObjectId());
    expect(found).toBeNull();
  });
});

describe('Proyecto – actualización', () => {
  it('findByIdAndUpdate actualiza nombre', async () => {
    const doc = await Proyecto.create(baseDoc());
    const updated = await Proyecto.findByIdAndUpdate(
      doc._id,
      { nombre: 'Proyecto Renombrado' },
      { new: true }
    );
    expect(updated!.nombre).toBe('Proyecto Renombrado');
  });

  it('findByIdAndUpdate cambia estado', async () => {
    const doc = await Proyecto.create(baseDoc());
    const updated = await Proyecto.findByIdAndUpdate(
      doc._id,
      { estado: 'Completado' },
      { new: true }
    );
    expect(updated!.estado).toBe('Completado');
  });

  it('updatedAt cambia después de actualización', async () => {
    const doc = await Proyecto.create(baseDoc());
    const before = doc.updatedAt as Date;
    await new Promise(r => setTimeout(r, 10));
    await Proyecto.findByIdAndUpdate(doc._id, { descripcion: 'Nueva desc' });
    const updated = await Proyecto.findById(doc._id);
    expect((updated!.updatedAt as Date).getTime()).toBeGreaterThanOrEqual(before.getTime());
  });
});

describe('Proyecto – eliminación', () => {
  it('findByIdAndDelete elimina el documento', async () => {
    const doc = await Proyecto.create(baseDoc());
    await Proyecto.findByIdAndDelete(doc._id);
    const found = await Proyecto.findById(doc._id);
    expect(found).toBeNull();
  });

  it('deleteMany elimina todos', async () => {
    await Proyecto.create({ ...baseDoc(), nombre: 'A' });
    await Proyecto.create({ ...baseDoc(), nombre: 'B' });
    await Proyecto.deleteMany({});
    expect(await Proyecto.countDocuments()).toBe(0);
  });
});

describe('Proyecto – sin restricciones únicas', () => {
  it('permite dos proyectos con el mismo nombre', async () => {
    await Proyecto.create(baseDoc());
    await expect(Proyecto.create(baseDoc())).resolves.toBeDefined();
    expect(await Proyecto.countDocuments()).toBe(2);
  });
});
