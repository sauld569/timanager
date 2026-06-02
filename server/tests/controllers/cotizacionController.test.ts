import { Request, Response } from 'express';
import * as cotizacionController from '../../src/controllers/cotizacionController';
import { generarNumeroPresupuesto, validarNumeroPresupuestoUnico } from '../../src/utils/presupuestoGenerator';

// Mocks object for hoisting
var mocks: any;

jest.mock('../../src/models/Cotizacion', () => {
  mocks = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    save: jest.fn().mockResolvedValue(undefined),
    calcularTotales: jest.fn()
  };

  const MockCotizacion = jest.fn(function (this: any, payload: any) {
    Object.assign(this, payload);
    this.save = mocks.save;
    this.calcularTotales = mocks.calcularTotales;
  });

  (MockCotizacion as any).find = mocks.find;
  (MockCotizacion as any).findById = mocks.findById;
  (MockCotizacion as any).findByIdAndUpdate = mocks.findByIdAndUpdate;
  (MockCotizacion as any).findByIdAndDelete = mocks.findByIdAndDelete;

  return { __esModule: true, default: MockCotizacion };
});

jest.mock('../../src/models/Cliente', () => {
  return {
    __esModule: true,
    default: jest.fn()
  };
});

jest.mock('../../src/utils/presupuestoGenerator', () => ({
  generarNumeroPresupuesto: jest.fn().mockResolvedValue('PRES-2026-001'),
  validarNumeroPresupuestoUnico: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../src/services/cotizacionPdfGenerator', () => ({
  CotizacionPdfGenerator: jest.fn().mockImplementation(() => ({
    generarPdfCotizacion: jest.fn().mockResolvedValue(Buffer.from('PDF_COTIZACION'))
  })),
  CotizacionPdfData: {}
}));

jest.mock('../../src/services/cotizacionChecklistPdfGenerator', () => ({
  CotizacionChecklistPdfGenerator: jest.fn().mockImplementation(() => ({
    generarPdfChecklistCotizacion: jest.fn().mockResolvedValue(Buffer.from('PDF_CHECKLIST'))
  })),
  CotizacionChecklistPdfData: {}
}));

function buildRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res as Response);
  res.json = jest.fn().mockReturnValue(res as Response);
  res.setHeader = jest.fn().mockReturnValue(res as Response);
  res.send = jest.fn().mockReturnValue(res as Response);
  return res as Response;
}

