describe('CotizacionChecklistPdfGenerator', () => {
  const templateHtml = '<html>{{numeroPresupuesto}}</html>';

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  const setupMocks = () => {
    const fsMocks = {
      promises: {
        readFile: jest.fn().mockResolvedValue(templateHtml),
      },
      existsSync: jest.fn().mockReturnValue(false),
      readFileSync: jest.fn(),
    };

    let capturedTemplateData: any;
    const registerHelper = jest.fn();
    const compile = jest.fn(() => (data: any) => {
      capturedTemplateData = data;
      return `<html>${data.numeroPresupuesto}</html>`;
    });

    const setContent = jest.fn();
    const pdf = jest.fn().mockResolvedValue(Buffer.from('pdf-binary'));
    const newPage = jest.fn().mockResolvedValue({ setContent, pdf });
    const close = jest.fn();
    const launch = jest.fn().mockResolvedValue({ newPage, close });

    jest.doMock('fs', () => ({ __esModule: true, default: fsMocks, ...fsMocks }));
    jest.doMock('handlebars', () => ({
      __esModule: true,
      default: { compile, registerHelper },
      compile,
      registerHelper,
    }));
    jest.doMock('puppeteer', () => ({ __esModule: true, default: { launch }, launch }));

    return { fsMocks, compile, registerHelper, capturedTemplateData: () => capturedTemplateData, launch, newPage, setContent, pdf, close };
  };

  const buildSampleData = () => ({
    numeroPresupuesto: 'CHK-1',
    cliente: {
      nombre: 'Cliente',
      compania: 'Compania',
      direccion: 'Dir 123',
      ciudad: 'CDMX',
      telefono: '555',
      email: 'c@mail',
    },
    fecha: '2026-03-10',
    vigencia: '2026-04-10',
    estado: 'BORRADOR',
    items: [
      { concepto: '  equipo  medico ', cantidad: 2, unidad: 'pz', marca: 'Marca', modelo: 'M1' },
      { concepto: '   ', cantidad: 1, unidad: 'pz' },
    ],
    comentarios: 'Obs',
    comentariosPdf: 'Obs pdf',
    razonSocial: { nombre: 'ACME', rfc: 'RFC', emailEmpresa: 'mail', telEmpresa: 'tel', direccionEmpresa: 'dir' },
    vendedor: { nombre: 'Vendedor', email: 'v@mail', telefono: '123' },
  });

  it('genera el PDF de checklist con datos formateados y llama a puppeteer', async () => {
    const mocks = setupMocks();
    const { CotizacionChecklistPdfGenerator } = require('../../src/services/cotizacionChecklistPdfGenerator');
    const service = new CotizacionChecklistPdfGenerator();

    const data = buildSampleData();
    const buffer = await service.generarPdfChecklistCotizacion(data);

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(mocks.launch).toHaveBeenCalledWith({ headless: true });
    expect(mocks.newPage).toHaveBeenCalled();
    expect(mocks.setContent).toHaveBeenCalledWith(expect.any(String), { waitUntil: 'networkidle0' });
    expect(mocks.pdf).toHaveBeenCalledWith({
      format: 'A4',
      margin: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' },
      printBackground: true,
    });

    const templateData = mocks.capturedTemplateData();
    expect(templateData.numeroPresupuesto).toBe('CHK-1');
    expect(templateData.items[0].descripcion).toBe('Equipo medico (Marca - M1)');
    expect(templateData.items[1].descripcion).toBe('Descripción no especificada');
  });

  it('propaga error amigable si puppeteer falla', async () => {
    const fsMocks = {
      promises: { readFile: jest.fn().mockResolvedValue(templateHtml) },
      existsSync: jest.fn().mockReturnValue(false),
      readFileSync: jest.fn(),
    };

    const registerHelper = jest.fn();
    const compile = jest.fn(() => () => '<html></html>');

    jest.doMock('fs', () => ({ __esModule: true, default: fsMocks, ...fsMocks }));
    jest.doMock('handlebars', () => ({
      __esModule: true,
      default: { compile, registerHelper },
      compile,
      registerHelper,
    }));
    jest.doMock('puppeteer', () => ({ __esModule: true, default: { launch: jest.fn(() => { throw new Error('launch fail'); }) }, launch: jest.fn(() => { throw new Error('launch fail'); }) }));

    const { CotizacionChecklistPdfGenerator } = require('../../src/services/cotizacionChecklistPdfGenerator');
    const service = new CotizacionChecklistPdfGenerator();

    await expect(service.generarPdfChecklistCotizacion(buildSampleData())).rejects.toThrow('Error al generar PDF checklist de cotización');
  });
});
