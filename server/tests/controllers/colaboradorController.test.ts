import { Request, Response } from 'express';

var mockFind = jest.fn();
var mockFindById = jest.fn();
var mockFindOne = jest.fn();
var mockFindByIdAndUpdate = jest.fn();
var mockFindByIdAndDelete = jest.fn();
var mockSave = jest.fn();

var mockObjectIdIsValid = jest.fn();
var mockRazonSocialFindById = jest.fn();
var mockMongooseModel = jest.fn(() => ({ findById: mockRazonSocialFindById }));

var mockExistsSync = jest.fn();
var mockUnlinkSync = jest.fn();

jest.mock('../../src/models/Colaborador', () => {
  const MockColaborador: any = function (this: any, payload: any) {
    Object.assign(this, payload);
    this._id = 'new-colaborador-id';
    this.save = mockSave;
  };

  MockColaborador.find = mockFind;
  MockColaborador.findById = mockFindById;
  MockColaborador.findOne = mockFindOne;
  MockColaborador.findByIdAndUpdate = mockFindByIdAndUpdate;
  MockColaborador.findByIdAndDelete = mockFindByIdAndDelete;

  return {
    __esModule: true,
    default: MockColaborador,
  };
});

jest.mock('mongoose', () => {
  const ObjectId: any = function (this: any, value: any) {
    this.value = value;
    return this;
  };
  ObjectId.isValid = mockObjectIdIsValid;

  const mongooseMock = {
    Types: { ObjectId },
    model: mockMongooseModel,
  };

  return {
    __esModule: true,
    default: mongooseMock,
    Types: { ObjectId },
    model: mockMongooseModel,
  };
});

jest.mock('fs', () => ({
  __esModule: true,
  default: {
    existsSync: (...args: any[]) => mockExistsSync(...args),
    unlinkSync: (...args: any[]) => mockUnlinkSync(...args),
  },
  existsSync: (...args: any[]) => mockExistsSync(...args),
  unlinkSync: (...args: any[]) => mockUnlinkSync(...args),
}));

import {
  createColaborador,
  deleteColaborador,
  getColaboradorById,
  getColaboradores,
  getFotografia,
  updateColaborador,
  validateNSS,
} from '../../src/controllers/colaboradorController';

function buildRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res as Response);
  res.json = jest.fn().mockReturnValue(res as Response);
  res.sendFile = jest.fn().mockImplementation((_path: string, cb?: (err?: any) => void) => {
    if (cb) cb();
    return res;
  });
  return res as Response;
}

