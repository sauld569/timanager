import { Request, Response } from 'express';

var mockFind = jest.fn();
var mockFindByIdAndUpdate = jest.fn();
var mockFindByIdAndDelete = jest.fn();
var mockSave = jest.fn();

jest.mock('../../src/models/Cliente', () => {
  const MockCliente: any = function (this: any, payload: any) {
    this.payload = payload;
    this.save = mockSave;
  };

  MockCliente.find = mockFind;
  MockCliente.findByIdAndUpdate = mockFindByIdAndUpdate;
  MockCliente.findByIdAndDelete = mockFindByIdAndDelete;

  return {
    __esModule: true,
    default: MockCliente,
  };
});

import {
  createCliente,
  deleteCliente,
  getClientes,
  updateCliente,
} from '../../src/controllers/clienteController';

function buildRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res as Response);
  res.json = jest.fn().mockReturnValue(res as Response);
  return res as Response;
}

describe('clienteController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getClientes', () => {
    it('returns clientes list when model query succeeds', async () => {
      const req = {} as Request;
      const res = buildRes();
      const clientes = [{ nombre: 'Cliente 1' }];
      mockFind.mockResolvedValue(clientes);

      await getClientes(req, res);

      expect(mockFind).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith(clientes);
    });

    it('returns 500 when model query fails', async () => {
      const req = {} as Request;
      const res = buildRes();
      mockFind.mockRejectedValue(new Error('db error'));

      await getClientes(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener clientes' });
    });
  });

  describe('createCliente', () => {
    it('creates and returns cliente with 201', async () => {
      const req = { body: { nombre: 'Nuevo Cliente' } } as Request;
      const res = buildRes();
      mockSave.mockResolvedValue(undefined);

      await createCliente(req, res);

      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it('returns 400 when save fails', async () => {
      const req = { body: { nombre: 'Nuevo Cliente' } } as Request;
      const res = buildRes();
      mockSave.mockRejectedValue(new Error('validation error'));

      await createCliente(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al crear cliente' });
    });
  });

  describe('updateCliente', () => {
    it('updates and returns cliente when id exists', async () => {
      const req = {
        params: { id: 'cliente-id' },
        body: { nombre: 'Cliente Actualizado' },
      } as unknown as Request;
      const res = buildRes();
      const updatedCliente = { _id: 'cliente-id', nombre: 'Cliente Actualizado' };
      mockFindByIdAndUpdate.mockResolvedValue(updatedCliente);

      await updateCliente(req, res);

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('cliente-id', req.body, { new: true });
      expect(res.json).toHaveBeenCalledWith(updatedCliente);
    });

    it('returns 404 when cliente does not exist', async () => {
      const req = {
        params: { id: 'missing-id' },
        body: { nombre: 'No Importa' },
      } as unknown as Request;
      const res = buildRes();
      mockFindByIdAndUpdate.mockResolvedValue(null);

      await updateCliente(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Cliente no encontrado' });
    });

    it('returns 400 when update operation throws', async () => {
      const req = {
        params: { id: 'cliente-id' },
        body: { nombre: 'Cliente Actualizado' },
      } as unknown as Request;
      const res = buildRes();
      mockFindByIdAndUpdate.mockRejectedValue(new Error('db error'));

      await updateCliente(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al actualizar cliente' });
    });
  });

  describe('deleteCliente', () => {
    it('deletes cliente and returns success message', async () => {
      const req = { params: { id: 'cliente-id' } } as unknown as Request;
      const res = buildRes();
      mockFindByIdAndDelete.mockResolvedValue({ _id: 'cliente-id' });

      await deleteCliente(req, res);

      expect(mockFindByIdAndDelete).toHaveBeenCalledWith('cliente-id');
      expect(res.json).toHaveBeenCalledWith({ message: 'Cliente eliminado' });
    });

    it('returns 404 when cliente to delete does not exist', async () => {
      const req = { params: { id: 'missing-id' } } as unknown as Request;
      const res = buildRes();
      mockFindByIdAndDelete.mockResolvedValue(null);

      await deleteCliente(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Cliente no encontrado' });
    });

    it('returns 400 when delete operation throws', async () => {
      const req = { params: { id: 'cliente-id' } } as unknown as Request;
      const res = buildRes();
      mockFindByIdAndDelete.mockRejectedValue(new Error('db error'));

      await deleteCliente(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al eliminar cliente' });
    });
  });
});
