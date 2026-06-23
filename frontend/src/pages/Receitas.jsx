import React, { useState, useEffect } from 'react';
import api from '../api';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
};

export default function Receitas({ user, onNavigate }) {
  const [receitas, setReceitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterMes, setFilterMes] = useState('');

  // Form state
  const [editingId, setEditingId] = useState(null);
  const [dataReferencia, setDataReferencia] = useState('');
  const [planoConta, setPlanoConta] = useState('');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [isPrevisao, setIsPrevisao] = useState(false);
  const [salaoId, setSalaoId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [planoContas, setPlanoContas] = useState([]);
  const [saloes, setSaloes] = useState([]);

  const canEdit = user.role === 'TI' || user.role === 'GESTAO' || user.canConfirmReceitas;

  useEffect(() => {
    fetchReceitas();
  }, [filterMes]);

  useEffect(() => {
    api.get('/solicitacoes/plano-contas')
      .then(res => {
        setPlanoContas(res.data || []);
      })
      .catch(err => {
        console.error('Erro ao buscar plano de contas:', err);
      });

    api.get('/settings/saloes')
      .then(res => setSaloes(res.data.filter(s => s.isActive)))
      .catch(err => console.error('Erro ao buscar salões:', err));
  }, []);

  const fetchReceitas = async () => {
    setLoading(true);
    try {
      const params = filterMes ? { mes: filterMes } : {};
      const res = await api.get('/financeiro/receitas', { params });
      setReceitas(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar receitas.');
    } finally {
      setLoading(false);
    }
  };

  const handleValorChange = (e) => {
    let val = e.target.value;
    // Remove non-digit characters
    val = val.replace(/\D/g, '');
    if (val === '') {
      setValor('');
      return;
    }
    // Format as BRL currency
    const floatVal = parseFloat(val) / 100;
    const formatted = floatVal.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    setValor(formatted);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dataReferencia || !planoConta || !valor) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    const numericValor = typeof valor === 'string'
      ? parseFloat(valor.replace(/\./g, '').replace(',', '.'))
      : parseFloat(valor);
    try {
      const payload = { dataReferencia, planoConta, valor: numericValor, descricao, isPrevisao, salaoId: salaoId || null };
      if (editingId) {
        await api.put(`/financeiro/receitas/${editingId}`, payload);
        setSuccess('Receita atualizada com sucesso!');
      } else {
        await api.post('/financeiro/receitas', payload);
        setSuccess('Receita registrada com sucesso!');
      }
      resetForm();
      fetchReceitas();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar receita.');
    }
  };

  const handleConfirm = async (id) => {
    try {
      await api.put(`/financeiro/receitas/${id}`, { status: 'CONFIRMADO' });
      setSuccess('Receita confirmada!');
      fetchReceitas();
    } catch (err) {
      setError('Erro ao confirmar receita.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir esta receita?')) return;
    try {
      await api.delete(`/financeiro/receitas/${id}`);
      setSuccess('Receita excluída!');
      fetchReceitas();
    } catch (err) {
      setError('Erro ao excluir receita.');
    }
  };

  const handleEdit = (r) => {
    setEditingId(r.id);
    setDataReferencia(r.dataReferencia);
    setPlanoConta(r.planoContas ? `${r.planoContas.code} ${r.planoContas.name}` : (r.planoConta || ''));
    const initialValor = parseFloat(r.valor || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    setValor(initialValor);
    setDescricao(r.descricao || '');
    setIsPrevisao(!!r.isPrevisao);
    setSalaoId(r.salaoId || '');
    setShowForm(true);
    setError('');
  };

  const resetForm = () => {
    setEditingId(null);
    setDataReferencia('');
    setPlanoConta('');
    setValor('');
    setDescricao('');
    setIsPrevisao(false);
    setSalaoId('');
    setShowForm(false);
    setError('');
  };

  const totalReceitas = receitas.reduce((sum, r) => sum + parseFloat(r.valor || 0), 0);
  const totalConfirmado = receitas.filter(r => r.status === 'CONFIRMADO').reduce((sum, r) => sum + parseFloat(r.valor || 0), 0);
  const totalPendente = receitas.filter(r => r.status === 'PENDENTE').reduce((sum, r) => sum + parseFloat(r.valor || 0), 0);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontFamily: 'Outfit', fontSize: '1.8rem', fontWeight: 800, color: 'var(--primary-color)', marginBottom: '4px' }}>
            💰 Módulo de Receitas
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Controle de Recebimentos — Taxas, Locações, Multas e Reservas
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
              ＋ Nova Receita
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => onNavigate('dashboard')}>
            ⬅ Voltar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total no Período', value: currencyFormatter.format(totalReceitas), color: '#10b981', bg: '#ecfdf5', icon: '📊' },
          { label: 'Confirmado', value: currencyFormatter.format(totalConfirmado), color: '#059669', bg: '#d1fae5', icon: '✅' },
          { label: 'Pendente Confirmação', value: currencyFormatter.format(totalPendente), color: '#d97706', bg: '#fef3c7', icon: '⏳' },
        ].map(({ label, value, color, bg, icon }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${color}33`, borderRadius: 'var(--radius-lg)', padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{icon}</div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color, textTransform: 'uppercase', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 800, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {error && <div style={{ padding: '1rem', background: '#fef2f2', color: '#b91c1c', borderRadius: 'var(--radius-md)', marginBottom: '1rem', border: '1px solid #fca5a5' }}>⚠️ {error}</div>}
      {success && <div style={{ padding: '1rem', background: '#ecfdf5', color: '#047857', borderRadius: 'var(--radius-md)', marginBottom: '1rem', border: '1px solid #6ee7b7' }} onClick={() => setSuccess('')}>✅ {success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: showForm ? '1fr 380px' : '1fr', gap: '2rem' }}>
        {/* Main Table */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div className="card-title">Receitas Registradas</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Mês:</label>
              <input
                type="month"
                value={filterMes}
                onChange={e => setFilterMes(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--input-bg)', color: 'var(--text-main)' }}
              />
              {filterMes && <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setFilterMes('')}>✕ Limpar</button>}
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Carregando receitas...</div>
          ) : receitas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              Nenhuma receita encontrada para este período.
            </div>
          ) : (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Plano de Conta</th>
                    <th>Descrição</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Registrado por</th>
                    {canEdit && <th style={{ textAlign: 'right' }}>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {receitas.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{formatDate(r.dataReferencia)}</td>
                      <td style={{ fontSize: '0.85rem', color: (r.planoContas ? !r.planoContas.isActive : true) ? '#dc2626' : 'inherit', fontWeight: (r.planoContas ? !r.planoContas.isActive : true) ? 'bold' : 'normal' }}>
                        {r.planoContas ? `${r.planoContas.code} - ${r.planoContas.name}` : r.planoConta}
                        {(r.planoContas ? !r.planoContas.isActive : true) && ' ⚠️ (Inativo)'}
                      </td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{r.descricao || '—'}</td>
                      <td>
                        <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: r.isPrevisao ? '#fef3c7' : '#dbeafe', color: r.isPrevisao ? '#d97706' : '#1d4ed8', fontWeight: 700 }}>
                          {r.isPrevisao ? 'PREVISÃO' : 'REALIZADO'}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#10b981' }}>{currencyFormatter.format(r.valor)}</td>
                      <td>
                        <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: r.status === 'CONFIRMADO' ? '#d1fae5' : '#fef3c7', color: r.status === 'CONFIRMADO' ? '#059669' : '#d97706', fontWeight: 700 }}>
                          {r.status === 'CONFIRMADO' ? '✅ Confirmado' : '⏳ Pendente'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.registradoPor?.name || '—'}</td>
                      {canEdit && (
                        <td style={{ textAlign: 'right', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                            {r.status === 'PENDENTE' && (
                              <button className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem', background: '#10b981', color: 'white', border: 'none' }} onClick={() => handleConfirm(r.id)}>
                                ✅
                              </button>
                            )}
                            <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }} onClick={() => handleEdit(r)}>✏</button>
                            <button className="btn btn-danger" style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }} onClick={() => handleDelete(r.id)}>🗑</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Form Panel */}
        {showForm && (
          <div className="card" style={{ alignSelf: 'flex-start' }}>
            <div className="card-title">{editingId ? '✏ Editar Receita' : '＋ Nova Receita'}</div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Data de Referência *</label>
                <input type="date" value={dataReferencia} onChange={e => setDataReferencia(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Plano de Conta *</label>
                <input 
                  type="text" 
                  value={planoConta} 
                  onChange={e => setPlanoConta(e.target.value)} 
                  placeholder="Ex: 1.1 Taxa Condominial" 
                  required 
                  list="plano-contas-list"
                />
                <datalist id="plano-contas-list">
                  {planoContas
                    .filter(c => c.isActive && c.code.startsWith('1.'))
                    .map(c => (
                      <option key={c.code} value={`${c.code} ${c.name}`} />
                    ))}
                </datalist>
              </div>
              <div className="form-group">
                <label>Valor (R$) *</label>
                <input 
                  type="text" 
                  value={valor} 
                  onChange={handleValorChange} 
                  placeholder="0,00" 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Salão / Centro de Custo (Opcional)</label>
                <select value={salaoId} onChange={e => setSalaoId(e.target.value)}>
                  <option value="">-- Nenhum --</option>
                  {saloes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Descrição / Observação</label>
                <textarea rows={3} value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Detalhes da receita..." />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', textTransform: 'none' }}>
                  <input type="checkbox" checked={isPrevisao} onChange={e => setIsPrevisao(e.target.checked)} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>Marcar como Previsão (orçado, ainda não recebido)</span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  💾 {editingId ? 'Salvar' : 'Registrar'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
