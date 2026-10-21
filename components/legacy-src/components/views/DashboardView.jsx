'use client';
import React, { useState } from 'react';

/** DashboardView: React-owned view markup. Feature data/actions are progressively isolated in feature hooks. */
export default function DashboardView({ active = false, user = null }) {
  const [statsPlatform, setStatsPlatform] = useState('all');
  const platformStats = user?.syncedStats || {};
  const solvedByPlatform = {
    leetcode: Number(platformStats.leetcode?.solved) || 0,
    codeforces: Number(platformStats.codeforces?.acceptedProblemsLifetime ?? platformStats.codeforces?.acceptedProblemsLast10000) || 0,
    codechef: Number(platformStats.codechef?.solved) || 0
  };
  const codeforcesSolvedKnown = !user?.handles?.codeforces || platformStats.codeforces?.solvedCountComplete === true;
  const shownSolved = statsPlatform === 'all'
    ? (codeforcesSolvedKnown ? solvedByPlatform.leetcode + solvedByPlatform.codeforces + solvedByPlatform.codechef : '—')
    : (statsPlatform === 'codeforces' && !codeforcesSolvedKnown ? '—' : solvedByPlatform[statsPlatform]);
  const ratingSummary = statsPlatform === 'all'
    ? `LC rank ${platformStats.leetcode?.ranking ? `#${platformStats.leetcode.ranking}` : '—'} · CF ${platformStats.codeforces?.rating || '—'} · CC ${platformStats.codechef?.currentRating || platformStats.codechef?.rating || '—'}`
    : statsPlatform === 'leetcode'
      ? `Global rank ${platformStats.leetcode?.ranking ? `#${platformStats.leetcode.ranking}` : '—'}`
      : statsPlatform === 'codeforces'
        ? `${platformStats.codeforces?.rank || 'Unrated'} · max ${platformStats.codeforces?.maxRating || 0}`
        : `${platformStats.codechef?.stars || 'Unrated'} · global rank ${platformStats.codechef?.globalRank || '—'}`;
  const shownRating = statsPlatform === 'leetcode'
    ? (platformStats.leetcode?.ranking ? `#${platformStats.leetcode.ranking}` : '—')
    : statsPlatform === 'codeforces'
      ? (platformStats.codeforces?.rating || '—')
      : statsPlatform === 'codechef'
        ? (platformStats.codechef?.currentRating || platformStats.codechef?.rating || '—')
        : 'All';
  return (
<section className={`tab-view ${active ? 'active' : ''}`} id="view-dashboard">
      
      <div className="dash-hero">
        <div className="dash-hero-left">
          <div className="view-wrap" style={{maxWidth: 'none', paddingLeft: 'var(--pad)', paddingRight: '0'}}>
            <h1 className="dash-hero-greeting"><span id="dash-greeting-time">Welcome to TOP-X.</span>Continue where you left off.</h1>
            <div className="dash-focus-grid">
              <div>
                <p className="sm">Current focus</p>
                <h3 id="dash-focus-title">Binary Search</h3>
                <div className="ticks-bar" id="dash-focus-ticks" />
                <p className="sm"><b className="num" id="dash-focus-progress" style={{color: 'var(--ink)'}}>3 / 8 concepts</b></p>
                </div>
              <div>
                <p className="sm">Next problem</p>
                <h3 id="dash-next-title">Aggressive Cows</h3>
                <p className="sm" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <span className="diff-pill med" id="dash-next-diff-pill">Medium</span>
                  <span id="dash-next-topic">Binary Search</span>
                  </p>
                </div>
              </div>
            <p className="dash-why-text" id="dash-why-text">You've completed basic binary search. This problem introduces binary search on the answer domain with predicate monotonicity.</p>
            <div className="dash-hero-actions">
              <a className="btn-primary" href="#vault">Solve problem →</a>
              <a className="btn-link" href="#roadmaps">View full roadmap →</a>
              </div>
            </div>
          </div>
        
        <div className="dash-flow-line">
          <span><i />Learn</span>
          <span className="active"><i />Practice</span>
          <span><i />Track</span>
          <span><i />Compete</span>
          <span><i />Upsolve</span>
          <span><i />Improve</span>
          </div>
        </div>
      
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', margin: '0 0 12px' }}>
        <div><h3 style={{ margin: 0 }}>Coding Stats</h3><p className="sm" style={{ margin: '4px 0 0', color: 'var(--mute)' }}>Unified overview or a single platform.</p></div>
        <div role="group" aria-label="Dashboard stats platform" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {[['all', 'All platforms'], ['leetcode', 'LeetCode'], ['codeforces', 'Codeforces'], ['codechef', 'CodeChef']].map(([key, label]) => <button key={key} type="button" onClick={() => setStatsPlatform(key)} aria-pressed={statsPlatform === key} className="pill-btn" style={{ border: '1px solid var(--line)', borderRadius: '999px', padding: '7px 11px', background: statsPlatform === key ? 'var(--ac)' : 'var(--surface-alt)', color: statsPlatform === key ? '#fff' : 'var(--ink)', cursor: 'pointer' }}>{label}</button>)}
        </div>
      </div>
      <div className="dash-stats-grid">
        <div className="dash-stat-box">
          <div className="val num"><span id="stat-solved-num">{shownSolved}</span></div>
          <h4>{statsPlatform === 'all' ? 'Combined platform solves' : `${statsPlatform === 'leetcode' ? 'LeetCode' : statsPlatform === 'codeforces' ? 'Codeforces' : 'CodeChef'} solved`}</h4>
          <p className="delta" id="stat-solved-delta">{statsPlatform === 'all' ? 'Platform counts are summed; cross-platform overlap may exist and CF history is capped at 10k submissions.' : 'Reported by selected platform provider.'}</p>
          </div>
        <div className="dash-stat-box">
          <div className="val num"><span id="stat-streak-num">0</span><small>d</small></div>
          <h4>Day streak</h4>
          <p className="delta" id="stat-streak-delta">Streak not tracked yet</p>
          </div>
        <div className="dash-stat-box">
          <div className="val num"><span id="stat-prog-num">0</span><small>%</small></div>
          <h4>Roadmap progress</h4>
          <p className="delta" id="stat-prog-delta">No progress recorded yet</p>
          </div>
        <div className="dash-stat-box">
          <div className="val num"><span id="stat-rating-num">{shownRating}</span></div>
          <h4>{statsPlatform === 'all' ? 'Platform rating snapshot' : 'Platform rating / rank'}</h4>
          <p className="delta" id="stat-rating-delta">{ratingSummary}</p>
          </div>
        </div>
      
      <div className="dash-split-row">
        
        <div className="dash-split-col">
          <div className="split-col-head">
            <h3>Curriculum Roadmap</h3>
            <a href="#roadmaps">Explore all tracks →</a>
            </div>
          <svg id="rp-svg" viewBox="0 -10 780 340" />
          <div id="dag-tip" />
          <p className="sm" style={{marginTop: '14px', display: 'flex', justifyContent: 'space-between'}}>
            <span>Hover nodes for syllabus breakdown</span>
            <span id="dash-active-node-label" style={{color: 'var(--ac)', fontWeight: '600'}}>Active Node: Arrays</span>
            </p>
          </div>
        
        <div className="dash-split-col">
          <div className="split-col-head">
            <h3>Next Contest</h3>
            <a href="https://codeforces.com/contests" target="_blank" rel="noopener">All contests →</a>
            </div>
          <p className="contest-name" id="contest-name-txt">Loading upcoming contests…</p>
          <div className="contest-countdown num">
            <small>Starts in</small>
            <span id="contest-tick-h">--</span><small>h</small>
            <span id="contest-tick-m">--</span><small>m</small>
            <span className="sec-txt" id="contest-tick-s">--</span>
            </div>
          <div className="contest-meta-grid">
            <span>Platform</span><span id="contest-plat-txt">Codeforces</span>
            <span>Format</span><span id="contest-format-txt">Rated · 2 hours</span>
            <span>Starts</span><span id="contest-starts-txt">Fetching live schedule</span>
            </div>
          <a className="btn-primary" href="https://codeforces.com/contests" target="_blank" rel="noopener" style={{fontSize: '13px', padding: '9px 18px'}}>Register Contest ↗</a>
          <div className="contest-last-box">
            <p className="sm" id="contest-last-name">Last contest, Round #1038</p>
            <div className="contest-last-grid">
              <div><b className="num" id="contest-last-rank">#1,284</b><span className="sm">Rank</span></div>
              <div><b className="num accent" id="contest-last-delta">+37</b><span className="sm">Rating</span></div>
              <div><b className="num" id="contest-last-solved">3 / 6</b><span className="sm">Solved</span></div>
              </div>
            </div>
          </div>
        </div>
      
      <div className="dash-split-row">
        
        <div className="dash-split-col">
          <div className="split-col-head">
            <h3>Recent Problems</h3>
            <a href="#vault">View Problem Vault →</a>
            </div>
          <table className="simple-table">
            <thead>
              <tr>
                <th>Problem</th>
                <th>Topic</th>
                <th>Difficulty</th>
                <th>Status</th>
                <th>Time</th>
                </tr>
              </thead>
            <tbody id="dash-recent-tbody" />
            </table>
          </div>
        
        <div className="dash-split-col">
          <div className="split-col-head">
            <h3>Your Standing</h3>
            <span className="sm">Indian Institute of Information Technology</span>
            </div>
          <div id="dash-college-ranks" />
          <p className="rank-delta-txt" id="dash-rank-delta" />
          <a className="btn-primary" href="#leaderboard" style={{fontSize: '13px', padding: '9px 18px'}}>View Full Leaderboard →</a>
          </div>
        </div>
      
      <section className="dash-act-section">
        <div className="dash-act-head">
          <h3>Activity Trajectory<span>182-Day Continuum</span></h3>
          <div className="stat-num num"><span id="dash-act-streak">0</span><small>day streak</small></div>
          <div className="stat-num num"><span id="dash-act-active">0</span><small>active days</small></div>
          <div className="stat-num num"><span id="dash-act-solved">0</span><small>problems solved</small></div>
          </div>
        <svg id="act-svg" viewBox="0 0 1200 172" />
        <div id="act-tip" />
        <div className="act-legend">
          <span><b>Problems solved:</b></span>
          <span><i style={{width: '10px', height: '10px', background: '#FFB9A8', display: 'inline-block'}} /> 1</span>
          <span><i style={{width: '10px', height: '10px', background: '#FF8C6E', display: 'inline-block'}} /> 2</span>
          <span><i style={{width: '10px', height: '10px', background: '#FF5A36', display: 'inline-block'}} /> 3+</span>
          <span><i style={{width: '3px', height: '11px', background: '#D6D6D0', display: 'inline-block'}} /> Submissions</span>
          <span><i style={{width: '9px', height: '9px', borderRadius: '50%', border: '1.5px solid currentColor', display: 'inline-block'}} /> Contest day</span>
          <span style={{marginLeft: 'auto'}}>Scrub cursor across chart for daily debrief</span>
          </div>
        </section>
      
      <div className="dash-proto-bar">
        <span><b>Interactive Prototype Simulator:</b> Test various student learning states & progress bars</span>
        <div className="proto-controls">
          <span>Switch User:</span>
          <button className="proto-btn active" data-user="A">User A (Binary Search)</button>
          <button className="proto-btn" data-user="B">User B (Linked List)</button>
          <button className="proto-btn" data-user="C">User C (Dynamic Prog)</button>
          <button className="proto-btn btn-sim-solve" id="btn-sim-solve">⚡ Simulate Solving Problem</button>
          </div>
        </div>
      </section>
  );
}
