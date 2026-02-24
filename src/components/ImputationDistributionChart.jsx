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

const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI);
function normalPDF(x) {
  return INV_SQRT_2PI * Math.exp(-0.5 * x * x);
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

  const curve = useMemo(() => {
    const cuts = thresholds.map(t => t - z);
    const xMin = Math.min(-4, Math.min(...cuts) - 0.8);
    const xMax = Math.max( 4, Math.max(...cuts) + 0.8);
    const N = 400;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const x = xMin + (i / N) * (xMax - xMin);
      pts.push([x, normalPDF(x)]);
    }
    return { cuts, xMin, xMax, pts, yPeak: normalPDF(0) };
  }, [z, thresholds]);

  /* ── geometry ── */
  const W = 570;

  // left half — bell curve
  const cL = 14, cR = 262, cW = cR - cL;
  const cTop = 34, cH = 112, cBase = cTop + cH;

  // right half — probability bars
  const bL = 318, bR = 556, bW = bR - bL;
  const segW = bW / 6;
  const barW = segW * 0.88;
  const maxP = Math.max(...probabilities, 0.05);
  const bBase = cBase;                       // shared baseline
  const bBarH = 102;                         // max bar height
  const bTop  = bBase - bBarH;

  // gap centre
  const gapCX = (cR + bL) / 2;

  // top badge for imputed value
  const badgeY = 17;
  const badgeH = 14;
  const lineStart = badgeY + badgeH;

  // bottom labels & fulcrum
  const labelY = cBase + 14;
  const fulcrumTip = cBase + 2;
  const fulcrumBase = cBase + 9;
  const H = cBase + 24;

  const ev = Number(imputedValue);

  /* ── bell-curve scaling ── */
  const { cuts, xMin, xMax, pts, yPeak } = curve;
  const sx = (x) => cL + ((x - xMin) / (xMax - xMin)) * cW;
  const sy = (y) => cBase - (y / yPeak) * cH * 0.88;

  /* ── filled regions ── */
  const bounds = [xMin, ...cuts, xMax];
  const regions = [];
  for (let i = 0; i < 6; i++) {
    const lo = bounds[i], hi = bounds[i + 1];
    const seg = pts.filter(([x]) => x >= lo && x <= hi);
    if (seg.length === 0) continue;
    const all = [[lo, normalPDF(lo)], ...seg, [hi, normalPDF(hi)]];
    let d = `M${sx(lo)} ${cBase}`;
    all.forEach(([x, y]) => { d += ` L${sx(x)} ${sy(y)}`; });
    d += ` L${sx(hi)} ${cBase}Z`;
    regions.push({ d, i, w: sx(hi) - sx(lo), labelX: sx((lo + hi) / 2) });
  }

  /* ── bars ── */
  const bars = probabilities.map((p, i) => {
    const cx  = bL + (i + 0.5) * segW;
    const x   = cx - barW / 2;
    const h   = Math.max(2, (p / maxP) * bBarH);
    const y   = bBase - h;
    const pct = p * 100;
    return { x, y, h, pct, cx, value: i + 1 };
  });

  /* ── imputed-value marker position ── */
  const evX  = bL + ((ev - 0.5) / 6) * bW;

  return (
    <div className={styles.chartWrapper}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className={styles.svg}
      >
        {/* ── section labels ── */}
        <text x={(cL + cR) / 2} y={10} textAnchor="middle"
          fontSize="9.5" fill="#6b7280" fontWeight="600">
          Imputation Score vs Thresholds
        </text>
        <text x={(bL + bR) / 2} y={10} textAnchor="middle"
          fontSize="9.5" fill="#6b7280" fontWeight="600">
          Expected Value Calculation
        </text>

        {/* ════════ BELL CURVE ════════ */}

        {/* filled zones */}
        {regions.map(r => (
          <path key={r.i} d={r.d}
            fill={ZONE_FILLS[r.i]} stroke={ZONE_STROKES[r.i]}
            strokeWidth={0.6} opacity={0.82} />
        ))}

        {/* outline */}
        <path
          d={`M${sx(pts[0][0])} ${sy(pts[0][1])}` +
            pts.slice(1).map(([x, y]) => ` L${sx(x)} ${sy(y)}`).join("")}
          fill="none" stroke="#374151" strokeWidth={1.3}
        />

        {/* threshold dashes + value labels */}
        {cuts.map((c, i) => {
          const tx = sx(c);
          const stagger = i % 2 === 0 ? 0 : 9;
          return (
            <g key={i}>
              <line
                x1={tx} y1={cTop + 4} x2={tx} y2={cBase}
                stroke="#9ca3af" strokeWidth={0.7} strokeDasharray="3,2" />
              <text x={tx} y={cBase + 9 + stagger}
                textAnchor="middle" fontSize="7" fill="#7c7c7c"
                fontFamily="monospace">
                {thresholds[i].toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* value labels inside zones (where they fit) */}
        {regions.map(r => r.w > 18 && (
          <text key={`v${r.i}`} x={r.labelX} y={cBase - 4}
            textAnchor="middle" fontSize="10" fontWeight="700"
            fill={ZONE_STROKES[r.i]} opacity={0.55}>
            {r.i + 1}
          </text>
        ))}

        {/* peak marker — show z value */}
        <circle cx={sx(0)} cy={sy(yPeak)} r={2.5} fill="#dc3545" />
        <text x={sx(0)} y={sy(yPeak) - 7}
          textAnchor="middle" fontSize="7.5" fontWeight="600" fill="#dc3545"
          fontFamily="monospace">
          z = {z.toFixed(4)}
        </text>

        {/* curve baseline */}
        <line x1={cL} y1={cBase} x2={cR} y2={cBase}
          stroke="#d1d5db" strokeWidth={1} />

        {/* ════════ CONNECTING ANNOTATION ════════ */}
        <text x={gapCX} y={cBase * 0.48} textAnchor="middle"
          fontSize="20" fill="#b0b0b0">→</text>
        <text x={gapCX} y={cBase * 0.48 + 16} textAnchor="middle"
          fontSize="7.5" fill="#b0b0b0" fontStyle="italic">
          area =
        </text>
        <text x={gapCX} y={cBase * 0.48 + 25} textAnchor="middle"
          fontSize="7.5" fill="#b0b0b0" fontStyle="italic">
          probability
        </text>

        {/* ════════ PROBABILITY BARS ════════ */}

        {/* grid */}
        {[0.25, 0.5, 0.75].map(f => (
          <line key={f}
            x1={bL} y1={bBase - f * bBarH}
            x2={bR} y2={bBase - f * bBarH}
            stroke="#f0f0f0" strokeWidth={0.5} />
        ))}

        {/* bars + % labels */}
        {bars.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={b.y} width={barW} height={b.h}
              rx={3} fill={ZONE_FILLS[i]}
              stroke={ZONE_STROKES[i]} strokeWidth={1.2} />
            <text x={b.cx} y={b.y - 3}
              textAnchor="middle" fontSize="8" fontWeight="600"
              fill="#374151" fontFamily="monospace">
              {b.pct < 0.1 ? "<0.1%" : b.pct.toFixed(1) + "%"}
            </text>
          </g>
        ))}

        {/* imputed-value badge at top */}
        {(() => {
          const bx = Math.max(bL + 26, Math.min(bR - 26, evX));
          return (
            <g>
              <rect x={bx - 26} y={badgeY} width={52} height={badgeH}
                rx={3} fill="#dc3545" />
              <text x={bx} y={badgeY + 10.5}
                textAnchor="middle" fontSize="8.5" fontWeight="700"
                fill="#fff" fontFamily="monospace">
                {ev.toFixed(4)}
              </text>
            </g>
          );
        })()}

        {/* imputed-value dashed line — from badge to fulcrum */}
        <line x1={evX} y1={lineStart} x2={evX} y2={fulcrumTip}
          stroke="#dc3545" strokeWidth={1.8}
          strokeDasharray="5,3" opacity={0.7} />

        {/* bar baseline */}
        <line x1={bL - 3} y1={bBase} x2={bR + 3} y2={bBase}
          stroke="#6b7280" strokeWidth={1.5} strokeLinecap="round" />

        {/* score labels */}
        {bars.map((b, i) => (
          <text key={`bl-${i}`} x={b.cx} y={labelY}
            textAnchor="middle" fontSize="11" fontWeight="700"
            fill={ZONE_STROKES[i]}>
            {b.value}
          </text>
        ))}

        {/* fulcrum triangle — weighted-average "balance point" */}
        <polygon
          points={`${evX},${fulcrumTip} ${evX - 5},${fulcrumBase} ${evX + 5},${fulcrumBase}`}
          fill="#dc3545"
        />

      </svg>

      <p className={styles.formulaNote}>
        Imputed value = each value weighted by its probability ={" "}
        <strong>{ev.toFixed(4)}</strong>
      </p>
    </div>
  );
}

export default React.memo(ImputationDistributionChart);
