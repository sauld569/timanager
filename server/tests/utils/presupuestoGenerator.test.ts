describe('presupuestoGenerator', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('genera numero con nombre directo y empieza en 001', async () => {
    const mockFindById = jest.fn();

    const limit = jest.fn().mockResolvedValue([]);
    const sort = jest.fn(() => ({ limit }));
    const find = jest.fn(() => ({ sort }));
    const findOne = jest.fn();

    jest.doMock('../../src/models/RazonSocial', () => ({
      __esModule: true,
      default: { findById: mockFindById },
    }));

    jest.doMock('../../src/models/Cotizacion', () => ({
      __esModule: true,
      default: { find, findOne },
    }));

    const { generarNumeroPresupuesto } = require('../../src/utils/presupuestoGenerator');

    const numero = await generarNumeroPresupuesto(undefined, 'Alejandro Hernandez Castillo');

    expect(numero).toBe('ALE-H-LLO-A001');
    expect(find).toHaveBeenCalledTimes(1);
    expect(limit).toHaveBeenCalledWith(1);
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it('usa razon social y continúa secuencia existente', async () => {
    const mockFindById = jest.fn().mockResolvedValue({ nombre: 'Acme Co' });

    const limit = jest.fn().mockResolvedValue([{ numeroPresupuesto: 'ACM-C-ECO-A005' }]);
    const sort = jest.fn(() => ({ limit }));
    const find = jest.fn(() => ({ sort }));
    const findOne = jest.fn();

    jest.doMock('../../src/models/RazonSocial', () => ({
      __esModule: true,
      default: { findById: mockFindById },
    }));

    jest.doMock('../../src/models/Cotizacion', () => ({
      __esModule: true,
      default: { find, findOne },
    }));

    const { generarNumeroPresupuesto } = require('../../src/utils/presupuestoGenerator');

    const numero = await generarNumeroPresupuesto('razon-id');

    expect(numero).toBe('ACM-C-ECO-A006');
    expect(mockFindById).toHaveBeenCalledWith('razon-id');
    expect(limit).toHaveBeenCalledWith(1);
  });

  it('devuelve fallback si ocurre un error general', async () => {
    const mockFindById = jest.fn(() => {
      throw new Error('boom');
    });

    const limit = jest.fn().mockResolvedValue([]);
    const sort = jest.fn(() => ({ limit }));
    const find = jest.fn(() => ({ sort }));
    const findOne = jest.fn();

    jest.doMock('../../src/models/RazonSocial', () => ({
      __esModule: true,
      default: { findById: mockFindById },
    }));

    jest.doMock('../../src/models/Cotizacion', () => ({
      __esModule: true,
      default: { find, findOne },
    }));

    jest.spyOn(Date, 'now').mockReturnValue(1700000000456);

    const { generarNumeroPresupuesto } = require('../../src/utils/presupuestoGenerator');

    const numero = await generarNumeroPresupuesto('razon-con-error');

    expect(numero).toBe('EMP-D-EFA-A456');
  });

  it('valida que un numero de presupuesto sea unico', async () => {
    const mockFindById = jest.fn();

    const limit = jest.fn().mockResolvedValue([]);
    const sort = jest.fn(() => ({ limit }));
    const find = jest.fn(() => ({ sort }));
    const findOne = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: 'existing' });

    jest.doMock('../../src/models/RazonSocial', () => ({
      __esModule: true,
      default: { findById: mockFindById },
    }));

    jest.doMock('../../src/models/Cotizacion', () => ({
      __esModule: true,
      default: { find, findOne },
    }));

    const { validarNumeroPresupuestoUnico } = require('../../src/utils/presupuestoGenerator');

    const primera = await validarNumeroPresupuestoUnico('ABC-D-XYZ-A001');
    const segunda = await validarNumeroPresupuestoUnico('ABC-D-XYZ-A001');

    expect(primera).toBe(true);
    expect(segunda).toBe(false);
    expect(findOne).toHaveBeenCalledTimes(2);
  });
});
