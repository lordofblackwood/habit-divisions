import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  DIVISIONS, addDays, archiveHabit, createInitialState, divisionSummary,
  getHabit, normalizeState, parseStoredState, rankForScore, restoreHabit, saveHabit,
  todayKey, toggleEntry, weekDays, weekStart, weeklySummary,
} from './model.js';

const REFERENCE = '2026-10-08';

function singleHabit(target = 4, createdOn = '2026-01-05') {
  const state = createInitialState(createdOn);
  return { ...state, habits: [{ ...state.habits[0], target, revisions: [{ effectiveWeek: weekStart(createdOn), frequency: 'weekly', target }] }] };
}

function mark(state, id, dates) {
  return dates.reduce((result, date) => toggleEntry(result, id, date), state);
}

test('the seven defaults have the requested frequencies and targets', () => {
  const state = createInitialState('2026-01-05');
  assert.deepEqual(state.habits.map(({ id, target, frequency }) => ({ id, target, frequency })), [
    { id: 'gym', target: 4, frequency: 'weekly' },
    { id: 'bible', target: 7, frequency: 'daily' },
    { id: 'agpeya', target: 7, frequency: 'daily' },
    { id: 'walk', target: 7, frequency: 'daily' },
    { id: 'running', target: 3, frequency: 'weekly' },
    { id: 'writing', target: 1, frequency: 'weekly' },
    { id: 'creative', target: 1, frequency: 'weekly' },
  ]);
  assert.equal(state.settings.weekStartsOn, 1);
  assert.equal(divisionSummary(state, REFERENCE).rank.label, 'Unranked');
});

test('calendar arithmetic stays local across Sunday, year, leap-day and DST boundaries', () => {
  assert.equal(weekStart('2026-01-04'), '2025-12-29');
  assert.equal(weekStart('2026-01-05'), '2026-01-05');
  assert.deepEqual(weekDays('2026-01-04'), ['2025-12-29', '2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04']);
  assert.equal(addDays('2024-02-28', 1), '2024-02-29');
  assert.equal(addDays('2024-02-29', 1), '2024-03-01');
  const source = `import {addDays, weekStart} from ${JSON.stringify(new URL('./model.js', import.meta.url).href)}; console.log(JSON.stringify([addDays('2026-03-07', 1), addDays('2026-03-08', 1), addDays('2025-11-02', -1), weekStart('2026-03-08')]));`;
  for (const timezone of ['America/New_York', 'Pacific/Auckland', 'America/Los_Angeles']) {
    const result = execFileSync(process.execPath, ['--input-type=module', '--eval', source], { env: { ...process.env, TZ: timezone }, encoding: 'utf8' });
    assert.deepEqual(JSON.parse(result), ['2026-03-08', '2026-03-09', '2025-11-01', '2026-03-02']);
  }
  assert.throws(() => weekStart('2026-02-30'), /invalid/);
  assert.throws(() => addDays('2026-10-01', 0.5), /integer/);
});

test('each habit has at most one mark a day and toggling does not mutate input', () => {
  const original = singleHabit();
  const checked = toggleEntry(original, 'gym', '2026-01-05');
  assert.deepEqual(original.entries, {});
  assert.deepEqual(checked.entries, { '2026-01-05': { gym: true } });
  assert.equal(weeklySummary(checked, '2026-01-05').habits[0].count, 1);
  assert.deepEqual(toggleEntry(checked, 'gym', '2026-01-05').entries, {});
  assert.throws(() => toggleEntry(original, 'missing', '2026-01-05'), /does not exist/);
});

