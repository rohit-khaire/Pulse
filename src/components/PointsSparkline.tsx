'use client';

import React from 'react';
import { usePulseStore } from '@/lib/store';
import { teamPoints } from '@/lib/engine/points';

export function PointsSparkline() {
  const { frames, cursor, myTeam, config } = usePulseStore();

  if (!myTeam || frames.length === 0 || cursor === 0) return null;

  // Sample points every 10 frames or at key overs up to cursor
  const step = Math.max(1, Math.floor(cursor / 25));
  const pointsData: number[] = [];

  for (let i = 0; i <= cursor; i += step) {
    const f = frames[i];
    const pts = teamPoints(f.points, myTeam, config).total;
    pointsData.push(pts);
  }

  // Ensure current cursor point is the last point
  const currentPts = teamPoints(frames[cursor].points, myTeam, config).total;
  if (pointsData[pointsData.length - 1] !== currentPts) {
    pointsData.push(currentPts);
  }

  if (pointsData.length < 2) return null;

  const min = Math.min(...pointsData);
  const max = Math.max(...pointsData, min + 10);
  const range = max - min || 1;

  const width = 140;
  const height = 36;
  const padding = 3;

  const pointsString = pointsData
    .map((val, idx) => {
      const x = padding + (idx / (pointsData.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((val - min) / range) * (height - 2 * padding);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const lastX = width - padding;
  const lastY = height - padding - ((currentPts - min) / range) * (height - 2 * padding);

  return (
    <div className="flex flex-col items-end">
      <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-0.5">
        Points Trend
      </div>
      <svg
        width={width}
        height={height}
        className="overflow-visible"
        viewBox={`0 0 ${width} ${height}`}
      >
        <defs>
          <linearGradient id="sparklineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polyline
          fill="none"
          stroke="#ef4444"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={pointsString}
        />
        <circle
          cx={lastX}
          cy={lastY}
          r="3"
          className="fill-red-500 stroke-white stroke-1"
        />
      </svg>
    </div>
  );
}

