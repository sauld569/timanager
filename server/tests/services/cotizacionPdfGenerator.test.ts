describe('CotizacionPdfGenerator', () => {
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
    numeroPresupuesto: 'COT-1',
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
    subtotal: 1000,
    iva: 16,
    ivaImporte: 160,
    total: 1160,
    estado: 'BORRADOR',
    moneda: 'USD',
    items: [
      {
        descripcion: 'producto a',
        marca: 'Marca',
        modelo: 'M1',
        cantidad: 2,
        unidad: 'pz',
        precioUnitario: 500,
        subtotal: 1000,
        aplicarIva: true,
      },
    ],
    comentarios: 'Obs',
    comentariosPdf: 'Obs pdf',
    razonSocial: { nombre: 'ACME', rfc: 'RFC', emailEmpresa: 'mail', telEmpresa: 'tel', direccionEmpresa: 'dir' },
    vendedor: { nombre: 'Vendedor', email: 'v@mail', telefono: '123' },
  });

  it('genera el PDF de cotización formateando montos y llama a puppeteer', async () => {
    const mocks = setupMocks();
    const { CotizacionPdfGenerator } = require('../../src/services/cotizacionPdfGenerator');
    const service = new CotizacionPdfGenerator();

    const data = buildSampleData();
    const buffer = await service.generarPdfCotizacion(data);

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
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    expect(templateData.numeroPresupuesto).toBe('COT-1');
    expect(templateData.subtotal).toBe(`${formatter.format(1000)} USD`);
    expect(templateData.total).toBe(`${formatter.format(1160)} USD`);
    expect(templateData.nombreMoneda).toBe('Dólares');
    expect(templateData.items[0].precioUnitario).toBe(`${formatter.format(500)} USD`);
    expect(templateData.items[0].subtotal).toBe(`${formatter.format(1000)} USD`);
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

    const { CotizacionPdfGenerator } = require('../../src/services/cotizacionPdfGenerator');
    const service = new CotizacionPdfGenerator();

    await expect(service.generarPdfCotizacion(buildSampleData())).rejects.toThrow('Error al generar PDF de cotización');
  });
});
