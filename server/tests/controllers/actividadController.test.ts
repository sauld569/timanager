import { Request, Response } from 'express';

var mockActividadFind = jest.fn();
var mockActividadFindById = jest.fn();
var mockActividadFindByIdAndUpdate = jest.fn();
var mockActividadFindByIdAndDelete = jest.fn();
var mockActividadCountDocuments = jest.fn();
var mockActividadSave = jest.fn();

var mockProyectoFindById = jest.fn();
var mockColaboradorFind = jest.fn();

jest.mock('../../src/models/Actividad', () => {
  const MockActividad: any = function (this: any, payload: any) {
    Object.assign(this, payload);
    this.save = mockActividadSave;
  };

  MockActividad.find = mockActividadFind;
  MockActividad.findById = mockActividadFindById;
  MockActividad.findByIdAndUpdate = mockActividadFindByIdAndUpdate;
  MockActividad.findByIdAndDelete = mockActividadFindByIdAndDelete;
  MockActividad.countDocuments = mockActividadCountDocuments;

  return {
    __esModule: true,
    Actividad: MockActividad,
  };
});

jest.mock('../../src/models/Proyecto', () => ({
  __esModule: true,
  Proyecto: {
    findById: (...args: any[]) => mockProyectoFindById(...args),
  },
}));

jest.mock('../../src/models/Colaborador', () => ({
  __esModule: true,
  default: {
    find: (...args: any[]) => mockColaboradorFind(...args),
  },
}));

import {
  obtenerActividadesProyecto,
  crearActividad,
  actualizarActividad,
  eliminarActividad,
  agregarNota,
  eliminarNota,
  actualizarNota,
} from '../../src/controllers/actividadController';

function buildRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res as Response);
  res.json = jest.fn().mockReturnValue(res as Response);
  return res as Response;
}

function chainWithPopulateAndSort(result: any) {
  return {
    populate: jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue(result),
    }),
  };
}

function chainWithDoublePopulate(result: any) {
  return {
    populate: jest.fn().mockReturnValue({
      populate: jest.fn().mockResolvedValue(result),
    }),
  };
}

