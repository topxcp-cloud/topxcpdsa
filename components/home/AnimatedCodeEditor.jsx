'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  RefreshCw, 
  Play, 
  Pause, 
  Copy, 
  Check, 
  RotateCcw, 
  Code2, 
  Sparkles,
  Cpu
} from 'lucide-react';

const PROBLEMS = [
  {
    id: 'kadane',
    filename: 'daily_challenge.cpp',
    title: 'Kadane’s Max Subarray Sum',
    complexity: 'O(N) Time • O(1) Space',
    testcases: '48 / 48 Passed',
    runtime: '3 ms',
    runtimeBeats: '98.7%',
    memory: '13.1 MB',
    memoryBeats: '92.4%',
    lines: [
      {
        num: 1,
        tokens: [
          { text: '#include ', type: 'directive' },
          { text: '<vector>', type: 'string' },
          { text: '  // O(N) Kadane optimal', type: 'comment' }
        ]
      },
      {
        num: 2,
        tokens: [
          { text: '#include ', type: 'directive' },
          { text: '<algorithm>', type: 'string' }
        ]
      },
      {
        num: 3,
        tokens: [
          { text: 'using namespace ', type: 'keyword' },
          { text: 'std', type: 'variable' },
          { text: ';', type: 'punct' }
        ]
      },
      {
        num: 4,
        tokens: [{ text: '', type: 'plain' }]
      },
      {
        num: 5,
        tokens: [
          { text: 'int ', type: 'type' },
          { text: 'maxSubArray', type: 'function' },
          { text: '(', type: 'punct' },
          { text: 'const vector', type: 'type' },
          { text: '<', type: 'punct' },
          { text: 'int', type: 'type' },
          { text: '>& ', type: 'punct' },
          { text: 'nums', type: 'variable' },
          { text: ') {', type: 'punct' }
        ]
      },
      {
        num: 6,
        tokens: [
          { text: '    int ', type: 'type' },
          { text: 'cur = nums[0], maxAns = nums[0];', type: 'plain' }
        ]
      },
      {
        num: 7,
        tokens: [
          { text: '    for ', type: 'keyword' },
          { text: '(', type: 'punct' },
          { text: 'size_t ', type: 'type' },
          { text: 'i = 1; i < nums.size(); ++i) {', type: 'plain' }
        ]
      },
      {
        num: 8,
        tokens: [
          { text: '        cur = ', type: 'plain' },
          { text: 'std::max', type: 'function' },
          { text: '(nums[i], cur + nums[i]);', type: 'plain' }
        ]
      },
      {
        num: 9,
        tokens: [
          { text: '        maxAns = ', type: 'plain' },
          { text: 'std::max', type: 'function' },
          { text: '(maxAns, cur);', type: 'plain' }
        ]
      },
      {
        num: 10,
        tokens: [{ text: '    }', type: 'punct' }]
      },
      {
        num: 11,
        tokens: [
          { text: '    return ', type: 'keyword' },
          { text: 'maxAns', type: 'variable' },
          { text: ';', type: 'punct' }
        ]
      },
      {
        num: 12,
        tokens: [{ text: '}', type: 'punct' }]
      }
    ]
  },
  {
    id: 'dijkstra',
    filename: 'dijkstra_shortest_path.cpp',
    title: 'Dijkstra Priority Queue',
    complexity: 'O((V + E) log V)',
    testcases: '62 / 62 Passed',
    runtime: '18 ms',
    runtimeBeats: '96.2%',
    memory: '24.8 MB',
    memoryBeats: '89.5%',
    lines: [
      {
        num: 1,
        tokens: [
          { text: '#include ', type: 'directive' },
          { text: '<queue>', type: 'string' },
          { text: '   // Min-heap Dijkstra', type: 'comment' }
        ]
      },
      {
        num: 2,
        tokens: [
          { text: 'using ', type: 'keyword' },
          { text: 'pii = pair<int, int>;', type: 'plain' }
        ]
      },
      {
        num: 3,
        tokens: [{ text: '', type: 'plain' }]
      },
      {
        num: 4,
        tokens: [
          { text: 'vector<int> ', type: 'type' },
          { text: 'dijkstra', type: 'function' },
          { text: '(', type: 'punct' },
          { text: 'int ', type: 'type' },
          { text: 'src, ', type: 'plain' },
          { text: 'int ', type: 'type' },
          { text: 'n, ', type: 'plain' },
          { text: 'vector<vector<pii>>& ', type: 'type' },
          { text: 'adj', type: 'variable' },
          { text: ') {', type: 'punct' }
        ]
      },
      {
        num: 5,
        tokens: [
          { text: '    vector<int> ', type: 'type' },
          { text: 'dist(n, 1e9); dist[src] = 0;', type: 'plain' }
        ]
      },
      {
        num: 6,
        tokens: [
          { text: '    priority_queue<pii, vector<pii>, greater<pii>> ', type: 'type' },
          { text: 'pq;', type: 'variable' }
        ]
      },
      {
        num: 7,
        tokens: [
          { text: '    pq.push({0, src});', type: 'plain' }
        ]
      },
      {
        num: 8,
        tokens: [
          { text: '    while ', type: 'keyword' },
          { text: '(!pq.empty()) {', type: 'plain' }
        ]
      },
      {
        num: 9,
        tokens: [
          { text: '        auto [d, u] = pq.top(); pq.pop();', type: 'plain' }
        ]
      },
      {
        num: 10,
        tokens: [
          { text: '        if (d > dist[u]) continue;', type: 'plain' }
        ]
      },
      {
        num: 11,
        tokens: [
          { text: '        for (auto& [v, w] : adj[u])', type: 'plain' }
        ]
      },
      {
        num: 12,
        tokens: [
          { text: '            if (dist[u] + w < dist[v]) {', type: 'plain' }
        ]
      },
      {
        num: 13,
        tokens: [
          { text: '                dist[v] = dist[u] + w;', type: 'plain' }
        ]
      },
      {
        num: 14,
        tokens: [
          { text: '                pq.push({dist[v], v});', type: 'plain' }
        ]
      },
      {
        num: 15,
        tokens: [{ text: '            }', type: 'punct' }]
      },
      {
        num: 16,
        tokens: [{ text: '    }', type: 'punct' }]
      },
      {
        num: 17,
        tokens: [
          { text: '    return ', type: 'keyword' },
          { text: 'dist;', type: 'plain' }
        ]
      },
      {
        num: 18,
        tokens: [{ text: '}', type: 'punct' }]
      }
    ]
  },
  {
    id: 'dp',
    filename: 'longest_increasing_subsequence.cpp',
    title: 'Patience Sort LIS',
    complexity: 'O(N log N) Binary Search',
    testcases: '54 / 54 Passed',
    runtime: '4 ms',
    runtimeBeats: '99.1%',
    memory: '10.5 MB',
    memoryBeats: '95.8%',
    lines: [
      {
        num: 1,
        tokens: [
          { text: '#include ', type: 'directive' },
          { text: '<vector>', type: 'string' },
          { text: '  // Patience sorting LIS', type: 'comment' }
        ]
      },
      {
        num: 2,
        tokens: [
          { text: '#include ', type: 'directive' },
          { text: '<algorithm>', type: 'string' }
        ]
      },
      {
        num: 3,
        tokens: [
          { text: 'using namespace ', type: 'keyword' },
          { text: 'std', type: 'variable' },
          { text: ';', type: 'punct' }
        ]
      },
      {
        num: 4,
        tokens: [{ text: '', type: 'plain' }]
      },
      {
        num: 5,
        tokens: [
          { text: 'int ', type: 'type' },
          { text: 'lengthOfLIS', type: 'function' },
          { text: '(', type: 'punct' },
          { text: 'vector<int>& ', type: 'type' },
          { text: 'nums', type: 'variable' },
          { text: ') {', type: 'punct' }
        ]
      },
      {
        num: 6,
        tokens: [
          { text: '    vector<int> ', type: 'type' },
          { text: 'tails;', type: 'variable' }
        ]
      },
      {
        num: 7,
        tokens: [
          { text: '    for ', type: 'keyword' },
          { text: '(int x : nums) {', type: 'plain' }
        ]
      },
      {
        num: 8,
        tokens: [
          { text: '        auto it = ', type: 'plain' },
          { text: 'lower_bound', type: 'function' },
          { text: '(tails.begin(), tails.end(), x);', type: 'plain' }
        ]
      },
      {
        num: 9,
        tokens: [
          { text: '        if (it == tails.end()) tails.push_back(x);', type: 'plain' }
        ]
      },
      {
        num: 10,
        tokens: [
          { text: '        else *it = x;', type: 'plain' }
        ]
      },
      {
        num: 11,
        tokens: [{ text: '    }', type: 'punct' }]
      },
      {
        num: 12,
        tokens: [
          { text: '    return ', type: 'keyword' },
          { text: 'tails.size();', type: 'plain' }
        ]
      },
      {
        num: 13,
        tokens: [{ text: '}', type: 'punct' }]
      }
    ]
  }
];

