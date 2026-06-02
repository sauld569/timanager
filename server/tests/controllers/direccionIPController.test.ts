import { Request, Response } from 'express';
import * as direccionIPController from '../../src/controllers/direccionIPController';

var mocks: any;

jest.mock('../../src/models/Proyecto', () => {
  mocks = mocks || {};
  mocks.proyectoFindById = jest.fn();
  return {
    __esModule: true,
    Proyecto: { findById: mocks.proyectoFindById }
  };
});

jest.mock('../../src/models/DireccionIP', () => {
  mocks = mocks || {};
  mocks.direccionFind = jest.fn();
  mocks.direccionFindByIdAndUpdate = jest.fn();
  mocks.direccionFindByIdAndDelete = jest.fn();
  mocks.direccionSave = jest.fn();

  const MockDireccion = function (this: any, payload: any) {
    Object.assign(this, payload);
    this.save = mocks.direccionSave;
  } as any;

  (MockDireccion as any).find = mocks.direccionFind;
  (MockDireccion as any).findByIdAndUpdate = mocks.direccionFindByIdAndUpdate;
  (MockDireccion as any).findByIdAndDelete = mocks.direccionFindByIdAndDelete;

  return {
    __esModule: true,
    DireccionIP: MockDireccion,
    IDireccionIP: {}
  };
});