test('adherence equally weights habits and caps credit when a target is exceeded', () => {
  let state = singleHabit(4);
  state = saveHabit(state, { id: 'writing', name: 'Writing', icon: 'pen-line', frequency: 'weekly', target: 1 }, '2026-01-05');
  state = mark(state, 'gym', ['2026-01-05', '2026-01-06']);
  state = mark(state, 'writing', ['2026-01-05', '2026-01-06', '2026-01-07']);
  const summary = weeklySummary(state, '2026-01-08');
  assert.equal(summary.score, 75);
  assert.equal(summary.completed, 3);
  assert.equal(summary.total, 5);
  assert.equal(summary.habits[1].count, 3);
  assert.equal(summary.habits[1].ratio, 1);
  assert.equal(summary.habits[1].complete, true);
  state = mark(state, 'gym', ['2026-01-07', '2026-01-08', '2026-01-09']);
  assert.equal(weeklySummary(state, '2026-01-08').score, 100);
  assert.equal(weeklySummary(state, '2026-01-08').completed, 5);
});

test('target edits retain old weeks and coalesce multiple changes within the same week', () => {
  const original = mark(singleHabit(4), 'gym', ['2026-01-05', '2026-01-06']);
  const changed = saveHabit(original, { id: 'gym', name: 'Gym', frequency: 'weekly', target: 2 }, '2026-01-12');
  assert.equal(getHabit(changed, 'gym').description, getHabit(original, 'gym').description);
  assert.equal(getHabit(changed, 'gym').icon, 'dumbbell');
  assert.equal(weeklySummary(changed, '2026-01-05').score, 50);
  assert.equal(weeklySummary(changed, '2026-01-12').habits[0].target, 2);
  const changedAgain = saveHabit(changed, { ...getHabit(changed, 'gym'), target: 3 }, '2026-01-13');
  assert.equal(getHabit(changedAgain, 'gym').revisions.length, 2);
  assert.equal(getHabit(changedAgain, 'gym').revisions[1].target, 3);
  assert.equal(getHabit(original, 'gym').revisions.length, 1);
  assert.throws(() => saveHabit(changed, { ...getHabit(changed, 'gym'), target: 6 }, '2026-01-06'), /older target history/);
});

test('new and archived habits preserve past participation, and defaults can be backfilled', () => {
  let state = mark(singleHabit(1), 'gym', ['2026-01-05']);
  state = saveHabit(state, { id: 'new', name: 'New habit', frequency: 'weekly', target: 1 }, '2026-01-12');
  assert.equal(weeklySummary(state, '2026-01-05').score, 100);
  assert.equal(weeklySummary(state, '2026-01-05').habits.length, 1);
  state = archiveHabit(state, 'gym', '2026-01-12');
  assert.equal(weeklySummary(state, '2026-01-05').score, 100);
  assert.deepEqual(weeklySummary(state, '2026-01-12').habits.map(item => item.habit.id), ['new']);
  assert.throws(() => toggleEntry(state, 'gym', '2026-01-13'), /Archived/);
  const archivedWithMondayRecord = archiveHabit(mark(singleHabit(1), 'gym', ['2026-01-12']), 'gym', '2026-01-12');
  assert.equal(weeklySummary(archivedWithMondayRecord, '2026-01-12').score, 100);
  const backfilled = toggleEntry(createInitialState('2026-01-12'), 'writing', '2026-01-05');
  assert.equal(weeklySummary(backfilled, '2026-01-05').habits.length, 7);
  assert.ok(Math.abs(weeklySummary(backfilled, '2026-01-05').score - 100 / 7) < 1e-10);
});

test('backfilling an original habit weights all seven defaults while custom habits keep their creation date', () => {
  let state = createInitialState('2026-02-02');
  assert.equal(weeklySummary(state, '2026-01-05').score, 0);
  assert.equal(weeklySummary(state, '2026-01-05').habits.length, 0);
  state = saveHabit(state, { id: 'meditation', name: 'Meditation', frequency: 'weekly', target: 1 }, '2026-02-02');
  state = toggleEntry(state, 'writing', '2026-01-05');
  let summary = weeklySummary(state, '2026-01-05');
  assert.equal(summary.habits.length, 7);
  assert.equal(summary.total, 30);
  assert.equal(summary.completed, 1);
  assert.ok(Math.abs(summary.score - 100 / 7) < 1e-10);
  assert.equal(summary.habits.some(item => item.habit.id === 'meditation'), false);
  state = mark(state, 'gym', ['2026-01-05', '2026-01-06']);
  summary = weeklySummary(state, '2026-01-05');
  assert.ok(Math.abs(summary.score - 150 / 7) < 1e-10);
  assert.throws(() => toggleEntry(state, 'meditation', '2026-01-05'), /inactive/);
  assert.deepEqual(normalizeState(state, REFERENCE), state);
});

