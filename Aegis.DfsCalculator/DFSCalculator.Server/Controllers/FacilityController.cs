using Aegis.DfsCalculator.Server.Utils;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Aegis.DfsCalculator.Server.Controllers
{
    [ApiController]
    [Route("api/facility-name")]
    public class FacilityController : Controller
    {
        [HttpGet]
        public async Task<IActionResult> GetFacility(string targetCcn)
        {
            if (User?.Identity?.IsAuthenticated != true) return Unauthorized();
            Facility facility = await FacilityLookup.FindFacilityInCSV(targetCcn);
            return Ok(facility);
        }
    }
}
