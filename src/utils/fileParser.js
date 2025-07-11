import mdsItemLookup from "../data/mds_item_lookup.json";
import { GG_ITEMS } from "./calculations";
import { parseXml } from "./xmlParser"; // already used in your code

export function handleFileUpload(
  file,
  setFileName,
  setParsedValues,
  setGroupedSections,
  setModeledValues,
  setStartScores
) {
  setFileName(file.name);

  file.text().then((text) => {
    const parsed = parseXml(text);
    setParsedValues(parsed);

    const grouped = {};
    Object.entries(parsed).forEach(([key, val]) => {
      const item = mdsItemLookup[key];
      if (!item) return;

      const sectLabel = item.itm_sect_label || "Other";
      const fullName = item.sect_name || sectLabel;

      if (!grouped[sectLabel]) {
        grouped[sectLabel] = {
          label: sectLabel,
          fullName,
          items: [],
        };
      }

      grouped[sectLabel].items.push({
        id: key,
        label: item.itm_shrt_label,
        value: val,
      });
    });

    setGroupedSections(grouped);

    const initModeled = {};
    const initStart = {};
    GG_ITEMS.forEach((item) => {
      const sourceId = item.id + "1";
      const rawVal = parsed[sourceId] || "01";
      initStart[item.id] = rawVal;
      initModeled[item.id] = rawVal;
    });

    setModeledValues(initModeled);
    setStartScores(initStart);
  });
}
