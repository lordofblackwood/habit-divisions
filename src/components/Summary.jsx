import { Icon, RankEmblem } from './Icons.jsx';
import { divisionSummary, weeklySummary, formatDate } from '../lib/model.js';
export function DivisionPanel({ state, onView }) {
  const division = divisionSummary(state);
  const { rank } = division;
  const nextLabel = rank.name === 'Unranked' ? 'Iron IV' : rank.tier ? nextDivisionLabel(rank, division.nextRank) : division.nextRank?.name || 'Top of the ladder';
  const progress = rank.name === 'Unranked' ? 0 : rank.tier ? rank.lp : division.nextRank ? (division.score - rank.min) / (division.nextRank.min - rank.min) * 100 : 100;
  return <section className="panel division-panel" aria-label="Your division">
    <h2>Your division</h2><div className="division-body"><RankEmblem color={rank.color}/><div className="division-info">
      <div className="division-title"><h3>{rank.label}</h3><button className="subtle-link" onClick={onView} aria-label="View division ladder"><Icon name="right" size={18}/></button></div>
      <div className="lp">{rank.name === 'Unranked' ? 'Your first check-in starts here' : rank.tier ? `${rank.lp} LP` : `${division.score.toFixed(1)}% consistency`}</div>
      <div className="progress-track"><span style={{ width: `${progress}%` }}/></div>
      <div className="progress-label"><span>{rank.label}</span><span>{nextLabel}</span></div>
      <p>Built on 12 completed weeks of consistency.</p>
    </div></div>
  </section>;
}
function nextDivisionLabel(rank, nextRank) {
  const tiers = ['IV', 'III', 'II', 'I'];
  if (rank.tier && rank.tier !== 'I') return `${rank.name} ${tiers[tiers.indexOf(rank.tier) + 1]}`;
  return nextRank ? `${nextRank.name}${nextRank.min < 95 ? ' IV' : ''}` : 'Top of the ladder';
}
export function WeekPanel({ state }) {
  const summary = weeklySummary(state);
  return <section className="panel week-panel"><h2>This week</h2><div className="week-body"><div className="week-total"><strong>{summary.completed} <span>/ {summary.total}</span></strong><span>check-ins</span></div><div className="rhythm" aria-label="Daily check-ins this week">
    {summary.days.map(day => { const count = summary.habits.filter(({habit}) => state.entries[day]?.[habit.id]).length; return <div className="rhythm-day" key={day} title={`${formatDate(day, { weekday: 'long' })}: ${count} check-ins`}><div className="rhythm-bar"><span style={{height:`${summary.habits.length ? count / summary.habits.length * 100 : 0}%`}}/></div><span>{formatDate(day, { weekday: 'short' })}</span></div>; })}
  </div></div><p>{summary.completed ? `${Math.round(summary.score)}% of your weekly goals. Keep showing up.` : 'A fresh week. A little every day.'}</p></section>;
}
