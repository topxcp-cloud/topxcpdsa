'use strict';

const DEFAULT_PAGE_SIZE = 10000;
const DEFAULT_MAX_PAGES = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

function indiaIsoDate(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function problemKey(submission) {
  const problem = submission && submission.problem;
  if (!problem || !problem.index) return null;
  const contest = problem.contestId != null ? String(problem.contestId) : String(problem.problemsetName || '');
  return contest ? `${contest}-${problem.index}` : null;
}

function addSubmissionToAggregates(row, aggregates, cutoffSeconds) {
  const id = Number(row && row.id);
  const timestamp = Number(row && row.creationTimeSeconds);
  if (!Number.isSafeInteger(id) || id <= 0 || !Number.isFinite(timestamp) || timestamp <= 0) return false;

  const key = String(id);
  if (aggregates.seenIds.has(key)) return true;
  aggregates.seenIds.add(key);
  aggregates.totalSubmissions++;
  aggregates.lastSubmissionId = Math.max(aggregates.lastSubmissionId, id);

  if (timestamp >= cutoffSeconds) {
    const date = indiaIsoDate(new Date(timestamp * 1000));
    aggregates.dailyCounts[date] = (aggregates.dailyCounts[date] || 0) + 1;
  }
  if (row.verdict === 'OK') {
    const acceptedKey = problemKey(row);
    if (acceptedKey) aggregates.acceptedProblemKeys.add(acceptedKey);
  }
  return true;
}

function validCachedState(handle, state) {
  return Boolean(state && state.initialized === true &&
    String(state.handle || '').toLowerCase() === String(handle).toLowerCase() &&
    Number.isSafeInteger(Number(state.lastSubmissionId)) && Number(state.lastSubmissionId) >= 0 &&
    Number.isFinite(Number(state.totalSubmissions)) && Number(state.totalSubmissions) >= 0 &&
    Array.isArray(state.acceptedProblemKeys));
}

/**
 * Synchronize Codeforces history from the official user.status endpoint.
 *
 * First sync: scans the complete available history and calculates lifetime submission
 * count, lifetime unique accepted problems, latest submission ID, and daily counts
 * for the current 365-day heatmap window.
 *
 * Later syncs: fetches newest pages until the previous latest submission ID is found,
 * then adds only genuinely new submission IDs to the cached lifetime aggregates and
 * returns only the new daily counts. This prevents double-counting on repeated syncs.
 *
 * `complete` means the lifetime scan/delta completed. A partial scan must never be
 * treated as authoritative. `heatmapComplete` is separate so callers can be explicit
 * about whether the 365-day window was completely covered.
 */
async function fetchCodeforcesSubmissionHistory(handle, options = {}) {
  const cleanHandle = String(handle || '').trim();
  if (!/^[A-Za-z0-9_.-]{1,24}$/.test(cleanHandle)) throw new Error('Invalid Codeforces handle');
  if (typeof options.fetchJson !== 'function') throw new Error('A Codeforces JSON fetcher is required');

  const pageSize = Math.max(1, Math.min(10000, Number(options.pageSize) || DEFAULT_PAGE_SIZE));
  const maxPages = Math.max(1, Number(options.maxPages) || DEFAULT_MAX_PAGES);
  const now = Number(options.now) || Date.now();
  const cutoffSeconds = Math.floor((now - 365 * DAY_MS) / 1000);
  const wait = typeof options.wait === 'function' ? options.wait : (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const delayMs = options.delayMs == null ? 0 : Math.max(0, Number(options.delayMs) || 0);
  const cached = validCachedState(cleanHandle, options.state) ? options.state : null;
  const mode = cached ? 'incremental' : 'full';
  const aggregates = {
    seenIds: new Set(),
    acceptedProblemKeys: new Set(cached ? cached.acceptedProblemKeys : []),
    totalSubmissions: cached ? Number(cached.totalSubmissions) : 0,
    lastSubmissionId: cached ? Number(cached.lastSubmissionId) : 0,
    dailyCounts: {}
  };

  let pagesRead = 0;
  let complete = false;
  let hitPreviousBoundary = false;
  let hitHeatmapCutoff = false;
  let malformedRow = false;

  for (let page = 0; page < maxPages; page++) {
    if (page > 0 && delayMs > 0) await wait(delayMs);
    const from = page * pageSize + 1;
    const url = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(cleanHandle)}&from=${from}&count=${pageSize}`;
    const payload = await options.fetchJson(url);
    if (!payload || payload.status !== 'OK' || !Array.isArray(payload.result)) {
      throw new Error((payload && payload.comment) || 'Codeforces submissions are unavailable');
    }
    const rows = payload.result;
    pagesRead++;

    if (rows.length === 0) {
      complete = true;
      hitHeatmapCutoff = true;
      break;
    }

    let pageOldestTimestamp = Infinity;
    for (const row of rows) {
      const id = Number(row && row.id);
      if (!Number.isSafeInteger(id) || id <= 0) {
        malformedRow = true;
        break;
      }

      if (mode === 'incremental' && id <= Number(cached.lastSubmissionId)) {
        hitPreviousBoundary = true;
        break;
      }

      const timestamp = Number(row && row.creationTimeSeconds) || 0;
      if (timestamp > 0) pageOldestTimestamp = Math.min(pageOldestTimestamp, timestamp);
      if (timestamp > 0 && timestamp < cutoffSeconds) hitHeatmapCutoff = true;

      if (!addSubmissionToAggregates(row, aggregates, cutoffSeconds)) {
        malformedRow = true;
        break;
      }
    }

    if (malformedRow) break;
    if (hitPreviousBoundary) {
      complete = true;
      // In incremental mode, the previous latest submission ID is a complete boundary
      // for the new delta; existing historical heatmap dates remain authoritative.
      hitHeatmapCutoff = true;
      break;
    }
    if (rows.length < pageSize) {
      complete = true;
      hitHeatmapCutoff = true;
      break;
    }
    if (mode === 'full' && pageOldestTimestamp < cutoffSeconds) hitHeatmapCutoff = true;
    if (page === maxPages - 1) complete = false;
  }

  // Do not return partial aggregates as if they were authoritative. A caller may
  // preserve its previous values and display a sync warning instead.
  if (!complete || malformedRow) {
    return {
      complete: false,
      heatmapComplete: mode === 'full' && hitHeatmapCutoff,
      mode,
      pagesRead,
      dailyCounts: mode === 'full' && hitHeatmapCutoff ? aggregates.dailyCounts : {},
      state: cached || null,
      totalSubmissions: cached ? Number(cached.totalSubmissions) : null,
      solvedCount: cached ? cached.acceptedProblemKeys.length : null,
      error: malformedRow ? 'Codeforces returned a submission without a valid ID or timestamp.' : 'Codeforces history pagination reached its safety limit before completion.'
    };
  }

  // For incremental sync, the total starts with the cache; count only rows newer than
  // lastSubmissionId. For first sync, aggregates contain the full available history.
  const acceptedProblemKeys = [...aggregates.acceptedProblemKeys].sort();
  const state = {
    initialized: true,
    handle: cleanHandle,
    lastSubmissionId: Math.max(0, aggregates.lastSubmissionId),
    totalSubmissions: aggregates.totalSubmissions,
    acceptedProblemKeys,
    updatedAt: new Date(now).toISOString()
  };

  return {
    complete: true,
    heatmapComplete: mode === 'full' || hitHeatmapCutoff,
    mode,
    pagesRead,
    dailyCounts: aggregates.dailyCounts,
    state,
    totalSubmissions: aggregates.totalSubmissions,
    solvedCount: acceptedProblemKeys.length,
    newestSubmissionId: state.lastSubmissionId
  };
}

module.exports = {
  fetchCodeforcesSubmissionHistory,
  DEFAULT_PAGE_SIZE,
  DEFAULT_MAX_PAGES,
  problemKey,
  validCachedState
};
