# Debugging 500 Internal Server Errors

## Current Issue

The frontend is successfully connecting to the backend, but API calls are returning 500 errors:
- `POST /api/imputation` → 500
- `POST /api/function-score` → 500

## What This Means

✅ **Working:**
- Backend is running
- Frontend can connect to backend
- Requests are reaching the backend
- Authentication is working (would get 401 if not)

❌ **Problem:**
- Backend is throwing an exception during request processing
- The exception is being caught and returned as a 500 error

## How to Debug

### Step 1: Check Backend Console Output

**The backend console will show the actual error message.** Look at the terminal where you ran `npm run server` or `dotnet run`. You should see:
- The exception type (e.g., `NullReferenceException`, `FileNotFoundException`)
- The exception message
- The stack trace showing where it failed

### Step 2: Common Issues to Check

#### A. Missing or Incorrect Data Files
The backend needs:
- `Aegis.DfsCalculator/DFSCalculator.Server/Data/coefficients-all-versions.json` ✅ (exists)

**Check:** Verify the file is readable and not corrupted.

#### B. Property Name Mismatch
The backend expects:
- `DOB` (uppercase) for date of birth
- `FirstName`, `LastName`, etc. (PascalCase)

The frontend sends:
- `dob` (lowercase)
- `firstName`, `lastName`, etc. (camelCase)

**Status:** The backend is configured with `PropertyNamingPolicy.CamelCase`, which should handle this automatically. However, `DOB` might not map correctly.

**Fix:** Check if the backend is actually receiving the data correctly. The JSON serializer should handle camelCase, but verify.

#### C. Null Reference Exceptions
The backend might be accessing properties that are null:
- `body.Summary.Age` - if `Summary` is null or `Age` is missing
- `body.ParsedValues` - if null or empty
- `body.ICDList` - if null or empty

**Check:** Verify the frontend is sending all required fields.

#### D. Date Format Issues
The backend expects dates in specific formats:
- ARD Date: YYYYMMDD format or Unix timestamp
- The `CoefficientLoader.GetFunctionMultipliers()` method parses dates

**Check:** Verify the `ardDate` being sent matches expected format.

### Step 3: Enable Detailed Error Messages

To see the actual error message in the API response, you can temporarily modify the backend controllers to return more details:

**In `FunctionScoreController.cs` and `ImputationController.cs`:**
```csharp
catch (Exception ex)
{
    // Temporarily return full error details for debugging
    return StatusCode(500, new { 
        error = "Internal server error", 
        message = ex.Message,
        stackTrace = ex.StackTrace,  // Add this temporarily
        innerException = ex.InnerException?.Message  // Add this temporarily
    });
}
```

**⚠️ Remove this after debugging - don't expose stack traces in production!**

### Step 4: Check Request Payload

Add logging to see what the backend is actually receiving:

**In the controllers, add:**
```csharp
[HttpPost]
public IActionResult HandleFunctionScore(FunctionScoreCalculationBody body)
{
    // Temporary logging
    System.Diagnostics.Debug.WriteLine($"Received body: {JsonSerializer.Serialize(body)}");
    System.Diagnostics.Debug.WriteLine($"Summary: {JsonSerializer.Serialize(body?.Summary)}");
    System.Diagnostics.Debug.WriteLine($"ARDDate: {body?.ARDDate}");
    
    // ... rest of code
}
```

### Step 5: Verify Authentication

Even though you're getting 500 (not 401), verify authentication is working:

**Test endpoint:**
```bash
curl -X GET http://localhost:5189/account/me -H "Cookie: <your-session-cookie>"
```

Or check in browser DevTools → Network tab → see if cookies are being sent.

## Most Likely Causes

Based on the code structure, the most likely issues are:

1. **Missing or null `Summary.Age`** - The backend accesses `body.Summary.Age` directly. If `Age` is null or missing, this could cause issues.

2. **Date parsing failure** - The `CoefficientLoader.GetFunctionMultipliers(body.ARDDate)` might be failing if the date format is unexpected.

3. **Null reference in calculation methods** - The `ServerCalculations.GetFunctionCovariates()` or `ServerImputations` methods might be hitting null values.

## Quick Fixes to Try

### Fix 1: Verify Summary Object Structure

Make sure the frontend is sending the summary with all required fields:

```javascript
// In secureApiClient.js, verify the summary object has:
{
  firstName: "...",
  lastName: "...",
  dob: "...",  // This should map to DOB
  facility: "...",
  admitDate: "...",
  dischargeDate: "...",
  age: 75,  // Must be a number, not null
  ardGapDays: 0  // Can be null
}
```

### Fix 2: Check ARD Date Format

Verify the `ardDate` is in the correct format (YYYYMMDD):

```javascript
// In fileParser.js or wherever ardDate is set
const ardDate = parsedValues["A2300"]; // Should be YYYYMMDD format
```

### Fix 3: Add Null Checks

If the backend doesn't have null checks, add them:

```csharp
if (body.Summary?.Age == null)
{
    return BadRequest(new { error = "Summary.Age is required" });
}
```

## Next Steps

1. **Check the backend console** - This will show the actual error
2. **Add temporary logging** - See what data the backend is receiving
3. **Verify data formats** - Ensure dates and numbers are in expected formats
4. **Test with minimal data** - Try sending a minimal valid request to isolate the issue

## Getting Help

If you can't resolve the issue:
1. Copy the **exact error message** from the backend console
2. Copy the **request payload** being sent (from browser DevTools → Network tab)
3. Share both with IT team (Hannah/Scott) for assistance

---

**Remember:** The backend console output is your best friend for debugging 500 errors!
