'use strict';

const MOVED_COLLECTIONS = ['eventRegistrations', 'auditLog', 'streakRewardClaims'];

async function buildMigrationStatements({ legacyData, defaultState, token, normalizeUser, hashPassword }) {
  const legacy = legacyData && typeof legacyData === 'object' ? legacyData : defaultState;
  const sharedState = { ...legacy };
  delete sharedState.users;
  for (const name of MOVED_COLLECTIONS) delete sharedState[name];

  const users = await Promise.all((Array.isArray(legacy.users) ? legacy.users : []).filter(user => user && user.id).map(async rawUser => {
    const user = normalizeUser(rawUser);
    if (user.password && !String(user.password).startsWith('scrypt$')) {
      user.password = await hashPassword(String(user.password));
    }
    return { id: String(user.id), data: user };
  }));
  const registrations = (Array.isArray(legacy.eventRegistrations) ? legacy.eventRegistrations : [])
    .filter(item => item && item.id && item.eventId)
    .map(item => ({
      id: String(item.id),
      event_id: String(item.eventId),
      email: String(item.email || ''),
      data: item,
      created_at: item.createdAt || null
    }));
  const auditEntries = (Array.isArray(legacy.auditLog) ? legacy.auditLog : [])
    .filter(item => item && item.id)
    .map(item => ({
      id: String(item.id),
      target_user_id: item.targetUserId ? String(item.targetUserId) : null,
      action: item.action ? String(item.action) : null,
      data: item,
      created_at: item.timestamp || null
    }));
  const rewardClaims = (Array.isArray(legacy.streakRewardClaims) ? legacy.streakRewardClaims : [])
    .filter(item => item && item.id && item.userId && Number.isInteger(Number(item.milestone)))
    .map(item => ({
      id: String(item.id),
      user_id: String(item.userId),
      milestone: Number(item.milestone),
      data: item
    }));

  const claimFlag = {
    text: "INSERT INTO topx_meta (key, value) VALUES ('migrated_v1', $1) ON CONFLICT (key) DO NOTHING RETURNING value",
    params: [token]
  };
  const claimGuard = "EXISTS (SELECT 1 FROM topx_meta WHERE key = 'migrated_v1' AND value = $1)";

  return {
    statements: [
      claimFlag,
      {
        text: `INSERT INTO topx_app_state (id, data, version, updated_at)
               SELECT 2, $2::jsonb, 1, now() WHERE ${claimGuard}
               ON CONFLICT (id) DO NOTHING`,
        params: [token, JSON.stringify(sharedState)]
      },
      {
        text: `INSERT INTO topx_users (id, data)
               SELECT migration_row.id, migration_row.data FROM jsonb_to_recordset($2::jsonb) AS migration_row(id text, data jsonb)
               WHERE ${claimGuard} ON CONFLICT DO NOTHING RETURNING id`,
        params: [token, JSON.stringify(users)]
      },
      {
        text: `INSERT INTO topx_event_registrations (id, event_id, email, data, created_at)
               SELECT migration_row.id, migration_row.event_id, migration_row.email, migration_row.data, COALESCE(migration_row.created_at, now())
               FROM jsonb_to_recordset($2::jsonb) AS migration_row(id text, event_id text, email text, data jsonb, created_at timestamptz)
               WHERE ${claimGuard} ON CONFLICT DO NOTHING RETURNING id`,
        params: [token, JSON.stringify(registrations)]
      },
      {
        text: `INSERT INTO topx_audit_log (id, target_user_id, action, data, created_at)
               SELECT migration_row.id, migration_row.target_user_id, migration_row.action, migration_row.data, COALESCE(migration_row.created_at, now())
               FROM jsonb_to_recordset($2::jsonb) AS migration_row(id text, target_user_id text, action text, data jsonb, created_at timestamptz)
               WHERE ${claimGuard} ON CONFLICT (id) DO NOTHING RETURNING id`,
        params: [token, JSON.stringify(auditEntries)]
      },
      {
        text: `INSERT INTO topx_streak_reward_claims (id, user_id, milestone, data)
               SELECT migration_row.id, migration_row.user_id, migration_row.milestone, migration_row.data
               FROM jsonb_to_recordset($2::jsonb) AS migration_row(id text, user_id text, milestone integer, data jsonb)
               WHERE ${claimGuard} ON CONFLICT DO NOTHING RETURNING id`,
        params: [token, JSON.stringify(rewardClaims)]
      },
      {
        text: "UPDATE topx_meta SET value = 'done' WHERE key = 'migrated_v1' AND value = $1",
        params: [token]
      }
    ],
    migratedUserCount: users.length
  };
}

async function migrateLegacyData({ query, transaction, legacyData, defaultState, normalizeUser, hashPassword, createToken }) {
  const flags = await query("SELECT value FROM topx_meta WHERE key = 'migrated_v1'");
  if (flags && flags.some(row => row.value === 'done')) {
    return { migrated: false, userCount: 0 };
  }
  const migration = await buildMigrationStatements({
    legacyData,
    defaultState,
    token: createToken(),
    normalizeUser,
    hashPassword
  });
  const results = await transaction(migration.statements);
  const claimed = Boolean(results && Array.isArray(results[0]) && results[0].length);
  const userInsertRows = results && results[2];
  const userCount = Array.isArray(userInsertRows) ? userInsertRows.length : 0;
  return { migrated: claimed, userCount, candidateUserCount: migration.migratedUserCount };
}

module.exports = { MOVED_COLLECTIONS, buildMigrationStatements, migrateLegacyData };
