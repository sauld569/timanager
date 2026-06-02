import request from 'supertest';
import express, { Express } from 'express';

const mockExistsSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockReadFileSync = jest.fn();

jest.mock('fs', () => ({
  existsSync: (...args: any[]) => mockExistsSync(...args),
  writeFileSync: (...args: any[]) => mockWriteFileSync(...args),
  readFileSync: (...args: any[]) => mockReadFileSync(...args),
}));

import notificationConfigRoutes from '../../src/routes/notificationConfigRoutes';

let app: Express;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use('/api/notification-config', notificationConfigRoutes);
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Route wiring - notificationConfigRoutes', () => {
  it('GET / returns config data', async () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify({ emails: ['a@a.com'] }));

    const res = await request(app).get('/api/notification-config').expect(200);

    expect(res.body.emails).toEqual(['a@a.com']);
  });

  it('GET / creates default file if missing', async () => {
    mockExistsSync.mockReturnValue(false);
    mockReadFileSync.mockReturnValue(JSON.stringify({ emails: [] }));

    await request(app).get('/api/notification-config').expect(200);

    expect(mockWriteFileSync).toHaveBeenCalled();
  });

  it('POST / stores config and normalizes lateFrequencyHours', async () => {
    mockWriteFileSync.mockReturnValue(undefined);

    const res = await request(app)
      .post('/api/notification-config')
      .send({ lateFrequencyHours: 2, emails: [] })
      .expect(200);

    expect(res.body.success).toBe(true);
    const savedPayload = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
    expect(savedPayload.lateFrequencyDays).toBe(2);
    expect(savedPayload.lateFrequencyHours).toBeUndefined();
  });
});
