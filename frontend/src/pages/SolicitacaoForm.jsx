import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';

const AREAS = ["Gestão Administrativa", "Operacional", "Portaria", "Manutenção Predial", "Complexo de Lazer", "Segurança", "Restaurante Kauai", "Parque Aquático"];

export default function SolicitacaoForm({ onNavigate, editingRequest, duplicateRequest }) {
  const [area, setArea] = useState('');
  const [tipo, setTipo] = useState('Normal');
  const [conta, setConta] = useState('');
  const [dataAplicacao, setDataAplicacao] = useState(new Date().toISOString().split('T')[0]);
  const [descResumida, setDescResumida] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [prazo, setPrazo] = useState('');
  const [items, setItems] = useState([{ unidade: 'UND', quant: 1, desc: '' }]);
  const [valorEstimado, setValorEstimado] = useState('');
  const [salaoId, setSalaoId] = useState('');
  const [loading, setLoading] = useState(false);
  const [planoContas, setPlanoContas] = useState([]);
  const [saloes, setSaloes] = useState([]);
  const [selectedMacro, setSelectedMacro] = useState('');
  
  // Attachments State (screenshots/prints)
  const [files, setFiles] = useState([]);
  const [existingAnexos, setExistingAnexos] = useState([]);

  // Calculate MACRO_GRUPOS dynamically from active accounts
  const MACRO_GRUPOS = useMemo(() => {
    return planoContas
      .filter(c => c.isActive && c.icon && c.color)
      .map(c => ({
        code: c.code,
        name: c.name,
        icon: c.icon,
        color: c.color,
        lightBg: `${c.color}11`
      }));
  }, [planoContas]);

  useEffect(() => {
    // Fetch active accounts list
    api.get('/solicitacoes/plano-contas')
      .then(res => {
        setPlanoContas(res.data);
      })
      .catch(err => {
        console.error('Erro ao buscar plano de contas:', err);
      });

    api.get('/settings/saloes')
      .then(res => setSaloes(res.data.filter(s => s.isActive)))
      .catch(err => console.error('Erro ao buscar salões:', err));

    if (editingRequest) {
      api.get(`/solicitacoes/${editingRequest.id}`)
        .then(res => {
          const fullReq = res.data;
          // Sync current version in editingRequest as well
          editingRequest.version = fullReq.version;

          setArea(fullReq.area || '');
          setTipo(fullReq.tipo || 'Normal');
          setConta(fullReq.planoContasCode ? `${fullReq.planoContasCode} - ${fullReq.planoContas?.name || ''}` : (fullReq.conta || ''));
          setDataAplicacao(fullReq.dataAplicacao || '');
          setDescResumida(fullReq.descResumida || '');
          setJustificativa(fullReq.justificativa || '');
          setPrazo(fullReq.prazo || '');
          setValorEstimado(fullReq.valorEstimado || '');
          setSalaoId(fullReq.salaoId || '');
          if (fullReq.items && fullReq.items.length > 0) {
            setItems(fullReq.items.map(i => ({ unidade: i.unidade, quant: i.quant, desc: i.desc })));
          }
          setExistingAnexos(fullReq.anexos || []);

          // Extract macro code to pre-select card when editing
          const contaVal = fullReq.planoContasCode || fullReq.planoContas?.code || fullReq.conta || '';
          if (contaVal.startsWith('1.')) {
            setSelectedMacro('1');
          } else {
            const codeMatch = contaVal.match(/^(2\.\d+)/);
            if (codeMatch) {
              setSelectedMacro(codeMatch[1]);
            }
          }
        })
        .catch(err => console.error('Erro ao carregar detalhes da solicitação:', err));
    } else if (duplicateRequest) {
      setArea(duplicateRequest.area || '');
      setTipo(duplicateRequest.tipo || 'Normal');
      setConta(duplicateRequest.planoContasCode ? `${duplicateRequest.planoContasCode} - ${duplicateRequest.planoContas?.name || ''}` : (duplicateRequest.conta || ''));
      setDataAplicacao(new Date().toISOString().split('T')[0]); // Default to today
      setDescResumida(duplicateRequest.descResumida || '');
      setJustificativa(duplicateRequest.justificativa || '');
      setPrazo(duplicateRequest.prazo || '');
      setValorEstimado(duplicateRequest.valorEstimado || '');
      setSalaoId(duplicateRequest.salaoId || '');
      if (duplicateRequest.items && duplicateRequest.items.length > 0) {
        setItems(duplicateRequest.items.map(i => ({ unidade: i.unidade, quant: i.quant, desc: i.desc })));
      }
      setExistingAnexos([]); // Duplicates don't carry over quotes/documents

      // Extract macro code to pre-select card when duplicating
      const contaVal = duplicateRequest.planoContasCode || duplicateRequest.planoContas?.code || duplicateRequest.conta || '';
      if (contaVal.startsWith('1.')) {
        setSelectedMacro('1');
      } else {
        const codeMatch = contaVal.match(/^(2\.\d+)/);
        if (codeMatch) {
          setSelectedMacro(codeMatch[1]);
        }
      }
    }
  }, [editingRequest, duplicateRequest]);

  const handleAddItem = () => {
    setItems([...items, { unidade: 'UND', quant: 1, desc: '' }]);
  };

  const handleRemoveItem = (index) => {
    const updated = items.filter((_, idx) => idx !== index);
    setItems(updated.length === 0 ? [{ unidade: 'UND', quant: 1, desc: '' }] : updated);
  };

  const handleItemChange = (index, field, value) => {
    const updated = items.map((item, idx) => {
      if (idx === index) {
        return { ...item, [field]: field === 'quant' ? parseFloat(value) || 0 : value };
      }
      return item;
    });
    setItems(updated);
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let requestId = editingRequest?.id;
      const contaCode = conta ? conta.split(' - ')[0] : null;

      if (editingRequest) {
        // Edit existing
        const res = await api.put(`/solicitacoes/${editingRequest.id}`, {
          area,
          tipo,
          planoContasCode: contaCode,
          conta,
          dataAplicacao,
          descResumida,
          justificativa,
          prazo,
          items,
          salaoId: salaoId || null,
          valorEstimado: valorEstimado ? parseFloat(valorEstimado) : null,
          version: editingRequest.version
        });
        const newVersion = res.data.request?.version;
        if (newVersion !== undefined) {
          editingRequest.version = newVersion;
        }
      } else {
        // Create new
        const res = await api.post('/solicitacoes', {
          area,
          tipo,
          planoContasCode: contaCode,
          conta,
          dataAplicacao,
          descResumida,
          justificativa,
          prazo,
          items,
          salaoId: salaoId || null,
          valorEstimado: valorEstimado ? parseFloat(valorEstimado) : null
        });
        requestId = res.data.id;
        localStorage.setItem('lastCreatedRequestId', requestId);
      }

      // Handle file uploads if any files selected
      if (files.length > 0 && requestId) {
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        formData.append('type', 'PRINT_ORCAMENTO');
        if (editingRequest) {
          formData.append('version', editingRequest.version);
        }
        await api.post(`/solicitacoes/${requestId}/anexos`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      alert(editingRequest ? 'Solicitação atualizada!' : 'Solicitação criada com sucesso!');
      onNavigate('dashboard');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || err.response?.data?.error || 'Erro ao processar solicitação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">{editingRequest ? 'Editar Solicitação' : 'Nova Solicitação de Compras'}</h2>
        <button className="btn btn-secondary" onClick={() => onNavigate('dashboard')}>Voltar</button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
          <div className="form-group">
            <label>Área Beneficiada</label>
            <input 
              type="text" 
              required 
              list="areas-list"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Ex: Operacional" 
            />
            <datalist id="areas-list">
              {AREAS.map(a => <option key={a} value={a} />)}
            </datalist>
          </div>
          <div className="form-group">
            <label>Salão / Centro de Custo (Opcional)</label>
            <select value={salaoId} onChange={e => setSalaoId(e.target.value)}>
              <option value="">-- Nenhum --</option>
              {saloes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Tipo de Solicitação</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="Normal">Normal</option>
              <option value="Urgente">Urgente</option>
              <option value="Emergencial">Emergencial</option>
            </select>
          </div>

          <div className="form-group">
            <label>Data de Aplicação</label>
            <input 
              type="date" 
              required 
              value={dataAplicacao}
              onChange={(e) => setDataAplicacao(e.target.value)}
            />
          </div>
        </div>

        {/* Step 1: Macro-Group Section */}
        <div style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.8rem', color: 'var(--text-main)' }}>
            1. Selecione o Setor (Plano de Contas - Macro-grupo)
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))', gap: '10px' }}>
            {MACRO_GRUPOS.map(g => {
              const isActive = selectedMacro === g.code;
              return (
                <div
                  key={g.code}
                  onClick={() => { setSelectedMacro(g.code); setConta(''); }}
                  style={{
                    border: `2px solid ${isActive ? g.color : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '0.8rem 0.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: isActive ? g.lightBg : 'var(--container-bg)',
                    transition: 'all 0.2s ease-in-out',
                    boxShadow: isActive ? `0 0 0 3px ${g.color}22` : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '1.4rem' }}>{g.icon}</span>
                  <strong style={{ fontSize: '0.75rem', color: isActive ? g.color : 'var(--text-main)', textTransform: 'uppercase' }}>
                    {g.name}
                  </strong>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Cód. {g.code}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Specific Account and Due Date Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1.25rem' }}>
          <div className="form-group">
            <label>2. Conta de Débito Específica</label>
            <select
              required
              disabled={!selectedMacro}
              value={conta}
              onChange={(e) => setConta(e.target.value)}
              style={{
                padding: '10px',
                borderRadius: 'var(--radius-md)',
                width: '100%',
                border: selectedMacro 
                  ? `2px solid ${MACRO_GRUPOS.find(g => g.code === selectedMacro)?.color}` 
                  : '1px solid var(--border-color)',
                background: 'var(--input-bg)',
                color: 'var(--text-main)',
                fontWeight: 600,
                outline: 'none',
                transition: 'all 0.2s'
              }}
            >
              <option value="">
                {selectedMacro ? '-- Selecione a subcategoria --' : '-- Selecione o setor no Passo 1 --'}
              </option>
              {planoContas
                .filter(c => (c.isActive || c.code === (editingRequest?.planoContasCode || editingRequest?.planoContas?.code)) && c.code.startsWith(selectedMacro + '.'))
                .map(c => (
                  <option key={c.code} value={`${c.code} - ${c.name}`}>
                    {c.code} - {c.name} {!c.isActive && '⚠️ (Inativo)'}
                  </option>
                ))}
            </select>
          </div>

          <div className="form-group">
            <label>Prazo de Entrega Necessário</label>
            <input 
              type="text" 
              required
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              placeholder="Ex: Imediato, 7 dias úteis" 
            />
          </div>

          <div className="form-group">
            <label>Valor Estimado / Teto (R$)</label>
            <input 
              type="number" 
              step="any"
              value={valorEstimado}
              onChange={(e) => setValorEstimado(e.target.value)}
              placeholder="Ex: 5000.00" 
            />
          </div>
        </div>

        <div className="form-group">
          <label>Descrição Detalhada da Compra</label>
          <textarea 
            required 
            rows="3"
            value={descResumida}
            onChange={(e) => setDescResumida(e.target.value)}
            placeholder="Descreva de forma abrangente o motivo, contexto e os itens desta solicitação..." 
          />
        </div>

        <div style={{ margin: '1.5rem 0' }}>
          <h3 style={{ fontFamily: 'Outfit', fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.8rem' }}>
            📋 Relação de Materiais e Serviços
          </h3>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '50px', textAlign: 'center' }}>Item</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Unid.</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Quant.</th>
                  <th>Descrição Completa</th>
                  <th style={{ width: '60px', textAlign: 'center' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle' }}>{idx + 1}</td>
                    <td>
                      <input 
                        type="text" 
                        value={item.unidade} 
                        onChange={(e) => handleItemChange(idx, 'unidade', e.target.value)} 
                        style={{ textAlign: 'center', padding: '6px' }} 
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        step="any"
                        value={item.quant} 
                        onChange={(e) => handleItemChange(idx, 'quant', e.target.value)} 
                        style={{ textAlign: 'right', padding: '6px' }} 
                      />
                    </td>
                    <td>
                      <textarea 
                        rows="1" 
                        required
                        value={item.desc} 
                        onChange={(e) => handleItemChange(idx, 'desc', e.target.value)} 
                        style={{ padding: '6px', width: '100%', resize: 'none' }}
                        placeholder="Descreva o item..."
                      />
                    </td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <button type="button" className="btn btn-danger" style={{ padding: '6px 10px' }} onClick={() => handleRemoveItem(idx)}>
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn btn-outline" style={{ marginTop: '8px' }} onClick={handleAddItem}>
            + Adicionar Item
          </button>
        </div>

        {/* Upload quote prints */}
        <div className="form-group" style={{ margin: '1.5rem 0' }}>
          <label style={{ color: 'var(--primary-color)' }}>📸 Anexar Prints / Prints de Orçamentos (Opcional)</label>
          <input 
            type="file" 
            multiple 
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            style={{ padding: '8px', border: '1px dashed var(--border-color)', background: 'var(--input-bg)' }}
          />
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Você pode selecionar várias imagens ou PDFs de cotações.</p>

          {existingAnexos.length > 0 && (
            <div style={{ marginTop: '0.8rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.4rem' }}>Anexos Existentes:</div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {existingAnexos.map((anexo, i) => (
                  <a 
                    key={i} 
                    href={`http://${window.location.hostname}:5000/api/downloads/${anexo.filePath.split('/').pop()}?token=${localStorage.getItem('token')}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="badge badge-aberta" 
                    style={{ textDecoration: 'none', padding: '0.5rem 0.8rem' }}
                  >
                    📎 Anexo {i + 1} ({anexo.fileType})
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Justificativa Técnica Quando Emergencial</label>
          <textarea 
            rows="2"
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            placeholder="Insira a justificativa técnica caso a compra seja urgente ou emergencial..." 
          />
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem' }} disabled={loading}>
          {loading ? 'Processando...' : (editingRequest ? 'Salvar Alterações' : 'Enviar Solicitação')}
        </button>
      </form>
    </div>
  );
}
