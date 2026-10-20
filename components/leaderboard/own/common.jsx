import { useEffect, useState } from 'react';
import FLAME from './flame.js';

export const Flame = () => <img className="fl" src={FLAME} alt="fire" />;

export const YouTag = () => <span className="you">YOU</span>;

export function FriendButton() {
  return null;
}

// Rank movement indicator (up / down / unchanged / new).
export function Movement({ index, prevRank, isNew }) {
  let kind;
  let text;
  let label;
  if (isNew) {
    kind = 'new';
    text = 'NEW';
    label = 'New on the leaderboard';
  } else {
    const x = prevRank - (index + 1);
    if (x > 0) {
      kind = 'up';
      text = '\u2191 ' + x;
      label = 'Up ' + x + (x > 1 ? ' places' : ' place');
    } else if (x < 0) {
      kind = 'dn';
      text = '\u2193 ' + -x;
      label = 'Down ' + -x + (x < -1 ? ' places' : ' place');
    } else {
      kind = 'eq';
      text = '\u2014';
      label = 'No change';
    }
  }
  return (
    <span className={'mv ' + kind} title={label} aria-label={label}>
      {text}
    </span>
  );
}

// Number that counts up (1s, ease-out cubic) once `run` becomes true.
export function Count({ to, run, delay = 0, animate = true }) {
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion:reduce)').matches;
  const skip = !animate || reduce;
  const [v, setV] = useState(skip ? to : 0);

  useEffect(() => {
    if (skip) {
      setV(to);
      return undefined;
    }
    if (!run) return undefined;
    let raf = 0;
    const timer = setTimeout(() => {
      const t0 = performance.now();
      const frame = (n) => {
        const p = Math.min((n - t0) / 1000, 1);
        setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    }, delay * 1000);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [run, to, delay, skip]);

  return v;
}

// Trophy for #1, ribbon medal for #2 / #3.
export function Badge({ index }) {
  const C = [
    ['#F6D36B', '#E8B53A', '#8F6200'],
    ['#EEF1F6', '#A3AEC0', '#5F6A7D'],
    ['#F3C3A0', '#C47F4E', '#8F4F22'],
  ][index];
  const id = 'bg' + index;
  const defs = (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={C[0]} />
        <stop offset="1" stopColor={C[1]} />
      </linearGradient>
    </defs>
  );

  if (index === 0) {
    return (
      <span className="pc-badge" aria-hidden="true">
        <svg viewBox="0 0 64 64">
          {defs}
          <path d="M17 11H9v4c0 7 4 11 10 12" fill="none" stroke={C[1]} strokeWidth="3.4" strokeLinecap="round" />
          <path d="M47 11h8v4c0 7-4 11-10 12" fill="none" stroke={C[1]} strokeWidth="3.4" strokeLinecap="round" />
          <path d="M16 7h32v15c0 9.5-7 16-16 17-9-1-16-7.5-16-17z" fill={`url(#${id})`} />
          <path d="M21 11h5v12c0 4 1.5 7 4 9-6-1.5-9-5.5-9-11z" fill="#fff" opacity=".4" />
          <rect x="29" y="39" width="6" height="9" fill={C[2]} />
          <rect x="21" y="48" width="22" height="6" rx="2" fill={`url(#${id})`} />
          <rect x="17" y="54" width="30" height="4" rx="2" fill={C[2]} />
          <polygon
            points="32,14.5 33.6,18.8 38.2,19 34.6,21.8 35.8,26.3 32,23.7 28.2,26.3 29.4,21.8 25.8,19 30.4,18.8"
            fill="#fff"
            opacity=".95"
          />
        </svg>
      </span>
    );
  }

  return (
    <span className="pc-badge" aria-hidden="true">
      <svg viewBox="0 0 64 64">
        {defs}
        <polygon points="18,4 30,4 38,30 26,30" fill="#FF5A36" />
        <polygon points="46,4 34,4 26,30 38,30" fill="#D93A17" />
        <circle cx="32" cy="41" r="18" fill={`url(#${id})`} />
        <circle cx="32" cy="41" r="13" fill="none" stroke={C[2]} strokeOpacity=".45" strokeWidth="2" />
        <text
          x="32"
          y="48"
          textAnchor="middle"
          fontFamily="Geist,Inter,sans-serif"
          fontWeight="800"
          fontSize="20"
          fill={C[2]}
        >
          {index + 1}
        </text>
      </svg>
    </span>
  );
}
