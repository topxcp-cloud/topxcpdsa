'use strict';

function getWeeklyTaskCompletions(user, tasksById, windowStart, now) {
  const completions = [];
  for (const [taskId, verification] of Object.entries(user.verifiedTasks || {})) {
    const verifiedAt = Date.parse(String(verification && verification.verifiedAt || ''));
    if (!verification || verification.verified !== true || !Number.isFinite(verifiedAt) || verifiedAt < windowStart || verifiedAt > now) continue;
    const task = tasksById.get(taskId);
    if (task) completions.push(task);
  }
  return completions;
}

module.exports = { getWeeklyTaskCompletions };
