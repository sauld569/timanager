import { Types } from 'mongoose';
import User from '../../src/models/User';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
beforeEach(async () => { await clearDB(); });

const baseDoc = () => ({
  username: 'admin',
  password: 'secreto123',
});

describe('User - creacion y validaciones', () => {
  it('crea un usuario con campos requeridos', async () => {
    const doc = await User.create(baseDoc());
    expect(doc._id).toBeDefined();
    expect(doc.username).toBe('admin');
    expect(doc.password).toBe('secreto123');
  });

  it('isAdmin por defecto es false', async () => {
    const doc = await User.create(baseDoc());
    expect(doc.isAdmin).toBe(false);
  });

  it('permite asignar isAdmin=true', async () => {
    const doc = await User.create({ ...baseDoc(), username: 'root', isAdmin: true });
    expect(doc.isAdmin).toBe(true);
  });

  it('falla si falta username', async () => {
    const { username, ...rest } = baseDoc() as Record<string, unknown>;
    await expect(User.create(rest)).rejects.toThrow(/username/);
  });

  it('falla si falta password', async () => {
    const { password, ...rest } = baseDoc() as Record<string, unknown>;
    await expect(User.create(rest)).rejects.toThrow(/password/);
  });

  it('falla con username duplicado (unique)', async () => {
    await User.create(baseDoc());
    await expect(User.create(baseDoc())).rejects.toThrow(/duplicate key/);
  });

  it('permite usernames distintos', async () => {
    await User.create(baseDoc());
    await expect(User.create({ ...baseDoc(), username: 'usuario2' })).resolves.toBeDefined();
  });

  it('required de string rechaza username vacio', async () => {
    await expect(User.create({ ...baseDoc(), username: '' })).rejects.toThrow();
  });

  it('required de string rechaza password vacio', async () => {
    await expect(User.create({ ...baseDoc(), password: '' })).rejects.toThrow();
  });
});

describe('User - lectura', () => {
  it('findById recupera el usuario correcto', async () => {
    const created = await User.create(baseDoc());
    const found = await User.findById(created._id);
    expect(found).not.toBeNull();
    expect(found!.username).toBe('admin');
  });

  it('find retorna todos los usuarios', async () => {
    await User.create(baseDoc());
    await User.create({ ...baseDoc(), username: 'u2' });
    const all = await User.find();
    expect(all).toHaveLength(2);
  });

  it('findOne por username', async () => {
    await User.create(baseDoc());
    const found = await User.findOne({ username: 'admin' });
    expect(found).not.toBeNull();
  });

  it('retorna null para _id inexistente', async () => {
    const found = await User.findById(new Types.ObjectId());
    expect(found).toBeNull();
  });
});

describe('User - actualizacion y eliminacion', () => {
  it('findByIdAndUpdate modifica password', async () => {
    const doc = await User.create(baseDoc());
    const updated = await User.findByIdAndUpdate(
      doc._id,
      { password: 'nuevoPass' },
      { new: true }
    );
    expect(updated!.password).toBe('nuevoPass');
  });

  it('findByIdAndUpdate cambia isAdmin', async () => {
    const doc = await User.create(baseDoc());
    const updated = await User.findByIdAndUpdate(
      doc._id,
      { isAdmin: true },
      { new: true }
    );
    expect(updated!.isAdmin).toBe(true);
  });

  it('findByIdAndDelete elimina el documento', async () => {
    const doc = await User.create(baseDoc());
    await User.findByIdAndDelete(doc._id);
    const found = await User.findById(doc._id);
    expect(found).toBeNull();
  });

  it('deleteMany elimina todos los usuarios', async () => {
    await User.create(baseDoc());
    await User.create({ ...baseDoc(), username: 'u3' });
    await User.deleteMany({});
    expect(await User.countDocuments()).toBe(0);
  });
});
