# Certificate Installation Troubleshooting

## Current Status

The certificate with thumbprint `b7342976a19fe031c0c9205237307fc2c9faa5ad` is **not found** in your Current User → Personal certificate store.

## Possible Issues

### 1. Certificate Installed to Wrong Store
When you double-clicked the `.cer` file, you might have selected the wrong store location.

**Solution:** Reinstall the certificate
1. Double-click the `.cer` file again
2. Click "Install Certificate..."
3. Choose **"Current User"** (not Local Machine)
4. Click "Next"
5. Select **"Place all certificates in the following store"**
6. Click **"Browse"**
7. Select **"Personal"** (not Trusted Root, not Intermediate, etc.)
8. Click "OK" → "Next" → "Finish"

### 2. Certificate Thumbprint Mismatch
The certificate Scott sent might have a different thumbprint than what's configured in `appsettings.json`.

**To check the certificate's thumbprint:**
1. Double-click the `.cer` file
2. Go to the "Details" tab
3. Scroll down and select "Thumbprint"
4. Compare it to: `b7342976a19fe031c0c9205237307fc2c9faa5ad`

If it's different, you have two options:
- Update `appsettings.json` with the correct thumbprint
- Or ask Scott for the correct certificate

### 3. Certificate Needs to be in Local Machine Store
The backend might need it in Local Machine instead of Current User (requires admin).

**To install to Local Machine:**
1. Right-click the `.cer` file
2. Select "Install Certificate..."
3. Choose **"Local Machine"** (requires admin rights)
4. Select **"Personal"** store
5. Complete the installation

## Verify Installation

After reinstalling, verify with:
```powershell
Get-ChildItem -Path Cert:\CurrentUser\My | Where-Object { $_.Thumbprint -eq "b7342976a19fe031c0c9205237307fc2c9faa5ad" }
```

Or check all stores:
```powershell
Get-ChildItem -Path Cert:\CurrentUser -Recurse | Where-Object { $_.Thumbprint -eq "b7342976a19fe031c0c9205237307fc2c9faa5ad" }
```

## Alternative: Check Certificate File Directly

You can also check the certificate file's thumbprint without installing it:

**Using PowerShell:**
```powershell
$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2("C:\path\to\certificate.cer")
$cert.Thumbprint
```

This will show you the actual thumbprint of the certificate file.

## Next Steps

1. **Check the certificate file's thumbprint** (using PowerShell command above)
2. **Compare it to the expected thumbprint** in `appsettings.json`
3. **Reinstall to the correct store** if needed
4. **Try running the backend** - it will tell you if the certificate is found

## If Certificate Still Not Found

The backend will give you a clear error message when you try to run it:
```
IdP certificate with thumbprint b7342976a19fe031c0c9205237307fc2c9faa5ad not found in LocalMachine\My
```

This will help us debug further. You can also try running the backend now to see what error you get - that might give us more clues!
