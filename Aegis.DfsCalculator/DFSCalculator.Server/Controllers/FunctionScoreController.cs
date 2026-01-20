using Aegis.DfsCalculator.Server.Utils;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Aegis.DfsCalculator.Server.Controllers
{
    [ApiController]
    [Route("api/function-score")]
    public class FunctionScoreController : Controller
    {
        [HttpPost]
        public IActionResult HandleFunctionScore(FunctionScoreCalculationBody body)
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
                Dictionary<string, double?> multipliers = CoefficientLoader.GetFunctionMultipliers(body.ARDDate);

                FunctionCovariatesReturn covariates;
                if (body.ManualOverrides == null)
                {
                    covariates = ServerCalculations.GetFunctionCovariates(body.ParsedValues, body.Summary.Age, body.ICDList, body.StartScores, body.ARDDate);
                }
                else
                {
                    covariates = ServerCalculations.GetFunctionCovariates(body.ParsedValues, body.Summary.Age, body.ICDList, body.StartScores, body.ARDDate, body.ManualOverrides);
                }

                // Return response matching frontend expectations: { covariates, weightedScore, multipliers }
                return Ok(new
                {
                    covariates = covariates.Covariates,
                    weightedScore = covariates.WeightedScore,
                    multipliers = multipliers
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "Internal server error", message = ex.Message });
            }
        }
    }

    public class FunctionScoreCalculationBody {
        public Dictionary<string, string> ParsedValues { get; set; }
        public PatientSummary Summary { get; set; }
        public List<string> ICDList { get; set; }
        public Dictionary<string, string> StartScores { get; set; }
        public string ARDDate { get; set; }
        public Dictionary<string, int>? ManualOverrides { get; set; }
    }

    public class PatientSummary {
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string DOB { get; set; }
        public string Facility { get; set; }
        public string AdmitDate { get; set; }
        public string DischargeDate { get; set; }
        public int Age { get; set; }
        public int? ArdGapDays { get; set; }
    }
}
