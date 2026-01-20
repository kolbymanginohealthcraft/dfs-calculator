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
        [HttpGet("{ccn}")]
        public async Task<IActionResult> GetFacility(string ccn)
        {
            if (User?.Identity?.IsAuthenticated != true) return Unauthorized();
            
            if (string.IsNullOrEmpty(ccn))
            {
                return BadRequest(new { error = "CCN parameter is required" });
            }

            try
            {
                Facility? facility = await FacilityLookup.FindFacilityInCSV(ccn);
                if (facility == null)
                {
                    return Ok(new { facility_name = "Unknown Facility" });
                }
                // Map to frontend-expected format
                return Ok(new
                {
                    facility_name = facility.FacilityName,
                    address = facility.Address,
                    city = facility.City,
                    state = facility.State,
                    zip = facility.Zip
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Internal server error", message = ex.Message });
            }
        }
    }
}
