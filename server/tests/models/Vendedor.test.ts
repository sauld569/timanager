import { Types } from 'mongoose';
import Vendedor from '../../src/models/Vendedor';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
beforeEach(async () => { await clearDB(); });

const baseDoc = () => ({
  nombre: 'Laura Gonzalez',
  correo: 'laura@ventas.com',
  telefono: '5512345678',
});

describe('Vendedor - creacion y validaciones', () => {
  it('crea vendedor con campos requeridos', async () => {
    const doc = await Vendedor.create(baseDoc());
    expect(doc._id).toBeDefined();
    expect(doc.nombre).toBe('Laura Gonzalez');
    expect(doc.correo).toBe('laura@ventas.com');
    expect(doc.telefono).toBe('5512345678');
  });

  it('falla si falta nombre', async () => {
    const { nombre, ...rest } = baseDoc() as Record<string, unknown>;
    await expect(Vendedor.create(rest)).rejects.toThrow(/nombre/);
  });

  it('falla si falta correo', async () => {
    const { correo, ...rest } = baseDoc() as Record<string, unknown>;
    await expect(Vendedor.create(rest)).rejects.toThrow(/correo/);
  });

  it('falla si falta telefono', async () => {
    const { telefono, ...rest } = baseDoc() as Record<string, unknown>;
    await expect(Vendedor.create(rest)).rejects.toThrow(/telefono/);
  });

  it('required de string rechaza nombre vacio', async () => {
    await expect(Vendedor.create({ ...baseDoc(), nombre: '' })).rejects.toThrow();
  });

  it('required de string rechaza correo vacio', async () => {
    await expect(Vendedor.create({ ...baseDoc(), correo: '' })).rejects.toThrow();
  });

  it('required de string rechaza telefono vacio', async () => {
    await expect(Vendedor.create({ ...baseDoc(), telefono: '' })).rejects.toThrow();
  });
});

describe('Vendedor - sin restricciones adicionales', () => {
  it('permite correos duplicados (no unique)', async () => {
    await Vendedor.create(baseDoc());
    await expect(
      Vendedor.create({ ...baseDoc(), nombre: 'Maria Perez', telefono: '5599999999' })
    ).resolves.toBeDefined();
  });

  it('permite telefonos duplicados (no unique)', async () => {
    await Vendedor.create(baseDoc());
    await expect(
      Vendedor.create({ ...baseDoc(), nombre: 'Juan Ruiz', correo: 'juan@ventas.com' })
    ).resolves.toBeDefined();
  });

  it('permite cualquier string en correo (sin regex de formato)', async () => {
    const doc = await Vendedor.create({ ...baseDoc(), correo: 'correo-invalido' });
    expect(doc.correo).toBe('correo-invalido');
  });

  it('permite cualquier string en telefono (sin regex de formato)', async () => {
    const doc = await Vendedor.create({ ...baseDoc(), telefono: 'abc' });
    expect(doc.telefono).toBe('abc');
  });
});

describe('Vendedor - lectura', () => {
  it('findById recupera el vendedor correcto', async () => {
    const created = await Vendedor.create(baseDoc());
    const found = await Vendedor.findById(created._id);
    expect(found).not.toBeNull();
    expect(found!.nombre).toBe('Laura Gonzalez');
  });

  it('find retorna todos los vendedores', async () => {
    await Vendedor.create(baseDoc());
    await Vendedor.create({ nombre: 'Pedro Diaz', correo: 'pedro@ventas.com', telefono: '5588888888' });
    const all = await Vendedor.find();
    expect(all).toHaveLength(2);
  });

  it('findOne por correo', async () => {
    await Vendedor.create(baseDoc());
    const found = await Vendedor.findOne({ correo: 'laura@ventas.com' });
    expect(found).not.toBeNull();
  });

  it('retorna null para _id inexistente', async () => {
    const found = await Vendedor.findById(new Types.ObjectId());
    expect(found).toBeNull();
  });
});

describe('Vendedor - actualizacion y eliminacion', () => {
  it('findByIdAndUpdate modifica nombre', async () => {
    const doc = await Vendedor.create(baseDoc());
    const updated = await Vendedor.findByIdAndUpdate(
      doc._id,
      { nombre: 'Laura G.' },
      { new: true }
    );
    expect(updated!.nombre).toBe('Laura G.');
  });

  it('findByIdAndUpdate modifica telefono', async () => {
    const doc = await Vendedor.create(baseDoc());
    const updated = await Vendedor.findByIdAndUpdate(
      doc._id,
      { telefono: '5500000000' },
      { new: true }
    );
    expect(updated!.telefono).toBe('5500000000');
  });

  it('findByIdAndDelete elimina el vendedor', async () => {
    const doc = await Vendedor.create(baseDoc());
    await Vendedor.findByIdAndDelete(doc._id);
    const found = await Vendedor.findById(doc._id);
    expect(found).toBeNull();
  });

  it('deleteMany elimina todos los vendedores', async () => {
    await Vendedor.create(baseDoc());
    await Vendedor.create({ nombre: 'Ana', correo: 'ana@ventas.com', telefono: '5577777777' });
    await Vendedor.deleteMany({});
    expect(await Vendedor.countDocuments()).toBe(0);
  });
});
