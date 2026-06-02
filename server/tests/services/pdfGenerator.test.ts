describe('PdfGeneratorService', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  const templateHtml = `
    <html>
      <head></head>
      <body>
        {{noDocVal}} {{fechaDoc}} {{encabezadosTabla}} {{productos}} {{colspanTotales}} {{colspanTotalesLabel}} {{colspanTotalesLabel2}} {{topImg}} {{bottom1}}
      </body>
    </html>
  `;

  const setupMocks = () => {
    const readFileSync = jest.fn(() => templateHtml);
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

    const formatForOrdenCompra = jest.fn(() => '2026-01-01');

    jest.doMock('fs', () => ({ __esModule: true, default: { readFileSync, existsSync }, readFileSync, existsSync }));
    jest.doMock('puppeteer', () => ({ __esModule: true, default: { launch }, launch }));
    jest.doMock('../../src/utils/dateUtils', () => ({ DateUtils: { formatForOrdenCompra } }));

    return { readFileSync, existsSync, launch, newPage, setContent, pdf, close, setDefaultTimeout, setDefaultNavigationTimeout, setViewport, emulateMediaType, formatForOrdenCompra };
  };

  const sampleData = {
    numeroOrden: 'OC-1',
    fecha: '2026-03-10',
    proveedor: {
      empresa: 'Proveedor',
      direccion: 'Dir',
      telefono: '555',
      contactos: [{ nombre: 'Carlos', correo: 'c@mail', telefono: '111', extension: '123' }],
    },
    razonSocial: {
      nombre: 'Cliente SA',
      direccionEmpresa: 'DirC',
      telEmpresa: '999',
      emailEmpresa: 'cli@mail',
      emailFacturacion: 'fact@mail',
      rfc: 'RFC123',
    } as any,
    direccionEnvio: { contacto: 'Rec', direccion: 'Envio 123', telefono: '000' },
    vendedor: { nombre: 'Vendedor', correo: 'v@mail', telefono: '777' },
    moneda: 'USD',
    porcentajeIvaSimbolico: '8',
    totalesCalculados: { subTotal: 1000, iva: 80, total: 1080 },
    productos: [
      {
        codigo: 'P1',
        descripcion: 'Prod 1',
        unidad: 'pz',
        cantidad: 2,
        precioUnitario: 400,
        precioLista: 500,
        descuento: 10,
        importe: 720,
        alm: 'A1',
      },
      {
        clave: 'C2',
        concepto: 'Prod 2',
        unidad: 'pz',
        cantidad: 1,
        precio: 200,
        total: 200,
      },
    ],
    datosPdf: {
      datosExtraidos: {
        folio: 'F-1',
        folioOriginal: 'F-Orig',
        formaPago: 'Contado',
        usoMercancia: 'G01',
      },
    },
  };

  it('genera el PDF de orden de compra y llama a puppeteer', async () => {
    const mocks = setupMocks();
    const { PdfGeneratorService } = require('../../src/services/pdfGenerator');
    const service = new PdfGeneratorService();

    const buffer = await service.generarPdfOrdenCompra(sampleData as any);

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
        '--max-old-space-size=4096',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-default-apps'
      ],
      timeout: 60000,
      protocolTimeout: 60000
    });
    expect(mocks.newPage).toHaveBeenCalled();
    expect(mocks.setContent).toHaveBeenCalledWith(expect.stringContaining('OC-1'), { waitUntil: 'domcontentloaded', timeout: 30000 });
    expect(mocks.pdf).toHaveBeenCalledWith({
      format: 'Letter',
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: '0.25in', right: '0.25in', bottom: '0.25in', left: '0.25in' },
      timeout: 120000
    });

    const htmlSent = (mocks.setContent.mock.calls[0] as any)[0] as string;
    expect(htmlSent).toContain('$400.00 USD');
    expect(htmlSent).toContain('$720.00 USD');
    expect(htmlSent).toContain('$200.00 USD');
    expect(htmlSent).toContain('P1');
    expect(htmlSent).toContain('Prod 1');
    expect(htmlSent).toContain('Prod 2');
  });

  it('propaga error amigable si puppeteer falla', async () => {
    const readFileSync = jest.fn(() => templateHtml);
    const existsSync = jest.fn().mockReturnValue(false);

    jest.doMock('fs', () => ({ __esModule: true, default: { readFileSync, existsSync }, readFileSync, existsSync }));
    jest.doMock('puppeteer', () => ({ __esModule: true, default: { launch: jest.fn(() => { throw new Error('launch fail'); }) }, launch: jest.fn(() => { throw new Error('launch fail'); }) }));
    jest.doMock('../../src/utils/dateUtils', () => ({ DateUtils: { formatForOrdenCompra: jest.fn(() => '2026-01-01') } }));

    const { PdfGeneratorService } = require('../../src/services/pdfGenerator');
    const service = new PdfGeneratorService();

    await expect(service.generarPdfOrdenCompra(sampleData as any)).rejects.toThrow('Error al generar PDF: launch fail');
  });
});
