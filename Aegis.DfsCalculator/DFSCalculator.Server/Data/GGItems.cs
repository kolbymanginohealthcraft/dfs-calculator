using Newtonsoft.Json;

namespace Aegis.DfsCalculator.Server.Data
{
    public class GGItems
    {
        private static List<GGItem>? _ggItems;
        private static readonly object _lock = new object();

        public static List<GGItem> GG_ITEMS
        {
            get
            {
                if (_ggItems == null)
                {
                    lock (_lock)
                    {
                        if (_ggItems == null)
                        {
                            _ggItems = LoadFromJson();
                        }
                    }
                }
                return _ggItems;
            }
        }

        private static List<GGItem> LoadFromJson()
        {
            using (StreamReader r = new StreamReader("./Data/ggItems.json"))
            {
                string json = r.ReadToEnd();
                return JsonConvert.DeserializeObject<List<GGItem>>(json)
                    ?? new List<GGItem>();
            }
        }
    }

    public class GGItem
    {
        public string Id { get; set; }
        public string Label { get; set; }
        public string Domain { get; set; }
    }
}
