import { Request, Response } from 'express';

// Mock all dependencies BEFORE importing the controller
jest.mock('puppeteer', () => ({
  __esModule: true,
  default: {
    launch: jest.fn(),
  },
}));
jest.mock('fs');
jest.mock('child_process');
jest.mock('../../src/services/pdfGenerator', () => ({
  __esModule: true,
  PdfGeneratorService: jest.fn().mockImplementation(() => ({
    generarPdfOrdenCompra: jest.fn().mockResolvedValue(Buffer.from('PDF_MOCK')),
  })),
}));

import * as ordenCompraController from '../../src/controllers/ordenCompraController';

var mocks: any;

jest.mock('../../src/models/OrdenCompra', () => {
  mocks = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    save: jest.fn().mockResolvedValue(undefined)
  };

  const MockOrdenCompra = jest.fn(function (this: any, payload: any) {
    Object.assign(this, payload);
    this.save = mocks.save;
  });

  (MockOrdenCompra as any).find = mocks.find;
  (MockOrdenCompra as any).findById = mocks.findById;
  (MockOrdenCompra as any).findByIdAndUpdate = mocks.findByIdAndUpdate;
  (MockOrdenCompra as any).findByIdAndDelete = mocks.findByIdAndDelete;

  return { __esModule: true, default: MockOrdenCompra };
});

jest.mock('../../src/models/Proveedor', () => ({
  __esModule: true,
  default: {
    findById: jest.fn().mockResolvedValue({ _id: 'prov-1', empresa: 'Proveedor A' })
  }
}));

jest.mock('../../src/models/RazonSocial', () => ({
  __esModule: true,
  default: {
    findById: jest.fn().mockResolvedValue({ _id: 'rs-1', nombre: 'RazonSocial A' })
  }
}));

jest.mock('../../src/models/Vendedor', () => ({
  __esModule: true,
  default: {
    findById: jest.fn().mockResolvedValue({ _id: 'vend-1', nombre: 'Vendedor A' })
  }
}));

jest.mock('../../src/utils/dateUtils', () => ({
  DateUtils: {
    parseToMexicaliDate: jest.fn((date) => new Date(date)),
    getCurrentDateInMexicali: jest.fn(() => new Date('2026-03-17')),
    getStartOfDay: jest.fn((date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    }),
    getEndOfDay: jest.fn((date) => {
      const d = new Date(date);
      d.setHours(23, 59, 59, 999);
      return d;
    }),
    formatDateForInput: jest.fn(() => '2026-01-01'),
    formatForOrdenCompra: jest.fn(() => '2026-01-02')
  }
}));

const fs = require('fs') as jest.Mocked<typeof import('fs')>;

function buildRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res as Response);
  res.json = jest.fn().mockReturnValue(res as Response);
  res.setHeader = jest.fn().mockReturnValue(res as Response);
  res.send = jest.fn().mockReturnValue(res as Response);
  return res as Response;
}

