import { useEffect, useMemo, useRef, useState } from 'react';
import { initials, tagOf } from './data.js';

const MAX_RESULTS = 6;

// Search-as-you-type over registered students; picking one jumps to their row.
export default function SearchBox({ onPick, students = [] }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const term = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (!term || !Array.isArray(students)) return [];
    const starts = [];
    const contains = [];
    students.forEach((d) => {
      const n = String(d.n || d.name || '').toLowerCase();
      if (!n) return;
      if (n.startsWith(term) || n.split(/\s+/).some((w) => w.startsWith(term))) {
        starts.push(d);
      } else if (n.includes(term)) {
        contains.push(d);
      }
    });
    return [...starts, ...contains].slice(0, MAX_RESULTS);
  }, [term, students]);

  useEffect(() => setActive(0), [term]);

  // Close when clicking outside.
  useEffect(() => {
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  const pick = (d) => {
    setOpen(false);
    setQ('');
    inputRef.current?.blur();
    onPick(d.n || d.name);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      if (open && results[active]) {
        e.preventDefault();
        pick(results[active]);
      }
    } else if (e.key === 'Escape') {
      if (q) setQ('');
      setOpen(false);
    }
  };

  const showList = open && term.length > 0;

  return (
    <div className="srch" ref={wrapRef} role="search">
      <svg className="srch-ic" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <input
        ref={inputRef}
        id="srch-in"
        type="text"
        value={q}
        placeholder="Find a student…"
        autoComplete="off"
        spellCheck="false"
        aria-label="Search students by name"
        aria-expanded={showList}
        aria-controls="srch-list"
        aria-autocomplete="list"
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {q && (
        <button type="button" className="srch-x" aria-label="Clear search" onClick={() => { setQ(''); inputRef.current?.focus(); }}>
          ×
        </button>
      )}
      {showList && (
        <ul className="srch-list" id="srch-list" role="listbox">
          {results.length === 0 ? (
            <li className="srch-empty">No student matches “{q.trim()}”</li>
          ) : (
            results.map((d, i) => (
              <li
                key={d.id || d.n || i}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'on' : ''}
                onMouseEnter={() => setActive(i)}
                onPointerDown={(e) => {
                  e.preventDefault();
                  pick(d);
                }}
              >
                <span className="av">
                  {d.avatar ? (
                    <img src={d.avatar} alt={d.n || d.name} referrerPolicy="no-referrer" />
                  ) : (
                    initials(d.n || d.name)
                  )}
                </span>
                <span className="srch-t">
                  <b>{d.n || d.name}</b>
                  <small>{tagOf(d)}</small>
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
