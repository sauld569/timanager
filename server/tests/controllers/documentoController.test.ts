import { Request, Response } from 'express';
import * as documentoController from '../../src/controllers/documentoController';

var mocks: any;

jest.mock('../../src/models/Documento', () => {
  mocks = mocks || {};
  mocks.find = jest.fn();
  mocks.findById = jest.fn();
  mocks.findByIdAndDelete = jest.fn();
  mocks.save = jest.fn();

  const MockDocumento = function (this: any, payload: any) {
    Object.assign(this, payload);
    this.save = mocks.save;
  } as any;

  (MockDocumento as any).find = mocks.find;
  (MockDocumento as any).findById = mocks.findById;
  (MockDocumento as any).findByIdAndDelete = mocks.findByIdAndDelete;

  return { __esModule: true, default: MockDocumento };
});

jest.mock('../../src/models/Colaborador', () => {
  mocks = mocks || {};
  mocks.colaboradorFindById = jest.fn();
  return { __esModule: true, default: { findById: mocks.colaboradorFindById } };
});

jest.mock('fs', () => {
  mocks = mocks || {};
  const api = {
    existsSync: jest.fn(),
    unlinkSync: jest.fn()
  };
  return {
    __esModule: true,
    default: api,
    existsSync: api.existsSync,
    unlinkSync: api.unlinkSync
  };
});

function buildRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res as Response);
  res.json = jest.fn().mockReturnValue(res as Response);
  res.sendFile = jest.fn().mockImplementation((_: any, cb?: any) => {
    if (cb) cb();
    return res as Response;
  });
  res.send = jest.fn().mockReturnValue(res as Response);
  return res as Response;
}

