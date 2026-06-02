import { Request, Response } from 'express';

var mockSolicitudFind = jest.fn();
var mockSolicitudFindByIdAndUpdate = jest.fn();
var mockSolicitudFindByIdAndDelete = jest.fn();
var mockSolicitudSave = jest.fn();

var mockHerramientaFindById = jest.fn();
var mockHerramientaFindByIdAndUpdate = jest.fn();
var mockHerramientaSave = jest.fn();

var mockObjectIdIsValid = jest.fn();

jest.mock('../../src/models/Solicitud', () => {
  const MockSolicitud: any = function (this: any, payload: any) {
    Object.assign(this, payload);
    this.save = mockSolicitudSave;
  };

  MockSolicitud.find = mockSolicitudFind;
  MockSolicitud.findByIdAndUpdate = mockSolicitudFindByIdAndUpdate;
  MockSolicitud.findByIdAndDelete = mockSolicitudFindByIdAndDelete;

  return {
    __esModule: true,
    default: MockSolicitud,
  };
});

jest.mock('../../src/models/Herramienta', () => {
  const MockHerramienta: any = function (this: any, payload: any) {
    Object.assign(this, payload);
    this._id = 'herr-new-id';
    this.save = mockHerramientaSave;
  };

  MockHerramienta.findById = mockHerramientaFindById;
  MockHerramienta.findByIdAndUpdate = mockHerramientaFindByIdAndUpdate;

  return {
    __esModule: true,
    default: MockHerramienta,
  };
});

jest.mock('mongoose', () => ({
  __esModule: true,
  default: {
    Types: {
      ObjectId: {
        isValid: (...args: any[]) => mockObjectIdIsValid(...args),
      },
    },
  },
  Types: {
    ObjectId: {
      isValid: (...args: any[]) => mockObjectIdIsValid(...args),
    },
  },
}));

import {
  actualizarSolicitud,
  crearSolicitud,
  eliminarSolicitud,
  obtenerMisSolicitudesHerramientas,
  obtenerSolicitudes,
} from '../../src/controllers/solicitudController';

function buildRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res as Response);
  res.json = jest.fn().mockReturnValue(res as Response);
  return res as Response;
}

