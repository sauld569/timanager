import request from 'supertest';
import express, { Express } from 'express';

jest.mock('../../src/middleware/auth', () => ({
  isAuthenticated: (_req: any, _res: any, next: any) => next(),
  isAdmin: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../src/controllers/inventoryRequestController', () => ({
  InventoryRequestController: {
    createRequest: (_req: any, res: any) => res.status(201).json({ handler: 'createRequest' }),
    getUserRequests: (_req: any, res: any) => res.status(200).json({ handler: 'getUserRequests' }),
    getPendingRequests: (_req: any, res: any) => res.status(200).json({ handler: 'getPendingRequests' }),
    processRequest: (_req: any, res: any) => res.status(200).json({ handler: 'processRequest' }),
    getRequestHistory: (_req: any, res: any) => res.status(200).json({ handler: 'getRequestHistory' }),
  },
}));

import inventoryRequestsRoutes from '../../src/routes/inventoryRequests';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/inventory-requests', inventoryRequestsRoutes);
});

describe('Route wiring - inventoryRequests', () => {
  it('POST /', async () => {
    const res = await request(app).post('/api/inventory-requests').send({}).expect(201);
    expect(res.body.handler).toBe('createRequest');
  });

  it('GET /my-requests', async () => {
    const res = await request(app).get('/api/inventory-requests/my-requests').expect(200);
    expect(res.body.handler).toBe('getUserRequests');
  });

  it('GET /pending', async () => {
    const res = await request(app).get('/api/inventory-requests/pending').expect(200);
    expect(res.body.handler).toBe('getPendingRequests');
  });

  it('POST /:requestId/process', async () => {
    const res = await request(app).post('/api/inventory-requests/1/process').send({}).expect(200);
    expect(res.body.handler).toBe('processRequest');
  });
});
