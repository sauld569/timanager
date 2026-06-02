import request from 'supertest';
import express, { Express } from 'express';

const mockFindById = jest.fn();
const mockCreate = jest.fn();
const mockFind = jest.fn();
const mockFindPopulate = jest.fn();

jest.mock('../../src/routes/auth', () => ({
  authMiddleware: (_req: any, _res: any, next: any) => {
    _req.user = { username: 'tester' };
    next();
  },
}));

jest.mock('../../src/models/InventoryItem', () => ({
  InventoryItem: {
    findById: mockFindById,
  },
}));

jest.mock('../../src/models/InventoryMovement', () => ({
  InventoryMovement: {
    create: mockCreate,
    find: mockFind,
  },
}));

import inventoryMovementsRoutes from '../../src/routes/inventoryMovementsRoutes';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/inventory-movements', inventoryMovementsRoutes);
});

beforeEach(() => {
  jest.clearAllMocks();
  mockFind.mockReturnValue({ populate: mockFindPopulate });
});

describe('Route wiring - inventoryMovementsRoutes', () => {
  it('POST / returns 404 when item is missing', async () => {
    mockFindById.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/inventory-movements')
      .send({ itemId: 'missing', tipo: 'entrada', cantidad: 1 })
      .expect(404);

    expect(res.body.error).toBe('Item no encontrado');
  });

  it('POST / creates movement when item exists', async () => {
    mockFindById.mockResolvedValue({ _id: 'item1' });
    mockCreate.mockResolvedValue({ ok: true });

    const res = await request(app)
      .post('/api/inventory-movements')
      .send({ itemId: 'item1', tipo: 'entrada', cantidad: 1 })
      .expect(201);

    expect(mockCreate).toHaveBeenCalled();
    expect(res.body.ok).toBe(true);
  });

  it('GET / returns movement list', async () => {
    mockFindPopulate.mockResolvedValue([{ tipo: 'entrada' }]);

    const res = await request(app).get('/api/inventory-movements').expect(200);

    expect(mockFind).toHaveBeenCalled();
    expect(res.body).toEqual([{ tipo: 'entrada' }]);
  });
});
