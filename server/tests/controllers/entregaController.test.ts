import { Request, Response } from 'express';
import * as entregaController from '../../src/controllers/entregaController';

// Create a mocks object to hold all mock references BEFORE jest.mock calls
// Use var for hoisting so jest.mock can access it
var mocks: any;

jest.mock('../../src/models/Entrega', () => {
  mocks = {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    save: jest.fn().mockResolvedValue(undefined),
    inventoryItemFindById: jest.fn(),
    inventoryItemSave: jest.fn().mockResolvedValue(undefined),
    inventoryMovementConstructor: jest.fn().mockImplementation(function (this: any, payload: any) {
      Object.assign(this, payload);
      this.save = mocks.inventoryMovementSave;
    }),
    inventoryMovementSave: jest.fn().mockResolvedValue(undefined),
    generarPdfEntrega: jest.fn().mockResolvedValue(Buffer.from('PDF_CONTENT')),
    clienteFindOne: jest.fn().mockResolvedValue(null)
  };

  const MockEntrega = jest.fn(function (this: any, payload: any) {
    Object.assign(this, payload);
    this.save = mocks.save;
  });

  (MockEntrega as any).find = mocks.find;
  (MockEntrega as any).findById = mocks.findById;
  (MockEntrega as any).findByIdAndUpdate = mocks.findByIdAndUpdate;
  (MockEntrega as any).findByIdAndDelete = mocks.findByIdAndDelete;

  return { __esModule: true, default: MockEntrega };
});

jest.mock('../../src/models/InventoryItem', () => {
  const InventoryItemConstructor = jest.fn().mockImplementation(function (this: any, payload: any) {
    Object.assign(this, payload);
    this.save = mocks.inventoryItemSave;
  });

  (InventoryItemConstructor as any).findById = mocks.inventoryItemFindById;

  return {
    __esModule: true,
    InventoryItem: InventoryItemConstructor
  };
});

jest.mock('../../src/models/InventoryMovement', () => {
  return { __esModule: true, InventoryMovement: mocks.inventoryMovementConstructor };
});

jest.mock('../../src/services/entregaPdfGenerator', () => {
  return {
    EntregaPdfGenerator: jest.fn().mockImplementation(() => ({
      generarPdfEntrega: mocks.generarPdfEntrega
    })),
    EntregaPdfData: {}
  };
});

