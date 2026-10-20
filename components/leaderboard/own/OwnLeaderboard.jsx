"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../legacy-src/features/auth/useAuth.js";
import "./own-leaderboard.css";
import Podium from "./Podium.jsx";
import LeaderTable from "./LeaderTable.jsx";
import Pagination from "./Pagination.jsx";
import MeBar from "./MeBar.jsx";

import {
  YEAR_OPTIONS,
  BRANCH_OPTIONS,
  SECTION_OPTIONS,
  PAGE_SIZE,
  buildView,
  loadMe,
  maxSolvedCount,
  studentKey,
} from "./data.js";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function OwnLeaderboard() {
  const auth = useAuth();
  const initialName = auth.user?.name || loadMe();

  const [me, setMe] = useState(initialName);
  const [students, setStudents] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState("");
  const currentStudent = students.find((student) => student.n === me);
  const meKey = auth.user?.id != null
    ? `id:${String(auth.user.id)}`
    : studentKey(currentStudent || { n: me });

  // Multi-filter state for Year, Branch, Section, and Search query
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [page, setPage] = useState(1);
  const [instant, setInstant] = useState(false);
  const [pinged, setPinged] = useState(null);

  useEffect(() => {
    setMe(auth.user?.name || loadMe());
  }, [auth.user?.name]);

  // Load members ranked by current streak; solved counts remain supplemental.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setDataLoading(true);
      setDataError("");
      try {
        const response = await fetch("/api/leaderboard?metric=streak", { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load leaderboard data. Please try again.");
        const data = await response.json();
        const all = Array.isArray(data.members) ? data.members : [];

        const mapped = all.map((m) => {
          return {
            id: m.id,
            n: String(m.n || "Member"),
            avatar: m.avatar || "",
            s: Number(m.s) || 0,
            currentStreak: Number(m.streak) || 0,
            k: Number(m.k) || 0,
            rating: Number(m.k) || 0,
            b: m.b || m.branch || "",
            y: Number(m.y) || null,
            c: m.c || m.section || "",
            academicYear: m.academicYear || "",
          };
        });

        if (!cancelled) setStudents(mapped);
      } catch (err) {
        if (!cancelled) setDataError(err?.message || "Leaderboard is currently unavailable.");
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Sync navbar offset for table header docking and jump-to scrolling
  useEffect(() => {
    const nav = document.querySelector(".app-header") || document.querySelector("header") || document.querySelector("nav");
    const updateOffset = () => {
      const navHeight = nav ? nav.offsetHeight : 64;
      document.documentElement.style.setProperty("--stk", `${navHeight}px`);
    };
    updateOffset();
    window.addEventListener("resize", updateOffset);
    return () => window.removeEventListener("resize", updateOffset);
  }, []);

  // Multi-filtering: Year, Branch, Section, and Search query work simultaneously
  const activeFilters = useMemo(
    () => ({
      year: selectedYear,
      branch: selectedBranch,
      section: selectedSection,
      query: searchQuery,
    }),
    [selectedYear, selectedBranch, selectedSection, searchQuery]
  );

  const viewKey = `${selectedYear ?? "all"}|${selectedBranch ?? "all"}|${selectedSection ?? "all"}|${searchQuery.trim()}`;

  const { sorted: list, prevRank } = useMemo(
    () => buildView(activeFilters, students),
    [activeFilters, students]
  );

  const top = list.slice(0, 3);
  const rows = list.slice(3);
  const pageCount = Math.ceil(rows.length / PAGE_SIZE);
  const topScore = maxSolvedCount(list);

  const meIdx = list.findIndex((student) => studentKey(student) === meKey);

  // Clamp page if a filter reduces the number of available pages.
  useEffect(() => {
    const maxPage = Math.max(1, pageCount);
    setPage((current) => Math.min(current, maxPage));
  }, [pageCount]);

  const resetPaging = () => {
    setPage(1);
    setInstant(false);
  };

  const handleYearClick = (yearVal) => {
    setSelectedYear((prev) => (prev === yearVal ? null : yearVal));
    resetPaging();
  };

  const handleBranchClick = (branchVal) => {
    setSelectedBranch((prev) => (prev === branchVal ? null : branchVal));
    resetPaging();
  };

  const handleSectionClick = (sectionVal) => {
    setSelectedSection((prev) => (prev === sectionVal ? null : sectionVal));
    resetPaging();
  };

  const clearAllFilters = () => {
    setSelectedYear(null);
    setSelectedBranch(null);
    setSelectedSection(null);
    setSearchQuery("");
    resetPaging();
  };

  const hasActiveFilters =
    selectedYear !== null ||
    selectedBranch !== null ||
    selectedSection !== null ||
    Boolean(searchQuery.trim());

  const go = (target) => {
    const nextPage = Math.max(1, Math.min(pageCount, target));
    if (nextPage === page) return;
    setPage(nextPage);
    setInstant(true);
  };

  const onPagerGo = (direction) => {
    if (direction === "p") go(page - 1);
    else if (direction === "n") go(page + 1);
    else go(direction);
  };

  // Jump to a student, switching to All if active filter hides them.
  const jumpTo = (key) => {
    let targetList = list;
    let index = targetList.findIndex((student) => studentKey(student) === key);
    let switched = false;

    if (index < 0) {
      targetList = buildView({}, students).sorted;
      index = targetList.findIndex((student) => studentKey(student) === key);
      switched = true;
    }

    if (index < 0) return;

    const targetPage = index < 3 ? 1 : Math.floor((index - 3) / PAGE_SIZE) + 1;

    if (switched) {
      clearAllFilters();
      setPage(targetPage);
      setInstant(true);
    } else if (index >= 3 && targetPage !== page) {
      setPage(targetPage);
      setInstant(true);
    }

    setPinged(key);

    window.setTimeout(() => {
      const element = [...document.querySelectorAll("[data-student-key]")].find(
        (node) => node.dataset.studentKey === key
      );

      if (!element) return;

      const stickyOffset =
        parseInt(
          getComputedStyle(document.documentElement).getPropertyValue("--stk")
        ) || 64;

      const rect = element.getBoundingClientRect();
      const targetY =
        window.scrollY +
        rect.top -
        stickyOffset -
        (window.innerHeight - stickyOffset - element.offsetHeight) / 2;

      window.scrollTo({
        top: targetY,
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    }, 120);

    window.setTimeout(() => {
      setPinged((current) => (current === key ? null : current));
    }, 2800);
  };

  const shared = {
    meKey,
    pinged,
    prevRank,
  };

  return (
    <section className="own-leaderboard">
      <MeBar
        rank={meIdx + 1}
        streak={meIdx >= 0 ? list[meIdx].currentStreak : 0}
        onJump={() => jumpTo(meKey)}
        deps={[viewKey, page, list.length]}
      />

      <main>
        {dataError && (
          <div className="own-lb-alert" role="alert" style={{ margin: "16px 0", padding: "12px 18px", borderRadius: "8px", background: "rgba(239,68,68,0.1)", color: "#dc2626" }}>
            {dataError} <button type="button" onClick={() => window.location.reload()} style={{ marginLeft: "10px", padding: "4px 8px" }}>Retry</button>
          </div>
        )}
        {dataLoading && (
          <div className="own-lb-loading" role="status" style={{ textAlign: "center", padding: "30px", color: "var(--mute)" }}>
            Loading live verified rankings…
          </div>
        )}

        <div className="top">
          <h1>Leaderboard</h1>
          <p className="sub">
            Ranked only by current streak. Problem counts are shown for reference.
          </p>
        </div>

        {/* Modern Theme-Matched Control Panel */}
        <div className="lb-controls-panel" role="region" aria-label="Leaderboard Filters">
          {/* Top Row: Search Input + Live Stats / Clear Button */}
          <div className="lb-controls-top">
            <div className="lb-search-wrap">
              <svg className="lb-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                type="text"
                className="lb-search-input"
                value={searchQuery}
                placeholder="Search students by name, branch, or section…"
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  resetPaging();
                }}
                aria-label="Search student by name or branch"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="lb-search-clear"
                  onClick={() => {
                    setSearchQuery("");
                    resetPaging();
                  }}
                  aria-label="Clear search query"
                >
                  ×
                </button>
              )}
            </div>

            <div className="lb-status-bar">
              <span className="lb-metric-badge">
                <span className="lb-streak-fire">🔥</span>
                Ranked by Streak
              </span>

              <span className="lb-count-pill" aria-live="polite">
                <b>{list.length}</b> {list.length === 1 ? "student" : "students"}
              </span>

              {hasActiveFilters && (
                <button
                  type="button"
                  className="lb-clear-all-btn"
                  onClick={clearAllFilters}
                  aria-label="Clear all active filters"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Filter Rows */}
          <div className="lb-filter-rows">
            {/* Year Row */}
            <div className="lb-filter-row">
              <div className="lb-filter-label">
                <span className="lb-filter-icon">🎓</span>
                <span>Year</span>
              </div>
              <div className="lb-filter-chips" role="group" aria-label="Filter by Year">
                <button
                  type="button"
                  className={`lb-chip-btn ${selectedYear === null ? "on" : ""}`}
                  aria-pressed={selectedYear === null}
                  onClick={() => { setSelectedYear(null); resetPaging(); }}
                >
                  All Years
                </button>
                {YEAR_OPTIONS.map((opt) => {
                  const isSelected = selectedYear === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`lb-chip-btn ${isSelected ? "on" : ""}`}
                      aria-pressed={isSelected}
                      onClick={() => handleYearClick(opt.value)}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Branch Row */}
            <div className="lb-filter-row">
              <div className="lb-filter-label">
                <span className="lb-filter-icon">🏛️</span>
                <span>Branch</span>
              </div>
              <div className="lb-filter-chips" role="group" aria-label="Filter by Branch">
                <button
                  type="button"
                  className={`lb-chip-btn ${selectedBranch === null ? "on" : ""}`}
                  aria-pressed={selectedBranch === null}
                  onClick={() => { setSelectedBranch(null); resetPaging(); }}
                >
                  All Branches
                </button>
                {BRANCH_OPTIONS.map((opt) => {
                  const isSelected = selectedBranch === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`lb-chip-btn ${isSelected ? "on" : ""}`}
                      aria-pressed={isSelected}
                      onClick={() => handleBranchClick(opt.value)}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section Row */}
            <div className="lb-filter-row">
              <div className="lb-filter-label">
                <span className="lb-filter-icon">🏷️</span>
                <span>Section</span>
              </div>
              <div className="lb-filter-chips" role="group" aria-label="Filter by Section">
                <button
                  type="button"
                  className={`lb-chip-btn ${selectedSection === null ? "on" : ""}`}
                  aria-pressed={selectedSection === null}
                  onClick={() => { setSelectedSection(null); resetPaging(); }}
                >
                  All Sections
                </button>
                {SECTION_OPTIONS.map((opt) => {
                  const isSelected = selectedSection === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`lb-chip-btn ${isSelected ? "on" : ""}`}
                      aria-pressed={isSelected}
                      onClick={() => handleSectionClick(opt.value)}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <Podium top={top} viewKey={viewKey} {...shared} />

        <LeaderTable
          rows={rows}
          topScore={topScore}
          page={page}
          instant={instant}
          viewKey={viewKey}
          {...shared}
        />

        <Pagination
          pageCount={pageCount}
          page={page}
          onGo={onPagerGo}
        />

        {!dataLoading && list.length === 0 && (
          <div className="em">
            <p>No students match the selected filters.</p>
            <button type="button" onClick={clearAllFilters}>
              Clear filters
            </button>
          </div>
        )}
      </main>
    </section>
  );
}
