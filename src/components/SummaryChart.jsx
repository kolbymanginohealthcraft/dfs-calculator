import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import styles from "./SummaryChart.module.css";

function SummaryChart({ start, modeled }) {
  const gain = Math.max(modeled - start, 0);
  const expected = Math.round(start * 1.6);
  const outcome = modeled >= expected ? "WIN" : "LOSS";
  const total = start + gain;

  const data = [
    {
      name: "",
      Start: start,
      Gain: gain,
      Total: total,
    },
  ];

  return (
    <div className={styles.chartWrapper}>
      <div className={styles.chartContent}>
        <div className={styles.verticalLegend}>
          <div className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ background: "#007cbb" }}
            />
            <span>Start ({start})</span>
          </div>
          <div className={styles.legendItem}>
            <span
              className={styles.legendSwatch}
              style={{ background: "#7fbc42" }}
            />
            <span>Gain ({gain})</span>
          </div>
          <div className={`${styles.legendItem} ${styles.legendItemTotal}`}>
            <span>Total: {total}</span>
            <span
              className={`${styles.outcomeEmoji} ${
                outcome === "WIN" ? styles.outcomeWin : styles.outcomeLoss
              }`}
            >
              {outcome === "WIN" ? "✅" : "❌"}
            </span>
          </div>
        </div>

        <div className={styles.chartArea}>
          <ResponsiveContainer width="100%" height={90}>
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 18, right: 8, left: 5, bottom: 0 }}
            >
              <YAxis dataKey="name" type="category" hide />
              <XAxis
                type="number"
                domain={[0, 60]}
                tick={{ fontSize: 10 }}
              />
              {/* <Tooltip /> */}
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
              <Bar dataKey="Gain" stackId="a" fill="#7fbc42" name="Gain" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default SummaryChart;
