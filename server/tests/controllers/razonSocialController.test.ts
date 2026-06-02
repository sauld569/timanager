import { Request, Response } from 'express';

var mockFind = jest.fn();
var mockFindById = jest.fn();
var mockFindOne = jest.fn();
var mockFindByIdAndUpdate = jest.fn();
var mockFindByIdAndDelete = jest.fn();
var mockSave = jest.fn();

jest.mock('../../src/models/RazonSocial', () => {
  const MockRazonSocial: any = function (this: any, payload: any) {
    this.payload = payload;
    this.save = mockSave;
  };

  MockRazonSocial.find = mockFind;
  MockRazonSocial.findById = mockFindById;
  MockRazonSocial.findOne = mockFindOne;
  MockRazonSocial.findByIdAndUpdate = mockFindByIdAndUpdate;
  MockRazonSocial.findByIdAndDelete = mockFindByIdAndDelete;

  return {
    __esModule: true,
    default: MockRazonSocial,
  };
});

import {
  createRazonSocial,
  deleteRazonSocial,
  getRazonSocialById,
  getRazonSocialByRfc,
  getRazonesSociales,
  updateRazonSocial,
} from '../../src/controllers/razonSocialController';

function buildRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res as Response);
  res.json = jest.fn().mockReturnValue(res as Response);
  return res as Response;
}

describe('razonSocialController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRazonesSociales', () => {
    it('returns list when query succeeds', async () => {
      const req = {} as Request;
      const res = buildRes();
      const data = [{ nombre: 'RS 1' }];
      mockFind.mockResolvedValue(data);

      await getRazonesSociales(req, res);

      expect(mockFind).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith(data);
    });

    it('returns 500 when query fails', async () => {
      const req = {} as Request;
      const res = buildRes();
      mockFind.mockRejectedValue(new Error('db error'));

      await getRazonesSociales(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener razones sociales' });
    });
  });

  describe('getRazonSocialById', () => {
    it('returns item when it exists', async () => {
      const req = { params: { id: 'rs-id' } } as unknown as Request;
      const res = buildRes();
      const doc = { _id: 'rs-id', nombre: 'RS 1' };
      mockFindById.mockResolvedValue(doc);

      await getRazonSocialById(req, res);

      expect(mockFindById).toHaveBeenCalledWith('rs-id');
      expect(res.json).toHaveBeenCalledWith(doc);
    });

    it('returns 404 when item does not exist', async () => {
      const req = { params: { id: 'missing-id' } } as unknown as Request;
      const res = buildRes();
      mockFindById.mockResolvedValue(null);

      await getRazonSocialById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Razón social no encontrada' });
    });

    it('returns 500 when lookup fails', async () => {
      const req = { params: { id: 'rs-id' } } as unknown as Request;
      const res = buildRes();
      mockFindById.mockRejectedValue(new Error('db error'));

      await getRazonSocialById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener razón social' });
    });
  });

  describe('getRazonSocialByRfc', () => {
    it('returns item when RFC exists', async () => {
      const req = { params: { rfc: 'ABC123' } } as unknown as Request;
      const res = buildRes();
      const doc = { _id: 'rs-id', rfc: 'ABC123' };
      mockFindOne.mockResolvedValue(doc);

      await getRazonSocialByRfc(req, res);

      expect(mockFindOne).toHaveBeenCalledWith({ rfc: 'ABC123' });
      expect(res.json).toHaveBeenCalledWith(doc);
    });

    it('returns 404 when RFC does not exist', async () => {
      const req = { params: { rfc: 'NOTFOUND' } } as unknown as Request;
      const res = buildRes();
      mockFindOne.mockResolvedValue(null);

      await getRazonSocialByRfc(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Razón social no encontrada' });
    });

    it('returns 500 when lookup by RFC fails', async () => {
      const req = { params: { rfc: 'ABC123' } } as unknown as Request;
      const res = buildRes();
      mockFindOne.mockRejectedValue(new Error('db error'));

      await getRazonSocialByRfc(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener razón social' });
    });
  });

  describe('createRazonSocial', () => {
    it('creates item and returns 201', async () => {
      const req = { body: { nombre: 'Nueva RS', rfc: 'AAA010101AAA' } } as Request;
      const res = buildRes();
      mockSave.mockResolvedValue(undefined);

      await createRazonSocial(req, res);

      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it('returns 400 with duplicate RFC message for code 11000', async () => {
      const req = { body: { nombre: 'Nueva RS', rfc: 'AAA010101AAA' } } as Request;
      const res = buildRes();
      mockSave.mockRejectedValue({ code: 11000 });

      await createRazonSocial(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Ya existe una razón social con este RFC' });
    });

    it('returns generic 400 when create fails for other reasons', async () => {
      const req = { body: { nombre: 'Nueva RS', rfc: 'AAA010101AAA' } } as Request;
      const res = buildRes();
      mockSave.mockRejectedValue(new Error('validation error'));

      await createRazonSocial(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al crear razón social' });
    });
  });

  describe('updateRazonSocial', () => {
    it('updates item and returns payload', async () => {
      const req = {
        params: { id: 'rs-id' },
        body: { nombre: 'Actualizada' },
      } as unknown as Request;
      const res = buildRes();
      const updated = { _id: 'rs-id', nombre: 'Actualizada' };
      mockFindByIdAndUpdate.mockResolvedValue(updated);

      await updateRazonSocial(req, res);

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('rs-id', req.body, { new: true });
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('returns 404 when item to update does not exist', async () => {
      const req = {
        params: { id: 'missing-id' },
        body: { nombre: 'Actualizada' },
      } as unknown as Request;
      const res = buildRes();
      mockFindByIdAndUpdate.mockResolvedValue(null);

      await updateRazonSocial(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Razón social no encontrada' });
    });

    it('returns 400 with duplicate RFC message for code 11000', async () => {
      const req = {
        params: { id: 'rs-id' },
        body: { rfc: 'AAA010101AAA' },
      } as unknown as Request;
      const res = buildRes();
      mockFindByIdAndUpdate.mockRejectedValue({ code: 11000 });

      await updateRazonSocial(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Ya existe una razón social con este RFC' });
    });

    it('returns generic 400 when update fails for other reasons', async () => {
      const req = {
        params: { id: 'rs-id' },
        body: { nombre: 'Actualizada' },
      } as unknown as Request;
      const res = buildRes();
      mockFindByIdAndUpdate.mockRejectedValue(new Error('db error'));

      await updateRazonSocial(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al actualizar razón social' });
    });
  });

  describe('deleteRazonSocial', () => {
    it('deletes item and returns success message', async () => {
      const req = { params: { id: 'rs-id' } } as unknown as Request;
      const res = buildRes();
      mockFindByIdAndDelete.mockResolvedValue({ _id: 'rs-id' });

      await deleteRazonSocial(req, res);

      expect(mockFindByIdAndDelete).toHaveBeenCalledWith('rs-id');
      expect(res.json).toHaveBeenCalledWith({ message: 'Razón social eliminada exitosamente' });
    });

    it('returns 404 when item to delete does not exist', async () => {
      const req = { params: { id: 'missing-id' } } as unknown as Request;
      const res = buildRes();
      mockFindByIdAndDelete.mockResolvedValue(null);

      await deleteRazonSocial(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Razón social no encontrada' });
    });

    it('returns 400 when delete fails', async () => {
      const req = { params: { id: 'rs-id' } } as unknown as Request;
      const res = buildRes();
      mockFindByIdAndDelete.mockRejectedValue(new Error('db error'));

      await deleteRazonSocial(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al eliminar razón social' });
    });
  });
});
