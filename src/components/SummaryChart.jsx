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

function SummaryChart({ start, modeled }) {
  const gain = Math.max(modeled - start, 0);
  const expected = Math.round(start * 1.6);
  const outcome = modeled >= expected ? "WIN" : "LOSS";
  const total = start + gain;

  const data = [
    {
      name: "Score",
      Start: start,
      Gain: gain,
      Total: total,
    },
  ];

  const CustomLegend = ({ startVal, gainVal }) => (
    <div
      style={{
        display: "flex",
        gap: "1rem",
        fontSize: "0.9rem",
        marginTop: 8,
        justifyContent: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            width: 12,
            height: 12,
            background: "#007cbb",
            display: "inline-block",
          }}
        />
        <span>Start ({startVal})</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            width: 12,
            height: 12,
            background: "#7fbc42",
            display: "inline-block",
          }}
        />
        <span>Gain ({gainVal})</span>
      </div>
    </div>
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        maxWidth: 700,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ width: "100%", height: 100 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <YAxis dataKey="name" type="category" />
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
                  fontSize: 12,
                }}
              />
              <Bar dataKey="Start" stackId="a" fill="#007cbb" name="Start" />
              <Bar dataKey="Gain" stackId="a" fill="#7fbc42" name="Gain">
                <LabelList
                  dataKey="Total"
                  position="right"
                  formatter={(val) => `Total: ${val}`}
                  style={{ fontSize: 12, fontWeight: "bold", fill: "#333" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <CustomLegend startVal={start} gainVal={gain} />
      </div>

      <div style={{ marginLeft: "1rem", fontSize: "2rem" }}>
        {outcome === "WIN" ? (
          <span role="img" aria-label="win" style={{ color: "#7fbc42" }}>
            ✅
          </span>
        ) : (
          <span role="img" aria-label="loss" style={{ color: "#d64550" }}>
            ❌
          </span>
        )}
      </div>
    </div>
  );
}

export default SummaryChart;
