import { useEffect, useRef } from 'react';
import { Icon } from './Icons.jsx';
export function Dialog({ title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => { const element = ref.current; element.showModal(); element.querySelector('[autofocus]')?.focus(); return () => element.close(); }, []);
  return <dialog ref={ref} className="dialog" onCancel={onClose} onClick={e => { if(e.target===e.currentTarget) onClose(); }} aria-labelledby="dialog-title"><div className="dialog-heading"><h2 id="dialog-title">{title}</h2><button className="icon-button button" aria-label="Close dialog" onClick={onClose}><Icon name="close"/></button></div>{children}</dialog>;
}
