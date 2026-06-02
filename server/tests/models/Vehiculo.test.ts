import Vehiculo from '../../src/models/Vehiculo';
import { connectDB, disconnectDB, clearDB } from '../helpers/dbHelper';

beforeAll(async () => { await connectDB(); });
afterAll(async () => { await disconnectDB(); });
beforeEach(async () => { await clearDB(); });

const currentYearPlusOne = new Date().getFullYear() + 1;

const baseDoc = () => ({
  marca: 'Nissan',
  modelo: 'NP300',
  año: 2023,
  color: 'Blanco',
});

describe('Vehiculo - creacion y validaciones', () => {
  it('crea vehiculo con campos requeridos', async () => {
    const doc = await Vehiculo.create(baseDoc());
    expect(doc._id).toBeDefined();
    expect(doc.marca).toBe('Nissan');
    expect(doc.modelo).toBe('NP300');
    expect(doc.año).toBe(2023);
    expect(doc.color).toBe('Blanco');
  });

  it('activo por defecto es true', async () => {
    const doc = await Vehiculo.create(baseDoc());
    expect(doc.activo).toBe(true);
  });

  it('historialServicios por defecto es []', async () => {
    const doc = await Vehiculo.create(baseDoc());
    expect(Array.isArray(doc.historialServicios)).toBe(true);
    expect(doc.historialServicios).toHaveLength(0);
  });

  it('asigna timestamps createdAt y updatedAt', async () => {
    const doc = await Vehiculo.create(baseDoc());
    expect((doc as any).createdAt).toBeDefined();
    expect((doc as any).updatedAt).toBeDefined();
  });

  it('falla si falta marca', async () => {
    const { marca, ...rest } = baseDoc() as Record<string, unknown>;
    await expect(Vehiculo.create(rest)).rejects.toThrow(/marca/);
  });

  it('falla si falta modelo', async () => {
    const { modelo, ...rest } = baseDoc() as Record<string, unknown>;
    await expect(Vehiculo.create(rest)).rejects.toThrow(/modelo/);
  });

  it('falla si falta año', async () => {
    const { año, ...rest } = baseDoc() as Record<string, unknown>;
    await expect(Vehiculo.create(rest)).rejects.toThrow(/año/);
  });

  it('falla si falta color', async () => {
    const { color, ...rest } = baseDoc() as Record<string, unknown>;
    await expect(Vehiculo.create(rest)).rejects.toThrow(/color/);
  });

  it('rechaza año menor a 1900', async () => {
    await expect(Vehiculo.create({ ...baseDoc(), año: 1899 })).rejects.toThrow(/1900/);
  });

  it('rechaza año mayor al actual + 1', async () => {
    await expect(Vehiculo.create({ ...baseDoc(), año: currentYearPlusOne + 1 })).rejects.toThrow();
  });

  it('acepta año exactamente igual al actual + 1', async () => {
    const doc = await Vehiculo.create({ ...baseDoc(), año: currentYearPlusOne });
    expect(doc.año).toBe(currentYearPlusOne);
  });
});

describe('Vehiculo - campos con transformaciones', () => {
  it('trim en marca, modelo y color', async () => {
    const doc = await Vehiculo.create({
      ...baseDoc(),
      marca: '  Toyota  ',
      modelo: '  Hilux  ',
      color: '  Gris  ',
    });
    expect(doc.marca).toBe('Toyota');
    expect(doc.modelo).toBe('Hilux');
    expect(doc.color).toBe('Gris');
  });

  it('placas y numeroSerie se guardan en uppercase y trim', async () => {
    const doc = await Vehiculo.create({
      ...baseDoc(),
      placas: '  abc123  ',
      numeroSerie: '  xyz789  ',
    });
    expect(doc.placas).toBe('ABC123');
    expect(doc.numeroSerie).toBe('XYZ789');
  });

  it('placas es unique cuando existe valor', async () => {
    await Vehiculo.create({ ...baseDoc(), placas: 'AAA111' });
    await expect(
      Vehiculo.create({ ...baseDoc(), modelo: 'Frontier', placas: 'AAA111' })
    ).rejects.toThrow(/duplicate key/);
  });

  it('placas es sparse: permite multiples vehiculos sin placas', async () => {
    await Vehiculo.create(baseDoc());
    await expect(Vehiculo.create({ ...baseDoc(), modelo: 'Versa' })).resolves.toBeDefined();
  });
});

