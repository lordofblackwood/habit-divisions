const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
const RESERVED_IDS = new Set(['__proto__', 'constructor', 'prototype']);
const TIERS = ['IV', 'III', 'II', 'I'];

export const DIVISIONS = Object.freeze([
  { name: 'Iron', min: 0, color: '#8f9bab' },
  { name: 'Bronze', min: 15, color: '#cd8e63' },
  { name: 'Silver', min: 30, color: '#c5d1df' },
  { name: 'Gold', min: 45, color: '#e9c568' },
  { name: 'Platinum', min: 60, color: '#77d3ce' },
  { name: 'Emerald', min: 70, color: '#63d79f' },
  { name: 'Diamond', min: 85, color: '#88bbfa' },
  { name: 'Master', min: 95, color: '#bca0f5' },
  { name: 'Grandmaster', min: 98, color: '#ef8989' },
  { name: 'Challenger', min: 100, color: '#d7f56b' },
].map((division, index, all) => Object.freeze({ ...division, nextMin: all[index + 1]?.min ?? null })));
export const RANKS = DIVISIONS;

function fail(message) {
  throw new Error(message);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function dateObject(key) {
  if (typeof key !== 'string') fail('Dates must use YYYY-MM-DD.');
  const match = DATE_PATTERN.exec(key);
  if (!match) fail('Dates must use YYYY-MM-DD.');
  const [, year, month, day] = match.map(Number);
  if (year < 1000 || year > 9999) fail('The date is outside the supported calendar.');
  // Noon avoids midnight DST transitions. Never parse a date-only string as UTC.
  const result = new Date(year, month - 1, day, 12, 0, 0, 0);
  if (result.getFullYear() !== year || result.getMonth() !== month - 1 || result.getDate() !== day) {
    fail('The calendar date is invalid.');
  }
  return result;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function pastOrToday(date, reference = todayKey()) {
  dateObject(date);
  dateObject(reference);
  if (date > reference) fail('Future dates cannot contain habit records.');
  return date;
}

export function todayKey() {
  return dateKey(new Date());
}

export function addDays(date, amount) {
  if (!Number.isInteger(amount)) fail('The number of days must be an integer.');
  const result = dateObject(date);
  result.setDate(result.getDate() + amount);
  return dateKey(result);
}

export function weekStart(date = todayKey()) {
  const result = dateObject(date);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return dateKey(result);
}

export function weekDays(date = todayKey()) {
  const start = weekStart(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function formatDate(date, options = { month: 'short', day: 'numeric' }) {
  return new Intl.DateTimeFormat(undefined, options).format(dateObject(date));
}

function validId(id) {
  if (typeof id !== 'string' || !ID_PATTERN.test(id) || RESERVED_IDS.has(id)) fail('A habit has an invalid ID.');
  return id;
}

function habitFields(habit) {
  if (!isRecord(habit)) fail('Every habit must be an object.');
  const id = validId(habit.id);
  if (typeof habit.name !== 'string' || !habit.name.trim() || habit.name.trim().length > 80) {
    fail('Habit names must contain 1 to 80 characters.');
  }
  const description = habit.description ?? '';
  if (typeof description !== 'string' || description.length > 500) fail('Habit descriptions must be at most 500 characters.');
  const icon = habit.icon ?? 'check';
  if (typeof icon !== 'string' || !icon.trim() || icon.length > 40) fail('A habit icon is invalid.');
  const frequency = habit.frequency;
  if (frequency !== 'daily' && frequency !== 'weekly') fail('Habit frequency must be daily or weekly.');
  const target = habit.target;
  if (!Number.isInteger(target) || target < 1 || target > 7) fail('Weekly targets must be whole numbers from 1 to 7.');
  if (frequency === 'daily' && target !== 7) fail('Daily habits must have a target of 7.');
  return { id, name: habit.name.trim(), description: description.trim(), icon: icon.trim(), frequency, target };
}

const DEFAULT_HABITS = [
  { id: 'gym', name: 'Gym', description: 'Show up and train.', icon: 'dumbbell', frequency: 'weekly', target: 4 },
  { id: 'bible', name: 'Bible reading', description: 'Make time for Scripture.', icon: 'book-open', frequency: 'daily', target: 7 },
  { id: 'agpeya', name: 'Agpeya', description: 'Pause for daily prayer.', icon: 'cross', frequency: 'daily', target: 7 },
  { id: 'walk', name: 'Daily walk', description: 'Get outside and move.', icon: 'footprints', frequency: 'daily', target: 7 },
  { id: 'running', name: 'Running', description: 'Three runs each week.', icon: 'activity', frequency: 'weekly', target: 3 },
  { id: 'writing', name: 'Writing', description: 'Put your thoughts on the page.', icon: 'pen-line', frequency: 'weekly', target: 1 },
  { id: 'creative', name: 'Creative pursuit', description: 'Make something for the joy of it.', icon: 'palette', frequency: 'weekly', target: 1 },
];
const DEFAULT_IDS = new Set(DEFAULT_HABITS.map(habit => habit.id));

export function createInitialState(date = todayKey()) {
  pastOrToday(date);
  return {
    version: 1,
    habits: DEFAULT_HABITS.map(habit => ({
      ...habit,
      origin: 'default',
      createdOn: date,
      activePeriods: [{ startedOn: date }],
      revisions: [{ effectiveWeek: weekStart(date), frequency: habit.frequency, target: habit.target }],
    })),
    entries: {},
    settings: { weekStartsOn: 1 },
  };
}

/** Validate imported data and copy only the supported schema. Never trust a stored object. */
export function normalizeState(raw, reference = todayKey()) {
  dateObject(reference);
  if (!isRecord(raw) || raw.version !== 1) fail('This file is not a supported Habit Divisions backup.');
  if (!Array.isArray(raw.habits) || raw.habits.length > 100) fail('The backup must contain at most 100 habits.');
  if (!isRecord(raw.entries)) fail('Habit entries must be a date-indexed object.');
  if (!isRecord(raw.settings) || raw.settings.weekStartsOn !== 1) fail('The week must start on Monday.');
  const ids = new Set();
  const habits = raw.habits.map(value => {
    const habit = habitFields(value);
    if (ids.has(habit.id)) fail('Habit IDs must be unique.');
    ids.add(habit.id);
    const createdOn = pastOrToday(value.createdOn, reference);
    const origin = value.origin ?? (DEFAULT_IDS.has(habit.id) ? 'default' : 'custom');
    if (origin !== 'default' && origin !== 'custom') fail('The habit origin is invalid.');
    if (origin === 'default' && !DEFAULT_IDS.has(habit.id)) fail('Only original habits can use the default origin.');
    let archivedOn;
    if (value.archivedOn !== undefined && value.archivedOn !== null) {
      archivedOn = pastOrToday(value.archivedOn, reference);
      if (archivedOn < createdOn) fail('A habit cannot be archived before it was created.');
    }
    const rawPeriods = value.activePeriods ?? [{ startedOn: createdOn, ...(archivedOn ? { endedOn: archivedOn } : {}) }];
    if (!Array.isArray(rawPeriods) || rawPeriods.length === 0 || rawPeriods.length > 1000) fail('Habit activity history is invalid.');
    const activePeriods = rawPeriods.map((period, index) => {
      if (!isRecord(period)) fail('Habit activity history is invalid.');
      const startedOn = pastOrToday(period.startedOn, reference);
      if (startedOn < createdOn) fail('Habit activity cannot begin before creation.');
      let endedOn;
      if (period.endedOn !== undefined && period.endedOn !== null) {
        endedOn = pastOrToday(period.endedOn, reference);
        if (endedOn < startedOn) fail('Habit activity cannot end before it begins.');
      } else if (index !== rawPeriods.length - 1) {
        fail('Only the last habit activity period can remain open.');
      }
      return { startedOn, ...(endedOn ? { endedOn } : {}) };
    });
    if (activePeriods[0].startedOn !== createdOn) fail('Habit activity history must begin on its creation date.');
    if (activePeriods.some((period, index) => index > 0 && period.startedOn < activePeriods[index - 1].endedOn)) {
      fail('Habit activity periods cannot overlap.');
    }
    if ((activePeriods.at(-1).endedOn ?? undefined) !== archivedOn) fail('The archive date must match the latest activity period.');
    const rawRevisions = value.revisions ?? [{ effectiveWeek: weekStart(createdOn), frequency: habit.frequency, target: habit.target }];
    if (!Array.isArray(rawRevisions) || rawRevisions.length === 0 || rawRevisions.length > 1000) fail('Habit target history is invalid.');
    const revisions = rawRevisions.map(revision => {
      if (!isRecord(revision)) fail('Habit target history is invalid.');
      const effectiveWeek = pastOrToday(revision.effectiveWeek, reference);
      if (weekStart(effectiveWeek) !== effectiveWeek) fail('Habit changes must begin on a Monday.');
      if (effectiveWeek < weekStart(createdOn)) fail('Habit changes cannot predate creation.');
      const fields = habitFields({ ...habit, frequency: revision.frequency, target: revision.target });
      return { effectiveWeek, frequency: fields.frequency, target: fields.target };
    }).sort((a, b) => a.effectiveWeek.localeCompare(b.effectiveWeek));
    if (revisions[0].effectiveWeek !== weekStart(createdOn)) fail('Habit target history must begin in its creation week.');
    if (revisions.some((revision, index) => index > 0 && revision.effectiveWeek === revisions[index - 1].effectiveWeek)) {
      fail('Habit target history cannot contain duplicate weeks.');
    }
    const latest = revisions.at(-1);
    if (latest.frequency !== habit.frequency || latest.target !== habit.target) fail('The current habit target must match its latest revision.');
    return { ...habit, origin, createdOn, ...(archivedOn ? { archivedOn } : {}), activePeriods, revisions };
  });
  const habitsById = new Map(habits.map(habit => [habit.id, habit]));
  const entries = {};
  for (const [date, values] of Object.entries(raw.entries)) {
    pastOrToday(date, reference);
    if (!isRecord(values)) fail('Each day must contain habit completion records.');
    const day = {};
    for (const [id, value] of Object.entries(values)) {
      if (!ids.has(id)) fail('The backup contains a completion for an unknown habit.');
      if (value !== true) fail('Habit completion records must be true.');
      const habit = habitsById.get(id);
      // A mark may have been made earlier on the day the habit was archived.
      // All other dates must fall within an active period, apart from original-default backfill.
      if (!activeOn(habit, date) && !periodsFor(habit).some(period => period.endedOn === date)) {
        fail('The backup contains a completion on an inactive habit date.');
      }
      day[id] = true;
    }
    if (Object.keys(day).length) entries[date] = day;
  }
  return { version: 1, habits, entries, settings: { weekStartsOn: 1 } };
}

/** Damaged or outdated local storage must not make the app unusable. Imports use normalizeState directly. */
export function parseStoredState(serialized, reference = todayKey()) {
  try {
    return normalizeState(JSON.parse(serialized), reference);
  } catch {
    return createInitialState(reference);
  }
}

export function getHabit(state, id) {
  return state.habits.find(habit => habit.id === id);
}

function periodsFor(habit) {
  return habit.activePeriods ?? [{ startedOn: habit.createdOn, ...(habit.archivedOn ? { endedOn: habit.archivedOn } : {}) }];
}

function activeOn(habit, date) {
  if (habit.origin === 'default' && date < habit.createdOn) return true;
  return periodsFor(habit).some(period => period.startedOn <= date && (!period.endedOn || date < period.endedOn));
}

export function isHabitActiveOn(habit, date = todayKey()) {
  dateObject(date);
  return activeOn(habit, date);
}

export function toggleEntry(state, id, date = todayKey()) {
  pastOrToday(date);
  const habit = getHabit(state, id);
  if (!habit) fail('This habit does not exist.');
  const previousDay = state.entries[date] ?? {};
  if (!activeOn(habit, date) && !previousDay[id]) fail('Archived or inactive habits cannot receive new completions on this date.');
  const day = { ...previousDay };
  if (day[id]) delete day[id];
  else day[id] = true;
  const entries = { ...state.entries };
  if (Object.keys(day).length) entries[date] = day;
  else delete entries[date];
  return { ...state, entries };
}

export function saveHabit(state, value, date = todayKey()) {
  pastOrToday(date);
  if (!isRecord(value)) fail('Every habit must be an object.');
  const existing = getHabit(state, value.id);
  const habit = habitFields({ ...existing, ...value, description: value.description ?? existing?.description, icon: value.icon ?? existing?.icon });
  const effectiveWeek = weekStart(date);
  if (!existing) {
    if (state.habits.length >= 100) fail('You can create up to 100 habits.');
    return {
      ...state,
      habits: [...state.habits, { ...habit, origin: 'custom', createdOn: date, activePeriods: [{ startedOn: date }], revisions: [{ effectiveWeek, frequency: habit.frequency, target: habit.target }] }],
    };
  }
  if (existing.archivedOn) fail('An archived habit cannot be edited.');
  if (date < periodsFor(existing).at(-1).startedOn || effectiveWeek < existing.revisions.at(-1).effectiveWeek) fail('Habit edits cannot rewrite older target history.');
  let revisions = existing.revisions.map(revision => ({ ...revision }));
  if (habit.target !== existing.target || habit.frequency !== existing.frequency) {
    const revision = { effectiveWeek, frequency: habit.frequency, target: habit.target };
    if (revisions.at(-1).effectiveWeek === effectiveWeek) revisions[revisions.length - 1] = revision;
    else revisions.push(revision);
  }
  return { ...state, habits: state.habits.map(item => item.id === habit.id ? { ...existing, ...habit, revisions } : item) };
}

export function archiveHabit(state, id, date = todayKey()) {
  pastOrToday(date);
  const habit = getHabit(state, id);
  if (!habit) fail('This habit does not exist.');
  if (date < periodsFor(habit).at(-1).startedOn || weekStart(date) < habit.revisions.at(-1).effectiveWeek) fail('A habit cannot be archived before its latest change.');
  if (habit.archivedOn) return state;
  const activePeriods = periodsFor(habit).map((period, index, all) => index === all.length - 1 ? { ...period, endedOn: date } : { ...period });
  return { ...state, habits: state.habits.map(item => item.id === id ? { ...item, archivedOn: date, activePeriods } : item) };
}

export function restoreHabit(state, id, date = todayKey()) {
  pastOrToday(date);
  const habit = getHabit(state, id);
  if (!habit) fail('This habit does not exist.');
  if (!habit.archivedOn) return state;
  if (date < habit.archivedOn || weekStart(date) < habit.revisions.at(-1).effectiveWeek) fail('A habit cannot be restored before it was archived.');
  const { archivedOn: _archivedOn, ...restored } = habit;
  const activePeriods = [...periodsFor(habit).map(period => ({ ...period })), { startedOn: date }];
  return { ...state, habits: state.habits.map(item => item.id === id ? { ...restored, activePeriods } : item) };
}

function targetForWeek(habit, start) {
  // Original-default backfill uses the original goals even if the first revision was
  // changed before that backfill. Creation-week edits must never rewrite older weeks.
  if (habit.origin === 'default' && start < weekStart(habit.createdOn)) {
    return DEFAULT_HABITS.find(original => original.id === habit.id) ?? habit;
  }
  return habit.revisions?.findLast(revision => revision.effectiveWeek <= start) ?? habit.revisions?.[0] ?? habit;
}

export function weeklySummary(state, date = todayKey()) {
  const start = weekStart(date);
  const days = weekDays(start);
  const end = days.at(-1);
  const hasDefaultBackfill = state.habits.some(habit => habit.origin === 'default' && habit.createdOn > end && days.some(day => state.entries[day]?.[habit.id] === true));
  const habits = state.habits.flatMap(habit => {
    const count = days.reduce((sum, day) => sum + (state.entries[day]?.[habit.id] === true ? 1 : 0), 0);
    // Backfilling any original habit brings all original habits into that historical denominator.
    // Custom habits retain their creation date; restored habits retain each archived interval.
    const inActivePeriod = periodsFor(habit).some(period => period.startedOn <= end && (!period.endedOn || period.endedOn > start));
    const defaultBackfill = habit.origin === 'default' && habit.createdOn > end && hasDefaultBackfill;
    if (!inActivePeriod && !defaultBackfill && count === 0) return [];
    const { target, frequency } = targetForWeek(habit, start);
    const credited = Math.min(count, target);
    return [{ habit: { ...habit, target, frequency }, count, target, ratio: credited / target, complete: count >= target }];
  });
  const completed = habits.reduce((sum, item) => sum + Math.min(item.count, item.target), 0);
  const total = habits.reduce((sum, item) => sum + item.target, 0);
  const score = habits.length ? habits.reduce((sum, item) => sum + item.ratio, 0) / habits.length * 100 : 0;
  return { weekStart: start, days, habits, completed, total, score };
}

export function rankForScore(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail('The division score must be a finite number.');
  const score = Math.max(0, Math.min(100, value));
  const division = DIVISIONS.findLast(item => score >= item.min);
  const hasTiers = DIVISIONS.indexOf(division) <= 6;
  const progress = hasTiers ? (score - division.min) / (division.nextMin - division.min) * 4 : 0;
  const tierIndex = Math.min(3, Math.floor(progress));
  const tier = hasTiers ? TIERS[tierIndex] : '';
  const lp = hasTiers ? Math.max(0, Math.min(99, Math.floor((progress - tierIndex) * 100 + 1e-8))) : 0;
  return { ...division, tier, label: `${division.name}${tier ? ` ${tier}` : ''}`, lp };
}

export function divisionSummary(state, date = todayKey()) {
  dateObject(date);
  const currentWeek = weekStart(date);
  const completedWeeks = Array.from({ length: 12 }, (_, index) => weeklySummary(state, addDays(currentWeek, (index - 12) * 7)));
  const score = completedWeeks.reduce((sum, week) => sum + week.score, 0) / 12;
  const hasRecord = Object.values(state.entries).some(day => Object.values(day).some(value => value === true));
  const rank = hasRecord
    ? rankForScore(score)
    : { name: 'Unranked', tier: '', label: 'Unranked', lp: 0, color: '#8f9bab', min: 0, nextMin: 15 };
  const nextRank = rank.name === 'Unranked' ? DIVISIONS[0] : DIVISIONS.find(division => division.min > rank.min) ?? null;
  return { score, rank, nextRank, remaining: nextRank ? Math.max(0, nextRank.min - score) : 0, completedWeeks };
}