describe('ordenCompraController', () => {
  beforeEach(() => {
    mocks.find.mockClear();
    mocks.findById.mockClear();
    mocks.findByIdAndUpdate.mockClear();
    mocks.findByIdAndDelete.mockClear();
    mocks.save.mockClear().mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrdenesCompra', () => {
    it('returns list of ordenes compra', async () => {
      const mockOrdenes = [{ _id: '1', numeroOrden: 'OC-001' }];
      mocks.findByIdAndUpdate.mockResolvedValue(undefined);
      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockOrdenes)
              })
            })
          })
        })
      };
      mocks.find.mockReturnValue(chain);

      const req = {} as Request;
      const res = buildRes();

      await ordenCompraController.getOrdenesCompra(req, res);

      expect(res.json).toHaveBeenCalledWith(mockOrdenes);
    });

    it('migrates folio when numeroCotizacion missing', async () => {
      const mockOrdenes = [{ _id: '1', numeroCotizacion: undefined, datosOrden: { datosPdf: { datosExtraidos: { folio: 'F-1', folioOriginal: 'FO-1' } } } }];
      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                sort: jest.fn().mockResolvedValue(mockOrdenes)
              })
            })
          })
        })
      };
      mocks.find.mockReturnValue(chain);
      mocks.findByIdAndUpdate.mockResolvedValue(undefined);

      const req = {} as Request;
      const res = buildRes();

      await ordenCompraController.getOrdenesCompra(req, res);

      expect(mocks.findByIdAndUpdate).toHaveBeenCalledWith('1', { numeroCotizacion: 'FO-1' });
      expect(res.json).toHaveBeenCalledWith(mockOrdenes);
    });

    it('returns 500 when find fails', async () => {
      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockReturnValue({
                sort: jest.fn().mockRejectedValue(new Error('DB Error'))
              })
            })
          })
        })
      };
      mocks.find.mockReturnValue(chain);

      const req = {} as Request;
      const res = buildRes();

      await ordenCompraController.getOrdenesCompra(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getOrdenCompraById', () => {
    it('returns orden when found', async () => {
      const mockOrden = { _id: '1', numeroOrden: 'OC-001' };
      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockResolvedValue(mockOrden)
            })
          })
        })
      };
      mocks.findById.mockReturnValue(chain);

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await ordenCompraController.getOrdenCompraById(req, res);

      expect(res.json).toHaveBeenCalledWith(mockOrden);
    });

    it('returns 404 when not found', async () => {
      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockResolvedValue(null)
            })
          })
        })
      };
      mocks.findById.mockReturnValue(chain);

      const req = { params: { id: '999' } } as unknown as Request;
      const res = buildRes();

      await ordenCompraController.getOrdenCompraById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 500 on error', async () => {
      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              populate: jest.fn().mockRejectedValue(new Error('DB Error'))
            })
          })
        })
      };
      mocks.findById.mockReturnValue(chain);

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await ordenCompraController.getOrdenCompraById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('createOrdenCompra', () => {
    it('returns 400 when proveedor not found', async () => {
      const Proveedor = require('../../src/models/Proveedor').default;
      Proveedor.findById.mockResolvedValueOnce(null);

      const req = { body: { numeroOrden: 'OC-001', proveedor: 'invalid' } } as Request;
      const res = buildRes();

      await ordenCompraController.createOrdenCompra(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 when razonSocial not found', async () => {
      const RazonSocial = require('../../src/models/RazonSocial').default;
      RazonSocial.findById.mockResolvedValueOnce(null);

      const req = {
        body: { numeroOrden: 'OC-001', proveedor: 'prov-1', razonSocial: 'invalid' }
      } as Request;
      const res = buildRes();

      await ordenCompraController.createOrdenCompra(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('creates orden compra', async () => {
      const mockOrden = { _id: 'new', numeroOrden: 'OC-001' };
      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockOrden)
          })
        })
      };
      mocks.findById.mockReturnValue(chain);

      const req = {
        body: { numeroOrden: 'OC-001', proveedor: 'prov-1', razonSocial: 'rs-1' }
      } as Request;
      const res = buildRes();

      await ordenCompraController.createOrdenCompra(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('returns 400 on duplicate numeroOrden', async () => {
      const dupError = Object.assign(new Error('dup'), { code: 11000 });
      mocks.save.mockRejectedValueOnce(dupError);
      const req = {
        body: { numeroOrden: 'OC-001', proveedor: 'prov-1', razonSocial: 'rs-1' }
      } as Request;
      const res = buildRes();

      await ordenCompraController.createOrdenCompra(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('updateOrdenCompra', () => {
    it('returns 400 when proveedor not found', async () => {
      const Proveedor = require('../../src/models/Proveedor').default;
      Proveedor.findById.mockResolvedValueOnce(null);

      const req = {
        params: { id: '1' },
        body: { proveedor: 'invalid' }
      } as unknown as Request;
      const res = buildRes();

      await ordenCompraController.updateOrdenCompra(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('updates orden compra', async () => {
      const mockOrden = { _id: '1', numeroOrden: 'OC-UPDATED' };
      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockOrden)
          })
        })
      };
      mocks.findByIdAndUpdate.mockReturnValue(chain);

      const req = {
        params: { id: '1' },
        body: { numeroOrden: 'OC-UPDATED' }
      } as unknown as Request;
      const res = buildRes();

      await ordenCompraController.updateOrdenCompra(req, res);

      expect(res.json).toHaveBeenCalledWith(mockOrden);
    });

    it('returns 404 when not found', async () => {
      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(null)
          })
        })
      };
      mocks.findByIdAndUpdate.mockReturnValue(chain);

      const req = {
        params: { id: '999' },
        body: { numeroOrden: 'OC-NEW' }
      } as unknown as Request;
      const res = buildRes();

      await ordenCompraController.updateOrdenCompra(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 400 on duplicate numeroOrden', async () => {
      const dupError = Object.assign(new Error('dup'), { code: 11000 });
      mocks.findByIdAndUpdate.mockRejectedValueOnce(dupError);
      const req = {
        params: { id: '1' },
        body: { numeroOrden: 'OC-DUP' }
      } as unknown as Request;
      const res = buildRes();

      await ordenCompraController.updateOrdenCompra(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('deleteOrdenCompra', () => {
    it('deletes orden compra', async () => {
      mocks.findByIdAndDelete.mockResolvedValue({ _id: '1' });

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await ordenCompraController.deleteOrdenCompra(req, res);

      expect(res.json).toHaveBeenCalled();
    });

    it('returns 404 when not found', async () => {
      mocks.findByIdAndDelete.mockResolvedValue(null);

      const req = { params: { id: '999' } } as unknown as Request;
      const res = buildRes();

      await ordenCompraController.deleteOrdenCompra(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 400 on error', async () => {
      mocks.findByIdAndDelete.mockRejectedValue(new Error('DB Error'));

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await ordenCompraController.deleteOrdenCompra(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getOrdenesByProveedor', () => {
    it('returns ordenes for proveedor', async () => {
      const mockOrdenes = [{ _id: '1', proveedor: 'prov-1' }];
      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockOrdenes)
          })
        })
      };
      mocks.find.mockReturnValue(chain);

      const req = { params: { proveedorId: 'prov-1' } } as unknown as Request;
      const res = buildRes();

      await ordenCompraController.getOrdenesByProveedor(req, res);

      expect(res.json).toHaveBeenCalledWith(mockOrdenes);
    });

    it('returns 500 on error', async () => {
      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockRejectedValue(new Error('DB Error'))
          })
        })
      };
      mocks.find.mockReturnValue(chain);

      const req = { params: { proveedorId: 'prov-1' } } as unknown as Request;
      const res = buildRes();

      await ordenCompraController.getOrdenesByProveedor(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getOrdenesByRazonSocial', () => {
    it('returns ordenes for razon social', async () => {
      const mockOrdenes = [{ _id: '1', razonSocial: 'rs-1' }];
      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockOrdenes)
          })
        })
      };
      mocks.find.mockReturnValue(chain);

      const req = { params: { razonSocialId: 'rs-1' } } as unknown as Request;
      const res = buildRes();

      await ordenCompraController.getOrdenesByRazonSocial(req, res);

      expect(res.json).toHaveBeenCalledWith(mockOrdenes);
    });

    it('returns 500 on error', async () => {
      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockRejectedValue(new Error('DB Error'))
          })
        })
      };
      mocks.find.mockReturnValue(chain);

      const req = { params: { razonSocialId: 'rs-1' } } as unknown as Request;
      const res = buildRes();

      await ordenCompraController.getOrdenesByRazonSocial(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getOrdenesByDateRange', () => {
    it('returns ordenes for date range', async () => {
      const mockOrdenes = [{ _id: '1', fecha: '2026-03-17' }];
      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(mockOrdenes)
          })
        })
      };
      mocks.find.mockReturnValue(chain);

      const req = {
        query: { fechaInicio: '2026-03-15', fechaFin: '2026-03-20' }
      } as unknown as Request;
      const res = buildRes();

      await ordenCompraController.getOrdenesByDateRange(req, res);

      expect(res.json).toHaveBeenCalledWith(mockOrdenes);
    });

    it('returns 500 on error', async () => {
      const chain = {
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockRejectedValue(new Error('DB Error'))
          })
        })
      };
      mocks.find.mockReturnValue(chain);

      const req = {
        query: { fechaInicio: '2026-03-15', fechaFin: '2026-03-20' }
      } as unknown as Request;
      const res = buildRes();

      await ordenCompraController.getOrdenesByDateRange(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('generarPdfOrdenCompra', () => {
    it('returns 400 when missing numeroOrden', async () => {
      const req = { body: {} } as Request;
      const res = buildRes();

      await ordenCompraController.generarPdfOrdenCompra(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('sends pdf buffer with headers', async () => {
      const pdfSpy = (ordenCompraController as any).pdfGenerator?.generarPdfOrdenCompra as jest.Mock;
      pdfSpy?.mockResolvedValueOnce(Buffer.from('PDF'));
      const req = { body: { numeroOrden: 'OC-X' } } as Request;
      const res = buildRes();

      await ordenCompraController.generarPdfOrdenCompra(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.send).toHaveBeenCalled();
    });
  });

  describe('getPdfOrdenCompra', () => {
    it('returns 404 when order not found', async () => {
      mocks.findById.mockResolvedValueOnce(null);
      const req = { params: { id: 'nope' } } as unknown as Request;
      const res = buildRes();

      await ordenCompraController.getPdfOrdenCompra(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when no rutaPdf', async () => {
      mocks.findById.mockResolvedValueOnce({ _id: '1', rutaPdf: null });
      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await ordenCompraController.getPdfOrdenCompra(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when file missing', async () => {
      mocks.findById.mockResolvedValueOnce({ _id: '1', rutaPdf: 'pdfs/a.pdf', numeroOrden: 'X' });
      fs.existsSync.mockReturnValueOnce(false as any);
      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await ordenCompraController.getPdfOrdenCompra(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('streams pdf when found', async () => {
      mocks.findById.mockResolvedValueOnce({ _id: '1', rutaPdf: 'pdfs/a.pdf', numeroOrden: 'X' });
      fs.existsSync.mockReturnValueOnce(true as any);
      fs.readFileSync.mockReturnValueOnce(Buffer.from('PDF')); 
      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await ordenCompraController.getPdfOrdenCompra(req, res);

      expect(res.send).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    });
  });

  describe('descargarPdfOrdenCompra', () => {
    it('returns 404 when file missing', async () => {
      mocks.findById.mockResolvedValueOnce({ _id: '1', rutaPdf: 'pdfs/a.pdf', numeroOrden: 'X' });
      fs.existsSync.mockReturnValueOnce(false as any);
      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await ordenCompraController.descargarPdfOrdenCompra(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('crearOrdenDesdePdf', () => {
    it('returns 400 when no file uploaded', async () => {
      const req = { body: {}, file: undefined } as unknown as Request;
      const res = buildRes();

      await ordenCompraController.crearOrdenDesdePdf(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('crearOrdenCompraConPdf', () => {
    it('returns 400 when proveedor missing in DB', async () => {
      const Proveedor = require('../../src/models/Proveedor').default;
      Proveedor.findById.mockResolvedValueOnce(null);

      const req = { body: { proveedor: 'x', razonSocial: 'y', totalesCalculados: {} } } as Request;
      const res = buildRes();

      await ordenCompraController.crearOrdenCompraConPdf(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('updateOrdenCompraConPdf', () => {
    it('returns 404 when order not found', async () => {
      mocks.findById.mockResolvedValueOnce(null);
      const req = { params: { id: 'missing' }, body: { proveedor: 'p', razonSocial: 'r', totalesCalculados: {} } } as unknown as Request;
      const res = buildRes();

      await ordenCompraController.updateOrdenCompraConPdf(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
