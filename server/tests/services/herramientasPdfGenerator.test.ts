describe('herramientasPdfGenerator', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  const setupMocks = () => {
    const readFileSync = jest.fn(() => '<html>{{title}}</html>');
    const compile = jest.fn(() => (data: any) => `<html>${data.title}</html>`);

    const setViewport = jest.fn();
    const setContent = jest.fn();
    const pdf = jest.fn().mockResolvedValue(Buffer.from('pdf-binary'));
    const newPage = jest.fn().mockResolvedValue({ setViewport, setContent, pdf });
    const close = jest.fn();
    const launch = jest.fn().mockResolvedValue({ newPage, close });

    jest.doMock('fs', () => ({ __esModule: true, default: { readFileSync }, readFileSync }));
    jest.doMock('puppeteer', () => ({ __esModule: true, default: { launch }, launch }));
    jest.doMock('handlebars', () => ({ __esModule: true, default: { compile }, compile }));

    return { readFileSync, compile, launch, newPage, setViewport, setContent, pdf, close };
  };

  it('genera el PDF con puppeteer y la plantilla compilada', async () => {
    const mocks = setupMocks();
    const { generatePDF } = require('../../src/services/herramientasPdfGenerator');

    const buffer = await generatePDF('/tmp/template.html', { title: 'Hola' });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(mocks.readFileSync).toHaveBeenCalledWith('/tmp/template.html', 'utf8');
    expect(mocks.compile).toHaveBeenCalled();
    expect(mocks.launch).toHaveBeenCalledWith({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    expect(mocks.newPage).toHaveBeenCalled();
    expect(mocks.setViewport).toHaveBeenCalledWith({ width: 1200, height: 800 });
    expect(mocks.setContent).toHaveBeenCalledWith('<html>Hola</html>');
    expect(mocks.pdf).toHaveBeenCalledWith({
      format: 'A4',
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
      printBackground: true,
    });
  });

  it('propaga error si puppeteer falla', async () => {
    const readFileSync = jest.fn(() => '<html>{{title}}</html>');
    const compile = jest.fn(() => (data: any) => `<html>${data.title}</html>`);

    jest.doMock('fs', () => ({ __esModule: true, default: { readFileSync }, readFileSync }));
    jest.doMock('handlebars', () => ({ __esModule: true, default: { compile }, compile }));
    jest.doMock('puppeteer', () => ({ __esModule: true, default: { launch: jest.fn(() => { throw new Error('launch fail'); }) }, launch: jest.fn(() => { throw new Error('launch fail'); }) }));

    const { generatePDF } = require('../../src/services/herramientasPdfGenerator');

    await expect(generatePDF('/tmp/template.html', { title: 'Hola' })).rejects.toThrow('launch fail');
  });
});
