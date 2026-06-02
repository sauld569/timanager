describe('CotizacionCanalizacionPdfGenerator', () => {
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
    const handlebarsCompile = jest.fn(() => (data: any) => {
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
      default: { compile: handlebarsCompile, registerHelper },
      compile: handlebarsCompile,
      registerHelper,
    }));
    jest.doMock('puppeteer', () => ({ __esModule: true, default: { launch }, launch }));

    return { fsMocks, handlebarsCompile, registerHelper, capturedTemplateData: () => capturedTemplateData, launch, newPage, setContent, pdf, close };
  };

  const buildSampleData = () => ({
    numeroPresupuesto: 'ABC-1',
    cliente: 'Cliente SA',
    fecha: '2026-03-01',
    vigencia: '2026-03-15',
    subtotal: 1000,
    utilidad: 10,
    total: 1100,
    estado: 'BORRADOR',
    items: [
      { descripcion: '  acero  inoxidable ', cantidad: 2, unidad: 'pz', precioUnitario: 100, subtotal: 200 },
      { descripcion: '   ', cantidad: 1, unidad: 'pz', precioUnitario: 900, subtotal: 900 },
    ],
    comentarios: 'Observaciones',
    razonSocial: { nombre: 'ACME', rfc: 'RFC123', emailEmpresa: 'acme@mail', telEmpresa: '123', direccionEmpresa: 'Dir' },
    clienteInfo: {
      nombreEmpresa: 'ACME',
      direccion: 'Calle Falsa 123',
      telefono: '555-111-2222',
      contactos: [
        {
          nombre: 'Contacto Uno',
          puesto: 'Compras',
          contacto: { correo: 'c1@mail', telefono: '555', extension: '123' },
        },
      ],
    },
  });

  it('genera el PDF con datos formateados y llama a puppeteer', async () => {
    const mocks = setupMocks();
    const { CotizacionCanalizacionPdfGenerator } = require('../../src/services/cotizacionCanalizacionPdfGenerator');
    const service = new CotizacionCanalizacionPdfGenerator();

    const data = buildSampleData();
    const buffer = await service.generarPdfCotizacionCanalizacion(data);

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
    expect(templateData.numeroPresupuesto).toBe('ABC-1');
    expect(templateData.items[0].descripcion).toBe('Acero inoxidable');
    expect(templateData.items[1].descripcion).toBe('Descripción no especificada');
    expect(templateData.subtotalFormatted).toBe(new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(1000));
    expect(templateData.totalFormatted).toBe(new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(1100));
    expect(templateData.utilidadMontoFormatted).toBe(new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(100));
  });

  it('propaga error amigable si puppeteer falla', async () => {
    const fsMocks = {
      promises: { readFile: jest.fn().mockResolvedValue(templateHtml) },
      existsSync: jest.fn().mockReturnValue(false),
      readFileSync: jest.fn(),
    };

    jest.doMock('fs', () => ({ __esModule: true, default: fsMocks, ...fsMocks }));
    const registerHelper = jest.fn();
    const compile = jest.fn(() => () => '<html></html>');

    jest.doMock('handlebars', () => ({
      __esModule: true,
      default: { compile, registerHelper },
      compile,
      registerHelper,
    }));
    jest.doMock('puppeteer', () => ({ __esModule: true, default: { launch: jest.fn(() => { throw new Error('launch fail'); }) }, launch: jest.fn(() => { throw new Error('launch fail'); }) }));

    const { CotizacionCanalizacionPdfGenerator } = require('../../src/services/cotizacionCanalizacionPdfGenerator');
    const service = new CotizacionCanalizacionPdfGenerator();

    await expect(service.generarPdfCotizacionCanalizacion(buildSampleData())).rejects.toThrow('Error al generar PDF de cotización de canalización');
  });
});