export default function AnimatedCodeEditor() {
  const [selectedProblemIdx, setSelectedProblemIdx] = useState(0);
  const [lineCount, setLineCount] = useState(0);
  const [statusState, setStatusState] = useState('typing'); // 'typing' | 'running' | 'accepted'
  const [isPaused, setIsPaused] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const activeProblem = PROBLEMS[selectedProblemIdx];
  const totalLines = activeProblem.lines.length;

  // Handle system reduced motion preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mq.matches);
      const listener = (e) => setReducedMotion(e.matches);
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
  }, []);

  // Reset when problem changes
  const switchProblem = (idx) => {
    setSelectedProblemIdx(idx);
    setLineCount(0);
    setStatusState('typing');
  };

  const handleReset = () => {
    setLineCount(0);
    setStatusState('typing');
  };

  const handleCopy = () => {
    const rawCode = activeProblem.lines
      .map(l => l.tokens.map(t => t.text).join(''))
      .join('\n');
    navigator.clipboard?.writeText(rawCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  // Typing animation driver
  useEffect(() => {
    if (reducedMotion) {
      setLineCount(totalLines);
      setStatusState('accepted');
      return;
    }

    if (isPaused) return;

    let timeoutId;

    if (statusState === 'typing') {
      if (lineCount < totalLines) {
        timeoutId = setTimeout(() => {
          setLineCount((prev) => prev + 1);
        }, 140);
      } else {
        // Switch to RUNNING state
        timeoutId = setTimeout(() => {
          setStatusState('running');
        }, 400);
      }
    } else if (statusState === 'running') {
      // Running test cases simulated
      timeoutId = setTimeout(() => {
        setStatusState('accepted');
      }, 900);
    } else if (statusState === 'accepted') {
      // Hold for 4.5 seconds on accepted, then cycle to next problem or replay
      timeoutId = setTimeout(() => {
        setSelectedProblemIdx((prev) => (prev + 1) % PROBLEMS.length);
        setLineCount(0);
        setStatusState('typing');
      }, 4500);
    }

    return () => clearTimeout(timeoutId);
  }, [lineCount, statusState, isPaused, reducedMotion, totalLines, selectedProblemIdx]);

  const visibleLines = reducedMotion ? activeProblem.lines : activeProblem.lines.slice(0, lineCount);
  const activeLineIdx = reducedMotion ? -1 : lineCount - 1;

  return (
    <div className="hero-editor-wrapper" aria-label="Animated C++ competitive programming code editor">
      <div className="hero-editor-frame">
        {/* Top Window Bar */}
        <div className="editor-top-bar">
          <div className="editor-window-controls" aria-hidden="true">
            <span className="dot dot-close" />
            <span className="dot dot-minimize" />
            <span className="dot dot-expand" />
          </div>

          {/* Active File Tab */}
          <div className="editor-tab-pill">
            <span className="tab-lang-tag">C++</span>
            <span className="tab-filename">{activeProblem.filename}</span>
          </div>

          {/* Execution Status Badge */}
          <div className="editor-top-actions">
            {statusState === 'running' && (
              <span className="execution-badge badge-running">
                <span className="status-pulse-dot" />
                <span>RUNNING</span>
              </span>
            )}
            {statusState === 'accepted' && (
              <span className="execution-badge badge-accepted">
                <span className="status-dot-solid" />
                <span>ACCEPTED</span>
              </span>
            )}
            {statusState === 'typing' && (
              <span className="execution-badge badge-typing">
                <span className="status-pulse-dot" />
                <span>EDITING</span>
              </span>
            )}
          </div>
        </div>

        {/* Problem Selector Bar */}
        <div className="editor-sub-nav">
          <div className="editor-pills-list" role="tablist">
            {PROBLEMS.map((prob, idx) => (
              <button
                key={prob.id}
                type="button"
                role="tab"
                aria-selected={idx === selectedProblemIdx}
                className={`problem-tab-btn ${idx === selectedProblemIdx ? 'active' : ''}`}
                onClick={() => switchProblem(idx)}
              >
                {prob.id === 'kadane' && 'Subarray Sum'}
                {prob.id === 'dijkstra' && 'Dijkstra Path'}
                {prob.id === 'dp' && 'Patience DP'}
              </button>
            ))}
          </div>

          <div className="editor-toolbar-actions">
            <button
              type="button"
              className="editor-tool-btn"
              onClick={() => setIsPaused(!isPaused)}
              title={isPaused ? "Play animation" : "Pause animation"}
              aria-label={isPaused ? "Play" : "Pause"}
            >
              {isPaused ? <Play size={13} /> : <Pause size={13} />}
            </button>
            <button
              type="button"
              className="editor-tool-btn"
              onClick={handleReset}
              title="Reset typing animation"
              aria-label="Reset"
            >
              <RotateCcw size={13} />
            </button>
            <button
              type="button"
              className="editor-tool-btn"
              onClick={handleCopy}
              title="Copy C++ solution"
              aria-label="Copy"
            >
              {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        {/* Code Viewport */}
        <div className="editor-code-viewport">
          <pre className="editor-pre">
            <code>
              {visibleLines.map((line, idx) => {
                const isActive = idx === activeLineIdx && statusState === 'typing';
                return (
                  <div
                    key={line.num}
                    className={`editor-code-row ${isActive ? 'is-active-row' : ''}`}
                  >
                    <span className="editor-line-num" aria-hidden="true">
                      {line.num}
                    </span>
                    <span className="editor-line-tokens">
                      {line.tokens.map((token, tIdx) => (
                        <span key={tIdx} className={`token token-${token.type}`}>
                          {token.text}
                        </span>
                      ))}
                      {isActive && <span className="editor-typing-cursor" aria-hidden="true" />}
                    </span>
                  </div>
                );
              })}
              {/* Ghost rows to keep editor height rock-solid */}
              {Array.from({ length: Math.max(0, 13 - visibleLines.length) }).map((_, i) => (
                <div key={`ghost-${i}`} className="editor-code-row is-ghost-row" aria-hidden="true">
                  <span className="editor-line-num">{visibleLines.length + i + 1}</span>
                  <span className="editor-line-tokens">&nbsp;</span>
                </div>
              ))}
            </code>
          </pre>
        </div>

        {/* Execution Drawer / Status Drawer */}
        <div className="editor-status-bar">
          {statusState === 'typing' && (
            <div className="status-item status-typing">
              <span className="status-pulse-dot" />
              <span>Editing {activeProblem.title} · Line {Math.min(lineCount + 1, totalLines)}</span>
            </div>
          )}

          {statusState === 'running' && (
            <div className="status-item status-running">
              <RefreshCw size={12} className="spin-fast" aria-hidden="true" />
              <span>Running all hidden testcases (clang++ -O3 -std=c++20)...</span>
            </div>
          )}

          {statusState === 'accepted' && (
            <div className="status-accepted-wrap">
              <div className="status-verdict-pill">
                <CheckCircle2 size={13} className="verdict-check-icon" aria-hidden="true" />
                <span className="verdict-label">Accepted</span>
              </div>
              <div className="status-metrics">
                <span className="metric-tag">
                  Tests: <b className="metric-val">{activeProblem.testcases}</b>
                </span>
                <span className="metric-sep">/</span>
                <span className="metric-tag">
                  Runtime: <b className="metric-val">{activeProblem.runtime}</b> <small>({activeProblem.runtimeBeats})</small>
                </span>
                <span className="metric-sep">/</span>
                <span className="metric-tag">
                  Memory: <b className="metric-val">{activeProblem.memory}</b> <small>({activeProblem.memoryBeats})</small>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Ribbon */}
        <div className="editor-footer-ribbon">
          <div className="footer-ribbon-left">
            <Cpu size={12} className="text-brand-orange" aria-hidden="true" />
            <span className="editor-motto">TOP-X RUNTIME ENGINE</span>
          </div>
          <span className="editor-algo-tag">{activeProblem.complexity}</span>
        </div>
      </div>
    </div>
  );
}
