import { useEffect, useState, useRef } from "react";

const useICD10Lookup = () => {
  const [lookup, setLookup] = useState({});
  const hasLoaded = useRef(false);

  useEffect(() => {
    // Only fetch once
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      const url = "/icd10_lookup_2025.json";
      // Fetching ICD data - logging removed for HIPAA compliance

      fetch(url)
        .then((res) => {
          // Fetch response received - logging removed for HIPAA compliance
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((data) => {
          // ICD descriptions loaded - logging removed for HIPAA compliance
          setLookup(data);
        })
        .catch((err) => {
          // Failed to load ICD-10 descriptions - error logging removed for HIPAA compliance
        });
    }
  }, []);

  return lookup;
};

export { useICD10Lookup };
