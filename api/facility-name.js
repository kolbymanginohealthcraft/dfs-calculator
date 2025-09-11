// api/facility-name.js
export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { ccn } = req.query;
    
    if (!ccn) {
      return res.status(400).json({ error: 'CCN parameter is required' });
    }

    // CMS Provider Information dataset code
    const CMS_DATASET_CODE = "4pq5-n9py";
    
    // Function to dynamically get the current CMS CSV URL
    async function getCurrentCMSUrl() {
      try {
        const apiUrl = `https://data.cms.gov/provider-data/api/1/metastore/schemas/dataset/items/${CMS_DATASET_CODE}`;
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch CMS API: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Extract the download URL from the distribution array
        if (data.distribution && data.distribution.length > 0) {
          const downloadUrl = data.distribution[0].downloadURL;
          console.log(`✅ Retrieved current CMS URL: ${downloadUrl}`);
          return downloadUrl;
        } else {
          throw new Error("No distribution URL found in CMS API response");
        }
      } catch (error) {
        console.error("❌ Error fetching CMS URL:", error);
        throw error;
      }
    }

    // Function to parse CSV data and find facility
    async function findFacilityInCSV(csvUrl, targetCcn) {
      try {
        const response = await fetch(csvUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
        }
        
        const csvText = await response.text();
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        
        // Find the CCN column index
        const ccnIndex = headers.findIndex(h => h.includes('CMS Certification Number') || h.includes('CCN'));
        const nameIndex = headers.findIndex(h => h.includes('Provider Name'));
        const addressIndex = headers.findIndex(h => h.includes('Provider Address'));
        const cityIndex = headers.findIndex(h => h.includes('City/Town'));
        const stateIndex = headers.findIndex(h => h.includes('State'));
        const zipIndex = headers.findIndex(h => h.includes('ZIP Code'));
        
        if (ccnIndex === -1) {
          throw new Error('CCN column not found in CSV');
        }
        
        // Search through the CSV data
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
          if (values[ccnIndex] === targetCcn) {
            return {
              facility_name: values[nameIndex] || "Unknown Facility",
              address: values[addressIndex] || "",
              city: values[cityIndex] || "",
              state: values[stateIndex] || "",
              zip: values[zipIndex] || ""
            };
          }
        }
        
        return { facility_name: "Unknown Facility" };
      } catch (error) {
        console.error("Error parsing CSV:", error);
        throw error;
      }
    }

    // Get the current CMS URL dynamically
    const currentCMSUrl = await getCurrentCMSUrl();
    
    // Find the facility in the CSV
    const facilityData = await findFacilityInCSV(currentCMSUrl, ccn);
    
    // Cache at the CDN for a day (adjust as needed)
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=86400');
    
    return res.status(200).json(facilityData);
    
  } catch (err) {
    console.error("Facility lookup error:", err);
    return res.status(500).json({ 
      error: 'Facility lookup failed', 
      detail: err?.message || String(err) 
    });
  }
}
