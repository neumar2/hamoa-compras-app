import React from 'react';
import NotificationBell from './NotificationBell';

export default function Navbar({ user, onLogout, onNavigate, onThemeChange, notifications = [] }) {
  const handleThemeChange = (e) => {
    const theme = e.target.value;
    if (onThemeChange) {
      onThemeChange(theme);
    } else {
      const root = document.documentElement;
      if (theme === 'light') {
        root.removeAttribute('data-theme');
      } else {
        root.setAttribute('data-theme', theme);
      }
    }
  };

  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: 'linear-gradient(135deg, var(--secondary-color), #0f172a)',
      padding: '1.25rem 2rem',
      borderRadius: 'var(--radius-xl)',
      color: 'white',
      marginBottom: '2rem',
      boxShadow: 'var(--shadow-xl)',
      flexWrap: 'wrap',
      gap: '1rem'
    }}>
      <div style={{ cursor: 'pointer' }} onClick={() => onNavigate('dashboard')}>
        <h1 style={{ fontFamily: 'Outfit', fontSize: '1.6rem', fontWeight: 800 }}>HAMOA RESORT</h1>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Painel de Compras & Contratações</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
          <div style={{ fontWeight: 600 }}>{user.name}</div>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Setor: {user.role}</div>
        </div>

        {(user.role === 'TI' || user.role === 'GESTAO') && (
          <button className="btn" onClick={() => onNavigate('user-management')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '0.5rem 0.8rem' }}>
            👥 Usuários
          </button>
        )}

        {(user.role === 'TI' || user.role === 'GESTAO' || user.canAccessReceitas) && (
          <button className="btn" onClick={() => onNavigate('receitas')} style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#6ee7b7', padding: '0.5rem 0.8rem' }}>
            💰 Receitas
          </button>
        )}

        {(user.role === 'TI' || user.role === 'GESTAO' || user.canAccessSettings) && (
          <button className="btn" onClick={() => onNavigate('configuracoes')} style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#c4b5fd', padding: '0.5rem 0.8rem' }}>
            ⚙️ Config.
          </button>
        )}

        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.2)', height: '24px', margin: '0 4px' }}></div>

        <select value={user.theme || 'light'} onChange={handleThemeChange} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '0.5rem 0.8rem', borderRadius: 'var(--radius-md)', cursor: 'pointer', outline: 'none' }}>
          <option value="light" style={{ color: 'black' }}>☀️ Claro (Padrão)</option>
          <option value="dark" style={{ color: 'black' }}>🌙 Escuro (Noturno)</option>
          <option value="oceano" style={{ color: 'black' }}>🌊 Oceano</option>
          <option value="floresta" style={{ color: 'black' }}>🌲 Floresta</option>
          <option value="alto-contraste" style={{ color: 'black' }}>👁️ Alto Contraste</option>
        </select>

        <button className="btn" onClick={() => onNavigate('sobre')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '0.5rem 0.8rem' }}>
          ℹ️ Sobre
        </button>

        <NotificationBell notifications={notifications} />

        <button className="btn btn-danger" onClick={onLogout} style={{ padding: '0.5rem 0.8rem' }}>
          🚪 Sair
        </button>

        <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', alignSelf: 'flex-end', marginBottom: '2px', marginLeft: '4px' }}>
          v1.0.0
        </div>
      </div>
    </header>
  );
}
