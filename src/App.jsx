import { useEffect, useState } from 'react';
import { BrandMark, Icon } from './components/Icons.jsx';
import { Dialog } from './components/Dialog.jsx';
import { DivisionPanel, WeekPanel } from './components/Summary.jsx';
import { HabitTable } from './components/HabitTable.jsx';
import { Configure } from './components/Configure.jsx';
import { Divisions } from './components/Divisions.jsx';
import { History } from './components/History.jsx';
import { useHabits } from './lib/useHabits.js';
import { usePwa } from './lib/usePwa.js';
import { todayKey, formatDate } from './lib/model.js';
const NAV=[{id:'today',label:'Today',icon:'calendar'},{id:'history',label:'History',icon:'history'},{id:'divisions',label:'Divisions',icon:'shield'},{id:'configure',label:'Configure',icon:'settings'}];
const HEADINGS={today:['One day at a time.','Build the life you want to show up for.'],history:['Every day leaves a mark.','Look back. Fill in a day. Find your rhythm.'],divisions:['Earn your next division.','Small commitments. A steady climb.'],configure:['Your rhythm. Your rules.','Make room for what matters to you.']};
export default function App() {
  const habits=useHabits(),pwa=usePwa();
  const [page,setPage]=useState(()=>NAV.some(item=>item.id===location.hash.slice(1))?location.hash.slice(1):'today');
  const [date,setDate]=useState(todayKey),[installHelp,setInstallHelp]=useState(false),[notification,setNotification]=useState('');
  const [currentDay,setCurrentDay]=useState(todayKey);
  useEffect(()=>{const timer=setInterval(()=>{const next=todayKey();setCurrentDay(previous=>{if(previous!==next)setDate(next);return next;});},30000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{const update=()=>setPage(NAV.some(item=>item.id===location.hash.slice(1))?location.hash.slice(1):'today');window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update);},[]);
  function navigate(next) {location.hash=next;setPage(next);}
  function toggle(id,day) {try{habits.toggle(id,day);}catch(error){setNotification(error.message);}}
  async function install() {if (!await pwa.install())setInstallHelp(true);}
  return <div className="app-shell"><a className="skip-link" href="#main-content" onClick={event=>{event.preventDefault();document.getElementById('main-content').focus();}}>Skip to habits</a><aside className="sidebar"><a className="brand" href="#today" onClick={()=>navigate('today')}><BrandMark/><span>Habits</span></a><nav aria-label="Main navigation">{NAV.map(item=><a href={`#${item.id}`} className={`nav-item ${page===item.id?'active':''}`} key={item.id} onClick={()=>navigate(item.id)} aria-current={page===item.id?'page':undefined}><Icon name={item.icon}/><span>{item.label}</span></a>)}</nav><p className="sidebar-footer">Your rhythm. Your rules.</p></aside><main id="main-content" tabIndex={-1}><header className="page-header"><div><h1>{HEADINGS[page][0]}</h1><p>{HEADINGS[page][1]}</p></div><div className="header-tools"><time dateTime={currentDay}>{formatDate(currentDay,{weekday:'long',month:'long',day:'numeric'})}</time>{!pwa.installed?<button className="button install-button" onClick={install}><Icon name="download" size={21}/> Install app</button>:null}</div></header>
    {pwa.offline?<p className="notice" role="status">You’re offline. Your check-ins still save on this device.</p>:null}
    {pwa.update?<div className="notice" role="status"><span>A fresh version of Habits is ready.</span><button className="button" onClick={pwa.applyUpdate}>Update app</button></div>:null}
    {habits.storageError?<p role="alert" className="notice error">{habits.storageError}</p>:null}
    {notification?<p role="alert" className="notice error">{notification}</p>:null}
    {page==='today'?<><div className="summary-grid"><DivisionPanel state={habits.state} onView={()=>navigate('divisions')}/><WeekPanel state={habits.state}/></div><HabitTable state={habits.state} date={date} setDate={setDate} onToggle={toggle}/></>:null}
    {page==='history'?<History state={habits.state} date={date} setDate={setDate} onToggle={toggle}/>:null}
    {page==='divisions'?<Divisions state={habits.state}/>:null}
    {page==='configure'?<Configure habits={habits}/>:null}
  </main>{installHelp?<Dialog title="Keep Habits close." onClose={()=>setInstallHelp(false)}><p>Install Habits on your home screen for quick check-ins and offline access.</p><ol className="install-steps"><li><strong>iPhone or iPad</strong><span>Open this site in Safari. Tap Share, choose Add to Home Screen, then Add.</span></li><li><strong>Android</strong><span>Open Chrome’s menu and choose Install app or Add to Home screen.</span></li><li><strong>Computer</strong><span>Use the install icon in your browser’s address bar, or its Install app menu.</span></li></ol><button className="button primary full-width" onClick={()=>setInstallHelp(false)}>Got it</button></Dialog>:null}</div>;
}
