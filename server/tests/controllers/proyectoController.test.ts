import { Request, Response } from 'express';

var mockProyectoFind = jest.fn();
var mockProyectoFindById = jest.fn();
var mockProyectoFindByIdAndUpdate = jest.fn();
var mockProyectoFindByIdAndDelete = jest.fn();
var mockProyectoSave = jest.fn();

var mockColaboradorFind = jest.fn();
var mockCotizacionFind = jest.fn();
var mockOrdenCompraFind = jest.fn();
var mockEntregaFind = jest.fn();

jest.mock('../../src/models/Proyecto', () => {
  const MockProyecto: any = function (this: any, payload: any) {
    Object.assign(this, payload);
    this._id = 'proj-new-id';
    this.save = mockProyectoSave;
  };

  MockProyecto.find = mockProyectoFind;
  MockProyecto.findById = mockProyectoFindById;
  MockProyecto.findByIdAndUpdate = mockProyectoFindByIdAndUpdate;
  MockProyecto.findByIdAndDelete = mockProyectoFindByIdAndDelete;

  return {
    __esModule: true,
    Proyecto: MockProyecto,
    default: MockProyecto,
  };
});

jest.mock('../../src/models/Colaborador', () => ({
  __esModule: true,
  default: {
    find: (...args: any[]) => mockColaboradorFind(...args),
  },
}));

jest.mock('../../src/models/Cotizacion', () => ({
  __esModule: true,
  default: {
    find: (...args: any[]) => mockCotizacionFind(...args),
  },
}));

jest.mock('../../src/models/OrdenCompra', () => ({
  __esModule: true,
  default: {
    find: (...args: any[]) => mockOrdenCompraFind(...args),
  },
}));

jest.mock('../../src/models/Entrega', () => ({
  __esModule: true,
  default: {
    find: (...args: any[]) => mockEntregaFind(...args),
  },
}));

import {
  actualizarProyecto,
  crearProyecto,
  eliminarProyecto,
  obtenerCotizacionesProyecto,
  obtenerEntregasProyecto,
  obtenerOrdenesCompraProyecto,
  obtenerProyectoPorId,
  obtenerProyectos,
} from '../../src/controllers/proyectoController';

function buildRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res as Response);
  res.json = jest.fn().mockReturnValue(res as Response);
  return res as Response;
}

function chainWithPopulatesAndSort(result: any) {
  const chain: any = {};
  chain.populate = jest.fn().mockReturnValue(chain);
  chain.sort = jest.fn().mockResolvedValue(result);
  return chain;
}

