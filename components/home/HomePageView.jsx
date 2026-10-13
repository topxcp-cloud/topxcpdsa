'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../legacy-src/features/auth/useAuth.js';
import AuthGate from '../legacy-src/components/shell/AuthGate.jsx';
import AppHeader from '../legacy-src/components/shell/AppHeader.jsx';
import AppFooter from '../legacy-src/components/shell/AppFooter.jsx';
import ContributionHeatmap from '../profile/ContributionHeatmap.jsx';
import { api } from '../legacy-src/lib/api.js';

export default function HomePageView() {
  const auth = useAuth();
  const router = useRouter();
  const [topMembers, setTopMembers] = useState([]);

  useEffect(() => {
    api('/api/leaderboard?metric=streak')
      .then((data) => {
        if (Array.isArray(data.members)) {
          setTopMembers(data.members.slice(0, 3));
        }
      })
      .catch(() => {});
  }, []);

  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <div className="topx-react-app home-page-app">
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

      <AppHeader onOpenAuth={() => setAuthModalOpen(true)} />

      <main className="home-main-container">
        {/* HERO SECTION */}
        <section className="home-hero-section">
          <div className="home-hero-content">
            <div className="home-badge-pill">
              <span className="pulse-dot" />
              <span>Student-Driven Coding Community</span>
            </div>

            <h1 className="home-hero-headline">
              Write Code. Build Consistency. Push Your Limits.
            </h1>

            <p className="home-hero-description">
              My Topics Club is where curious minds become consistent problem solvers. Track your coding journey,
              challenge your friends, climb the leaderboard, and turn everyday practice into lasting progress.
            </p>

            <div className="home-hero-actions">
              <Link href="/leaderboard" className="btn-primary home-primary-btn">
                <span>Explore Leaderboard</span>
                <span className="btn-arrow">→</span>
              </Link>
              <Link href={auth.user ? '/profile' : '/progress'} className="btn-secondary home-secondary-btn">
                <span>Start Your Streak</span>
              </Link>
            </div>

            <div className="home-platform-chips">
              <span className="chips-label">Tracking accepted problems across:</span>
              <div className="platform-tag-group">
                <span className="platform-tag lc">LeetCode</span>
                <span className="platform-tag cf">Codeforces</span>
                <span className="platform-tag cc">CodeChef</span>
              </div>
            </div>
          </div>

          {/* HERO VISUAL: Live Technical Activity Card */}
          <div className="home-hero-visual-wrap">
            <div className="hero-activity-card">
              <div className="hero-activity-header">
                <div className="terminal-dots">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="terminal-title">club_activity_stream.log</div>
                <div className="terminal-status">LIVE</div>
              </div>

              <div className="hero-activity-body">
                <div className="activity-stat-row">
                  <div>
                    <span className="sm">Community Momentum</span>
                    <div className="stat-big-val">🔥 Daily Streaks</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="sm">Verified Sync</span>
                    <div className="stat-tag-clean">Asia/Kolkata</div>
                  </div>
                </div>

                <div className="hero-code-block">
                  <code>
                    <span className="code-kw">function</span> <span className="code-fn">achieveMastery</span>() &#123;<br />
                    &nbsp;&nbsp;<span className="code-kw">while</span> (curious) &#123;<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;solve(problem);<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;streak++;<br />
                    &nbsp;&nbsp;&nbsp;&nbsp;learnFromMistakes();<br />
                    &nbsp;&nbsp;&#125;<br />
                    &#125;
                  </code>
                </div>

                {/* Heatmap preview bar */}
                <div className="hero-preview-heatmap">
                  <span className="sm">Recent Club Activity Consistency:</span>
                  <div className="preview-heat-grid">
                    {Array.from({ length: 28 }).map((_, i) => {
                      const level = (i * 3 + 2) % 5;
                      return <span key={i} className={`heatmap-cell heatmap-cell-${level}`} />;
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MISSION & VALUES */}
        <section className="home-section home-values-section">
          <div className="home-section-header">
            <span className="section-eyebrow">Core Principles</span>
            <h2>Why My Topics Club Exists</h2>
            <p className="sub">
              Built for students who want genuine technical growth without generic corporate landing pages or artificial metrics.
            </p>
          </div>

          <div className="home-values-grid">
            <div className="home-value-card">
              <div className="value-icon">⚡</div>
              <h3>Consistency Over Bursts</h3>
              <p>
                Solving two problems every day compounds faster than occasional all-nighters before contest deadlines. We build habits that last.
              </p>
            </div>

            <div className="home-value-card">
              <div className="value-icon">🤝</div>
              <h3>Healthy College Competition</h3>
              <p>
                Compete with classmates, section peers, and seniors in a healthy, transparent atmosphere that encourages everyone to level up.
              </p>
            </div>

            <div className="home-value-card">
              <div className="value-icon">🌐</div>
              <h3>Unified Problem Tracking</h3>
              <p>
                Bring your LeetCode DSA solves, Codeforces contest rating, and CodeChef challenges together under one verified student profile.
              </p>
            </div>

            <div className="home-value-card">
              <div className="value-icon">📈</div>
              <h3>Recognizing Daily Momentum</h3>
              <p>
                Streaks and consistency receive equal recognition alongside absolute problem totals. Growth matters just as much as rank.
              </p>
            </div>

            <div className="home-value-card">
              <div className="value-icon">🎓</div>
              <h3>Cross-Batch Discovery</h3>
              <p>
                Find ambitious peers across First, Second, Third, and Final years, spanning CSE, IT, Electrical, Mechanical, and Core branches.
              </p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="home-section home-steps-section">
          <div className="home-section-header">
            <span className="section-eyebrow">Getting Started</span>
            <h2>How It Works</h2>
            <p className="sub">Four straightforward steps to turn daily practice into college recognition.</p>
          </div>

          <div className="home-steps-grid">
            <div className="home-step-card">
              <div className="step-num">01</div>
              <h4>Create Your Profile</h4>
              <p>Sign up with your college email or Google. Specify your branch, academic year, and section to join your cohort.</p>
            </div>

            <div className="home-step-card">
              <div className="step-num">02</div>
              <h4>Connect Coding Handles</h4>
              <p>Link your public LeetCode, Codeforces, and CodeChef usernames. No passwords or private tokens are ever requested.</p>
            </div>

            <div className="home-step-card">
              <div className="step-num">03</div>
              <h4>Track Problems & Streaks</h4>
              <p>Hit Sync to pull your verified accepted submissions. Watch your contribution calendar light up in green.</p>
            </div>

            <div className="home-step-card">
              <div className="step-num">04</div>
              <h4>Climb The Leaderboard</h4>
              <p>Filter rankings by your branch or section, compare consistency with friends, and celebrate technical milestones.</p>
            </div>
          </div>
        </section>

        {/* COMMUNITY CONSISTENCY SHOWCASE */}
        {topMembers.length > 0 && (
          <section className="home-section home-podium-preview">
            <div className="home-section-header">
              <span className="section-eyebrow">Top Consistent Peers</span>
              <h2>Active Streak Champions</h2>
              <p className="sub">Real students currently leading the college consistency streak.</p>
            </div>

            <div className="home-podium-grid">
              {topMembers.map((m, idx) => (
                <div key={m.id} className="home-podium-item">
                  <div className="podium-badge">Rank #{idx + 1}</div>
                  <h4>{m.n}</h4>
                  <span className="sm" style={{ color: 'var(--mute)' }}>
                    {m.branch || 'CSE'} • Year {m.academicYear || 1} • Sec {m.section || 'A'}
                  </span>
                  <div className="podium-streak-tag">
                    🔥 {m.streak || 0} day streak
                  </div>
                  <div className="podium-solved-txt">
                    {m.s || 0} unique problems solved
                  </div>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <Link href="/leaderboard" className="btn-primary" style={{ display: 'inline-flex', padding: '10px 22px' }}>
                View Full College Leaderboard →
              </Link>
            </div>
          </section>
        )}

        {/* CALL TO ACTION */}
        <section className="home-cta-section">
          <div className="home-cta-box">
            <h2>Ready to build your coding habit?</h2>
            <p>Join fellow students tracking their competitive programming progress today.</p>
            <div className="cta-actions">
              <Link href="/profile" className="btn-primary">
                Create Free Profile
              </Link>
              <Link href="/leaderboard" className="btn-secondary">
                Explore Leaderboard
              </Link>
            </div>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
