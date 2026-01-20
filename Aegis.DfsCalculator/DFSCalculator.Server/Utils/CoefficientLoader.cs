using Newtonsoft.Json;
using System.Linq;

namespace Aegis.DfsCalculator.Server.Utils
{
    public class CoefficientLoader
    {
        public static CoefficientAllVersions LoadAllVersions()
        {
            using (StreamReader r = new StreamReader("./Data/coefficients-all-versions.json"))
            {
                string json = r.ReadToEnd();
                var settings = new JsonSerializerSettings
                {
                    DateFormatString = "MM/dd/yyyy", // Explicit format for schedule dates
                    Culture = System.Globalization.CultureInfo.InvariantCulture
                };
                return JsonConvert.DeserializeObject<CoefficientAllVersions>(json, settings);
            }
        }

        private static DateTime UnixToDateTime(string unix)
        {
            long unixSeconds = (long)Convert.ToDouble(unix);
            DateTime dateTime = new DateTime(1970, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc);
            dateTime = dateTime.AddSeconds(unixSeconds).ToLocalTime();
            return dateTime;
        }

        // Parse A2300 date string - handles both Unix timestamp and YYYYMMDD formats
        private static DateTime? ParseArdDate(string dateStr)
        {
            if (string.IsNullOrEmpty(dateStr))
            {
                return null;
            }

            // Try parsing as Unix timestamp first (if it's all digits and > 1000000000, it's likely Unix)
            if (long.TryParse(dateStr, out long unixSeconds) && unixSeconds > 1000000000)
            {
                // Likely a Unix timestamp (seconds since epoch)
                return UnixToDateTime(dateStr);
            }

            // Try parsing as YYYYMMDD format (MDS standard)
            if (dateStr.Length == 8 && dateStr.All(char.IsDigit))
            {
                string year = dateStr.Substring(0, 4);
                string month = dateStr.Substring(4, 2);
                string day = dateStr.Substring(6, 2);
                if (DateTime.TryParse($"{year}-{month}-{day}", out DateTime parsedDate))
                {
                    return parsedDate;
                }
            }

            // Try parsing as YYYY-MM-DD format
            if (dateStr.Contains("-") && DateTime.TryParse(dateStr, out DateTime parsedDate2))
            {
                return parsedDate2;
            }

            // Try standard DateTime.Parse as fallback
            if (DateTime.TryParse(dateStr, out DateTime parsedDate3))
            {
                return parsedDate3;
            }

            return null;
        }

        // Determine which Update ID to use based on an assessment date
        public static string GetUpdateIdForDate(DateTime? date)
        {
            CoefficientAllVersions latest = LoadAllVersions();

            if (date == null)
            {
                // No ARD date (A2300) provided, using latest coefficient version
                return latest.Schedule[latest.Schedule.Count - 1].UpdateId;
            }

            // Normalize date to date-only (remove time component) for comparison
            DateTime dateOnly = date.Value.Date;

            // Debug logging
            System.Diagnostics.Debug.WriteLine($"GetUpdateIdForDate: Checking date {dateOnly:yyyy-MM-dd}");

            foreach (CoefficientSchedule schedule in latest.Schedule)
            {
                DateTime scheduleStart = schedule.startDate.Date;
                DateTime? scheduleEnd = schedule.endDate?.Date;

                System.Diagnostics.Debug.WriteLine($"  Schedule {schedule.UpdateId}: {scheduleStart:yyyy-MM-dd} to {(scheduleEnd.HasValue ? scheduleEnd.Value.ToString("yyyy-MM-dd") : "null")}");

                if (dateOnly >= scheduleStart && (scheduleEnd == null || dateOnly <= scheduleEnd.Value))
                {
                    System.Diagnostics.Debug.WriteLine($"  Match found: Update ID {schedule.UpdateId}");
                    return schedule.UpdateId;
                }
            }

            // Default to latest if date is in the future or not found
            System.Diagnostics.Debug.WriteLine($"  No match found, defaulting to latest: Update ID {latest.Schedule[latest.Schedule.Count - 1].UpdateId}");
            return latest.Schedule[latest.Schedule.Count - 1].UpdateId;
        }

        // Get function multipliers for a specific date
        public static Dictionary<string, double?> GetFunctionMultipliers(string date)
        {
            CoefficientAllVersions latest = LoadAllVersions();
            DateTime? parsedDate = ParseArdDate(date);
            string updateId = GetUpdateIdForDate(parsedDate);

            return latest.FunctionMultipliers[updateId];
        }

        // Get imputation multipliers for a specific date
        public static Dictionary<string, Dictionary<string, double?>> GetImputationMultipliers(DateTime? date)
        {
            CoefficientAllVersions latest = LoadAllVersions();
            string updateId = GetUpdateIdForDate(date);

            return latest.ImputationMultipliers[updateId];
        }

