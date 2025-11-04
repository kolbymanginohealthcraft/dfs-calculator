/**
 * Coefficient Loader - CLIENT STUB
 * 
 * This file is a stub for client-side compatibility.
 * The actual implementation is in src/utils/server/coefficientLoader.js (server-only)
 * 
 * DO NOT import coefficient data here - it will be bundled into the client!
 */

// Stub functions that return empty objects (should never be called client-side)
export function getUpdateIdForDate(dateStr) {
  console.warn('getUpdateIdForDate called client-side - this should not happen');
  return '3'; // Default to latest
}

export function getFunctionMultipliers(dateStr) {
  console.warn('getFunctionMultipliers called client-side - this should not happen');
  return {};
}

export function getImputationMultipliers(dateStr) {
  console.warn('getImputationMultipliers called client-side - this should not happen');
  return {};
}

export function getImputationMultipliersForItem(ggItemId, dateStr) {
  console.warn('getImputationMultipliersForItem called client-side - this should not happen');
  return {};
}

export function getScheduleInfo(dateStr) {
  console.warn('getScheduleInfo called client-side - this should not happen');
  return null;
}

export function getVersionFromArdDate(dateStr) {
  console.warn('getVersionFromArdDate called client-side - this should not happen');
  return null;
}

export function getAllSchedules() {
  console.warn('getAllSchedules called client-side - this should not happen');
  return [];
}

export function getMetadata() {
  console.warn('getMetadata called client-side - this should not happen');
  return {};
}
