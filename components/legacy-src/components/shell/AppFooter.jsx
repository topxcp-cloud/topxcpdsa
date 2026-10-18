/** AppFooter: reusable React shell component. */
export default function AppFooter() {
  return (
<footer className="app-footer">
      <div>
        <b>Top-X</b> · Code. Complete. Conquer.
      </div>
      <div className="footer-links">
        <a href="/">Home</a>
        <a href="/leaderboard">Leaderboard</a>
        <a href="/profile">My Profile</a>
        <a href="/problems">Problem Vault</a>
        <a href="/roadmap">Roadmaps</a>
        <a href="/progress">Weekly Tasks</a>
        <a href="/contests">Guides</a>
      </div>
      <div>
        <span>Student-Driven Competitive Programming</span>
      </div>
    </footer>
  );
}
