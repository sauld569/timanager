import { Request, Response } from 'express';
import * as herramientaController from '../../src/controllers/herramientaController';

var mocks: any;

jest.mock('../../src/models/Herramienta', () => {
  mocks = mocks || {};
  mocks.find = jest.fn();
  mocks.findOne = jest.fn();
  mocks.findByIdAndUpdate = jest.fn();
  mocks.save = jest.fn();

  const MockHerramienta = function (this: any, payload: any) {
    Object.assign(this, payload);
    this.save = mocks.save;
  } as any;

  (MockHerramienta as any).find = mocks.find;
  (MockHerramienta as any).findOne = mocks.findOne;
  (MockHerramienta as any).findByIdAndUpdate = mocks.findByIdAndUpdate;

  return { __esModule: true, default: MockHerramienta };
});

jest.mock('../../src/services/herramientasPdfGenerator', () => {
  mocks = mocks || {};
  mocks.generatePDF = jest.fn().mockResolvedValue(Buffer.from('PDF'));
  return { __esModule: true, generatePDF: mocks.generatePDF };
});

jest.mock('fs', () => {
  mocks = mocks || {};
  const api = {
    existsSync: jest.fn(),
    readFileSync: jest.fn()
  };
  return {
    __esModule: true,
    default: api,
    existsSync: api.existsSync,
    readFileSync: api.readFileSync
  };
});

jest.mock('mongoose', () => {
  mocks = mocks || {};
  mocks.mongooseModel = jest.fn();
  mocks.connection = { readyState: 1 };
  mocks.isValid = jest.fn().mockReturnValue(true);
  return {
    __esModule: true,
    default: { model: mocks.mongooseModel, connection: mocks.connection, Types: { ObjectId: { isValid: mocks.isValid } } },
    model: mocks.mongooseModel,
    connection: mocks.connection,
    Types: { ObjectId: { isValid: mocks.isValid } }
  };
});

function buildRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res as Response);
  res.json = jest.fn().mockReturnValue(res as Response);
  res.setHeader = jest.fn().mockReturnValue(res as Response);
  res.send = jest.fn().mockReturnValue(res as Response);
  return res as Response;
}

