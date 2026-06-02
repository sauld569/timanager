import { Request, Response } from 'express';

var mockFind = jest.fn();
var mockFindById = jest.fn();
var mockFindByIdAndUpdate = jest.fn();
var mockFindByIdAndDelete = jest.fn();
var mockSave = jest.fn();

jest.mock('../../src/models/Proveedor', () => {
  const MockProveedor: any = function (this: any, payload: any) {
    this.payload = payload;
    this.save = mockSave;
  };

  MockProveedor.find = mockFind;
  MockProveedor.findById = mockFindById;
  MockProveedor.findByIdAndUpdate = mockFindByIdAndUpdate;
  MockProveedor.findByIdAndDelete = mockFindByIdAndDelete;

  return {
    __esModule: true,
    default: MockProveedor,
  };
});

import {
  createProveedor,
  deleteProveedor,
  getProveedorById,
  getProveedores,
  updateProveedor,
} from '../../src/controllers/proveedorController';

function buildRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res as Response);
  res.json = jest.fn().mockReturnValue(res as Response);
  return res as Response;
}

describe('proveedorController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProveedores', () => {
    it('returns providers list when query succeeds', async () => {
      const req = {} as Request;
      const res = buildRes();
      const proveedores = [{ nombre: 'Proveedor 1' }];
      mockFind.mockResolvedValue(proveedores);

      await getProveedores(req, res);

      expect(mockFind).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith(proveedores);
    });

    it('returns 500 when query fails', async () => {
      const req = {} as Request;
      const res = buildRes();
      mockFind.mockRejectedValue(new Error('db error'));

      await getProveedores(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener proveedores' });
    });
  });

  describe('getProveedorById', () => {
    it('returns provider when id exists', async () => {
      const req = { params: { id: 'proveedor-id' } } as unknown as Request;
      const res = buildRes();
      const proveedor = { _id: 'proveedor-id', nombre: 'Proveedor' };
      mockFindById.mockResolvedValue(proveedor);

      await getProveedorById(req, res);

      expect(mockFindById).toHaveBeenCalledWith('proveedor-id');
      expect(res.json).toHaveBeenCalledWith(proveedor);
    });

    it('returns 404 when provider does not exist', async () => {
      const req = { params: { id: 'missing-id' } } as unknown as Request;
      const res = buildRes();
      mockFindById.mockResolvedValue(null);

      await getProveedorById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Proveedor no encontrado' });
    });

    it('returns 500 when lookup fails', async () => {
      const req = { params: { id: 'proveedor-id' } } as unknown as Request;
      const res = buildRes();
      mockFindById.mockRejectedValue(new Error('db error'));

      await getProveedorById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener proveedor' });
    });
  });

  describe('createProveedor', () => {
    it('creates provider and returns 201', async () => {
      const req = { body: { nombre: 'Proveedor Nuevo' } } as Request;
      const res = buildRes();
      mockSave.mockResolvedValue(undefined);

      await createProveedor(req, res);

      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it('returns 400 when create fails', async () => {
      const req = { body: { nombre: 'Proveedor Nuevo' } } as Request;
      const res = buildRes();
      mockSave.mockRejectedValue(new Error('validation error'));

      await createProveedor(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al crear proveedor' });
    });
  });

  describe('updateProveedor', () => {
    it('updates provider and returns payload', async () => {
      const req = {
        params: { id: 'proveedor-id' },
        body: { nombre: 'Proveedor Editado' },
      } as unknown as Request;
      const res = buildRes();
      const updated = { _id: 'proveedor-id', nombre: 'Proveedor Editado' };
      mockFindByIdAndUpdate.mockResolvedValue(updated);

      await updateProveedor(req, res);

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('proveedor-id', req.body, { new: true });
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('returns 404 when provider to update does not exist', async () => {
      const req = {
        params: { id: 'missing-id' },
        body: { nombre: 'X' },
      } as unknown as Request;
      const res = buildRes();
      mockFindByIdAndUpdate.mockResolvedValue(null);

      await updateProveedor(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Proveedor no encontrado' });
    });

    it('returns 400 when update fails', async () => {
      const req = {
        params: { id: 'proveedor-id' },
        body: { nombre: 'X' },
      } as unknown as Request;
      const res = buildRes();
      mockFindByIdAndUpdate.mockRejectedValue(new Error('db error'));

      await updateProveedor(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al actualizar proveedor' });
    });
  });

  describe('deleteProveedor', () => {
    it('deletes provider and returns success message', async () => {
      const req = { params: { id: 'proveedor-id' } } as unknown as Request;
      const res = buildRes();
      mockFindByIdAndDelete.mockResolvedValue({ _id: 'proveedor-id' });

      await deleteProveedor(req, res);

      expect(mockFindByIdAndDelete).toHaveBeenCalledWith('proveedor-id');
      expect(res.json).toHaveBeenCalledWith({ message: 'Proveedor eliminado exitosamente' });
    });

    it('returns 404 when provider to delete does not exist', async () => {
      const req = { params: { id: 'missing-id' } } as unknown as Request;
      const res = buildRes();
      mockFindByIdAndDelete.mockResolvedValue(null);

      await deleteProveedor(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Proveedor no encontrado' });
    });

    it('returns 400 when delete fails', async () => {
      const req = { params: { id: 'proveedor-id' } } as unknown as Request;
      const res = buildRes();
      mockFindByIdAndDelete.mockRejectedValue(new Error('db error'));

      await deleteProveedor(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al eliminar proveedor' });
    });
  });
});
