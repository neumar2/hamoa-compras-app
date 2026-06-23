import React, { useState } from 'react';
import api from '../api';

export default function Login({ onLogin }) {
  const [step, setStep] = useState('login'); // 'login' | 'activate' | 'forgot' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      onLogin(response.data.user);
    } catch (err) {
      if (err.response?.data?.error === 'ACCOUNT_INACTIVE') {
        setStep('activate');
        setError(err.response?.data?.message || 'Sua conta ainda não está ativa. Insira o código de ativação enviado para seu e-mail.');
      } else {
        setError(err.response?.data?.error || 'Erro ao efetuar login.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleActivateSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await api.post('/auth/activate-account', { email, code: activationCode });
      setSuccess(response.data.message || 'Conta ativada com sucesso!');
      setStep('login');
      setActivationCode('');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao ativar conta.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email });
      setSuccess(response.data.message || 'Código de recuperação enviado.');
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao solicitar recuperação.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const response = await api.post('/auth/reset-password', { email, token: resetToken, newPassword });
      setSuccess(response.data.message || 'Senha redefinida com sucesso!');
      setStep('login');
      setResetToken('');
      setNewPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (newStep) => {
    setError('');
    setSuccess('');
    setStep(newStep);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 style={{ fontFamily: 'Outfit', fontWeight: 800, textAlign: 'center', marginBottom: '0.5rem', color: 'var(--primary-color)' }}>
          HAMOA COMPRAS
        </h2>
        
        {step === 'login' && (
          <>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Faça login para acessar o painel corporativo.
            </p>

            {error && (
              <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                {error}
              </div>
            )}

            {success && (
              <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                {success}
              </div>
            )}

            <form onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label>E-mail Corporativo</label>
                <input 
                  type="email" 
                  required 
                  placeholder="exemplo@hamoa.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Senha</label>
                <input 
                  type="password" 
                  required 
                  placeholder="Digite sua senha" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
                disabled={loading}
              >
                {loading ? 'Carregando...' : 'Entrar'}
              </button>
            </form>

            <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <a href="#forgot" onClick={() => navigateTo('forgot')} style={{ color: 'var(--primary-color)', fontWeight: 600, textDecoration: 'none' }}>
                Esqueci minha senha
              </a>
              <a href="#activate" onClick={() => navigateTo('activate')} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                Ativar nova conta
              </a>
            </div>
          </>
        )}

        {step === 'activate' && (
          <>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Insira o código de ativação recebido por e-mail.
            </p>

            {error && (
              <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleActivateSubmit}>
              <div className="form-group">
                <label>E-mail da Conta</label>
                <input 
                  type="email" 
                  required 
                  placeholder="exemplo@hamoa.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Código de Ativação (6 dígitos)</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ex: 123456" 
                  maxLength={6}
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
                disabled={loading}
              >
                {loading ? 'Validando...' : 'Ativar Minha Conta'}
              </button>
            </form>

            <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem' }}>
              <a href="#back" onClick={() => navigateTo('login')} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                Voltar para o Login
              </a>
            </div>
          </>
        )}

        {step === 'forgot' && (
          <>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Digite seu e-mail para receber um código de redefinição de senha.
            </p>

            {error && (
              <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleForgotSubmit}>
              <div className="form-group">
                <label>E-mail Cadastrado</label>
                <input 
                  type="email" 
                  required 
                  placeholder="exemplo@hamoa.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
                disabled={loading}
              >
                {loading ? 'Processando...' : 'Enviar Código de Recuperação'}
              </button>
            </form>

            <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem' }}>
              <a href="#back" onClick={() => navigateTo('login')} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                Voltar para o Login
              </a>
            </div>
          </>
        )}

        {step === 'reset' && (
          <>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Forneça o código enviado por e-mail e defina a sua nova senha.
            </p>

            {success && (
              <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                {success}
              </div>
            )}

            {error && (
              <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 600 }}>
                {error}
              </div>
            )}

            <form onSubmit={handleResetSubmit}>
              <div className="form-group">
                <label>E-mail</label>
                <input 
                  type="email" 
                  required 
                  readOnly
                  style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                  value={email}
                />
              </div>

              <div className="form-group">
                <label>Código de Recuperação (6 dígitos)</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ex: 654321" 
                  maxLength={6}
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Nova Senha</label>
                <input 
                  type="password" 
                  required 
                  placeholder="Mínimo 6 caracteres" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
                disabled={loading}
              >
                {loading ? 'Alterando...' : 'Salvar Nova Senha'}
              </button>
            </form>

            <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '0.85rem' }}>
              <a href="#back" onClick={() => navigateTo('login')} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                Cancelar e Voltar
              </a>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
