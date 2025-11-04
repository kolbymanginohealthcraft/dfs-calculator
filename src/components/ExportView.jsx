import React from "react";
// All calculations now handled server-side
import { getBasicContributingItems, getContributingGGItemsForDisplay } from "../utils/itemAdapters";
import { getContributingKeys } from "../utils/itemDefinitions";

// Simple date formatter for export view
const formatDOB = (dateStr) => {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return `${month}/${day}/${year}`;
};

// Simple score mapping for display
const scoreMap = {
  "01": 1, "02": 2, "03": 3, "04": 4, "05": 5, "06": 6,
  "07": 1, "08": 1, "09": 1, "10": 1, "88": 1, "^": 1
};

// GG_ITEMS structure for display
const GG_ITEMS = [
  { id: "GG0130A", label: "Eating", domain: "selfCare" },
  { id: "GG0130B", label: "Oral hygiene", domain: "selfCare" },
  { id: "GG0130C", label: "Toileting hygiene", domain: "selfCare" },
  { id: "GG0130E", label: "Shower/bathe self", domain: "selfCare" },
  { id: "GG0130F", label: "Upper body dressing", domain: "selfCare" },
  { id: "GG0130G", label: "Lower body dressing", domain: "selfCare" },
  { id: "GG0130H", label: "Put on/take off footwear", domain: "selfCare" },
  { id: "GG0170A", label: "Roll left and right", domain: "mobility" },
  { id: "GG0170B", label: "Sit to lying", domain: "mobility" },
  { id: "GG0170C", label: "Lying to sitting on bed side", domain: "mobility" },
  { id: "GG0170D", label: "Sit to stand", domain: "mobility" },
  { id: "GG0170E", label: "Chair/bed-to-chair transfer", domain: "mobility" },
  { id: "GG0170F", label: "Toilet transfer", domain: "mobility" },
  { id: "GG0170G", label: "Car transfer", domain: "mobility" },
  { id: "GG0170I", label: "Walk 10 feet", domain: "mobility" },
  { id: "GG0170J", label: "Walk 50 feet with two turns", domain: "mobility" },
  { id: "GG0170K", label: "Walk 150 feet", domain: "mobility" },
  { id: "GG0170L", label: "Walking 10 feet uneven surface", domain: "mobility" },
  { id: "GG0170M", label: "1 step (curb)", domain: "mobility" },
  { id: "GG0170N", label: "4 steps", domain: "mobility" },
  { id: "GG0170O", label: "12 steps", domain: "mobility" },
  { id: "GG0170P", label: "Picking up object", domain: "mobility" },
  { id: "GG0170R", label: "Wheel 50 feet with two turns", domain: "mobility" },
  { id: "GG0170S", label: "Wheel 150 feet", domain: "mobility" }
];
import "./ExportView.css";
import { BarChart3 } from "lucide-react";