describe('documentoController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDocumentosByColaborador', () => {
    it('returns documentos list', async () => {
      const docs = [{ _id: '1' }];
      mocks.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(docs) });

      const req = { params: { colaboradorId: 'c1' } } as unknown as Request;
      const res = buildRes();

      await documentoController.getDocumentosByColaborador(req, res);

      expect(res.json).toHaveBeenCalledWith(docs);
    });

    it('returns 500 on error', async () => {
      mocks.find.mockReturnValue({ sort: jest.fn().mockRejectedValue(new Error('db')) });

      const req = { params: { colaboradorId: 'c1' } } as unknown as Request;
      const res = buildRes();

      await documentoController.getDocumentosByColaborador(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener documentos' });
    });
  });

  describe('getAllDocumentos', () => {
    it('returns all documentos', async () => {
      const docs = [{ _id: '1' }];
      mocks.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(docs)
        })
      });

      const req = {} as Request;
      const res = buildRes();

      await documentoController.getAllDocumentos(req, res);

      expect(res.json).toHaveBeenCalledWith(docs);
    });

    it('returns 500 on error', async () => {
      mocks.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockRejectedValue(new Error('db'))
        })
      });

      const req = {} as Request;
      const res = buildRes();

      await documentoController.getAllDocumentos(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener documentos' });
    });
  });

  describe('createDocumento', () => {
    it('returns 400 when no file uploaded', async () => {
      const req = { file: undefined } as unknown as Request;
      const res = buildRes();

      await documentoController.createDocumento(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No se ha subido ningún archivo' });
    });

    it('returns 404 when colaborador not found', async () => {
      mocks.colaboradorFindById.mockResolvedValue(null);
      const req = {
        file: { mimetype: 'application/pdf', filename: 'file.pdf' },
        body: { colaboradorId: 'c1', nombre: 'Doc' }
      } as unknown as Request;
      const res = buildRes();

      await documentoController.createDocumento(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Colaborador no encontrado' });
    });

    it('creates documento and returns 201', async () => {
      mocks.colaboradorFindById.mockResolvedValue({ _id: 'c1' });
      mocks.save.mockResolvedValue({ _id: 'd1' });

      const req = {
        file: { mimetype: 'image/png', filename: 'pic.png' },
        body: { colaboradorId: 'c1', nombre: 'Doc' }
      } as unknown as Request;
      const res = buildRes();

      await documentoController.createDocumento(req, res);

      expect(mocks.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it('returns 400 on save error', async () => {
      mocks.colaboradorFindById.mockResolvedValue({ _id: 'c1' });
      mocks.save.mockRejectedValue(new Error('fail'));

      const req = {
        file: { mimetype: 'application/pdf', filename: 'file.pdf' },
        body: { colaboradorId: 'c1', nombre: 'Doc' }
      } as unknown as Request;
      const res = buildRes();

      await documentoController.createDocumento(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al crear documento' });
    });
  });

  describe('verDocumento', () => {
    it('returns 404 when file not found', async () => {
      const fsMock = require('fs');
      fsMock.existsSync.mockReturnValue(false);

      const req = { params: { nombre: 'missing.pdf' } } as unknown as Request;
      const res = buildRes();

      await documentoController.verDocumento(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Archivo no encontrado' })
      );
    });

    it('returns 403 when path escapes uploads dir', async () => {
      const fsMock = require('fs');
      fsMock.existsSync.mockReturnValue(true);

      const req = { params: { nombre: '../secret.txt' } } as unknown as Request;
      const res = buildRes();

      await documentoController.verDocumento(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Acceso no permitido' });
    });

    it('sends file when exists', async () => {
      const fsMock = require('fs');
      fsMock.existsSync.mockReturnValue(true);

      const req = { params: { nombre: 'ok.pdf' } } as unknown as Request;
      const res = buildRes();

      await documentoController.verDocumento(req, res);

      expect(res.sendFile).toHaveBeenCalled();
    });

    it('returns 500 when sendFile fails', async () => {
      const fsMock = require('fs');
      fsMock.existsSync.mockReturnValue(true);

      const req = { params: { nombre: 'fail.pdf' } } as unknown as Request;
      const res = buildRes();
      res.sendFile = jest.fn().mockImplementation((_path: any, cb: any) => cb(new Error('send fail')));

      await documentoController.verDocumento(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al enviar el archivo' });
    });
  });

  describe('updateDocumento', () => {
    it('returns 404 when documento not found', async () => {
      mocks.findById.mockResolvedValue(null);

      const req = { params: { id: '1' }, body: {} } as unknown as Request;
      const res = buildRes();

      await documentoController.updateDocumento(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Documento no encontrado' });
    });

    it('updates metadata without file', async () => {
      const doc: any = { save: jest.fn(), nombre: 'old' };
      mocks.findById.mockResolvedValue(doc);

      const req = { params: { id: '1' }, body: { nombre: 'new' } } as unknown as Request;
      const res = buildRes();

      await documentoController.updateDocumento(req, res);

      expect(doc.nombre).toBe('new');
      expect(doc.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(doc);
    });

    it('replaces file and removes old if exists', async () => {
      const fsMock = require('fs');
      fsMock.existsSync.mockReturnValue(true);
      const doc: any = { url: 'old.pdf', save: jest.fn(), tipo: 'pdf' };
      mocks.findById.mockResolvedValue(doc);

      const req = {
        params: { id: '1' },
        body: {},
        file: { mimetype: 'image/png', filename: 'new.png' }
      } as unknown as Request;
      const res = buildRes();

      await documentoController.updateDocumento(req, res);

      expect(fsMock.unlinkSync).toHaveBeenCalled();
      expect(doc.url).toBe('new.png');
      expect(doc.tipo).toBe('image');
      expect(doc.save).toHaveBeenCalled();
    });

    it('returns 400 on error', async () => {
      mocks.findById.mockRejectedValue(new Error('fail'));

      const req = { params: { id: '1' }, body: {} } as unknown as Request;
      const res = buildRes();

      await documentoController.updateDocumento(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al actualizar documento' });
    });
  });

  describe('deleteDocumento', () => {
    it('returns 404 when not found', async () => {
      mocks.findById.mockResolvedValue(null);

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await documentoController.deleteDocumento(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Documento no encontrado' });
    });

    it('deletes file and record', async () => {
      const fsMock = require('fs');
      fsMock.existsSync.mockReturnValue(true);
      mocks.findById.mockResolvedValue({ url: 'file.pdf' });
      mocks.findByIdAndDelete.mockResolvedValue({});

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await documentoController.deleteDocumento(req, res);

      expect(fsMock.unlinkSync).toHaveBeenCalled();
      expect(mocks.findByIdAndDelete).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith({ message: 'Documento eliminado correctamente' });
    });

    it('returns 400 on error', async () => {
      mocks.findById.mockRejectedValue(new Error('fail'));

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await documentoController.deleteDocumento(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al eliminar documento' });
    });
  });
});
