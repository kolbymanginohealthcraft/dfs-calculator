import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import csvParser from "csv-parser";
import https from "https";

const app = express();
const PORT = 3001;

app.use(cors());

const CMS_CSV_URL =
  "https://data.cms.gov/provider-data/sites/default/files/resources/c64002fc083c1b993f24ab2f737b5034_1749765912/NH_ProviderInfo_Jun2025.csv";

app.get("/api/facility-name/:ccn", async (req, res) => {
  const { ccn } = req.params;
  const results = [];

  try {
    https
      .get(CMS_CSV_URL, (csvRes) => {
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
