jest.mock('node-cron', () => {
  return {
    __esModule: true,
    schedule: jest.fn(),
    default: { schedule: jest.fn() }
  };
});

jest.mock('../../src/notificacionService', () => ({
  __esModule: true,
  revisarYNotificarGuias: jest.fn()
}));

describe('cronNotificaciones', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('programa el cron y ejecuta la tarea', async () => {
    const cron = require('node-cron');
    const svc = require('../../src/notificacionService');

    jest.isolateModules(() => {
      require('../../src/cronNotificaciones');
    });

    const sched = (cron.default?.schedule || cron.schedule) as jest.Mock;
    expect(sched).toHaveBeenCalledTimes(1);
    const [expr, callback] = sched.mock.calls[0];
    expect(expr).toBe('0 7 * * *');

    svc.revisarYNotificarGuias.mockResolvedValue(undefined);
    await callback();

    expect(svc.revisarYNotificarGuias).toHaveBeenCalled();
  });
});
