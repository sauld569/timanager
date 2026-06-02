describe('EntregaPdfGenerator', () => {
  const templateHtml = '<html>{{numeroEntrega}}</html>';

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
      return `<html>${data.numeroEntrega}</html>`;
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
    numeroEntrega: 'ENT-1',
    cliente: 'Cliente SA',
    fecha: '2026-03-10',
    items: [
      { clave: 1, descripcion: 'Producto A', cantidad: 2, unidad: 'pz' },
      { clave: 2, descripcion: 'Producto B', cantidad: 1, unidad: 'pz', marca: 'M', modelo: 'X' },
    ],
    comentarios: 'Obs',
    clienteInfo: {
      nombreEmpresa: 'Cliente Info SA',
      direccion: 'Dir 123',
      telefono: '555',
      contactos: [
        { nombre: 'Contacto', puesto: 'Compras', contacto: { telefono: '111' } },
      ],
    },
    razonSocial: { nombre: 'ACME', rfc: 'RFC', emailEmpresa: 'mail', telEmpresa: 'tel', direccionEmpresa: 'dir' },
  });

  it('genera el PDF de entrega con datos formateados y llama a puppeteer', async () => {
    const mocks = setupMocks();
    const { EntregaPdfGenerator } = require('../../src/services/entregaPdfGenerator');
    const service = new EntregaPdfGenerator();

    const data = buildSampleData();
    const buffer = await service.generarPdfEntrega(data);

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
    expect(templateData.numeroEntrega).toBe('ENT-1');
    expect(templateData.cliente.nombreEmpresa).toBe('Cliente Info SA');
    expect(templateData.cliente.contacto.nombre).toBe('Contacto');
    expect(templateData.items).toHaveLength(2);
    expect(templateData.fecha).toBe(new Date('2026-03-10').toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }));
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

    const { EntregaPdfGenerator } = require('../../src/services/entregaPdfGenerator');
    const service = new EntregaPdfGenerator();

    await expect(service.generarPdfEntrega(buildSampleData())).rejects.toThrow('Error al generar PDF de entrega');
  });
});
