import { useEffect, useState, useRef } from "react";
import Papa from "papaparse";

export default function useValueDescriptions(csvPath = "/itm_val.csv") {
  const [lookup, setLookup] = useState({});
  const hasLoaded = useRef(false);

  useEffect(() => {
    // Only fetch once
    if (!hasLoaded.current) {
      hasLoaded.current = true;
      fetch(csvPath)
        .then((res) => res.text())
        .then((csvText) => {
          const { data } = Papa.parse(csvText, { header: true });
          const map = {};
          data.forEach((row) => {
            if (row.itm_id && row.val_id) {
              const key = `${row.itm_id}|${row.val_id}`;
              map[key] = row.val_txt;
            }
          });
          setLookup(map);
        });
    }
  }, [csvPath]);

  return lookup;
}
