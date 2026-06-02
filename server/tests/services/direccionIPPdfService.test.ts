describe('DireccionIPPdfService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  const setupMocks = () => {
    const readFileSync = jest.fn((p: string) => {
      if (p.includes('direccionesIP.html')) {
        return '<html><head></head><body>{{filasDirecciones}} {{nombreProyecto}} {{fechaGeneracion}}</body></html>';
      }
      if (p.includes('direccionesIP.css')) {
        return 'body { color: black; }';
      }
      return '';
    });

    const existsSync = jest.fn().mockReturnValue(false);

    const setDefaultTimeout = jest.fn();
    const setDefaultNavigationTimeout = jest.fn();
    const setViewport = jest.fn();
    const setContent = jest.fn();
    const emulateMediaType = jest.fn();
    const pdf = jest.fn().mockResolvedValue(Buffer.from('pdf-binary'));
    const newPage = jest.fn().mockResolvedValue({ setDefaultTimeout, setDefaultNavigationTimeout, setViewport, setContent, emulateMediaType, pdf });
    const close = jest.fn();
    const launch = jest.fn().mockResolvedValue({ newPage, close });

    jest.doMock('fs', () => ({ __esModule: true, default: { readFileSync, existsSync }, readFileSync, existsSync }));
    jest.doMock('puppeteer', () => ({ __esModule: true, default: { launch }, launch }));

    return { readFileSync, existsSync, launch, newPage, setContent, pdf, close, setDefaultTimeout, setDefaultNavigationTimeout, setViewport, emulateMediaType };
  };

  const sampleDirecciones = [
    { equipo: 'Router', usuario: 'admin', contrasena: 'pass', direccion: '10.0.0.1', esRango: false },
    { equipo: 'Switch', usuario: 'user', contrasena: '1234', direccion: '10.0.0.10', esRango: true, direccionFin: '10.0.0.20' },
  ];

  const sampleProyecto = { nombre: 'Proyecto X', descripcion: 'Desc' };

  it('genera el PDF con filas y llama a puppeteer', async () => {
    const mocks = setupMocks();
    const { DireccionIPPdfService } = require('../../src/services/direccionIPPdfService');
    const service = new DireccionIPPdfService();

    const buffer = await service.generarPdfDirecciones(sampleDirecciones as any, sampleProyecto as any);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(mocks.launch).toHaveBeenCalledWith({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--max-old-space-size=4096'
      ],
      timeout: 60000,
      protocolTimeout: 60000
    });
    expect(mocks.newPage).toHaveBeenCalled();
    expect(mocks.setContent).toHaveBeenCalledWith(expect.stringContaining('Router'), { waitUntil: 'domcontentloaded', timeout: 30000 });
    expect(mocks.pdf).toHaveBeenCalledWith({
      format: 'Letter',
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
      timeout: 120000
    });
  });

  it('propaga error amigable si puppeteer falla', async () => {
    const readFileSync = jest.fn(() => '<html><head></head><body></body></html>');
    const existsSync = jest.fn().mockReturnValue(false);

    jest.doMock('fs', () => ({ __esModule: true, default: { readFileSync, existsSync }, readFileSync, existsSync }));
    jest.doMock('puppeteer', () => ({ __esModule: true, default: { launch: jest.fn(() => { throw new Error('launch fail'); }) }, launch: jest.fn(() => { throw new Error('launch fail'); }) }));

    const { DireccionIPPdfService } = require('../../src/services/direccionIPPdfService');
    const service = new DireccionIPPdfService();

    await expect(service.generarPdfDirecciones([], sampleProyecto as any)).rejects.toThrow('Error al generar PDF: launch fail');
  });
});
