export function Icon({ name, size = 22, ...props }) {
  const paths = {
    calendar: <><path d="M6 3v4m12-4v4M3 10h18"/><rect x="3" y="5" width="18" height="16" rx="2"/></>,
    history: <><path d="M4 21V11h4v10m4 0V4h4v17m4 0v-7h2v7"/></>,
    shield: <path d="M12 3 3.5 6v6c0 5 5.5 8 8.5 10 3-2 8.5-5 8.5-10V6Z"/>,
    settings: <><path d="m9 3-.8 2.5-2.5.8-2 2L5 11l-1.3 2.7 2 2 2.5.8L9 19h4l.8-2.5 2.5-.8 2-2L17 11l1.3-2.7-2-2-2.5-.8L13 3Z"/><circle cx="11" cy="11" r="3"/></>,
    dumbbell: <><path d="M3 7v10m3-12v14m12-14v14m3-12v10M6 12h12M1 12h2m18 0h2"/></>,
    'book-open': <><path d="M12 6v15M3 5c3-1 6-1 9 1 3-2 6-2 9-1v15c-3-1-6-1-9 1-3-2-6-2-9-1Z"/></>,
    cross: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></>,
    footprints: <><ellipse cx="8" cy="8" rx="3" ry="5" transform="rotate(-15 8 8)"/><ellipse cx="17" cy="13" rx="3" ry="5" transform="rotate(15 17 13)"/><path d="m7 15 1 3m8 3 1 1"/></>,
    activity: <><circle cx="16" cy="4" r="2"/><path d="m12 8 3 2 4-1m-7-1-3 5 5 3-2 6M9 13l-3 6H2m5-8 3-3 2 1m2 7 4 4"/></>,
    'pen-line': <><path d="m15 3 6 6-12 12-7 1 1-7Z"/><path d="m13 5 6 6M3 15l6 6"/></>,
    palette: <><path d="M12 3a9 9 0 1 0 0 18h1.2c1.8 0 2.3-1.7 1.2-2.9-1.2-1.3-.5-3.1 1.1-3.1H18a3 3 0 0 0 3-3c0-5-4-9-9-9Z"/><circle cx="7" cy="10" r=".7"/><circle cx="10" cy="6.5" r=".7"/><circle cx="15" cy="7.5" r=".7"/><circle cx="7.5" cy="15" r=".7"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    left: <path d="m15 5-7 7 7 7"/>,
    right: <path d="m9 5 7 7-7 7"/>,
    up: <path d="m5 15 7-7 7 7"/>,
    down: <path d="m5 9 7 7 7-7"/>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M3 16v5h18v-5"/></>,
    upload: <><path d="M12 16V4m-5 5 5-5 5 5M3 16v5h18v-5"/></>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    archive: <><path d="M5 9v12h14V9m-9 5h4"/><rect x="3" y="3" width="18" height="6" rx="1"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.check}</svg>;
}

export function BrandMark() {
  return <svg width="31" height="32" viewBox="0 0 31 32" aria-hidden="true"><rect x="1" y="21" width="7" height="10" rx="1.5" fill="#d7fb79"/><rect x="11" y="13" width="7" height="18" rx="1.5" fill="#d7fb79"/><rect x="21" y="3" width="7" height="28" rx="1.5" fill="#d7fb79"/></svg>;
}

export function RankEmblem({ color = '#8f9bab', small = false }) {
  return <svg className={`rank-emblem ${small ? 'small' : ''}`} viewBox="0 0 130 154" fill="none" aria-hidden="true">
    <path d="M65 5 119 25l-4 70-50 52L15 95l-4-70Z" fill={color} fillOpacity=".4" stroke={color} strokeWidth="2"/>
    <path d="m65 14 45 17-4 60-41 44-41-44-4-60Z" fill="#101820" stroke="#080c16" strokeWidth="5"/>
    <path d="M65 23 101 36l-3 51-33 37-33-37-3-51Z" fill={color} fillOpacity=".19" stroke={color} strokeOpacity=".7"/>
    <path d="M65 23v101L29 36Z" fill={color} fillOpacity=".17"/><path d="m29 36 36 32 36-32-36-13Z" fill={color} fillOpacity=".28"/>
    <path d="m65 68 33 19-33 37-33-37Z" fill={color} fillOpacity=".1"/><path d="M65 14v9m0 101v11M20 31l9 5m72 0 9-5M24 91l8-4m66 0 8 4" stroke={color} strokeOpacity=".6"/>
  </svg>;
}
