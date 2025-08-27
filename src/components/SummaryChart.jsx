import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import styles from "./SummaryChart.module.css";
import { CheckCircle, XCircle } from "lucide-react";

function SummaryChart({ start = 0, modeled = 0, expected }) {
  // Ensure all values are valid numbers
  const safeStart = Number.isFinite(start) ? start : 0;
  const safeModeled = Number.isFinite(modeled) ? modeled : 0;
  const safeExpected = Number.isFinite(expected) ? expected : undefined;
  
  const gain = Math.max(safeModeled - safeStart, 0);
  const outcome =
    safeExpected !== undefined && safeModeled >= safeExpected
      ? "WIN"
      : "LOSS";
  const total = safeStart + gain;

  const isExpectedValid = safeExpected !== undefined;

  // Calculate a safe domain maximum
  const domainMax = Math.max(60, safeStart, total);
  const finalDomainMax = isExpectedValid ? Math.max(domainMax, safeExpected) : domainMax;

  const data = [
    {
      name: "",
      Start: safeStart,
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
            <span>Start ({safeStart})</span>
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
              className={`${styles.outcomeIcon} ${
                outcome === "WIN" ? styles.outcomeWin : styles.outcomeLoss
              }`}
            >
              {outcome === "WIN" ? <CheckCircle size={16} /> : <XCircle size={16} />}
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
                domain={[0, finalDomainMax]}
                tick={{ fontSize: 10 }}
                allowDataOverflow
              />
              {isExpectedValid && (
                <ReferenceLine
                  x={safeExpected}
                  stroke="#3db3e3"
                  strokeDasharray="4 4"
                  label={{
                    value: `Expected (${safeExpected.toFixed(2)})`,
                    position: "top",
                    fill: "#3db3e3",
                    fontSize: 11,
                  }}
                />
              )}

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
