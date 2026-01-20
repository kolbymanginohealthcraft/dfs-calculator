using Aegis.DfsCalculator.Server.Utils;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Aegis.DfsCalculator.Server.Controllers
{
    [ApiController]
    [Route("api/imputation-analysis")]
    public class ImputationAnalysisController : Controller
    {
        [HttpPost]
        public IActionResult HandleImputationAnalysis(ImputationAnalysisBody body)
        {
            if (User?.Identity?.IsAuthenticated != true) return Unauthorized();
            
            if (body == null) return BadRequest(new { error = "Request body is required" });
            if (body.ParsedValues == null) return BadRequest(new { error = "parsedValues is required" });
            if (body.Summary == null) return BadRequest(new { error = "summary is required" });
            if (body.ICDList == null || body.ICDList.Count == 0 || body.ICDList.Count > 100) 
                return BadRequest(new { error = "icdList must contain between 1 and 100 items" });
            if (body.StartScores == null) return BadRequest(new { error = "startScores is required" });

            try
            {
                Dictionary<string, ImputationAnalysisData> imputationData = ServerImputations.GetImputationAnalysisData(
                    body.ParsedValues, 
                    body.Summary.Age, 
                    body.ICDList, 
                    body.StartScores
                );
                // Wrap in object to match frontend expectations: { imputationData: {...} }
                return Ok(new { imputationData = imputationData });
            }
            catch (Exception ex)
            {
                // Log the full exception for debugging
                System.Diagnostics.Debug.WriteLine($"ImputationAnalysis error: {ex}");
                return StatusCode(500, new { error = "Internal server error", message = ex.Message });
            }
        }
    }

    public class ImputationAnalysisBody
    {
        public Dictionary<string, string> ParsedValues { get; set; }
        public PatientSummary Summary { get; set; }
        public List<string> ICDList { get; set; }
        public Dictionary<string, string> StartScores { get; set; }
        public string ARDDate { get; set; }
        public Dictionary<string, string>? ManualOverrides { get; set; }
    }
}
