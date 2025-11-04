# SAML SSO Configuration Guide

## Overview

The application now uses SAML assertion validation for authentication. The SAML assertion is stored in the `UPN` cookie after myCare authentication.

## Configuration Steps

### 1. Get SAML Certificate from myCare IT

You need to obtain the public certificate that myCare uses to sign their SAML assertions. This is typically:
- An X.509 certificate in PEM format
- Usually provided as a `.cer`, `.crt`, or `.pem` file
- Or as text in the format:
  ```
  -----BEGIN CERTIFICATE-----
  [base64 encoded certificate data]
  -----END CERTIFICATE-----
  ```

**Ask myCare IT for:**
- The public certificate used to sign SAML assertions
- Confirmation that assertions are signed (required for production security)

### 2. Set Environment Variable in Vercel

Once you have the certificate, set it as an environment variable in Vercel:

**Variable Name:** `SAML_CERT`

**Variable Value:** The entire certificate content, including the BEGIN/END lines, as a single string. You may need to escape newlines or use Vercel's multi-line environment variable format.

**Example:**
```
SAML_CERT="-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKL7...
[middle lines]...
...XYZ123
-----END CERTIFICATE-----"
```

**Note:** In Vercel, you can set multi-line environment variables directly in the dashboard, or you can use escaped newlines (`\n`) in a single line.

### 3. Optional: Customize Cookie Name

The default cookie name is `UPN`. If myCare uses a different cookie name, you can override it:

**Variable Name:** `VITE_SAML_SESSION_COOKIE`

**Variable Value:** The actual cookie name (e.g., `UPN`, `SAMLToken`, etc.)

## Current Configuration Status

✅ **Token Format:** SAML assertion (confirmed)
✅ **Token Storage:** Cookie named `UPN` (configured)
✅ **Validation Method:** SAML signature validation (implemented)
⚠️ **Certificate:** Needs to be obtained from myCare IT and configured

## How It Works

1. **User authenticates with myCare** → myCare performs SAML authentication
2. **myCare stores SAML assertion** → Sets `UPN` cookie with the SAML XML assertion
3. **User accesses advanced mode** → Application reads `UPN` cookie
4. **Token sent to API** → SAML assertion is sent in `Authorization: Bearer` header
5. **Server validates assertion** → 
   - Decodes base64 (if needed)
   - Parses SAML XML
   - Validates signature using `SAML_CERT` (if configured)
   - Checks expiration
   - Extracts user information
6. **Access granted** → If valid, user can access advanced mode features

## Development vs Production

### Development Mode
- Certificate validation is **optional** (for easier testing)
- Unsigned assertions are **allowed** (for testing)
- Development bypass token is available (`dev-bypass-token`)

### Production Mode
- Certificate validation is **required** (`SAML_CERT` must be set)
- Unsigned assertions are **rejected** (security requirement)
- Development bypass is **disabled**

## Testing

### Before Production Deployment

1. **Test without certificate** (development):
   - Should work in development mode
   - Should show warning in logs
   - Should allow unsigned assertions

2. **Test with certificate** (production):
   - Set `SAML_CERT` environment variable
   - Verify signature validation works
   - Verify unsigned assertions are rejected
   - Verify expired assertions are rejected

3. **Test cookie retrieval**:
   - Verify `UPN` cookie is read correctly
   - Verify base64 decoding works (if needed)
   - Verify XML parsing works

### Test Checklist

- [ ] `UPN` cookie is read from browser
- [ ] SAML assertion is parsed correctly
- [ ] Signature validation works (with certificate)
- [ ] Expired assertions are rejected
- [ ] Unsigned assertions are rejected in production
- [ ] User information is extracted correctly
- [ ] Protected endpoints accept valid tokens
- [ ] Protected endpoints reject invalid tokens

## Troubleshooting

### "SAML_CERT not set in production"
**Cause:** Certificate environment variable is not configured
**Solution:** Set `SAML_CERT` in Vercel environment variables

### "Invalid SAML assertion format"
**Cause:** The SAML XML structure doesn't match expected format
**Solution:** Check that the `UPN` cookie contains valid SAML XML. Verify with myCare IT that the assertion format is correct.

### "SAML assertion is not signed"
**Cause:** The assertion doesn't have a signature (required in production)
**Solution:** Ensure myCare is sending signed SAML assertions. Check with myCare IT.

### "SAML assertion expired"
**Cause:** The assertion's `NotOnOrAfter` timestamp has passed
**Solution:** This is expected behavior. User needs to re-authenticate with myCare.

### "No user ID found in SAML assertion"
**Cause:** The NameID element is missing or in an unexpected format
**Solution:** Check the SAML assertion structure. The NameID should be in the Subject element.

## Security Notes

1. **Certificate Validation**: Always validate signatures in production to prevent token forgery
2. **Expiration Checking**: Assertions have a limited lifetime - this is enforced
3. **HTTPS Required**: Ensure all communication is over HTTPS in production
4. **Cookie Security**: The `UPN` cookie should be set with `HttpOnly` and `Secure` flags by myCare (verify with IT)

## Next Steps

1. ✅ Code updated to use `UPN` cookie and SAML validation
2. ⏳ Obtain `SAML_CERT` from myCare IT
3. ⏳ Set `SAML_CERT` in Vercel environment variables
4. ⏳ Test with real SAML assertions from myCare
5. ⏳ Deploy to production

## Support

If you encounter issues:
1. Check Vercel function logs for detailed error messages
2. Verify environment variables are set correctly
3. Test with a sample SAML assertion to verify parsing
4. Contact myCare IT if assertion format differs from expectations

