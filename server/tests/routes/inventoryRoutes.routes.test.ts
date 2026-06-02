import request from 'supertest';
import express, { Express } from 'express';

const mockFind = jest.fn();
const mockSave = jest.fn();
const mockPopulate = jest.fn();
const mockFindByIdAndDelete = jest.fn();
const mockFindByIdAndUpdatePopulate = jest.fn();
const mockFindByIdAndUpdate = jest.fn();

jest.mock('../../src/models/InventoryItem', () => {
  const InventoryItem = function (this: any, payload: any) {
    this.payload = payload;
    this.save = mockSave;
    this.populate = mockPopulate;
    return this;
  } as any;

  InventoryItem.find = mockFind;
  InventoryItem.findByIdAndDelete = mockFindByIdAndDelete;
  InventoryItem.findByIdAndUpdate = mockFindByIdAndUpdate;

  return { InventoryItem };
});

import inventoryRoutes from '../../src/routes/inventoryRoutes';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/inventory', inventoryRoutes);
});

beforeEach(() => {
  jest.clearAllMocks();
  mockFindByIdAndUpdate.mockReturnValue({ populate: mockFindByIdAndUpdatePopulate });
});

describe('Route wiring - inventoryRoutes', () => {
  it('GET / returns inventory items', async () => {
    mockFind.mockReturnValue({ populate: jest.fn().mockResolvedValue([{ codigo: 'A1' }]) });

    const res = await request(app).get('/api/inventory').expect(200);

    expect(res.body).toEqual([{ codigo: 'A1' }]);
  });

  it('POST / creates inventory item', async () => {
    mockSave.mockResolvedValue(undefined);
    mockPopulate.mockResolvedValue(undefined);

    const res = await request(app).post('/api/inventory').send({ codigo: 'A1' }).expect(200);

    expect(mockSave).toHaveBeenCalled();
    expect(mockPopulate).toHaveBeenCalledWith('razonSocial', 'nombre rfc');
    expect(res.body.payload).toEqual({ codigo: 'A1' });
  });

  it('PUT /:id updates inventory item', async () => {
    mockFindByIdAndUpdatePopulate.mockResolvedValue({ _id: '1', codigo: 'UPD' });

    const res = await request(app).put('/api/inventory/1').send({ codigo: 'UPD' }).expect(200);

    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('1', { codigo: 'UPD' }, { new: true });
    expect(res.body.codigo).toBe('UPD');
  });

  it('DELETE /:id deletes inventory item', async () => {
    mockFindByIdAndDelete.mockResolvedValue(null);

    const res = await request(app).delete('/api/inventory/1').expect(200);

    expect(mockFindByIdAndDelete).toHaveBeenCalledWith('1');
    expect(res.body.message).toBe('Artículo eliminado del inventario');
  });
});
