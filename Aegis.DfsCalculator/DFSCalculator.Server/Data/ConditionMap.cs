using Newtonsoft.Json;

namespace Aegis.DfsCalculator.Server.Data
{
    public class ConditionMap
    {
        private static Dictionary<string, string>? _conditionMap;
        private static readonly object _lock = new object();

        public static Dictionary<string, string> CONDITION_MAP
        {
            get
            {
                if (_conditionMap == null)
                {
                    lock (_lock)
                    {
                        if (_conditionMap == null)
                        {
                            _conditionMap = LoadFromJson();
                        }
                    }
                }
                return _conditionMap;
            }
        }

        private static Dictionary<string, string> LoadFromJson()
        {
            using (StreamReader r = new StreamReader("./Data/conditionMap.json"))
            {
                string json = r.ReadToEnd();
                return JsonConvert.DeserializeObject<Dictionary<string, string>>(json)
                    ?? new Dictionary<string, string>();
            }
        }
    }
}
