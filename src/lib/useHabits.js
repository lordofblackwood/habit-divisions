import { useCallback, useEffect, useState } from 'react';
import { createInitialState, normalizeState, toggleEntry, saveHabit, archiveHabit, restoreHabit, todayKey } from './model.js';

const STORAGE_KEY = 'habit-divisions:v1';
export function useHabits() {
  const [storageError, setStorageError] = useState('');
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? normalizeState(JSON.parse(raw)) : createInitialState();
    } catch { return createInitialState(); }
  });
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); setStorageError(''); }
    catch { setStorageError('This browser could not save your changes. Export a backup before closing.'); }
  }, [state]);
  useEffect(() => {
    function sync(event) {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try { setState(normalizeState(JSON.parse(event.newValue))); } catch { /* Keep the valid in-memory state. */ }
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const toggle = useCallback((id, date) => setState(previous => toggleEntry(previous, id, date)), []);
  const save = useCallback(habit => setState(previous => saveHabit(previous, habit)), []);
  const archive = useCallback(id => setState(previous => archiveHabit(previous, id)), []);
  const restore = useCallback(id => setState(previous => restoreHabit(previous, id)), []);
  const reorder = useCallback((id, direction) => setState(previous => {
    const habits = [...previous.habits];
    const index = habits.findIndex(h => h.id === id);
    const active = habits.filter(habit => !habit.archivedOn);
    const activeIndex = active.findIndex(habit => habit.id === id);
    const neighbor = active[activeIndex + direction];
    if (!neighbor) return previous;
    const to = habits.findIndex(habit => habit.id === neighbor.id);
    if (to < 0 || to >= habits.length) return previous;
    [habits[index], habits[to]] = [habits[to], habits[index]];
    return { ...previous, habits };
  }), []);
  const importState = useCallback(raw => setState(normalizeState(raw)), []);
  const exportBackup = useCallback(() => {
    const blob = new Blob([JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = `habits-backup-${todayKey()}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [state]);
  return { state, storageError, toggle, save, archive, restore, reorder, importState, exportBackup };
}
