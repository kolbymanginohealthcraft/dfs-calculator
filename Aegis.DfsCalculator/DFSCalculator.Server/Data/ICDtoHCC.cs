using Newtonsoft.Json;

namespace Aegis.DfsCalculator.Server.Data
{
    public class ICDtoHCC
    {
        private static Dictionary<string, int>? _icdToHcc;
        private static readonly object _lock = new object();

        public static Dictionary<string, int> ICD_TO_HCC
        {
            get
            {
                if (_icdToHcc == null)
                {
                    lock (_lock)
                    {
                        if (_icdToHcc == null)
                        {
                            _icdToHcc = LoadFromJson();
                        }
                    }
                }
                return _icdToHcc;
            }
        }

        private static Dictionary<string, int> LoadFromJson()
        {
            using (StreamReader r = new StreamReader("./Data/icdToHcc.json"))
            {
                string json = r.ReadToEnd();
                return JsonConvert.DeserializeObject<Dictionary<string, int>>(json)
                    ?? new Dictionary<string, int>();
            }
        }

        public static List<int> GetHCCValuesForICD(string icdCode)
        {
            int value;
            if (ICD_TO_HCC.TryGetValue(icdCode, out value))
            {
                return [value];
            }

            return [];
        }

        public static string FormatHCCDisplay(List<int> hccValues)
        {
            if (hccValues.Count == 0)
            {
                return "";
            }
            else if (hccValues.Count == 1)
            {
                return $"HCC{hccValues[0]}";
            }
            else
            {
                hccValues.Sort();
                string hccString = String.Join(", HCC", hccValues);
                return $"HCC{hccValues}";
            }
        }

        public static string GetHCCDisplayForICD(string icdCode)
        {
            return FormatHCCDisplay(GetHCCValuesForICD(icdCode));
        }
    }
}
