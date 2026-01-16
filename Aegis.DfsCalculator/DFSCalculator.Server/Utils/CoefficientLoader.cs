using Newtonsoft.Json;

namespace Aegis.DfsCalculator.Server.Utils
{
    public class CoefficientLoader
    {
        public static CoefficientAllVersions LoadAllVersions()
        {
            using (StreamReader r = new StreamReader("./Data/coefficients-all-versions.json"))
            {
                string json = r.ReadToEnd();
                return JsonConvert.DeserializeObject<CoefficientAllVersions>(json);
            }
        }

        private static DateTime UnixToDateTime(string unix)
        {
            long unixSeconds = (long)Convert.ToDouble(unix);
            DateTime dateTime = new DateTime(1970, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc);
            dateTime = dateTime.AddSeconds(unixSeconds).ToLocalTime();
            return dateTime;
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

            foreach (CoefficientSchedule schedule in latest.Schedule)
            {
                if (date >= schedule.startDate && (date <= schedule.endDate || schedule.endDate == null))
                {
                    return schedule.UpdateId;
                }
            }

            // Default to latest if date is in the future or not found
            return latest.Schedule[latest.Schedule.Count - 1].UpdateId;
        }

        // Get function multipliers for a specific date
        public static Dictionary<string, double?> GetFunctionMultipliers(string date)
        {
            CoefficientAllVersions latest = LoadAllVersions();
            string updateId = GetUpdateIdForDate(UnixToDateTime(date));

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
        public DateTime startDate { get; set; }
        public DateTime? endDate { get; set; }
        public string FiscalYear { get; set; }
        public string Comments { get; set; }
    }
}
