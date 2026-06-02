import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import User from '../../src/models/User';
import { isAuthenticated, isAdmin } from '../../src/middleware/auth';

describe('middleware/auth - isAuthenticated', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.restoreAllMocks();
  });

  it('returns 401 when token is missing', async () => {
    await isAuthenticated(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'No token proporcionado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid', async () => {
    req.headers = { authorization: 'Bearer bad-token' };
    jest.spyOn(jwt, 'verify').mockImplementation(() => {
      throw new Error('invalid token');
    });

    await isAuthenticated(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Token inválido' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when user is not found', async () => {
    req.headers = { authorization: 'Bearer valid-token' };
    jest.spyOn(jwt, 'verify').mockReturnValue({ id: '507f1f77bcf86cd799439011' } as any);
    jest.spyOn(User, 'findById').mockImplementation(() => Promise.resolve(null) as any);

    await isAuthenticated(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Usuario no encontrado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('sets req.user and calls next when token and user are valid', async () => {
    const fakeUser = {
      _id: '507f1f77bcf86cd799439011',
      username: 'admin',
      isAdmin: true,
    };

    req.headers = { authorization: 'Bearer valid-token' };
    jest.spyOn(jwt, 'verify').mockReturnValue({ id: fakeUser._id } as any);
    jest.spyOn(User, 'findById').mockImplementation(() => Promise.resolve(fakeUser) as any);

    await isAuthenticated(req as Request, res as Response, next);

    expect((req as any).user).toEqual(fakeUser);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalledWith(401);
  });
});

describe('middleware/auth - isAdmin', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it('returns 403 when user is missing', () => {
    isAdmin(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Acceso denegado: se requieren privilegios de administrador',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user is not admin', () => {
    (req as any).user = { username: 'user1', isAdmin: false };

    isAdmin(req as Request, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when user is admin', () => {
    (req as any).user = { username: 'admin', isAdmin: true };

    isAdmin(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
