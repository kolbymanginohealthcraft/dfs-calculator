# SAML Certificate Management

The C# backend uses a SAML Identity Provider (IdP) certificate to validate SSO responses. This certificate must be installed in the Windows Certificate Store for the backend to start.

**Expected thumbprint:** `b7342976a19fe031c0c9205237307fc2c9faa5ad`

---

## Installation

### GUI Method

**For .pfx files:**
1. Double-click the `.pfx` file
2. Certificate Import Wizard opens
3. Choose **"Current User"** (or "Local Machine" if you have admin rights)
4. Enter the password if prompted (from Scott/IT)
5. Select "Place all certificates in the following store"
6. Click "Browse" → select **"Personal"**
7. Click "Next" → "Finish"

**For .cer/.crt files:**
1. Double-click the certificate file
2. Click "Install Certificate..."
3. Choose **"Current User"**
4. Select "Place all certificates in the following store"
5. Click "Browse" → select **"Personal"** (not Trusted Root, not Intermediate)
6. Click "Next" → "Finish"

### PowerShell Method

**For .pfx file:**
```powershell
$password = ConvertTo-SecureString -String "YOUR_PASSWORD" -Force -AsPlainText
Import-PfxCertificate -FilePath "C:\path\to\certificate.pfx" -CertStoreLocation Cert:\CurrentUser\My -Password $password
```

**For .cer file:**
```powershell
$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2("C:\path\to\certificate.cer")
$store = New-Object System.Security.Cryptography.X509Certificates.X509Store([System.Security.Cryptography.X509Certificates.StoreName]::My, [System.Security.Cryptography.X509Certificates.StoreLocation]::CurrentUser)
$store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadWrite)
$store.Add($cert)
$store.Close()
```

---

## Verification

### Quick Check

```powershell
$found = Get-ChildItem -Path Cert:\CurrentUser\My | Where-Object { $_.Thumbprint -eq "b7342976a19fe031c0c9205237307fc2c9faa5ad" }
if ($found) {
    Write-Host "Certificate FOUND in Current User > Personal store"
    $found | Select-Object Subject, Thumbprint, NotAfter
} else {
    Write-Host "Certificate NOT FOUND in Current User > Personal store"
}
```

### Check a Certificate File's Thumbprint (Before Installing)

```powershell
$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2("C:\path\to\certificate.cer")
Write-Host "Thumbprint: $($cert.Thumbprint)"
Write-Host "Expected:   b7342976a19fe031c0c9205237307fc2c9faa5ad"
Write-Host "Match:      $($cert.Thumbprint -eq 'b7342976a19fe031c0c9205237307fc2c9faa5ad')"
```

### Search All Certificate Stores

If the certificate isn't in Personal, check other stores:

```powershell
Write-Host "Checking Current User stores..."
Get-ChildItem -Path Cert:\CurrentUser -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Thumbprint -eq "b7342976a19fe031c0c9205237307fc2c9faa5ad" } |
    Select-Object PSPath, Subject, Thumbprint

Write-Host "Checking Local Machine stores..."
Get-ChildItem -Path Cert:\LocalMachine -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Thumbprint -eq "b7342976a19fe031c0c9205237307fc2c9faa5ad" } |
    Select-Object PSPath, Subject, Thumbprint
```

### GUI Method

1. Press `Win + R`, type `certmgr.msc`, press Enter
2. Navigate to **Personal** → **Certificates**
3. Double-click a certificate → **Details** tab → scroll to **Thumbprint**
4. Compare to `b7342976a19fe031c0c9205237307fc2c9faa5ad`

---

## Troubleshooting

### Certificate Not Found

The backend will report:
```
IdP certificate with thumbprint b7342976a19fe031c0c9205237307fc2c9faa5ad not found in LocalMachine\My
```

**Possible causes:**

1. **Wrong store** — You may have installed to Trusted Root or Intermediate instead of Personal. Reinstall following the steps above, making sure to select the **Personal** store.

2. **Wrong scope** — Try both "Current User" and "Local Machine" (Local Machine requires admin). The backend checks:
   - Current User → Personal (development)
   - Local Machine → Personal (production)

3. **Thumbprint mismatch** — The certificate file might have a different thumbprint than expected. Check the file's thumbprint with the PowerShell command above. If it differs, either update `appsettings.json` with the correct thumbprint or ask IT for the correct certificate.

4. **Password needed** — If IT sent a `.pfx` file, you need the password. Check the email or ask IT.

### After Fixing

1. Verify installation with the Quick Check command above
2. Run the backend: `cd Aegis.DfsCalculator/DFSCalculator.Server && dotnet run`
3. If errors persist, share the exact error message with IT (Scott/Hannah)
