import Proveedor from '../../src/models/Proveedor';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
beforeEach(async () => { await clearDB(); });

const baseDoc = () => ({
  empresa: 'Suministros Globales SA',
  direccion: 'Av. Industrial 45, CDMX',
  telefono: '5512345678',
  contactos: [
    { nombre: 'Juan Pérez', puesto: 'Gerente', correo: 'juan@sg.com', telefono: '5598765432' }
  ]
});

describe('Proveedor – creación básica', () => {
  it('crea un proveedor con todos los campos', async () => {
    const doc = await Proveedor.create(baseDoc());
    expect(doc._id).toBeDefined();
    expect(doc.empresa).toBe('Suministros Globales SA');
    expect(doc.direccion).toBe('Av. Industrial 45, CDMX');
    expect(doc.telefono).toBe('5512345678');
    expect(doc.contactos).toHaveLength(1);
  });

  it('permite crear un documento completamente vacío (ningún campo es required)', async () => {
    const doc = await Proveedor.create({});
    expect(doc._id).toBeDefined();
  });

  it('valor por defecto de contactos es []', async () => {
    const doc = await Proveedor.create({ empresa: 'Sin contactos SA' });
    expect(Array.isArray(doc.contactos)).toBe(true);
    expect(doc.contactos).toHaveLength(0);
  });

  it('asigna timestamps createdAt y updatedAt', async () => {
    const doc = await Proveedor.create(baseDoc());
    expect((doc as any).createdAt).toBeDefined();
    expect((doc as any).updatedAt).toBeDefined();
  });
});

describe('Proveedor – subdocumento contactos', () => {
  it('guarda múltiples contactos', async () => {
    const doc = await Proveedor.create({
      empresa: 'Multi Contactos SA',
      contactos: [
        { nombre: 'Ana López', puesto: 'Ventas', correo: 'ana@mc.com', telefono: '5511111111' },
        { nombre: 'Pedro Ruiz', puesto: 'Soporte', correo: 'pedro@mc.com', telefono: '5522222222' }
      ]
    });
    expect(doc.contactos).toHaveLength(2);
    expect(doc.contactos[0].nombre).toBe('Ana López');
    expect(doc.contactos[1].nombre).toBe('Pedro Ruiz');
  });

  it('contacto con extensión opcional incluida', async () => {
    const doc = await Proveedor.create({
      empresa: 'Empresa con Ext',
      contactos: [
        { nombre: 'Carlos', puesto: 'Director', correo: 'carlos@e.com', telefono: '5599999999', extension: '101' }
      ]
    });
    expect(doc.contactos[0].extension).toBe('101');
  });

  it('contacto sin extensión queda undefined', async () => {
    const doc = await Proveedor.create({
      empresa: 'Empresa sin Ext',
      contactos: [{ nombre: 'Luis', puesto: 'Analista', correo: 'luis@e.com', telefono: '5500000000' }]
    });
    expect(doc.contactos[0].extension).toBeUndefined();
  });

  it('permite contactos con todos los campos vacíos (no required en subdoc)', async () => {
    const doc = await Proveedor.create({
      empresa: 'Empresa X',
      contactos: [{}]
    });
    expect(doc.contactos).toHaveLength(1);
  });

  it('cada contacto tiene su propio _id generado', async () => {
    const doc = await Proveedor.create({
      empresa: 'IDs Únicos',
      contactos: [
        { nombre: 'C1', puesto: 'p1', correo: 'c1@x.com', telefono: '111' },
        { nombre: 'C2', puesto: 'p2', correo: 'c2@x.com', telefono: '222' }
      ]
    });
    const ids = doc.contactos.map(c => (c as any)._id?.toString());
    expect(ids[0]).not.toBe(ids[1]);
  });
});

describe('Proveedor – lectura', () => {
  it('findById recupera el proveedor correcto', async () => {
    const created = await Proveedor.create(baseDoc());
    const found = await Proveedor.findById(created._id);
    expect(found).not.toBeNull();
    expect(found!.empresa).toBe('Suministros Globales SA');
  });

  it('find retorna todos los proveedores', async () => {
    await Proveedor.create({ empresa: 'Prov A' });
    await Proveedor.create({ empresa: 'Prov B' });
    const all = await Proveedor.find();
    expect(all).toHaveLength(2);
  });

  it('findOne por empresa', async () => {
    await Proveedor.create({ empresa: 'Único SA' });
    const found = await Proveedor.findOne({ empresa: 'Único SA' });
    expect(found).not.toBeNull();
  });

  it('retorna null para _id inexistente', async () => {
    const { Types } = await import('mongoose');
    const found = await Proveedor.findById(new Types.ObjectId());
    expect(found).toBeNull();
  });
});

describe('Proveedor – actualización', () => {
  it('findByIdAndUpdate actualiza empresa', async () => {
    const doc = await Proveedor.create(baseDoc());
    const updated = await Proveedor.findByIdAndUpdate(
      doc._id,
      { empresa: 'Nueva Empresa SA' },
      { new: true }
    );
    expect(updated!.empresa).toBe('Nueva Empresa SA');
  });

  it('actualizar agrega un nuevo contacto al array', async () => {
    const doc = await Proveedor.create({ empresa: 'Sin Contactos' });
    const updated = await Proveedor.findByIdAndUpdate(
      doc._id,
      { $push: { contactos: { nombre: 'Nuevo', puesto: 'Jefe', correo: 'n@e.com', telefono: '5500000001' } } },
      { new: true }
    );
    expect(updated!.contactos).toHaveLength(1);
    expect(updated!.contactos[0].nombre).toBe('Nuevo');
  });

  it('updatedAt cambia después de una actualización', async () => {
    const doc = await Proveedor.create(baseDoc());
    const before = (doc as any).updatedAt as Date;
    await new Promise(r => setTimeout(r, 10));
    await Proveedor.findByIdAndUpdate(doc._id, { direccion: 'Nueva Dir 99' });
    const updated = await Proveedor.findById(doc._id);
    expect((updated as any).updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  });
});

describe('Proveedor – eliminación', () => {
  it('findByIdAndDelete elimina el documento', async () => {
    const doc = await Proveedor.create(baseDoc());
    await Proveedor.findByIdAndDelete(doc._id);
    const found = await Proveedor.findById(doc._id);
    expect(found).toBeNull();
  });

  it('deleteMany elimina todos', async () => {
    await Proveedor.create({ empresa: 'A' });
    await Proveedor.create({ empresa: 'B' });
    await Proveedor.deleteMany({});
    expect(await Proveedor.countDocuments()).toBe(0);
  });
});

describe('Proveedor – sin restricciones únicas', () => {
  it('permite dos proveedores con la misma empresa', async () => {
    await Proveedor.create({ empresa: 'Duplicada SA' });
    await expect(Proveedor.create({ empresa: 'Duplicada SA' })).resolves.toBeDefined();
    expect(await Proveedor.countDocuments()).toBe(2);
  });

  it('permite dos proveedores con el mismo teléfono', async () => {
    await Proveedor.create({ telefono: '5512345678' });
    await expect(Proveedor.create({ telefono: '5512345678' })).resolves.toBeDefined();
  });
});
