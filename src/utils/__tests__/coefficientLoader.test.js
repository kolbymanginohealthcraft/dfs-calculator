import { describe, it, expect } from 'vitest';
import {
  getUpdateIdForDate,
  getScheduleInfo,
  getVersionFromArdDate,
  getAllSchedules,
  getMetadata,
} from '../coefficientLoader.js';

// ---------------------------------------------------------------------------
// Baseline data integrity
// ---------------------------------------------------------------------------
describe('schedule data integrity', () => {
  it('has metadata with expected fields', () => {
    const meta = getMetadata();
    expect(meta).toHaveProperty('generated');
    expect(meta).toHaveProperty('riskAdjustmentSource');
    expect(meta).toHaveProperty('imputationSource');
    expect(meta).toHaveProperty('updateCount');
    expect(meta.updateCount).toBeGreaterThanOrEqual(1);
  });

  it('has at least one schedule entry', () => {
    const schedules = getAllSchedules();
    expect(schedules.length).toBeGreaterThanOrEqual(1);
  });

  it('schedule entries have required fields', () => {
    const schedules = getAllSchedules();
    for (const s of schedules) {
      expect(s).toHaveProperty('updateId');
      expect(s).toHaveProperty('startDate');
      expect(s).toHaveProperty('fiscalYear');
    }
  });
});

// ---------------------------------------------------------------------------
// getUpdateIdForDate
// ---------------------------------------------------------------------------
describe('getUpdateIdForDate', () => {
  const schedules = getAllSchedules();
  const latestId = schedules[schedules.length - 1].updateId;

  it('returns the latest updateId when no date is provided', () => {
    expect(getUpdateIdForDate(null)).toBe(latestId);
    expect(getUpdateIdForDate(undefined)).toBe(latestId);
    expect(getUpdateIdForDate('')).toBe(latestId);
  });

  it('returns the latest updateId for an invalid date format', () => {
    expect(getUpdateIdForDate('abc')).toBe(latestId);
    expect(getUpdateIdForDate('123')).toBe(latestId);
  });

  it('correctly selects version for YYYYMMDD format dates', () => {
    for (const period of schedules) {
      const startStr = period.startDate;
      const startDate = new Date(startStr);
      const yyyymmdd = [
        startDate.getUTCFullYear(),
        String(startDate.getUTCMonth() + 1).padStart(2, '0'),
        String(startDate.getUTCDate()).padStart(2, '0'),
      ].join('');
      expect(getUpdateIdForDate(yyyymmdd)).toBe(period.updateId);
    }
  });

  it('correctly selects version for YYYY-MM-DD format dates', () => {
    for (const period of schedules) {
      const startStr = period.startDate;
      const startDate = new Date(startStr);
      const isoDate = [
        startDate.getUTCFullYear(),
        String(startDate.getUTCMonth() + 1).padStart(2, '0'),
        String(startDate.getUTCDate()).padStart(2, '0'),
      ].join('-');
      expect(getUpdateIdForDate(isoDate)).toBe(period.updateId);
    }
  });

  it('returns the latest version for a far-future date', () => {
    expect(getUpdateIdForDate('20991231')).toBe(latestId);
  });
});

// ---------------------------------------------------------------------------
// getScheduleInfo / getVersionFromArdDate
// ---------------------------------------------------------------------------
describe('getScheduleInfo', () => {
  it('returns a schedule entry with expected fields', () => {
    const info = getScheduleInfo('20251001');
    expect(info).toHaveProperty('updateId');
    expect(info).toHaveProperty('startDate');
    expect(info).toHaveProperty('fiscalYear');
  });
});

describe('getVersionFromArdDate', () => {
  it('is an alias for getScheduleInfo and returns the same result', () => {
    const a = getScheduleInfo('20250315');
    const b = getVersionFromArdDate('20250315');
    expect(a).toEqual(b);
  });
});
