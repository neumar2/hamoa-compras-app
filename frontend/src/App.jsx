import React, { useState, useEffect, useCallback } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SolicitacaoForm from './pages/SolicitacaoForm';
import EqualizacaoForm from './pages/EqualizacaoForm';
import UserManagement from './pages/UserManagement';
import Sobre from './pages/Sobre';
import Receitas from './pages/Receitas';
import Configuracoes from './pages/Configuracoes';
import Navbar from './components/Navbar';
import api from './api';

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [activeRequest, setActiveRequest] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      
      // Apply initial theme on mount
      if (parsed && parsed.theme) {
        const root = document.documentElement;
        if (parsed.theme === 'light') {
          root.removeAttribute('data-theme');
        } else {
          root.setAttribute('data-theme', parsed.theme);
        }
      }
    }
  }, []);

  const handleThemeChange = async (newTheme) => {
    if (!user) return;
    const updatedUser = { ...user, theme: newTheme };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    const root = document.documentElement;
    if (newTheme === 'light') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', newTheme);
    }

    try {
      await api.put('/users/theme', { theme: newTheme });
    } catch (err) {
      console.error('Erro ao salvar tema no servidor:', err);
    }
  };

  const handleLogin = (loggedUser) => {
    setUser(loggedUser);
    setCurrentPage('dashboard');
    if (loggedUser && loggedUser.theme) {
      const root = document.documentElement;
      if (loggedUser.theme === 'light') {
        root.removeAttribute('data-theme');
      } else {
        root.setAttribute('data-theme', loggedUser.theme);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCurrentPage('dashboard');
    setActiveRequest(null);
  };

  const handleNavigate = (page, request = null) => {
    setCurrentPage(page);
    if (request !== null) {
      setActiveRequest(request);
    }
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      <Navbar user={user} onLogout={handleLogout} onNavigate={handleNavigate} onThemeChange={handleThemeChange} notifications={notifications} />
      
      {currentPage === 'dashboard' && (
        <Dashboard user={user} onNavigate={handleNavigate} onNotificationsChange={setNotifications} />
      )}

      {currentPage === 'solicitacao-form' && (
        <SolicitacaoForm onNavigate={handleNavigate} editingRequest={null} duplicateRequest={activeRequest} />
      )}

      {currentPage === 'solicitacao-edit' && (
        <SolicitacaoForm onNavigate={handleNavigate} editingRequest={activeRequest} />
      )}

      {currentPage === 'equalizacao-form' && (
        <EqualizacaoForm user={user} solicitacao={activeRequest} onNavigate={handleNavigate} />
      )}

      {currentPage === 'user-management' && (
        <UserManagement user={user} onNavigate={handleNavigate} />
      )}

      {currentPage === 'sobre' && (
        <Sobre />
      )}

      {currentPage === 'receitas' && (
        <Receitas user={user} onNavigate={handleNavigate} />
      )}

      {currentPage === 'configuracoes' && (
        <Configuracoes user={user} onNavigate={handleNavigate} />
      )}
    </div>
  );
}