jest.mock('../../src/models/Cliente', () => {
  return {
    __esModule: true,
    default: {
      findOne: mocks.clienteFindOne
    }
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

describe('entregaController', () => {
  beforeEach(() => {
    // Reset all mocks to default state
    mocks.find.mockClear();
    mocks.findById.mockClear();
    mocks.findByIdAndUpdate.mockClear();
    mocks.findByIdAndDelete.mockClear();
    mocks.save.mockClear().mockResolvedValue(undefined);
    mocks.inventoryItemFindById.mockClear();
    mocks.inventoryItemSave.mockClear().mockResolvedValue(undefined);
    mocks.inventoryMovementSave.mockClear().mockResolvedValue(undefined);
    mocks.generarPdfEntrega.mockClear().mockResolvedValue(Buffer.from('PDF_CONTENT'));
    mocks.clienteFindOne.mockClear().mockResolvedValue(null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getEntregas', () => {
    it('returns list of entregas with 200', async () => {
      const mockEntregas = [
        { _id: '1', numeroEntrega: 'ENT-001', cliente: 'Cliente A' },
        { _id: '2', numeroEntrega: 'ENT-002', cliente: 'Cliente B' }
      ];
      const chain = {
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockEntregas)
        })
      };
      mocks.find.mockReturnValue(chain);

      const req = {} as Request;
      const res = buildRes();

      await entregaController.getEntregas(req, res);

      expect(res.json).toHaveBeenCalledWith(mockEntregas);
    });

    it('returns 500 when find fails', async () => {
      const chain = {
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockRejectedValue(new Error('DB Error'))
        })
      };
      mocks.find.mockReturnValue(chain);

      const req = {} as Request;
      const res = buildRes();

      await entregaController.getEntregas(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener entregas' });
    });
  });

  describe('getEntregaById', () => {
    it('returns entrega when found with 200', async () => {
      const mockEntrega = {
        _id: '1',
        numeroEntrega: 'ENT-001',
        cliente: 'Cliente A'
      };
      const chain = {
        populate: jest.fn().mockResolvedValue(mockEntrega)
      };
      mocks.findById.mockReturnValue(chain);

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await entregaController.getEntregaById(req, res);

      expect(res.json).toHaveBeenCalledWith(mockEntrega);
    });

    it('returns 404 when entrega not found', async () => {
      const chain = {
        populate: jest.fn().mockResolvedValue(null)
      };
      mocks.findById.mockReturnValue(chain);

      const req = { params: { id: '999' } } as unknown as Request;
      const res = buildRes();

      await entregaController.getEntregaById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Entrega no encontrada' });
    });

    it('returns 500 when findById fails', async () => {
      const chain = {
        populate: jest.fn().mockRejectedValue(new Error('DB Error'))
      };
      mocks.findById.mockReturnValue(chain);

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await entregaController.getEntregaById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener entrega' });
    });
  });

  describe('createEntrega', () => {
    it('creates entrega without inventory items and returns 201', async () => {
      const entregaData = {
        numeroEntrega: 'ENT-001',
        cliente: 'Cliente A',
        items: [],
        razonSocial: '123456789'
      };

      const createdEntrega = {
        _id: 'new-id',
        ...entregaData,
        fechaCreacion: expect.any(Date),
        fechaActualizacion: expect.any(Date)
      };

      const req = { body: entregaData } as Request;
      const res = buildRes();

      // Mock instance methods
      const mockInstance = {
        ...entregaData,
        save: jest.fn().mockResolvedValue(undefined)
      };

      Object.assign(mockInstance, createdEntrega);

      await entregaController.createEntrega(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it('creates entrega with inventory items and updates inventory', async () => {
      const entregaData = {
        numeroEntrega: 'ENT-002',
        cliente: 'Cliente B',
        items: [
          { inventarioItemId: 'inv-1', cantidad: 5, clave: 'CL001', marca: 'Marca', modelo: 'Modelo', concepto: 'Desc', unidad: 'pz' }
        ],
        razonSocial: '123456789'
      };

      const inventoryItem = {
        _id: 'inv-1',
        cantidad: 10,
        save: jest.fn().mockResolvedValue(undefined)
      };

      mocks.inventoryItemFindById.mockResolvedValue(inventoryItem);

      const req = { body: entregaData, user: { nombre: 'testuser' } } as any;
      const res = buildRes();

      await entregaController.createEntrega(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(mocks.inventoryItemFindById).toHaveBeenCalledWith('inv-1');
      expect(inventoryItem.cantidad).toBe(5); // 10 - 5
      expect(inventoryItem.save).toHaveBeenCalled();
      expect(mocks.inventoryMovementConstructor).toHaveBeenCalled();
    });

    it('returns 500 when save fails', async () => {
      const entregaData = {
        numeroEntrega: 'ENT-003',
        cliente: 'Cliente C',
        items: []
      };

      mocks.save.mockRejectedValue(new Error('Validation Error'));

      const req = { body: entregaData } as Request;
      const res = buildRes();

      await entregaController.createEntrega(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Error al crear entrega'
        })
      );
    });
  });

  describe('updateEntrega', () => {
    it('updates entrega and returns 200', async () => {
      const updateData = {
        numeroEntrega: 'ENT-001-UPDATED',
        cliente: 'Cliente A Updated'
      };

      const updatedEntrega = {
        _id: '1',
        ...updateData,
        fechaActualizacion: expect.any(Date)
      };

      mocks.findByIdAndUpdate.mockResolvedValue(updatedEntrega);

      const req = { params: { id: '1' }, body: updateData } as unknown as Request;
      const res = buildRes();

      await entregaController.updateEntrega(req, res);

      expect(res.json).toHaveBeenCalledWith(updatedEntrega);
    });

    it('returns 404 when entrega not found', async () => {
      const updateData = { numeroEntrega: 'ENT-NEW' };

      mocks.findByIdAndUpdate.mockResolvedValue(null);

      const req = { params: { id: '999' }, body: updateData } as unknown as Request;
      const res = buildRes();

      await entregaController.updateEntrega(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Entrega no encontrada' });
    });

    it('returns 500 when update fails', async () => {
      const updateData = { numeroEntrega: 'ENT-ERROR' };

      mocks.findByIdAndUpdate.mockRejectedValue(new Error('DB Error'));

      const req = { params: { id: '1' }, body: updateData } as unknown as Request;
      const res = buildRes();

      await entregaController.updateEntrega(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Error al actualizar entrega'
        })
      );
    });
  });

  describe('deleteEntrega', () => {
    it('deletes entrega and returns success message', async () => {
      const deletedEntrega = { _id: '1', numeroEntrega: 'ENT-001' };

      mocks.findByIdAndDelete.mockResolvedValue(deletedEntrega);

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await entregaController.deleteEntrega(req, res);

      expect(res.json).toHaveBeenCalledWith({ message: 'Entrega eliminada exitosamente' });
    });

    it('returns 404 when entrega not found', async () => {
      mocks.findByIdAndDelete.mockResolvedValue(null);

      const req = { params: { id: '999' } } as unknown as Request;
      const res = buildRes();

      await entregaController.deleteEntrega(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Entrega no encontrada' });
    });

    it('returns 500 when delete fails', async () => {
      mocks.findByIdAndDelete.mockRejectedValue(new Error('DB Error'));

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await entregaController.deleteEntrega(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al eliminar entrega' });
    });
  });

  describe('searchEntregas', () => {
    it('returns entregas matching search term', async () => {
      const searchResults = [
        { _id: '1', numeroEntrega: 'ENT-001', cliente: 'Cliente A' }
      ];

      const chain = {
        populate: jest.fn().mockResolvedValue(searchResults)
      };
      mocks.find.mockReturnValue(chain);

      const req = { query: { term: 'ENT-001' } } as unknown as Request;
      const res = buildRes();

      await entregaController.searchEntregas(req, res);

      expect(res.json).toHaveBeenCalledWith(searchResults);
    });

    it('returns 400 when search term not provided', async () => {
      const req = { query: {} } as unknown as Request;
      const res = buildRes();

      await entregaController.searchEntregas(req, res);

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

      await entregaController.searchEntregas(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al buscar entregas' });
    });
  });

  describe('getPdfEntrega', () => {
    it('returns PDF buffer with 200 and inline disposition', async () => {
      const mockEntrega = {
        _id: '1',
        numeroEntrega: 'ENT-001',
        cliente: 'Cliente A',
        fecha: new Date(),
        items: [],
        comentarios: '',
        razonSocial: { nombre: 'RazonSocial', rfc: 'RFC123' }
      };

      const chain = {
        populate: jest.fn().mockResolvedValue(mockEntrega)
      };
      mocks.findById.mockReturnValue(chain);

      mocks.clienteFindOne.mockResolvedValue(null);

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await entregaController.getPdfEntrega(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('inline')
      );
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('returns 404 when entrega not found', async () => {
      const chain = {
        populate: jest.fn().mockResolvedValue(null)
      };
      mocks.findById.mockReturnValue(chain);

      const req = { params: { id: '999' } } as unknown as Request;
      const res = buildRes();

      await entregaController.getPdfEntrega(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Entrega no encontrada' });
    });

    it('returns 500 when PDF generation fails', async () => {
      const mockEntrega = {
        _id: '1',
        numeroEntrega: 'ENT-001',
        cliente: 'Cliente A',
        fecha: new Date(),
        items: [],
        comentarios: '',
        razonSocial: {}
      };

      const chain = {
        populate: jest.fn().mockResolvedValue(mockEntrega)
      };
      mocks.findById.mockReturnValue(chain);

      mocks.generarPdfEntrega.mockRejectedValue(new Error('PDF Error'));

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await entregaController.getPdfEntrega(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Error al generar PDF de entrega'
        })
      );
    });
  });

  describe('descargarPdfEntrega', () => {
    it('returns PDF buffer with attachment disposition', async () => {
      const mockEntrega = {
        _id: '1',
        numeroEntrega: 'ENT-001',
        cliente: 'Cliente A',
        fecha: new Date(),
        items: [],
        comentarios: '',
        razonSocial: { nombre: 'RazonSocial' }
      };

      const chain = {
        populate: jest.fn().mockResolvedValue(mockEntrega)
      };
      mocks.findById.mockReturnValue(chain);

      mocks.clienteFindOne.mockResolvedValue(null);

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await entregaController.descargarPdfEntrega(req, res);

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('attachment')
      );
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer));
    });

    it('returns 404 when entrega not found', async () => {
      const chain = {
        populate: jest.fn().mockResolvedValue(null)
      };
      mocks.findById.mockReturnValue(chain);

      const req = { params: { id: '999' } } as unknown as Request;
      const res = buildRes();

      await entregaController.descargarPdfEntrega(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Entrega no encontrada' });
    });

    it('returns 500 when PDF generation fails', async () => {
      const mockEntrega = {
        _id: '1',
        numeroEntrega: 'ENT-001',
        cliente: 'Cliente A',
        fecha: new Date(),
        items: [],
        comentarios: '',
        razonSocial: {}
      };

      const chain = {
        populate: jest.fn().mockResolvedValue(mockEntrega)
      };
      mocks.findById.mockReturnValue(chain);

      mocks.generarPdfEntrega.mockRejectedValue(new Error('PDF Error'));

      const req = { params: { id: '1' } } as unknown as Request;
      const res = buildRes();

      await entregaController.descargarPdfEntrega(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Error al descargar PDF de entrega'
        })
      );
    });
  });
});
