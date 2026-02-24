import { describe, it, expect } from 'vitest';
import {
  getUpdateIdForDate,
  getFunctionMultipliers,
  getImputationMultipliers,
  getImputationMultipliersForItem,
  getScheduleInfo,
  getVersionFromArdDate,
  getAllSchedules,
  getMetadata,
  allVersions,
} from '../coefficientLoader.js';

// ---------------------------------------------------------------------------
// Baseline data integrity
// ---------------------------------------------------------------------------
describe('allVersions data integrity', () => {
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

  it('has functionMultipliers for every updateId in the schedule', () => {
    const schedules = getAllSchedules();
    for (const s of schedules) {
      expect(allVersions.functionMultipliers).toHaveProperty(s.updateId);
    }
  });

  it('has imputationMultipliers for every updateId in the schedule', () => {
    const schedules = getAllSchedules();
    for (const s of schedules) {
      expect(allVersions.imputationMultipliers).toHaveProperty(s.updateId);
    }
  });

  it('function multipliers contain Model Intercept', () => {
    const schedules = getAllSchedules();
    for (const s of schedules) {
      const multipliers = allVersions.functionMultipliers[s.updateId];
      expect(multipliers).toHaveProperty('Model Intercept');
      expect(typeof multipliers['Model Intercept']).toBe('number');
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
// getFunctionMultipliers
// ---------------------------------------------------------------------------
describe('getFunctionMultipliers', () => {
  it('returns an object with numeric multiplier values', () => {
    const mult = getFunctionMultipliers('20251001');
    expect(typeof mult).toBe('object');
    expect(mult).not.toBeNull();
    expect(typeof mult['Model Intercept']).toBe('number');
  });

  it('returns consistent multipliers for dates in the same period', () => {
    const mult1 = getFunctionMultipliers('20251001');
    const mult2 = getFunctionMultipliers('20260101');
    expect(mult1['Model Intercept']).toBe(mult2['Model Intercept']);
  });
});

// ---------------------------------------------------------------------------
// getImputationMultipliers
// ---------------------------------------------------------------------------
describe('getImputationMultipliers', () => {
  it('returns an object keyed by GG item IDs', () => {
    const mult = getImputationMultipliers('20251001');
    expect(typeof mult).toBe('object');
    const keys = Object.keys(mult);
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.some(k => k.startsWith('GG'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getImputationMultipliersForItem
// ---------------------------------------------------------------------------
describe('getImputationMultipliersForItem', () => {
  it('returns multipliers for a valid GG item', () => {
    const mult = getImputationMultipliersForItem('GG0130A1', '20251001');
    expect(typeof mult).toBe('object');
  });

  it('returns empty object for unknown GG item', () => {
    const mult = getImputationMultipliersForItem('GG9999Z9', '20251001');
    expect(mult).toEqual({});
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
