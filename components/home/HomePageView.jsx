'use client';
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../legacy-src/features/auth/useAuth.js';
import AuthGate from '../legacy-src/components/shell/AuthGate.jsx';
import StudentProfileSetup from '../legacy-src/components/shell/StudentProfileSetup.jsx';
import { hasRequiredStudentProfile } from '../legacy-src/features/profile/studentProfileOptions.js';
import AppHeader from '../legacy-src/components/shell/AppHeader.jsx';
import AppFooter from '../legacy-src/components/shell/AppFooter.jsx';
import { api } from '../legacy-src/lib/api.js';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Flame,
  Code2,
  Users2,
  Target,
  Trophy,
  Award,
  Zap,
  Shield,
  Layers,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX
} from 'lucide-react';

const TOPX_SNIPPETS = [
  {
    id: 'growth',
    filename: 'growth.topx',
    lines: [
      'def daily_growth(self):',
      '    while True:',
      '        comparison = False',
      '        progress = self.today - self.yesterday',
      '        return progress'
    ]
  },
  {
    id: 'community',
    filename: 'community.topx',
    lines: [
      'if you.is_beginner():',
      '    start_coding()',
      'elif you.is_expert():',
      '    share_knowledge()',
      '',
      'while passion:',
      '    grow_together()'
    ]
  },
  {
    id: 'streak',
    filename: 'streak.topx',
    lines: [
      'function achieveMastery(problem) {',
      '    let streak = 0;',
      '    while (curious) {',
      '        solve(problem);',
      '        streak++;',
      '        learnFromMistakes();',
      '        return streak;',
      '    }',
      '}'
    ]
  }
];

function highlightCode(text) {
  const parts = [];
  const regex = /\b(while|True|False|if|elif|function|return|def|class|let|const|self)\b|(\+\+)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`plain-${lastIndex}`} style={{ whiteSpace: 'pre' }}>
          {text.substring(lastIndex, match.index)}
        </span>
      );
    }
    parts.push(
      <span key={`kw-${match.index}`} className="tx-kw-orange" style={{ whiteSpace: 'pre' }}>
        {match[0]}
      </span>
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(
      <span key={`plain-${lastIndex}`} style={{ whiteSpace: 'pre' }}>
        {text.substring(lastIndex)}
      </span>
    );
  }
  return parts;
}