const ExportView = ({ patient, scores, functionItems, mobilityType = 'Walk' }) => {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Get function items data based on whether we have functionItems prop or need to derive it
  const getFunctionItemsData = () => {
    if (functionItems && functionItems.scores) {
      // Advanced app - derive items from GG_ITEMS and filter by contributing items
      const actualMobilityType = functionItems.mobilityType || mobilityType;
      const contributingGGItems = getContributingGGItemsForDisplay(actualMobilityType);
      
      const contributingItems = GG_ITEMS.filter(item => {
        return contributingGGItems.has(item.id);
      });
      
      // Group by domain
      const grouped = {
        selfCare: contributingItems.filter(item => item.domain === 'selfCare'),
        mobility: contributingItems.filter(item => item.domain === 'mobility')
      };
      
      return grouped;
    } else {
      // Basic app - derive from scores and mobilityType
      const contributingItems = getBasicContributingItems(mobilityType);
      return {
        selfCare: contributingItems.selfCare,
        mobility: contributingItems.mobility
      };
    }
  };

  const functionItemsData = getFunctionItemsData();

  // Helper function to get score for an item
  const getItemScore = (item, domain) => {
    if (functionItems && functionItems.scores) {
      // Advanced app structure
      const rawScore = functionItems.scores[item.id];
      const score = rawScore in scoreMap ? scoreMap[rawScore] : 0;
      return score;
    } else {
      // Basic app structure - scores passed separately
      const key = item.key || item.id;
      return scores[domain] ? scores[domain][key] : 0;
    }
  };

  // Helper function to get start score for an item
  const getItemStartScore = (item, domain) => {
    if (functionItems && functionItems.startScores) {
      // Advanced app structure
      const rawStart = functionItems.startScores[item.id];
      const startScore = rawStart in scoreMap ? scoreMap[rawStart] : 0;
      return startScore;
    } else {
      // Basic app structure - startScores passed separately
      const key = item.key || item.id;
      return scores.startScores && scores.startScores[domain] ? scores.startScores[domain][key] : 0;
    }
  };

  return (
    <div className="exportContainer">
      <h1 className="reportTitle">DFS Report</h1>

      <section className="section">
        <p className="patientLine">
          <span className="label">Patient:</span> {patient.name}
          {(patient.age || patient.ard) && (
            <span>
              {" "}
              (age: {patient.age}, ARD{" "}
              {formatDOB(patient.ard)})
            </span>
          )}
        </p>

        <p className="facilityLine">
          <span className="label">Facility:</span> {patient.facility}
        </p>
      </section>

      <section className="section">
        <h3 className="sectionSubheading">Summary</h3>
        <div className="summaryGrid">
          <div className="summaryCell">
            <div className="summaryLabel">Start Score</div>
            <div className="summaryValue">{scores.start ?? "—"}</div>
          </div>
          <div className="summaryCell">
            <div className="summaryLabel">Expected Score</div>
            <div className="summaryValue">
              {scores.expected !== undefined
                ? Number(scores.expected).toFixed(2)
                : "—"}
            </div>
          </div>
          <div className="summaryCell">
            <div className="summaryLabel">End Score</div>
            <div className={`summaryValue ${(() => {
              if (scores.expected === undefined || scores.modeled === undefined) return '';
              const diff = scores.modeled - scores.expected;
              return diff >= 0 ? 'over-achieved' : 'under-achieved';
            })()}`}>
              {(() => {
                if (scores.modeled === undefined) return "—";
                const endScore = Number(scores.modeled).toFixed(0);
                if (scores.expected !== undefined) {
                  const diff = scores.modeled - scores.expected;
                  if (diff >= 0) {
                    return `${endScore} (${diff.toFixed(2)} over)`;
                  } else {
                    return `${endScore} (${Math.abs(diff).toFixed(2)} under)`;
                  }
                }
                return endScore;
              })()}
            </div>
          </div>
          <div className="summaryCell">
            <div className="summaryLabel">Gain</div>
            <div className={`summaryValue ${(() => {
              if (scores.start === undefined || scores.modeled === undefined) return '';
              const gain = scores.modeled - scores.start;
              return gain >= 0 ? 'over-achieved' : 'under-achieved';
            })()}`}>
              {(() => {
                if (scores.start === undefined || scores.modeled === undefined) return "—";
                const gain = scores.modeled - scores.start;
                if (scores.expected !== undefined) {
                  const required = scores.expected - scores.start;
                  return `+${gain.toFixed(0)} (required ${required.toFixed(2)})`;
                }
                return gain >= 0 ? `+${gain.toFixed(0)}` : `${gain.toFixed(0)}`;
              })()}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <h3 className="sectionSubheading">Function Items Analysis</h3>
        <div className="functionItemsContainer">
          {Object.entries(functionItemsData).map(([domain, items]) => (
            <div key={domain} className="domainSection">
              <h4 className="domainTitle">
                {domain === 'selfCare' ? 'Self-Care Items' : 'Mobility Items'}
                {domain === 'mobility' && (functionItems?.mobilityType || mobilityType) && (
                  <span className="mobilityType"> ({functionItems?.mobilityType === 'Wheel' ? 'Wheelchair' : functionItems?.mobilityType || (mobilityType === 'Wheel' ? 'Wheelchair' : mobilityType)})</span>
                )}
                {domain === 'mobility' && (functionItems?.mobilityType === 'Wheel' || mobilityType === 'Wheel') && (
                  <span className="footnote">Item R counts double</span>
                )}
              </h4>
              <table className="functionItemsTable">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Start Score</th>
                    <th>End Score</th>
                    <th>Gain</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const startScore = getItemStartScore(item, domain);
                    const endScore = getItemScore(item, domain);
                    const gain = endScore - startScore;
                    
                    return (
                      <tr key={item.key || item.id}>
                        <td className="itemName">{item.label}</td>
                        <td className="scoreCell">{startScore}</td>
                        <td className="scoreCell">{endScore}</td>
                        <td className={`gainCell ${gain > 0 ? 'positive' : gain < 0 ? 'negative' : ''}`}>
                          {gain > 0 ? `+${gain}` : gain === 0 ? '—' : gain}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      <p className="footerNote">
        Generated by DFS Calculator · Aegis Therapies · {today}
      </p>
    </div>
  );
};

export default ExportView;
