import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import csvParser from "csv-parser";
import https from "https";

const app = express();
const PORT = 3001;

app.use(cors());

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

app.get("/api/facility-name/:ccn", async (req, res) => {
  const { ccn } = req.params;
  const results = [];

  try {
    // Get the current CMS URL dynamically
    const currentCMSUrl = await getCurrentCMSUrl();
    
    https
      .get(currentCMSUrl, (csvRes) => {
        csvRes
          .pipe(csvParser())
          .on("data", (row) => {
            if (row["CMS Certification Number (CCN)"] === ccn) {
              results.push({
                facility_name: row["Provider Name"],
                address: row["Provider Address"],
                city: row["City/Town"],
                state: row["State"],
                zip: row["ZIP Code"],
              });
            }
          })
          .on("end", () => {
            if (results.length > 0) {
              res.json(results[0]);
            } else {
              res.json({ facility_name: "Unknown Facility" });
            }
          });
      })
      .on("error", (err) => {
        console.error("Error fetching CMS CSV:", err);
        res.status(500).json({ error: "Failed to fetch CMS data" });
      });
  } catch (err) {
    console.error("Internal error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Express server running on http://localhost:${PORT}`);
});
