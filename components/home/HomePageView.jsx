'use client';
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../legacy-src/features/auth/useAuth.js';
import { useFeatureRuntime } from '../legacy-src/runtime/useFeatureRuntime.js';
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
  ChevronRight
} from 'lucide-react';

export default function HomePageView() {
  const auth = useAuth();
  const router = useRouter();
  const [topMembers, setTopMembers] = useState([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const containerRef = useRef(null);

  // Initialize 3D algorithm visualizers
  useFeatureRuntime();

  // Fetch top members for streak champions preview
  useEffect(() => {
    api('/api/leaderboard?metric=streak')
      .then((data) => {
        if (Array.isArray(data.members)) {
          setTopMembers(data.members.slice(0, 3));
        }
      })
      .catch(() => {});
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

      <main className="home-main-container">
        {/* =================================================================
            HERO SECTION: TWO COLUMNS (COMMUNITY INTRO + INTERACTIVE IDE)
            ================================================================= */}
        <section className="tx-hero-section">
          <div className="tx-container">
            <div className="tx-hero-grid">
              {/* LEFT COLUMN: Community Introduction */}
              <div className="tx-hero-left tx-reveal is-visible">
                <div className="tx-index-eyebrow">
                  <span className="num">00</span>
                  <span>// STUDENT CODING COMMUNITY</span>
                </div>

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
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span className="tx-chip-badge">LeetCode</span>
                    <span className="tx-chip-badge">Codeforces</span>
                    <span className="tx-chip-badge">CodeChef</span>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Realistic VS Code-Style Code Editor (Locomotive Darkroom) */}
              <div className="tx-hero-right tx-reveal is-visible">
                <div className="tx-ide-card" role="region" aria-label="Interactive Code Editor Simulation">
                  {/* Title Bar */}
                  <div className="tx-ide-titlebar">
                    <div className="tx-ide-dots">
                      <span className="tx-ide-dot red" />
                      <span className="tx-ide-dot yellow" />
                      <span className="tx-ide-dot green" />
                    </div>
                    <div className="tx-ide-tab">
                      <span className="tx-ide-tab-icon">C++</span>
                      <span>solution.cpp</span>
                    </div>
                    <div className="tx-ide-badge">C++20 • Competitive</div>
                  </div>

                  {/* Editor Code Body */}
                  <div className="tx-ide-body">
                    <div className="tx-ide-line"><span className="tx-ide-num">1</span><span className="tx-ide-code"><span className="tx-kw">#include</span> &lt;vector&gt;</span></div>
                    <div className="tx-ide-line"><span className="tx-ide-num">2</span><span className="tx-ide-code"><span className="tx-kw">#include</span> &lt;algorithm&gt;</span></div>
                    <div className="tx-ide-line"><span className="tx-ide-num">3</span><span className="tx-ide-code"><span className="tx-kw">using namespace</span> std;</span></div>
                    <div className="tx-ide-line"><span className="tx-ide-num">4</span><span className="tx-ide-code"></span></div>
                    <div className="tx-ide-line"><span className="tx-ide-num">5</span><span className="tx-ide-code"><span className="tx-comment">// Top-X Weekly Challenge: Maximum Subarray</span></span></div>
                    <div className="tx-ide-line"><span className="tx-ide-num">6</span><span className="tx-ide-code"><span className="tx-type">int</span> <span className="tx-fn">maxSubArray</span>(<span className="tx-type">const vector&lt;int&gt;</span>&amp; nums) &#123;</span></div>
                    <div className="tx-ide-line"><span className="tx-ide-num">7</span><span className="tx-ide-code">    <span className="tx-type">int</span> cur = <span className="tx-var">0</span>, best = nums[<span className="tx-var">0</span>];</span></div>
                    <div className="tx-ide-line"><span className="tx-ide-num">8</span><span className="tx-ide-code">    <span className="tx-kw">for</span> (<span className="tx-type">int</span> x : nums) &#123;</span></div>
                    <div className="tx-ide-line"><span className="tx-ide-num">9</span><span className="tx-ide-code">        cur = max(x, cur + x);</span></div>
                    <div className="tx-ide-line"><span className="tx-ide-num">10</span><span className="tx-ide-code">        best = max(best, cur);</span></div>
                    <div className="tx-ide-line"><span className="tx-ide-num">11</span><span className="tx-ide-code">    &#125;</span></div>
                    <div className="tx-ide-line"><span className="tx-ide-num">12</span><span className="tx-ide-code">    <span className="tx-kw">return</span> best;</span></div>
                    <div className="tx-ide-line"><span className="tx-ide-num">13</span><span className="tx-ide-code">&#125;</span></div>
                  </div>

                  {/* Output / Test Results Panel */}
                  <div className="tx-ide-testpanel">
                    <div className="tx-ide-status">
                      <CheckCircle2 size={15} />
                      <span>All 3 test cases passed</span>
                    </div>
                    <div className="tx-ide-metrics">
                      Runtime: 0ms • Memory: 15.2 MB
                    </div>
                  </div>

                  {/* Progression Tagline */}
                  <div className="tx-ide-tagline">
                    <span>Code. <strong>Complete.</strong> Conquer.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* QUICK COMMUNITY METRICS STRIP (Matches Profile Quick Stats Architecture) */}
            <div className="tx-hero-stats-strip tx-reveal is-visible">
              <div className="tx-hero-stat-card">
                <div className="tx-hero-stat-head">
                  <span className="tx-hero-stat-idx">01 // HABIT</span>
                  <Flame size={17} className="tx-hero-stat-icon" />
                </div>
                <div className="tx-hero-stat-val">Streak First</div>
                <div className="tx-hero-stat-lbl">Daily habit compounds faster than sporadic cramming</div>
              </div>

              <div className="tx-hero-stat-card">
                <div className="tx-hero-stat-head">
                  <span className="tx-hero-stat-idx">02 // TELEMETRY</span>
                  <Target size={17} className="tx-hero-stat-icon" />
                </div>
                <div className="tx-hero-stat-val">3 Platforms</div>
                <div className="tx-hero-stat-lbl">LeetCode • Codeforces • CodeChef synchronized</div>
              </div>

              <div className="tx-hero-stat-card">
                <div className="tx-hero-stat-head">
                  <span className="tx-hero-stat-idx">03 // COHORT</span>
                  <Trophy size={17} className="tx-hero-stat-icon" />
                </div>
                <div className="tx-hero-stat-val">College Arena</div>
                <div className="tx-hero-stat-lbl">Transparent peer ranking across branches &amp; years</div>
              </div>

              <div className="tx-hero-stat-card">
                <div className="tx-hero-stat-head">
                  <span className="tx-hero-stat-idx">04 // LAB</span>
                  <Sparkles size={17} className="tx-hero-stat-icon" />
                </div>
                <div className="tx-hero-stat-val">3D Visualizer</div>
                <div className="tx-hero-stat-lbl">Orbital sorting physics &amp; algorithm invariants</div>
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
              <div className="tx-index-eyebrow">
                <span className="num">01</span>
                <span>// COMMUNITY ECOSYSTEM</span>
              </div>
              <h2 className="tx-section-title">Built for Serious Problem Solvers</h2>
              <p className="tx-section-desc">
                Top-X is about more than solving isolated problems: it is about consistent practice,
                improving technical ability, healthy competition, accountability, and growing with other developers.
              </p>
            </div>

            <div className="tx-community-grid tx-reveal">
              {/* Pillar 1 */}
              <div className="tx-pillar-card">
                <div className="tx-pillar-head">
                  <span className="tx-pillar-index">01 // HABIT</span>
                  <div className="tx-pillar-icon">
                    <Flame size={19} />
                  </div>
                </div>
                <h3 className="tx-pillar-title">Daily Consistency</h3>
                <p className="tx-pillar-desc">
                  Build a sustainable daily habit. Solving two problems each day compounds faster than occasional all-nighters before contest deadlines.
                </p>
              </div>

              {/* Pillar 2 */}
              <div className="tx-pillar-card">
                <div className="tx-pillar-head">
                  <span className="tx-pillar-index">02 // PATTERNS</span>
                  <div className="tx-pillar-icon">
                    <Code2 size={19} />
                  </div>
                </div>
                <h3 className="tx-pillar-title">DSA &amp; CP Mastery</h3>
                <p className="tx-pillar-desc">
                  Strengthen data structure and algorithm fundamentals spanning binary search, dynamic programming, trees, graphs, and competitive invariants.
                </p>
              </div>

              {/* Pillar 3 */}
              <div className="tx-pillar-card">
                <div className="tx-pillar-head">
                  <span className="tx-pillar-index">03 // COHORT</span>
                  <div className="tx-pillar-icon">
                    <Users2 size={19} />
                  </div>
                </div>
                <h3 className="tx-pillar-title">Cross-Batch Community</h3>
                <p className="tx-pillar-desc">
                  Learn alongside motivated peers across First, Second, Third, and Final years, spanning CSE, IT, Electrical, Mechanical, and Core branches.
                </p>
              </div>

              {/* Pillar 4 */}
              <div className="tx-pillar-card">
                <div className="tx-pillar-head">
                  <span className="tx-pillar-index">04 // TELEMETRY</span>
                  <div className="tx-pillar-icon">
                    <Target size={19} />
                  </div>
                </div>
                <h3 className="tx-pillar-title">Unified Progress Tracking</h3>
                <p className="tx-pillar-desc">
                  Bring your LeetCode DSA solves, Codeforces rating, and CodeChef contest challenges together into one verified, live college profile.
                </p>
              </div>

              {/* Pillar 5 */}
              <div className="tx-pillar-card">
                <div className="tx-pillar-head">
                  <span className="tx-pillar-index">05 // ARENA</span>
                  <div className="tx-pillar-icon">
                    <Trophy size={19} />
                  </div>
                </div>
                <h3 className="tx-pillar-title">Healthy College Leaderboard</h3>
                <p className="tx-pillar-desc">
                  Compare rankings with classmates and section peers in a transparent atmosphere that recognizes daily streaks just as much as absolute totals.
                </p>
              </div>

              {/* Pillar 6 */}
              <div className="tx-pillar-card">
                <div className="tx-pillar-head">
                  <span className="tx-pillar-index">06 // BADGES</span>
                  <div className="tx-pillar-icon">
                    <Award size={19} />
                  </div>
                </div>
                <h3 className="tx-pillar-title">Milestone Recognition</h3>
                <p className="tx-pillar-desc">
                  Turn sustained coding momentum into tangible community milestones, verified badges, and streak reward qualifications.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            INTERACTIVE 3D ALGORITHM VISUALIZER
            ================================================================= */}
        <section className="tx-section" style={{ background: 'var(--surface-alt)' }}>
          <div className="tx-container">
            <div className="tx-section-head tx-reveal" style={{ marginBottom: '32px' }}>
              <div className="tx-index-eyebrow">
                <span className="num">02</span>
                <span>// 3D ALGORITHM LAB</span>
              </div>
              <h2 className="tx-section-title">
                Orbital Sorting Physics &amp; Algorithm Invariants
              </h2>
              <p className="tx-section-desc">
                Step through live adjacent comparisons, watch real-time orbital swap physics in physical 3D space, and develop an intuitive mental model for fundamental algorithms.
              </p>
            </div>

            {/* Main Interactive Stage Box */}
            <div
              className="tx-reveal"
              style={{
                border: '1.5px solid #0d0d0f',
                borderRadius: '8px',
                background: '#ffffff',
                overflow: 'hidden',
                boxShadow: '0 16px 36px rgba(13,13,15,0.08)',
                marginBottom: '28px'
              }}
            >
              {/* Visualizer Control Header */}
              <div
                style={{
                  padding: '16px 24px',
                  borderBottom: '1.5px solid #0d0d0f',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  background: '#ffffff'
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontFamily: 'var(--font-display, sans-serif)', fontSize: '17px', fontWeight: 800, color: '#0d0d0f' }}>
                    Bubble Sort 3D Simulator
                  </h3>
                  <span style={{ fontSize: '13px', color: '#525866' }}>
                    Watch adjacent score elements compare and swap until the highest ranking rises to the top.
                  </span>
                </div>

                <div className="bs-sort-controls" style={{ margin: 0 }}>
                  <button className="bs-ctl-btn" id="home-sort-pz" type="button" style={{ fontWeight: 600 }}>
                    Pause
                  </button>
                  <button className="bs-ctl-btn" id="home-sort-sp" type="button">
                    Speed 1x
                  </button>
                  <button className="bs-ctl-btn" id="home-sort-sh" type="button" style={{ borderColor: 'var(--ac)', color: 'var(--ac)' }}>
                    Shuffle
                  </button>
                </div>
              </div>

              {/* Large 3D WebGL Stage Wrap */}
              <div
                className="bs-stage-wrap"
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '460px',
                  minHeight: '400px',
                  background: 'radial-gradient(ellipse at center, rgba(255,68,26,0.03) 0%, transparent 70%)'
                }}
              >
                <canvas className="bs-stage-canvas" id="home-sort-canvas" />
                <div
                  className="bs-readout"
                  id="home-sort-ro"
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '20px',
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    fontFamily: 'var(--font-mono, monospace)',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
                  }}
                >
                  ready
                </div>
              </div>
            </div>

            {/* Algorithmic Properties Grid */}
            <div
              className="tx-reveal"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
                marginBottom: '28px'
              }}
            >
              <div style={{ background: '#ffffff', border: '1.5px solid #0d0d0f', borderRadius: '6px', padding: '18px 22px', boxShadow: '0 2px 6px rgba(13,13,15,0.04)' }}>
                <span style={{ color: 'var(--ac, #ff7a1a)', textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', letterSpacing: '0.06em', fontWeight: 700 }}>
                  Worst &amp; Average Time
                </span>
                <div style={{ fontSize: '24px', fontWeight: 850, margin: '6px 0', color: '#0d0d0f' }}>
                  O(N²)
                </div>
                <p style={{ margin: 0, color: '#525866', fontSize: '13px', lineHeight: 1.55 }}>
                  Performs N·(N-1)/2 adjacent comparisons across inverted pairs before fully converging.
                </p>
              </div>

              <div style={{ background: '#ffffff', border: '1.5px solid #0d0d0f', borderRadius: '6px', padding: '18px 22px', boxShadow: '0 2px 6px rgba(13,13,15,0.04)' }}>
                <span style={{ color: 'var(--ac, #ff7a1a)', textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', letterSpacing: '0.06em', fontWeight: 700 }}>
                  Best Case (Adaptive)
                </span>
                <div style={{ fontSize: '24px', fontWeight: 850, margin: '6px 0', color: '#16a34a' }}>
                  O(N)
                </div>
                <p style={{ margin: 0, color: '#525866', fontSize: '13px', lineHeight: 1.55 }}>
                  Early exit flag terminates immediately when an outer pass finishes with zero swaps.
                </p>
              </div>

              <div style={{ background: '#ffffff', border: '1.5px solid #0d0d0f', borderRadius: '6px', padding: '18px 22px', boxShadow: '0 2px 6px rgba(13,13,15,0.04)' }}>
                <span style={{ color: 'var(--ac, #ff7a1a)', textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', letterSpacing: '0.06em', fontWeight: 700 }}>
                  Auxiliary Space
                </span>
                <div style={{ fontSize: '24px', fontWeight: 850, margin: '6px 0', color: '#0d0d0f' }}>
                  O(1)
                </div>
                <p style={{ margin: 0, color: '#525866', fontSize: '13px', lineHeight: 1.55 }}>
                  In-place algorithm swapping memory cells with strictly constant supplementary overhead.
                </p>
              </div>

              <div style={{ background: '#ffffff', border: '1.5px solid #0d0d0f', borderRadius: '6px', padding: '18px 22px', boxShadow: '0 2px 6px rgba(13,13,15,0.04)' }}>
                <span style={{ color: 'var(--ac, #ff7a1a)', textTransform: 'uppercase', fontFamily: 'var(--font-mono, monospace)', fontSize: '11px', letterSpacing: '0.06em', fontWeight: 700 }}>
                  Loop Invariant
                </span>
                <div style={{ fontSize: '22px', fontWeight: 850, margin: '6px 0', color: 'var(--ac, #ff7a1a)' }}>
                  Prefix Locked
                </div>
                <p style={{ margin: 0, color: '#525866', fontSize: '13px', lineHeight: 1.55 }}>
                  After pass k, the top k ranked elements are permanently sorted in their final positions.
                </p>
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <Link
                href="/roadmap"
                className="tx-btn-secondary"
              >
                <span>Explore Full 3D Algorithm Lab (Binary Search, Dijkstra, A*)</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>

        {/* =================================================================
            TOP-X PRO SECTION (#pro)
            ================================================================= */}
        <section className="tx-section" id="pro">
          <div className="tx-container">
            <div className="tx-pro-card tx-reveal">
              <div className="tx-pro-grid">
                <div>
                  <div className="tx-pro-eyebrow">
                    <span style={{ color: 'var(--ac)', fontWeight: 700 }}>03 //</span>
                    <span>TOP-X PRO</span>
                  </div>
                  <h2 className="tx-pro-title">For Dedicated Problem Solvers</h2>
                  <p className="tx-pro-desc">
                    Top-X Pro is designed for students who demonstrate steadfast consistency. Build meaningful problem-solving momentum and gain access to curated developer resources.
                  </p>

                  <div className="tx-pro-features">
                    <div className="tx-pro-feature-item">
                      <CheckCircle2 size={16} />
                      <span>Verified Consistency Badge on your student profile and college leaderboard</span>
                    </div>
                    <div className="tx-pro-feature-item">
                      <CheckCircle2 size={16} />
                      <span>Access to advanced Competitive Programming tiers (Div. 2 &amp; Div. 1 curated problem sets)</span>
                    </div>
                    <div className="tx-pro-feature-item">
                      <CheckCircle2 size={16} />
                      <span>Interview Blueprints covering dynamic programming patterns and graph traversals</span>
                    </div>
                    <div className="tx-pro-feature-item">
                      <CheckCircle2 size={16} />
                      <span>Eligible for proposed community streak rewards including stickers and apparel</span>
                    </div>
                  </div>

                  <Link href="/roadmap" className="tx-pro-btn">
                    <span>Explore Roadmaps &amp; Blueprints</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>

                <div className="tx-pro-perk-box">
                  <div className="tx-pro-perk-item">
                    <h4>Consistent Daily Accountability</h4>
                    <p>Compete in healthy college sprints with your batchmates and keep your contribution calendar consistently active.</p>
                  </div>
                  <div className="tx-pro-perk-item">
                    <h4>Multi-Platform Problem Vault</h4>
                    <p>Over 160 curated high-yield questions categorized by patterns, difficulty tags, and platform links.</p>
                  </div>
                  <div className="tx-pro-perk-item">
                    <h4>Community Mentorship</h4>
                    <p>Learn tips and contest post-mortem strategies from top-ranking seniors across engineering cohorts.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================================
            STREAK-BASED REWARDS ROADMAP (#rewards)
            ================================================================= */}
        <section className="tx-section" id="rewards">
          <div className="tx-container">
            <div className="tx-section-head tx-reveal">
              <div className="tx-index-eyebrow">
                <span className="num">04</span>
                <span>// REWARDS ROADMAP</span>
              </div>
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
                <div className="tx-index-eyebrow">
                  <span className="num">05</span>
                  <span>// LEADERBOARD CHAMPIONS</span>
                </div>
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
      </main>

      <AppFooter />
    </div>
  );
}
