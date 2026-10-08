import { useState } from 'react';
import { todayKey, addDays, weekStart, formatDate } from '../lib/model.js';
import { Icon } from './Icons.jsx';
import { HabitTable } from './HabitTable.jsx';
export function History({state,onToggle,date,setDate}) {
  const [month,setMonth]=useState(()=>todayKey().slice(0,7)+'-01');
  const first=weekStart(month);
  const cells=Array.from({length:42},(_,index)=>addDays(first,index));
  const today=todayKey();
  function shift(amount) { const [year,m]=month.split('-').map(Number);const result=new Date(year,m-1+amount,1,12);setMonth(`${result.getFullYear()}-${String(result.getMonth()+1).padStart(2,'0')}-01`); }
  return <><section className="panel calendar-panel"><div className="section-heading"><div><h2>{formatDate(month,{month:'long',year:'numeric'})}</h2><p>A record of the days you showed up.</p></div><div className="date-nav"><button className="button icon-button" aria-label="Previous month" onClick={()=>shift(-1)}><Icon name="left" size={18}/></button><button className="button" onClick={()=>{setMonth(today.slice(0,7)+'-01');setDate(today);}}>This month</button><button className="button icon-button" aria-label="Next month" disabled={month.slice(0,7)>=today.slice(0,7)} onClick={()=>shift(1)}><Icon name="right" size={18}/></button></div></div><div className="calendar-grid"><div className="calendar-days">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day=><span key={day}>{day}</span>)}</div><div className="calendar-cells">{cells.map(day=>{const count=Object.keys(state.entries[day]||{}).length;return <button className={`calendar-cell ${day.slice(0,7)!==month.slice(0,7)?'other-month':''} ${date===day?'selected':''} ${today===day?'today':''}`} key={day} disabled={day>today} onClick={()=>setDate(day)} aria-label={`${formatDate(day,{month:'long',day:'numeric'})}, ${count} check-ins`} aria-pressed={date===day}><span>{Number(day.slice(-2))}</span><span className="calendar-marks">{count ? <><i/>{count}</> : <span className="no-mark">—</span>}</span></button>;})}</div></div><p className="small-note">Select a day to see, add, or undo its check-ins.</p></section><HabitTable state={state} date={date} setDate={setDate} onToggle={onToggle} history/></>;
}