test('creation-week default edits preserve original goals in older backfilled weeks', () => {
  let state = createInitialState('2026-02-02');
  state = mark(state, 'gym', ['2026-01-05', '2026-01-06']);
  const before = weeklySummary(state, '2026-01-05');
  state = saveHabit(state, { id: 'gym', name: 'Gym', frequency: 'weekly', target: 2 }, '2026-02-02');
  assert.equal(getHabit(state, 'gym').revisions.length, 1);
  assert.equal(getHabit(state, 'gym').revisions[0].target, 2);
  assert.equal(weeklySummary(state, '2026-02-02').habits.find(item => item.habit.id === 'gym').target, 2);
  const after = weeklySummary(state, '2026-01-05');
  assert.equal(after.habits.find(item => item.habit.id === 'gym').target, 4);
  assert.equal(after.score, before.score);
  assert.deepEqual(normalizeState(state, REFERENCE), state);
});

test('defaults edited or imported before their first backfill consistently use the original historical goals', () => {
  let state = createInitialState('2026-02-02');
  state = saveHabit(state, { id: 'gym', name: 'Gym', frequency: 'weekly', target: 2 }, '2026-02-02');
  state = saveHabit(state, { id: 'bible', name: 'Bible reading', frequency: 'weekly', target: 1 }, '2026-02-02');
  const imported = normalizeState(JSON.parse(JSON.stringify(state)), REFERENCE);
  state = mark(imported, 'gym', ['2026-01-05', '2026-01-06']);
  state = toggleEntry(state, 'bible', '2026-01-05');
  const previous = weeklySummary(state, '2026-01-05');
  const gym = previous.habits.find(item => item.habit.id === 'gym');
  const bible = previous.habits.find(item => item.habit.id === 'bible');
  assert.equal(gym.target, 4);
  assert.equal(gym.ratio, 0.5);
  assert.equal(bible.target, 7);
  assert.equal(bible.habit.frequency, 'daily');
  assert.equal(bible.ratio, 1 / 7);
  assert.ok(Math.abs(previous.score - (0.5 + 1 / 7) / 7 * 100) < 1e-10);
  const creationWeek = weeklySummary(state, '2026-02-02');
  assert.equal(creationWeek.habits.find(item => item.habit.id === 'gym').target, 2);
  assert.equal(creationWeek.habits.find(item => item.habit.id === 'bible').target, 1);
});

test('restoring preserves archived intervals so paused habits do not lower other habits’ historical weeks', () => {
  let state = singleHabit(4);
  state = saveHabit(state, { id: 'writing', name: 'Writing', frequency: 'weekly', target: 1 }, '2026-01-05');
  state = toggleEntry(state, 'gym', '2026-01-05');
  state = mark(state, 'writing', ['2026-01-05', '2026-01-12', '2026-01-19']);
  state = archiveHabit(state, 'gym', '2026-01-12');
  const before = ['2026-01-05', '2026-01-12', '2026-01-19'].map(date => weeklySummary(state, date));
  assert.equal(before[0].score, 62.5);
  assert.equal(before[1].score, 100);
  assert.equal(before[2].score, 100);
  const restored = restoreHabit(state, 'gym', '2026-01-26');
  assert.equal(getHabit(restored, 'gym').archivedOn, undefined);
  assert.equal(getHabit(state, 'gym').archivedOn, '2026-01-12');
  assert.deepEqual(getHabit(restored, 'gym').activePeriods, [
    { startedOn: '2026-01-05', endedOn: '2026-01-12' },
    { startedOn: '2026-01-26' },
  ]);
  for (const previous of before) {
    const after = weeklySummary(restored, previous.weekStart);
    assert.equal(after.score, previous.score);
    assert.deepEqual(after.habits.map(item => [item.habit.id, item.count, item.target]), previous.habits.map(item => [item.habit.id, item.count, item.target]));
  }
  assert.equal(divisionSummary(restored, '2026-01-26').score, divisionSummary(state, '2026-01-26').score);
  assert.throws(() => toggleEntry(restored, 'gym', '2026-01-13'), /inactive/);
  assert.equal(toggleEntry(restored, 'gym', '2026-01-26').entries['2026-01-26'].gym, true);
  assert.deepEqual(normalizeState(restored, REFERENCE), restored);
});