describe('herramientaController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getHerramientas', () => {
    it('returns active herramientas', async () => {
      const list = [{ _id: '1' }];
      mocks.find.mockResolvedValue(list);

      const req = {} as Request;
      const res = buildRes();

      await herramientaController.getHerramientas(req, res);

      expect(mocks.find).toHaveBeenCalledWith({ activo: true });
      expect(res.json).toHaveBeenCalledWith(list);
    });

    it('returns 500 on error', async () => {
      mocks.find.mockRejectedValue(new Error('db'));

      const req = {} as Request;
      const res = buildRes();

      await herramientaController.getHerramientas(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error al obtener herramientas' })
      );
    });
  });

  describe('getHerramientasByColaborador', () => {
    it('returns herramientas for colaborador', async () => {
      const list = [{ _id: '1' }];
      mocks.find.mockResolvedValue(list);

      const req = { params: { colaboradorId: 'c1' } } as unknown as Request;
      const res = buildRes();

      await herramientaController.getHerramientasByColaborador(req, res);

      expect(mocks.find).toHaveBeenCalledWith({ colaboradorId: 'c1', activo: true });
      expect(res.json).toHaveBeenCalledWith(list);
    });

    it('returns 500 on error', async () => {
      mocks.find.mockRejectedValue(new Error('db'));

      const req = { params: { colaboradorId: 'c1' } } as unknown as Request;
      const res = buildRes();

      await herramientaController.getHerramientasByColaborador(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error al obtener herramientas del colaborador' })
      );
    });
  });

  describe('createHerramienta', () => {
    it('returns 400 when serial exists', async () => {
      mocks.findOne.mockResolvedValue({ _id: 'dup' });

      const req = { body: { serialNumber: 'SN1' } } as Request;
      const res = buildRes();

      await herramientaController.createHerramienta(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Ya existe una herramienta con este número de serie' });
    });

    it('creates herramienta and returns 201', async () => {
      mocks.findOne.mockResolvedValue(null);
      mocks.save.mockResolvedValue({ _id: 'new' });

      const req = { body: { nombre: 'H', serialNumber: 'SN2' } } as Request;
      const res = buildRes();

      await herramientaController.createHerramienta(req, res);

      expect(mocks.findOne).toHaveBeenCalledWith({ serialNumber: 'SN2' });
      expect(mocks.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it('returns 500 on error', async () => {
      mocks.findOne.mockRejectedValue(new Error('fail'));

      const req = { body: { serialNumber: 'SN2' } } as Request;
      const res = buildRes();

      await herramientaController.createHerramienta(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error al crear herramienta' })
      );
    });
  });

  describe('updateHerramienta', () => {
    it('returns 400 when serial duplicate', async () => {
      mocks.findOne.mockResolvedValue({ _id: 'other' });

      const req = { params: { id: '1' }, body: { serialNumber: 'SNX' } } as unknown as Request;
      const res = buildRes();

      await herramientaController.updateHerramienta(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Ya existe una herramienta con este número de serie' });
    });

    it('returns 404 when not found', async () => {
      mocks.findOne.mockResolvedValue(null);
      mocks.findByIdAndUpdate.mockResolvedValue(null);

      const req = { params: { id: '1' }, body: { nombre: 'H' } } as unknown as Request;
      const res = buildRes();

      await herramientaController.updateHerramienta(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Herramienta no encontrada' });
    });

    it('updates and returns herramienta', async () => {
      const updated = { _id: '1', nombre: 'Nuevo' };
      mocks.findOne.mockResolvedValue(null);
      mocks.findByIdAndUpdate.mockResolvedValue(updated);

      const req = { params: { id: '1' }, body: { nombre: 'Nuevo' } } as unknown as Request;
      const res = buildRes();

      await herramientaController.updateHerramienta(req, res);

      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('returns 500 on error', async () => {
      mocks.findOne.mockResolvedValue(null);
      mocks.findByIdAndUpdate.mockRejectedValue(new Error('fail'));

      const req = { params: { id: '1' }, body: { nombre: 'Nuevo' } } as unknown as Request;
      const res = buildRes();

      await herramientaController.updateHerramienta(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error al actualizar herramienta' })
      );
    });
  });

  describe('deleteHerramienta', () => {
    it('returns 404 when not found', async () => {
      mocks.findByIdAndUpdate.mockResolvedValue(null);

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await herramientaController.deleteHerramienta(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Herramienta no encontrada' });
    });

    it('marks as inactive and returns success', async () => {
      mocks.findByIdAndUpdate.mockResolvedValue({ _id: '1', activo: false });

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await herramientaController.deleteHerramienta(req, res);

      expect(mocks.findByIdAndUpdate).toHaveBeenCalledWith('1', { activo: false }, { new: true });
      expect(res.json).toHaveBeenCalledWith({ message: 'Herramienta eliminada correctamente' });
    });

    it('returns 500 on error', async () => {
      mocks.findByIdAndUpdate.mockRejectedValue(new Error('fail'));

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await herramientaController.deleteHerramienta(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error al eliminar herramienta' })
      );
    });
  });

  describe('generateHerramientasPDF', () => {
    it('returns 500 when no db connection', async () => {
      mocks.connection.readyState = 0;

      const req = { params: { colaboradorId: 'c1' } } as unknown as Request;
      const res = buildRes();

      await herramientaController.generateHerramientasPDF(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error de conexión a la base de datos' });
    });

    it('returns 400 for invalid colaborador id', async () => {
      mocks.connection.readyState = 1;
      mocks.isValid.mockReturnValue(false);

      const req = { params: { colaboradorId: 'bad' } } as unknown as Request;
      const res = buildRes();

      await herramientaController.generateHerramientasPDF(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'ID de colaborador inválido' });
    });

    it('returns 404 when colaborador not found', async () => {
      mocks.connection.readyState = 1;
      mocks.isValid.mockReturnValue(true);
      mocks.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

      // Mock Colaborador model
      const mockColabModel = { findById: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) };
      mocks.mongooseModel.mockReturnValue(mockColabModel);

      const req = { params: { colaboradorId: 'c1' } } as unknown as Request;
      const res = buildRes();

      await herramientaController.generateHerramientasPDF(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Colaborador no encontrado' });
    });

    it('generates pdf and sends buffer', async () => {
      mocks.connection.readyState = 1;
      mocks.isValid.mockReturnValue(true);
      mocks.find.mockReturnValue({ lean: jest.fn().mockResolvedValue([{ valor: 10, fechaAsignacion: new Date() }]) });

      const mockColabModel = { findById: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ nombre: 'Colab', numeroEmpleado: '123' }) }) };
      mocks.mongooseModel.mockReturnValue(mockColabModel);

      const fsMock = require('fs');
      fsMock.existsSync.mockReturnValue(false);

      const req = { params: { colaboradorId: 'c1' } } as unknown as Request;
      const res = buildRes();

      await herramientaController.generateHerramientasPDF(req, res);

      expect(mocks.generatePDF).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('returns 500 on error', async () => {
      mocks.connection.readyState = 1;
      mocks.isValid.mockReturnValue(true);
      mocks.find.mockReturnValue({ lean: jest.fn().mockRejectedValue(new Error('fail')) });

      const req = { params: { colaboradorId: 'c1' } } as unknown as Request;
      const res = buildRes();

      await herramientaController.generateHerramientasPDF(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Error al generar el PDF de herramientas' });
    });
  });
});
