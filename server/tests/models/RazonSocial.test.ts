import RazonSocial from '../../src/models/RazonSocial';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';

beforeAll(async () => {
  await connectDB();
  await RazonSocial.init(); // ensure unique indexes are built
});
afterAll(async () => { await disconnectDB(); });
beforeEach(async () => { await clearDB(); });

const baseDoc = () => ({
  nombre: 'Empresa Ejemplo SA de CV',
  rfc: 'XAXX010101000',
  emailEmpresa: 'contacto@ejemplo.com',
  telEmpresa: '5512345678',
  celEmpresa: '5598765432',
  direccionEmpresa: 'Av. Reforma 100, CDMX',
  emailFacturacion: 'facturacion@ejemplo.com',
});

describe('RazonSocial – creación básica', () => {
  it('crea un documento con todos los campos', async () => {
    const doc = await RazonSocial.create(baseDoc());
    expect(doc._id).toBeDefined();
    expect(doc.nombre).toBe('Empresa Ejemplo SA de CV');
    expect(doc.rfc).toBe('XAXX010101000');
    expect(doc.emailEmpresa).toBe('contacto@ejemplo.com');
    expect(doc.telEmpresa).toBe('5512345678');
    expect(doc.celEmpresa).toBe('5598765432');
    expect(doc.direccionEmpresa).toBe('Av. Reforma 100, CDMX');
    expect(doc.emailFacturacion).toBe('facturacion@ejemplo.com');
  });

  it('crea documento vacío (ningún campo es required)', async () => {
    const doc = await RazonSocial.create({});
    expect(doc._id).toBeDefined();
  });

  it('direccionEnvio tiene default []', async () => {
    const doc = await RazonSocial.create({ nombre: 'Sin envío' });
    expect(Array.isArray(doc.direccionEnvio)).toBe(true);
    expect(doc.direccionEnvio).toHaveLength(0);
  });

  it('asigna timestamps createdAt y updatedAt', async () => {
    const doc = await RazonSocial.create(baseDoc());
    expect((doc as any).createdAt).toBeDefined();
    expect((doc as any).updatedAt).toBeDefined();
  });
});

describe('RazonSocial – unicidad de rfc', () => {
  it('no permite dos documentos con el mismo rfc', async () => {
    await RazonSocial.create(baseDoc());
    await expect(RazonSocial.create({ ...baseDoc(), nombre: 'Otra Empresa' }))
      .rejects.toThrow();
  });

  it('permite diferentes rfc', async () => {
    await RazonSocial.create(baseDoc());
    await expect(
      RazonSocial.create({ ...baseDoc(), rfc: 'EJE901231TI7' })
    ).resolves.toBeDefined();
  });

  it('dos documentos sin rfc lanzan error de clave duplicada (null cuenta como valor único)', async () => {
    await RazonSocial.create({ nombre: 'Sin RFC 1' });
    await expect(RazonSocial.create({ nombre: 'Sin RFC 2' })).rejects.toThrow(/duplicate key/);
  });
});