describe('proyectoController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('obtenerProyectos', () => {
    it('returns projects list', async () => {
      const req = {} as Request;
      const res = buildRes();
      const projects = [{ nombre: 'Proyecto 1' }];
      const chain = {
        populate: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue(projects) }),
      };
      mockProyectoFind.mockReturnValue(chain);

      await obtenerProyectos(req, res);

      expect(mockProyectoFind).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(projects);
    });

    it('returns 500 when query fails', async () => {
      const req = {} as Request;
      const res = buildRes();
      mockProyectoFind.mockImplementation(() => {
        throw new Error('db error');
      });

      await obtenerProyectos(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error al obtener proyectos' }));
    });
  });

  describe('obtenerProyectoPorId', () => {
    it('returns project when found', async () => {
      const req = { params: { id: 'p1' } } as unknown as Request;
      const res = buildRes();
      const chain = { populate: jest.fn().mockResolvedValue({ _id: 'p1' }) };
      mockProyectoFindById.mockReturnValue(chain);

      await obtenerProyectoPorId(req, res);

      expect(mockProyectoFindById).toHaveBeenCalledWith('p1');
      expect(res.json).toHaveBeenCalledWith({ _id: 'p1' });
    });

    it('returns 404 when project is missing', async () => {
      const req = { params: { id: 'missing' } } as unknown as Request;
      const res = buildRes();
      const chain = { populate: jest.fn().mockResolvedValue(null) };
      mockProyectoFindById.mockReturnValue(chain);

      await obtenerProyectoPorId(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Proyecto no encontrado' });
    });
  });

  describe('crearProyecto', () => {
    it('returns 400 when nombre is missing', async () => {
      const req = { body: { nombre: '', fechaInicio: '2026-01-01', fechaTerminacion: '2026-12-31' } } as Request;
      const res = buildRes();

      await crearProyecto(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'El nombre del proyecto es requerido' });
    });

    it('returns 400 when fechas are missing', async () => {
      const req = { body: { nombre: 'Proyecto X' } } as Request;
      const res = buildRes();

      await crearProyecto(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Las fechas de inicio y terminación son requeridas' });
    });

    it('returns 400 when any collaborator does not exist', async () => {
      const req = {
        body: {
          nombre: 'Proyecto X',
          fechaInicio: '2026-01-01',
          fechaTerminacion: '2026-12-31',
          colaboradores: ['c1', 'c2'],
        },
      } as unknown as Request;
      const res = buildRes();
      mockColaboradorFind.mockResolvedValue([{ _id: 'c1' }]);

      await crearProyecto(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Uno o más colaboradores no existen' });
    });

    it('creates project and returns 201 with populated project', async () => {
      const req = {
        body: {
          nombre: 'Proyecto X',
          fechaInicio: '2026-01-01',
          fechaTerminacion: '2026-12-31',
          colaboradores: ['c1'],
        },
      } as unknown as Request;
      const res = buildRes();
      mockColaboradorFind.mockResolvedValue([{ _id: 'c1' }]);
      mockProyectoSave.mockResolvedValue({ _id: 'proj-new-id' });
      mockProyectoFindById.mockReturnValue({ populate: jest.fn().mockResolvedValue({ _id: 'proj-new-id' }) });

      await crearProyecto(req, res);

      expect(mockProyectoSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ _id: 'proj-new-id' });
    });
  });

  describe('actualizarProyecto', () => {
    it('returns 400 when collaborator validation fails', async () => {
      const req = {
        params: { id: 'p1' },
        body: { colaboradores: ['c1', 'c2'] },
      } as unknown as Request;
      const res = buildRes();
      mockColaboradorFind.mockResolvedValue([{ _id: 'c1' }]);

      await actualizarProyecto(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Uno o más colaboradores no existen' });
    });

    it('returns 404 when project to update is missing', async () => {
      const req = {
        params: { id: 'missing' },
        body: { nombre: 'Nuevo' },
      } as unknown as Request;
      const res = buildRes();
      mockProyectoFindByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });

      await actualizarProyecto(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Proyecto no encontrado' });
    });

    it('updates and returns project', async () => {
      const req = {
        params: { id: 'p1' },
        body: { nombre: 'Actualizado', colaboradores: [] },
      } as unknown as Request;
      const res = buildRes();
      mockProyectoFindByIdAndUpdate.mockReturnValue({
        populate: jest.fn().mockResolvedValue({ _id: 'p1', nombre: 'Actualizado' }),
      });

      await actualizarProyecto(req, res);

      expect(res.json).toHaveBeenCalledWith({ _id: 'p1', nombre: 'Actualizado' });
    });
  });

  describe('eliminarProyecto', () => {
    it('returns 404 when project is missing', async () => {
      const req = { params: { id: 'missing' } } as unknown as Request;
      const res = buildRes();
      mockProyectoFindByIdAndDelete.mockResolvedValue(null);

      await eliminarProyecto(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Proyecto no encontrado' });
    });

    it('deletes project and returns success message', async () => {
      const req = { params: { id: 'p1' } } as unknown as Request;
      const res = buildRes();
      mockProyectoFindByIdAndDelete.mockResolvedValue({ _id: 'p1' });

      await eliminarProyecto(req, res);

      expect(mockProyectoFindByIdAndDelete).toHaveBeenCalledWith('p1');
      expect(res.json).toHaveBeenCalledWith({ message: 'Proyecto eliminado exitosamente' });
    });
  });

  describe('obtenerCotizacionesProyecto', () => {
    it('returns sorted cotizaciones for project', async () => {
      const req = { params: { id: 'p1' } } as unknown as Request;
      const res = buildRes();
      const chain = chainWithPopulatesAndSort([{ _id: 'cot1' }]);
      mockCotizacionFind.mockReturnValue(chain);

      await obtenerCotizacionesProyecto(req, res);

      expect(mockCotizacionFind).toHaveBeenCalledWith({ proyecto: 'p1' });
      expect(res.json).toHaveBeenCalledWith([{ _id: 'cot1' }]);
    });
  });

  describe('obtenerOrdenesCompraProyecto', () => {
    it('returns sorted purchase orders for project', async () => {
      const req = { params: { id: 'p1' } } as unknown as Request;
      const res = buildRes();
      const chain = chainWithPopulatesAndSort([{ _id: 'oc1' }]);
      mockOrdenCompraFind.mockReturnValue(chain);

      await obtenerOrdenesCompraProyecto(req, res);

      expect(mockOrdenCompraFind).toHaveBeenCalledWith({ proyecto: 'p1' });
      expect(res.json).toHaveBeenCalledWith([{ _id: 'oc1' }]);
    });
  });

  describe('obtenerEntregasProyecto', () => {
    it('returns sorted entregas for project', async () => {
      const req = { params: { id: 'p1' } } as unknown as Request;
      const res = buildRes();
      const chain = chainWithPopulatesAndSort([{ _id: 'ent1' }]);
      mockEntregaFind.mockReturnValue(chain);

      await obtenerEntregasProyecto(req, res);

      expect(mockEntregaFind).toHaveBeenCalledWith({ proyecto: 'p1' });
      expect(res.json).toHaveBeenCalledWith([{ _id: 'ent1' }]);
    });
  });
});
