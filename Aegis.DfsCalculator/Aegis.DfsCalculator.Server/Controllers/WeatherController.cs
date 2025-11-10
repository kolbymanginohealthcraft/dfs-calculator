using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Aegis.DfsCalculator.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")] // <-- Route to call this controller
    [Authorize] // <-- Require login
    public class WeatherController : Controller
    {
        private static readonly string[] Summaries =
        [
            "Freezing", "Bracing", "Chilly", "Cool", "Mild",
            "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
        ];

        [HttpGet]
        public IEnumerable<WeatherForecast> Get() // <-- Returns as JSON automatically
        {
            return Enumerable.Range(1, 5).Select(index =>
                new WeatherForecast
                {
                    Date = DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
                    TemperatureC = Random.Shared.Next(-20, 55),
                    Summary = Summaries[Random.Shared.Next(Summaries.Length)]
                })
                .ToArray();
        }

        [HttpGet]
        [Route("Test/{id}/Stuff")] // <-- Example URL: /api/weather/test/123/stuff?q1=hello
        public string Get(string id, [FromQuery] string q1) // q1 comes from the query string, id comes from the url defined in Route
        {
            return $"Hello from Test/{id}/Stuff with query {q1}";
        }
    }

    public class WeatherForecast
    {
        public DateOnly Date { get; set; }
        public int TemperatureC { get; set; }
        public string? Summary { get; set; }
        public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
    }
}