test('archive and restore can repeat without losing intervals, and cannot rewrite activity dates', () => {
  let state = archiveHabit(singleHabit(), 'gym', '2026-01-12');
  assert.throws(() => restoreHabit(state, 'gym', '2026-01-11'), /before it was archived/);
  assert.throws(() => restoreHabit(state, 'missing', '2026-01-12'), /does not exist/);
  state = restoreHabit(state, 'gym', '2026-01-19');
  assert.equal(restoreHabit(state, 'gym', '2026-01-20'), state);
  assert.throws(() => archiveHabit(state, 'gym', '2026-01-18'), /latest change/);
  state = archiveHabit(state, 'gym', '2026-01-26');
  state = restoreHabit(state, 'gym', '2026-02-02');
  assert.deepEqual(getHabit(state, 'gym').activePeriods, [
    { startedOn: '2026-01-05', endedOn: '2026-01-12' },
    { startedOn: '2026-01-19', endedOn: '2026-01-26' },
    { startedOn: '2026-02-02' },
  ]);
  assert.deepEqual(normalizeState(state, REFERENCE), state);
  const legacy = structuredClone(archiveHabit(singleHabit(), 'gym', '2026-01-12'));
  delete legacy.habits[0].activePeriods;
  delete legacy.habits[0].origin;
  assert.deepEqual(normalizeState(legacy, REFERENCE).habits[0].activePeriods, [{ startedOn: '2026-01-05', endedOn: '2026-01-12' }]);
});

test('imports reject inactive custom and paused-period dates while retaining archive-day marks and default backfill', () => {
  let state = saveHabit(singleHabit(), { id: 'meditation', name: 'Meditation', frequency: 'weekly', target: 1 }, '2026-01-12');
  assert.throws(() => normalizeState({ ...state, entries: { '2026-01-11': { meditation: true } } }, REFERENCE), /inactive habit date/);
  state = toggleEntry(state, 'meditation', '2026-01-19');
  state = archiveHabit(state, 'meditation', '2026-01-19');
  assert.deepEqual(normalizeState(state, REFERENCE), state);
  assert.throws(() => normalizeState({ ...state, entries: { '2026-01-20': { meditation: true } } }, REFERENCE), /inactive habit date/);
  state = restoreHabit(state, 'meditation', '2026-02-02');
  assert.deepEqual(normalizeState(state, REFERENCE), state);
  assert.throws(() => normalizeState({ ...state, entries: { '2026-01-26': { meditation: true } } }, REFERENCE), /inactive habit date/);
  assert.doesNotThrow(() => normalizeState({ ...state, entries: { '2026-02-02': { meditation: true } } }, REFERENCE));
  const defaults = toggleEntry(createInitialState('2026-02-02'), 'writing', '2026-01-05');
  assert.deepEqual(normalizeState(defaults, REFERENCE), defaults);
});

