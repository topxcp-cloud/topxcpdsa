'use client';
import React from 'react';
import Link from 'next/link';

/**
 * AppFooter: Expansive, clean, multi-column footer inspired by Apple's design system.
 */
export default function AppFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="apple-footer" role="contentinfo" aria-label="Top-X Footer">
      <div className="apple-footer-content">
        {/* Apple-style Top Disclaimers / Footnotes */}
        <section className="apple-footer-disclaimer" aria-label="Footnotes">
          <p>
            1. Top-X is a student-driven competitive programming and habit-building arena. Daily practice streaks and solved problems are verified automatically through live synchronization with official LeetCode, Codeforces, and CodeChef APIs.
          </p>
          <p>
            2. Maintaining an active streak requires at least one verified accepted submission per calendar day across any linked coding platform. Available to all registered student developers.
          </p>
        </section>

        {/* 5-Column Directory Navigation (Apple signature layout) */}
        <nav className="apple-footer-directory" aria-label="Directory Navigation">
          {/* Column 1 */}
          <div className="apple-footer-column">
            <div className="apple-footer-section">
              <h3 className="apple-footer-section-title">Platform &amp; Practice</h3>
              <ul className="apple-footer-list">
                <li><Link href="/">Home</Link></li>
                <li><Link href="/leaderboard">College Leaderboard</Link></li>
                <li><Link href="/progress">Weekly Tasks</Link></li>
                <li><Link href="/events">Event Registration</Link></li>
                <li><Link href="/profile">My Profile</Link></li>
              </ul>
            </div>
            <div className="apple-footer-section">
              <h3 className="apple-footer-section-title">Top-X Engine</h3>
              <ul className="apple-footer-list">
                <li><span className="apple-footer-list-static">Daily Streak Counter</span></li>
                <li><span className="apple-footer-list-static">Automated Verification</span></li>
              </ul>
            </div>
          </div>

          {/* Column 2 */}
          <div className="apple-footer-column">
            <div className="apple-footer-section">
              <h3 className="apple-footer-section-title">Student Account</h3>
              <ul className="apple-footer-list">
                <li><Link href="/profile">Manage Profile</Link></li>
                <li><Link href="/profile">Linked Coding Handles</Link></li>
                <li><Link href="/profile">Streak History</Link></li>
              </ul>
            </div>
            <div className="apple-footer-section">
              <h3 className="apple-footer-section-title">Competitive Batch</h3>
              <ul className="apple-footer-list">
                <li><Link href="/leaderboard">Batch Standings</Link></li>
                <li><span className="apple-footer-list-static">Branch Rankings</span></li>
                <li><span className="apple-footer-list-static">Section Consistency</span></li>
                <li><span className="apple-footer-list-static">Active Streak Champions</span></li>
              </ul>
            </div>
          </div>

          {/* Column 3 */}
          <div className="apple-footer-column">
            <div className="apple-footer-section">
              <h3 className="apple-footer-section-title">Supported Judges</h3>
              <ul className="apple-footer-list">
                <li><span className="apple-footer-list-static">LeetCode Solves</span></li>
                <li><span className="apple-footer-list-static">Codeforces Contests</span></li>
                <li><span className="apple-footer-list-static">CodeChef Practice</span></li>
                <li><span className="apple-footer-list-static">Automated Verdict Check</span></li>
                <li><span className="apple-footer-list-static">Activity Heatmap</span></li>
                <li><span className="apple-footer-list-static">Real Accepted Submissions</span></li>
              </ul>
            </div>
          </div>

          {/* Column 4 */}
          <div className="apple-footer-column">
            <div className="apple-footer-section">
              <h3 className="apple-footer-section-title">Campus &amp; Community</h3>
              <ul className="apple-footer-list">
                <li><span className="apple-footer-list-static">Student Chapters</span></li>
                <li><span className="apple-footer-list-static">Peer Accountability</span></li>
                <li><span className="apple-footer-list-static">Daily Practice Habit</span></li>
                <li><span className="apple-footer-list-static">Weekly Goal Challenges</span></li>
                <li><Link href="/events">Campus Events</Link></li>
              </ul>
            </div>
            <div className="apple-footer-section">
              <h3 className="apple-footer-section-title">Honor Standard</h3>
              <ul className="apple-footer-list">
                <li><span className="apple-footer-list-static">Academic Integrity</span></li>
                <li><span className="apple-footer-list-static">Fair Practice Code</span></li>
              </ul>
            </div>
          </div>

          {/* Column 5 */}
          <div className="apple-footer-column">
            <div className="apple-footer-section">
              <h3 className="apple-footer-section-title">Top-X Values</h3>
              <ul className="apple-footer-list">
                <li><span className="apple-footer-list-static">100% Student-Driven</span></li>
                <li><span className="apple-footer-list-static">Consistency Over Cramming</span></li>
                <li><span className="apple-footer-list-static">Transparent Leaderboards</span></li>
                <li><span className="apple-footer-list-static">Open Coding Arena</span></li>
              </ul>
            </div>
            <div className="apple-footer-section">
              <h3 className="apple-footer-section-title">About Top-X</h3>
              <ul className="apple-footer-list">
                <li><span className="apple-footer-list-static">Mission &amp; Philosophy</span></li>
                <li><span className="apple-footer-list-static">Campus Guidelines</span></li>
                <li><span className="apple-footer-list-static">Verification Pipelines Online</span></li>
              </ul>
            </div>
          </div>
        </nav>

        {/* Secondary notice (Apple "More ways to shop" style) */}
        <section className="apple-footer-shop-notice">
          More ways to practice: Track your accepted solutions across <Link href="/profile">LeetCode</Link>, <Link href="/profile">Codeforces</Link>, and <Link href="/profile">CodeChef</Link>, or explore the <Link href="/leaderboard">College Leaderboard</Link>.
        </section>

        {/* Bottom Legal, Copyright & Locale */}
        <div className="apple-footer-legal">
          <div className="apple-footer-legal-copyright">
            Copyright &copy; {currentYear} Top-X Community. All rights reserved.
          </div>
          <div className="apple-footer-legal-links">
            <Link href="/">Student Guidelines</Link>
            <span className="apple-footer-legal-sep" aria-hidden="true">|</span>
            <Link href="/">Academic Integrity</Link>
            <span className="apple-footer-legal-sep" aria-hidden="true">|</span>
            <Link href="/">Verification Policy</Link>
            <span className="apple-footer-legal-sep" aria-hidden="true">|</span>
            <Link href="/leaderboard">Campus Directory</Link>
          </div>
          <div className="apple-footer-locale">
            India
          </div>
        </div>
      </div>
    </footer>
  );
}
