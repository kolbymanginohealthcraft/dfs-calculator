# Covariate Related Items Audit

**Status:** ⚠️ In Progress - Issues Identified  
**Date:** Unknown  
**Purpose:** Comparing `calculations.js` logic vs `covariateRelatedItems.js` mappings

## Analysis in Progress...

### Age Group Covariates (Lines 235-248)
**Calculation uses:** `A0900` (DOB), `A1900` (Admit Date)
**Current mapping:** `["A0900", "A1600"]`
**Issue:** ❌ Mapping has `A1600` but code uses `A1900`

---

### BMI Covariates (Lines 269-278)
**Calculation uses:** `K0200A` (height), `K0200B` (weight)
**Current mapping:** `["K0200A", "K0200B"]`
**Status:** ✅ Correct

---

### Cognitive Function (Lines 282-304)
**Calculation uses:** `C0500` (BIMS), `C0900A`, `C0900B`, `C0900C`, `C0900D`, `C0900Z`

**Moderately Impaired:**
- Current mapping: `["C0500", "C0900A", "C0900B", "C0900C", "C0900D"]`
- Status: ✅ Correct

**Severely Impaired:**
- Current mapping: `["C0500", "C0900A", "C0900B", "C0900C", "C0900D", "C0900Z"]`
- Status: ✅ Correct

---

### Communication Impairment (Lines 307-323)
**Calculation uses:** `B0700`, `B0800`
**Current mapping:** `["B0700", "B0800"]`
**Status:** ✅ Correct (both variants)

---

### Continence Covariates (Lines 326-350)
**Calculation uses:** `H0400` (bowel), `H0300` (urinary)

**Bowel covariates:**
- Current mapping: `["H0400"]`
- Status: ✅ Correct

**Urinary covariates:**
- Current mapping: `["H0300"]`
- Status: ✅ Correct

---

### Prior Functioning (Lines 353-387)
**Calculation uses:** `GG0100A`, `GG0100B`, `GG0100C`, `GG0100D`

All mappings: ✅ Correct

---

### Prior Mobility Devices (Lines 390-407)
**Calculation uses:** `GG0110A`, `GG0110B`, `GG0110C`, `GG0110D`, `GG0110E`

**Manual Wheelchair:**
- Code uses: `GG0110A` OR `GG0110B`
- Current mapping: `["GG0100A", "GG0100B"]`
- Issue: ❌ Wrong prefix - should be `GG0110A`, `GG0110B`

**Mechanical Lift:**
- Code uses: `GG0110C`
- Current mapping: `["GG0100C"]`
- Issue: ❌ Wrong prefix - should be `GG0110C`

**Walker:**
- Code uses: `GG0110D`
- Current mapping: `["GG0110D"]`
- Status: ✅ Correct (already fixed)

**Orthotics/Prosthetics:**
- Code uses: `GG0110E`
- Current mapping: `["GG0100E"]`
- Issue: ❌ Wrong prefix - should be `GG0110E`

---

### Uses Wheelchair (Lines 256-266)
**Calculation uses:** Calls `determineMobilityType()` which checks:
- `GG0170I1`, `GG0170I3`, `GG0170R1`, `GG0170R3`, `GG0170S1`, `GG0170S3`
**Current mapping:** Not in list yet
**Issue:** ❌ Missing covariate mapping

---

### Medical Condition Category (Lines 410-424)
**Calculation uses:** `I0020`
**Current mapping:** All variants map to `["I0020"]`
**Status:** ✅ Correct

---

### Admission Function (Lines 730-732)
**Calculation uses:** `calculateFunctionScore(startScores)` which uses:
- Walk mode: `GG0130A`, `GG0130B`, `GG0130C`, `GG0170A`, `GG0170C`, `GG0170D`, `GG0170E`, `GG0170F`, `GG0170I`, `GG0170J`
- Wheel mode: Same except `GG0170R` instead of `GG0170I`, `GG0170J`

**Current mapping:** Uses admission versions `GG0130A1`, `GG0170A1`, etc.
**Issue:** ⚠️ Maps to admission (1) versions but should probably show all three: admission (1), discharge (3), and goal (GG)

---

## Summary of Issues Found

1. ❌ **Age covariates:** Use `A1900` not `A1600`
2. ❌ **Prior Mobility Device - Manual Wheelchair:** Should be `GG0110A`, `GG0110B` not `GG0100A`, `GG0100B`
3. ❌ **Prior Mobility Device - Mechanical Lift:** Should be `GG0110C` not `GG0100C`
4. ❌ **Prior Mobility Device - Orthotics/Prosthetics:** Should be `GG0110E` not `GG0100E`
5. ❌ **Uses Wheelchair:** Missing from mapping entirely

## Recommendations

Would you like me to fix these issues?
