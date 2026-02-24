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

  const barTop = 20;
  const barH = 100;
  const barBase = barTop + barH;
  const barW = segW * 0.68;
  const maxProb = Math.max(...probabilities, 0.05);

  const gaugeTop = barBase + 28;
  const gaugeH = 12;
  const H = gaugeTop + gaugeH + 32;

  const ev = Number(imputedValue);
  const evX = pad.left + ((ev - 1) / 5) * plotW;
  const labelX = Math.max(pad.left + 22, Math.min(pad.left + plotW - 22, evX));

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
              {b.pct < 0.1
                ? "<.1%"
                : b.pct < 10
                  ? b.pct.toFixed(1) + "%"
                  : Math.round(b.pct) + "%"}
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

        {/* Baseline */}
        <line
          x1={pad.left} y1={barBase}
          x2={pad.left + plotW} y2={barBase}
          stroke="#d1d5db" strokeWidth={1}
        />

        {/* Expected-value gauge — colored segments */}
        {Array.from({ length: 6 }, (_, i) => (
          <rect
            key={i}
            x={pad.left + i * segW} y={gaugeTop}
            width={segW} height={gaugeH}
            fill={ZONE_FILLS[i]} fillOpacity={0.45}
            stroke="#d1d5db" strokeWidth={0.5}
          />
        ))}
        <rect
          x={pad.left} y={gaugeTop}
          width={plotW} height={gaugeH}
          fill="none" stroke="#9ca3af" strokeWidth={0.8} rx={3}
        />

        {/* Gauge tick labels */}
        {[1, 2, 3, 4, 5, 6].map(v => (
          <text
            key={v}
            x={pad.left + ((v - 1) / 5) * plotW}
            y={gaugeTop + gaugeH + 11}
            textAnchor="middle" fontSize="8" fill="#9ca3af"
            fontFamily="monospace"
          >
            {v}
          </text>
        ))}

        {/* Diamond marker at expected value */}
        <polygon
          points={`${evX},${gaugeTop - 5} ${evX + 5},${gaugeTop + gaugeH / 2} ${evX},${gaugeTop + gaugeH + 5} ${evX - 5},${gaugeTop + gaugeH / 2}`}
          fill="#dc3545" stroke="#fff" strokeWidth={1}
        />

        {/* Expected-value pill label */}
        <rect
          x={labelX - 20} y={gaugeTop + gaugeH + 15}
          width={40} height={14} rx={3}
          fill="#dc3545"
        />
        <text
          x={labelX} y={gaugeTop + gaugeH + 25}
          textAnchor="middle" fontSize="9" fontWeight="700"
          fill="#fff" fontFamily="monospace"
        >
          {ev.toFixed(2)}
        </text>
      </svg>

      {/* Expected-value formula */}
      <div className={styles.formulaRow}>
        <span className={styles.formulaLabel}>Imputed Value</span>
        <span className={styles.formulaEquals}>=</span>
        {probabilities.map((p, i) => {
          const pct = p * 100;
          if (pct < 0.05) return null;
          return (
            <span key={i} className={styles.formulaTerm}>
              <span className={styles.termValue} style={{ color: ZONE_STROKES[i] }}>
                {i + 1}
              </span>
              <span className={styles.termMul}>&times;</span>
              <span className={styles.termProb}>{pct.toFixed(1)}%</span>
              {i < probabilities.length - 1 &&
                probabilities.slice(i + 1).some(pp => pp * 100 >= 0.05) && (
                  <span className={styles.termPlus}>+</span>
                )}
            </span>
          );
        })}
        <span className={styles.formulaEquals}>=</span>
        <span className={styles.formulaResult}>{ev.toFixed(4)}</span>
      </div>
    </div>
  );
}

export default React.memo(ImputationDistributionChart);