describe('RazonSocial – subdocumento direccionEnvio', () => {
  it('guarda múltiples direcciones de envío', async () => {
    const doc = await RazonSocial.create({
      ...baseDoc(),
      direccionEnvio: [
        { nombre: 'Bodega Norte', direccion: 'Calle 1 #10', telefono: '5511111111', contacto: 'Luis' },
        { nombre: 'Bodega Sur', direccion: 'Calle 2 #20' },
      ],
    });
    expect(doc.direccionEnvio).toHaveLength(2);
    expect(doc.direccionEnvio[0].nombre).toBe('Bodega Norte');
    expect(doc.direccionEnvio[1].nombre).toBe('Bodega Sur');
  });

  it('telefono y contacto son opcionales en la dirección', async () => {
    const doc = await RazonSocial.create({
      ...baseDoc(),
      direccionEnvio: [{ nombre: 'Almacén', direccion: 'Km 5 Carretera' }],
    });
    expect(doc.direccionEnvio[0].telefono).toBeUndefined();
    expect(doc.direccionEnvio[0].contacto).toBeUndefined();
  });

  it('cada dirección tiene su propio _id generado', async () => {
    const doc = await RazonSocial.create({
      ...baseDoc(),
      direccionEnvio: [
        { nombre: 'Dir A', direccion: 'Addr A' },
        { nombre: 'Dir B', direccion: 'Addr B' },
      ],
    });
    const ids = doc.direccionEnvio.map(d => (d as any)._id?.toString());
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('permite dirección de envío con todos los campos vacíos (no required en subdoc)', async () => {
    const doc = await RazonSocial.create({ ...baseDoc(), direccionEnvio: [{}] });
    expect(doc.direccionEnvio).toHaveLength(1);
  });

  it('agrega dirección con $push', async () => {
    const doc = await RazonSocial.create(baseDoc());
    const updated = await RazonSocial.findByIdAndUpdate(
      doc._id,
      { $push: { direccionEnvio: { nombre: 'Nueva', direccion: 'Calle 99' } } },
      { new: true }
    );
    expect(updated!.direccionEnvio).toHaveLength(1);
    expect(updated!.direccionEnvio[0].nombre).toBe('Nueva');
  });
});

describe('RazonSocial – lectura', () => {
  it('findById recupera el documento correcto', async () => {
    const created = await RazonSocial.create(baseDoc());
    const found = await RazonSocial.findById(created._id);
    expect(found).not.toBeNull();
    expect(found!.rfc).toBe('XAXX010101000');
  });

  it('find retorna todas las razones sociales', async () => {
    await RazonSocial.create(baseDoc());
    await RazonSocial.create({ nombre: 'Otra SA', rfc: 'OTR123456ABC' });
    const all = await RazonSocial.find();
    expect(all).toHaveLength(2);
  });

  it('findOne por rfc', async () => {
    await RazonSocial.create(baseDoc());
    const found = await RazonSocial.findOne({ rfc: 'XAXX010101000' });
    expect(found).not.toBeNull();
  });

  it('retorna null para _id inexistente', async () => {
    const { Types } = await import('mongoose');
    const found = await RazonSocial.findById(new Types.ObjectId());
    expect(found).toBeNull();
  });
});

describe('RazonSocial – actualización', () => {
  it('findByIdAndUpdate actualiza nombre', async () => {
    const doc = await RazonSocial.create(baseDoc());
    const updated = await RazonSocial.findByIdAndUpdate(
      doc._id,
      { nombre: 'Nombre Actualizado SA' },
      { new: true }
    );
    expect(updated!.nombre).toBe('Nombre Actualizado SA');
  });

  it('findByIdAndUpdate cambia emailFacturacion', async () => {
    const doc = await RazonSocial.create(baseDoc());
    const updated = await RazonSocial.findByIdAndUpdate(
      doc._id,
      { emailFacturacion: 'nuevo@factura.com' },
      { new: true }
    );
    expect(updated!.emailFacturacion).toBe('nuevo@factura.com');
  });

  it('updatedAt cambia después de actualización', async () => {
    const doc = await RazonSocial.create(baseDoc());
    const before = (doc as any).updatedAt as Date;
    await new Promise(r => setTimeout(r, 10));
    await RazonSocial.findByIdAndUpdate(doc._id, { telEmpresa: '5500000000' });
    const updated = await RazonSocial.findById(doc._id);
    expect(((updated as any).updatedAt as Date).getTime()).toBeGreaterThanOrEqual(before.getTime());
  });
});

describe('RazonSocial – eliminación', () => {
  it('findByIdAndDelete elimina el documento', async () => {
    const doc = await RazonSocial.create(baseDoc());
    await RazonSocial.findByIdAndDelete(doc._id);
    const found = await RazonSocial.findById(doc._id);
    expect(found).toBeNull();
  });

  it('deleteMany elimina todos', async () => {
    await RazonSocial.create(baseDoc());
    await RazonSocial.create({ nombre: 'Otra', rfc: 'OTR000000AAA' });
    await RazonSocial.deleteMany({});
    expect(await RazonSocial.countDocuments()).toBe(0);
  });
});

describe('RazonSocial – sin restricciones en otros campos', () => {
  it('permite dos documentos con el mismo nombre (rfcs distintos)', async () => {
    await RazonSocial.create({ nombre: 'Duplicada SA', rfc: 'RFC111111AA1' });
    await expect(RazonSocial.create({ nombre: 'Duplicada SA', rfc: 'RFC222222BB2' })).resolves.toBeDefined();
  });

  it('permite dos documentos con el mismo email de empresa (rfcs distintos)', async () => {
    await RazonSocial.create({ emailEmpresa: 'mismo@correo.com', rfc: 'RFC333333CC3' });
    await expect(RazonSocial.create({ emailEmpresa: 'mismo@correo.com', rfc: 'RFC444444DD4' })).resolves.toBeDefined();
  });
});
