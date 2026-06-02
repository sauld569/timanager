import request from 'supertest';
import express, { Express } from 'express';

const mockFind = jest.fn();
const mockSave = jest.fn();
const mockFindByIdAndUpdate = jest.fn();
const mockFindByIdAndDelete = jest.fn();

jest.mock('../../src/models/Item', () => {
  const Item = function (this: any, payload: any) {
    this.payload = payload;
    this.save = mockSave;
    return this;
  } as any;

  Item.find = mockFind;
  Item.findByIdAndUpdate = mockFindByIdAndUpdate;
  Item.findByIdAndDelete = mockFindByIdAndDelete;

  return { Item };
});

import itemRoutes from '../../src/routes/itemRoutes';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/items', itemRoutes);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Route wiring - itemRoutes', () => {
  it('GET / returns items', async () => {
    mockFind.mockResolvedValue([{ nombre: 'x' }]);

    const res = await request(app).get('/api/items').expect(200);

    expect(mockFind).toHaveBeenCalled();
    expect(res.body).toEqual([{ nombre: 'x' }]);
  });

  it('POST / creates item', async () => {
    mockSave.mockResolvedValue(undefined);

    const res = await request(app).post('/api/items').send({ nombre: 'nuevo' }).expect(200);

    expect(mockSave).toHaveBeenCalled();
    expect(res.body.payload).toEqual({ nombre: 'nuevo' });
  });

  it('PUT /:id updates item', async () => {
    mockFindByIdAndUpdate.mockResolvedValue({ _id: '1', nombre: 'upd' });

    const res = await request(app).put('/api/items/1').send({ nombre: 'upd' }).expect(200);

    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('1', { nombre: 'upd' }, { new: true });
    expect(res.body.nombre).toBe('upd');
  });

  it('DELETE /:id removes item', async () => {
    mockFindByIdAndDelete.mockResolvedValue(null);

    const res = await request(app).delete('/api/items/1').expect(200);

    expect(mockFindByIdAndDelete).toHaveBeenCalledWith('1');
    expect(res.body.message).toBe('Item eliminado');
  });
});
