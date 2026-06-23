import React, { useState, useEffect, useRef } from 'react';

/**
 * NotificationBell — renders a bell icon with unread count badge
 * and a dropdown panel listing pending action notifications.
 * 
 * Props:
 *   notifications: Array<{ id, text, type, onClick }>
 */
export default function NotificationBell({ notifications = [] }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissed_notifs') || '[]');
    } catch {
      return [];
    }
  });
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const active = notifications.filter(n => !dismissed.includes(n.id));
  const count = active.length;

  const dismiss = (id) => {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem('dismissed_notifs', JSON.stringify(next));
  };

  const dismissAll = () => {
    const ids = active.map(n => n.id);
    const next = [...dismissed, ...ids];
    setDismissed(next);
    localStorage.setItem('dismissed_notifs', JSON.stringify(next));
    setOpen(false);
  };

  const typeStyle = (type) => {
    switch (type) {
      case 'warning': return { bg: '#fef3c7', color: '#d97706', icon: '⚠️' };
      case 'danger':  return { bg: '#fef2f2', color: '#ef4444', icon: '🚨' };
      case 'info':    return { bg: '#dbeafe', color: '#1d4ed8', icon: '📋' };
      case 'success': return { bg: '#ecfdf5', color: '#059669', icon: '✅' };
      default:        return { bg: '#f3f4f6', color: '#4b5563', icon: '🔔' };
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title={`${count} notificações pendentes`}
        style={{
          position: 'relative',
          background: count > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.1)',
          border: count > 0 ? '1px solid rgba(239,68,68,0.4)' : 'none',
          borderRadius: 'var(--radius-md)',
          color: 'white',
          padding: '0.5rem 0.8rem',
          cursor: 'pointer',
          fontSize: '1.1rem',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        🔔
        {count > 0 && (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ef4444',
            color: 'white',
            borderRadius: '10px',
            fontSize: '0.65rem',
            fontWeight: 800,
            minWidth: '18px',
            height: '18px',
            padding: '0 4px',
            lineHeight: 1,
          }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: 'calc(100% + 8px)',
          width: '380px',
          maxHeight: '480px',
          overflowY: 'auto',
          background: 'var(--container-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          zIndex: 9999,
        }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
              🔔 Notificações ({count})
            </span>
            {count > 0 && (
              <button onClick={dismissAll} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}>
                Limpar tudo
              </button>
            )}
          </div>

          {active.length === 0 ? (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              ✅ Sem pendências no momento!
            </div>
          ) : (
            active.map(n => {
              const { bg, color, icon } = typeStyle(n.type);
              return (
                <div
                  key={n.id}
                  style={{
                    padding: '0.65rem 1rem',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    background: bg,
                    cursor: n.onClick ? 'pointer' : 'default',
                    transition: 'opacity 0.15s'
                  }}
                  onClick={n.onClick}
                >
                  <span style={{ fontSize: '1rem', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
                  <span style={{ flex: 1, fontSize: '0.82rem', color: color, lineHeight: 1.4 }}>{n.text}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                    title="Dispensar"
                    style={{ background: 'none', border: 'none', color: color, cursor: 'pointer', fontSize: '0.8rem', flexShrink: 0, opacity: 0.6 }}
                  >
                    ✕
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
