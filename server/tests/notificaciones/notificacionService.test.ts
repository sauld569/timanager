var revisarYNotificarGuias: any;
var mocks: any = {};
function ensureMocks() {
  if (!mocks) mocks = {};
  return mocks;
}

jest.mock('nodemailer', () => {
  const m = ensureMocks();
  m.sendMail = jest.fn();
  return { __esModule: true, default: { createTransport: jest.fn().mockReturnValue({ sendMail: m.sendMail }) }, createTransport: jest.fn().mockReturnValue({ sendMail: m.sendMail }) };
});

jest.mock('fs', () => {
  const m = ensureMocks();
  m.existsSync = jest.fn();
  m.readFileSync = jest.fn();
  return { __esModule: true, default: { existsSync: m.existsSync, readFileSync: m.readFileSync }, existsSync: m.existsSync, readFileSync: m.readFileSync };
});

type GuiaType = any;

jest.mock('../../src/models/Guia', () => {
  const m = ensureMocks();
  m.find = jest.fn();
  return { __esModule: true, default: { find: m.find } };
});

describe('revisarYNotificarGuias', () => {
  beforeEach(() => {
    ensureMocks();
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();
    ({ revisarYNotificarGuias } = require('../../src/notificacionService'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('no envía correo si no hay configuración o emails', async () => {
    mocks.existsSync.mockReturnValue(true);
    mocks.readFileSync.mockReturnValue(JSON.stringify({ emails: [] }));

    await revisarYNotificarGuias();

    expect(mocks.find).not.toHaveBeenCalled();
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });

  it('envía correo con guías agrupadas y omite entregadas viejas', async () => {
    jest.setSystemTime(new Date('2023-01-08T00:00:00Z'));
    mocks.existsSync.mockReturnValue(true);
    mocks.readFileSync.mockReturnValue(JSON.stringify({ emails: ['a@test.com', 'b@test.com'] }));

    const guias: GuiaType[] = [
      { estado: 'en transito', numeroGuia: '1', proyectos: ['P1'] },
      { estado: 'atrasado', numeroGuia: '2' },
      { estado: 'no entregado', numeroGuia: '3' },
      { estado: 'entregado', numeroGuia: '4', fechaLlegada: '2023-01-04T00:00:00Z' },
      { estado: 'entregado', numeroGuia: '5', fechaLlegada: '2022-12-20T00:00:00Z' }
    ];
    mocks.find.mockResolvedValue(guias);
    mocks.sendMail.mockResolvedValue({});

    await revisarYNotificarGuias();

    expect(mocks.sendMail).toHaveBeenCalledTimes(1);
    const args = mocks.sendMail.mock.calls[0][0];
    expect(args.to).toBe('a@test.com,b@test.com');
    expect(args.subject).toContain('Resumen de guías');
    expect(args.html).toContain('Guías en tránsito');
    expect(args.html).toContain('Guías entregadas');
    expect(args.html).not.toContain('5'); // entregada vieja omitida
  });

  it('maneja error al enviar correo sin lanzar', async () => {
    jest.setSystemTime(new Date('2023-01-08T00:00:00Z'));
    mocks.existsSync.mockReturnValue(true);
    mocks.readFileSync.mockReturnValue(JSON.stringify({ emails: ['a@test.com'] }));
    mocks.find.mockResolvedValue([{ estado: 'en transito', numeroGuia: '1' }]);
    mocks.sendMail.mockRejectedValue(new Error('fail'));

    await expect(revisarYNotificarGuias()).resolves.toBeUndefined();
    expect(mocks.sendMail).toHaveBeenCalled();
  });
});
