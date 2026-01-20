# Verify Certificate Installation

## Step 1: Find the Certificate File

Run this in PowerShell to find `.cer` files in your Downloads folder:

```powershell
Get-ChildItem -Path "$env:USERPROFILE\Downloads" -Filter "*.cer" | Select-Object Name, LastWriteTime, FullName
```

This will show you:
- The certificate file name
- When it was downloaded
- Full path to the file

## Step 2: Check the Certificate File's Thumbprint

Once you have the file path, check its actual thumbprint:

```powershell
# Replace "YourCertificate.cer" with the actual filename
$certPath = "$env:USERPROFILE\Downloads\YourCertificate.cer"
$cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certPath)
Write-Host "Certificate Subject: $($cert.Subject)"
Write-Host "Certificate Thumbprint: $($cert.Thumbprint)"
Write-Host "Expected Thumbprint: b7342976a19fe031c0c9205237307fc2c9faa5ad"
Write-Host "Match: $($cert.Thumbprint -eq 'b7342976a19fe031c0c9205237307fc2c9faa5ad')"
```

This will tell you:
- What the certificate's actual thumbprint is
- Whether it matches what the backend expects

## Step 3: Check if Certificate is Installed

Check if the certificate (with the expected thumbprint) is in your certificate store:

```powershell
# Check Current User → Personal store
$found = Get-ChildItem -Path Cert:\CurrentUser\My | Where-Object { $_.Thumbprint -eq "b7342976a19fe031c0c9205237307fc2c9faa5ad" }
if ($found) {
    Write-Host "✅ Certificate FOUND in Current User → Personal store"
    $found | Select-Object Subject, Thumbprint, NotAfter
} else {
    Write-Host "❌ Certificate NOT FOUND in Current User → Personal store"
}
```

## Step 4: Check All Certificate Stores

If not found in Personal, check other stores:

```powershell
# Check all Current User stores
Write-Host "Checking Current User stores..."
Get-ChildItem -Path Cert:\CurrentUser -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { $_.Thumbprint -eq "b7342976a19fe031c0c9205237307fc2c9faa5ad" } | 
    Select-Object PSPath, Subject, Thumbprint

# Check Local Machine stores (requires admin)
Write-Host "`nChecking Local Machine stores (if accessible)..."
Get-ChildItem -Path Cert:\LocalMachine -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { $_.Thumbprint -eq "b7342976a19fe031c0c9205237307fc2c9faa5ad" } | 
    Select-Object PSPath, Subject, Thumbprint
```

## Step 5: View Certificate Details (GUI Method)

You can also view certificate details using Windows Certificate Manager:

1. Press `Win + R`
2. Type `certmgr.msc` and press Enter
3. Navigate to: **Personal** → **Certificates**
4. Look for certificates that might be related to SAML or myCare
5. Double-click a certificate to see its details
6. Go to the **Details** tab
7. Scroll down and select **Thumbprint**
8. Compare it to: `b7342976a19fe031c0c9205237307fc2c9faa5ad`

## Quick Verification Script

Run this all-in-one script to check everything:

```powershell
# Find certificate file
Write-Host "=== Step 1: Finding certificate file ===" -ForegroundColor Cyan
$certFiles = Get-ChildItem -Path "$env:USERPROFILE\Downloads" -Filter "*.cer" | Sort-Object LastWriteTime -Descending
if ($certFiles) {
    Write-Host "Found certificate file(s):" -ForegroundColor Green
    $certFiles | ForEach-Object { Write-Host "  - $($_.Name) (Downloaded: $($_.LastWriteTime))" }
    
    # Check the most recent one
    $latestCert = $certFiles[0]
    Write-Host "`nChecking thumbprint of: $($latestCert.Name)" -ForegroundColor Cyan
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($latestCert.FullName)
    Write-Host "  Subject: $($cert.Subject)"
    Write-Host "  Thumbprint: $($cert.Thumbprint)"
    Write-Host "  Expected:   b7342976a19fe031c0c9205237307fc2c9faa5ad"
    if ($cert.Thumbprint -eq "b7342976a19fe031c0c9205237307fc2c9faa5ad") {
        Write-Host "  ✅ Thumbprint MATCHES!" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Thumbprint does NOT match" -ForegroundColor Red
    }
} else {
    Write-Host "No .cer files found in Downloads" -ForegroundColor Yellow
}

# Check if installed
Write-Host "`n=== Step 2: Checking if certificate is installed ===" -ForegroundColor Cyan
$installed = Get-ChildItem -Path Cert:\CurrentUser\My | Where-Object { $_.Thumbprint -eq "b7342976a19fe031c0c9205237307fc2c9faa5ad" }
if ($installed) {
    Write-Host "✅ Certificate IS installed in Current User → Personal store" -ForegroundColor Green
    $installed | Select-Object Subject, Thumbprint, NotAfter | Format-List
} else {
    Write-Host "❌ Certificate is NOT installed in Current User → Personal store" -ForegroundColor Red
    Write-Host "You may need to reinstall it to the Personal store." -ForegroundColor Yellow
}
```

## What to Do Based on Results

### If thumbprint matches but not installed:
- Reinstall the certificate to **Current User → Personal** store

### If thumbprint doesn't match:
- The certificate file might be wrong
- Or `appsettings.json` has the wrong thumbprint
- Contact Scott to verify which certificate/thumbprint is correct

### If certificate is installed:
- You're good to go! Try running the backend
