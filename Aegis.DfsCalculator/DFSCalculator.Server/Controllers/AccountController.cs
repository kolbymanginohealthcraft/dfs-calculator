using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using Sustainsys.Saml2.AspNetCore2;
using System.Security.Claims;

namespace Aegis.DfsCalculator.Server.Controllers
{
    [ApiController]
    [Route("account")]
    public class AccountController : Controller
    {
        [HttpGet("login")]
        public IActionResult Login(string? returnUrl = "/")
        {
            // Kick off SAML challenge; Sustainsys will redirect to IdP.
            return Challenge(new AuthenticationProperties { RedirectUri = returnUrl }, Saml2Defaults.Scheme);
        }

        [HttpGet("logout")]
        public IActionResult Logout(string? returnUrl = "/")
        {
            // Sign out local cookie and ask IdP to sign out too.
            return SignOut(
                new AuthenticationProperties { RedirectUri = returnUrl },
                CookieAuthenticationDefaults.AuthenticationScheme,
                Saml2Defaults.Scheme);
        }

        [HttpGet("me")]
        public IActionResult Me()
        {
            if (User?.Identity?.IsAuthenticated != true) return Unauthorized();
            return Ok(new
            {
                Name = User.Identity!.Name,
                Claims = User.Claims.Select(c => new { c.Type, c.Value })
            });
        }
    }
}