describe('colaboradorController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockObjectIdIsValid.mockReturnValue(true);
    mockMongooseModel.mockReturnValue({ findById: mockRazonSocialFindById });
  });

  describe('validateNSS', () => {
    it('returns true only for 11 digits', () => {
      expect(validateNSS('12345678901')).toBe(true);
      expect(validateNSS('12345')).toBe(false);
      expect(validateNSS('ABCDEFGHIJK')).toBe(false);
    });
  });

  describe('getColaboradores', () => {
    it('returns sorted and populated collaborators list', async () => {
      const req = {} as Request;
      const res = buildRes();
      const data = [{ nombre: 'A' }];
      const sort = jest.fn().mockResolvedValue(data);
      const populate = jest.fn().mockReturnValue({ sort });
      mockFind.mockReturnValue({ populate });

      await getColaboradores(req, res);

      expect(mockFind).toHaveBeenCalled();
      expect(populate).toHaveBeenCalledWith('razonSocialId', 'nombre');
      expect(sort).toHaveBeenCalledWith({ numeroEmpleado: 1 });
      expect(res.json).toHaveBeenCalledWith(data);
    });

    it('returns 500 on query failure', async () => {
      const req = {} as Request;
      const res = buildRes();
      mockFind.mockImplementation(() => {
        throw new Error('db error');
      });

      await getColaboradores(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener colaboradores' });
    });
  });

  describe('getColaboradorById', () => {
    it('returns collaborator when found', async () => {
      const req = { params: { id: 'col-id' } } as unknown as Request;
      const res = buildRes();
      const collaborator = { _id: 'col-id' };
      const populate = jest.fn().mockResolvedValue(collaborator);
      mockFindById.mockReturnValue({ populate });

      await getColaboradorById(req, res);

      expect(mockFindById).toHaveBeenCalledWith('col-id');
      expect(res.json).toHaveBeenCalledWith(collaborator);
    });

    it('returns 404 when not found', async () => {
      const req = { params: { id: 'missing-id' } } as unknown as Request;
      const res = buildRes();
      const populate = jest.fn().mockResolvedValue(null);
      mockFindById.mockReturnValue({ populate });

      await getColaboradorById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Colaborador no encontrado' });
    });
  });

  describe('createColaborador', () => {
    it('returns 400 when NSS format is invalid', async () => {
      const req = {
        body: { nss: '123', razonSocialId: 'abc', fechaAltaIMSS: '2026-03-17' },
      } as unknown as Request;
      const res = buildRes();

      await createColaborador(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'El NSS debe contener exactamente 11 dígitos' });
    });

    it('returns 400 when NSS is duplicated', async () => {
      const req = {
        body: { nss: '12345678901', razonSocialId: 'abc', fechaAltaIMSS: '2026-03-17' },
      } as unknown as Request;
      const res = buildRes();
      mockFindOne.mockResolvedValue({ _id: 'existing' });

      await createColaborador(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'El NSS ya está registrado' });
    });

    it('returns 400 when razonSocialId is invalid', async () => {
      const req = {
        body: { nss: '12345678901', razonSocialId: 'invalid-id', fechaAltaIMSS: '2026-03-17' },
      } as unknown as Request;
      const res = buildRes();
      mockFindOne.mockResolvedValue(null);
      mockObjectIdIsValid.mockReturnValue(false);

      await createColaborador(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'ID de razón social inválido' });
    });

    it('returns 400 when razon social does not exist', async () => {
      const req = {
        body: { nss: '12345678901', razonSocialId: 'valid-id', fechaAltaIMSS: '2026-03-17' },
      } as unknown as Request;
      const res = buildRes();
      mockFindOne.mockResolvedValue(null);
      mockObjectIdIsValid.mockReturnValue(true);
      mockRazonSocialFindById.mockResolvedValue(null);

      await createColaborador(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'La razón social seleccionada no existe' });
    });
  });

  describe('updateColaborador', () => {
    it('returns updated collaborator when update succeeds', async () => {
      const req = {
        params: { id: 'col-id' },
        body: { nss: '12345678901', razonSocialId: 'valid-id' },
      } as unknown as Request;
      const res = buildRes();
      mockFindOne.mockResolvedValue(null);
      const populate = jest.fn().mockResolvedValue({ _id: 'col-id' });
      mockFindByIdAndUpdate.mockReturnValue({ populate });

      await updateColaborador(req, res);

      expect(mockFindByIdAndUpdate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ _id: 'col-id' });
    });

    it('returns 404 when collaborator does not exist', async () => {
      const req = {
        params: { id: 'missing-id' },
        body: { nss: '12345678901' },
      } as unknown as Request;
      const res = buildRes();
      mockFindOne.mockResolvedValue(null);
      const populate = jest.fn().mockResolvedValue(null);
      mockFindByIdAndUpdate.mockReturnValue({ populate });

      await updateColaborador(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Colaborador no encontrado' });
    });
  });

  describe('deleteColaborador', () => {
    it('returns 404 when collaborator does not exist', async () => {
      const req = { params: { id: 'missing-id' } } as unknown as Request;
      const res = buildRes();
      mockFindById.mockResolvedValue(null);

      await deleteColaborador(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Colaborador no encontrado' });
    });

    it('deletes collaborator and returns success message', async () => {
      const req = { params: { id: 'col-id' } } as unknown as Request;
      const res = buildRes();
      mockFindById.mockResolvedValue({ _id: 'col-id', fotografia: '' });
      mockFindByIdAndDelete.mockResolvedValue({ _id: 'col-id' });

      await deleteColaborador(req, res);

      expect(mockFindByIdAndDelete).toHaveBeenCalledWith('col-id');
      expect(res.json).toHaveBeenCalledWith({ message: 'Colaborador eliminado correctamente' });
    });
  });

  describe('getFotografia', () => {
    it('returns 404 when file is missing', async () => {
      const req = { params: { nombre: 'missing.png' } } as unknown as Request;
      const res = buildRes();
      mockExistsSync.mockReturnValue(false);

      await getFotografia(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Foto no encontrada' }));
    });

    it('returns 500 when sendFile callback returns error', async () => {
      const req = { params: { nombre: 'foto.png' } } as unknown as Request;
      const res = buildRes();
      mockExistsSync.mockReturnValue(true);
      (res.sendFile as jest.Mock).mockImplementationOnce((_path: string, cb?: (err?: any) => void) => {
        if (cb) cb(new Error('stream error'));
        return res;
      });

      await getFotografia(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al enviar la foto' });
    });
  });
});
