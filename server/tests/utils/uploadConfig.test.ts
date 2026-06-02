describe('uploadConfig', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
  });

  it('creates upload directories when they do not exist', () => {
    const existsSync = jest.fn().mockReturnValue(false);
    const mkdirSync = jest.fn();

    const multerFactory: any = jest.fn((options) => ({ options }));
    multerFactory.diskStorage = jest.fn((config) => config);

    jest.doMock('fs', () => ({
      __esModule: true,
      default: { existsSync, mkdirSync },
      existsSync,
      mkdirSync,
    }));

    jest.doMock('multer', () => ({
      __esModule: true,
      default: multerFactory,
      diskStorage: multerFactory.diskStorage,
    }));

    const upload = require('../../src/utils/uploadConfig').default;

    expect(upload).toBeDefined();
    expect(existsSync).toHaveBeenCalledTimes(2);
    expect(mkdirSync).toHaveBeenCalledTimes(2);
  });

  it('configures fileFilter to accept images and reject invalid mime types', () => {
    const existsSync = jest.fn().mockReturnValue(true);
    const mkdirSync = jest.fn();

    const multerFactory: any = jest.fn((options) => ({ options }));
    multerFactory.diskStorage = jest.fn((config) => config);

    jest.doMock('fs', () => ({
      __esModule: true,
      default: { existsSync, mkdirSync },
      existsSync,
      mkdirSync,
    }));

    jest.doMock('multer', () => ({
      __esModule: true,
      default: multerFactory,
      diskStorage: multerFactory.diskStorage,
    }));

    const upload = require('../../src/utils/uploadConfig').default;
    const options = upload.options;

    const allowCb = jest.fn();
    options.fileFilter(
      {} as any,
      { mimetype: 'image/png', originalname: 'ok.png' } as any,
      allowCb
    );
    expect(allowCb).toHaveBeenCalledWith(null, true);

    const rejectCb = jest.fn();
    options.fileFilter(
      {} as any,
      { mimetype: 'application/pdf', originalname: 'bad.pdf' } as any,
      rejectCb
    );

    const errorArg = rejectCb.mock.calls[0][0];
    expect(errorArg).toBeInstanceOf(Error);
    expect((errorArg as Error).message).toMatch(/Solo se permiten imagenes|Solo se permiten imágenes/);
  });

  it('sets destination and generated filename in storage callbacks', () => {
    const existsSync = jest.fn().mockReturnValue(true);
    const mkdirSync = jest.fn();

    const multerFactory: any = jest.fn((options) => ({ options }));
    multerFactory.diskStorage = jest.fn((config) => config);

    jest.doMock('fs', () => ({
      __esModule: true,
      default: { existsSync, mkdirSync },
      existsSync,
      mkdirSync,
    }));

    jest.doMock('multer', () => ({
      __esModule: true,
      default: multerFactory,
      diskStorage: multerFactory.diskStorage,
    }));

    const upload = require('../../src/utils/uploadConfig').default;
    const options = upload.options;

    const destCb = jest.fn();
    options.storage.destination({} as any, { originalname: 'x.png' } as any, destCb);
    expect(destCb.mock.calls[0][0]).toBeNull();
    expect(destCb.mock.calls[0][1]).toContain('fotografias');

    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    jest.spyOn(Math, 'random').mockReturnValue(0.123456789);

    const fileCb = jest.fn();
    options.storage.filename(
      {} as any,
      { originalname: 'foto.png' } as any,
      fileCb
    );

    expect(fileCb.mock.calls[0][0]).toBeNull();
    expect(fileCb.mock.calls[0][1]).toMatch(/^foto-1700000000000-123456789\.png$/);
  });

  it('sets max file size limit to 5MB', () => {
    const existsSync = jest.fn().mockReturnValue(true);
    const mkdirSync = jest.fn();

    const multerFactory: any = jest.fn((options) => ({ options }));
    multerFactory.diskStorage = jest.fn((config) => config);

    jest.doMock('fs', () => ({
      __esModule: true,
      default: { existsSync, mkdirSync },
      existsSync,
      mkdirSync,
    }));

    jest.doMock('multer', () => ({
      __esModule: true,
      default: multerFactory,
      diskStorage: multerFactory.diskStorage,
    }));

    const upload = require('../../src/utils/uploadConfig').default;
    expect(upload.options.limits.fileSize).toBe(5 * 1024 * 1024);
  });
});
