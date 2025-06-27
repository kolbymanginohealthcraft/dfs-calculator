import { useEffect, useState } from "react";
import Papa from "papaparse";

export default function useValueDescriptions(csvPath = "/src/data/itm_val.csv") {
  const [lookup, setLookup] = useState({});

  useEffect(() => {
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
  }, [csvPath]);

  return lookup;
}
