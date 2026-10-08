import { useRef, useState } from 'react';
import { Icon } from './Icons.jsx';
import { Dialog } from './Dialog.jsx';
import { normalizeState } from '../lib/model.js';
const ICONS = ['dumbbell', 'book-open', 'cross', 'footprints', 'activity', 'pen-line', 'palette', 'check'];
export function Configure({ habits }) {
  const { state, save, archive, restore, reorder, exportBackup, importState } = habits;
  const [editing, setEditing] = useState(null);
  const [archiveId, setArchiveId] = useState(null);
  const [importing, setImporting] = useState(null);
  const [message, setMessage] = useState('');
  const fileRef = useRef(null);
  const active = state.habits.filter(h => !h.archivedOn);
  const archived = state.habits.filter(h => h.archivedOn);
  async function readBackup(event) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setMessage('That backup is too large. Choose a Habits JSON backup under 5 MB.'); return; }
    try { const next = normalizeState(JSON.parse(await file.text())); setImporting(next); setMessage(''); }
    catch (error) { setMessage(`Could not import this file. ${error.message}`); }
  }
  return <><section className="panel configure-panel"><div className="section-heading"><div><h2>Your habits</h2><p>Keep the daily anchors. Make the weekly goals your own.</p></div><button className="button primary" disabled={state.habits.length >= 100} title={state.habits.length >= 100 ? "The 100-habit limit has been reached." : undefined} onClick={()=>setEditing({name:'',description:'',frequency:'weekly',target:1,icon:'check'})}><Icon name="plus" size={18}/> Add habit</button></div>
    <div className="config-list">{active.map((habit,index)=><div className="config-row" key={habit.id}><div className="habit-name"><div className="habit-icon"><Icon name={habit.icon}/></div><div><strong>{habit.name}</strong><span>{habit.frequency==='daily'?'Daily':`${habit.target} times per week`}{habit.description ? ` · ${habit.description}` : ''}</span></div></div><div className="config-actions"><button className="subtle-link reorder-button" aria-label={`Move ${habit.name} up`} disabled={index===0} onClick={()=>reorder(habit.id,-1)}><Icon name="up" size={16}/></button><button className="subtle-link reorder-button" aria-label={`Move ${habit.name} down`} disabled={index===active.length-1} onClick={()=>reorder(habit.id,1)}><Icon name="down" size={16}/></button><button className="button" onClick={()=>setEditing(habit)} aria-label={`Edit ${habit.name}`}>Edit</button><button className="icon-button button" aria-label={`Archive ${habit.name}`} onClick={()=>setArchiveId(habit.id)}><Icon name="archive" size={18}/></button></div></div>)}</div>
    <p className="privacy-note">Target changes apply to this week. Completed weeks keep their original goals.</p>
    {archived.length ? <details className="archived"><summary>Archived habits ({archived.length})</summary>{archived.map(habit=><div className="archived-row" key={habit.id}><span>{habit.name}</span><button className="button" onClick={()=>{restore(habit.id);setMessage(`${habit.name} restored.`);}}>Restore</button></div>)}</details>:null}
  </section><section className="panel backup-panel"><h2>Your data, in your hands.</h2><p>Your check-ins are saved in this browser. Export a backup to keep a copy or move to another device.</p><div className="button-row"><button className="button" onClick={()=>{exportBackup();setMessage('Backup exported. Keep it somewhere safe.');}}><Icon name="download" size={18}/> Export backup</button><button className="button" onClick={()=>fileRef.current.click()}><Icon name="upload" size={18}/> Import backup</button></div><input ref={fileRef} hidden type="file" accept=".json,application/json" onChange={readBackup}/><p className="small-note">There’s no account or automatic syncing. Clearing browser data removes your saved progress.</p></section>
    {message ? <p role="status" className="status-message">{message}</p> : null}
    {editing ? <HabitEditor habit={editing} onClose={()=>setEditing(null)} onSave={habit=>{save(habit);setEditing(null);setMessage(`${habit.name} saved.`);}}/> : null}
    {archiveId ? <Dialog title="Archive this habit?" onClose={()=>setArchiveId(null)}><p>Its past check-ins and completed-week scores stay in your history. You can restore it any time.</p><div className="dialog-footer"><button className="button" onClick={()=>setArchiveId(null)}>Cancel</button><button className="button primary" onClick={()=>{archive(archiveId);setArchiveId(null);}}>Archive habit</button></div></Dialog>:null}
    {importing ? <Dialog title="Restore this backup?" onClose={()=>setImporting(null)}><p>This backup has {importing.habits.length} habits and {Object.keys(importing.entries).length} logged days. Restoring it replaces the data on this device.</p><p>Export your current backup first if you want to keep it.</p><div className="dialog-footer"><button className="button" onClick={exportBackup}>Export current data</button><button className="button primary" onClick={()=>{importState(importing);setImporting(null);setMessage('Backup restored. You’re ready to go.');}}>Restore backup</button></div></Dialog>:null}
  </>;
}
function HabitEditor({ habit, onClose, onSave }) {
  const [name,setName]=useState(habit.name), [description,setDescription]=useState(habit.description || '');
  const [frequency,setFrequency]=useState(habit.frequency),[target,setTarget]=useState(habit.target),[icon,setIcon]=useState(habit.icon),[error,setError]=useState('');
  function submit(e) { e.preventDefault(); if (!name.trim()) { setError('Give your habit a name.');return; } onSave({...habit,id:habit.id || crypto.randomUUID(),name:name.trim(),description:description.trim(),frequency,target:frequency==='daily'?7:Number(target),icon}); }
  return <Dialog title={habit.id?'Edit habit':'Add a habit'} onClose={onClose}><form onSubmit={submit}><label className="form-field">Habit name<input autoFocus required maxLength={60} value={name} onChange={e=>setName(e.target.value)} placeholder="What do you want to show up for?"/></label><label className="form-field">A little detail <span className="optional">(optional)</span><input maxLength={140} value={description} onChange={e=>setDescription(e.target.value)} placeholder="e.g. Read one chapter"/></label><div className="form-columns"><label className="form-field">Rhythm<select value={frequency} onChange={e=>setFrequency(e.target.value)}><option value="daily">Every day</option><option value="weekly">Times per week</option></select></label><label className="form-field">Weekly target<input type="number" min="1" max="7" step="1" required disabled={frequency==='daily'} value={frequency==='daily'?7:target} onChange={e=>setTarget(e.target.value)}/></label></div><fieldset className="icon-picker"><legend>Pick an icon</legend><div>{ICONS.map(value=><button type="button" className={`button icon-button ${value===icon?'active':''}`} aria-label={`Use ${value} icon`} aria-pressed={value===icon} key={value} onClick={()=>setIcon(value)}><Icon name={value}/></button>)}</div></fieldset><p className="small-note">One check-in per day. Weekly goals can be completed on any days you choose.</p>{error?<p role="alert">{error}</p>:null}<div className="dialog-footer"><button className="button" type="button" onClick={onClose}>Cancel</button><button className="button primary" type="submit">Save habit</button></div></form></Dialog>;
}
