import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
} from "recharts";
import styles from "./SummaryChart.module.css";

function SummaryChart({ start, modeled }) {
  const gain = Math.max(modeled - start, 0);
  const expected = Math.round(start * 1.6);
  const outcome = modeled >= expected ? "WIN" : "LOSS";
  const total = start + gain;

  const data = [
    {
      name: "", // no y-axis label
      Start: start,
      Gain: gain,
      Total: total,
    },
  ];

  const CustomLegend = ({ startVal, gainVal }) => (
    <div className={styles.chartLegend}>
      <div className={styles.legendItem}>
        <span className={styles.legendSwatch} style={{ background: "#007cbb" }} />
        <span>Start ({startVal})</span>
      </div>
      <div className={styles.legendItem}>
        <span className={styles.legendSwatch} style={{ background: "#7fbc42" }} />
        <span>Gain ({gainVal})</span>
      </div>
    </div>
  );

  return (
    <div className={styles.chartWrapper}>
      <div className={styles.chartContainer}>
        <div className={styles.chartHeaderRow}>
  <h3 className={styles.chartTitle}>📊 DFS Summary</h3>
  <div className={styles.inlineLegend}>
    <div className={styles.legendItem}>
      <span className={styles.legendSwatch} style={{ background: "#007cbb" }} />
      <span>Start ({start})</span>
    </div>
    <div className={styles.legendItem}>
      <span className={styles.legendSwatch} style={{ background: "#7fbc42" }} />
      <span>Gain ({gain})</span>
    </div>
  </div>
</div>

        <div className={styles.chartArea}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 15, right: 20, left: 10, bottom: 5 }}
            >
              <YAxis dataKey="name" type="category" hide />
              <XAxis
                type="number"
                domain={[0, Math.max(expected, modeled) + 10]}
              />
              <Tooltip />
              <ReferenceLine
                x={expected}
                stroke="#3db3e3"
                strokeDasharray="4 4"
                label={{
                  value: `Expected (${expected})`,
                  position: "top",
                  fill: "#3db3e3",
                  fontSize: 11,
                }}
              />
              <Bar dataKey="Start" stackId="a" fill="#007cbb" name="Start" />
              <Bar dataKey="Gain" stackId="a" fill="#7fbc42" name="Gain">
                <LabelList
                  dataKey="Total"
                  position="right"
                  formatter={(val) => `Total: ${val}`}
                  style={{ fontSize: 11, fontWeight: "bold", fill: "#333" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* <CustomLegend startVal={start} gainVal={gain} /> */}
      </div>

      <div
        className={`${styles.outcomeIcon} ${
          outcome === "WIN" ? styles.outcomeWin : styles.outcomeLoss
        }`}
      >
        {outcome === "WIN" ? "✅" : "❌"}
      </div>
    </div>
  );
}

export default SummaryChart;
