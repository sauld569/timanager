import { Request, Response } from 'express';

var mocks: any;
var mockClienteFindOne = jest.fn();
var mockPdfGenerate = jest.fn();

jest.mock('../../src/models/CotizacionCanalizacion', () => {
  mocks = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    save: jest.fn().mockResolvedValue(undefined),
    calcularTotales: jest.fn(),
  };

  const MockCotizacion: any = function (this: any, payload: any) {
    Object.assign(this, payload);
    this.save = mocks.save;
    this.calcularTotales = mocks.calcularTotales;
  };

  MockCotizacion.find = mocks.find;
  MockCotizacion.findById = mocks.findById;
  MockCotizacion.findByIdAndUpdate = mocks.findByIdAndUpdate;
  MockCotizacion.findByIdAndDelete = mocks.findByIdAndDelete;

  return { __esModule: true, default: MockCotizacion };
});

jest.mock('../../src/models/Cliente', () => ({
  __esModule: true,
  default: {
    findOne: (...args: any[]) => mockClienteFindOne(...args),
  },
}));

jest.mock('../../src/services/cotizacionCanalizacionPdfGenerator', () => ({
  __esModule: true,
  CotizacionCanalizacionPdfGenerator: jest.fn().mockImplementation(() => ({
    generarPdfCotizacionCanalizacion: (...args: any[]) => mockPdfGenerate(...args),
  })),
}));

import {
  cambiarEstadoCotizacion,
  createCotizacionCanalizacion,
  deleteCotizacionCanalizacion,
  descargarPdfCotizacionCanalizacion,
  getCotizacionCanalizacionById,
  getCotizacionesCanalizacion,
  getPdfCotizacionCanalizacion,
  searchCotizacionesCanalizacion,
  updateCotizacionCanalizacion,
} from '../../src/controllers/cotizacionCanalizacionController';

function buildRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res as Response);
  res.json = jest.fn().mockReturnValue(res as Response);
  res.setHeader = jest.fn().mockReturnValue(res as Response);
  res.send = jest.fn().mockReturnValue(res as Response);
  return res as Response;
}

function chainPopulateSort(result: any) {
  return {
    populate: jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue(result),
    }),
  };
}

function chainPopulate(result: any) {
  return {
    populate: jest.fn().mockReturnValue(Promise.resolve(result)),
  };
}

