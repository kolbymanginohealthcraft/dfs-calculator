# Setting Up Local C# Backend

## Prerequisites Check

You currently have: **.NET SDK 2.1.700**  
Project requires: **.NET 8.0**

## Step 1: Install .NET 8.0 SDK

1. **Download .NET 8.0 SDK:**
   - Go to: https://dotnet.microsoft.com/download/dotnet/8.0
   - Download the SDK (not just the runtime)
   - Install it

2. **Verify installation:**
   ```bash
   dotnet --version
   ```
   Should show version 8.x.x (e.g., 8.0.100)

## Step 2: Trust Development Certificate

For HTTPS to work locally:

```bash
dotnet dev-certs https --trust
```

This will prompt you to install a certificate - click "Yes".

## Step 3: Update Environment File

Update your `.env.development`:

```env
VITE_API_BASE_URL=https://localhost:7194
VITE_AUTH_BASE_URL=https://localhost:7194
```

## Step 4: Remove/Update Vite Proxy

Since you'll be running the backend locally, you have two options:

### Option A: Keep Proxy (Recommended)
Keep the Vite proxy but point it to localhost instead of staging:

Update `vite.config.js`:
```javascript
"/api": {
  target: "https://localhost:7194",  // Changed from staging
  changeOrigin: true,
  secure: true,
  ws: false,
},
"/account": {
  target: "https://localhost:7194",  // Changed from staging
  changeOrigin: true,
  secure: true,
  ws: false,
}
```

### Option B: Remove Proxy
Remove the proxy and let the frontend connect directly to localhost:7194.

## Step 5: Run the Backend

```bash
cd Aegis.DfsCalculator/DFSCalculator.Server
dotnet run
```

The backend should start on:
- HTTPS: `https://localhost:7194`
- HTTP: `http://localhost:5189`

## Step 6: Run the Frontend

In a **separate terminal**:

```bash
npm run dev
```

## Important Notes

### SAML Configuration
The backend is configured for SAML authentication. For local development, you might need to:
- Configure SAML certificates (see `appsettings.json`)
- Or ask IT/Hannah if there's a development bypass

### Backend Configuration
The `appsettings.json` references:
- Azure Key Vault (for production)
- SAML IdP (Identity Provider)
- Certificates

For local development, you may need:
- Development appsettings file
- Or configuration overrides
- Or ask IT/Hannah for local dev setup instructions

## Troubleshooting

### "No .NET 8.0 SDK found"
- Make sure you installed .NET 8.0 SDK (not just runtime)
- Restart your terminal after installation
- Run `dotnet --list-sdks` to see installed versions

### Certificate Errors
- Run: `dotnet dev-certs https --trust`
- Or use HTTP instead: `http://localhost:5189`

### Port Already in Use
- Check if something is using port 7194 or 5189
- Change ports in `launchSettings.json` if needed

### SAML/Authentication Issues
- The backend requires SAML configuration
- You may need to ask IT/Hannah for:
  - Development SAML settings
  - Or a way to bypass auth for local dev

## Next Steps

1. Install .NET 8.0 SDK
2. Trust the certificate
3. Update `.env.development` to localhost
4. Try running the backend
5. If you hit SAML/auth issues, contact IT/Hannah for local dev setup
