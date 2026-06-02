import request from 'supertest';
import express, { Express } from 'express';

const mockFindOne = jest.fn();
const mockFindById = jest.fn();
const mockFindOneAndDelete = jest.fn();
const mockSave = jest.fn();

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-pass'),
  compare: jest.fn().mockResolvedValue(true),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn().mockReturnValue({ id: 'u1' }),
}));

jest.mock('../../src/models/User', () => {
  const User = function (this: any, payload: any) {
    this.username = payload.username;
    this.password = payload.password;
    this.isAdmin = payload.isAdmin ?? false;
    this._id = 'u1';
    this.save = mockSave;
    return this;
  } as any;

  User.findOne = mockFindOne;
  User.findById = mockFindById;
  User.findOneAndDelete = mockFindOneAndDelete;

  return {
    __esModule: true,
    default: User,
  };
});

import authRoutes from '../../src/routes/auth';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
});

beforeEach(() => {
  jest.clearAllMocks();
  mockSave.mockResolvedValue(undefined);
});

describe('Route wiring - auth', () => {
  it('POST /register returns 400 for missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({}).expect(400);
    expect(res.body.message).toBe('Usuario y contraseña requeridos');
  });

  it('POST /register creates user', async () => {
    mockFindOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'u', password: 'p' })
      .expect(201);

    expect(res.body.message).toBe('Usuario registrado correctamente');
    expect(mockSave).toHaveBeenCalled();
  });

  it('POST /login returns token on valid credentials', async () => {
    mockFindOne.mockResolvedValue({ _id: 'u1', username: 'u', password: 'hp', isAdmin: false });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'u', password: 'p' })
      .expect(200);

    expect(res.body.token).toBe('mock-token');
    expect(res.body.username).toBe('u');
  });

  it('GET /verify-token validates token', async () => {
    mockFindById.mockResolvedValue({ _id: 'u1', username: 'u', isAdmin: false });

    const res = await request(app)
      .get('/api/auth/verify-token')
      .set('Authorization', 'Bearer mock-token')
      .expect(200);

    expect(res.body.valid).toBe(true);
    expect(res.body.username).toBe('u');
  });
});