describe('cotizacionCanalizacionController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCotizacionesCanalizacion', () => {
    it('returns list sorted by date', async () => {
      const list = [{ _id: '1' }];
      mocks.find.mockReturnValue(chainPopulateSort(list));
      const req = {} as Request;
      const res = buildRes();

      await getCotizacionesCanalizacion(req, res);

      expect(res.json).toHaveBeenCalledWith(list);
    });

    it('returns 500 on error', async () => {
      mocks.find.mockImplementation(() => { throw new Error('DB'); });
      const res = buildRes();

      await getCotizacionesCanalizacion({} as Request, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getCotizacionCanalizacionById', () => {
    it('returns 404 when missing', async () => {
      mocks.findById.mockReturnValue(chainPopulate(null));
      const res = buildRes();

      await getCotizacionCanalizacionById({ params: { id: 'x' } } as any, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns item when found', async () => {
      const item = { _id: '1' };
      mocks.findById.mockReturnValue(chainPopulate(item));
      const res = buildRes();

      await getCotizacionCanalizacionById({ params: { id: '1' } } as any, res);

      expect(res.json).toHaveBeenCalledWith(item);
    });
  });

  describe('createCotizacionCanalizacion', () => {
    it('returns 400 when cliente is missing', async () => {
      const res = buildRes();
      await createCotizacionCanalizacion({ body: { cliente: '', numeroPresupuesto: 'N1' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('creates when data is valid and recalculates totals', async () => {
      const res = buildRes();
      const body = {
        cliente: 'ACME',
        numeroPresupuesto: 'N1',
        items: [{ descripcion: 'x', cantidad: 1, unidad: 'PZA', precioUnitario: 10, subtotal: 10 }],
      };

      await createCotizacionCanalizacion({ body } as any, res);

      expect(mocks.calcularTotales).toHaveBeenCalled();
      expect(mocks.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('returns 400 on duplicate folio', async () => {
      mocks.save.mockRejectedValueOnce({ code: 11000 });
      const res = buildRes();

      await createCotizacionCanalizacion({ body: { cliente: 'ACME', numeroPresupuesto: 'N1' } } as any, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'El número de folio ya existe' });
    });
  });

  describe('updateCotizacionCanalizacion', () => {
    it('returns 404 when not found', async () => {
      mocks.findByIdAndUpdate.mockReturnValue(chainPopulate(null));
      const res = buildRes();

      await updateCotizacionCanalizacion({ params: { id: 'missing' }, body: {} } as any, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('updates and recalculates when items exist', async () => {
      const doc: any = { _id: '1', items: [{}], calcularTotales: jest.fn(), save: jest.fn().mockResolvedValue(undefined) };
      mocks.findByIdAndUpdate.mockReturnValue(chainPopulate(doc));
      const res = buildRes();

      await updateCotizacionCanalizacion({ params: { id: '1' }, body: { estado: 'Enviada' } } as any, res);

      expect(res.json).toHaveBeenCalledWith(doc);
      expect(doc.calcularTotales).toHaveBeenCalled();
      expect(doc.save).toHaveBeenCalled();
    });

    it('returns 400 on duplicate folio', async () => {
      const chain = chainPopulate(Promise.reject({ code: 11000 }));
      mocks.findByIdAndUpdate.mockReturnValue(chain);
      const res = buildRes();

      await updateCotizacionCanalizacion({ params: { id: '1' }, body: {} } as any, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteCotizacionCanalizacion', () => {
    it('returns 404 when missing', async () => {
      mocks.findByIdAndDelete.mockResolvedValue(null);
      const res = buildRes();

      await deleteCotizacionCanalizacion({ params: { id: 'x' } } as any, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('deletes and returns success', async () => {
      mocks.findByIdAndDelete.mockResolvedValue({ _id: '1' });
      const res = buildRes();

      await deleteCotizacionCanalizacion({ params: { id: '1' } } as any, res);

      expect(res.json).toHaveBeenCalledWith({ message: 'Cotización de canalización eliminada exitosamente' });
    });
  });

  describe('searchCotizacionesCanalizacion', () => {
    it('returns [] when no filters', async () => {
      const res = buildRes();
      await searchCotizacionesCanalizacion({ query: {} } as any, res);
      expect(res.json).toHaveBeenCalledWith([]);
    });

    it('returns results when term is provided', async () => {
      const result = [{ _id: '1' }];
      mocks.find.mockReturnValue({ populate: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue(result) }) }) });
      const res = buildRes();

      await searchCotizacionesCanalizacion({ query: { term: 'X' } } as any, res);

      expect(res.json).toHaveBeenCalledWith(result);
    });

    it('returns 500 on error', async () => {
      mocks.find.mockImplementation(() => { throw new Error('db'); });
      const res = buildRes();

      await searchCotizacionesCanalizacion({ query: { term: 'X' } } as any, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('cambiarEstadoCotizacion', () => {
    it('returns 400 on invalid estado', async () => {
      const res = buildRes();
      await cambiarEstadoCotizacion({ params: { id: '1' }, body: { estado: 'Invalid' } } as any, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when doc missing', async () => {
      mocks.findByIdAndUpdate.mockReturnValue(chainPopulate(null));
      const res = buildRes();

      await cambiarEstadoCotizacion({ params: { id: 'x' }, body: { estado: 'Enviada' } } as any, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('updates estado successfully', async () => {
      const doc = { _id: '1', estado: 'Enviada' };
      mocks.findByIdAndUpdate.mockReturnValue(chainPopulate(doc));
      const res = buildRes();

      await cambiarEstadoCotizacion({ params: { id: '1' }, body: { estado: 'Enviada' } } as any, res);

      expect(res.json).toHaveBeenCalledWith(doc);
    });
  });

  describe('PDF endpoints', () => {
    const cotizacionBase = {
      _id: '1',
      numeroPresupuesto: 'P-1',
      cliente: 'ACME',
      fecha: new Date('2026-01-01'),
      vigencia: new Date('2026-02-01'),
      subtotal: 100,
      utilidad: 10,
      total: 110,
      estado: 'Borrador',
      comentarios: 'hi',
      items: [{ descripcion: 'x', cantidad: 1, unidad: 'PZA', precioUnitario: 100, subtotal: 100 }],
      razonSocial: { _id: 'rs1', nombre: 'RS', rfc: 'X', emailEmpresa: '', telEmpresa: '', direccionEmpresa: '' },
    } as any;

    beforeEach(() => {
      mockClienteFindOne.mockResolvedValue({ nombreEmpresa: 'ACME', direccion: 'dir', telefono: '123', contactos: [] });
      mockPdfGenerate.mockResolvedValue(Buffer.from('PDF'));
    });

    it('getPdfCotizacionCanalizacion returns inline PDF', async () => {
      mocks.findById.mockReturnValue(chainPopulate(cotizacionBase));
      const res = buildRes();

      await getPdfCotizacionCanalizacion({ params: { id: '1' } } as any, res);

      expect(mockPdfGenerate).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('inline'));
      expect(res.send).toHaveBeenCalled();
    });

    it('descargarPdfCotizacionCanalizacion returns attachment', async () => {
      mocks.findById.mockReturnValue(chainPopulate(cotizacionBase));
      const res = buildRes();

      await descargarPdfCotizacionCanalizacion({ params: { id: '1' } } as any, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('attachment'));
      expect(res.send).toHaveBeenCalled();
    });

    it('returns 404 when cotizacion missing', async () => {
      mocks.findById.mockReturnValue(chainPopulate(null));
      const res = buildRes();

      await getPdfCotizacionCanalizacion({ params: { id: 'missing' } } as any, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
