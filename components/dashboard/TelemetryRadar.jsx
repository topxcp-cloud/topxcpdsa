'use client';
import React, { useState, useEffect, useRef } from 'react';

/**
 * CountUpNumber: Smooth ease-out counter for platform metric values.
 * Runs only on mount or when numeric values change.
 * Respects prefers-reduced-motion.
 */
export function CountUpNumber({ value = 0, duration = 750 }) {
  const target = Number(value) || 0;
  const [displayValue, setDisplayValue] = useState(target);
  const prevValueRef = useRef(target);

  useEffect(() => {
    const startVal = prevValueRef.current;
    if (startVal === target) {
      setDisplayValue(target);
      return;
    }

    // Respect reduced motion
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      prevValueRef.current = target;
      setDisplayValue(target);
      return;
    }

    let startTime = null;
    let animId = null;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic: fast start, soft deceleration
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startVal + (target - startVal) * ease);
      setDisplayValue(current);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        prevValueRef.current = target;
        setDisplayValue(target);
      }
    };

    animId = requestAnimationFrame(step);
    return () => {
      if (animId) cancelAnimationFrame(animId);
      prevValueRef.current = target;
    };
  }, [target, duration]);

  return <>{displayValue}</>;
}

/**
 * TelemetryRadar: High-precision competitive programming telemetry graphic.
 * Renders an asymmetrical 3-axis radar of verified platform solves (LeetCode, Codeforces, CodeChef)
 * with animated concentric radar rings, pulsing central hub, laser data packets,
 * traveling platform signals, background scanline sweep, and live coordinate telemetry.
 */