        // Get imputation multipliers for a specific GG item and date
        public static Dictionary<string, double?> GetImputationMultipliersForItem(string ggItemId, DateTime? date)
        {
            return GetImputationMultipliers(date)[ggItemId];
        }

        // Get schedule information for a specific date
        public static CoefficientSchedule GetScheduleInfo(DateTime? date)
        {
            CoefficientAllVersions latest = LoadAllVersions();
            string updateId = GetUpdateIdForDate(date);

            return latest.Schedule.First(s => s.UpdateId == updateId);
        }

        // Get version information for a specific date (alias for getScheduleInfo)
        public static CoefficientSchedule GetVersionFromArdDate(DateTime? date)
        {
            return GetScheduleInfo(date);
        }

        // Get all available schedule entries
        public static List<CoefficientSchedule> GetAllSchedules()
        {
            CoefficientAllVersions latest = LoadAllVersions();
            return latest.Schedule;
        }

        // Get metadata about the coefficient data
        public static CoefficientMetadata GetMetadata()
        {
            CoefficientAllVersions latest = LoadAllVersions();
            return latest.Metadata;
        }
    }

    public class CoefficientAllVersions
    {
        public CoefficientMetadata Metadata { get; set; }
        public List<CoefficientSchedule> Schedule { get; set; }
        public Dictionary<string, Dictionary<string, double?>> FunctionMultipliers { get; set; }
        public Dictionary<string, Dictionary<string, Dictionary<string, double?>>> ImputationMultipliers { get; set; }
    }
    
    public class CoefficientMetadata
    {
        public DateTime Generated { get; set; }
        public string RiskAdjustmentSource { get; set; }
        public string ImputationSource { get; set; }
        public int UpdateCount { get; set; }
    }

    public class CoefficientSchedule
    {
        public string UpdateId { get; set; }
        public string ManualVersion { get; set; }
        public string ManualPostDate { get; set; }
        
        [Newtonsoft.Json.JsonProperty("startDate")]
        [Newtonsoft.Json.JsonConverter(typeof(ScheduleDateConverter))]
        public DateTime startDate { get; set; }
        
        [Newtonsoft.Json.JsonProperty("endDate")]
        [Newtonsoft.Json.JsonConverter(typeof(NullableScheduleDateConverter))]
        public DateTime? endDate { get; set; }
        
        public string FiscalYear { get; set; }
        public string Comments { get; set; }
    }

    // Custom converter to parse schedule dates correctly (MM/dd/yyyy format)
    public class ScheduleDateConverter : Newtonsoft.Json.JsonConverter<DateTime>
    {
        public override DateTime ReadJson(Newtonsoft.Json.JsonReader reader, Type objectType, DateTime existingValue, bool hasExistingValue, Newtonsoft.Json.JsonSerializer serializer)
        {
            if (reader.Value == null)
                return default(DateTime);

            string dateStr = reader.Value.ToString();
            
            // Try parsing as MM/dd/yyyy format first (US format used in JSON)
            if (DateTime.TryParseExact(dateStr, "MM/dd/yyyy", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out DateTime result))
            {
                return result;
            }

            // Fallback to standard parsing
            if (DateTime.TryParse(dateStr, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out DateTime result2))
            {
                return result2;
            }

            return default(DateTime);
        }

        public override void WriteJson(Newtonsoft.Json.JsonWriter writer, DateTime value, Newtonsoft.Json.JsonSerializer serializer)
        {
            writer.WriteValue(value.ToString("MM/dd/yyyy"));
        }
    }

    // Nullable version for endDate
    public class NullableScheduleDateConverter : Newtonsoft.Json.JsonConverter<DateTime?>
    {
        public override DateTime? ReadJson(Newtonsoft.Json.JsonReader reader, Type objectType, DateTime? existingValue, bool hasExistingValue, Newtonsoft.Json.JsonSerializer serializer)
        {
            if (reader.Value == null)
                return null;

            string dateStr = reader.Value.ToString();
            
            // Try parsing as MM/dd/yyyy format first (US format used in JSON)
            if (DateTime.TryParseExact(dateStr, "MM/dd/yyyy", System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out DateTime result))
            {
                return result;
            }

            // Fallback to standard parsing
            if (DateTime.TryParse(dateStr, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out DateTime result2))
            {
                return result2;
            }

            return null;
        }

        public override void WriteJson(Newtonsoft.Json.JsonWriter writer, DateTime? value, Newtonsoft.Json.JsonSerializer serializer)
        {
            if (value.HasValue)
                writer.WriteValue(value.Value.ToString("MM/dd/yyyy"));
            else
                writer.WriteNull();
        }
    }
}
