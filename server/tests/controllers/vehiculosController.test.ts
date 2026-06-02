import * as Controller from '../../src/controllers/vehiculosController';

var mocks: any;
function ensureMocks() {
  if (!mocks) mocks = {};
  return mocks;
}

jest.mock('../../src/models/Vehiculo', () => {
  const m = ensureMocks();
  m.find = jest.fn();
  m.findById = jest.fn();
  m.findOne = jest.fn();
  m.save = jest.fn();

  const MockVehiculo = function (this: any, payload: any) {
    Object.assign(this, payload);
    this.save = m.save;
  } as any;

  (MockVehiculo as any).find = m.find;
  (MockVehiculo as any).findById = m.findById;
  (MockVehiculo as any).findOne = m.findOne;

  return { __esModule: true, default: MockVehiculo };
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

describe('vehiculosController', () => {
  beforeEach(() => {
    ensureMocks();
    jest.clearAllMocks();
  });

  describe('getVehiculos', () => {
    it('returns active vehicles sorted', async () => {
      mocks.find.mockReturnValue(makeFindQuery([{ _id: '1' }]));

      const res = buildRes();
      await Controller.getVehiculos({} as any, res);

      expect(res.json).toHaveBeenCalledWith([{ _id: '1' }]);
    });

    it('returns 500 on error', async () => {
      mocks.find.mockReturnValue(makeFindQuery(new Error('fail'), true));

      const res = buildRes();
      await Controller.getVehiculos({} as any, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Error al obtener vehículos' });
    });
  });

  describe('getVehiculoById', () => {
    it('returns vehicle when found', async () => {
      mocks.findById.mockResolvedValue({ _id: '1' });

      const req: any = { params: { id: '1' } };
      const res = buildRes();

      await Controller.getVehiculoById(req, res);

      expect(res.json).toHaveBeenCalledWith({ _id: '1' });
    });

    it('returns 404 when missing', async () => {
      mocks.findById.mockResolvedValue(null);

      const req: any = { params: { id: 'x' } };
      const res = buildRes();

      await Controller.getVehiculoById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Vehículo no encontrado' });
    });

    it('returns 500 on error', async () => {
      mocks.findById.mockRejectedValue(new Error('fail'));

      const req: any = { params: { id: 'x' } };
      const res = buildRes();

      await Controller.getVehiculoById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Error al obtener vehículo' });
    });
  });

  describe('createVehiculo', () => {
    it('returns 400 when required fields missing', async () => {
      const req: any = { body: { marca: 'm' } };
      const res = buildRes();

      await Controller.createVehiculo(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Marca, modelo, año y color son requeridos' });
    });

    it('returns 400 on duplicate plates', async () => {
      mocks.findOne.mockResolvedValue({ _id: 'v1' });

      const req: any = { body: { marca: 'm', modelo: 'mod', año: 2020, color: 'c', placas: 'ABC' } };
      const res = buildRes();

      await Controller.createVehiculo(req, res);

      expect(mocks.findOne).toHaveBeenCalledWith({ placas: 'ABC', activo: true });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Ya existe un vehículo con esas placas' });
    });

    it('creates vehicle and returns 201', async () => {
      mocks.findOne.mockResolvedValue(null);
      mocks.save.mockImplementation(function (this: any) {
        this._id = 'v1';
        return Promise.resolve(this);
      });

      const req: any = { body: { marca: 'm', modelo: 'mod', año: 2020, color: 'c', placas: 'ABC', numeroSerie: 'N1' } };
      const res = buildRes();

      await Controller.createVehiculo(req, res);

      expect(mocks.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ _id: 'v1' }));
    });

    it('returns 400 on validation error', async () => {
      const err: any = new Error('bad');
      err.name = 'ValidationError';
      mocks.findOne.mockResolvedValue(null);
      mocks.save.mockRejectedValue(err);

      const req: any = { body: { marca: 'm', modelo: 'mod', año: 2020, color: 'c' } };
      const res = buildRes();

      await Controller.createVehiculo(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ mensaje: err.message });
    });

    it('returns 500 on unexpected error', async () => {
      mocks.findOne.mockResolvedValue(null);
      mocks.save.mockRejectedValue(new Error('fail'));

      const req: any = { body: { marca: 'm', modelo: 'mod', año: 2020, color: 'c' } };
      const res = buildRes();

      await Controller.createVehiculo(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Error al crear vehículo' });
    });
  });

  describe('updateVehiculo', () => {
    it('returns 404 when vehicle not found', async () => {
      mocks.findById.mockResolvedValue(null);

      const req: any = { params: { id: '1' }, body: {} };
      const res = buildRes();

      await Controller.updateVehiculo(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Vehículo no encontrado' });
    });

    it('returns 400 on duplicate plates', async () => {
      const save = jest.fn();
      mocks.findById.mockResolvedValue({ _id: '1', placas: 'OLD', save });
      mocks.findOne.mockResolvedValue({ _id: '2' });

      const req: any = { params: { id: '1' }, body: { placas: 'NEW' } };
      const res = buildRes();

      await Controller.updateVehiculo(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Ya existe un vehículo con esas placas' });
    });

    it('updates vehicle fields and returns it', async () => {
      const save = jest.fn();
      const vehiculo: any = { _id: '1', marca: 'm', modelo: 'mod', año: 2020, color: 'c', placas: 'OLD', numeroSerie: 'N', save };
      mocks.findById.mockResolvedValue(vehiculo);
      mocks.findOne.mockResolvedValue(null);

      const req: any = { params: { id: '1' }, body: { marca: 'nuevo', placas: 'NEW' } };
      const res = buildRes();

      await Controller.updateVehiculo(req, res);

      expect(save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ marca: 'nuevo', placas: 'NEW' }));
    });

    it('returns 400 on validation error', async () => {
      const err: any = new Error('bad');
      err.name = 'ValidationError';
      const save = jest.fn().mockRejectedValue(err);
      const vehiculo: any = { _id: '1', placas: 'OLD', save };
      mocks.findById.mockResolvedValue(vehiculo);
      mocks.findOne.mockResolvedValue(null);

      const req: any = { params: { id: '1' }, body: { placas: 'OLD' } };
      const res = buildRes();

      await Controller.updateVehiculo(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ mensaje: err.message });
    });

    it('returns 500 on unexpected error', async () => {
      const save = jest.fn().mockRejectedValue(new Error('fail'));
      const vehiculo: any = { _id: '1', placas: 'OLD', save };
      mocks.findById.mockResolvedValue(vehiculo);
      mocks.findOne.mockResolvedValue(null);

      const req: any = { params: { id: '1' }, body: {} };
      const res = buildRes();

      await Controller.updateVehiculo(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Error al actualizar vehículo' });
    });
  });

  describe('deleteVehiculo', () => {
    it('returns 404 when missing', async () => {
      mocks.findById.mockResolvedValue(null);

      const req: any = { params: { id: '1' } };
      const res = buildRes();

      await Controller.deleteVehiculo(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Vehículo no encontrado' });
    });

    it('marks vehicle inactive and returns success', async () => {
      const save = jest.fn();
      const vehiculo: any = { _id: '1', activo: true, save };
      mocks.findById.mockResolvedValue(vehiculo);

      const req: any = { params: { id: '1' } };
      const res = buildRes();

      await Controller.deleteVehiculo(req, res);

      expect(vehiculo.activo).toBe(false);
      expect(save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Vehículo eliminado exitosamente' });
    });

    it('returns 500 on error', async () => {
      mocks.findById.mockRejectedValue(new Error('fail'));

      const req: any = { params: { id: '1' } };
      const res = buildRes();

      await Controller.deleteVehiculo(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Error al eliminar vehículo' });
    });
  });

  describe('registrarServicio', () => {
    it('returns 404 when vehicle missing', async () => {
      mocks.findById.mockResolvedValue(null);

      const req: any = { params: { id: '1' }, body: {} };
      const res = buildRes();

      await Controller.registrarServicio(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Vehículo no encontrado' });
    });

    it('adds service and updates dates', async () => {
      const save = jest.fn();
      const vehiculo: any = { _id: '1', historialServicios: [], save };
      mocks.findById.mockResolvedValue(vehiculo);

      const req: any = { params: { id: '1' }, body: { descripcion: 'serv', kilometraje: 10, costo: 5, realizadoPor: 'tech' } };
      const res = buildRes();

      await Controller.registrarServicio(req, res);

      expect(vehiculo.historialServicios.length).toBe(1);
      expect(vehiculo.ultimoServicio).toBeInstanceOf(Date);
      expect(vehiculo.proximoServicio).toBeInstanceOf(Date);
      expect(save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ mensaje: 'Servicio registrado exitosamente' }));
    });

    it('returns 500 on error', async () => {
      mocks.findById.mockRejectedValue(new Error('fail'));

      const req: any = { params: { id: '1' }, body: {} };
      const res = buildRes();

      await Controller.registrarServicio(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Error al registrar servicio' });
    });
  });

  describe('getHistorialServicios', () => {
    it('returns 404 when missing', async () => {
      mocks.findById.mockResolvedValue(null);

      const req: any = { params: { id: '1' } };
      const res = buildRes();

      await Controller.getHistorialServicios(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Vehículo no encontrado' });
    });

    it('returns sorted historial', async () => {
      const save = jest.fn();
      const vehiculo: any = {
        _id: '1', marca: 'm', modelo: 'mod', año: 2020, placas: 'P', save,
        historialServicios: [
          { _id: 'a', fecha: new Date('2023-01-01'), descripcion: 'old' },
          { _id: 'b', fecha: new Date('2023-06-01'), descripcion: 'new' }
        ]
      };
      mocks.findById.mockResolvedValue(vehiculo);

      const req: any = { params: { id: '1' } };
      const res = buildRes();

      await Controller.getHistorialServicios(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        historialServicios: expect.arrayContaining([
          expect.objectContaining({ _id: 'b' }),
          expect.objectContaining({ _id: 'a' })
        ])
      }));
    });

    it('returns 500 on error', async () => {
      mocks.findById.mockRejectedValue(new Error('fail'));

      const req: any = { params: { id: '1' } };
      const res = buildRes();

      await Controller.getHistorialServicios(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Error al obtener historial de servicios' });
    });
  });

  describe('getVehiculosProximosAServicio', () => {
    it('returns vehicles near service', async () => {
      mocks.find.mockReturnValue(makeFindQuery([{ _id: '1' }]));

      const res = buildRes();
      await Controller.getVehiculosProximosAServicio({} as any, res);

      expect(res.json).toHaveBeenCalledWith([{ _id: '1' }]);
    });

    it('returns 500 on error', async () => {
      mocks.find.mockReturnValue(makeFindQuery(new Error('fail'), true));

      const res = buildRes();
      await Controller.getVehiculosProximosAServicio({} as any, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Error al obtener vehículos próximos a servicio' });
    });
  });

  describe('getVehiculosServicioVencido', () => {
    it('returns vehicles with overdue service', async () => {
      mocks.find.mockReturnValue(makeFindQuery([{ _id: '1' }]));

      const res = buildRes();
      await Controller.getVehiculosServicioVencido({} as any, res);

      expect(res.json).toHaveBeenCalledWith([{ _id: '1' }]);
    });

    it('returns 500 on error', async () => {
      mocks.find.mockReturnValue(makeFindQuery(new Error('fail'), true));

      const res = buildRes();
      await Controller.getVehiculosServicioVencido({} as any, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Error al obtener vehículos con servicio vencido' });
    });
  });

  describe('eliminarServicio', () => {
    it('returns 404 when vehicle missing', async () => {
      mocks.findById.mockResolvedValue(null);

      const req: any = { params: { id: '1', servicioId: 's1' } };
      const res = buildRes();

      await Controller.eliminarServicio(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Vehículo no encontrado' });
    });

    it('removes service, recalculates dates, and returns vehicle', async () => {
      const save = jest.fn();
      const vehiculo: any = {
        _id: '1',
        historialServicios: [
          { _id: 's1', fecha: new Date('2023-01-01') },
          { _id: 's2', fecha: new Date('2023-06-01') }
        ],
        save
      };
      mocks.findById.mockResolvedValue(vehiculo);

      const req: any = { params: { id: '1', servicioId: 's2' } };
      const res = buildRes();

      await Controller.eliminarServicio(req, res);

      expect(vehiculo.historialServicios).toHaveLength(1);
      expect(vehiculo.ultimoServicio).toBeDefined();
      expect(vehiculo.proximoServicio).toBeDefined();
      expect(save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ mensaje: 'Servicio eliminado exitosamente' }));
    });

    it('returns 500 on error', async () => {
      mocks.findById.mockRejectedValue(new Error('fail'));

      const req: any = { params: { id: '1', servicioId: 's1' } };
      const res = buildRes();

      await Controller.eliminarServicio(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ mensaje: 'Error al eliminar servicio' });
    });
  });
});
