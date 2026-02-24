using Aegis.DfsCalculator.Server.Utils;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Aegis.DfsCalculator.Server.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/imputation")]
    public class ImputationController : ControllerBase
    {
        [HttpPost]
        public IActionResult HandleImputation(ImputationBody body)
        {
            if (!(body.ICDList.Count > 0 && body.ICDList.Count <= 100)) return BadRequest();

            if (!String.IsNullOrEmpty(body.GGItemId))
            {
                try
                {
                    double imputedValue = ServerImputations.CalculateImputedValue(body.GGItemId, body.ParsedValues, body.Summary.Age, body.ICDList, body.StartScores);
                    return Ok(new { imputedValue = imputedValue });
                }
                catch(KeyNotFoundException ex)
                {
                    return BadRequest(new { error = ex.Message });
                }
                catch (Exception ex)
                {
                    return StatusCode(500, new { error = "Internal server error", message = ex.Message });
                }
            }
            else
            {
                if (body.TargetGGItems != null && body.TargetGGItems.Count > 0)
                {
                    try
                    {
                        Dictionary<string, double> imputedValues = ServerImputations.ImputeMissingGGItems(body.ParsedValues, body.Summary.Age, body.ICDList, body.StartScores, body.TargetGGItems);
                        return Ok(new { imputedValues = imputedValues });
                    }
                    catch (KeyNotFoundException ex)
                    {
                        return BadRequest(new { error = ex.Message });
                    }
                    catch (Exception ex)
                    {
                        return StatusCode(500, new { error = "Internal server error", message = ex.Message });
                    }
                }
                return BadRequest(new { error = "Either \"GGItemId\" (single) or \"TargetGGItems\" (batch) must be provided" });
            }
        }
    }

    public class ImputationBody
    {
        public string? GGItemId { get; set; }
        public Dictionary<string, string> ParsedValues { get; set; }
        public PatientSummary Summary { get; set; }
        public List<string> ICDList { get; set; }
        public Dictionary<string, string> StartScores { get; set; }
        public Dictionary<string, string> TargetGGItems { get; set; }
    }
}
