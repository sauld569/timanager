import { Request, Response } from 'express';
import * as guiaController from '../../src/controllers/guiaController';

var mocks: any;

jest.mock('../../src/models/Guia', () => {
  mocks = mocks || {};
  mocks.find = jest.fn();
  mocks.save = jest.fn();
  mocks.findByIdAndUpdate = jest.fn();
  mocks.findByIdAndDelete = jest.fn();

  const MockGuia = function (this: any, payload: any) {
    Object.assign(this, payload);
    this.save = mocks.save;
  } as any;

  (MockGuia as any).find = mocks.find;
  (MockGuia as any).findByIdAndUpdate = mocks.findByIdAndUpdate;
  (MockGuia as any).findByIdAndDelete = mocks.findByIdAndDelete;

  return { __esModule: true, default: MockGuia };
});

function buildRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res as Response);
  res.json = jest.fn().mockReturnValue(res as Response);
  return res as Response;
}

describe('guiaController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGuias', () => {
    it('returns list of guias', async () => {
      const list = [{ _id: '1' }];
      mocks.find.mockResolvedValue(list);

      const req = {} as Request;
      const res = buildRes();

      await guiaController.getGuias(req, res);

      expect(res.json).toHaveBeenCalledWith(list);
    });

    it('returns 500 on error', async () => {
      mocks.find.mockRejectedValue(new Error('db'));

      const req = {} as Request;
      const res = buildRes();

      await guiaController.getGuias(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener guías' });
    });
  });

  describe('createGuia', () => {
    it('creates guia and returns 201', async () => {
      mocks.save.mockResolvedValue({ _id: 'new' });

      const req = { body: { nombre: 'G' } } as Request;
      const res = buildRes();

      await guiaController.createGuia(req, res);

      expect(mocks.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it('returns 400 on save error', async () => {
      mocks.save.mockRejectedValue(new Error('fail'));

      const req = { body: { nombre: 'G' } } as Request;
      const res = buildRes();

      await guiaController.createGuia(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al crear guía' });
    });
  });

  describe('updateGuia', () => {
    it('returns 404 when not found', async () => {
      mocks.findByIdAndUpdate.mockResolvedValue(null);

      const req = { params: { id: '1' }, body: { nombre: 'G' } } as unknown as Request;
      const res = buildRes();

      await guiaController.updateGuia(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Guía no encontrada' });
    });

    it('updates guia and returns 200', async () => {
      const updated = { _id: '1', nombre: 'Nuevo' };
      mocks.findByIdAndUpdate.mockResolvedValue(updated);

      const req = { params: { id: '1' }, body: { nombre: 'Nuevo' } } as unknown as Request;
      const res = buildRes();

      await guiaController.updateGuia(req, res);

      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('returns 400 on error', async () => {
      mocks.findByIdAndUpdate.mockRejectedValue(new Error('fail'));

      const req = { params: { id: '1' }, body: { nombre: 'Nuevo' } } as unknown as Request;
      const res = buildRes();

      await guiaController.updateGuia(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al actualizar guía' });
    });
  });

  describe('deleteGuia', () => {
    it('returns 404 when not found', async () => {
      mocks.findByIdAndDelete.mockResolvedValue(null);

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await guiaController.deleteGuia(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Guía no encontrada' });
    });

    it('deletes guia and returns success', async () => {
      mocks.findByIdAndDelete.mockResolvedValue({ _id: '1' });

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await guiaController.deleteGuia(req, res);

      expect(res.json).toHaveBeenCalledWith({ message: 'Guía eliminada' });
    });

    it('returns 400 on error', async () => {
      mocks.findByIdAndDelete.mockRejectedValue(new Error('fail'));

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await guiaController.deleteGuia(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al eliminar guía' });
    });
  });
});
