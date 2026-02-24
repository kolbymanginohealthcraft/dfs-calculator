import { describe, it, expect } from 'vitest';
import {
  resolveScore,
  scoreToStoredValue,
  formatDOB,
  formatDate,
  calculateAgeAtAdmission,
  calculateDateGap,
  determineMobilityType,
  calculateFunctionScore,
  getContributingItemIds,
  scoreMap,
  ANA,
  valid,
  GG_ITEMS,
} from '../calculations.js';

// ---------------------------------------------------------------------------
// resolveScore
// ---------------------------------------------------------------------------
describe('resolveScore', () => {
  it('maps standard MDS codes (01-06) to integers 1-6', () => {
    expect(resolveScore('01')).toBe(1);
    expect(resolveScore('02')).toBe(2);
    expect(resolveScore('03')).toBe(3);
    expect(resolveScore('04')).toBe(4);
    expect(resolveScore('05')).toBe(5);
    expect(resolveScore('06')).toBe(6);
  });

  it('maps special MDS codes to 1 (floor value)', () => {
    expect(resolveScore('07')).toBe(1);
    expect(resolveScore('08')).toBe(1);
    expect(resolveScore('09')).toBe(1);
    expect(resolveScore('10')).toBe(1);
    expect(resolveScore('88')).toBe(1);
    expect(resolveScore('^')).toBe(1);
  });

  it('passes through continuous imputed values (number)', () => {
    expect(resolveScore(3.5)).toBe(3.5);
    expect(resolveScore(1.0)).toBe(1.0);
    expect(resolveScore(5.9999)).toBe(5.9999);
  });

  it('parses continuous imputed values from strings', () => {
    expect(resolveScore('2.7903')).toBeCloseTo(2.7903);
    expect(resolveScore('4.123')).toBeCloseTo(4.123);
  });

  it('returns 0 for null / undefined', () => {
    expect(resolveScore(null)).toBe(0);
    expect(resolveScore(undefined)).toBe(0);
  });

  it('returns 0 for out-of-range continuous values', () => {
    expect(resolveScore(0.5)).toBe(0);
    expect(resolveScore(7)).toBe(0);
    expect(resolveScore(-1)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// scoreToStoredValue
// ---------------------------------------------------------------------------
describe('scoreToStoredValue', () => {
  it('zero-pads integers 1-6 to MDS code strings', () => {
    expect(scoreToStoredValue(1)).toBe('01');
    expect(scoreToStoredValue(6)).toBe('06');
  });

  it('converts continuous values to their string representation', () => {
    expect(scoreToStoredValue(2.7903)).toBe('2.7903');
    expect(scoreToStoredValue(4.5)).toBe('4.5');
  });
});

// ---------------------------------------------------------------------------
// formatDOB / formatDate
// ---------------------------------------------------------------------------
describe('formatDOB', () => {
  it('formats YYYYMMDD into MM/DD/YYYY', () => {
    expect(formatDOB('19450312')).toBe('03/12/1945');
  });

  it('returns "Unknown" for missing or short input', () => {
    expect(formatDOB(null)).toBe('Unknown');
    expect(formatDOB('')).toBe('Unknown');
    expect(formatDOB('1234')).toBe('Unknown');
  });
});

describe('formatDate', () => {
  it('formats YYYYMMDD into MM/DD/YYYY', () => {
    expect(formatDate('20251001')).toBe('10/01/2025');
  });

  it('returns the input unchanged for non-8-char strings', () => {
    expect(formatDate('2025')).toBe('2025');
    expect(formatDate(null)).toBe(null);
  });
});

// ---------------------------------------------------------------------------
// calculateAgeAtAdmission
// ---------------------------------------------------------------------------
describe('calculateAgeAtAdmission', () => {
  it('calculates age when birthday has passed', () => {
    expect(calculateAgeAtAdmission('19500601', '20250701')).toBe(75);
  });

  it('calculates age when birthday has not yet passed', () => {
    expect(calculateAgeAtAdmission('19500801', '20250701')).toBe(74);
  });

  it('returns null for missing inputs', () => {
    expect(calculateAgeAtAdmission(null, '20250701')).toBeNull();
    expect(calculateAgeAtAdmission('19500601', null)).toBeNull();
    expect(calculateAgeAtAdmission('1234', '20250701')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// calculateDateGap
// ---------------------------------------------------------------------------
describe('calculateDateGap', () => {
  it('returns the number of days between two dates', () => {
    expect(calculateDateGap('20250101', '20250111')).toBe(10);
  });

  it('returns 0 for the same date', () => {
    expect(calculateDateGap('20250515', '20250515')).toBe(0);
  });

  it('returns null for invalid inputs', () => {
    expect(calculateDateGap(null, '20250111')).toBeNull();
    expect(calculateDateGap('20250101', '')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// determineMobilityType
// ---------------------------------------------------------------------------
describe('determineMobilityType', () => {
  it('returns "Walk" when I1 is a valid score', () => {
    const values = {
      GG0170I1: '03',
      GG0170I3: '04',
      GG0170R1: '03',
      GG0170R3: '03',
      GG0170S1: '03',
      GG0170S3: '03',
    };
    expect(determineMobilityType(values)).toBe('Walk');
  });

  it('returns "Wheel" when I1 and I3 are ANA and wheelchair items are valid', () => {
    const values = {
      GG0170I1: '07',
      GG0170I3: '09',
      GG0170R1: '03',
      GG0170R3: '03',
      GG0170S1: '03',
      GG0170S3: '03',
    };
    expect(determineMobilityType(values)).toBe('Wheel');
  });

  it('returns "Unknown" when GG0170I1 is missing', () => {
    expect(determineMobilityType({})).toBe('Unknown');
  });

  it('returns "Walk" when I1/I3 are ANA but no wheelchair items are valid', () => {
    const values = {
      GG0170I1: '07',
      GG0170I3: '09',
      GG0170R1: '07',
      GG0170R3: '07',
      GG0170S1: '07',
      GG0170S3: '07',
    };
    expect(determineMobilityType(values)).toBe('Walk');
  });
});

// ---------------------------------------------------------------------------
// calculateFunctionScore
// ---------------------------------------------------------------------------
describe('calculateFunctionScore', () => {
  const walkValues = {
    GG0130A1: '03', GG0130B1: '04', GG0130C1: '05',
    GG0170A1: '03', GG0170C1: '03', GG0170D1: '03',
    GG0170E1: '03', GG0170F1: '03',
    GG0170I1: '03', GG0170I3: '03',
    GG0170J1: '04',
    GG0170R1: '02', GG0170R3: '02',
    GG0170S1: '02', GG0170S3: '02',
    GG0130A: '03', GG0130B: '04', GG0130C: '05',
    GG0170A: '03', GG0170C: '03', GG0170D: '03',
    GG0170E: '03', GG0170F: '03',
    GG0170I: '03', GG0170J: '04', GG0170R: '02',
  };

  it('sums the correct 10 items for Walk mobility', () => {
    // Walk: SA+SB+SC + MA+MC+MD+ME+MF + MI+MJ
    // = 3+4+5 + 3+3+3+3+3 + 3+4 = 34
    expect(calculateFunctionScore(walkValues, 'Walk')).toBe(34);
  });

  it('sums the correct 10 items for Wheel mobility (R counted twice)', () => {
    // Wheel: SA+SB+SC + MA+MC+MD+ME+MF + MR+MR
    // = 3+4+5 + 3+3+3+3+3 + 2+2 = 31
    expect(calculateFunctionScore(walkValues, 'Wheel')).toBe(31);
  });

  it('handles continuous imputed values in the score', () => {
    const values = {
      GG0130A: '2.5', GG0130B: '3.0', GG0130C: '4.0',
      GG0170A: '3.0', GG0170C: '3.0', GG0170D: '3.0',
      GG0170E: '3.0', GG0170F: '3.0',
      GG0170I: '3.0', GG0170J: '3.0', GG0170R: '3.0',
      GG0170I1: '03', GG0170I3: '03',
    };
    // Walk: 2.5+3+4 + 3+3+3+3+3 + 3+3 = 30.5
    expect(calculateFunctionScore(values, 'Walk')).toBeCloseTo(30.5);
  });
});

// ---------------------------------------------------------------------------
// getContributingItemIds
// ---------------------------------------------------------------------------
describe('getContributingItemIds', () => {
  it('returns Walk items (I, J) when mobility is Walk', () => {
    const values = { GG0170I1: '03', GG0170I3: '03' };
    const ids = getContributingItemIds(values);
    expect(ids.has('GG0170I')).toBe(true);
    expect(ids.has('GG0170J')).toBe(true);
    expect(ids.has('GG0170R')).toBe(false);
  });

  it('returns Wheel items (R only) when mobility is Wheel', () => {
    const values = {
      GG0170I1: '07', GG0170I3: '09',
      GG0170R1: '03', GG0170R3: '03',
      GG0170S1: '03', GG0170S3: '03',
    };
    const ids = getContributingItemIds(values);
    expect(ids.has('GG0170R')).toBe(true);
    expect(ids.has('GG0170I')).toBe(false);
    expect(ids.has('GG0170J')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Exported constants
// ---------------------------------------------------------------------------
describe('exported constants', () => {
  it('scoreMap covers all expected MDS codes', () => {
    expect(scoreMap['01']).toBe(1);
    expect(scoreMap['06']).toBe(6);
    expect(scoreMap['88']).toBe(1);
  });

  it('ANA set contains the four Activity Not Attempted codes', () => {
    expect(ANA.has('07')).toBe(true);
    expect(ANA.has('09')).toBe(true);
    expect(ANA.has('10')).toBe(true);
    expect(ANA.has('88')).toBe(true);
    expect(ANA.size).toBe(4);
  });

  it('valid set contains 01-06', () => {
    for (let i = 1; i <= 6; i++) {
      expect(valid.has(i.toString().padStart(2, '0'))).toBe(true);
    }
    expect(valid.size).toBe(6);
  });

  it('GG_ITEMS is a non-empty array of objects with id/label/domain', () => {
    expect(Array.isArray(GG_ITEMS)).toBe(true);
    expect(GG_ITEMS.length).toBeGreaterThan(0);
    expect(GG_ITEMS[0]).toHaveProperty('id');
    expect(GG_ITEMS[0]).toHaveProperty('label');
    expect(GG_ITEMS[0]).toHaveProperty('domain');
  });
});
