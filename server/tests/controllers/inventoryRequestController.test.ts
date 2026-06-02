import { InventoryRequestController } from '../../src/controllers/inventoryRequestController';
import mongoose from 'mongoose';

var mocks: any;
function ensureMocks() {
  if (!mocks) {
    mocks = {};
  }
  return mocks;
}

jest.mock('../../src/models/InventoryRequest', () => {
  const m = ensureMocks();
  m.reqFind = jest.fn();
  m.reqFindById = jest.fn();
  m.reqSave = jest.fn();

  class MockInventoryRequest {
    public save = m.reqSave;
    constructor(payload: any) {
      Object.assign(this, payload);
    }

    static find = m.reqFind;
    static findById = m.reqFindById;
  }

  return { __esModule: true, InventoryRequest: MockInventoryRequest };
});

jest.mock('../../src/models/InventoryItem', () => {
  const m = ensureMocks();
  m.itemFindById = jest.fn();
  m.itemUpdateOne = jest.fn();
  return { __esModule: true, InventoryItem: { findById: m.itemFindById, updateOne: m.itemUpdateOne } };
});

jest.mock('../../src/models/InventoryExteriorItem', () => {
  const m = ensureMocks();
  m.exteriorFindById = jest.fn();
  m.exteriorUpdateOne = jest.fn();
  return { __esModule: true, InventoryExteriorItem: { findById: m.exteriorFindById, updateOne: m.exteriorUpdateOne } };
});

function buildRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function makeQuery(result: any, reject = false) {
  return {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    lean: reject ? jest.fn().mockRejectedValue(result) : jest.fn().mockResolvedValue(result)
  };
}

