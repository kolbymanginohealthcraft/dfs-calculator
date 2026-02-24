import React, { useMemo } from "react";
import styles from "./ImputationDistributionChart.module.css";

function normalCDF(x) {
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;
  const sign = x < 0 ? -1 : 1;
  const u = Math.abs(x) / Math.SQRT2;
  const t = 1.0 / (1.0 + p * u);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-u * u);
  return 0.5 * (1.0 + sign * y);
}

const ZONE_FILLS = [
  "#fecaca", "#fed7aa", "#fef08a", "#bbf7d0", "#bfdbfe", "#c7d2fe",
];
const ZONE_STROKES = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#6366f1",
];

function ImputationDistributionChart({ z, thresholds, imputedValue }) {
  const probabilities = useMemo(() => {
    const probs = [];
    probs[0] = normalCDF(thresholds[0] - z);
    for (let i = 1; i < thresholds.length; i++) {
      probs[i] = normalCDF(thresholds[i] - z) - normalCDF(thresholds[i - 1] - z);
    }
    probs[thresholds.length] = 1 - normalCDF(thresholds[thresholds.length - 1] - z);
    return probs;
  }, [z, thresholds]);

  const W = 460;
  const pad = { left: 34, right: 16 };
  const plotW = W - pad.left - pad.right;
  const segW = plotW / 6;

  const lineTop = 4;
  const barTop = 38;
  const barH = 100;
  const barBase = barTop + barH;
  const barW = segW * 0.68;
  const maxProb = Math.max(...probabilities, 0.05);

  const H = barBase + 20;

  const ev = Number(imputedValue);

  const bars = probabilities.map((p, i) => {
    const cx = pad.left + (i + 0.5) * segW;
    const x = cx - barW / 2;
    const h = Math.max(2, (p / maxProb) * barH);
    const y = barBase - h;
    const pct = p * 100;
    return { x, y, h, pct, value: i + 1, cx };
  });

  return (
    <div className={styles.chartWrapper}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className={styles.svg}
      >
        {/* Subtle horizontal grid */}
        {[0.25, 0.5, 0.75].map(f => (
          <line
            key={f}
            x1={pad.left} y1={barBase - f * barH}
            x2={pad.left + plotW} y2={barBase - f * barH}
            stroke="#f0f0f0" strokeWidth={0.5}
          />
        ))}

        {/* Probability bars */}
        {bars.map((b, i) => (
          <g key={i}>
            <rect
              x={b.x} y={b.y} width={barW} height={b.h}
              rx={3} fill={ZONE_FILLS[i]}
              stroke={ZONE_STROKES[i]} strokeWidth={1.2}
            />
            <text
              x={b.cx} y={b.y - 4}
              textAnchor="middle" fontSize="9" fontWeight="600"
              fill="#374151" fontFamily="monospace"
            >
              {b.pct < 0.1 ? "<0.1%" : b.pct.toFixed(1) + "%"}
            </text>
            <text
              x={b.cx} y={barBase + 14}
              textAnchor="middle" fontSize="12" fontWeight="700"
              fill={ZONE_STROKES[i]}
            >
              {b.value}
            </text>
          </g>
        ))}

        {/* Imputed value reference line — full height, behind bars visually distinct */}
        {(() => {
          const lineX = pad.left + ((ev - 0.5) / 6) * plotW;
          const labelX = Math.max(pad.left + 30, Math.min(pad.left + plotW - 30, lineX));
          return (
            <g>
              <line
                x1={lineX} y1={lineTop}
                x2={lineX} y2={barBase}
                stroke="#dc3545" strokeWidth={2}
                strokeDasharray="6,4"
                opacity={0.8}
              />
              <circle cx={lineX} cy={barBase} r={3} fill="#dc3545" />
              <rect
                x={labelX - 28} y={lineTop}
                width={56} height={15} rx={4}
                fill="#dc3545"
              />
              <text
                x={labelX} y={lineTop + 11}
                textAnchor="middle" fontSize="9" fontWeight="700"
                fill="#fff" fontFamily="monospace"
              >
                {ev.toFixed(4)}
              </text>
            </g>
          );
        })()}

        {/* Baseline */}
        <line
          x1={pad.left} y1={barBase}
          x2={pad.left + plotW} y2={barBase}
          stroke="#d1d5db" strokeWidth={1}
        />

      </svg>

    </div>
  );
}

export default React.memo(ImputationDistributionChart);
