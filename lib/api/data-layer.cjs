'use strict';

const USER_PROJECTIONS = Object.freeze({
  name: "data->>'name'",
  email: "data->>'email'",
  avatar: "data->>'avatar'",
  college: "data->>'college'",
  academicYear: "data->>'academicYear'",
  branch: "data->>'branch'",
  section: "data->>'section'",
  classDivision: "data->>'classDivision'",
  handles: "data->'handles'",
  syncedStats: "data->'syncedStats'",
  isPro: "data->'isPro'",
  accountStatus: "data->>'accountStatus'",
  totalUniqueSolved: "data->'totalUniqueSolved'",
  totalPlatformSolvesComplete: "data->'totalPlatformSolvesComplete'",
  totalActiveDays: "data->'totalActiveDays'",
  currentStreak: "data->'currentStreak'",
  longestStreak: "data->'longestStreak'",
  proProgress: "data->'proProgress'",
  proVerificationStatus: "data->>'proVerificationStatus'",
  proVerificationRequestedAt: "data->>'proVerificationRequestedAt'",
  taskLongestStreak: "data->'taskLongestStreak'",
  createdAt: "data->>'createdAt'",
  lastSyncedAt: "data->>'lastSyncedAt'",
  cronSync: "data->'cronSync'",
  completedTasks: "data->'completedTasks'",
  verifiedTasks: "data->'verifiedTasks'",
  googleId: "data->>'googleId'"
});