test('all division thresholds, quartile tiers and LP follow the previous gym system', () => {
  assert.deepEqual(DIVISIONS.map(({ name, min }) => [name, min]), [
    ['Iron', 0], ['Bronze', 15], ['Silver', 30], ['Gold', 45], ['Platinum', 60],
    ['Emerald', 70], ['Diamond', 85], ['Master', 95], ['Grandmaster', 98], ['Challenger', 100],
  ]);
  for (const [index, division] of DIVISIONS.entries()) {
    const rank = rankForScore(division.min);
    assert.equal(rank.name, division.name);
    assert.equal(rank.tier, index <= 6 ? 'IV' : '');
    assert.equal(rank.lp, 0);
    if (index > 0) assert.equal(rankForScore(division.min - 0.00001).name, DIVISIONS[index - 1].name);
    if (index <= 6) {
      const quarter = (division.nextMin - division.min) / 4;
      assert.equal(rankForScore(division.min + quarter).tier, 'III');
      assert.equal(rankForScore(division.min + 2 * quarter).tier, 'II');
      assert.equal(rankForScore(division.min + 3 * quarter).tier, 'I');
      assert.equal(rankForScore(division.min + quarter / 2).lp, 50);
      assert.equal(rankForScore(division.nextMin - 0.00001).lp, 99);
    }
  }
  assert.equal(rankForScore(150).label, 'Challenger');
  assert.equal(rankForScore(-10).label, 'Iron IV');
  assert.throws(() => rankForScore(Number.NaN), /finite/);
});

test('ranking uses exactly 12 completed Monday to Sunday weeks and prehistory contributes zero', () => {
  let state = singleHabit(1, '2026-01-05');
  state = mark(state, 'gym', ['2026-01-05', '2026-01-12', '2026-01-19']);
  const beforeCurrentCheckin = divisionSummary(state, '2026-01-19');
  const currentCheckinRemoved = toggleEntry(state, 'gym', '2026-01-19');
  assert.equal(beforeCurrentCheckin.score, divisionSummary(currentCheckinRemoved, '2026-01-19').score);
  assert.ok(Math.abs(beforeCurrentCheckin.score - 100 / 6) < 1e-10);
  assert.equal(beforeCurrentCheckin.completedWeeks.length, 12);
  assert.equal(beforeCurrentCheckin.completedWeeks.at(-1).weekStart, '2026-01-12');
  assert.equal(beforeCurrentCheckin.rank.label, 'Bronze IV');
  assert.equal(beforeCurrentCheckin.nextRank.name, 'Silver');
  assert.ok(Math.abs(beforeCurrentCheckin.remaining - (30 - 100 / 6)) < 1e-10);
  assert.equal(divisionSummary(state, '2026-01-18').score, divisionSummary(state, '2026-01-12').score);
  const firstRecord = toggleEntry(singleHabit(1), 'gym', '2026-01-05');
  assert.equal(divisionSummary(firstRecord, '2026-01-05').rank.label, 'Iron IV');
});

test('12 perfect weeks reach Challenger and records outside the rolling window age out', () => {
  let state = singleHabit(1, '2026-01-05');
  for (let index = 0; index < 12; index += 1) state = toggleEntry(state, 'gym', addDays('2026-01-05', index * 7));
  const result = divisionSummary(state, '2026-03-30');
  assert.equal(result.score, 100);
  assert.equal(result.rank.name, 'Challenger');
  assert.equal(result.nextRank, null);
  assert.equal(result.remaining, 0);
  assert.ok(Math.abs(divisionSummary(state, '2026-04-06').score - 1100 / 12) < 1e-10);
});

test('valid backups round trip without mutating input, and unsupported metadata is harmless', () => {
  const state = mark(singleHabit(), 'gym', ['2026-01-05']);
  const input = { ...state, exportedAt: '2026-01-05T15:00:00Z', ignored: 'metadata' };
  const normalized = normalizeState(input, REFERENCE);
  assert.deepEqual(normalized, state);
  assert.notEqual(normalized.habits[0], input.habits[0]);
  assert.notEqual(normalized.entries, input.entries);
  const withoutRevisions = structuredClone(state);
  delete withoutRevisions.habits[0].revisions;
  assert.deepEqual(normalizeState(withoutRevisions, REFERENCE), state);
  assert.deepEqual(parseStoredState(JSON.stringify(state), REFERENCE), state);
});