describe('Vehiculo - historialServicios', () => {
  it('agrega entrada de historial con fecha por defecto', async () => {
    const doc = await Vehiculo.create({
      ...baseDoc(),
      historialServicios: [{ descripcion: 'Cambio de aceite' }],
    });
    expect(doc.historialServicios).toHaveLength(1);
    expect(doc.historialServicios[0].fecha).toBeDefined();
    expect(doc.historialServicios[0].descripcion).toBe('Cambio de aceite');
  });

  it('trim en descripcion y realizadoPor del historial', async () => {
    const doc = await Vehiculo.create({
      ...baseDoc(),
      historialServicios: [{ descripcion: '  Afinacion  ', realizadoPor: '  Taller Norte  ' }],
    });
    expect(doc.historialServicios[0].descripcion).toBe('Afinacion');
    expect(doc.historialServicios[0].realizadoPor).toBe('Taller Norte');
  });

  it('rechaza kilometraje negativo en historial', async () => {
    await expect(
      Vehiculo.create({
        ...baseDoc(),
        historialServicios: [{ fecha: new Date(), kilometraje: -1 }],
      })
    ).rejects.toThrow();
  });

  it('rechaza costo negativo en historial', async () => {
    await expect(
      Vehiculo.create({
        ...baseDoc(),
        historialServicios: [{ fecha: new Date(), costo: -10 }],
      })
    ).rejects.toThrow();
  });
});

describe('Vehiculo - metodos de instancia', () => {
  it('calcularProximoServicio retorna fecha + 6 meses', async () => {
    const doc = await Vehiculo.create(baseDoc());
    const base = new Date('2026-01-15T00:00:00.000Z');
    const proxima = (doc as any).calcularProximoServicio(base) as Date;
    expect(proxima.getUTCFullYear()).toBe(2026);
    expect(proxima.getUTCMonth()).toBe(6);
  });

  it('servicioVencido retorna false cuando no hay proximoServicio', async () => {
    const doc = await Vehiculo.create(baseDoc());
    expect((doc as any).servicioVencido()).toBe(false);
  });

  it('servicioVencido retorna true cuando proximoServicio esta en el pasado', async () => {
    const doc = await Vehiculo.create({ ...baseDoc(), proximoServicio: new Date(Date.now() - 86400000) });
    expect((doc as any).servicioVencido()).toBe(true);
  });

  it('servicioVencido retorna false cuando proximoServicio esta en el futuro', async () => {
    const doc = await Vehiculo.create({ ...baseDoc(), proximoServicio: new Date(Date.now() + 86400000) });
    expect((doc as any).servicioVencido()).toBe(false);
  });

  it('diasHastaServicio retorna null cuando no hay proximoServicio', async () => {
    const doc = await Vehiculo.create(baseDoc());
    expect((doc as any).diasHastaServicio()).toBeNull();
  });

  it('diasHastaServicio retorna un numero entero cuando existe proximoServicio', async () => {
    const doc = await Vehiculo.create({ ...baseDoc(), proximoServicio: new Date(Date.now() + (3 * 86400000)) });
    const dias = (doc as any).diasHastaServicio();
    expect(typeof dias).toBe('number');
    expect(Number.isInteger(dias)).toBe(true);
    expect(dias).toBeGreaterThanOrEqual(1);
  });
});

describe('Vehiculo - lectura, actualizacion y eliminacion', () => {
  it('findById recupera el vehiculo correcto', async () => {
    const created = await Vehiculo.create(baseDoc());
    const found = await Vehiculo.findById(created._id);
    expect(found).not.toBeNull();
    expect(found!.marca).toBe('Nissan');
  });

  it('find retorna todos los vehiculos', async () => {
    await Vehiculo.create(baseDoc());
    await Vehiculo.create({ ...baseDoc(), modelo: 'March' });
    const all = await Vehiculo.find();
    expect(all).toHaveLength(2);
  });

  it('findByIdAndUpdate actualiza color', async () => {
    const doc = await Vehiculo.create(baseDoc());
    const updated = await Vehiculo.findByIdAndUpdate(doc._id, { color: 'Rojo' }, { new: true });
    expect(updated!.color).toBe('Rojo');
  });

  it('findByIdAndDelete elimina el vehiculo', async () => {
    const doc = await Vehiculo.create(baseDoc());
    await Vehiculo.findByIdAndDelete(doc._id);
    const found = await Vehiculo.findById(doc._id);
    expect(found).toBeNull();
  });
});