jest.mock('../../src/services/direccionIPPdfService', () => {
  mocks = mocks || {};
  mocks.pdfService = {
    generarPdfDirecciones: jest.fn().mockResolvedValue(Buffer.from('PDF'))
  };

  return {
    __esModule: true,
    DireccionIPPdfService: jest.fn().mockImplementation(() => mocks.pdfService)
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

describe('direccionIPController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('obtenerDireccionesProyecto', () => {
    it('returns 404 when project not found', async () => {
      mocks.proyectoFindById.mockResolvedValue(null);

      const req = { params: { proyectoId: '1' } } as unknown as Request;
      const res = buildRes();

      await direccionIPController.obtenerDireccionesProyecto(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Proyecto no encontrado' });
    });

    it('returns list of direcciones for a project', async () => {
      const direcciones = [{ _id: 'd1' }];
      mocks.proyectoFindById.mockResolvedValue({ _id: '1' });
      mocks.direccionFind.mockReturnValue({ sort: jest.fn().mockResolvedValue(direcciones) });

      const req = { params: { proyectoId: '1' } } as unknown as Request;
      const res = buildRes();

      await direccionIPController.obtenerDireccionesProyecto(req, res);

      expect(res.json).toHaveBeenCalledWith(direcciones);
    });

    it('returns 500 on error', async () => {
      mocks.proyectoFindById.mockRejectedValue(new Error('DB'));

      const req = { params: { proyectoId: '1' } } as unknown as Request;
      const res = buildRes();

      await direccionIPController.obtenerDireccionesProyecto(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error al obtener direcciones IP' })
      );
    });
  });

  describe('crearDireccionIP', () => {
    it('returns 404 when project not found', async () => {
      mocks.proyectoFindById.mockResolvedValue(null);

      const req = { params: { proyectoId: '1' }, body: {} } as unknown as Request;
      const res = buildRes();

      await direccionIPController.crearDireccionIP(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Proyecto no encontrado' });
    });

    it('returns 400 when required fields missing', async () => {
      mocks.proyectoFindById.mockResolvedValue({ _id: '1' });

      const req = { params: { proyectoId: '1' }, body: { equipo: '', usuario: '' } } as unknown as Request;
      const res = buildRes();

      await direccionIPController.crearDireccionIP(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Todos los campos son requeridos' });
    });

    it('returns 400 when esRango true without direccionFin', async () => {
      mocks.proyectoFindById.mockResolvedValue({ _id: '1' });

      const req = {
        params: { proyectoId: '1' },
        body: { equipo: 'eq', usuario: 'u', contrasena: 'c', direccion: '1.1.1.1', esRango: true }
      } as unknown as Request;
      const res = buildRes();

      await direccionIPController.crearDireccionIP(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Debe especificar la dirección final del rango' });
    });

    it('creates direccion and returns 201', async () => {
      mocks.proyectoFindById.mockResolvedValue({ _id: '1' });
      mocks.direccionSave.mockResolvedValue({ _id: 'new' });

      const req = {
        params: { proyectoId: '1' },
        body: { equipo: 'eq', usuario: 'u', contrasena: 'c', direccion: '1.1.1.1' }
      } as unknown as Request;
      const res = buildRes();

      await direccionIPController.crearDireccionIP(req, res);

      expect(mocks.direccionSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ _id: 'new' });
    });

    it('returns 500 on save error', async () => {
      mocks.proyectoFindById.mockResolvedValue({ _id: '1' });
      mocks.direccionSave.mockRejectedValue(new Error('fail'));

      const req = {
        params: { proyectoId: '1' },
        body: { equipo: 'eq', usuario: 'u', contrasena: 'c', direccion: '1.1.1.1' }
      } as unknown as Request;
      const res = buildRes();

      await direccionIPController.crearDireccionIP(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error al crear dirección IP' })
      );
    });
  });

  describe('actualizarDireccionIP', () => {
    it('returns 400 when esRango true without direccionFin', async () => {
      const req = {
        params: { id: '1' },
        body: { esRango: true, equipo: 'eq', usuario: 'u', contrasena: 'c', direccion: '1.1.1.1' }
      } as unknown as Request;
      const res = buildRes();

      await direccionIPController.actualizarDireccionIP(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Debe especificar la dirección final del rango' });
    });

    it('returns 404 when not found', async () => {
      mocks.direccionFindByIdAndUpdate.mockResolvedValue(null);

      const req = {
        params: { id: '1' },
        body: { equipo: 'eq', usuario: 'u', contrasena: 'c', direccion: '1.1.1.1' }
      } as unknown as Request;
      const res = buildRes();

      await direccionIPController.actualizarDireccionIP(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Dirección IP no encontrada' });
    });

    it('updates and returns direccion', async () => {
      const updated = { _id: '1', equipo: 'eq2' };
      mocks.direccionFindByIdAndUpdate.mockResolvedValue(updated);

      const req = {
        params: { id: '1' },
        body: { equipo: 'eq2', usuario: 'u', contrasena: 'c', direccion: '1.1.1.1' }
      } as unknown as Request;
      const res = buildRes();

      await direccionIPController.actualizarDireccionIP(req, res);

      expect(res.json).toHaveBeenCalledWith(updated);
    });

    it('returns 500 on error', async () => {
      mocks.direccionFindByIdAndUpdate.mockRejectedValue(new Error('fail'));

      const req = {
        params: { id: '1' },
        body: { equipo: 'eq', usuario: 'u', contrasena: 'c', direccion: '1.1.1.1' }
      } as unknown as Request;
      const res = buildRes();

      await direccionIPController.actualizarDireccionIP(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error al actualizar dirección IP' })
      );
    });
  });

  describe('eliminarDireccionIP', () => {
    it('returns 404 when not found', async () => {
      mocks.direccionFindByIdAndDelete.mockResolvedValue(null);

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await direccionIPController.eliminarDireccionIP(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Dirección IP no encontrada' });
    });

    it('deletes and returns success message', async () => {
      mocks.direccionFindByIdAndDelete.mockResolvedValue({ _id: '1' });

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await direccionIPController.eliminarDireccionIP(req, res);

      expect(res.json).toHaveBeenCalledWith({ message: 'Dirección IP eliminada exitosamente' });
    });

    it('returns 500 on error', async () => {
      mocks.direccionFindByIdAndDelete.mockRejectedValue(new Error('fail'));

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await direccionIPController.eliminarDireccionIP(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error al eliminar dirección IP' })
      );
    });
  });

  describe('generarPDFDirecciones', () => {
    it('returns 404 when project not found', async () => {
      mocks.proyectoFindById.mockResolvedValue(null);

      const req = { params: { proyectoId: '1' } } as unknown as Request;
      const res = buildRes();

      await direccionIPController.generarPDFDirecciones(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Proyecto no encontrado' });
    });

    it('generates pdf and sets headers', async () => {
      const direcciones = [{ _id: 'd1' }];
      mocks.proyectoFindById.mockResolvedValue({ _id: '1', nombre: 'Proj', descripcion: 'Desc' });
      mocks.direccionFind.mockReturnValue({ sort: jest.fn().mockResolvedValue(direcciones) });

      const req = { params: { proyectoId: '1' } } as unknown as Request;
      const res = buildRes();

      await direccionIPController.generarPDFDirecciones(req, res);

      expect(mocks.pdfService.generarPdfDirecciones).toHaveBeenCalledWith(
        direcciones,
        expect.objectContaining({ nombre: 'Proj', descripcion: 'Desc' })
      );
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('returns 500 on error', async () => {
      mocks.proyectoFindById.mockRejectedValue(new Error('fail'));

      const req = { params: { proyectoId: '1' } } as unknown as Request;
      const res = buildRes();

      await direccionIPController.generarPDFDirecciones(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Error al generar PDF de direcciones' })
      );
    });
  });
});
