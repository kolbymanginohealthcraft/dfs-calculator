import { useEffect, useState, useRef } from "react";

/**
 * Hook to load MDS item value descriptions
 * Now uses JSON instead of CSV for faster parsing
 */
export default function useValueDescriptions(jsonPath = "/itm_val.json") {
  const [lookup, setLookup] = useState({});
  const hasLoaded = useRef(false);

  useEffect(() => {
    // Only fetch once
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      fetch(jsonPath)
        .then((res) => res.json())
        .then((data) => {
          setLookup(data);
        })
        .catch((error) => {
          console.error('Error loading value descriptions:', error);
        });
    }
  }, [jsonPath]);

  return lookup;
}