describe('InventoryRequestController', () => {
  beforeEach(() => {
    ensureMocks();
    jest.clearAllMocks();
  });

  describe('createRequest', () => {
    it('returns 401 when user is not authenticated', async () => {
      const req: any = { user: undefined, body: {} };
      const res = buildRes();

      await InventoryRequestController.createRequest(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'No autorizado. Por favor, inicie sesión.' });
    });

    it('returns 404 when item is not found', async () => {
      mocks.itemFindById.mockResolvedValue(null);

      const req: any = { user: { _id: 'u1' }, body: { inventarioTipo: 'INTERIOR', itemId: 'i1' } };
      const res = buildRes();

      await InventoryRequestController.createRequest(req, res, jest.fn());

      expect(mocks.itemFindById).toHaveBeenCalledWith('i1');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Item no encontrado' });
    });

    it('returns 400 when salida quantity exceeds stock', async () => {
      mocks.itemFindById.mockResolvedValue({ cantidad: 1, numerosSerie: [] });

      const req: any = { user: { _id: 'u1' }, body: { inventarioTipo: 'INTERIOR', itemId: 'i1', tipoMovimiento: 'SALIDA', cantidad: 3 } };
      const res = buildRes();

      await InventoryRequestController.createRequest(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'No hay suficiente cantidad disponible' });
    });

    it('returns 400 when serial numbers are invalid', async () => {
      mocks.itemFindById.mockResolvedValue({ cantidad: 5, numerosSerie: ['S1'] });

      const req: any = { user: { _id: 'u1' }, body: { inventarioTipo: 'INTERIOR', itemId: 'i1', tipoMovimiento: 'SALIDA', cantidad: 1, numerosSerie: ['BAD'] } };
      const res = buildRes();

      await InventoryRequestController.createRequest(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Algunos números de serie no son válidos' });
    });

    it('creates request when data is valid', async () => {
      mocks.itemFindById.mockResolvedValue({ cantidad: 5, numerosSerie: ['S1'] });
      mocks.reqSave.mockResolvedValue({ _id: 'r1' });

      const req: any = { user: { _id: 'u1' }, body: { inventarioTipo: 'INTERIOR', itemId: 'i1', tipoMovimiento: 'SALIDA', cantidad: 1, motivoSolicitud: 'm', numerosSerie: ['S1'] } };
      const res = buildRes();

      await InventoryRequestController.createRequest(req, res, jest.fn());

      expect(mocks.reqSave).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Solicitud creada exitosamente' }));
    });

    it('returns 500 when an unexpected error occurs', async () => {
      mocks.itemFindById.mockRejectedValue(new Error('fail'));

      const req: any = { user: { _id: 'u1' }, body: { inventarioTipo: 'INTERIOR', itemId: 'i1', tipoMovimiento: 'ENTRADA', cantidad: 1 } };
      const res = buildRes();

      await InventoryRequestController.createRequest(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error al crear la solicitud' }));
    });
  });

  describe('getPendingRequests', () => {
    it('returns populated pending requests', async () => {
      mocks.reqFind.mockReturnValue(makeQuery([{ _id: 'r1', inventarioTipo: 'INTERIOR', itemId: 'i1' }]));
      mocks.itemFindById.mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'i1', nombre: 'item' }) });

      const req: any = {};
      const res = buildRes();

      await InventoryRequestController.getPendingRequests(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ itemId: { _id: 'i1', nombre: 'item' } })]));
    });

    it('returns 500 when find fails', async () => {
      mocks.reqFind.mockReturnValue(makeQuery(new Error('fail'), true));

      const req: any = {};
      const res = buildRes();

      await InventoryRequestController.getPendingRequests(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error al obtener las solicitudes' }));
    });
  });

  describe('getUserRequests', () => {
    it('returns 401 when user is missing', async () => {
      const req: any = { user: undefined };
      const res = buildRes();

      await InventoryRequestController.getUserRequests(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Usuario no autenticado' });
    });

    it('returns user requests with populated items', async () => {
      mocks.reqFind.mockReturnValue(makeQuery([{ _id: 'r1', inventarioTipo: 'EXTERIOR', itemId: 'e1' }]));
      mocks.exteriorFindById.mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'e1', nombre: 'ext' }) });

      const req: any = { user: { _id: new mongoose.Types.ObjectId('507f1f77bcf86cd799439011') } };
      const res = buildRes();

      await InventoryRequestController.getUserRequests(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ itemId: { _id: 'e1', nombre: 'ext' } })]));
    });

    it('returns 500 on errors', async () => {
      mocks.reqFind.mockReturnValue(makeQuery(new Error('fail'), true));

      const req: any = { user: { _id: 'u1' } };
      const res = buildRes();

      await InventoryRequestController.getUserRequests(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error al obtener las solicitudes' }));
    });
  });

  describe('getRequestHistory', () => {
    it('returns processed requests', async () => {
      mocks.reqFind.mockReturnValue(makeQuery([{ _id: 'r1', inventarioTipo: 'INTERIOR', itemId: 'i1' }]));
      mocks.itemFindById.mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'i1', nombre: 'item' }) });

      const req: any = {};
      const res = buildRes();

      await InventoryRequestController.getRequestHistory(req, res, jest.fn());

      expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ itemId: { _id: 'i1', nombre: 'item' } })]));
    });

    it('returns 500 when query fails', async () => {
      mocks.reqFind.mockReturnValue(makeQuery(new Error('fail'), true));

      const req: any = {};
      const res = buildRes();

      await InventoryRequestController.getRequestHistory(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error al obtener el historial' }));
    });
  });

  describe('processRequest', () => {
    it('returns 404 when request does not exist', async () => {
      mocks.reqFindById.mockResolvedValue(null);

      const req: any = { params: { requestId: 'r1' }, body: { action: 'APROBAR' } };
      const res = buildRes();

      await InventoryRequestController.processRequest(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Solicitud no encontrada' });
    });

    it('returns 400 when already processed', async () => {
      mocks.reqFindById.mockResolvedValue({ estado: 'APROBADA', save: jest.fn() });

      const req: any = { params: { requestId: 'r1' }, body: { action: 'APROBAR' } };
      const res = buildRes();

      await InventoryRequestController.processRequest(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Esta solicitud ya ha sido procesada' });
    });

    it('approves request and updates inventory', async () => {
      const save = jest.fn();
      mocks.reqFindById.mockResolvedValue({ _id: 'r1', estado: 'PENDIENTE', inventarioTipo: 'INTERIOR', tipoMovimiento: 'ENTRADA', cantidad: 2, itemId: 'i1', numerosSerie: ['S1'], save });
      mocks.itemFindById.mockResolvedValue({ _id: 'i1', cantidad: 5 });
      mocks.itemUpdateOne.mockResolvedValue({});

      const req: any = { params: { requestId: 'r1' }, body: { action: 'APROBAR' }, user: { _id: 'admin' } };
      const res = buildRes();

      await InventoryRequestController.processRequest(req, res, jest.fn());

      expect(mocks.itemUpdateOne).toHaveBeenCalledWith({ _id: 'i1' }, expect.any(Object));
      expect(save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('aprobada') }));
    });

    it('rejects when item is missing on approve', async () => {
      mocks.reqFindById.mockResolvedValue({ estado: 'PENDIENTE', inventarioTipo: 'INTERIOR', tipoMovimiento: 'ENTRADA', cantidad: 1, itemId: 'i1', save: jest.fn() });
      mocks.itemFindById.mockResolvedValue(null);

      const req: any = { params: { requestId: 'r1' }, body: { action: 'APROBAR' } };
      const res = buildRes();

      await InventoryRequestController.processRequest(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Item no encontrado' });
    });

    it('rejects when not enough quantity on salida', async () => {
      mocks.reqFindById.mockResolvedValue({ estado: 'PENDIENTE', inventarioTipo: 'INTERIOR', tipoMovimiento: 'SALIDA', cantidad: 5, itemId: 'i1', save: jest.fn() });
      mocks.itemFindById.mockResolvedValue({ cantidad: 1 });

      const req: any = { params: { requestId: 'r1' }, body: { action: 'APROBAR' } };
      const res = buildRes();

      await InventoryRequestController.processRequest(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'No hay suficiente cantidad disponible' });
    });

    it('rejects request and sets reason', async () => {
      const save = jest.fn();
      const requestObj: any = { _id: 'r1', estado: 'PENDIENTE', inventarioTipo: 'EXTERIOR', tipoMovimiento: 'SALIDA', cantidad: 1, itemId: 'i1', save };
      mocks.reqFindById.mockResolvedValue(requestObj);

      const req: any = { params: { requestId: 'r1' }, body: { action: 'RECHAZAR', motivoRechazo: 'bad' }, user: { _id: 'admin' } };
      const res = buildRes();

      await InventoryRequestController.processRequest(req, res, jest.fn());

      expect(save).toHaveBeenCalled();
      expect(requestObj.estado).toBe('RECHAZADA');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('rechazada') }));
    });

    it('returns 500 on unexpected errors', async () => {
      mocks.reqFindById.mockRejectedValue(new Error('fail'));

      const req: any = { params: { requestId: 'r1' }, body: { action: 'APROBAR' } };
      const res = buildRes();

      await InventoryRequestController.processRequest(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error al procesar la solicitud' }));
    });
  });
});