const COLLECTION_NAMES = new Set([
  'tasks',
  'proProblems',
  'customResources',
  'vaultProblems',
  'removedVaultProblemIds',
  'events',
  'adminVerifications'
]);

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function createDataLayer({ query, transaction, normalizeUser = value => value }) {
  if (typeof query !== 'function') throw new TypeError('A PostgreSQL query function is required.');

  async function getUserVersioned(id) {
    const rows = await query('SELECT data, version FROM topx_users WHERE id = $1', [id]);
    if (!rows || !rows.length) return null;
    return { user: normalizeUser({ ...rows[0].data, id }), version: Number(rows[0].version) };
  }

  async function getUser(id) {
    const result = await getUserVersioned(id);
    return result ? result.user : null;
  }

  async function getUserByEmail(email) {
    const rows = await query(
      "SELECT id, data, version FROM topx_users WHERE lower(data->>'email') = lower($1) LIMIT 1",
      [String(email || '').trim()]
    );
    return rows && rows.length ? normalizeUser({ ...rows[0].data, id: rows[0].id }) : null;
  }

  async function getUserByGoogleId(googleId) {
    const rows = await query(
      "SELECT id, data, version FROM topx_users WHERE data->>'googleId' = $1 OR id = $1 LIMIT 1",
      [googleId]
    );
    return rows && rows.length ? normalizeUser({ ...rows[0].data, id: rows[0].id }) : null;
  }

  async function listUsers({ fields = [], filters = {}, recentActivitySince = null } = {}) {
    const selectedFields = [...new Set(fields)];
    for (const field of selectedFields) {
      if (!Object.hasOwn(USER_PROJECTIONS, field)) {
        throw new Error(`Unsupported user projection: ${field}`);
      }
    }

    const params = [];
    const conditions = [];
    const addParam = value => {
      params.push(value);
      return `$${params.length}`;
    };

    if (filters.accountStatus) {
      conditions.push(`data->>'accountStatus' = ${addParam(filters.accountStatus)}`);
    }
    const excludedStatuses = filters.excludeAccountStatuses ||
      (filters.excludeAccountStatus ? [filters.excludeAccountStatus] : []);
    for (const status of excludedStatuses) {
      conditions.push(`COALESCE(data->>'accountStatus', 'active') <> ${addParam(status)}`);
    }
    if (typeof filters.isPro === 'boolean') {
      conditions.push(`COALESCE((data->>'isPro')::boolean, false) = ${addParam(filters.isPro)}`);
    }
    if (filters.hasAnyHandle) {
      conditions.push(`(
        COALESCE(data #>> '{handles,leetcode}', '') <> '' OR
        COALESCE(data #>> '{handles,codeforces}', '') <> '' OR
        COALESCE(data #>> '{handles,codechef}', '') <> ''
      )`);
    }

    const projection = selectedFields.map(field =>
      `${USER_PROJECTIONS[field]} AS "${field}"`
    );
    if (recentActivitySince) {
      const cutoff = addParam(recentActivitySince);
      projection.push(`COALESCE((
        SELECT jsonb_object_agg(activity.day, activity.counts)
        FROM (
          SELECT day, counts
          FROM jsonb_each(COALESCE(data->'dailyActivity', '{}'::jsonb)) AS item(day, counts)
          WHERE day >= ${cutoff}
        ) AS activity
      ), '{}'::jsonb) AS "recentActivity"`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await query(
      `SELECT id${projection.length ? `, ${projection.join(', ')}` : ''} FROM topx_users ${where}`,
      params
    );
    return (rows || []).map(row => {
      const user = { id: row.id };
      for (const field of selectedFields) user[field] = row[field];
      if (recentActivitySince) user.recentActivity = row.recentActivity || {};
      return user;
    });
  }

  async function insertUser(user) {
    const rows = await query(
      'INSERT INTO topx_users (id, data, version, updated_at) VALUES ($1, $2::jsonb, 1, now()) ON CONFLICT (id) DO NOTHING RETURNING data',
      [user.id, JSON.stringify(user)]
    );
    return rows && rows.length ? normalizeUser(rows[0].data) : null;
  }

  async function updateUser(id, mutatorFn, sideEffectStatements = []) {
    if (typeof mutatorFn !== 'function') throw new TypeError('updateUser requires a mutator function.');

    for (let attempt = 0; attempt < 3; attempt++) {
      const current = await getUserVersioned(id);
      if (!current) return null;
      const candidate = clone(current.user);
      const mutationResult = mutatorFn(candidate);
      const updatedUser = mutationResult === undefined ? candidate : mutationResult;
      if (!updatedUser || typeof updatedUser !== 'object' || Array.isArray(updatedUser)) {
        throw new TypeError('updateUser mutators must return a user object or mutate their cloned argument.');
      }

      const updateStatement = {
        text: 'UPDATE topx_users SET data = $1::jsonb, version = version + 1, updated_at = now() WHERE id = $2 AND version = $3 RETURNING data, version',
        params: [JSON.stringify(updatedUser), id, current.version]
      };
      const additionalStatements = typeof sideEffectStatements === 'function'
        ? sideEffectStatements({ user: updatedUser, previousUser: clone(current.user), expectedVersion: current.version + 1 })
        : sideEffectStatements;
      const statements = [updateStatement, ...(additionalStatements || [])];
      const results = statements.length > 1
        ? await runTransaction(statements)
        : [await query(updateStatement.text, updateStatement.params)];
      const rows = results && results[0];
      if (rows && rows.length) return normalizeUser(rows[0].data);
    }

    const error = new Error(`Could not update user ${id} after 3 optimistic concurrency retries.`);
    error.code = 'USER_UPDATE_CONFLICT';
    throw error;
  }

  async function deleteUser(id, auditEntry = null) {
    const statement = auditEntry
      ? `WITH deleted AS (
           DELETE FROM topx_users WHERE id = $1 RETURNING id, data
         ), removed_stats AS (
           DELETE FROM topx_platform_stats WHERE user_id = $1
         ), inserted_audit AS (
           INSERT INTO topx_audit_log (id, target_user_id, action, data, created_at)
           SELECT $2, $3, $4, $5::jsonb, now() FROM deleted
           ON CONFLICT (id) DO NOTHING
         )
         SELECT data FROM deleted`
      : `WITH deleted AS (
           DELETE FROM topx_users WHERE id = $1 RETURNING id, data
         ), removed_stats AS (
           DELETE FROM topx_platform_stats WHERE user_id = $1
         )
         SELECT data FROM deleted`;
    const params = auditEntry
      ? [id, auditEntry.id, auditEntry.targetUserId || null, auditEntry.action || null, JSON.stringify(auditEntry)]
      : [id];
    const results = await runTransaction([{ text: statement, params }]);
    const rows = results && results[0];
    return rows && rows.length ? normalizeUser({ ...rows[0].data, id }) : null;
  }

  async function getCollection(name) {
    assertCollectionName(name);
    const rows = await query('SELECT data->($1) AS value FROM topx_app_state WHERE id = 2', [name]);
    return rows && rows.length ? clone(rows[0].value) : null;
  }

  async function saveCollection(name, mutatorFn, sideEffectStatements = []) {
    assertCollectionName(name);
    if (typeof mutatorFn !== 'function') throw new TypeError('saveCollection requires a mutator function.');

    for (let attempt = 0; attempt < 3; attempt++) {
      const rows = await query('SELECT data, version FROM topx_app_state WHERE id = 2');
      if (!rows || !rows.length) throw new Error('PostgreSQL shared application state is missing.');
      const nextValue = mutatorFn(clone(rows[0].data?.[name]));
      const updateStatement = {
        text: `UPDATE topx_app_state
         SET data = jsonb_set(data, ARRAY[$1]::text[], $2::jsonb, true),
             version = version + 1, updated_at = now()
         WHERE id = 2 AND version = $3
         RETURNING data->($1) AS value`,
        params: [name, JSON.stringify(nextValue), Number(rows[0].version)]
      };
      const additionalStatements = typeof sideEffectStatements === 'function'
        ? sideEffectStatements({ name, value: nextValue, previousValue: clone(rows[0].data?.[name]), expectedVersion: Number(rows[0].version) + 1 })
        : sideEffectStatements;
      const statements = [updateStatement, ...(additionalStatements || [])];
      const results = statements.length > 1 ? await runTransaction(statements) : [await query(updateStatement.text, updateStatement.params)];
      const result = results && results[0];
      if (result && result.length) return clone(result[0].value);
    }

    const error = new Error(`Could not update collection ${name} after 3 optimistic concurrency retries.`);
    error.code = 'COLLECTION_UPDATE_CONFLICT';
    throw error;
  }

  async function saveCollections(mutatorFn) {
    if (typeof mutatorFn !== 'function') throw new TypeError('saveCollections requires a mutator function.');
    for (let attempt = 0; attempt < 3; attempt++) {
      const rows = await query('SELECT data, version FROM topx_app_state WHERE id = 2');
      if (!rows || !rows.length) throw new Error('PostgreSQL shared application state is missing.');
      const nextData = clone(rows[0].data);
      const mutationResult = mutatorFn(nextData);
      const value = mutationResult === undefined ? nextData : mutationResult;
      const result = await query(
        'UPDATE topx_app_state SET data = $1::jsonb, version = version + 1, updated_at = now() WHERE id = 2 AND version = $2 RETURNING data',
        [JSON.stringify(value), Number(rows[0].version)]
      );
      if (result && result.length) return clone(result[0].data);
    }
    const error = new Error('Could not update shared application state after 3 optimistic concurrency retries.');
    error.code = 'COLLECTION_UPDATE_CONFLICT';
    throw error;
  }

  function insertAudit(entry, guard = null) {
    const guardSql = guard?.user
      ? ' AND EXISTS (SELECT 1 FROM topx_users WHERE id = $5 AND version = $6 AND data = $7::jsonb)'
      : guard?.collection
        ? ' AND EXISTS (SELECT 1 FROM topx_app_state WHERE id = 2 AND version = $5 AND data->($6) = $7::jsonb)'
        : '';
    const params = [entry.id, entry.targetUserId || null, entry.action || null, JSON.stringify(entry)];
    if (guard?.user) params.push(guard.user.id, guard.user.version, JSON.stringify(guard.user.data));
    if (guard?.collection) params.push(guard.collection.version, guard.collection.name, JSON.stringify(guard.collection.value));
    return {
      text: `INSERT INTO topx_audit_log (id, target_user_id, action, data, created_at)
             SELECT $1, $2, $3, $4::jsonb, now() WHERE true${guardSql}
             ON CONFLICT (id) DO NOTHING`,
      params
    };
  }

  async function runTransaction(statements) {
    if (typeof transaction !== 'function') {
      throw new Error('Database transaction support is required for this operation.');
    }
    return transaction(statements);
  }

  function assertCollectionName(name) {
    if (!COLLECTION_NAMES.has(name)) throw new Error(`Unsupported application-state collection: ${name}`);
  }

  return {
    getUser,
    getUserByEmail,
    getUserByGoogleId,
    listUsers,
    insertUser,
    updateUser,
    deleteUser,
    getCollection,
    saveCollection,
    saveCollections,
    insertAudit,
    runTransaction
  };
}

module.exports = { createDataLayer, USER_PROJECTIONS, COLLECTION_NAMES };
