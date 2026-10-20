'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import './topx-preloader.css';

export default function TopxPreloader() {
  const [active, setActive] = useState(true);
  const [closing, setClosing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [wordStep, setWordStep] = useState(0);
  const [logoRevealed, setLogoRevealed] = useState(false);
  const [statusText, setStatusText] = useState('WORKSPACE // STARTING CODING ARENA...');

  const exitTimeoutRef = useRef(null);

  // Show the intro on every page load
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.replayTopxIntro = () => {
      setClosing(false);
      setProgress(0);
      setWordStep(0);
      setLogoRevealed(false);
      if (exitTimeoutRef.current) {
        window.clearTimeout(exitTimeoutRef.current);
        exitTimeoutRef.current = null;
      }
      setActive(true);
      document.body.style.overflow = 'hidden';
    };

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
      if (exitTimeoutRef.current) window.clearTimeout(exitTimeoutRef.current);
      delete window.replayTopxIntro;
    };
  }, []);

  // Trigger Exit Slide Up
  const triggerExit = useCallback(() => {
    setClosing(true);
    setProgress(100);
    setWordStep(4);
    setStatusText("WORKSPACE_READY // LET'S BUILD SOMETHING.");

    if (!exitTimeoutRef.current) {
      exitTimeoutRef.current = window.setTimeout(() => {
        setActive(false);
        document.body.style.overflow = '';
        exitTimeoutRef.current = null;
      }, 1080);
    }
  }, []);

  // Timeline Sequence (Words + Telemetry + Exit trigger)
  useEffect(() => {
    if (!active) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setLogoRevealed(true);
      setWordStep(4);
      setProgress(100);
      const reducedExit = setTimeout(triggerExit, 400);
      return () => clearTimeout(reducedExit);
    }

    // Rebuild the mark first, then reveal the statement and highlight CODE.
    const tLogo = setTimeout(() => {
      setLogoRevealed(true);
      setStatusText('WORKSPACE // LOADING YOUR TOOLKIT...');
    }, 120);

    const t0 = setTimeout(() => {
      setWordStep(1); // CODE
      setStatusText('EDITOR // READY FOR YOUR NEXT LINE...');
    }, 850);

    const t1 = setTimeout(() => {
      setWordStep(2); // COMPETE
      setStatusText('CHALLENGE // TEST YOUR PROBLEM-SOLVING...');
    }, 1100);

    const t2 = setTimeout(() => {
      setWordStep(3); // CONQUER
      setStatusText('SOLUTION // BUILD, TEST, IMPROVE...');
    }, 1350);

    const tHighlight = setTimeout(() => {
      setWordStep(4);
      setStatusText('ALL SYSTEMS // READY TO CODE.');
    }, 1650);

    const progInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progInterval);
          return 100;
        }
        return Math.min(prev + 5, 100);
      });
    }, 120);

    const tExit = setTimeout(() => {
      triggerExit();
    }, 2450);

    return () => {
      clearTimeout(tLogo);
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(tHighlight);
      clearTimeout(tExit);
      clearInterval(progInterval);
    };
  }, [active, triggerExit]);

  // Keyboard shortcut listener (ESC to skip)
  useEffect(() => {
    if (!active) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.code === 'Space') {
        triggerExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, triggerExit]);

  if (!active) return null;

  return (
    <div
      id="topx-preloader-root"
      className={`topx-preloader-wrap ${closing ? 'is-closing' : ''}`}
      onClick={triggerExit}
      title="Click anywhere or press ESC to skip"
    >
      {/* Cyberpunk Telemetry HUD Overlay */}
      <div className={`topx-preloader-hud ${closing ? 'hud-exit' : ''}`}>
        {/* Top HUD Bar */}
        <div className="topx-hud-bar top">
          <div className="topx-hud-brand">
            <svg className="topx-hud-brand-svg" viewBox="340 150 910 500" aria-hidden="true">
              <polygon fill="#0d0d0f" points="538,208 587,254 449,393 579,527 529,577 354,395" />
              <polygon fill="#0d0d0f" points="1059,208 1239,392 1059,575 1011,527 1143,391 1009,254" />
              <polygon fill="var(--ac, #ff7a1a)" points="988,159 1027,159 547,640 508,640" />
              <polygon fill="#5F5F5F" points="625,255 717,255 796,334 745,383 678,313" />
              <polygon fill="var(--ac, #ff7a1a)" points="625,367 678,313 745,383 694,438" />
              <polygon fill="var(--ac, #ff7a1a)" points="942,334 989,382 897,478 850,430" />
              <polygon fill="#5F5F5F" points="770,433 813,390 850,430 897,478 959,544 871,544" />
              <polygon fill="#FFA477" points="832,369 870,410 850,430 813,390" />
            </svg>
            <span className="brand-wordmark">
              <span className="brand-name-group">
                <span className="brand-top">TOP-</span>
                <span className="brand-x">X</span>
              </span>
            </span>
          </div>
          <div className="topx-hud-sys">
            <span className="topx-hud-code">CODING ARENA: ONLINE</span>
          </div>
        </div>

        {/* Center Stage: 8-Polygon Emblem + Cinematic Words */}
        <div className="topx-preloader-center">
          {/* Geometric 8-Polygon Top-X Mark */}
          <div className={`topx-loader-logo-wrap ${logoRevealed ? 'revealed' : ''}`}>
            <svg viewBox="345 155 900 490" className="topx-loader-logo-svg">
              <g className="topx-poly-group">
                <polygon
                  className="topx-poly poly-chev-left"
                  points="538,208 587,254 449,393 579,527 529,577 354,395"
                />
                <polygon
                  className="topx-poly poly-chev-right"
                  points="1059,208 1239,392 1059,575 1011,527 1143,391 1009,254"
                />
                <polygon
                  className="topx-poly poly-spire"
                  points="988,159 1027,159 547,640 508,640"
                />
                <polygon
                  className="topx-poly poly-shard-1"
                  points="625,255 717,255 796,334 745,383 678,313"
                />
                <polygon
                  className="topx-poly poly-shard-2"
                  points="625,367 678,313 745,383 694,438"
                />
                <polygon
                  className="topx-poly poly-shard-3"
                  points="942,334 989,382 897,478 850,430"
                />
                <polygon
                  className="topx-poly poly-shard-4"
                  points="770,433 813,390 850,430 897,478 959,544 871,544"
                />
                <polygon
                  className="topx-poly poly-shard-5"
                  points="832,369 870,410 850,430 813,390"
                />
              </g>
            </svg>
          </div>

          {/* Cinematic 3-Word Statement */}
          <div className="topx-loader-words">
            <span className={`topx-word word-1 ${wordStep >= 1 ? 'active' : ''} ${wordStep >= 4 ? 'glow-orange' : ''}`}>
              CODE.
            </span>
            <span className={`topx-word word-2 ${wordStep >= 2 ? 'active' : ''}`}>
              COMPETE.
            </span>
            <span className={`topx-word word-3 ${wordStep >= 3 ? 'active' : ''}`}>
              CONQUER.
            </span>
          </div>

          <div className="topx-loader-tagline">
            FROM YOUR FIRST LINE TO ACCEPTED SOLUTIONS
          </div>
        </div>

        {/* Bottom HUD Bar */}
        <div className="topx-hud-bar bottom">
          <div className="topx-hud-log">
            <span className="log-caret">&gt;</span>
            <span className="log-text">{statusText}</span>
          </div>

          <div className="topx-hud-progress">
            <div className="topx-hud-bar-track">
              <div className="topx-hud-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="topx-hud-percent">{String(progress).padStart(3, '0')}%</span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              triggerExit();
            }}
            className="topx-hud-skip"
          >
            <span>SKIP [ESC]</span>
          </button>
        </div>
      </div>
    </div>
  );
}
