/**
 * HCC Mapping - CLIENT STUB
 * 
 * This file is a stub for client-side compatibility.
 * The actual implementation is in src/utils/server/hccMapping.js (server-only)
 * 
 * DO NOT import icdToHcc data here - it will be bundled into the client!
 */

// Stub functions that return empty values (should never be called client-side)
export function getHccValuesForIcd(icdCode) {
  console.warn('getHccValuesForIcd called client-side - this should not happen');
  return [];
}

export function formatHccDisplay(hccValues) {
  console.warn('formatHccDisplay called client-side - this should not happen');
  return "";
}

export function getHccDisplayForIcd(icdCode) {
  console.warn('getHccDisplayForIcd called client-side - this should not happen');
  return "";
}
