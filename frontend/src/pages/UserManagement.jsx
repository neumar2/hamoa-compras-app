import React, { useState, useEffect } from 'react';
import api from '../api';

export default function UserManagement({ user, onNavigate }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('EVENTOS');
  const [password, setPassword] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Granular Permissions States
  const [canRequest, setCanRequest] = useState(false);
  const [canEqualize, setCanEqualize] = useState(false);
  const [canApprove, setCanApprove] = useState(false);
  const [canDownloadBoleto, setCanDownloadBoleto] = useState(false);
  const [canDownloadNF, setCanDownloadNF] = useState(false);
  const [canEditEqualization, setCanEditEqualization] = useState(false);
  const [canDeleteRequest, setCanDeleteRequest] = useState(false);
  const [canAccessReceitas, setCanAccessReceitas] = useState(false);
  const [canConfirmReceitas, setCanConfirmReceitas] = useState(false);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [canAccessSettings, setCanAccessSettings] = useState(false);

  // Helper to autofill recommended checkboxes on role switch
  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
    if (selectedRole === 'TI') {
      setCanRequest(true); setCanEqualize(true); setCanApprove(true); setCanDownloadBoleto(true); setCanDownloadNF(true); setCanEditEqualization(true);
      setCanDeleteRequest(true); setCanAccessReceitas(true); setCanConfirmReceitas(true); setCanManageUsers(true); setCanAccessSettings(true);
    } else if (selectedRole === 'GESTAO') {
      setCanRequest(false); setCanEqualize(false); setCanApprove(true); setCanDownloadBoleto(true); setCanDownloadNF(true); setCanEditEqualization(false);
      setCanDeleteRequest(true); setCanAccessReceitas(true); setCanConfirmReceitas(false); setCanManageUsers(true); setCanAccessSettings(false);
    } else if (selectedRole === 'SUPRIMENTOS') {
      setCanRequest(false); setCanEqualize(true); setCanApprove(false); setCanDownloadBoleto(true); setCanDownloadNF(true); setCanEditEqualization(false);
      setCanDeleteRequest(false); setCanAccessReceitas(false); setCanConfirmReceitas(false); setCanManageUsers(false); setCanAccessSettings(false);
    } else if (selectedRole === 'EVENTOS') {
      setCanRequest(true); setCanEqualize(false); setCanApprove(false); setCanDownloadBoleto(false); setCanDownloadNF(false); setCanEditEqualization(false);
      setCanDeleteRequest(false); setCanAccessReceitas(false); setCanConfirmReceitas(false); setCanManageUsers(false); setCanAccessSettings(false);
    } else if (selectedRole === 'FINANCEIRO') {
      setCanRequest(false); setCanEqualize(false); setCanApprove(false); setCanDownloadBoleto(true); setCanDownloadNF(true); setCanEditEqualization(false);
      setCanDeleteRequest(false); setCanAccessReceitas(true); setCanConfirmReceitas(true); setCanManageUsers(false); setCanAccessSettings(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!name || !email || !role) {
      setError('Por favor preencha todos os campos obrigatórios.');
      return;
    }

    try {
      const payload = {
        name,
        email,
        role,
        canRequest,
        canEqualize,
        canApprove,
        canDownloadBoleto,
        canDownloadNF,
        canEditEqualization,
        canDeleteRequest,
        canAccessReceitas,
        canConfirmReceitas,
        canManageUsers,
        canAccessSettings,
        isActive,
        ...(password ? { password } : {})
      };

      if (editingId) {
        // Edit User
        await api.put(`/users/${editingId}`, payload);
        setSuccess('Usuário atualizado com sucesso!');
        setEditingId(null);
      } else {
        // Create User
        if (!password) {
          setError('A senha é obrigatória para novos usuários.');
          return;
        }
        await api.post('/users', payload);
        setSuccess('Usuário cadastrado com sucesso!');
      }

      // Reset fields
      setName('');
      setEmail('');
      setRole('EVENTOS');
      setPassword('');
      setIsActive(true);
      setCanRequest(false);
      setCanEqualize(false);
      setCanApprove(false);
      setCanDownloadBoleto(false);
      setCanDownloadNF(false);
      setCanEditEqualization(false);
      setCanDeleteRequest(false);
      setCanAccessReceitas(false);
      setCanConfirmReceitas(false);
      setCanManageUsers(false);
      setCanAccessSettings(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar usuário.');
    }
  };

  const handleEditClick = (u) => {
    setEditingId(u.id);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setPassword('');
    setIsActive(u.isActive !== undefined ? !!u.isActive : true);
    setCanRequest(!!u.canRequest);
    setCanEqualize(!!u.canEqualize);
    setCanApprove(!!u.canApprove);
    setCanDownloadBoleto(!!u.canDownloadBoleto);
    setCanDownloadNF(!!u.canDownloadNF);
    setCanEditEqualization(!!u.canEditEqualization);
    setCanDeleteRequest(!!u.canDeleteRequest);
    setCanAccessReceitas(!!u.canAccessReceitas);
    setCanConfirmReceitas(!!u.canConfirmReceitas);
    setCanManageUsers(!!u.canManageUsers);
    setCanAccessSettings(!!u.canAccessSettings);
    setError('');
  };

  const handleDeleteClick = async (id) => {
    if (id === user.id) {
      setError('Você não pode excluir a sua própria conta.');
      return;
    }
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
      await api.delete(`/users/${id}`);
      setSuccess('Usuário excluído!');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao excluir usuário.');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setRole('EVENTOS');
    setPassword('');
    setIsActive(true);
    setCanRequest(false);
    setCanEqualize(false);
    setCanApprove(false);
    setCanDownloadBoleto(false);
    setCanDownloadNF(false);
    setCanEditEqualization(false);
    setCanDeleteRequest(false);
    setCanAccessReceitas(false);
    setCanConfirmReceitas(false);
    setCanManageUsers(false);
    setCanAccessSettings(false);
    setError('');
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontFamily: 'Outfit', fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-color)' }}>
          Gestão de Usuários e Acessos
        </h2>
        <button className="btn btn-secondary" onClick={() => onNavigate('dashboard')}>
          ⬅ Voltar ao Painel
        </button>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: '#fef2f2', color: '#b91c1c', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid #fca5a5', fontWeight: 500 }}>
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '1rem', background: '#ecfdf5', color: '#047857', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', border: '1px solid #6ee7b7', fontWeight: 500 }}>
          ✅ {success}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        {/* User List Table */}
        <div className="card" style={{ flex: 1 }}>
          <div className="card-title">Usuários Cadastrados</div>
          {loading ? (
            <p>Carregando usuários...</p>
          ) : (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Setor / Cargo / Status</th>
                    <th style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span className={`badge badge-aberta`} style={{ fontSize: '0.72rem' }}>
                            {u.role}
                          </span>
                          {u.isActive ? (
                            <span style={{ fontSize: '0.7rem', background: '#d1fae5', color: '#065f46', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Ativo</span>
                          ) : (
                            <span style={{ fontSize: '0.7rem', background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Inativo</span>
                          )}
                          {!u.isActive && u.activationCode && (
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }} title={`Código pendente: ${u.activationCode}`}>
                              🔑 Cod: {u.activationCode}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                          {u.canRequest && <span style={{ fontSize: '0.62rem', background: '#ecfdf5', color: '#047857', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }} title="Pode solicitar">SOLICITA</span>}
                          {u.canEqualize && <span style={{ fontSize: '0.62rem', background: '#eff6ff', color: '#1d4ed8', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }} title="Pode equalizar cotação">COTA</span>}
                          {u.canApprove && <span style={{ fontSize: '0.62rem', background: '#fef3c7', color: '#b45309', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }} title="Pode aprovar compra">APROVA</span>}
                          {u.canDownloadBoleto && <span style={{ fontSize: '0.62rem', background: '#f5f3ff', color: '#6d28d9', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }} title="Pode ver boletos">BOLETO</span>}
                          {u.canDownloadNF && <span style={{ fontSize: '0.62rem', background: '#ecfeff', color: '#0e7490', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }} title="Pode ver Notas Fiscais">NF</span>}
                          {u.canEditEqualization && <span style={{ fontSize: '0.62rem', background: '#fdf2f8', color: '#db2777', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }} title="Pode editar cotações no Mapa">EDITA_COTA</span>}
                          {u.canDeleteRequest && <span style={{ fontSize: '0.62rem', background: '#fef2f2', color: '#ef4444', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }} title="Pode deletar solicitações">DELETA</span>}
                          {u.canAccessReceitas && <span style={{ fontSize: '0.62rem', background: '#f0fdf4', color: '#16a34a', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }} title="Pode acessar Receitas">RECEITAS</span>}
                          {u.canConfirmReceitas && <span style={{ fontSize: '0.62rem', background: '#ecfdf5', color: '#059669', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }} title="Pode baixar Receitas">BAIXA_REC</span>}
                          {u.canManageUsers && <span style={{ fontSize: '0.62rem', background: '#e0e7ff', color: '#4f46e5', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }} title="Gerencia Usuários">USUÁRIOS</span>}
                          {u.canAccessSettings && <span style={{ fontSize: '0.62rem', background: '#f3f4f6', color: '#4b5563', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }} title="Acessa Configurações e Backup">CONFIG/BACKUP</span>}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                        <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', marginRight: '0.5rem' }} onClick={() => handleEditClick(u)}>
                          ✏ Editar
                        </button>
                        {u.id !== user.id && (
                          <button className="btn btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => handleDeleteClick(u.id)}>
                            🗑 Excluir
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* User Form */}
        <div className="card">
          <div className="card-title">{editingId ? 'Editar Usuário' : 'Novo Usuário'}</div>
          <form onSubmit={handleSaveUser}>
            <div className="form-group">
              <label>Nome Completo</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="form-group">
              <label>E-mail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="form-group">
              <label>Cargo / Perfil de Acesso</label>
              <select value={role} onChange={(e) => handleRoleChange(e.target.value)} required>
                <option value="EVENTOS">Coordenador Eventos (Solicitante)</option>
                <option value="SUPRIMENTOS">Comprador Suprimentos</option>
                <option value="GESTAO">Diretoria Gestão (Aprovador)</option>
                <option value="FINANCEIRO">Analista Financeiro</option>
                <option value="TI">Administrador TI</option>
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <label style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'block' }}>Configurações de Conta</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer', marginBottom: '8px' }}>
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                Conta Ativa / Habilitada
              </label>
            </div>

            <div className="form-group" style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
              <label style={{ fontWeight: 700, marginBottom: '0.5rem', display: 'block' }}>Permissões de Acesso Customizadas</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={canRequest} onChange={(e) => setCanRequest(e.target.checked)} />
                  Abrir Solicitação (Criar pedidos)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={canEqualize} onChange={(e) => setCanEqualize(e.target.checked)} />
                  Equalizar Compra (Cotar fornecedores)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={canApprove} onChange={(e) => setCanApprove(e.target.checked)} />
                  Aprovar / Assinar Solicitações
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={canDownloadBoleto} onChange={(e) => setCanDownloadBoleto(e.target.checked)} />
                  Ver / Baixar Boletos
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={canDownloadNF} onChange={(e) => setCanDownloadNF(e.target.checked)} />
                  Ver / Baixar Notas Fiscais
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={canEditEqualization} onChange={(e) => setCanEditEqualization(e.target.checked)} />
                  Editar cotações no Mapa (Perfis Gestão/TI)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={canDeleteRequest} onChange={(e) => setCanDeleteRequest(e.target.checked)} />
                  Excluir Solicitações
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={canAccessReceitas} onChange={(e) => setCanAccessReceitas(e.target.checked)} />
                  Acessar Módulo de Receitas
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={canConfirmReceitas} onChange={(e) => setCanConfirmReceitas(e.target.checked)} />
                  Baixar e Confirmar Receitas (Financeiro)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={canManageUsers} onChange={(e) => setCanManageUsers(e.target.checked)} />
                  Gerenciar Usuários e Permissões
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={canAccessSettings} onChange={(e) => setCanAccessSettings(e.target.checked)} />
                  Acessar Configurações Avançadas (Backup e Logs)
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>{editingId ? 'Senha (deixe em branco se não quiser mudar)' : 'Senha de Acesso'}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!editingId} placeholder="Min. 6 caracteres" />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                💾 {editingId ? 'Salvar Alterações' : 'Cadastrar Usuário'}
              </button>
              {editingId && (
                <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
