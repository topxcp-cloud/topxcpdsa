'use client';
import React, { useMemo, useState } from 'react';

function indiaIsoDate(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getDaysForPastYear() {
  const todayParts = indiaIsoDate(new Date()).split('-').map(Number);
  const todayUtc = new Date(Date.UTC(todayParts[0], todayParts[1] - 1, todayParts[2], 12));
  const totalDays = 364 + todayUtc.getUTCDay();
  const days = [];

  for (let i = totalDays; i >= 0; i--) {
    const d = new Date(todayUtc);
    d.setUTCDate(todayUtc.getUTCDate() - i);
    days.push({
      date: d,
      isoDate: d.toISOString().slice(0, 10),
      dayOfWeek: d.getUTCDay(),
      month: d.getUTCMonth(),
      dayOfMonth: d.getUTCDate()
    });
  }
  return days;
}

export default function ContributionHeatmap({ dailyActivity = {}, platformFilter = 'all', onFilterChange }) {
  const [filter, setFilter] = useState(platformFilter);
  const [hoveredCell, setHoveredCell] = useState(null);

  const days = useMemo(() => getDaysForPastYear(), []);

  const handleFilter = (next) => {
    setFilter(next);
    if (onFilterChange) onFilterChange(next);
  };

  const getCount = (iso) => {
    const act = dailyActivity[iso];
    if (!act) return 0;
    if (filter === 'leetcode') return Number(act.leetcode) || 0;
    if (filter === 'codeforces') return Number(act.codeforces) || 0;
    if (filter === 'codechef') return Number(act.codechef) || 0;
    return (Number(act.leetcode) || 0) + (Number(act.codeforces) || 0) + (Number(act.codechef) || 0);
  };

  // Group days into weeks (columns of 7)
  const weeks = useMemo(() => {
    const result = [];
    let currentWeek = [];
    days.forEach((day, index) => {
      currentWeek.push(day);
      if (currentWeek.length === 7 || index === days.length - 1) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });
    return result;
  }, [days]);

  // Month labels to place on columns
  const monthLabels = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const labels = [];
    let lastMonth = -1;
    weeks.forEach((week, wIndex) => {
      const firstDay = week[0];
      if (firstDay && firstDay.month !== lastMonth && firstDay.dayOfMonth <= 14) {
        labels.push({ label: months[firstDay.month], weekIndex: wIndex });
        lastMonth = firstDay.month;
      }
    });
    return labels;
  }, [weeks]);

  // Colors according to intensity
  const getCellClass = (count) => {
    if (count <= 0) return 'heatmap-cell-0';
    if (count === 1) return 'heatmap-cell-1';
    if (count <= 3) return 'heatmap-cell-2';
    if (count <= 6) return 'heatmap-cell-3';
    return 'heatmap-cell-4';
  };

  return (
    <div className="contribution-heatmap-wrap">
      <div className="heatmap-header">
        <div className="heatmap-title-box">
          <h4>Submission Activity Heatmap</h4>
          <span className="sm">All submissions count, including rejected attempts · dates use IST</span>
        </div>
        <div className="heatmap-platform-pills" role="radiogroup" aria-label="Platform filter">
          <button
            type="button"
            className={`pill-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => handleFilter('all')}
          >
            All Platforms
          </button>
          <button
            type="button"
            className={`pill-btn ${filter === 'leetcode' ? 'active' : ''}`}
            onClick={() => handleFilter('leetcode')}
          >
            LeetCode
          </button>
          <button
            type="button"
            className={`pill-btn ${filter === 'codeforces' ? 'active' : ''}`}
            onClick={() => handleFilter('codeforces')}
          >
            Codeforces
          </button>
          <button
            type="button"
            className={`pill-btn ${filter === 'codechef' ? 'active' : ''}`}
            onClick={() => handleFilter('codechef')}
          >
            CodeChef
          </button>
        </div>
      </div>

      <div className="heatmap-scroll-area">
        <div className="heatmap-grid-container">
          {/* Month Labels Row */}
          <div className="heatmap-months-row">
            <div className="heatmap-weekday-spacer" />
            <div className="heatmap-months-track">
              {monthLabels.map((m, i) => (
                <span
                  key={i}
                  className="heatmap-month-label"
                  style={{ left: `${weeks.length > 0 ? (m.weekIndex / weeks.length) * 100 : 0}%` }}
                >
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          {/* Grid with Weekday Labels */}
          <div className="heatmap-days-area">
            <div className="heatmap-weekdays-col">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            <div className="heatmap-weeks-columns">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="heatmap-week-column">
                  {week.map((day) => {
                    const count = getCount(day.isoDate);
                    const act = dailyActivity[day.isoDate] || {};
                    return (
                      <div
                        key={day.isoDate}
                        className={`heatmap-cell ${getCellClass(count)}`}
                        onMouseEnter={() => setHoveredCell({ ...day, count, act })}
                        onMouseLeave={() => setHoveredCell(null)}
                        aria-label={`${count} submissions on ${day.isoDate}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip & Legend Bar */}
      <div className="heatmap-footer">
        <div className="heatmap-tooltip-readout">
          {hoveredCell ? (
            <div className="heatmap-live-tooltip">
              <strong>{hoveredCell.isoDate}:</strong>{' '}
              <span>{hoveredCell.count} {hoveredCell.count === 1 ? 'submission' : 'submissions'}</span>
              {hoveredCell.count > 0 && (
                <span className="heatmap-tooltip-breakdown">
                  {' '}(LC: {hoveredCell.act.leetcode || 0}, CF: {hoveredCell.act.codeforces || 0}, CC: {hoveredCell.act.codechef || 0})
                </span>
              )}
            </div>
          ) : (
            <span className="sm">Counts all submission attempts available from each platform provider</span>
          )}
        </div>

        <div className="heatmap-legend">
          <span className="sm">Less</span>
          <span className="heatmap-cell heatmap-cell-0" />
          <span className="heatmap-cell heatmap-cell-1" />
          <span className="heatmap-cell heatmap-cell-2" />
          <span className="heatmap-cell heatmap-cell-3" />
          <span className="heatmap-cell heatmap-cell-4" />
          <span className="sm">More</span>
        </div>
      </div>
    </div>
  );
}
