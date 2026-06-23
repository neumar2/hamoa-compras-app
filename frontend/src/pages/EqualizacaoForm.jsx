import React, { useState, useEffect } from 'react';
import api from '../api';

export default function EqualizacaoForm({ user, solicitacao, onNavigate }) {
  const isReadOnly = (user.role === 'GESTAO' || user.role === 'TI') && !user.canEditEqualization;
  const [vendorCount, setVendorCount] = useState(3);
  const [vendors, setVendors] = useState([
    { name: 'Fornecedor A', discount: 0, condPagto: '30 dias', prazoEntrega: 'Imediato', frete: 0 },
    { name: 'Fornecedor B', discount: 0, condPagto: '30 dias', prazoEntrega: 'Imediato', frete: 0 },
    { name: 'Fornecedor C', discount: 0, condPagto: '30 dias', prazoEntrega: 'Imediato', frete: 0 },
    { name: 'Fornecedor D', discount: 0, condPagto: '30 dias', prazoEntrega: 'Imediato', frete: 0 },
    { name: 'Fornecedor E', discount: 0, condPagto: '30 dias', prazoEntrega: 'Imediato', frete: 0 }
  ]);

  // Load items and initialize prices
  const [items, setItems] = useState([]);
  const [justificativaEscolha, setJustificativaEscolha] = useState('');
  const [loading, setLoading] = useState(false);
  const [anexos, setAnexos] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [version, setVersion] = useState(0);

  // Rejection states
  const [showRejectPanel, setShowRejectPanel] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState('');

  const handleFileChange = (index, file) => {
    setSelectedFiles(prev => ({ ...prev, [index]: file }));
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => {
      const updated = { ...prev };
      delete updated[index];
      return updated;
    });
  };

  useEffect(() => {
    const initializeForm = (sol) => {
      setVersion(sol.version || 0);
      if (sol.anexos) {
        setAnexos(sol.anexos);
      }
      // 1. If we have existing vendors, set them
      if (sol.vendors && sol.vendors.length > 0) {
        setVendorCount(sol.vendors.length);
        const mappedVendors = sol.vendors.map(v => ({
          id: v.id,
          name: v.name,
          discount: v.discount || 0,
          condPagto: v.condPagto || '30 dias',
          prazoEntrega: v.prazoEntrega || 'Imediato',
          frete: v.frete || 0
        }));
        // Pad to 5 items to keep state array safe
        while (mappedVendors.length < 5) {
          mappedVendors.push({ name: `Fornecedor ${String.fromCharCode(65 + mappedVendors.length)}`, discount: 0, condPagto: '30 dias', prazoEntrega: 'Imediato', frete: 0 });
        }
        setVendors(mappedVendors);
      }

      // 2. Map items and load their existing prices
      if (sol.items) {
        const initialItems = sol.items.map(item => {
          const prices = Array(5).fill(0);
          let winnerIdx = -1;

          if (sol.vendors && sol.vendors.length > 0) {
            sol.vendors.forEach((v, vIdx) => {
              const pObj = v.prices ? v.prices.find(p => p.itemId === item.id) : null;
              if (pObj) {
                prices[vIdx] = pObj.price || 0;
                if (pObj.isWinner) {
                  winnerIdx = vIdx;
                }
              }
            });
          }

          return {
            id: item.id,
            unidade: item.unidade,
            quant: item.quant,
            desc: item.desc,
            prices: prices,
            winner: winnerIdx
          };
        });
        setItems(initialItems);
      }
      
      // Load justification if editing/reviewing
      if (sol.justificativa && sol.justificativa.includes("Escolha do fornecedor: ")) {
        const parts = sol.justificativa.split("Escolha do fornecedor: ");
        setJustificativaEscolha(parts[parts.length - 1]);
      }
    };

    if (solicitacao) {
      if (solicitacao.items) {
        initializeForm(solicitacao);
      } else {
        // Fetch full solicitation details since only a slim list item was passed
        setLoading(true);
        api.get(`/solicitacoes/${solicitacao.id}`)
          .then(res => {
            initializeForm(res.data);
          })
          .catch(err => {
            console.error('Erro ao carregar detalhes para equalização:', err);
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }
  }, [solicitacao]);


  const handleVendorMetaChange = (index, field, value) => {
    const updated = vendors.map((v, idx) => {
      if (idx === index) {
        return { 
          ...v, 
          [field]: (field === 'discount' || field === 'frete') ? parseFloat(value) || 0 : value 
        };
      }
      return v;
    });
    setVendors(updated);
  };

  const handlePriceChange = (itemIdx, vendorIdx, value) => {
    const updated = items.map((item, idx) => {
      if (idx === itemIdx) {
        const newPrices = [...item.prices];
        newPrices[vendorIdx] = parseFloat(value) || 0;
        return { ...item, prices: newPrices };
      }
      return item;
    });
    setItems(updated);
  };

  const handleWinnerChange = (itemIdx, value) => {
    const updated = items.map((item, idx) => {
      if (idx === itemIdx) {
        return { ...item, winner: parseInt(value) };
      }
      return item;
    });
    setItems(updated);
  };

  // Perform Calculations
  const getCheapestVendorIdx = (item) => {
    let minPrice = Infinity;
    let minIdx = -1;
    for (let i = 0; i < vendorCount; i++) {
      const p = item.prices[i] || 0;
      if (p > 0 && p < minPrice) {
        minPrice = p;
        minIdx = i;
      }
    }
    return minIdx;
  };

  // Allocate items per vendor based on choices
  const vendorAllocatedSums = Array(5).fill(0);
  const vendorAllocatedItems = Array(5).fill(null).map(() => []);

  items.forEach((item) => {
    const autoCheapestIdx = getCheapestVendorIdx(item);
    const finalWinnerIdx = item.winner !== -1 ? item.winner : autoCheapestIdx;

    if (finalWinnerIdx !== -1) {
      const price = item.prices[finalWinnerIdx] || 0;
      const itemTotal = item.quant * price;
      vendorAllocatedSums[finalWinnerIdx] += itemTotal;
      vendorAllocatedItems[finalWinnerIdx].push({
        desc: item.desc,
        quant: item.quant,
        unidade: item.unidade,
        total: itemTotal
      });
    }
  });

  // Calculate gross column totals
  const vendorGrossTotals = Array(5).fill(0);
  items.forEach(item => {
    for (let i = 0; i < vendorCount; i++) {
      vendorGrossTotals[i] += item.quant * (item.prices[i] || 0);
    }
  });

  // Calculate net totals per vendor (buying EVERYTHING from vendor I)
  const vendorNetTotals = Array(5).fill(0);
  for (let i = 0; i < vendorCount; i++) {
    vendorNetTotals[i] = Math.max(0, vendorGrossTotals[i] - vendors[i].discount + vendors[i].frete);
  }

  // Find cheapest vendor index overall (to show 💰 Mais Econômico badge)
  const cheapestOverallIdx = (() => {
    let minVal = Infinity;
    let minIdx = -1;
    for (let i = 0; i < vendorCount; i++) {
      const total = vendorNetTotals[i];
      if (total > 0 && total < minVal) {
        minVal = total;
        minIdx = i;
      }
    }
    return minIdx;
  })();

  // Approve whole supplier shortcut
  const handleApproveAllForVendor = (vendorIdx) => {
    const updated = items.map(item => ({
      ...item,
      winner: vendorIdx
    }));
    setItems(updated);
  };

  // Rejection handler
  const handleReject = async () => {
    if (!motivoRecusa.trim()) {
      alert('Por favor, informe a justificativa de recusa.');
      return;
    }
    setLoading(true);
    try {
      await api.post(`/solicitacoes/${solicitacao.id}/recusar`, { motivo: motivoRecusa, version });
      alert('Solicitação recusada com sucesso!');
      onNavigate('dashboard');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Erro ao recusar solicitação.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate split purchase net total
  let totalSplitPurchase = 0;
  for (let i = 0; i < vendorCount; i++) {
    if (vendorAllocatedItems[i].length > 0) {
      totalSplitPurchase += Math.max(0, vendorAllocatedSums[i] - vendors[i].discount + vendors[i].frete);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      vendors: vendors.slice(0, vendorCount),
      itemPrices: [],
      justificativaEscolha,
      keptAnexoIds: anexos.map(a => a.id)
    };

    items.forEach(item => {
      const autoCheapestIdx = getCheapestVendorIdx(item);
      for (let i = 0; i < vendorCount; i++) {
        const finalWinnerIdx = item.winner !== -1 ? item.winner : autoCheapestIdx;
        payload.itemPrices.push({
          itemDesc: item.desc,
          vendorName: vendors[i].name,
          price: item.prices[i] || 0,
          isWinner: finalWinnerIdx === i
        });
      }
    });

    try {
      const formData = new FormData();
      formData.append('vendors', JSON.stringify(payload.vendors));
      formData.append('itemPrices', JSON.stringify(payload.itemPrices));
      formData.append('justificativaEscolha', payload.justificativaEscolha);
      formData.append('keptAnexoIds', JSON.stringify(payload.keptAnexoIds));
      formData.append('version', version);
      if (user.role === 'GESTAO' || user.role === 'TI') {
        formData.append('approve', 'true');
      }

      Object.keys(selectedFiles).forEach(key => {
        formData.append(`quote_${key}`, selectedFiles[key]);
      });

      await api.post(`/solicitacoes/${solicitacao.id}/equalizacao`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Equalização salva e enviada para aprovação com sucesso!');
      onNavigate('dashboard');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Erro ao salvar equalização.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2 }).format(val);

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">Mapa de Equalização (Solicitação de {solicitacao?.solicitante?.name})</h2>
        <button className="btn btn-secondary" onClick={() => onNavigate('dashboard')}>Voltar</button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', backgroundColor: 'var(--input-bg)', padding: '1rem', borderRadius: 'var(--radius-lg)' }}>
        <label style={{ fontWeight: 600 }}>Número de Fornecedores a Comparar:</label>
        <select value={vendorCount} onChange={(e) => setVendorCount(parseInt(e.target.value))} style={{ width: 'auto', padding: '6px' }} disabled={isReadOnly}>
          <option value="1">1 Fornecedor (Compras &lt; R$ 100)</option>
          <option value="2">2 Fornecedores</option>
          <option value="3">3 Fornecedores</option>
          <option value="4">4 Fornecedores</option>
          <option value="5">5 Fornecedores</option>
        </select>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th rowSpan="2" style={{ width: '40px', textAlign: 'center' }}>Item</th>
                <th rowSpan="2" style={{ width: '50px', textAlign: 'center' }}>Unid</th>
                <th rowSpan="2" style={{ width: '60px', textAlign: 'right' }}>Quant</th>
                <th rowSpan="2">Descrição</th>
                {Array.from({ length: vendorCount }).map((_, i) => {
                  const existingAnexo = anexos.find(a => a.fornecedorName === vendors[i].name && a.fileType === 'PRINT_ORCAMENTO');
                  return (
                    <th 
                      key={i} 
                      colSpan="2" 
                      style={{ textAlign: 'center', padding: '10px' }}
                      tabIndex={0}
                      onPaste={(e) => {
                        if (!isReadOnly && !existingAnexo && e.clipboardData && e.clipboardData.files.length > 0) {
                          const file = e.clipboardData.files[0];
                          if (file.type.startsWith('image/')) {
                            const newFile = new File([file], `print_fornecedor_${i+1}_${Date.now()}.png`, { type: file.type });
                            handleFileChange(i, newFile);
                          }
                        }
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                        <input 
                          type="text" 
                          value={vendors[i].name} 
                          onChange={(e) => handleVendorMetaChange(i, 'name', e.target.value)}
                          readOnly={isReadOnly}
                          style={{ fontWeight: 700, textAlign: 'center', background: 'var(--input-bg)', color: 'var(--text-main)', padding: '4px', border: '1px solid var(--border-color)', borderRadius: '4px', width: '90%' }}
                        />
                        <input 
                          type="text" 
                          placeholder="Prazo Entrega (Opcional)"
                          value={vendors[i].prazoEntrega || ''} 
                          onChange={(e) => handleVendorMetaChange(i, 'prazoEntrega', e.target.value)}
                          readOnly={isReadOnly}
                          style={{ fontSize: '0.65rem', textAlign: 'center', background: 'var(--input-bg)', color: 'var(--text-main)', padding: '2px', border: '1px solid var(--border-color)', borderRadius: '4px', width: '90%' }}
                        />
                        {cheapestOverallIdx === i && vendorGrossTotals[i] > 0 && (
                          <span className="badge badge-aprovada" style={{ display: 'inline-block', fontSize: '0.65rem', padding: '2px 6px', background: '#10b981', color: 'white', marginTop: '2px', borderRadius: '4px' }}>
                            💰 Mais Econômico
                          </span>
                        )}
                        {(!isReadOnly || user.role === 'GESTAO' || user.role === 'TI') && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{ padding: '2px 8px', fontSize: '0.65rem', marginTop: '2px', borderRadius: '4px' }}
                            onClick={() => handleApproveAllForVendor(i)}
                          >
                            🏆 Escolher Todos
                          </button>
                        )}
                        {existingAnexo ? (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', fontSize: '0.75rem', marginTop: '4px' }}>
                            <a 
                              href={`http://${window.location.hostname}:5000/api/downloads/${existingAnexo.filePath.split('/').pop()}?token=${localStorage.getItem('token')}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              style={{ display: 'block', border: '1px solid var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}
                              title="Visualizar Orçamento"
                            >
                              {existingAnexo.filePath.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                <img src={`http://${window.location.hostname}:5000/api/downloads/${existingAnexo.filePath.split('/').pop()}?token=${localStorage.getItem('token')}`} alt="Preview" style={{ width: '50px', height: '50px', objectFit: 'cover', display: 'block' }} />
                              ) : (
                                <div style={{ width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--input-bg)' }}>📄</div>
                              )}
                            </a>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <a href={`http://${window.location.hostname}:5000/api/downloads/${existingAnexo.filePath.split('/').pop()}?token=${localStorage.getItem('token')}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 600 }}>Ver</a>
                              {!isReadOnly && (
                                <button 
                                  type="button" 
                                  className="btn btn-danger" 
                                  style={{ padding: '2px 4px', fontSize: '0.65rem', border: 'none', background: 'transparent', cursor: 'pointer' }} 
                                  onClick={() => {
                                    if (window.confirm('Excluir este orçamento anexado?')) {
                                      setAnexos(prev => prev.filter(a => a.id !== existingAnexo.id));
                                    }
                                  }}
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          !isReadOnly && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                              <label style={{ fontSize: '0.65rem', cursor: 'pointer', background: 'var(--primary-color)', color: 'white', padding: '3px 6px', borderRadius: '4px', fontWeight: 600 }} title="Você também pode clicar na coluna e apertar Ctrl+V">
                                📤 Anexar Print (ou Ctrl+V)
                                <input 
                                  type="file" 
                                  accept="image/*,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                  style={{ display: 'none' }}
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                      handleFileChange(i, e.target.files[0]);
                                    }
                                  }}
                                />
                              </label>
                              {selectedFiles[i] && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                                  {selectedFiles[i].type.startsWith('image/') ? (
                                    <img src={URL.createObjectURL(selectedFiles[i])} alt="Preview" style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
                                  ) : (
                                    <div style={{ width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--input-bg)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>📄</div>
                                  )}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', maxWidth: '120px' }}>
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={selectedFiles[i].name}>
                                      {selectedFiles[i].name} 
                                    </span>
                                    <button type="button" onClick={() => handleRemoveFile(i)} style={{ border: 'none', background: 'transparent', color: 'red', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.75rem', flexShrink: 0 }} title="Remover anexo">❌</button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </th>
                  );
                })}
                <th rowSpan="2" style={{ width: '120px', textAlign: 'center' }}>Ganhador</th>
              </tr>
              <tr>
                {Array.from({ length: vendorCount }).map((_, i) => (
                  <React.Fragment key={i}>
                    <th style={{ width: '80px', textAlign: 'right', fontSize: '0.7rem' }}>Unit (R$)</th>
                    <th style={{ width: '80px', textAlign: 'right', fontSize: '0.7rem' }}>Total (R$)</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, itemIdx) => {
                const cheapestIdx = getCheapestVendorIdx(item);
                return (
                  <tr key={item.id}>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle' }}>{itemIdx + 1}</td>
                    <td style={{ verticalAlign: 'middle', textAlign: 'center' }}>{item.unidade}</td>
                    <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>{item.quant}</td>
                    <td><textarea rows="1" readOnly value={item.desc} style={{ border: 'none', background: 'transparent', resize: 'none' }} /></td>
                    {Array.from({ length: vendorCount }).map((_, vendorIdx) => {
                      const price = item.prices[vendorIdx] || 0;
                      const total = item.quant * price;
                      const isCheapest = cheapestIdx === vendorIdx && price > 0;
                      return (
                        <React.Fragment key={vendorIdx}>
                          <td className={isCheapest ? 'cheapest-cell' : ''} style={{ verticalAlign: 'middle' }}>
                            <input 
                              type="number" 
                              step="any"
                              placeholder="0,00"
                              value={price || ''} 
                              onChange={(e) => handlePriceChange(itemIdx, vendorIdx, e.target.value)} 
                              readOnly={isReadOnly}
                              style={{ textAlign: 'right', padding: '4px', background: 'transparent' }} 
                            />
                          </td>
                          <td className={isCheapest ? 'cheapest-cell' : ''} style={{ textAlign: 'right', verticalAlign: 'middle', fontWeight: 500 }}>
                            {formatCurrency(total)}
                          </td>
                        </React.Fragment>
                      );
                    })}
                    <td style={{ verticalAlign: 'middle' }}>
                      <select value={item.winner} onChange={(e) => handleWinnerChange(itemIdx, e.target.value)} style={{ fontSize: '0.8rem', padding: '4px' }}>
                        <option value="-1">Auto (Menor)</option>
                        {Array.from({ length: vendorCount }).map((_, i) => (
                          <option key={i} value={i}>{vendors[i].name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}

              {/* Faturamento Footer Rows */}
              <tr>
                <td colSpan="4" style={{ textAlign: 'right', fontWeight: 700 }}>Total Bruto:</td>
                {Array.from({ length: vendorCount }).map((_, i) => (
                  <td key={i} colSpan="2" style={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(vendorGrossTotals[i])}</td>
                ))}
                <td></td>
              </tr>

              <tr>
                <td colSpan="4" style={{ textAlign: 'right', fontWeight: 700 }}>Desconto (R$):</td>
                {Array.from({ length: vendorCount }).map((_, i) => (
                  <td key={i} colSpan="2" style={{ textAlign: 'right' }}>
                    <input 
                      type="number" 
                      step="any"
                      placeholder="0,00"
                      value={vendors[i].discount || ''}
                      onChange={(e) => handleVendorMetaChange(i, 'discount', e.target.value)}
                      readOnly={isReadOnly}
                      style={{ textAlign: 'right', padding: '4px', fontWeight: 700 }}
                    />
                  </td>
                ))}
                <td></td>
              </tr>

              <tr>
                <td colSpan="4" style={{ textAlign: 'right', fontWeight: 700 }}>Frete (R$):</td>
                {Array.from({ length: vendorCount }).map((_, i) => (
                  <td key={i} colSpan="2" style={{ textAlign: 'right' }}>
                    <input 
                      type="number" 
                      step="any"
                      placeholder="0,00"
                      value={vendors[i].frete || ''}
                      onChange={(e) => handleVendorMetaChange(i, 'frete', e.target.value)}
                      readOnly={isReadOnly}
                      style={{ textAlign: 'right', padding: '4px', fontWeight: 700 }}
                    />
                  </td>
                ))}
                <td></td>
              </tr>

              <tr style={{ backgroundColor: 'var(--secondary-color)', color: 'white', fontWeight: 800 }}>
                <td colSpan="4" style={{ textAlign: 'right', color: 'white' }}>Total Líquido Único:</td>
                {Array.from({ length: vendorCount }).map((_, i) => (
                  <td key={i} colSpan="2" style={{ textAlign: 'right', color: 'white' }}>{formatCurrency(vendorNetTotals[i])}</td>
                ))}
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Resumo da Compra Fracionada */}
        <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem', padding: '1.25rem', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontFamily: 'Outfit', fontSize: '1rem', fontWeight: 700, marginBottom: '0.8rem', color: 'var(--primary-color)' }}>
            📋 Divisão dos Pedidos (Compra Fracionada / Mix)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            {Array.from({ length: vendorCount }).map((_, i) => {
              const allocated = vendorAllocatedItems[i];
              const subtotal = vendorAllocatedSums[i];
              const final = Math.max(0, subtotal - vendors[i].discount + vendors[i].frete);

              if (allocated.length === 0) return null;

              return (
                <div key={i} style={{ background: 'var(--container-bg)', padding: '0.8rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '6px' }}>
                    {vendors[i].name}
                  </h4>
                  <ul style={{ listStyle: 'none', paddingLeft: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {allocated.map((item, idx) => (
                      <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span>{item.quant} {item.unidade} - {item.desc.substring(0, 20)}...</span>
                        <strong>R$ {formatCurrency(item.total)}</strong>
                      </li>
                    ))}
                  </ul>
                  <div style={{ marginTop: '8px', borderTop: '1px dashed var(--border-color)', paddingTop: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal:</span> <span>R$ {formatCurrency(subtotal)}</span></div>
                    {vendors[i].discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#b91c1c' }}><span>Desconto:</span> <span>- R$ {formatCurrency(vendors[i].discount)}</span></div>}
                    {vendors[i].frete > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Frete:</span> <span>+ R$ {formatCurrency(vendors[i].frete)}</span></div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ddd', marginTop: '4px', paddingTop: '4px', color: 'var(--primary-color)' }}>
                      <span>Total:</span> <span>R$ {formatCurrency(final)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ backgroundColor: 'var(--primary-light)', padding: '0.8rem 1.2rem', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: 'var(--primary-dark)' }}>
            <span>VALOR TOTAL DA COMPRA FRACIONADA:</span>
            <span>R$ {formatCurrency(totalSplitPurchase)}</span>
          </div>
        </div>

        <div className="form-group">
          <label>Justificativa Técnica e Comercial da Escolha do Vencedor</label>
          <textarea 
            rows="2" 
            required
            value={justificativaEscolha}
            onChange={(e) => setJustificativaEscolha(e.target.value)}
            placeholder="Justifique o motivo de escolha dos fornecedores (ex: compra fracionada por menor preço)..."
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '1rem' }}>
          {showRejectPanel ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--input-bg)', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid #ef4444', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Justificativa de recusa (obrigatório)..."
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                style={{ flex: 1, minWidth: '200px', padding: '8px', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--container-bg)', color: 'var(--text-main)' }}
              />
              <button type="button" className="btn btn-danger" onClick={handleReject}>
                Confirmar Recusa
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowRejectPanel(false); setMotivoRecusa(''); }}>
                Cancelar
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {(user.role === 'GESTAO' || user.role === 'TI') && (
                <button type="button" className="btn btn-danger" style={{ flex: 1, padding: '0.8rem' }} onClick={() => setShowRejectPanel(true)}>
                  ❌ Recusar Solicitação
                </button>
              )}
              <button type="submit" className="btn btn-primary" style={{ flex: 2, padding: '0.8rem' }} disabled={loading}>
                {loading ? 'Salvando...' : ((user.role === 'GESTAO' || user.role === 'TI') ? 'Aprovar e Assinar Solicitação' : 'Salvar Equalização e Enviar para Aprovação')}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
