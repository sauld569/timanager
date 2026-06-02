import { DateUtils } from '../../src/utils/dateUtils';

describe('DateUtils', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('getCurrentDateInMexicali returns a valid Date', () => {
    const result = DateUtils.getCurrentDateInMexicali();
    expect(result).toBeInstanceOf(Date);
    expect(Number.isNaN(result.getTime())).toBe(false);
  });

  it('formatDateToMexicanFormat formats provided date', () => {
    const result = DateUtils.formatDateToMexicanFormat(new Date('2026-03-17T12:00:00.000Z'));
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('formatDateForInput returns yyyy-mm-dd style string', () => {
    const result = DateUtils.formatDateForInput(new Date('2026-03-17T12:00:00.000Z'));
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('parseToMexicaliDate parses yyyy-mm-dd and sets noon', () => {
    const result = DateUtils.parseToMexicaliDate('2026-03-17');
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(2);
    expect(result.getDate()).toBe(17);
    expect(result.getHours()).toBe(12);
    expect(result.getMinutes()).toBe(0);
  });

  it('parseToMexicaliDate with empty string falls back to current date', () => {
    const fixed = new Date('2026-03-17T10:00:00.000Z');
    jest.spyOn(DateUtils, 'getCurrentDateInMexicali').mockReturnValue(fixed);

    const result = DateUtils.parseToMexicaliDate('');
    expect(result).toEqual(fixed);
  });

  it('getCurrentTimestamp returns current mexicali time in ms', () => {
    const fixed = new Date('2026-03-17T10:00:00.000Z');
    jest.spyOn(DateUtils, 'getCurrentDateInMexicali').mockReturnValue(fixed);

    const result = DateUtils.getCurrentTimestamp();
    expect(result).toBe(fixed.getTime());
  });

  it('isValidDate returns true for valid Date and false otherwise', () => {
    expect(DateUtils.isValidDate(new Date())).toBe(true);
    expect(DateUtils.isValidDate(new Date('invalid-date'))).toBe(false);
    expect(DateUtils.isValidDate('2026-03-17')).toBe(false);
    expect(DateUtils.isValidDate(null)).toBe(false);
  });

  it('formatForOrdenCompra accepts Date and returns dd/mm/yyyy', () => {
    const result = DateUtils.formatForOrdenCompra(new Date('2026-03-17T12:00:00.000Z'));
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('formatForOrdenCompra accepts string date', () => {
    const result = DateUtils.formatForOrdenCompra('2026-03-17');
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('getStartOfDay sets time to 00:00:00.000', () => {
    const result = DateUtils.getStartOfDay(new Date('2026-03-17T18:45:30.111Z'));
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  it('getEndOfDay sets time to 23:59:59.999', () => {
    const result = DateUtils.getEndOfDay(new Date('2026-03-17T01:10:20.000Z'));
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
    expect(result.getMilliseconds()).toBe(999);
  });
});
