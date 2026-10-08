import { Icon } from './Icons.jsx';
import { weeklySummary, weekDays, todayKey, formatDate, addDays, isHabitActiveOn } from '../lib/model.js';
export function DateNav({ date, setDate, step = 1 }) {
  const today = todayKey();
  return <div className="date-nav"><button className="button icon-button" aria-label={step === 7 ? 'Previous week' : 'Previous day'} onClick={() => setDate(addDays(date, -step))}><Icon name="left" size={18}/></button><button className="button" onClick={() => setDate(today)}>Today</button><button className="button icon-button" aria-label={step === 7 ? 'Next week' : 'Next day'} disabled={date >= today || addDays(date,step) > today} onClick={() => setDate(addDays(date, step))}><Icon name="right" size={18}/></button></div>;
}
export function HabitTable({ state, date, onToggle, setDate, history = false }) {
  const today = todayKey();
  const summary = weeklySummary(state, date);
  const summaries = new Map(summary.habits.map(item => [item.habit.id, item]));
  const habits = state.habits.filter(h => isHabitActiveOn(h, date) || state.entries[date]?.[h.id]);
  const days = weekDays(date);
  return <section className="panel habits-panel">
    <div className="section-heading"><div><div className="heading-inline"><h2>{history ? 'Your check-ins' : date === today ? 'Today’s habits' : 'Day’s habits'}</h2><label className="date-label"><span>{formatDate(date, {weekday:'long', month:'short',day:'numeric'})}</span><input type="date" aria-label="Choose check-in date" value={date} max={today} onChange={e=> e.target.value && setDate(e.target.value)}/></label></div><p>Daily anchors, with room for your weekly goals.</p></div><DateNav date={date} setDate={setDate}/></div>
    <div className="habit-grid habit-grid-head"><span>Habit</span><div className="day-grid">{days.map(day=><span className={day===date?'selected-day-label':''} key={day}>{formatDate(day,{weekday:'short'})}</span>)}</div><span>Progress</span><span/></div>
    <div className="habit-list">{habits.map(habit => {
      const stats = summaries.get(habit.id) || {count:0,target:habit.target,complete:false};
      const done = !!state.entries[date]?.[habit.id];
      return <div className={`habit-grid habit-row ${done?'is-done':''}`} key={habit.id}>
        <div className="habit-name"><div className="habit-icon"><Icon name={habit.icon}/></div><div><strong>{habit.name}</strong><span>{(stats.habit?.frequency || habit.frequency)==='daily' ? 'Daily' : `${stats.target}x per week`}</span></div></div>
        <div className="day-grid">{days.map(day => {const checked=!!state.entries[day]?.[habit.id]; return <button key={day} className={`day-button ${checked?'checked':''} ${date===day?'selected':''}`} disabled={day>today || (!isHabitActiveOn(habit, day) && !checked)} aria-label={`${checked?'Undo':'Complete'} ${habit.name} on ${formatDate(day,{month:'long',day:'numeric'})}`} aria-pressed={checked} onClick={()=>onToggle(habit.id,day)}><small className="mobile-day-label" aria-hidden="true">{formatDate(day,{weekday:'narrow'})}</small><span>{checked ? <Icon name="check" size={13}/> : null}</span></button>;})}</div>
        <span className={`habit-progress ${stats.complete?'goal-complete':''}`}>{Math.min(stats.count, stats.target)} / {stats.target} <span>this week</span>{stats.complete?<Icon name="check" size={15}/>:null}</span>
        <button className={`check-button ${done?'checked':''}`} disabled={date>today || (!isHabitActiveOn(habit,date) && !done)} aria-label={`${done?'Undo':'Complete'} ${habit.name} for selected day`} aria-pressed={done} onClick={()=>onToggle(habit.id,date)}><Icon name={done?'check':'plus'} size={23}/></button>
      </div>;
    })}</div>
    {!habits.length ? <div className="empty-state">No habits on this date. Add your next habit in Configure.</div> : null}
    <p className="privacy-note">Progress stays on this device. Back it up in Configure.</p>
  </section>;
}