export default function HomePageView() {
  const auth = useAuth();
  const router = useRouter();
  const [topMembers, setTopMembers] = useState([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [snippetIndex, setSnippetIndex] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [typingState, setTypingState] = useState('typing'); // 'typing' | 'pausing' | 'erasing' | 'switching'
  const containerRef = useRef(null);

  // Home Page Spotlight Video (Autoplays muted, user has only pause/play and unmute/mute)
  const videoRef = useRef(null);
  const videoContainerRef = useRef(null);
  const userPausedVideoRef = useRef(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isVideoInViewport, setIsVideoInViewport] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    const container = videoContainerRef.current;
    if (!video || !container) return;
    video.muted = true;

    if (!('IntersectionObserver' in window)) {
      setVideoLoaded(true);
      setIsVideoInViewport(true);
      return;
    }

    const loadObserver = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        setVideoLoaded(true);
        loadObserver.disconnect();
      },
      { rootMargin: '240px' }
    );
    const viewportObserver = new IntersectionObserver((entries) => {
      const isIntersecting = entries.some((entry) => entry.isIntersecting);
      setIsVideoInViewport(isIntersecting);
      if (!isIntersecting) video.pause();
    });

    loadObserver.observe(container);
    viewportObserver.observe(container);
    return () => {
      loadObserver.disconnect();
      viewportObserver.disconnect();
      video.pause();
    };
  }, []);

  useEffect(() => {
    if (videoLoaded) videoRef.current?.load();
  }, [videoLoaded]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoLoaded) return;

    if (!isVideoInViewport || userPausedVideoRef.current) {
      video.pause();
      return;
    }

    video.play().catch(() => setIsVideoPlaying(false));
  }, [videoLoaded, isVideoInViewport]);

  const toggleVideoPlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      userPausedVideoRef.current = false;
      video.play().then(() => setIsVideoPlaying(true)).catch(() => {});
    } else {
      userPausedVideoRef.current = true;
      video.pause();
      setIsVideoPlaying(false);
    }
  };

  const toggleVideoMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsVideoMuted(video.muted);
  };

  // Random typing, pausing, erasing, and switching between the 3 .topx snippets
  useEffect(() => {
    const activeSnippet = TOPX_SNIPPETS[snippetIndex];
    const fullText = activeSnippet.lines.join('\n');

    if (typingState === 'typing') {
      if (charCount < fullText.length) {
        const timeout = setTimeout(() => {
          setCharCount((c) => c + 1);
        }, 12); // High-speed typing (12ms per char)
        return () => clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => {
          setTypingState('pausing');
        }, 1800);
        return () => clearTimeout(timeout);
      }
    } else if (typingState === 'pausing') {
      const timeout = setTimeout(() => {
        setTypingState('erasing');
      }, 80);
      return () => clearTimeout(timeout);
    } else if (typingState === 'erasing') {
      if (charCount > 0) {
        const timeout = setTimeout(() => {
          setCharCount((c) => Math.max(0, c - 3));
        }, 8); // Ultra-fast erasing (8ms, -3 chars per tick)
        return () => clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => {
          setTypingState('switching');
        }, 200);
        return () => clearTimeout(timeout);
      }
    } else if (typingState === 'switching') {
      // Pick randomly from the other 2 snippets so it alternates
      const others = [0, 1, 2].filter((i) => i !== snippetIndex);
      const nextSnippet = others[Math.floor(Math.random() * others.length)];
      setSnippetIndex(nextSnippet);
      setCharCount(0);
      setTypingState('typing');
    }
  }, [snippetIndex, charCount, typingState]);

  // Fetch top members for streak champions preview
  useEffect(() => {
    api('/api/leaderboard?metric=streak')
      .then((data) => {
        if (Array.isArray(data.members)) {
          setTopMembers(data.members.slice(0, 3));
        }
      })
      .catch(() => { });
  }, []);

  // Scroll reveal observer for silky, lightweight transitions (Locomotive standard)
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    const elements = document.querySelectorAll('.tx-reveal');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [topMembers]);

  const handleStartStreak = () => {
    if (auth.user) {
      router.push('/progress');
    } else {
      setAuthModalOpen(true);
    }
  };

  return (
    <div className="topx-react-app home-page-app tx-home-wrap" ref={containerRef}>
      <AuthGate
        authMode={auth.authMode}
        setAuthMode={auth.setAuthMode}
        authenticate={auth.authenticate}
        loginWithGoogle={auth.loginWithGoogle}
        error={auth.error}
        setError={auth.setError}
        isAuthenticated={Boolean(auth.user)}
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {!auth.loading && auth.user && !hasRequiredStudentProfile(auth.user) && (
        <StudentProfileSetup
          user={auth.user}
          onSaved={(updatedUser) => {
            auth.setUser(updatedUser);
            router.push('/profile');
          }}
        />
      )}

      <AppHeader onOpenAuth={() => setAuthModalOpen(true)} />

      <main className="home-main-container" id="home-content">
        {/* =================================================================
            HERO SECTION: TWO COLUMNS (COMMUNITY INTRO + INTERACTIVE IDE)
            ================================================================= */}
        <section className="tx-hero-section">
          <div className="tx-container">
            <div className="tx-hero-grid">
              {/* LEFT COLUMN: Community Introduction */}
              <div className="tx-hero-left tx-reveal is-visible">
                <h1 className="tx-hero-headline">
                  Show up. Solve problems. <br />
                  <em>Become unstoppable.</em>
                </h1>

                <p className="tx-hero-sub">
                  Top-X helps students build consistent coding habits, improve their
                  problem-solving skills, challenge themselves, and grow alongside a motivated community of developers.
                </p>

                <div className="tx-hero-actions">
                  <button
                    type="button"
                    onClick={handleStartStreak}
                    className="tx-btn-primary"
                  >
                    <span>Start Your Streak</span>
                    <ArrowRight size={15} />
                  </button>
                  <a href="#community" className="tx-btn-secondary">
                    <span>Explore Community</span>
                  </a>
                </div>

                <div className="tx-hero-platforms">
                  <span className="lbl">Tracking accepted problems across:</span>
                  <div className="tx-hero-platforms-list">
                    <span className="tx-chip-badge">LeetCode</span>
                    <span className="tx-chip-badge">Codeforces</span>
                    <span className="tx-chip-badge">CodeChef</span>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Interactive Animated Code Compiler (Moving Glowing Orange Boundary) */}
              <div className="tx-hero-right tx-reveal is-visible">
                <div className="tx-topx-glow-wrapper">
                  <div className="tx-topx-glow-beam" aria-hidden="true" />
                  <div className="tx-topx-ide-window" role="region" aria-label="Top-X Code Compiler Simulation">
                    {/* Top Bar: Left-shifted file name with .topx, no three dots */}
                    <div className="tx-topx-ide-header">
                      <div className="tx-topx-ide-title">
                        <span className="tx-topx-icon">&lt;/&gt;</span>
                        <span className="tx-topx-filename">{TOPX_SNIPPETS[snippetIndex].filename}</span>
                      </div>
                    </div>

                    {/* Editor Body: Line numbers + Animated typing & erasing code */}
                    <div className="tx-topx-ide-body">
                      <div className="tx-topx-line-numbers" aria-hidden="true">
                        {TOPX_SNIPPETS[snippetIndex].lines.map((_, i) => (
                          <div key={i}>{i + 1}</div>
                        ))}
                      </div>

                      <div className="tx-topx-code-area">
                        {(() => {
                          const activeSnippet = TOPX_SNIPPETS[snippetIndex];
                          const fullText = activeSnippet.lines.join('\n');
                          const visibleText = fullText.slice(0, charCount);
                          const visibleLines = visibleText.split('\n');

                          return activeSnippet.lines.map((_, idx) => {
                            const lineText = visibleLines[idx] || '';
                            const isCurrentActiveLine = idx === visibleLines.length - 1 && typingState !== 'switching';
                            return (
                              <div key={idx} className="tx-topx-code-line">
                                {highlightCode(lineText)}
                                {isCurrentActiveLine && <span className="tx-orange-cursor" />}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* QUICK COMMUNITY METRICS STRIP (Matches Neo-Brutalist Features Style) */}
            <div className="tx-hero-stats-strip tx-reveal is-visible">
              <article className="tx-hero-stat-card">
                <div className="tx-hero-stat-head">
                  <h3 className="tx-hero-stat-val">Daily Consistency</h3>
                  <span className="tx-hero-stat-icon-wrap" aria-hidden="true">
                    <Flame size={26} />
                  </span>
                </div>
                <p className="tx-hero-stat-lbl">
                  Build a sustainable daily habit. Solving two problems each day compounds faster than occasional all-nighters before contest deadlines.
                </p>
              </article>

              <article className="tx-hero-stat-card">
                <div className="tx-hero-stat-head">
                  <h3 className="tx-hero-stat-val">Unified Progress Tracking</h3>
                  <span className="tx-hero-stat-icon-wrap" aria-hidden="true">
                    <Target size={26} />
                  </span>
                </div>
                <p className="tx-hero-stat-lbl">
                  Bring your LeetCode DSA solves, Codeforces rating, and CodeChef contest challenges together into one verified, live college profile.
                </p>
              </article>

              <article className="tx-hero-stat-card">
                <div className="tx-hero-stat-head">
                  <h3 className="tx-hero-stat-val">Healthy College Leaderboard</h3>
                  <span className="tx-hero-stat-icon-wrap" aria-hidden="true">
                    <Trophy size={26} />
                  </span>
                </div>
                <p className="tx-hero-stat-lbl">
                  Compare rankings with classmates and section peers in a transparent atmosphere that recognizes daily streaks just as much as absolute totals.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* =================================================================
            COMMUNITY SPOTLIGHT VIDEO SECTION
            ================================================================= */}
        <section className="tx-video-section">
          <div className="tx-container">
            <div className="tx-section-head tx-video-head tx-reveal is-visible">
              <h2 className="tx-section-title">Consistency is built one problem at a time.</h2>
              <p className="tx-section-desc">
                More than a club, Top-X is a community of builders, thinkers, and problem-solvers shaping their journey in tech together.
              </p>
            </div>
            <div className="tx-video-wrapper tx-reveal is-visible" ref={videoContainerRef}>
              <div className="tx-video-card">
                <video
                  ref={videoRef}
                  className="tx-video-element"
                  src={videoLoaded ? '/topx-intro.mp4' : undefined}
                  muted
                  playsInline
                  loop
                  preload="none"
                  onClick={toggleVideoPlay}
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                />

                {/* Center Play Icon when paused */}
                {!isVideoPlaying && (
                  <button
                    type="button"
                    className="tx-video-play-center"
                    onClick={toggleVideoPlay}
                    aria-label="Play video"
                  >
                    <Play size={28} fill="#ffffff" color="#ffffff" style={{ marginLeft: '3px' }} />
                  </button>
                )}

                {/* Exactly 2 options for user: Pause/Play and Unmute/Mute */}
                <div className="tx-video-controls-bar">
                  <button
                    type="button"
                    className="tx-video-btn"
                    onClick={toggleVideoPlay}
                    aria-label={isVideoPlaying ? 'Pause video' : 'Play video'}
                  >
                    {isVideoPlaying ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}
                    <span>{isVideoPlaying ? 'Pause' : 'Play'}</span>
                  </button>

                  <button
                    type="button"
                    className="tx-video-btn"
                    onClick={toggleVideoMute}
                    aria-label={isVideoMuted ? 'Unmute video' : 'Mute video'}
                  >
                    {isVideoMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    <span>{isVideoMuted ? 'Unmute' : 'Mute'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            COMMUNITY BENEFITS SECTION (#community) - ARCHITECTURAL GRID
            ================================================================= */}
        <section className="tx-section" id="community">
          <div className="tx-container">
            <div className="tx-section-head tx-reveal">
              <h2 className="tx-section-title">Built for Serious Problem Solvers</h2>
              <p className="tx-section-desc">
                Top-X is about more than solving isolated problems: it is about consistent practice,
                improving technical ability, healthy competition, accountability, and growing with other developers.
              </p>
            </div>

            <div className="tx-community-grid tx-reveal">
              {/* Pillar 1 */}
              <article className="tx-pillar-card">
                <div className="tx-pillar-head">
                  <h3 className="tx-pillar-title">Curated Problem Vault</h3>
                  <span className="tx-pillar-icon" aria-hidden="true">
                    <Layers size={26} />
                  </span>
                </div>
                <p className="tx-pillar-desc">
                  Practice handpicked, pattern-focused DSA problems categorized by topic — from two pointers and sliding window to graphs and dynamic programming.
                </p>
              </article>

              {/* Pillar 2 */}
              <article className="tx-pillar-card">
                <div className="tx-pillar-head">
                  <h3 className="tx-pillar-title">Guided DSA Roadmaps</h3>
                  <span className="tx-pillar-icon" aria-hidden="true">
                    <Zap size={26} />
                  </span>
                </div>
                <p className="tx-pillar-desc">
                  Follow structured skill tracks designed to guide you step-by-step from fundamental language syntax to advanced contest-level intuition.
                </p>
              </article>

              {/* Pillar 3 */}
              <article className="tx-pillar-card">
                <div className="tx-pillar-head">
                  <h3 className="tx-pillar-title">Cross-Batch Community</h3>
                  <span className="tx-pillar-icon" aria-hidden="true">
                    <Users2 size={26} />
                  </span>
                </div>
                <p className="tx-pillar-desc">
                  Learn alongside motivated peers across First, Second, Third, and Final years, spanning CSE, IT, CSBS, and all college branches.
                </p>
              </article>

              {/* Pillar 4 */}
              <article className="tx-pillar-card">
                <div className="tx-pillar-head">
                  <h3 className="tx-pillar-title">Automated Task Verification</h3>
                  <span className="tx-pillar-icon" aria-hidden="true">
                    <CheckCircle2 size={26} />
                  </span>
                </div>
                <p className="tx-pillar-desc">
                  Complete daily coding challenges with automatic verification across LeetCode, Codeforces, and CodeChef to validate genuine effort.
                </p>
              </article>

              {/* Pillar 5 */}
              <article className="tx-pillar-card">
                <div className="tx-pillar-head">
                  <h3 className="tx-pillar-title">Campus Contests &amp; Events</h3>
                  <span className="tx-pillar-icon" aria-hidden="true">
                    <Sparkles size={26} />
                  </span>
                </div>
                <p className="tx-pillar-desc">
                  Register for live college workshops, hackathons, and algorithmic competitions with instant seat reservations and attendee tracking.
                </p>
              </article>

              {/* Pillar 6 */}
              <article className="tx-pillar-card">
                <div className="tx-pillar-head">
                  <h3 className="tx-pillar-title">Milestone Recognition</h3>
                  <span className="tx-pillar-icon" aria-hidden="true">
                    <Award size={26} />
                  </span>
                </div>
                <p className="tx-pillar-desc">
                  Turn sustained coding momentum into tangible recognition with verified milestone badges, streak tiers, and TOP-X Pro qualification.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* =================================================================
            STREAK-BASED REWARDS ROADMAP (#rewards)
            ================================================================= */}
        <section className="tx-section" id="rewards">
          <div className="tx-container">
            <div className="tx-section-head tx-reveal">
              <h2 className="tx-section-title">Streak Rewards Roadmap</h2>
              <p className="tx-section-desc">
                Sustained consistency unlocks tangible community recognition. Track your consecutive qualifying days and reach these milestones.
              </p>
            </div>

            {/* Progression Timeline */}
            <div className="tx-roadmap-timeline tx-reveal">
              {/* Step 1: Start */}
              <div className="tx-milestone-card">
                <span className="tx-milestone-step">MILESTONE 01</span>
                <span className="tx-milestone-day">Day 1</span>
                <h3 className="tx-milestone-reward">Start Your Streak</h3>
                <p className="tx-milestone-desc">
                  Sign up with your college email, link your public coding handles, and solve your first qualifying problem.
                </p>
              </div>

              {/* Step 2: 30-Day Sticker */}
              <div className="tx-milestone-card">
                <span className="tx-milestone-step">MILESTONE 02</span>
                <span className="tx-milestone-day">30-Day Streak</span>
                <h3 className="tx-milestone-reward">Top X Sticker</h3>
                <p className="tx-milestone-desc">
                  After completing 30 consecutive qualifying days, members become eligible for the official vinyl Top-X sticker pack.
                </p>
              </div>

              {/* Step 3: 50-Day Top X Pro */}
              <div className="tx-milestone-card">
                <span className="tx-milestone-step">MILESTONE 03</span>
                <span className="tx-milestone-day">50-Day Streak</span>
                <h3 className="tx-milestone-reward">Top X Pro Recognition</h3>
                <p className="tx-milestone-desc">
                  Complete 50 consecutive qualifying days to unlock the Top X Pro badge, advanced CP tiers, and priority community status.
                </p>
              </div>

              {/* Step 4: 75-Day T-shirt */}
              <div className="tx-milestone-card final">
                <span className="tx-milestone-step" style={{ color: 'var(--ac)' }}>MILESTONE 04</span>
                <span className="tx-milestone-day">75-Day Streak</span>
                <h3 className="tx-milestone-reward">Top X T-Shirt</h3>
                <p className="tx-milestone-desc">
                  Complete 75 consecutive qualifying days to become eligible for the official Top-X developer t-shirt.
                </p>
              </div>
            </div>

            {/* Official Qualification Disclaimer */}
            <div className="tx-roadmap-disclaimer tx-reveal">
              <strong>Notice:</strong> Streaks depend on the community's existing qualifying-day rules. Physical rewards are proposed community incentives subject to submission verification, active participation, and organizer confirmation.
            </div>
          </div>
        </section>

        {/* =================================================================
            COMMUNITY CONSISTENCY SHOWCASE (PRESERVED LEADERBOARD PREVIEW)
            ================================================================= */}
        {topMembers.length > 0 && (
          <section className="tx-section home-podium-preview" style={{ background: 'var(--surface-alt)' }}>
            <div className="tx-container">
              <div className="tx-section-head tx-reveal">
                <h2 className="tx-section-title">Active Streak Champions</h2>
                <p className="tx-section-desc">Real students currently leading the college consistency streak.</p>
              </div>

              <div className="home-podium-grid tx-reveal">
                {topMembers.map((m, idx) => {
                  const isFirst = idx === 0;
                  const isSecond = idx === 1;
                  const rankTitle = isFirst ? 'CHAMPION' : isSecond ? 'RUNNER-UP' : '3RD PLACE';
                  const rankColor = isFirst ? '#EAB308' : isSecond ? '#94A3B8' : '#C2410C';
                  const rankBg = isFirst ? '#FEF9C3' : isSecond ? '#F1F5F9' : '#FFEDD5';
                  const initials = (m.n || 'Top')
                    .split(' ')
                    .filter(Boolean)
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <div
                      key={m.id || idx}
                      className={`home-podium-card home-podium-rank-${idx + 1}`}
                      data-rank={idx + 1}
                    >
                      {/* Top Header with Rank & Trophy */}
                      <div className="home-podium-topbar">
                        <div
                          className="home-podium-rank-tag"
                          style={{
                            background: rankBg,
                            borderColor: rankColor,
                            color: '#0d0d0f'
                          }}
                        >
                          <span className="rank-num">#{idx + 1}</span>
                          <span className="rank-sep">|</span>
                          <span className="rank-title">{rankTitle}</span>
                        </div>
                        {isFirst ? (
                          <div className="home-podium-icon-wrap" style={{ color: '#EAB308' }} title="Champion">
                            <Trophy size={22} />
                          </div>
                        ) : (
                          <div className="home-podium-icon-wrap" style={{ color: rankColor }} title={rankTitle}>
                            <Award size={20} />
                          </div>
                        )}
                      </div>

                      {/* Identity Row with Reshaped Large Avatar */}
                      <div className="home-podium-who">
                        <div className="home-podium-av">
                          {m.avatar ? (
                            <img src={m.avatar} alt={m.n} referrerPolicy="no-referrer" />
                          ) : (
                            <span className="home-podium-initials">{initials}</span>
                          )}
                        </div>
                        <div className="home-podium-info">
                          <h4 className="home-podium-name">{m.n}</h4>
                          <div className="home-podium-cohort">
                            {m.branch || 'CSE'} • {m.academicYear ? `${m.academicYear} Year` : '2nd Year'} • Sec {m.section || 'A'}
                          </div>
                        </div>
                      </div>

                      {/* Crisp Divider */}
                      <div className="home-podium-div" />

                      {/* Bottom Stats: Solved & Fiery Active Streak */}
                      <div className="home-podium-stats">
                        <div className="home-podium-stat-col">
                          <span className="home-podium-stat-num">{m.s || 0}</span>
                          <span className="home-podium-stat-sub">PROBLEMS SOLVED</span>
                        </div>
                        <div className="home-podium-streak-box">
                          <div className="home-podium-streak-content">
                            <Flame size={16} className="home-streak-flame-icon" />
                            <span className="home-streak-days">{m.streak || 0}</span>
                            <span className="home-streak-sub">DAY STREAK</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ textAlign: 'center', marginTop: '32px' }}>
                <Link href="/leaderboard" className="tx-btn-primary">
                  <span>View Full College Leaderboard</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* =================================================================
            CALL TO ACTION SECTION
            ================================================================= */}
        {!auth.user && (
          <section className="tx-section">
            <div className="tx-container">
              <div
                className="tx-reveal"
                style={{
                  textAlign: 'center',
                  padding: 'clamp(44px, 6vw, 76px) 24px',
                  borderRadius: '8px',
                  background: '#ffffff',
                  border: '2px solid #0d0d0f',
                  boxShadow: '8px 8px 0 #0d0d0f',
                  backgroundImage: 'linear-gradient(rgba(255, 122, 26, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 122, 26, 0.08) 1px, transparent 1px)',
                  backgroundSize: '28px 28px'
                }}
              >
                <h2 style={{ fontFamily: 'var(--font-display, sans-serif)', fontSize: 'clamp(28px, 3.6vw, 42px)', fontWeight: 850, letterSpacing: '-0.03em', margin: '0 0 14px', color: '#0d0d0f' }}>
                  Ready to build your <em style={{ fontStyle: 'normal', color: 'var(--ac, #ff7a1a)' }}>coding habit</em>?
                </h2>
                <p style={{ color: '#4a515e', fontSize: '16.5px', maxWidth: '640px', margin: '0 auto 32px', lineHeight: 1.65 }}>
                  Join fellow students tracking their competitive programming progress and consistent daily streak today.
                </p>
                <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link href="/profile" className="tx-btn-primary">
                    <span>Create Free Profile</span>
                    <ArrowRight size={15} />
                  </Link>
                  <Link href="/leaderboard" className="tx-btn-secondary">
                    <span>Explore Leaderboard</span>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <AppFooter />
    </div>
  );
}
