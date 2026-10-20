'use strict';

function indiaIsoDate(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function normalizeTimestamp(value) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' && !/^\d+(?:\.\d+)?$/.test(value)) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n < 100000000000 ? n * 1000 : n;
}

function countsFromTimestamps(events) {
  const counts = {};
  for (const event of Array.isArray(events) ? events : []) {
    const timestamp = normalizeTimestamp(event && (event.timestamp ?? event.creationTimeSeconds ?? event.time));
    if (!timestamp) continue;
    const date = indiaIsoDate(new Date(timestamp));
    counts[date] = (counts[date] || 0) + 1;
  }
  return counts;
}

function parseLeetCodeCalendar(calendar) {
  let value = calendar;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch (_) { return {}; }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const counts = {};
  for (const [rawTimestamp, rawCount] of Object.entries(value)) {
    const timestamp = normalizeTimestamp(rawTimestamp);
    const count = Number(rawCount);
    if (!timestamp || !Number.isFinite(count) || count <= 0) continue;
    const date = indiaIsoDate(new Date(timestamp));
    counts[date] = (counts[date] || 0) + Math.floor(count);
  }
  return counts;
}

function parseCodeChefHeatmap(payload) {
  let root = payload;
  if (typeof root === 'string') {
    try { root = JSON.parse(root); } catch (_) { return {}; }
  }
  if (!root || typeof root !== 'object') return {};
  // Community providers wrap their result in one or more `data` objects.
  let node = root;
  for (let i = 0; i < 3 && node && node.data && typeof node.data === 'object'; i++) node = node.data;
  const candidate = node.userDailySubmissionsStats || node.submissionCalendar || node.calendar || node.heatmap || node.dailyActivity || node.counts || node;
  const counts = {};
  const add = (rawDate, rawCount) => {
    const count = Number(rawCount);
    if (!Number.isFinite(count) || count <= 0 || rawDate == null) return;
    let date = String(rawDate).trim();
    // Preserve date-only values exactly; CodeChef dates may be unpadded (YYYY-M-D).
    const dateMatch = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (dateMatch) date = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
    else {
      const numeric = Number(date);
      const timestamp = Number.isFinite(numeric) && numeric > 0
        ? normalizeTimestamp(numeric)
        : Date.parse(date);
      if (!Number.isFinite(timestamp) || timestamp <= 0) return;
      date = indiaIsoDate(new Date(timestamp));
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    counts[date] = (counts[date] || 0) + Math.floor(count);
  };
  if (Array.isArray(candidate)) {
    for (const row of candidate) {
      if (!row || typeof row !== 'object') continue;
      const date = row.date ?? row.day ?? row.timestamp ?? row.time ?? row.submissionDate;
      const count = row.count ?? row.value ?? row.submissions ?? row.total;
      add(date, count);
    }
  } else if (candidate && typeof candidate === 'object') {
    for (const [date, countOrValue] of Object.entries(candidate)) {
      if (countOrValue && typeof countOrValue === 'object') {
        add(date, countOrValue.count ?? countOrValue.value ?? countOrValue.submissions ?? countOrValue.total);
      } else add(date, countOrValue);
    }
  }
  return counts;
}

function mergeDailyCounts(existing, incoming) {
  const merged = { ...(existing && typeof existing === 'object' ? existing : {}) };
  for (const [date, rawCount] of Object.entries(incoming && typeof incoming === 'object' ? incoming : {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const count = Number(rawCount);
    if (!Number.isFinite(count) || count < 0) continue;
    // Syncs are idempotent: replace a day with the current authoritative count,
    // but never lose previously persisted activity when an API returns partial history.
    merged[date] = Math.max(Number(merged[date]) || 0, Math.floor(count));
  }
  return merged;
}

function replacePlatformActivityWindow(existing, platform, incoming, startDate, endDate) {
  const result = {};
  for (const [date, rawPlatforms] of Object.entries(existing && typeof existing === 'object' ? existing : {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !rawPlatforms || typeof rawPlatforms !== 'object') continue;
    const values = { ...rawPlatforms };
    if (date >= startDate && date <= endDate) delete values[platform];
    if (Object.values(values).some(value => Number(value) > 0)) result[date] = values;
  }
  for (const [date, rawCount] of Object.entries(incoming && typeof incoming === 'object' ? incoming : {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < startDate || date > endDate) continue;
    const count = Number(rawCount);
    if (!Number.isFinite(count) || count < 0) continue;
    if (!result[date]) result[date] = {};
    result[date][platform] = Math.floor(count);
  }
  return result;
}

function buildDailyActivity(submissionActivityByDay) {
  const result = {};
  for (const [date, platforms] of Object.entries(submissionActivityByDay || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !platforms || typeof platforms !== 'object') continue;
    const day = {
      leetcode: Math.max(0, Number(platforms.leetcode) || 0),
      codeforces: Math.max(0, Number(platforms.codeforces) || 0),
      codechef: Math.max(0, Number(platforms.codechef) || 0)
    };
    day.total = day.leetcode + day.codeforces + day.codechef;
    if (day.total > 0) result[date] = day;
  }
  return result;
}

function clearPlatformActivity(submissionActivityByDay, platform) {
  const result = {};
  for (const [date, rawPlatforms] of Object.entries(submissionActivityByDay || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !rawPlatforms || typeof rawPlatforms !== 'object') continue;
    const platforms = { ...rawPlatforms };
    delete platforms[platform];
    const hasActivity = ['leetcode', 'codeforces', 'codechef'].some(name => Number(platforms[name]) > 0);
    if (hasActivity) result[date] = platforms;
  }
  return result;
}

function activityMetrics(dailyActivity, todayISO) {
  const activeDates = Object.keys(dailyActivity || {})
    .filter(date => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
      const activity = dailyActivity[date];
      return Number(activity?.total) > 0 ||
        ['leetcode', 'codeforces', 'codechef'].some(platform => Number(activity?.[platform]) > 0);
    })
    .sort();
  const activeSet = new Set(activeDates);
  const previousDate = isoDate => {
    const [year, month, day] = isoDate.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day - 1)).toISOString().slice(0, 10);
  };
  const yesterday = previousDate(todayISO);
  let currentStreak = 0;
  let check = activeSet.has(todayISO) ? todayISO : (activeSet.has(yesterday) ? yesterday : null);
  while (check && activeSet.has(check)) {
    currentStreak++;
    check = previousDate(check);
  }
  let longestStreak = 0;
  let running = 0;
  let previous = null;
  for (const date of activeDates) {
    running = previous && previousDate(date) === previous ? running + 1 : 1;
    longestStreak = Math.max(longestStreak, running);
    previous = date;
  }
  return { totalActiveDays: activeDates.length, currentStreak, longestStreak };
}

module.exports = { indiaIsoDate, normalizeTimestamp, countsFromTimestamps, parseLeetCodeCalendar, parseCodeChefHeatmap, mergeDailyCounts, replacePlatformActivityWindow, buildDailyActivity, clearPlatformActivity, activityMetrics };
