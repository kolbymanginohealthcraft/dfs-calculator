using Azure.Identity;
using Azure.Security.KeyVault.Secrets;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Sustainsys.Saml2;
using Sustainsys.Saml2.AspNetCore2;
using Sustainsys.Saml2.Metadata;
using System.Security.Cryptography.X509Certificates;

//To check if cert is setup: dotnet dev-certs https --check
//To create cert if missing: dotnet dev-certs https --trust
//To export cert for React (cd into Aegis.DfsCalculator.Client folder): dotnet dev-certs https --export-path ./certs/localhost-devcert.pfx --password localdev
//Then convert to PEM:
//     openssl pkcs12 -in ./certs/localhost-devcert.pfx -clcerts -nokeys -out ./certs/localhost.crt -password pass:localdev
//     openssl pkcs12 -in ./certs/localhost-devcert.pfx -nocerts -out ./certs/localhost.key -password pass:localdev -nodes


var builder = WebApplication.CreateBuilder(args);

// ---------- Data Protection (so cookies survive restarts / multi-server) ----------
if (builder.Environment.IsDevelopment())
{
    // --- Local mode ---
    var localKeys = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
        "AegisDfsCalculator", "keys");

    builder.Services.AddDataProtection()
        .PersistKeysToFileSystem(new DirectoryInfo(localKeys))
        .SetApplicationName("AegisDfsCalculator");
}
else
{
    builder.Services.AddDataProtection()
        .ProtectKeysWithAzureKeyVault(
            new Uri($"{builder.Configuration["KeyVault:Url"]}keys/dataprotection"),
#if DEBUG
            new VisualStudioCredential()
#else
            new DefaultAzureCredential()
#endif
        )
        .SetApplicationName("AegisDfsCalculator");
}

builder.Services.AddControllers();

// --- Add authentication services ---
builder.Services.AddAuthentication(
    options =>
    {
        options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = "ApiOrSaml";
    })
    .AddCookie(options =>
    {
        options.LoginPath = "/account/login";
        options.LogoutPath = "/account/logout";
        options.AccessDeniedPath = "/account/denied";
        options.ExpireTimeSpan = TimeSpan.FromHours(1);
        options.SlidingExpiration = true;
        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.Cookie.SameSite = SameSiteMode.Strict;

        // Return 401/403 for API calls instead of redirecting
        options.Events.OnRedirectToLogin = ctx =>
        {
            if (ctx.Request.Path.StartsWithSegments("/api"))
            {
                ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return Task.CompletedTask;
            }
            ctx.Response.Redirect(ctx.RedirectUri);
            return Task.CompletedTask;
        };

        options.Events.OnRedirectToAccessDenied = ctx =>
        {
            if (ctx.Request.Path.StartsWithSegments("/api"))
            {
                ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
                return Task.CompletedTask;
            }
            ctx.Response.Redirect(ctx.RedirectUri);
            return Task.CompletedTask;
        };
    }).AddSaml2(options =>
    {
        // ---- SP (your application) entity id ----
        options.SPOptions.EntityId = new EntityId("https://dfs.mycare.com/Saml2");

#if DEBUG
        options.SPOptions.PublicOrigin = new Uri("https://localhost:5173");
#endif

        // ---- Load your SP signing/encryption certificate from Azure Key Vault ----
        var keyVaultUrl = builder.Configuration["KeyVault:Url"];
        var certSecretName = builder.Configuration["KeyVault:SamlCert"];

        if (!string.IsNullOrEmpty(keyVaultUrl) && !string.IsNullOrEmpty(certSecretName))
        {
            var secretClient = new SecretClient(new Uri(keyVaultUrl),
#if DEBUG
                new VisualStudioCredential()
#else
                new DefaultAzureCredential()
#endif
            );
            var secret = secretClient.GetSecret(certSecretName);
            // Most KV PFX secrets are base64; no password if you uploaded a plain PFX.
            var pfxBytes = Convert.FromBase64String(secret.Value.Value);

            var spCert = new X509Certificate2(
                pfxBytes,
                (string?)null,
                X509KeyStorageFlags.MachineKeySet | X509KeyStorageFlags.Exportable | X509KeyStorageFlags.EphemeralKeySet);

            options.SPOptions.ServiceCertificates.Add(spCert);
        }

        // ---- Identity Provider configuration ----
        // Locate the IdP signing cert by thumbprint or subject
        var idpCertThumbprint = builder.Configuration["Saml:IdpCertThumbprint"];
        X509Certificate2? idpCert = null;

        using (var store = new X509Store(StoreName.My,
#if DEBUG
            StoreLocation.CurrentUser
#else
            StoreLocation.LocalMachine
#endif
        ))
        {
            store.Open(OpenFlags.ReadOnly);
            idpCert = store.Certificates
                .Find(X509FindType.FindByThumbprint, idpCertThumbprint ?? throw new Exception("Missing Saml:IdpCertThumbprint"), validOnly: false)
                .OfType<X509Certificate2>()
                .FirstOrDefault();
            store.Close();
        }

        if (idpCert == null)
            throw new Exception($"IdP certificate with thumbprint {idpCertThumbprint} not found in LocalMachine\\My");


        var idp = new IdentityProvider(new EntityId(builder.Configuration["Saml:IdpEntityId"]), options.SPOptions)
        {
            SingleSignOnServiceUrl = new Uri(builder.Configuration["Saml:IdpSingleSignOnUrl"] ?? throw new Exception("Missing Saml:IdpSingleSignOnUrl")),
            Binding = Sustainsys.Saml2.WebSso.Saml2BindingType.HttpRedirect
        };

        idp.SigningKeys.AddConfiguredKey(idpCert);
        idp.WantAuthnRequestsSigned = true;
        idp.LoadMetadata = false;

        options.IdentityProviders.Add(idp);
    })
    .AddPolicyScheme("ApiOrSaml", "API or SAML", opts =>
    {
        opts.ForwardDefaultSelector = context =>
        {
            // For API requests: use Cookie (so a challenge => 401)
            if (context.Request.Path.StartsWithSegments("/api"))
                return CookieAuthenticationDefaults.AuthenticationScheme;

            // For everything else: use SAML (so a challenge => redirect to IdP)
            return Saml2Defaults.Scheme;
        };
    });
builder.Services.AddAuthorization();

var app = builder.Build();

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapFallbackToFile("/index.html");

app.Run();
