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

jest.mock('../../src/models/InventoryExteriorItem', () => ({
  InventoryExteriorItem: {
    findById: mockFindById,
  },
}));

jest.mock('../../src/models/InventoryExteriorMovement', () => ({
  InventoryExteriorMovement: {
    create: mockCreate,
    find: mockFind,
  },
}));

import inventoryMovementsExteriorRoutes from '../../src/routes/inventoryMovementsExteriorRoutes';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/inventory-movements-exterior', inventoryMovementsExteriorRoutes);
});

beforeEach(() => {
  jest.clearAllMocks();
  mockFind.mockReturnValue({ populate: mockFindPopulate });
});

describe('Route wiring - inventoryMovementsExteriorRoutes', () => {
  it('POST / returns 404 when item is missing', async () => {
    mockFindById.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/inventory-movements-exterior')
      .send({ itemId: 'missing', tipo: 'entrada', cantidad: 1 })
      .expect(404);

    expect(res.body.error).toBe('Item no encontrado');
  });

  it('POST / creates exterior movement when item exists', async () => {
    mockFindById.mockResolvedValue({ _id: 'item1' });
    mockCreate.mockResolvedValue({ ok: true });

    const res = await request(app)
      .post('/api/inventory-movements-exterior')
      .send({ itemId: 'item1', tipo: 'entrada', cantidad: 1 })
      .expect(201);

    expect(mockCreate).toHaveBeenCalled();
    expect(res.body.ok).toBe(true);
  });

  it('GET / returns exterior movement list', async () => {
    mockFindPopulate.mockResolvedValue([{ tipo: 'entrada' }]);

    const res = await request(app).get('/api/inventory-movements-exterior').expect(200);

    expect(mockFind).toHaveBeenCalled();
    expect(res.body).toEqual([{ tipo: 'entrada' }]);
  });
});
