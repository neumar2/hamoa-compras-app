import React, { useState, useEffect } from 'react';
import api from '../api';

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR');
};

const SmtpSettingsPanel = () => {
  const [config, setConfig] = useState({ host: '', port: '587', user: '', pass: '', secure: 'false', fromName: '' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings/smtp');
      setConfig({ ...res.data, pass: res.data.pass ? '********' : '' });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...config };
      if (payload.pass === '********') delete payload.pass;
      await api.post('/settings/smtp', payload);
      alert('Configurações salvas com sucesso!');
      fetchConfig();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const payload = { ...config };
      if (payload.pass === '********') delete payload.pass;
      const res = await api.post('/settings/smtp/test', payload);
      alert(res.data.message);
    } catch (err) {
      alert(err.response?.data?.error || 'Falha ao testar conexão SMTP.');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <p>Carregando configurações...</p>;

  return (
    <div className="card" style={{ maxWidth: '600px' }}>
      <div className="card-title">📧 Configuração de Servidor de E-mail (SMTP)</div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        Configure as credenciais SMTP para que o sistema possa enviar e-mails automáticos (Ex: Ativação de Conta, Esqueci a Senha).
      </p>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="form-group">
          <label>Nome do Remetente</label>
          <input type="text" placeholder="Ex: Sistema Hamoa" value={config.fromName} onChange={e => setConfig({ ...config, fromName: e.target.value })} />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>Servidor SMTP (Host)</label>
            <input type="text" placeholder="smtp.gmail.com" value={config.host} onChange={e => setConfig({ ...config, host: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Porta</label>
            <input type="number" placeholder="587" value={config.port} onChange={e => setConfig({ ...config, port: e.target.value })} required />
          </div>
        </div>

        <div className="form-group">
          <label>Criptografia Segura (SSL/TLS nativo)</label>
          <select value={config.secure} onChange={e => setConfig({ ...config, secure: e.target.value })}>
            <option value="false">Não (Geralmente Porta 587 - STARTTLS)</option>
            <option value="true">Sim (Geralmente Porta 465 - SSL)</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label>Usuário (E-mail)</label>
            <input type="email" placeholder="seu-email@dominio.com" value={config.user} onChange={e => setConfig({ ...config, user: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Senha</label>
            <input type="password" placeholder="Senha do e-mail" value={config.pass} onChange={e => setConfig({ ...config, pass: e.target.value })} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : '💾 Salvar Configurações'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={handleTest} disabled={testing}>
            {testing ? 'Testando...' : '📨 Testar Conexão'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default function Configuracoes({ user, onNavigate }) {
  const [activeTab, setActiveTab] = useState('backup');
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [backups, setBackups] = useState([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [backupStatus, setBackupStatus] = useState('');
  const [logFilter, setLogFilter] = useState('');
  const [logFilterUser, setLogFilterUser] = useState('');
  const [logFilterDateStart, setLogFilterDateStart] = useState('');
  const [logFilterDateEnd, setLogFilterDateEnd] = useState('');
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [restoreText, setRestoreText] = useState('');
  const [restoreLoading, setRestoreLoading] = useState(false);

  // Plano de Contas states
  const [planoContas, setPlanoContas] = useState([]);
  const [planoLoading, setPlanoLoading] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('');
  const [newColor, setNewColor] = useState('');

  // Salões states
  const [saloes, setSaloes] = useState([]);
  const [saloesLoading, setSaloesLoading] = useState(false);
  const [editingSalao, setEditingSalao] = useState(null);
  const [newSalaoName, setNewSalaoName] = useState('');

  const isAdmin = user.role === 'TI' || user.role === 'GESTAO' || user.canAccessSettings;

  useEffect(() => {
    if (activeTab === 'logs') fetchLogs();
    if (activeTab === 'backup') fetchBackupList();
    if (activeTab === 'plano') fetchPlanoContas();
    if (activeTab === 'saloes') fetchSaloes();
  }, [activeTab]);

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await api.get('/settings/logs', { params: { limit: 500 } });
      setLogs(res.data);
    } catch (e) {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchBackupList = async () => {
    setBackupsLoading(true);
    try {
      const res = await api.get('/settings/backup/list');
      setBackups(res.data);
    } catch (e) {
      setBackups([]);
    } finally {
      setBackupsLoading(false);
    }
  };

  const fetchPlanoContas = async () => {
    setPlanoLoading(true);
    try {
      const res = await api.get('/solicitacoes/plano-contas');
      setPlanoContas(res.data || []);
    } catch (e) {
      setPlanoContas([]);
    } finally {
      setPlanoLoading(false);
    }
  };

  const fetchSaloes = async () => {
    setSaloesLoading(true);
    try {
      const res = await api.get('/settings/saloes');
      setSaloes(res.data || []);
    } catch (e) {
      setSaloes([]);
    } finally {
      setSaloesLoading(false);
    }
  };

  const handleDownloadBackup = async () => {
    setBackupStatus('⏳ Gerando backup...');
    try {
      const res = await api.get('/settings/backup/download', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      link.href = url;
      link.setAttribute('download', `hamoa_backup_${timestamp}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setBackupStatus('✅ Backup baixado com sucesso!');
      fetchBackupList();
      setTimeout(() => setBackupStatus(''), 4000);
    } catch (e) {
      setBackupStatus('❌ Erro ao gerar backup.');
    }
  };

  const handleRestoreBackup = async (e) => {
    e.preventDefault();
    if (!restoreFile) return alert('Selecione o arquivo de backup.');
    
    setRestoreLoading(true);
    const formData = new FormData();
    formData.append('backupFile', restoreFile);
    formData.append('password', restorePassword);
    formData.append('confirmationText', restoreText);

    try {
      const res = await api.post('/settings/backup/restore', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(res.data.message);
      setShowRestoreModal(false);
      // Reload page to reflect new DB state
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao restaurar backup.');
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!newCode || !newName) return alert('Código e Nome são obrigatórios.');
    try {
      await api.post('/solicitacoes/plano-contas', {
        code: newCode.trim(),
        name: newName.trim(),
        icon: newIcon.trim() || null,
        color: newColor.trim() || null
      });
      alert('Conta contábil criada com sucesso!');
      setNewCode('');
      setNewName('');
      setNewIcon('');
      setNewColor('');
      fetchPlanoContas();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao criar conta.');
    }
  };

  const handleUpdateAccount = async (e) => {
    e.preventDefault();
    if (!editingAccount) return;
    try {
      await api.put(`/solicitacoes/plano-contas/${editingAccount.code}`, {
        name: editingAccount.name.trim(),
        icon: editingAccount.icon?.trim() || null,
        color: editingAccount.color?.trim() || null,
        isActive: editingAccount.isActive
      });
      alert('Conta contábil atualizada com sucesso!');
      setEditingAccount(null);
      fetchPlanoContas();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao atualizar conta.');
    }
  };

  const handleDeleteAccount = async (code) => {
    if (!window.confirm(`Tem certeza que deseja inativar ou excluir a conta ${code}?`)) return;
    try {
      const res = await api.delete(`/solicitacoes/plano-contas/${code}`);
      alert(res.data.message);
      fetchPlanoContas();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao remover conta.');
    }
  };

  const handleAddSalao = async (e) => {
    e.preventDefault();
    if (!newSalaoName) return alert('Nome do salão é obrigatório.');
    try {
      await api.post('/settings/saloes', { name: newSalaoName.trim(), isActive: true });
      alert('Salão criado com sucesso!');
      setNewSalaoName('');
      fetchSaloes();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao criar salão.');
    }
  };

  const handleUpdateSalao = async (e) => {
    e.preventDefault();
    if (!editingSalao) return;
    try {
      await api.put(`/settings/saloes/${editingSalao.id}`, {
        name: editingSalao.name.trim(),
        isActive: editingSalao.isActive
      });
      alert('Salão atualizado com sucesso!');
      setEditingSalao(null);
      fetchSaloes();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao atualizar salão.');
    }
  };

  const handleDeleteSalao = async (id, name) => {
    if (!window.confirm(`Tem certeza que deseja inativar ou excluir o salão ${name}?`)) return;
    try {
      const res = await api.delete(`/settings/saloes/${id}`);
      alert(res.data.message);
      fetchSaloes();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao remover salão.');
    }
  };

  const filteredLogs = logs.filter(l => {
    if (logFilter) {
      const q = logFilter.toLowerCase();
      const matchText = l.action?.toLowerCase().includes(q) ||
                        l.user?.name?.toLowerCase().includes(q) ||
                        l.details?.toLowerCase().includes(q);
      if (!matchText) return false;
    }
    
    if (logFilterUser && l.user?.name !== logFilterUser) return false;
    
    if (logFilterDateStart || logFilterDateEnd) {
      const d = l.timestamp ? new Date(l.timestamp) : null;
      if (!d) return false;
      const dStr = d.toISOString().split('T')[0];
      if (logFilterDateStart && dStr < logFilterDateStart) return false;
      if (logFilterDateEnd && dStr > logFilterDateEnd) return false;
    }
    
    return true;
  });

  const actionColor = (action) => {
    if (!action) return 'var(--text-muted)';
    if (action.includes('BACKUP')) return '#8b5cf6';
    if (action.includes('APROV')) return '#10b981';
    if (action.includes('RECUS')) return '#ef4444';
    if (action.includes('LOGIN')) return '#3b82f6';
    if (action.includes('DELETE') || action.includes('EXCL')) return '#ef4444';
    return 'var(--text-muted)';
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontFamily: 'Outfit', fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-color)', marginBottom: '4px' }}>
            ⚙️ Configurações do Sistema
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Backup do banco de dados, auditoria de ações e plano de contas
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => onNavigate('dashboard')}>
          ⬅ Voltar
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0' }}>
        {[
          { id: 'backup', label: '💾 Backup', show: true },
          { id: 'plano', label: '📊 Plano de Contas', show: isAdmin },
          { id: 'saloes', label: '🏛️ Salões / Centros de Custo', show: isAdmin },
          { id: 'logs', label: '📋 Logs de Auditoria', show: isAdmin },
          { id: 'smtp', label: '📧 Servidor de E-mail', show: isAdmin },
        ].filter(t => t.show).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.65rem 1.5rem',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: '0.9rem',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid var(--primary-color)' : '3px solid transparent',
              background: 'none',
              color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s',
              marginBottom: '-2px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Backup Tab ── */}
      {activeTab === 'backup' && (
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-title">💾 Backup Completo do Sistema</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              O backup salva uma cópia completa do banco de dados PostgreSQL E todos os arquivos de anexos fisicos (Boletos, Notas Fiscais e Orçamentos).
              Guarde o arquivo em local seguro — pen drive, rede local ou HD externo.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              {user.role === 'TI' ? (
                <button className="btn btn-primary" onClick={handleDownloadBackup} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  ⬇️ Baixar Backup Agora
                </button>
              ) : (
                <div style={{ padding: '0.75rem 1rem', background: '#fef3c7', color: '#d97706', borderRadius: 'var(--radius-md)', border: '1px solid #fde68a', fontSize: '0.85rem' }}>
                  ⚠️ Apenas usuários com perfil <strong>TI</strong> podem baixar backups do banco de dados.
                </div>
              )}
              {backupStatus && (
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{backupStatus}</span>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-title">📁 Backups Salvos Localmente</div>
            {backupsLoading ? (
              <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Carregando lista...</p>
            ) : backups.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', marginTop: '1rem', fontSize: '0.9rem' }}>
                Nenhum backup encontrado. Gere o primeiro backup usando o botão acima.
              </p>
            ) : (
              <div className="table-responsive" style={{ marginTop: '1rem' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Arquivo</th>
                      <th>Tamanho</th>
                      <th>Gerado em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map((b, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{b.name}</td>
                        <td>{formatBytes(b.size)}</td>
                        <td>{formatDateTime(b.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card" style={{ marginTop: '1.5rem', border: '1px solid #ef4444' }}>
            <div className="card-title" style={{ color: '#ef4444' }}>⚠️ Importar Backup Completo (Restauração)</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              <strong>Ação Crítica:</strong> Restaurar um backup substituirá TODOS os dados atuais do sistema pelos dados do arquivo enviado.
            </p>
            {user.role === 'TI' ? (
              <button className="btn btn-danger" onClick={() => setShowRestoreModal(true)}>
                ⬆️ Importar Backup
              </button>
            ) : (
              <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', color: '#b91c1c', borderRadius: 'var(--radius-md)', border: '1px solid #fecaca', fontSize: '0.85rem' }}>
                ⚠️ Apenas usuários com perfil <strong>TI</strong> podem restaurar backups.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Plano de Contas Tab ── */}
      {activeTab === 'plano' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left Form */}
          <div className="card">
            <div className="card-title">
              {editingAccount ? '✏️ Editar Conta Contábil' : '➕ Cadastrar Nova Conta'}
            </div>
            
            {editingAccount ? (
              <form onSubmit={handleUpdateAccount} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <label>Código (Inalterável)</label>
                  <input type="text" disabled value={editingAccount.code} />
                </div>
                <div className="form-group">
                  <label>Nome da Conta</label>
                  <input type="text" required value={editingAccount.name} onChange={e => setEditingAccount({ ...editingAccount, name: e.target.value })} />
                </div>
                {(!editingAccount.code.includes('.') || editingAccount.code.split('.').length === 2) && (
                  <>
                    <div className="form-group">
                      <label>Emoji / Ícone</label>
                      <input type="text" placeholder="Ex: 👥" value={editingAccount.icon || ''} onChange={e => setEditingAccount({ ...editingAccount, icon: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label>Cor (Hexadecimal)</label>
                      <input type="text" placeholder="Ex: #dc2626" value={editingAccount.color || ''} onChange={e => setEditingAccount({ ...editingAccount, color: e.target.value })} />
                    </div>
                  </>
                )}
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <input type="checkbox" id="edit-active" checked={editingAccount.isActive} onChange={e => setEditingAccount({ ...editingAccount, isActive: e.target.checked })} />
                  <label htmlFor="edit-active" style={{ margin: 0, fontWeight: 600 }}>Conta Ativa</label>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Salvar</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditingAccount(null)}>Cancelar</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddAccount} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <label>Código da Conta</label>
                  <input type="text" required placeholder="Ex: 2.16 ou 2.1.5" value={newCode} onChange={e => setNewCode(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Nome da Conta</label>
                  <input type="text" required placeholder="Ex: Marketing ou Material TI" value={newName} onChange={e => setNewName(e.target.value)} />
                </div>
                {(!newCode.includes('.') || newCode.split('.').length === 2) && (
                  <>
                    <div className="form-group">
                      <label>Emoji / Ícone (Apenas Setor/Macro)</label>
                      <input type="text" placeholder="Ex: 📢" value={newIcon} onChange={e => setNewIcon(e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Cor Hexadecimal (Apenas Setor/Macro)</label>
                      <input type="text" placeholder="Ex: #3b82f6" value={newColor} onChange={e => setNewColor(e.target.value)} />
                    </div>
                  </>
                )}
                <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>Cadastrar</button>
              </form>
            )}
          </div>

          {/* Right List */}
          <div className="card">
            <div className="card-title">📊 Plano de Contas Cadastrado</div>
            {planoLoading ? (
              <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Carregando contas...</p>
            ) : (
              <div className="table-responsive" style={{ marginTop: '1rem', maxHeight: '550px', overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '100px' }}>Código</th>
                      <th>Nome / Categoria</th>
                      <th>Cor/Ícone</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Status</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planoContas.map(acc => {
                      const isMacro = !acc.code.includes('.') || acc.code.split('.').length === 2;
                      return (
                        <tr key={acc.code} style={{ opacity: acc.isActive ? 1 : 0.5 }}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{acc.code}</td>
                          <td>
                            <span style={{ fontWeight: isMacro ? 'bold' : 'normal', color: acc.isActive ? 'var(--text-main)' : '#dc2626' }}>
                              {acc.name} {!acc.isActive && ' (Inativo)'}
                            </span>
                          </td>
                          <td>
                            {isMacro ? (
                              <span style={{ 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '6px', 
                                fontSize: '0.8rem', 
                                padding: '2px 8px', 
                                borderRadius: '4px',
                                background: acc.color ? `${acc.color}22` : 'var(--primary-light)', 
                                color: acc.color || 'var(--primary-color)',
                                fontWeight: 700
                              }}>
                                {acc.icon || '🏷️'} {acc.color || 'Padrão'}
                              </span>
                            ) : '—'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge badge-${acc.isActive ? 'aprovada' : 'recusada'}`}>
                              {acc.isActive ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button className="btn btn-secondary" style={{ padding: '4px 8px', marginRight: '4px' }} onClick={() => setEditingAccount(acc)}>✏️</button>
                            <button className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => handleDeleteAccount(acc.code)}>🗑️</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Salões Tab ── */}
      {activeTab === 'saloes' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left Form */}
          <div className="card">
            <div className="card-title">
              {editingSalao ? '✏️ Editar Salão' : '➕ Cadastrar Salão'}
            </div>
            
            {editingSalao ? (
              <form onSubmit={handleUpdateSalao} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <label>Nome do Salão / Centro de Custo</label>
                  <input type="text" required value={editingSalao.name} onChange={e => setEditingSalao({ ...editingSalao, name: e.target.value })} />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <input type="checkbox" id="edit-salao-active" checked={editingSalao.isActive} onChange={e => setEditingSalao({ ...editingSalao, isActive: e.target.checked })} />
                  <label htmlFor="edit-salao-active" style={{ margin: 0, fontWeight: 600 }}>Salão Ativo</label>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Salvar</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditingSalao(null)}>Cancelar</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddSalao} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <label>Nome do Salão</label>
                  <input type="text" required placeholder="Ex: Salão Gourmet, Noronha..." value={newSalaoName} onChange={e => setNewSalaoName(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>Cadastrar</button>
              </form>
            )}
          </div>

          {/* Right List */}
          <div className="card">
            <div className="card-title">🏛️ Salões Cadastrados</div>
            {saloesLoading ? (
              <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Carregando salões...</p>
            ) : (
              <div className="table-responsive" style={{ marginTop: '1rem', maxHeight: '550px', overflowY: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Nome do Salão</th>
                      <th style={{ width: '100px', textAlign: 'center' }}>Status</th>
                      <th style={{ width: '120px', textAlign: 'center' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {saloes.map(s => (
                      <tr key={s.id} style={{ opacity: s.isActive ? 1 : 0.5 }}>
                        <td style={{ fontWeight: 600, color: s.isActive ? 'var(--text-main)' : '#dc2626' }}>
                          {s.name} {!s.isActive && ' (Inativo)'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge badge-${s.isActive ? 'aprovada' : 'recusada'}`}>
                            {s.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button className="btn btn-secondary" style={{ padding: '4px 8px', marginRight: '4px' }} onClick={() => setEditingSalao(s)}>✏️</button>
                          <button className="btn btn-danger" style={{ padding: '4px 8px' }} onClick={() => handleDeleteSalao(s.id, s.name)}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                    {saloes.length === 0 && (
                      <tr><td colSpan="3" style={{ textAlign: 'center', padding: '1rem' }}>Nenhum salão cadastrado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Logs Tab ── */}
      {activeTab === 'logs' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
            <div className="card-title">📋 Log de Auditoria de Usuários</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="date"
                value={logFilterDateStart}
                onChange={e => setLogFilterDateStart(e.target.value)}
                style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              />
              <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>até</span>
              <input
                type="date"
                value={logFilterDateEnd}
                onChange={e => setLogFilterDateEnd(e.target.value)}
                style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              />
              <select
                value={logFilterUser}
                onChange={e => setLogFilterUser(e.target.value)}
                style={{ padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--input-bg)', color: 'var(--text-main)', fontSize: '0.85rem' }}
              >
                <option value="">Todos os Usuários</option>
                {Array.from(new Set(logs.map(l => l.user?.name).filter(Boolean))).sort().map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Buscar ação, detalhes..."
                value={logFilter}
                onChange={e => setLogFilter(e.target.value)}
                style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--input-bg)', color: 'var(--text-main)', width: '200px', fontSize: '0.85rem' }}
              />
            </div>
          </div>
          {logsLoading ? (
            <p style={{ color: 'var(--text-muted)' }}>Carregando logs...</p>
          ) : filteredLogs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nenhum log encontrado para este filtro.</p>
          ) : (
            <div className="table-responsive" style={{ maxHeight: '550px', overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Data / Hora</th>
                    <th>Usuário</th>
                    <th>Perfil</th>
                    <th>Ação</th>
                    <th>Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.user?.name || '—'}</td>
                      <td>
                        <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--primary-light)', color: 'var(--primary-color)', fontWeight: 700 }}>
                          {log.user?.role || '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.78rem', padding: '2px 8px', borderRadius: '12px', border: `1px solid ${actionColor(log.action)}44`, color: actionColor(log.action), fontWeight: 700, background: `${actionColor(log.action)}11` }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{log.details || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── SMTP Tab ── */}
      {activeTab === 'smtp' && (
        <SmtpSettingsPanel />
      )}

      {/* Modal Restore */}
      {showRestoreModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="card" style={{ width: '500px', maxWidth: '90%' }}>
            <h3 style={{ color: '#ef4444', marginBottom: '1rem', fontFamily: 'Outfit, sans-serif' }}>Restaurar Banco de Dados</h3>
            <p style={{ fontSize: '0.85rem', marginBottom: '1.5rem', color: 'var(--text-main)' }}>
              Esta ação é <strong>irreversível</strong>. Todos os dados atuais serão apagados e substituídos pelos dados do backup.
            </p>
            <form onSubmit={handleRestoreBackup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Arquivo de Backup (.zip)</label>
                <input type="file" required accept=".zip" onChange={e => setRestoreFile(e.target.files[0])} />
              </div>
              <div className="form-group">
                <label>Sua Senha</label>
                <input type="password" required placeholder="Confirme sua senha atual" value={restorePassword} onChange={e => setRestorePassword(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Frase de Segurança</label>
                <input type="text" required placeholder="Digite: RESTAURAR-HAMOA" value={restoreText} onChange={e => setRestoreText(e.target.value)} />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-danger" style={{ flex: 1 }} disabled={restoreLoading || restoreText !== 'RESTAURAR-HAMOA'}>
                  {restoreLoading ? 'Restaurando...' : 'Confirmar Restauração'}
                </button>
                <button type="button" className="btn btn-secondary" disabled={restoreLoading} onClick={() => setShowRestoreModal(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
