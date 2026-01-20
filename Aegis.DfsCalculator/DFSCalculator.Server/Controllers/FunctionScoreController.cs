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
            if (!(body.ICDList.Count > 0 && body.ICDList.Count <= 100)) return BadRequest();

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

            return Ok(covariates);
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
