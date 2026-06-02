import * as Controller from '../../src/controllers/materialCanalizacionController';

var mocks: any;
function ensureMocks() {
  if (!mocks) mocks = {};
  return mocks;
}

jest.mock('../../src/models/MaterialCanalizacion', () => {
  const m = ensureMocks();
  m.find = jest.fn();
  m.findById = jest.fn();
  m.findByIdAndUpdate = jest.fn();
  m.findByIdAndDelete = jest.fn();
  m.save = jest.fn();

  const MockModel = function (this: any, payload: any) {
    Object.assign(this, payload);
    this.save = m.save;
  } as any;

  (MockModel as any).find = m.find;
  (MockModel as any).findById = m.findById;
  (MockModel as any).findByIdAndUpdate = m.findByIdAndUpdate;
  (MockModel as any).findByIdAndDelete = m.findByIdAndDelete;

  return { __esModule: true, default: MockModel };
});

function buildRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function makeFindQuery(result: any, reject = false) {
  return {
    sort: reject ? jest.fn().mockRejectedValue(result) : jest.fn().mockResolvedValue(result)
  };
}

describe('materialCanalizacionController', () => {
  beforeEach(() => {
    ensureMocks();
    jest.clearAllMocks();
  });

  describe('getMaterialesCanalizacion', () => {
    it('returns list of materiales', async () => {
      mocks.find.mockReturnValue(makeFindQuery([{ _id: '1' }]));

      const req: any = {};
      const res = buildRes();

      await Controller.getMaterialesCanalizacion(req, res);

      expect(res.json).toHaveBeenCalledWith([{ _id: '1' }]);
    });

    it('returns 500 on failure', async () => {
      mocks.find.mockReturnValue(makeFindQuery(new Error('fail'), true));

      const req: any = {};
      const res = buildRes();

      await Controller.getMaterialesCanalizacion(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener materiales de canalización' });
    });
  });

  describe('getMaterialCanalizacionById', () => {
    it('returns material when found', async () => {
      mocks.findById.mockResolvedValue({ _id: '1' });

      const req: any = { params: { id: '1' } };
      const res = buildRes();

      await Controller.getMaterialCanalizacionById(req, res);

      expect(res.json).toHaveBeenCalledWith({ _id: '1' });
    });

    it('returns 404 when not found', async () => {
      mocks.findById.mockResolvedValue(null);

      const req: any = { params: { id: 'x' } };
      const res = buildRes();

      await Controller.getMaterialCanalizacionById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Material de canalización no encontrado' });
    });

    it('returns 500 on error', async () => {
      mocks.findById.mockRejectedValue(new Error('fail'));

      const req: any = { params: { id: 'x' } };
      const res = buildRes();

      await Controller.getMaterialCanalizacionById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al obtener material de canalización' });
    });
  });

  describe('createMaterialCanalizacion', () => {
    it('creates material and returns 201', async () => {
      mocks.save.mockResolvedValue({ _id: '1' });

      const req: any = { body: { nombre: 'm' } };
      const res = buildRes();

      await Controller.createMaterialCanalizacion(req, res);

      expect(mocks.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
    });

    it('returns 400 on error', async () => {
      mocks.save.mockRejectedValue(new Error('fail'));

      const req: any = { body: { nombre: 'm' } };
      const res = buildRes();

      await Controller.createMaterialCanalizacion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al crear material de canalización' });
    });
  });

  describe('updateMaterialCanalizacion', () => {
    it('returns 404 when not found', async () => {
      mocks.findByIdAndUpdate.mockResolvedValue(null);

      const req: any = { params: { id: '1' }, body: { nombre: 'm' } };
      const res = buildRes();

      await Controller.updateMaterialCanalizacion(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Material de canalización no encontrado' });
    });

    it('updates material and returns it', async () => {
      mocks.findByIdAndUpdate.mockResolvedValue({ _id: '1', nombre: 'm' });

      const req: any = { params: { id: '1' }, body: { nombre: 'nuevo' } };
      const res = buildRes();

      await Controller.updateMaterialCanalizacion(req, res);

      expect(res.json).toHaveBeenCalledWith({ _id: '1', nombre: 'm' });
    });

    it('returns 400 on error', async () => {
      mocks.findByIdAndUpdate.mockRejectedValue(new Error('fail'));

      const req: any = { params: { id: '1' }, body: { nombre: 'nuevo' } };
      const res = buildRes();

      await Controller.updateMaterialCanalizacion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al actualizar material de canalización' });
    });
  });

  describe('deleteMaterialCanalizacion', () => {
    it('returns 404 when not found', async () => {
      mocks.findByIdAndDelete.mockResolvedValue(null);

      const req: any = { params: { id: '1' } };
      const res = buildRes();

      await Controller.deleteMaterialCanalizacion(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Material de canalización no encontrado' });
    });

    it('deletes and returns success message', async () => {
      mocks.findByIdAndDelete.mockResolvedValue({ _id: '1' });

      const req: any = { params: { id: '1' } };
      const res = buildRes();

      await Controller.deleteMaterialCanalizacion(req, res);

      expect(res.json).toHaveBeenCalledWith({ message: 'Material de canalización eliminado exitosamente' });
    });

    it('returns 400 on error', async () => {
      mocks.findByIdAndDelete.mockRejectedValue(new Error('fail'));

      const req: any = { params: { id: '1' } };
      const res = buildRes();

      await Controller.deleteMaterialCanalizacion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al eliminar material de canalización' });
    });
  });

  describe('searchMaterialesCanalizacion', () => {
    it('applies filters and returns results', async () => {
      mocks.find.mockReturnValue(makeFindQuery([{ _id: '1' }]));

      const req: any = { query: { tipo: 't', material: 'm', proveedor: 'p', unidad: 'u' } };
      const res = buildRes();

      await Controller.searchMaterialesCanalizacion(req, res);

      expect(mocks.find).toHaveBeenCalledWith(expect.objectContaining({ tipo: expect.any(RegExp), material: expect.any(RegExp), proveedor: expect.any(RegExp), unidad: 'u' }));
      expect(res.json).toHaveBeenCalledWith([{ _id: '1' }]);
    });

    it('returns 500 on error', async () => {
      mocks.find.mockReturnValue(makeFindQuery(new Error('fail'), true));

      const req: any = { query: {} };
      const res = buildRes();

      await Controller.searchMaterialesCanalizacion(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Error al buscar materiales de canalización' });
    });
  });
});