describe('solicitudController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockObjectIdIsValid.mockReturnValue(true);
  });

  describe('crearSolicitud', () => {
    it('creates solicitud with 201', async () => {
      const req = { body: { tipo: 'general', accion: 'Agregar' } } as Request;
      const res = buildRes();
      mockSolicitudSave.mockResolvedValue(undefined);

      await crearSolicitud(req, res);

      expect(mockSolicitudSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it('adds detallesOriginal when tool modification request is made', async () => {
      const req = {
        body: { tipo: 'herramienta', accion: 'Modificar', recursoId: 'h1' },
      } as Request;
      const res = buildRes();
      mockHerramientaFindById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          nombre: 'Taladro',
          marca: 'Marca',
          modelo: 'X',
          valor: 100,
          serialNumber: 'SN1',
        }),
      });
      mockSolicitudSave.mockResolvedValue(undefined);

      await crearSolicitud(req, res);

      expect(mockHerramientaFindById).toHaveBeenCalledWith('h1');
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('returns 400 when create fails', async () => {
      const req = { body: { tipo: 'general' } } as Request;
      const res = buildRes();
      mockSolicitudSave.mockRejectedValue(new Error('save error'));

      await crearSolicitud(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Error al crear solicitud' }));
    });
  });

  describe('obtenerSolicitudes', () => {
    it('returns mapped solicitudes list', async () => {
      const req = {} as Request;
      const res = buildRes();
      const baseDocs = [
        {
          tipo: 'herramienta',
          colaboradorId: { nombre: 'Colaborador 1' },
          recursoId: 'h1',
          detalles: null,
          accion: 'Agregar',
          toObject: () => ({
            tipo: 'herramienta',
            colaboradorId: { nombre: 'Colaborador 1' },
            recursoId: 'h1',
            detalles: null,
            accion: 'Agregar',
          }),
        },
      ];

      mockSolicitudFind.mockReturnValue({
        populate: jest.fn().mockResolvedValue(baseDocs),
      });
      mockHerramientaFindById.mockReturnValue({
        select: jest.fn().mockResolvedValue({
          nombre: 'Taladro',
          marca: 'Marca',
          modelo: 'X',
          serialNumber: 'SN1',
          valor: 100,
        }),
      });

      await obtenerSolicitudes(req, res);

      expect(res.json).toHaveBeenCalled();
      const payload = (res.json as jest.Mock).mock.calls[0][0];
      expect(payload[0].colaboradorNombre).toBe('Colaborador 1');
      expect(payload[0].recursoNombre).toBe('Taladro');
    });

    it('returns 500 when query fails', async () => {
      const req = {} as Request;
      const res = buildRes();
      mockSolicitudFind.mockImplementation(() => {
        throw new Error('query error');
      });

      await obtenerSolicitudes(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener solicitudes' });
    });
  });

  describe('obtenerMisSolicitudesHerramientas', () => {
    it('returns tool solicitudes list', async () => {
      const req = {} as Request;
      const res = buildRes();
      const next = jest.fn();
      const baseDocs = [
        {
          tipo: 'herramienta',
          colaboradorId: { nombre: 'Colaborador 1' },
          recursoId: 'h1',
          detalles: { nombre: 'Taladro' },
          accion: 'Agregar',
          toObject: () => ({
            tipo: 'herramienta',
            colaboradorId: { nombre: 'Colaborador 1' },
            recursoId: 'h1',
            detalles: { nombre: 'Taladro' },
            accion: 'Agregar',
          }),
        },
      ];

      const sort = jest.fn().mockResolvedValue(baseDocs);
      const populate = jest.fn().mockReturnValue({ sort });
      mockSolicitudFind.mockReturnValue({ populate });
      mockHerramientaFindById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });

      await obtenerMisSolicitudesHerramientas(req, res, next);

      expect(mockSolicitudFind).toHaveBeenCalledWith({ tipo: 'herramienta' });
      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('actualizarSolicitud', () => {
    it('updates solicitud and returns payload', async () => {
      const req = {
        params: { id: 's1' },
        body: { estado: 'pendiente' },
      } as unknown as Request;
      const res = buildRes();
      mockSolicitudFindByIdAndUpdate.mockResolvedValue({ _id: 's1', estado: 'pendiente' });

      await actualizarSolicitud(req, res);

      expect(mockSolicitudFindByIdAndUpdate).toHaveBeenCalledWith('s1', { estado: 'pendiente' }, { new: true });
      expect(res.json).toHaveBeenCalledWith({ _id: 's1', estado: 'pendiente' });
    });

    it('processes tool creation when approved with accion Agregar', async () => {
      const req = {
        params: { id: 's2' },
        body: { estado: 'aprobada' },
      } as unknown as Request;
      const res = buildRes();
      const solicitudDoc: any = {
        _id: 's2',
        tipo: 'herramienta',
        accion: 'Agregar',
        colaboradorId: 'col-1',
        detalles: {
          nombre: 'Pinza',
          marca: 'Marca',
          modelo: 'M1',
          valor: 50,
          serialNumber: 'SN2',
        },
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockSolicitudFindByIdAndUpdate.mockResolvedValue(solicitudDoc);
      mockHerramientaSave.mockResolvedValue(undefined);

      await actualizarSolicitud(req, res);

      expect(mockHerramientaSave).toHaveBeenCalled();
      expect(solicitudDoc.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(solicitudDoc);
    });

    it('processes tool return when approved with accion Regresar', async () => {
      const req = {
        params: { id: 's3' },
        body: { estado: 'aprobada' },
      } as unknown as Request;
      const res = buildRes();
      const solicitudDoc: any = {
        _id: 's3',
        tipo: 'herramienta',
        accion: 'Regresar',
        recursoId: 'h1',
      };
      mockSolicitudFindByIdAndUpdate.mockResolvedValue(solicitudDoc);
      mockHerramientaFindByIdAndUpdate.mockResolvedValue({ _id: 'h1', activo: false });

      await actualizarSolicitud(req, res);

      expect(mockHerramientaFindByIdAndUpdate).toHaveBeenCalledWith('h1', { activo: false });
      expect(res.json).toHaveBeenCalledWith(solicitudDoc);
    });

    it('returns 400 when update fails', async () => {
      const req = {
        params: { id: 's4' },
        body: { estado: 'aprobada' },
      } as unknown as Request;
      const res = buildRes();
      mockSolicitudFindByIdAndUpdate.mockRejectedValue(new Error('update error'));

      await actualizarSolicitud(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al actualizar solicitud' });
    });
  });

  describe('eliminarSolicitud', () => {
    it('deletes request and returns success message', async () => {
      const req = { params: { id: 's1' } } as unknown as Request;
      const res = buildRes();
      mockSolicitudFindByIdAndDelete.mockResolvedValue({ _id: 's1' });

      await eliminarSolicitud(req, res);

      expect(mockSolicitudFindByIdAndDelete).toHaveBeenCalledWith('s1');
      expect(res.json).toHaveBeenCalledWith({ message: 'Solicitud eliminada' });
    });

    it('returns 400 when delete fails', async () => {
      const req = { params: { id: 's1' } } as unknown as Request;
      const res = buildRes();
      mockSolicitudFindByIdAndDelete.mockRejectedValue(new Error('delete error'));

      await eliminarSolicitud(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al eliminar solicitud' });
    });
  });
});
