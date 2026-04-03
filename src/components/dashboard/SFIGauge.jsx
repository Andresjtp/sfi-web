import { sfiRiskBand } from '../../lib/utils.js'
import clsx from 'clsx'

/**
 * SFIGauge — circular arc gauge for the 0–10 SFI score.
 */
export default function SFIGauge({ score }) {
  const band = sfiRiskBand(score)

  // SVG arc math
  const R = 54
  const cx = 70
  const cy = 70
  const circumference = Math.PI * R          // half-circle arc
  const progress = (score / 10) * circumference

  // Arc color
  const arcColor =
    score <= 3 ? '#22c55e' :
    score <= 6 ? '#f59e0b' : '#ef4444'

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <svg width="140" height="90" viewBox="0 0 140 90">
          {/* Track */}
          <path
            d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
            fill="none"
            stroke="#252a33"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Fill */}
          <path
            d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
            fill="none"
            stroke={arcColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            style={{ filter: `drop-shadow(0 0 6px ${arcColor}55)` }}
          />
          {/* Score text */}
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            className="font-mono"
            fill="#e8eaf0"
            fontSize="26"
            fontWeight="500"
            fontFamily="DM Mono, monospace"
          >
            {score.toFixed(2)}
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            fill="#555d6e"
            fontSize="11"
            fontFamily="DM Mono, monospace"
          >
            / 10
          </text>
        </svg>

        {/* Tick marks */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
          <span className="font-mono text-xs text-text-dim">0</span>
          <span className="font-mono text-xs text-text-dim">5</span>
          <span className="font-mono text-xs text-text-dim">10</span>
        </div>
      </div>

      {/* Risk label */}
      <div className={clsx(
        'px-3 py-1 rounded border font-mono text-xs font-medium tracking-widest',
        band.bg, band.border, band.color
      )}>
        {band.label}
      </div>
    </div>
  )
}
