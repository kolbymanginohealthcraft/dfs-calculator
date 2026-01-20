# Installing SAML Certificate for Local Development

## Overview

Scott sent you a security certificate that needs to be installed locally for the C# backend to work with SAML authentication.

## What the Backend Needs

Looking at the backend code (`Program.cs`), it's looking for a SAML Identity Provider (IdP) certificate with this thumbprint:
```
b7342976a19fe031c0c9205237307fc2c9faa5ad
```

The certificate needs to be installed in the Windows Certificate Store.

## How to Install the Certificate

### Step 1: Locate the Certificate File

Find the certificate file Scott sent you. It might be:
- A `.pfx` file (PKCS#12 format)
- A `.cer` or `.crt` file (DER or Base64 encoded)
- A `.p7b` file (PKCS#7 format)

### Step 2: Install to Certificate Store

**For .pfx files:**
1. Double-click the `.pfx` file
2. Certificate Import Wizard will open
3. Choose "Current User" (or "Local Machine" if you have admin rights)
4. Enter the password if prompted (Scott may have provided this)
5. Select "Place all certificates in the following store"
6. Click "Browse" and select **"Personal"** store
7. Click "Next" and "Finish"

**For .cer/.crt files:**
1. Double-click the certificate file
2. Click "Install Certificate..."
3. Choose "Current User" or "Local Machine"
4. Select "Place all certificates in the following store"
5. Click "Browse" and select **"Personal"** store
6. Click "Next" and "Finish"

### Step 3: Verify Installation

You can verify the certificate is installed:

**Using PowerShell:**
```powershell
# Check if certificate with the thumbprint exists
Get-ChildItem -Path Cert:\CurrentUser\My | Where-Object { $_.Thumbprint -eq "b7342976a19fe031c0c9205237307fc2c9faa5ad" }
```

**Using Certificate Manager (GUI):**
1. Press `Win + R`, type `certmgr.msc`, press Enter
2. Navigate to: **Personal** → **Certificates**
3. Look for a certificate with thumbprint: `b7342976a19fe031c0c9205237307fc2c9faa5ad`

## Alternative: Install via PowerShell

If you have the certificate file, you can also install it via PowerShell:

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

## What the Backend Does

The backend code (in `Program.cs`) will:
1. Look for the certificate in the Windows Certificate Store
2. Find it by thumbprint: `b7342976a19fe031c0c9205237307fc2c9faa5ad`
3. Use it to validate SAML responses from the IdP

## Troubleshooting

### Certificate Not Found Error
If you get an error about the certificate not being found:
- Make sure you installed it to the **Personal (My)** store
- Verify the thumbprint matches: `b7342976a19fe031c0c9205237307fc2c9faa5ad`
- Try installing to "Local Machine" instead of "Current User" (requires admin)

### Wrong Certificate Store
The backend looks in:
- **Current User** → **Personal** store (for development)
- **Local Machine** → **Personal** store (for production)

Make sure you install to one of these locations.

### Certificate Password
If Scott sent a `.pfx` file, you might need a password. Check:
- Scott's email for the password
- Or ask Scott if a password is needed

## Next Steps

After installing the certificate:
1. Verify it's installed (use PowerShell command above)
2. Try running the backend: `cd Aegis.DfsCalculator/DFSCalculator.Server && dotnet run`
3. If you get certificate errors, double-check the installation

## Questions to Ask Scott (if needed)

- What format is the certificate file? (.pfx, .cer, .crt, .p7b)
- Is there a password for the .pfx file?
- Does the certificate thumbprint match: `b7342976a19fe031c0c9205237307fc2c9faa5ad`?
- Should it be installed to Current User or Local Machine?
