import { useEffect, useState } from "react";

const useICD10Lookup = () => {
  const [lookup, setLookup] = useState({});

  useEffect(() => {
    const url = "/icd10_lookup_2025.json";
    console.log("📦 Fetching ICD data from:", url);

    fetch(url)
      .then((res) => {
        console.log("🌐 Fetch response:", res);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("📚 Loaded ICD descriptions:", Object.keys(data).length);
        setLookup(data);
      })
      .catch((err) => {
        console.error("❌ Failed to load ICD-10 descriptions", err);
      });
  }, []);

  return lookup;
};

export { useICD10Lookup };
