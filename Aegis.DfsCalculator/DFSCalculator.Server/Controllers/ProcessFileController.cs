using Aegis.DfsCalculator.Server.Utils;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Aegis.DfsCalculator.Server.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/process-file")]
    public class ProcessFileController : ControllerBase
    {
        [HttpPost]
        public IActionResult HandleProcessFile(ProcessFileBody body)
        {
            if (body == null) return BadRequest(new { error = "Request body is required" });
            if (body.ParsedValues == null) return BadRequest(new { error = "parsedValues is required" });
            if (body.Summary == null) return BadRequest(new { error = "summary is required" });
            if (body.ICDList == null || body.ICDList.Count == 0 || body.ICDList.Count > 100)
                return BadRequest(new { error = "icdList must contain between 1 and 100 items" });
            if (body.StartScores == null) return BadRequest(new { error = "startScores is required" });

            try
            {
                Dictionary<string, double>? imputedValues = null;
                var startScores = new Dictionary<string, string>(body.StartScores);

                if (body.TargetGGItems != null && body.TargetGGItems.Count > 0)
                {
                    imputedValues = ServerImputations.ImputeMissingGGItems(
                        body.ParsedValues, body.Summary.Age, body.ICDList, body.StartScores, body.TargetGGItems, body.ManualOverrides);

                    foreach (var kvp in imputedValues)
                    {
                        string itemId = kvp.Key.EndsWith("1") ? kvp.Key[..^1] : kvp.Key;
                        startScores[itemId] = kvp.Value.ToString();
                    }
                }

                Dictionary<string, double?> multipliers = CoefficientLoader.GetFunctionMultipliers(body.ARDDate);

                FunctionCovariatesReturn covariates = ServerCalculations.GetFunctionCovariates(
                    body.ParsedValues, body.Summary.Age, body.ICDList, startScores, body.ARDDate, body.ManualOverrides);

                return Ok(new
                {
                    imputedValues = imputedValues ?? new Dictionary<string, double>(),
                    covariates = covariates.Covariates,
                    weightedScore = covariates.WeightedScore,
                    multipliers = multipliers
                });
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
    }

    public class ProcessFileBody
    {
        public Dictionary<string, string> ParsedValues { get; set; }
        public PatientSummary Summary { get; set; }
        public List<string> ICDList { get; set; }
        public Dictionary<string, string> StartScores { get; set; }
        public string ARDDate { get; set; }
        public Dictionary<string, string>? TargetGGItems { get; set; }
        public Dictionary<string, double>? ManualOverrides { get; set; }
    }
}
