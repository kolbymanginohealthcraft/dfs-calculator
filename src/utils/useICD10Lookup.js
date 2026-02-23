import { useEffect, useState, useRef, useCallback } from "react";

// Shared cache across all hook instances to avoid duplicate fetches
let globalLookupCache = null;
let globalLoadPromise = null;

const useICD10Lookup = () => {
  const [lookup, setLookup] = useState(globalLookupCache || {});
  const [loading, setLoading] = useState(false);
  const hasRequested = useRef(false);

  const loadLookup = useCallback(async () => {
    // If already cached, return immediately
    if (globalLookupCache) {
      return globalLookupCache;
    }

    // If a load is already in progress, wait for it
    if (globalLoadPromise) {
      return globalLoadPromise;
    }

    // Start loading
    setLoading(true);
    const url = "/icd10_lookup_2026.json";
    
    globalLoadPromise = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        globalLookupCache = data;
        setLookup(data);
        setLoading(false);
        globalLoadPromise = null;
        return data;
      })
      .catch((err) => {
        setLoading(false);
        globalLoadPromise = null;
        throw err;
      });

    return globalLoadPromise;
  }, []);

  useEffect(() => {
    // Only auto-load if lookup is empty and hasn't been requested yet
    // This allows components to manually trigger loading when needed
    if (!hasRequested.current && !globalLookupCache && Object.keys(lookup).length === 0) {
      hasRequested.current = true;
      // Don't auto-load - let components load on demand
      // This prevents loading the 2MB file on initial page load
    }
  }, [lookup]);

  return { lookup, loading, loadLookup };
};

export { useICD10Lookup };