describe('actividadController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('obtenerActividadesProyecto', () => {
    it('returns 404 when project does not exist', async () => {
      mockProyectoFindById.mockResolvedValue(null);

      const req = { params: { proyectoId: 'p-missing' } } as unknown as Request;
      const res = buildRes();

      await obtenerActividadesProyecto(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Proyecto no encontrado' });
    });

    it('returns sorted activities when project exists', async () => {
      mockProyectoFindById.mockResolvedValue({ _id: 'p1' });
      mockActividadFind.mockReturnValue(chainWithPopulateAndSort([{ _id: 'a1' }]));

      const req = { params: { proyectoId: 'p1' } } as unknown as Request;
      const res = buildRes();

      await obtenerActividadesProyecto(req, res);

      expect(mockActividadFind).toHaveBeenCalledWith({ proyecto: 'p1' });
      expect(res.json).toHaveBeenCalledWith([{ _id: 'a1' }]);
    });
  });

  describe('crearActividad', () => {
    it('returns 400 when descripcion is missing', async () => {
      mockProyectoFindById.mockResolvedValue({ _id: 'p1' });

      const req = {
        params: { proyectoId: 'p1' },
        body: { descripcion: '  ', fechaInicio: '2026-01-01', fechaFinal: '2026-01-02' },
      } as unknown as Request;
      const res = buildRes();

      await crearActividad(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'La descripción de la actividad es requerida' });
    });

    it('returns 400 when any collaborator does not exist', async () => {
      mockProyectoFindById.mockResolvedValue({ _id: 'p1' });
      mockColaboradorFind.mockResolvedValue([{ _id: 'c1' }]);

      const req = {
        params: { proyectoId: 'p1' },
        body: {
          descripcion: 'Actividad X',
          fechaInicio: '2026-01-01',
          fechaFinal: '2026-01-02',
          colaboradores: ['c1', 'c2'],
        },
      } as unknown as Request;
      const res = buildRes();

      await crearActividad(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Uno o más colaboradores no existen' });
    });

    it('creates activity and returns 201', async () => {
      mockProyectoFindById.mockResolvedValue({ _id: 'p1' });
      mockColaboradorFind.mockResolvedValue([{ _id: 'c1' }]);
      mockActividadCountDocuments.mockResolvedValue(3);
      mockActividadSave.mockResolvedValue({ _id: 'a-new' });
      mockActividadFindById.mockReturnValue(chainWithDoublePopulate({ _id: 'a-new', numeroActividad: 'ACT03' }));

      const req = {
        params: { proyectoId: 'p1' },
        body: {
          descripcion: 'Nueva actividad',
          fechaInicio: '2026-01-01',
          fechaFinal: '2026-01-02',
          colaboradores: ['c1'],
        },
      } as unknown as Request;
      const res = buildRes();

      await crearActividad(req, res);

      expect(mockActividadCountDocuments).toHaveBeenCalledWith({ proyecto: 'p1' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ _id: 'a-new', numeroActividad: 'ACT03' });
    });
  });

  describe('actualizarActividad', () => {
    it('returns 404 when activity does not exist', async () => {
      mockActividadFindByIdAndUpdate.mockReturnValue(chainWithDoublePopulate(null));

      const req = {
        params: { id: 'a-missing' },
        body: { descripcion: 'Actualizada' },
      } as unknown as Request;
      const res = buildRes();

      await actualizarActividad(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Actividad no encontrada' });
    });

    it('updates activity and returns payload', async () => {
      mockActividadFindByIdAndUpdate.mockReturnValue(
        chainWithDoublePopulate({ _id: 'a1', descripcion: 'Actualizada' })
      );

      const req = {
        params: { id: 'a1' },
        body: { descripcion: 'Actualizada' },
      } as unknown as Request;
      const res = buildRes();

      await actualizarActividad(req, res);

      expect(res.json).toHaveBeenCalledWith({ _id: 'a1', descripcion: 'Actualizada' });
    });
  });

  describe('eliminarActividad', () => {
    it('returns 404 when activity is missing', async () => {
      mockActividadFindByIdAndDelete.mockResolvedValue(null);

      const req = { params: { id: 'a-missing' } } as unknown as Request;
      const res = buildRes();

      await eliminarActividad(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Actividad no encontrada' });
    });

    it('deletes activity and returns success message', async () => {
      mockActividadFindByIdAndDelete.mockResolvedValue({ _id: 'a1', evidencias: [] });

      const req = { params: { id: 'a1' } } as unknown as Request;
      const res = buildRes();

      await eliminarActividad(req, res);

      expect(res.json).toHaveBeenCalledWith({ message: 'Actividad eliminada exitosamente' });
    });
  });

  describe('notas', () => {
    it('agregarNota returns 400 for empty text', async () => {
      const req = {
        params: { id: 'a1' },
        body: { texto: '   ' },
      } as unknown as Request;
      const res = buildRes();

      await agregarNota(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'El texto de la nota es requerido' });
    });

    it('agregarNota stores note and returns 201', async () => {
      const actividadDoc: any = {
        notas: [],
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockActividadFindById.mockResolvedValue(actividadDoc);

      const req = {
        params: { id: 'a1' },
        body: { texto: 'Nota de prueba', creadoPor: 'QA' },
      } as unknown as Request;
      const res = buildRes();

      await agregarNota(req, res);

      expect(actividadDoc.save).toHaveBeenCalled();
      expect(actividadDoc.notas.length).toBe(1);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('actualizarNota returns 404 when note does not exist', async () => {
      const actividadDoc: any = {
        notas: [{ _id: { toString: () => 'n1' }, texto: 'Vieja' }],
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockActividadFindById.mockResolvedValue(actividadDoc);

      const req = {
        params: { id: 'a1', notaId: 'n2' },
        body: { texto: 'Nueva' },
      } as unknown as Request;
      const res = buildRes();

      await actualizarNota(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Nota no encontrada' });
    });

    it('eliminarNota removes note and returns success', async () => {
      const actividadDoc: any = {
        notas: [{ _id: { toString: () => 'n1' }, texto: 'Nota' }],
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockActividadFindById.mockResolvedValue(actividadDoc);

      const req = { params: { id: 'a1', notaId: 'n1' } } as unknown as Request;
      const res = buildRes();

      await eliminarNota(req, res);

      expect(actividadDoc.save).toHaveBeenCalled();
      expect(actividadDoc.notas.length).toBe(0);
      expect(res.json).toHaveBeenCalledWith({ message: 'Nota eliminada exitosamente' });
    });
  });
});
