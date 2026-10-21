'use client';
import React from 'react';
import Link from 'next/link';
import styles from './AppFooter.module.css';

/**
 * AppFooter: Clean, professional 4-column footer matching Top-X brand aesthetic.
 */
export default function AppFooter() {
  return (
    <footer className={styles.footer} role="contentinfo" aria-label="Top-X Footer">
      <div className={styles.container}>
        {/* Main 4-column grid */}
        <div className={styles.grid}>
          {/* Column 1: Brand */}
          <div className={styles.brandCol}>
            <Link href="/" className={styles.brandLink} aria-label="Top-X Home">
              <svg className={styles.brandLogo} viewBox="340 150 910 500" aria-hidden="true">
                <polygon fill="currentColor" points="538,208 587,254 449,393 579,527 529,577 354,395" />
                <polygon fill="currentColor" points="1059,208 1239,392 1059,575 1011,527 1143,391 1009,254" />
                <polygon fill="#ff7a1a" points="988,159 1027,159 547,640 508,640" />
                <polygon fill="#5F5F5F" points="625,255 717,255 796,334 745,383 678,313" />
                <polygon fill="#ff7a1a" points="625,367 678,313 745,383 694,438" />
                <polygon fill="#ff7a1a" points="942,334 989,382 897,478 850,430" />
                <polygon fill="#5F5F5F" points="770,433 813,390 850,430 897,478 959,544 871,544" />
                <polygon fill="#FFA477" points="832,369 870,410 850,430 813,390" />
              </svg>
              <span className={styles.brandName}>TOP-X</span>
            </Link>

            <div className={styles.tagline}>CODE. COMPETE. CONQUER.</div>

            <p className={styles.description}>
              The student-driven competitive programming arena for building consistent daily habits, verifying real solves across judges, and climbing the college leaderboard.
            </p>

            <div className={styles.statusBadge} aria-label="System status">
              <span className={styles.statusDot} aria-hidden="true" />
              <span>Multi-Judge Verification Active</span>
            </div>
          </div>

          {/* Column 2: Explore */}
          <div className={styles.column}>
            <h3 className={styles.colTitle}>EXPLORE</h3>
            <ul className={styles.linkList}>
              <li><Link href="/" className={styles.linkItem}>Home</Link></li>
              <li><Link href="/progress" className={styles.linkItem}>Weekly Tasks</Link></li>
              <li><Link href="/leaderboard" className={styles.linkItem}>Batch Leaderboard</Link></li>
              <li><Link href="/events" className={styles.linkItem}>Campus Events</Link></li>
            </ul>
          </div>

          {/* Column 3: Account */}
          <div className={styles.column}>
            <h3 className={styles.colTitle}>ACCOUNT</h3>
            <ul className={styles.linkList}>
              <li><Link href="/profile" className={styles.linkItem}>My Profile</Link></li>
              <li><Link href="/settings" className={styles.linkItem}>Account Settings</Link></li>
              <li><Link href="/progress" className={styles.linkItem}>Streak Rewards</Link></li>
              <li><Link href="/login" className={styles.linkItem}>Student Sign In</Link></li>
            </ul>
          </div>

          {/* Column 4: Community */}
          <div className={styles.column}>
            <h3 className={styles.colTitle}>COMMUNITY</h3>
            <ul className={styles.linkList}>
              <li><Link href="/about" className={styles.linkItem}>About Top-X</Link></li>
              <li><Link href="/leaderboard" className={styles.linkItem}>Hall of Fame</Link></li>
              <li><Link href="/events" className={styles.linkItem}>Contest Registration</Link></li>
              <li><Link href="/about" className={styles.linkItem}>Community Standards</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className={styles.bottomRow}>
          <p className={styles.copyright}>
            &copy; 2026 Top-X Community. Built for collegiate problem solvers.
          </p>
          <div className={styles.bottomRight}>
            <div className={styles.verifiedBadge}>
              <svg className={styles.shieldIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Verified Submissions Only</span>
            </div>
            <span className={styles.locationLabel}>INDIA</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
