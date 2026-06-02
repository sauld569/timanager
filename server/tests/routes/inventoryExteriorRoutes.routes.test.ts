import request from 'supertest';
import express, { Express } from 'express';

const mockFind = jest.fn();
const mockSave = jest.fn();
const mockPopulate = jest.fn();
const mockFindByIdAndDelete = jest.fn();
const mockFindByIdAndUpdatePopulate = jest.fn();
const mockFindByIdAndUpdate = jest.fn();

jest.mock('../../src/models/InventoryExteriorItem', () => {
  const InventoryExteriorItem = function (this: any, payload: any) {
    this.payload = payload;
    this.save = mockSave;
    this.populate = mockPopulate;
    return this;
  } as any;

  InventoryExteriorItem.find = mockFind;
  InventoryExteriorItem.findByIdAndDelete = mockFindByIdAndDelete;
  InventoryExteriorItem.findByIdAndUpdate = mockFindByIdAndUpdate;

  return { InventoryExteriorItem };
});

import inventoryExteriorRoutes from '../../src/routes/inventoryExteriorRoutes';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/inventory-exterior', inventoryExteriorRoutes);
});

beforeEach(() => {
  jest.clearAllMocks();
  mockFindByIdAndUpdate.mockReturnValue({ populate: mockFindByIdAndUpdatePopulate });
});

describe('Route wiring - inventoryExteriorRoutes', () => {
  it('GET / returns exterior inventory items', async () => {
    mockFind.mockReturnValue({ populate: jest.fn().mockResolvedValue([{ codigo: 'EX1' }]) });

    const res = await request(app).get('/api/inventory-exterior').expect(200);

    expect(res.body).toEqual([{ codigo: 'EX1' }]);
  });

  it('POST / creates exterior inventory item', async () => {
    mockSave.mockResolvedValue(undefined);
    mockPopulate.mockResolvedValue(undefined);

    const res = await request(app).post('/api/inventory-exterior').send({ codigo: 'EX1' }).expect(200);

    expect(mockSave).toHaveBeenCalled();
    expect(mockPopulate).toHaveBeenCalledWith('razonSocial', 'nombre rfc');
    expect(res.body.payload).toEqual({ codigo: 'EX1' });
  });

  it('PUT /:id updates exterior inventory item', async () => {
    mockFindByIdAndUpdatePopulate.mockResolvedValue({ _id: '1', codigo: 'EX2' });

    const res = await request(app).put('/api/inventory-exterior/1').send({ codigo: 'EX2' }).expect(200);

    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('1', { codigo: 'EX2' }, { new: true });
    expect(res.body.codigo).toBe('EX2');
  });

  it('DELETE /:id deletes exterior inventory item', async () => {
    mockFindByIdAndDelete.mockResolvedValue(null);

    const res = await request(app).delete('/api/inventory-exterior/1').expect(200);

    expect(mockFindByIdAndDelete).toHaveBeenCalledWith('1');
    expect(res.body.message).toBe('Artículo eliminado del inventario exterior');
  });
});
