'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createDataLayer } = require('../lib/api/data-layer.cjs');
const { migrateLegacyData } = require('../lib/api/legacy-migration.cjs');

function createUserStore(initialUsers) {
  const users = new Map(initialUsers.map(user => [
    user.id,
    { data: structuredClone(user), version: 1 }
  ]));
  return { users };
}

function selectUser(users, id) {
  const row = users.get(id);
  return row ? [{ data: structuredClone(row.data), version: row.version }] : [];
}

test('insertAudit returns a transaction statement synchronously', () => {
  const dataLayer = createDataLayer({ query: async () => [] });
  const statement = dataLayer.insertAudit({
    id: 'audit-test',
    targetUserId: 'u1',
    action: 'blacklist',
    timestamp: '2026-01-01T00:00:00.000Z'
  });

  assert.equal(typeof statement.then, 'undefined');
  assert.equal(typeof statement.text, 'string');
  assert.match(statement.text, /^INSERT INTO topx_audit_log/);
  assert.ok(Array.isArray(statement.params));
  assert.equal(statement.params[0], 'audit-test');
});

test('updateUser re-reads and reapplies its mutator after an optimistic-lock conflict', async () => {
  const store = createUserStore([{ id: 'u1', name: 'Before', branch: 'CSE' }]);
  let conflictOnce = true;
  const query = async (text, params) => {
    if (text.startsWith('SELECT data, version FROM topx_users')) {
      return selectUser(store.users, params[0]);
    }
    if (text.startsWith('UPDATE topx_users')) {
      const [json, id, expectedVersion] = params;
      const row = store.users.get(id);
      if (conflictOnce) {
        conflictOnce = false;
        row.data.branch = 'IT';
        row.version++;
        return [];
      }
      if (!row || row.version !== expectedVersion) return [];
      row.data = JSON.parse(json);
      row.version++;
      return [{ data: structuredClone(row.data), version: row.version }];
    }
    throw new Error(`Unexpected query: ${text}`);
  };
  const dataLayer = createDataLayer({ query });
  let mutationCount = 0;

  const updated = await dataLayer.updateUser('u1', user => {
    mutationCount++;
    user.name = 'After';
  });

  assert.equal(mutationCount, 2);
  assert.equal(updated.name, 'After');
  assert.equal(updated.branch, 'IT');
  assert.equal(store.users.get('u1').version, 3);
});

test('concurrent updates to different user fields both survive', async () => {
  const store = createUserStore([{ id: 'u1', name: 'Before', branch: 'CSE' }]);
  let firstReads = 0;
  let releaseInitialReads;
  const initialReadBarrier = new Promise(resolve => {
    releaseInitialReads = resolve;
  });
  const query = async (text, params) => {
    if (text.startsWith('SELECT data, version FROM topx_users')) {
      const rows = selectUser(store.users, params[0]);
      firstReads++;
      if (firstReads === 2) releaseInitialReads();
      if (firstReads <= 2) await initialReadBarrier;
      return rows;
    }
    if (text.startsWith('UPDATE topx_users')) {
      const [json, id, expectedVersion] = params;
      const row = store.users.get(id);
      if (!row || row.version !== expectedVersion) return [];
      row.data = JSON.parse(json);
      row.version++;
      return [{ data: structuredClone(row.data), version: row.version }];
    }
    throw new Error(`Unexpected query: ${text}`);
  };
  const dataLayer = createDataLayer({ query });

  await Promise.all([
    dataLayer.updateUser('u1', user => { user.name = 'Updated'; }),
    dataLayer.updateUser('u1', user => { user.branch = 'IT'; })
  ]);

  assert.deepEqual(store.users.get('u1').data, {
    id: 'u1',
    name: 'Updated',
    branch: 'IT'
  });
});

test('shared-collection audit writes use the updated value in the same transaction', async () => {
  const sharedState = { adminVerifications: {} };
  let transactionStatements;
  const query = async text => {
    assert.match(text, /SELECT data, version FROM topx_app_state/);
    return [{ data: structuredClone(sharedState), version: 4 }];
  };
  const transaction = async statements => {
    transactionStatements = statements;
    const nextValue = JSON.parse(statements[0].params[1]);
    sharedState.adminVerifications = nextValue;
    return [[{ value: nextValue }], []];
  };
  const dataLayer = createDataLayer({ query, transaction });

  const saved = await dataLayer.saveCollection(
    'adminVerifications',
    current => ({ ...current, u1: { status: 'verified' } }),
    ({ expectedVersion, value }) => [{
      text: 'INSERT INTO topx_audit_log (data) SELECT $1::jsonb WHERE $2 = $3',
      params: [JSON.stringify(value), expectedVersion, 5]
    }]
  );

  assert.deepEqual(saved, { u1: { status: 'verified' } });
  assert.equal(transactionStatements.length, 2);
  assert.equal(transactionStatements[0].params[2], 4);
  assert.deepEqual(JSON.parse(transactionStatements[1].params[0]), saved);
  assert.equal(transactionStatements[1].params[1], 5);
});

test('legacy migration is idempotent and leaves its backup data untouched', async () => {
  const legacyData = {
    users: [{ id: 'u1', name: 'Legacy', password: 'scrypt$existing' }],
    tasks: [{ id: 'task1' }],
    eventRegistrations: [],
    auditLog: [],
    streakRewardClaims: []
  };
  const backupBeforeMigration = structuredClone(legacyData);
  const migratedIds = new Set();
  let migrationFlag = null;
  let transactionCount = 0;
  const query = async () => migrationFlag === 'done' ? [{ value: 'done' }] : [];
  const transaction = async statements => {
    transactionCount++;
    const token = statements[0].params[0];
    if (migrationFlag !== null) return [[], [], [], [], [], [], []];
    migrationFlag = token;
    const users = JSON.parse(statements[2].params[1]);
    const inserted = [];
    for (const user of users) {
      if (migratedIds.has(user.id)) continue;
      migratedIds.add(user.id);
      inserted.push({ id: user.id });
    }
    migrationFlag = 'done';
    return [[{ value: token }], [], inserted, [], [], [], []];
  };
  const options = {
    query,
    transaction,
    legacyData,
    defaultState: {},
    normalizeUser: user => user,
    hashPassword: value => value,
    createToken: () => 'migration-token'
  };

  const firstResult = await migrateLegacyData(options);
  migratedIds.delete('u1');
  const secondResult = await migrateLegacyData(options);

  assert.deepEqual(firstResult, { migrated: true, userCount: 1, candidateUserCount: 1 });
  assert.deepEqual(secondResult, { migrated: false, userCount: 0 });
  assert.equal(transactionCount, 1);
  assert.deepEqual([...migratedIds], []);
  assert.deepEqual(legacyData, backupBeforeMigration);
});

test('route registry has no whole-state user writes or reloads', () => {
  const routeRegistry = fs.readFileSync(
    path.join(__dirname, '..', 'lib/api/route-registry.cjs'),
    'utf8'
  );

  assert.doesNotMatch(routeRegistry, /\bsaveDB\s*\(/);
  assert.doesNotMatch(routeRegistry, /\breloadDBFromStorage\s*\(/);
  assert.doesNotMatch(routeRegistry, /\bdb\.users\b/);
  assert.match(routeRegistry, /await updateUser\(/);
  assert.match(routeRegistry, /const saveCollection = \(name, mutatorFn, sideEffects\) => requireDataStore\(\)\.saveCollection\(name, mutatorFn, sideEffects\)/);
});
