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
                string errorContent = await response.Content.ReadAsStringAsync();
                throw new Exception($"Failed to fetch CMS API: {response.StatusCode} {errorContent}");
            }

            string responseContent = await response.Content.ReadAsStringAsync();
            CMSResponse? responseData = JsonConvert.DeserializeObject<CMSResponse>(responseContent);
            if (responseData?.Distribution != null && responseData.Distribution.Count > 0)
            {
                return responseData.Distribution[0]["downloadURL"];
            }
            else
            {
                throw new Exception("No distribution URL found in CMS API response");
            }
        }

        public static async Task<Facility?> FindFacilityInCSV(string targetCcn)
        {
            HttpClient client = new HttpClient();

            string csvUrl = await GetCurrentCMSURL();
            using HttpResponseMessage response = await client.GetAsync(csvUrl);
            if (!response.IsSuccessStatusCode)
            {
                string errorContent = await response.Content.ReadAsStringAsync();
                throw new Exception($"Failed to fetch CMS CSV: {response.StatusCode} {errorContent}");
            }

            string csvText = await response.Content.ReadAsStringAsync();
            List<string> csv = csvText.Split("\n").ToList();
            if (csv.Count > 0)
            {
                csv.RemoveAt(0); // Remove header row
            }

            List<Facility> facilities = csv
                .Where(l => !string.IsNullOrWhiteSpace(l))
                .Select(l => GetFacilityFromLine(l))
                .Where(f => f != null)
                .ToList();

            return facilities.FirstOrDefault(f => f.CCN == targetCcn);
        }

        private static Facility? GetFacilityFromLine(string line)
        {
            if (string.IsNullOrWhiteSpace(line)) return null;

            List<string> csvData = Regex.Split(line, ",(?! )").ToList();
            csvData = csvData.Select(x =>
            {
                if (string.IsNullOrEmpty(x)) return x;
                if (x.Length > 0 && x[0] == '"' && x.Length > 1)
                {
                    return x.Substring(1, x.Length - 2);
                }
                return x;
            }).ToList();

            if (csvData.Count < 6) return null;

            return new Facility
            {
                CCN = csvData[0] ?? "",
                FacilityName = csvData[1] ?? "",
                Address = csvData.Count > 2 ? csvData[2] : null,
                City = csvData.Count > 3 ? csvData[3] : null,
                State = csvData.Count > 4 ? csvData[4] : null,
                Zip = csvData.Count > 5 ? csvData[5] : null,
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