describe('cotizacionController', () => {
  beforeEach(() => {
    // Reset all mocks to default state
    mocks.find.mockClear();
    mocks.findById.mockClear();
    mocks.findByIdAndUpdate.mockClear();
    mocks.findByIdAndDelete.mockClear();
    mocks.save.mockClear().mockResolvedValue(undefined);
    mocks.calcularTotales.mockClear();
    (generarNumeroPresupuesto as jest.Mock).mockReset().mockResolvedValue('PRES-2026-001');
    (validarNumeroPresupuestoUnico as jest.Mock).mockReset().mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCotizaciones', () => {
    it('returns list of cotizaciones with 200', async () => {
      const mockCotizaciones = [
        { _id: '1', numeroPresupuesto: 'PRES-001', cliente: 'Cliente A', estado: 'Pendiente' },
        { _id: '2', numeroPresupuesto: 'PRES-002', cliente: 'Cliente B', estado: 'Aceptada' }
      ];
      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockCotizaciones)
          })
        })
      };
      mocks.find.mockReturnValue(chain);

      const req = {} as Request;
      const res = buildRes();

      await cotizacionController.getCotizaciones(req, res);

      expect(res.json).toHaveBeenCalledWith(mockCotizaciones);
    });

    it('returns 500 when find fails', async () => {
      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockRejectedValue(new Error('DB Error'))
          })
        })
      };
      mocks.find.mockReturnValue(chain);

      const req = {} as Request;
      const res = buildRes();

      await cotizacionController.getCotizaciones(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener cotizaciones' });
    });
  });

  describe('getCotizacionById', () => {
    it('returns cotizacion when found with 200', async () => {
      const mockCotizacion = {
        _id: '1',
        numeroPresupuesto: 'PRES-001',
        cliente: 'Cliente A',
        estado: 'Pendiente'
      };
      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(mockCotizacion)
        })
      };
      mocks.findById.mockReturnValue(chain);

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await cotizacionController.getCotizacionById(req, res);

      expect(res.json).toHaveBeenCalledWith(mockCotizacion);
    });

    it('returns 404 when cotizacion not found', async () => {
      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(null)
        })
      };
      mocks.findById.mockReturnValue(chain);

      const req = { params: { id: '999' } } as unknown as Request;
      const res = buildRes();

      await cotizacionController.getCotizacionById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Cotización no encontrada' });
    });

    it('returns 500 when findById fails', async () => {
      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockRejectedValue(new Error('DB Error'))
        })
      };
      mocks.findById.mockReturnValue(chain);

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await cotizacionController.getCotizacionById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener cotización' });
    });
  });

  describe('createCotizacion', () => {
    it('returns 400 when cliente is empty', async () => {
      const req = { body: { cliente: '', numeroPresupuesto: 'PRES-001' } } as Request;
      const res = buildRes();

      await cotizacionController.createCotizacion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validación fallida'
        })
      );
    });

    it('creates cotizacion with valid data and returns 201', async () => {
      const cotizacionData = {
        cliente: 'Cliente A',
        numeroPresupuesto: 'PRES-001',
        items: [],
        total: 1000
      };

      const createdCotizacion = {
        _id: 'new-id',
        ...cotizacionData,
        fechaCreacion: expect.any(Date),
        fechaActualizacion: expect.any(Date)
      };

      const req = { body: cotizacionData } as Request;
      const res = buildRes();

      await cotizacionController.createCotizacion(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it('auto-generates numeroPresupuesto when missing', async () => {
      const req = { body: { cliente: 'Cliente Auto', numeroPresupuesto: '' } } as Request;
      const res = buildRes();

      await cotizacionController.createCotizacion(req, res);

      expect(generarNumeroPresupuesto).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it('returns 400 when numeroPresupuesto manual ya existe', async () => {
      (validarNumeroPresupuestoUnico as jest.Mock).mockResolvedValueOnce(false);

      const req = { body: { cliente: 'Cliente', numeroPresupuesto: 'DUP-001' } } as Request;
      const res = buildRes();

      await cotizacionController.createCotizacion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validación fallida'
        })
      );
    });

    it('returns 500 when save fails', async () => {
      const cotizacionData = {
        cliente: 'Cliente A',
        numeroPresupuesto: 'PRES-001'
      };

      mocks.save.mockRejectedValue(new Error('Validation Error'));

      const req = { body: cotizacionData } as Request;
      const res = buildRes();

      await cotizacionController.createCotizacion(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Error interno del servidor'
        })
      );
    });
  });

  describe('updateCotizacion', () => {
    it('returns 400 when cliente is empty', async () => {
      const req = {
        params: { id: '1' },
        body: { cliente: '', numeroPresupuesto: 'PRES-001' }
      } as unknown as Request;
      const res = buildRes();

      await cotizacionController.updateCotizacion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validación fallida'
        })
      );
    });

    it('updates cotizacion and returns 200', async () => {
      const updateData = {
        cliente: 'Cliente A Updated',
        numeroPresupuesto: 'PRES-001-UPDATED'
      };

      const updatedCotizacion = {
        _id: '1',
        ...updateData,
        fechaActualizacion: expect.any(Date),
        items: []
      };

      mocks.findByIdAndUpdate.mockResolvedValue(updatedCotizacion);

      const req = {
        params: { id: '1' },
        body: updateData
      } as unknown as Request;
      const res = buildRes();

      await cotizacionController.updateCotizacion(req, res);

      expect(res.json).toHaveBeenCalledWith(updatedCotizacion);
    });

    it('recalculates totals and saves when items present', async () => {
      const updatedCotizacion: any = {
        _id: '1',
        cliente: 'Cliente A',
        numeroPresupuesto: 'PRES-REC',
        items: [{}],
        calcularTotales: mocks.calcularTotales,
        save: mocks.save
      };

      mocks.findByIdAndUpdate.mockResolvedValue(updatedCotizacion);

      const req = {
        params: { id: '1' },
        body: { cliente: 'Cliente A', numeroPresupuesto: 'PRES-REC' }
      } as unknown as Request;
      const res = buildRes();

      await cotizacionController.updateCotizacion(req, res);

      expect(mocks.calcularTotales).toHaveBeenCalled();
      expect(mocks.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(updatedCotizacion);
    });

    it('returns 404 when cotizacion not found', async () => {
      const updateData = { cliente: 'New Client', numeroPresupuesto: 'PRES-NEW' };

      mocks.findByIdAndUpdate.mockResolvedValue(null);

      const req = {
        params: { id: '999' },
        body: updateData
      } as unknown as Request;
      const res = buildRes();

      await cotizacionController.updateCotizacion(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Cotización no encontrada'
        })
      );
    });

    it('returns 500 when update fails', async () => {
      const updateData = { cliente: 'Client', numeroPresupuesto: 'PRES-NEW' };

      mocks.findByIdAndUpdate.mockRejectedValue(new Error('DB Error'));

      const req = {
        params: { id: '1' },
        body: updateData
      } as unknown as Request;
      const res = buildRes();

      await cotizacionController.updateCotizacion(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Error interno del servidor'
        })
      );
    });
  });

  describe('deleteCotizacion', () => {
    it('deletes cotizacion and returns success message', async () => {
      const deletedCotizacion = { _id: '1', numeroPresupuesto: 'PRES-001' };

      mocks.findByIdAndDelete.mockResolvedValue(deletedCotizacion);

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await cotizacionController.deleteCotizacion(req, res);

      expect(res.json).toHaveBeenCalledWith({ message: 'Cotización eliminada exitosamente' });
    });

    it('returns 404 when cotizacion not found', async () => {
      mocks.findByIdAndDelete.mockResolvedValue(null);

      const req = { params: { id: '999' } } as unknown as Request;
      const res = buildRes();

      await cotizacionController.deleteCotizacion(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Cotización no encontrada' });
    });

    it('returns 500 when delete fails', async () => {
      mocks.findByIdAndDelete.mockRejectedValue(new Error('DB Error'));

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await cotizacionController.deleteCotizacion(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al eliminar cotización' });
    });
  });

  describe('searchCotizaciones', () => {
    it('returns cotizaciones matching search term', async () => {
      const searchResults = [
        { _id: '1', numeroPresupuesto: 'PRES-001', cliente: 'Cliente A' }
      ];

      const chain = {
        populate: jest.fn().mockResolvedValue(searchResults)
      };
      mocks.find.mockReturnValue(chain);

      const req = { query: { term: 'PRES-001' } } as unknown as Request;
      const res = buildRes();

      await cotizacionController.searchCotizaciones(req, res);

      expect(res.json).toHaveBeenCalledWith(searchResults);
    });

    it('returns 400 when search term not provided', async () => {
      const req = { query: {} } as unknown as Request;
      const res = buildRes();

      await cotizacionController.searchCotizaciones(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Término de búsqueda no proporcionado' });
    });

    it('returns 500 when search fails', async () => {
      const chain = {
        populate: jest.fn().mockRejectedValue(new Error('DB Error'))
      };
      mocks.find.mockReturnValue(chain);

      const req = { query: { term: 'search' } } as unknown as Request;
      const res = buildRes();

      await cotizacionController.searchCotizaciones(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al buscar cotizaciones' });
    });
  });

  describe('cambiarEstadoCotizacion', () => {
    it('returns 400 when estado not provided', async () => {
      const req = { params: { id: '1' }, body: {} } as unknown as Request;
      const res = buildRes();

      await cotizacionController.cambiarEstadoCotizacion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Estado no proporcionado' });
    });

    it('changes cotizacion status and returns 200', async () => {
      const updatedCotizacion = {
        _id: '1',
        numeroPresupuesto: 'PRES-001',
        estado: 'Aceptada'
      };

      mocks.findByIdAndUpdate.mockResolvedValue(updatedCotizacion);

      const req = {
        params: { id: '1' },
        body: { estado: 'Aceptada' }
      } as unknown as Request;
      const res = buildRes();

      await cotizacionController.cambiarEstadoCotizacion(req, res);

      expect(res.json).toHaveBeenCalledWith(updatedCotizacion);
    });

    it('returns 404 when cotizacion not found', async () => {
      mocks.findByIdAndUpdate.mockResolvedValue(null);

      const req = {
        params: { id: '999' },
        body: { estado: 'Aceptada' }
      } as unknown as Request;
      const res = buildRes();

      await cotizacionController.cambiarEstadoCotizacion(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Cotización no encontrada' });
    });

    it('returns 500 when update fails', async () => {
      mocks.findByIdAndUpdate.mockRejectedValue(new Error('DB Error'));

      const req = {
        params: { id: '1' },
        body: { estado: 'Aceptada' }
      } as unknown as Request;
      const res = buildRes();

      await cotizacionController.cambiarEstadoCotizacion(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al cambiar estado de cotización' });
    });
  });

  describe('getPdfCotizacion', () => {
    it('returns PDF buffer with 200', async () => {
      const mockCotizacion = {
        _id: '1',
        numeroPresupuesto: 'PRES-001',
        cliente: 'Cliente A',
        fecha: new Date(),
        vigencia: new Date(),
        items: [],
        total: 1000,
        razonSocial: { nombre: 'RazonSocial' },
        estado: 'Pendiente',
        comentariosPdf: 'Test'
      };

      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockCotizacion)
          })
        })
      };
      mocks.findById.mockReturnValue(chain);

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await cotizacionController.getPdfCotizacion(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('inline')
      );
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('returns 404 when cotizacion not found', async () => {
      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(null)
          })
        })
      };
      mocks.findById.mockReturnValue(chain);

      const req = { params: { id: '999' } } as unknown as Request;
      const res = buildRes();

      await cotizacionController.getPdfCotizacion(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Cotización no encontrada' });
    });

    it('returns 500 when generating pdf fails', async () => {
      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockRejectedValue(new Error('DB error'))
          })
        })
      };
      mocks.findById.mockReturnValue(chain);

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await cotizacionController.getPdfCotizacion(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Error al generar PDF de cotización' })
      );
    });
  });

  describe('getPdfChecklistCotizacion', () => {
    it('returns checklist PDF with 200', async () => {
      const mockCotizacion = {
        _id: '1',
        numeroPresupuesto: 'PRES-CHK',
        cliente: 'Cliente A',
        fecha: new Date(),
        vigencia: new Date(),
        estado: 'Pendiente',
        items: [
          { marca: 'M', modelo: 'X', concepto: 'C', cantidad: 1, unidad: 'u' }
        ],
        razonSocial: { nombre: 'RS' }
      };

      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockCotizacion)
          })
        })
      };
      mocks.findById.mockReturnValue(chain);

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await cotizacionController.getPdfChecklistCotizacion(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('returns 404 when cotizacion not found', async () => {
      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(null)
          })
        })
      };
      mocks.findById.mockReturnValue(chain);

      const req = { params: { id: '404' } } as unknown as Request;
      const res = buildRes();

      await cotizacionController.getPdfChecklistCotizacion(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Cotización no encontrada' });
    });

    it('returns 500 when checklist generation fails', async () => {
      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockRejectedValue(new Error('DB error'))
          })
        })
      };
      mocks.findById.mockReturnValue(chain);

      const req = { params: { id: 'err' } } as unknown as Request;
      const res = buildRes();

      await cotizacionController.getPdfChecklistCotizacion(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: 'Error al generar PDF checklist de cotización' })
      );
    });
  });

  describe('descargarPdfCotizacion', () => {
    it('downloads PDF with attachment disposition', async () => {
      const mockCotizacion = {
        _id: '1',
        numeroPresupuesto: 'PRES-DOWN',
        cliente: 'Cliente A',
        fecha: new Date(),
        vigencia: new Date(),
        items: [],
        total: 1000,
        razonSocial: { nombre: 'RS' },
        estado: 'Pendiente',
        comentariosPdf: ''
      };

      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockCotizacion)
          })
        })
      };
      mocks.findById.mockReturnValue(chain);

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await cotizacionController.descargarPdfCotizacion(req, res);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment')
      );
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });
  });

  describe('descargarPdfChecklistCotizacion', () => {
    it('downloads checklist PDF with attachment disposition', async () => {
      const mockCotizacion = {
        _id: '1',
        numeroPresupuesto: 'PRES-DOWN-CHK',
        cliente: 'Cliente A',
        fecha: new Date(),
        vigencia: new Date(),
        estado: 'Pendiente',
        items: [
          { marca: 'M', modelo: 'X', concepto: 'C', cantidad: 1, unidad: 'u' }
        ],
        razonSocial: { nombre: 'RS' }
      };

      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockCotizacion)
          })
        })
      };
      mocks.findById.mockReturnValue(chain);

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await cotizacionController.descargarPdfChecklistCotizacion(req, res);

      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment')
      );
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });
  });

  describe('generateNumeroPresupuesto', () => {
    it('returns generated numeroPresupuesto', async () => {
      const req = { body: { razonSocial: 'rs', nombreEmpresa: 'Empresa' } } as Request;
      const res = buildRes();

      await cotizacionController.generateNumeroPresupuesto(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ numeroPresupuesto: 'PRES-2026-001' })
      );
    });

    it('returns 500 when no unique numero is found after attempts', async () => {
      (validarNumeroPresupuestoUnico as jest.Mock).mockResolvedValue(false);
      (generarNumeroPresupuesto as jest.Mock).mockResolvedValue('DUP');

      const req = { body: { razonSocial: 'rs' } } as Request;
      const res = buildRes();

      await cotizacionController.generateNumeroPresupuesto(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'No se pudo generar un número único después de múltiples intentos'
        })
      );
    });
  });
});
