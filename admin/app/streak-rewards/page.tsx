'use client';

import { useEffect, useState } from 'react';
import { AdminLayout } from '../../src/components/AdminLayout';
import { getStreakRewardClaims } from '../../src/services/api';
import type { StreakRewardClaim } from '../../src/types';
import { Award, CalendarDays, CircleAlert, Users } from 'lucide-react';
import styles from './streak-rewards.module.css';

export default function StreakRewardsPage() {
  const [claims, setClaims] = useState<StreakRewardClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    getStreakRewardClaims()
      .then(result => { if (active) setClaims(result.claims || []); })
      .catch(err => { if (active) setError(err.message || 'Could not load reward claims.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const milestoneCounts = [30, 50, 75, 100].map(milestone => ({
    milestone,
    count: claims.filter(claim => claim.milestone === milestone).length
  }));

  return (
    <AdminLayout title="Streak Rewards">
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>MEMBER MILESTONES</span>
            <h1><Award size={25} /> Streak reward claims</h1>
            <p>Review member details for completed 30, 50, 75, and 100-day streak rewards.</p>
          </div>
          <div className={styles.total}><Users size={18} /> {claims.length} claims</div>
        </header>

        {error ? <div className={styles.error} role="alert"><CircleAlert size={17} />{error}</div> : null}

        <section className={styles.summary} aria-label="Claims by milestone">
          {milestoneCounts.map(item => (
            <article className={styles.summaryCard} key={item.milestone}>
              <span><Award size={17} /> {item.milestone}-day milestone</span>
              <strong>{item.count}</strong>
            </article>
          ))}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <div><h2>Claimed rewards</h2><p>Name and profile details recorded when each member claimed.</p></div>
          </div>
          {loading ? <p className={styles.empty}>Loading reward claims…</p> : claims.length ? (
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Milestone</th>
                    <th>College</th>
                    <th>Branch / year / section</th>
                    <th>Streak at claim</th>
                    <th>Claimed at</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map(claim => (
                    <tr key={claim.id}>
                      <td>
                        <strong>{claim.name || 'Member'}</strong>
                        {claim.email ? <a href={`mailto:${claim.email}`}>{claim.email}</a> : <span className={styles.muted}>No email</span>}
                      </td>
                      <td><span className={styles.badge}><Award size={14} /> {claim.milestone} days</span></td>
                      <td>{claim.college || <span className={styles.muted}>Not provided</span>}</td>
                      <td>{[claim.branch, claim.academicYear, claim.section ? `Section ${claim.section}` : ''].filter(Boolean).join(' · ') || <span className={styles.muted}>Not provided</span>}</td>
                      <td>{claim.currentStreak} current · {claim.longestStreak} best</td>
                      <td><span className={styles.date}><CalendarDays size={14} /> {new Date(claim.claimedAt).toLocaleString()}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.empty}>{error ? 'Reward claims could not be loaded.' : 'No streak rewards have been claimed yet.'}</p>
          )}
        </section>
      </main>
    </AdminLayout>
  );
}
