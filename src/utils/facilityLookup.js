export async function fetchFacilityInfo(ccn, setFacilityName, setFacilityAddress) {
  if (!ccn) return;

  try {
    const response = await fetch(`/api/facility-name/${ccn}`);
    const result = await response.json();
    const name = result?.facility_name || "Unknown Facility";
    const address = `${result?.address || ""}, ${result?.city || ""}, ${result?.state || ""} ${result?.zip || ""}`;

    setFacilityName(name);
    setFacilityAddress(address);
  } catch (error) {
    console.error("Failed to fetch facility name:", error);
    setFacilityName("Lookup failed");
    setFacilityAddress("");
  }
}
