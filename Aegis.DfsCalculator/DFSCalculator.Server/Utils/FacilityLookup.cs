using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace Aegis.DfsCalculator.Server.Utils
{
    public class FacilityLookup
    {
        private const string CMS_DATASET_CODE = "4pq5-n9py";

        private static async Task<string> GetCurrentCMSURL()
        {
            string apiUrl = $"https://data.cms.gov/provider-data/api/1/metastore/schemas/dataset/items/{CMS_DATASET_CODE}";
            HttpClient client = new HttpClient();

            using HttpResponseMessage response = await client.GetAsync(apiUrl);
            if (!response.IsSuccessStatusCode)
            {
                throw new Exception($"Failed to fetch CMS API: ${response.StatusCode} ${response.Content}");
            }

            CMSResponse responseData = JsonConvert.DeserializeObject<CMSResponse>(response.Content.ToString());
            if (responseData.Distribution.Count > 0)
            {
                return responseData.Distribution[0]["downloadURL"];
            }
            else
            {
                throw new Exception("No distribution URL found in CMS API response");
            }
        }

        public static async Task<Facility> FindFacilityInCSV(string targetCcn)
        {
            HttpClient client = new HttpClient();

            string csvUrl = await GetCurrentCMSURL();
            using HttpResponseMessage response = await client.GetAsync(csvUrl);
            if (!response.IsSuccessStatusCode)
            {
                throw new Exception($"Failed to fetch CMS API: ${response.StatusCode} ${response.Content}");
            }

            string csvText = response.Content.ToString();
            List<string> csv = csvText.Split("\n").ToList();
            csv.Remove(csv[0]);

            List<Facility> facilities = csv.Select(l => GetFacilityFromLine(l)).ToList();

            return facilities.FirstOrDefault(f => f.CCN == targetCcn);
        }

        private static Facility GetFacilityFromLine(string line)
        {
            List<string> csvData = Regex.Split(line, ",(?! )").ToList();
            csvData = csvData.Select(x =>
            {
                if (x[0] == '"')
                {
                    return x.Substring(1, x.Length - 2);
                }
                return x;
            }).ToList();

            return new Facility
            {
                CCN = csvData[0],
                FacilityName = csvData[1],
                Address = csvData[2],
                City = csvData[3],
                State = csvData[4],
                Zip = csvData[5],
            };
        }
    }

    public class CMSResponse
    {
        public List<Dictionary<string, string>> Distribution { get; set; }
    }

    public class Facility
    {
        public string CCN { get; set; }
        public string FacilityName { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? State { get; set; }
        public string? Zip { get; set; }
    }
}