test('imports reject invalid schemas, phantom completions, unsafe IDs and invalid target histories', () => {
  const valid = singleHabit();
  const invalids = [
    null,
    { ...valid, version: 2 },
    { ...valid, habits: {} },
    { ...valid, settings: { weekStartsOn: 0 } },
    { ...valid, entries: [] },
    { ...valid, entries: { '2026-02-30': { gym: true } } },
    { ...valid, entries: { '2026-01-05': { phantom: true } } },
    { ...valid, entries: { '2026-01-05': { gym: 1 } } },
    { ...valid, habits: [...valid.habits, valid.habits[0]] },
    { ...valid, habits: [{ ...valid.habits[0], id: 'constructor' }] },
    { ...valid, habits: [{ ...valid.habits[0], target: 0 }] },
    { ...valid, habits: [{ ...valid.habits[0], frequency: 'daily', target: 4 }] },
    { ...valid, habits: [{ ...valid.habits[0], revisions: [{ effectiveWeek: '2026-01-06', frequency: 'weekly', target: 4 }] }] },
    { ...valid, habits: [{ ...valid.habits[0], revisions: [{ effectiveWeek: '2026-01-05', frequency: 'weekly', target: 3 }] }] },
    { ...valid, habits: [{ ...valid.habits[0], revisions: [valid.habits[0].revisions[0], valid.habits[0].revisions[0]] }] },
    { ...valid, habits: [{ ...valid.habits[0], origin: 'unknown' }] },
    { ...valid, habits: [{ ...valid.habits[0], activePeriods: [] }] },
    { ...valid, habits: [{ ...valid.habits[0], activePeriods: [{ startedOn: '2026-01-06' }] }] },
    { ...valid, habits: [{ ...valid.habits[0], activePeriods: [{ startedOn: '2026-01-05', endedOn: '2026-01-04' }] }] },
    { ...valid, habits: [{ ...valid.habits[0], activePeriods: [{ startedOn: '2026-01-05', endedOn: '2026-01-12' }, { startedOn: '2026-01-11' }] }] },
    { ...valid, habits: [{ ...valid.habits[0], activePeriods: [{ startedOn: '2026-01-05' }, { startedOn: '2026-01-12' }] }] },
    { ...valid, habits: [{ ...valid.habits[0], activePeriods: [{ startedOn: '2026-01-05', endedOn: '2026-01-12' }] }] },
  ];
  for (const invalid of invalids) assert.throws(() => normalizeState(invalid, REFERENCE));
  assert.throws(() => normalizeState(JSON.parse('{"version":1,"habits":[],"entries":{"__proto__":{"x":true}},"settings":{"weekStartsOn":1}}'), REFERENCE));
});

test('future check-ins and imported future data are rejected, and damaged storage recovers', () => {
  const future = addDays(todayKey(), 1);
  const state = singleHabit();
  assert.throws(() => toggleEntry(state, 'gym', future), /Future/);
  assert.throws(() => saveHabit(state, { ...state.habits[0], target: 2 }, future), /Future/);
  assert.throws(() => archiveHabit(state, 'gym', future), /Future/);
  assert.throws(() => restoreHabit(archiveHabit(state, 'gym', '2026-01-12'), 'gym', future), /Future/);
  assert.throws(() => normalizeState({ ...state, entries: { '2026-10-09': { gym: true } } }, REFERENCE), /Future/);
  assert.throws(() => normalizeState({ ...state, habits: [{ ...state.habits[0], createdOn: '2026-10-09' }] }, REFERENCE), /Future/);
  assert.deepEqual(parseStoredState('{broken', REFERENCE), createInitialState(REFERENCE));
  assert.deepEqual(parseStoredState(JSON.stringify({ ...state, version: 999 }), REFERENCE), createInitialState(REFERENCE));
});