export default function TelemetryRadar({
  leetcodeSolved = 0,
  codeforcesSolved = 0,
  codechefSolved = 0,
  currentStreak = 0,
  totalSolved = 0,
  showBottomStats = false
}) {
  const width = 360;
  const height = 240;
  const cx = 180;
  const cy = 120;
  const maxRadius = 88;

  // Normalization scale: target 150 solves for outer boundary
  const targetScale = Math.max(150, Math.max(leetcodeSolved, codeforcesSolved, codechefSolved, 1));
  const hasAnySolves = (leetcodeSolved + codeforcesSolved + codechefSolved) > 0;

  // Normalized radii (minimum 0.16 for visible vertex)
  const lcNorm = hasAnySolves ? Math.min(1, Math.max(0.16, leetcodeSolved / targetScale)) : 0.35;
  const cfNorm = hasAnySolves ? Math.min(1, Math.max(0.16, codeforcesSolved / targetScale)) : 0.35;
  const ccNorm = hasAnySolves ? Math.min(1, Math.max(0.16, codechefSolved / targetScale)) : 0.35;

  // Angles: LC = top (-90°), CF = bottom-right (+30°), CC = bottom-left (+150°)
  const angleLC = -Math.PI / 2;
  const angleCF = Math.PI / 6;
  const angleCC = (5 * Math.PI) / 6;

  // Active Vertex coordinates
  const pLC = {
    x: Number((cx + Math.cos(angleLC) * (lcNorm * maxRadius)).toFixed(1)),
    y: Number((cy + Math.sin(angleLC) * (lcNorm * maxRadius)).toFixed(1))
  };
  const pCF = {
    x: Number((cx + Math.cos(angleCF) * (cfNorm * maxRadius)).toFixed(1)),
    y: Number((cy + Math.sin(angleCF) * (cfNorm * maxRadius)).toFixed(1))
  };
  const pCC = {
    x: Number((cx + Math.cos(angleCC) * (ccNorm * maxRadius)).toFixed(1)),
    y: Number((cy + Math.sin(angleCC) * (ccNorm * maxRadius)).toFixed(1))
  };

  // Outer boundary anchors (for outer axis lines & station indicators)
  const outerLC = {
    x: Number((cx + Math.cos(angleLC) * (maxRadius + 8)).toFixed(1)),
    y: Number((cy + Math.sin(angleLC) * (maxRadius + 8)).toFixed(1))
  };
  const outerCF = {
    x: Number((cx + Math.cos(angleCF) * (maxRadius + 8)).toFixed(1)),
    y: Number((cy + Math.sin(angleCF) * (maxRadius + 8)).toFixed(1))
  };
  const outerCC = {
    x: Number((cx + Math.cos(angleCC) * (maxRadius + 8)).toFixed(1)),
    y: Number((cy + Math.sin(angleCC) * (maxRadius + 8)).toFixed(1))
  };

  // CSS custom property translation vectors for hardware-accelerated signal paths
  const vectorStyle = {
    '--dx-lc': `${(pLC.x - cx).toFixed(1)}px`,
    '--dy-lc': `${(pLC.y - cy).toFixed(1)}px`,
    '--dx-cf': `${(pCF.x - cx).toFixed(1)}px`,
    '--dy-cf': `${(pCF.y - cy).toFixed(1)}px`,
    '--dx-cc': `${(pCC.x - cx).toFixed(1)}px`,
    '--dy-cc': `${(pCC.y - cy).toFixed(1)}px`,
    '--lc-x': `${pLC.x}px`,
    '--lc-y': `${pLC.y}px`,
    '--cf-x': `${pCF.x}px`,
    '--cf-y': `${pCF.y}px`,
    '--cc-x': `${pCC.x}px`,
    '--cc-y': `${pCC.y}px`
  };

  return (
    <div className="dash-radar-wrap" style={vectorStyle}>
      <svg
        className="dash-radar-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Student competitive programming platform telemetry radar"
      >
        <defs>
          {/* Ambient background radial glow */}
          <radialGradient id="telemetryGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF5A36" stopOpacity="0.22" />
            <stop offset="60%" stopColor="#FF5A36" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#FF5A36" stopOpacity="0" />
          </radialGradient>

          {/* Polygon active fill */}
          <linearGradient id="polyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF5A36" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#FF8C6E" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.12" />
          </linearGradient>

          {/* Background grid scanning beam */}
          <linearGradient id="scanlineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF5A36" stopOpacity="0" />
            <stop offset="20%" stopColor="#FF5A36" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#38BDF8" stopOpacity="0.5" />
            <stop offset="80%" stopColor="#FF5A36" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#FF5A36" stopOpacity="0" />
          </linearGradient>

          {/* Cyan central node radial pulse */}
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient background glow */}
        <circle cx={cx} cy={cy} r={maxRadius + 16} fill="url(#telemetryGlow)" />

        {/* Background Grid Crosshairs & Fine Coordinate Rules */}
        <g className="dash-radar-grid" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1">
          <line x1="20" y1={cy} x2="340" y2={cy} strokeDasharray="2 4" />
          <line x1={cx} y1="16" x2={cx} y2="224" strokeDasharray="2 4" />
          {/* Subtle corner crosshairs */}
          <path d="M 24 36 L 36 36 M 30 30 L 30 42" stroke="rgba(255,255,255,0.12)" />
          <path d="M 324 36 L 336 36 M 330 30 L 330 42" stroke="rgba(255,255,255,0.12)" />
          <path d="M 24 204 L 36 204 M 30 198 L 30 210" stroke="rgba(255,255,255,0.12)" />
          <path d="M 324 204 L 336 204 M 330 198 L 330 210" stroke="rgba(255,255,255,0.12)" />
        </g>

        {/* Moving Background Grid Scanline */}
        <line
          x1="20"
          y1="0"
          x2="340"
          y2="0"
          className="dash-radar-scanline"
          stroke="url(#scanlineGrad)"
          strokeWidth="1.5"
        />

        {/* Concentric Coordinate Rings */}
        {/* Ring 1 (Inner 25%) */}
        <circle
          cx={cx}
          cy={cy}
          r={maxRadius * 0.25}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="1"
          className="dash-radar-ring-inner"
        />
        {/* Ring 2 (50%) */}
        <circle
          cx={cx}
          cy={cy}
          r={maxRadius * 0.5}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="1"
        />
        {/* Ring 3 (75%) */}
        <circle
          cx={cx}
          cy={cy}
          r={maxRadius * 0.75}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth="1"
        />
        {/* Ring 4 (Boundary 100%) */}
        <circle
          cx={cx}
          cy={cy}
          r={maxRadius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="1"
        />
        {/* Dashed outer ring rotating very slowly */}
        <circle
          cx={cx}
          cy={cy}
          r={maxRadius + 6}
          fill="none"
          stroke="rgba(255, 255, 255, 0.16)"
          strokeWidth="1"
          strokeDasharray="4 4"
          className="dash-radar-ring-dashed"
        />

        {/* Expanding Sonar / Radar Ping Rings */}
        <circle cx={cx} cy={cy} r="80" className="dash-radar-ping ping-1" />
        <circle cx={cx} cy={cy} r="80" className="dash-radar-ping ping-2" />

        {/* Diagonal Axis Reference Lines */}
        <line
          x1={cx}
          y1={cy}
          x2={outerLC.x}
          y2={outerLC.y}
          stroke="rgba(255, 255, 255, 0.18)"
          strokeWidth="1"
        />
        <line
          x1={cx}
          y1={cy}
          x2={outerCF.x}
          y2={outerCF.y}
          stroke="rgba(255, 255, 255, 0.18)"
          strokeWidth="1"
        />
        <line
          x1={cx}
          y1={cy}
          x2={outerCC.x}
          y2={outerCC.y}
          stroke="rgba(255, 255, 255, 0.18)"
          strokeWidth="1"
        />

        {/* Connecting Lines between Center Node & Active Platform Nodes */}
        <line
          x1={cx}
          y1={cy}
          x2={pLC.x}
          y2={pLC.y}
          stroke="rgba(248, 159, 27, 0.3)"
          strokeWidth="1"
        />
        <line
          x1={cx}
          y1={cy}
          x2={pCF.x}
          y2={pCF.y}
          stroke="rgba(56, 189, 248, 0.3)"
          strokeWidth="1"
        />
        <line
          x1={cx}
          y1={cy}
          x2={pCC.x}
          y2={pCC.y}
          stroke="rgba(245, 158, 11, 0.3)"
          strokeWidth="1"
        />

        {/* Moving Laser Packet Traces along Connection Lines */}
        <line
          x1={cx}
          y1={cy}
          x2={pLC.x}
          y2={pLC.y}
          className="dash-packet-trace trace-lc"
          stroke="#F89F1B"
          strokeWidth="1.5"
          strokeDasharray="6 70"
        />
        <line
          x1={cx}
          y1={cy}
          x2={pCF.x}
          y2={pCF.y}
          className="dash-packet-trace trace-cf"
          stroke="#38BDF8"
          strokeWidth="1.5"
          strokeDasharray="6 70"
        />
        <line
          x1={cx}
          y1={cy}
          x2={pCC.x}
          y2={pCC.y}
          className="dash-packet-trace trace-cc"
          stroke="#F59E0B"
          strokeWidth="1.5"
          strokeDasharray="6 70"
        />

        {/* Live Data Polygon or Blueprint Target Arc */}
        {hasAnySolves ? (
          <polygon
            points={`${pLC.x},${pLC.y} ${pCF.x},${pCF.y} ${pCC.x},${pCC.y}`}
            fill="url(#polyGrad)"
            stroke="#FF5A36"
            strokeWidth="2"
            strokeLinejoin="round"
            className="dash-radar-poly"
          />
        ) : (
          <circle
            cx={cx}
            cy={cy}
            r={maxRadius * 0.4}
            fill="none"
            stroke="rgba(255, 90, 54, 0.4)"
            strokeWidth="1.5"
            strokeDasharray="5 4"
            className="dash-radar-blueprint"
          />
        )}

        {/* Central Hub: Breathing Halo, Orange-Red Core, and Cyan Pip */}
        <circle
          cx={cx}
          cy={cy}
          r="10"
          className="dash-center-halo"
          fill="url(#centerGlow)"
          stroke="rgba(56, 189, 248, 0.4)"
          strokeWidth="1"
        />
        <circle cx={cx} cy={cy} r="4" fill="#FF5A36" className="dash-center-core" />
        <circle cx={cx} cy={cy} r="1.8" fill="#38BDF8" />

        {/* Traveling Signal Dots toward each platform indicator */}
        <circle
          cx={cx}
          cy={cy}
          r="2.5"
          fill="#F89F1B"
          className="dash-signal-dot signal-lc"
        />
        <circle
          cx={cx}
          cy={cy}
          r="2.5"
          fill="#38BDF8"
          className="dash-signal-dot signal-cf"
        />
        <circle
          cx={cx}
          cy={cy}
          r="2.5"
          fill="#F59E0B"
          className="dash-signal-dot signal-cc"
        />

        {/* Station Vertex Nodes & Subtle Highlight Reactions */}
        {/* LeetCode Node (Top) */}
        <circle
          cx={pLC.x}
          cy={pLC.y}
          r="6"
          className="dash-node-highlight node-hl-lc"
          fill="none"
          stroke="#F89F1B"
        />
        <circle
          cx={pLC.x}
          cy={pLC.y}
          r="5"
          fill="#F89F1B"
          stroke="#101010"
          strokeWidth="2"
          className="dash-node-base node-lc"
        />
        <text
          x={cx}
          y={cy - maxRadius - 12}
          textAnchor="middle"
          fill="#F89F1B"
          fontSize="10"
          fontFamily="monospace"
          fontWeight="bold"
        >
          LC: {leetcodeSolved}
        </text>

        {/* Codeforces Node (Bottom Right) */}
        <circle
          cx={pCF.x}
          cy={pCF.y}
          r="6"
          className="dash-node-highlight node-hl-cf"
          fill="none"
          stroke="#38BDF8"
        />
        <circle
          cx={pCF.x}
          cy={pCF.y}
          r="5"
          fill="#38BDF8"
          stroke="#101010"
          strokeWidth="2"
          className="dash-node-base node-cf"
        />
        <text
          x={cx + Math.cos(angleCF) * (maxRadius + 14)}
          y={cy + Math.sin(angleCF) * (maxRadius + 14) + 4}
          textAnchor="start"
          fill="#38BDF8"
          fontSize="10"
          fontFamily="monospace"
          fontWeight="bold"
        >
          CF: {codeforcesSolved}
        </text>

        {/* CodeChef Node (Bottom Left) */}
        <circle
          cx={pCC.x}
          cy={pCC.y}
          r="6"
          className="dash-node-highlight node-hl-cc"
          fill="none"
          stroke="#F59E0B"
        />
        <circle
          cx={pCC.x}
          cy={pCC.y}
          r="5"
          fill="#F59E0B"
          stroke="#101010"
          strokeWidth="2"
          className="dash-node-base node-cc"
        />
        <text
          x={cx + Math.cos(angleCC) * (maxRadius + 14)}
          y={cy + Math.sin(angleCC) * (maxRadius + 14) + 4}
          textAnchor="end"
          fill="#FDBA74"
          fontSize="10"
          fontFamily="monospace"
          fontWeight="bold"
        >
          CC: {codechefSolved}
        </text>

        {/* Technical Coordinate Stamps & Telemetry Signal Bars */}
        <text x="14" y="22" fill="rgba(255,255,255,0.48)" fontSize="9" fontFamily="monospace">
          GRID: 28D // VERIFIED<tspan className="dash-telemetry-cursor">_</tspan>
        </text>
        <text x="14" y="34" fill="rgba(255,255,255,0.28)" fontSize="8" fontFamily="monospace">
          STREAK // {currentStreak}D
        </text>

        {/* 4-bar miniature signal level indicator */}
        <g className="dash-signal-bars" transform={`translate(${width - 46}, 12)`}>
          <rect x="0" y="8" width="2.5" height="4" fill="#38BDF8" className="sig-bar bar-1" />
          <rect x="5" y="5.5" width="2.5" height="6.5" fill="#38BDF8" className="sig-bar bar-2" />
          <rect x="10" y="3" width="2.5" height="9" fill="#38BDF8" className="sig-bar bar-3" />
          <rect x="15" y="0" width="2.5" height="12" fill="#FF5A36" className="sig-bar bar-4" />
        </g>

        <text x={width - 54} y="22" textAnchor="end" fill="rgba(255,255,255,0.48)" fontSize="9" fontFamily="monospace">
          SOLVES // {totalSolved}
        </text>
        <text x={width - 14} y="34" textAnchor="end" fill="rgba(255,255,255,0.28)" fontSize="8" fontFamily="monospace">
          LAT: 22.7°N
        </text>
      </svg>

      {/* Optional self-contained bottom stats */}
      {showBottomStats && (
        <div className="dash-telemetry-bottom">
          <div className="telemetry-stat">
            <span>LeetCode</span>
            <b><CountUpNumber value={leetcodeSolved} /></b>
          </div>
          <div className="telemetry-stat">
            <span>Codeforces</span>
            <b><CountUpNumber value={codeforcesSolved} /></b>
          </div>
          <div className="telemetry-stat">
            <span>CodeChef</span>
            <b><CountUpNumber value={codechefSolved} /></b>
          </div>
        </div>
      )}
    </div>
  );
}
