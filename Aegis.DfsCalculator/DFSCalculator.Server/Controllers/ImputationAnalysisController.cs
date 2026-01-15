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
            if (!(body.ICDList.Count > 0 && body.ICDList.Count <= 100)) return BadRequest();

            Dictionary<string, ImputationAnalysisData> imputationData = ServerImputations.GetImputationAnalysisData(body.ParsedValues, body.Summary.Age, body.ICDList, body.StartScores);
            return Ok(imputationData);
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
