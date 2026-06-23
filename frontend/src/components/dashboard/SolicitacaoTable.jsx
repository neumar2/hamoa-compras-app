import React, { useState } from 'react';

export default function SolicitacaoTable({
  filteredSolicitacoes,
  solicitacoes,
  totalGeral,
  loading,
  user,
  pinnedId,
  handleClearPin,
  formatDate,
  formatCurrency,
  openDetail,
  handleCategoryClick,
  setFilterArea,
  handleOpenLightbox,
  activeDropdownId,
  setActiveDropdownId,
  onNavigate,
  setUploadModalRequest,
  handleConfirmPayment,
  handleDeleteSolicitacao,
  handleExportExcel,
  
  // Search state & setters
  searchDate,
  setSearchDate,
  searchSolicitante,
  setSearchSolicitante,
  searchStatus,
  setSearchStatus,
  searchValue,
  setSearchValue,
  
  // Unique filter lists
  uniqueSolicitantes,
  uniqueValues,

  // Pagination props
  currentPage,
  setCurrentPage,
  itemsPerPage,
  setItemsPerPage
}) {
  const [sortField, setSortField] = useState('dataAplicacao');
  const [sortDirection, setSortDirection] = useState('desc');

  // Handle Sort
  const handleSort = (field) => {
    const isAsc = sortField === field && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortField(field);
  };

  // Sort logic
  const sortedSolicitacoes = [...filteredSolicitacoes].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'estimatedTotal') {
      valA = a.estimatedTotal || 0;
      valB = b.estimatedTotal || 0;
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pinned item prepended if exists
  const pinnedItem = pinnedId ? solicitacoes.find(s => s.id === pinnedId) : null;

  // Pagination Calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = sortedSolicitacoes.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sortedSolicitacoes.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Exibindo {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, sortedSolicitacoes.length)} de {sortedSolicitacoes.length} solicitações filtradas
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn" onClick={handleExportExcel} style={{ background: '#10b981', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '4px' }} title="Exportar tabela atual para Excel">
            📊 Exportar Excel
          </button>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--container-bg)', color: 'var(--text-main)', fontSize: '0.85rem' }}
          >
            <option value={10}>10 por página</option>
            <option value={25}>25 por página</option>
            <option value={50}>50 por página</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Carregando solicitações...</div>
      ) : (
        <>
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('dataAplicacao')}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span>DATA {sortField === 'dataAplicacao' && (sortDirection === 'asc' ? '▲' : '▼')}</span>
                      <input 
                        type="date"
                        value={searchDate} 
                        onChange={(e) => { setSearchDate(e.target.value); setCurrentPage(1); }} 
                        onClick={(e) => e.stopPropagation()}
                        style={{ padding: '4px', fontSize: '0.75rem', width: '110px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--container-bg)', color: 'var(--text-main)', fontWeight: 'normal' }}
                      />
                    </div>
                  </th>
                  <th>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span>SOLICITANTE</span>
                      <select 
                        value={searchSolicitante} 
                        onChange={(e) => { setSearchSolicitante(e.target.value); setCurrentPage(1); }} 
                        style={{ padding: '4px', fontSize: '0.75rem', width: '120px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--container-bg)', color: 'var(--text-main)' }}
                      >
                        <option value="">Tudo</option>
                        {uniqueSolicitantes.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </select>
                    </div>
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('area')}>ÁREA {sortField === 'area' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
                  <th>DESCRIÇÃO / PLANO DE CONTAS</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('estimatedTotal')}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span>VALOR ESTIMADO {sortField === 'estimatedTotal' && (sortDirection === 'asc' ? '▲' : '▼')}</span>
                      <select 
                        value={searchValue} 
                        onChange={(e) => { setSearchValue(e.target.value); setCurrentPage(1); }} 
                        style={{ padding: '4px', fontSize: '0.75rem', width: '110px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--container-bg)', color: 'var(--text-main)' }}
                      >
                        <option value="">Tudo</option>
                        {uniqueValues.map(v => (
                          <option key={v} value={v}>{v}</option>
                        ))}
                      </select>
                    </div>
                  </th>
                  <th style={{ cursor: 'pointer' }} onClick={() => handleSort('status')}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span>STATUS {sortField === 'status' && (sortDirection === 'asc' ? '▲' : '▼')}</span>
                      <select 
                        value={searchStatus} 
                        onChange={(e) => { setSearchStatus(e.target.value); setCurrentPage(1); }} 
                        style={{ padding: '4px', fontSize: '0.75rem', width: '90px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--container-bg)', color: 'var(--text-main)' }}
                      >
                        <option value="">Todos</option>
                        <option value="ABERTA">ABERTA</option>
                        <option value="EM_COTACAO">EM COTAÇÃO</option>
                        <option value="AGUARDANDO_APROVACAO">PENDENTE</option>
                        <option value="APROVADA">APROVADA</option>
                        <option value="FATURADA">AGUARDANDO PAGAMENTO</option>
                        <option value="PAGA">PAGA</option>
                      </select>
                    </div>
                  </th>
                  <th>ANEXOS</th>
                  <th>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {/* Render Pinned Item at the top if currentPage is 1 */}
                {currentPage === 1 && pinnedItem && (
                  <tr key={pinnedItem.id} className={`${pinnedItem.tipo === 'Emergencial' ? 'pulse-emergencial' : ''} pinned-row`} style={{ border: '2px solid var(--primary-color)', background: 'rgba(37, 99, 235, 0.05)' }}>
                    <td>
                      <span className="badge badge-aprovada" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginRight: '6px', fontSize: '0.65rem', padding: '2px 6px', background: 'var(--primary-color)', color: '#fff' }}>
                        📌 Pinned
                        <button onClick={(e) => handleClearPin(e, pinnedItem.id)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0, marginLeft: '2px', fontWeight: 'bold' }}>✕</button>
                      </span>
                      {formatDate(pinnedItem.dataAplicacao)}
                    </td>
                    <td>{pinnedItem.solicitante?.name}</td>
                    <td>
                      <span style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--primary-color)', fontWeight: 500 }} onClick={() => setFilterArea(pinnedItem.area)}>
                        {pinnedItem.area}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--primary-color)', textDecoration: 'underline' }} onClick={() => openDetail(pinnedItem.id)}>{pinnedItem.descResumida}</div>
                      <div style={{ fontSize: '0.8rem', color: (pinnedItem.planoContas ? !pinnedItem.planoContas.isActive : true) ? '#dc2626' : 'var(--text-muted)', fontWeight: (pinnedItem.planoContas ? !pinnedItem.planoContas.isActive : true) ? 'bold' : 'normal' }}>
                        Conta: <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleCategoryClick(pinnedItem.planoContas ? `${pinnedItem.planoContas.code} - ${pinnedItem.planoContas.name}` : pinnedItem.conta)}>{pinnedItem.planoContas ? `${pinnedItem.planoContas.code} - ${pinnedItem.planoContas.name}` : pinnedItem.conta} {(pinnedItem.planoContas ? !pinnedItem.planoContas.isActive : true) && '⚠️ (Inativo)'}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 'bold' }}>{pinnedItem.estimatedTotal > 0 ? formatCurrency(pinnedItem.estimatedTotal) : 'Sob Cotação'}</div>
                    </td>
                    <td>
                      <span className={`badge badge-${pinnedItem.status.toLowerCase().replace('em_cotacao', 'cotacao').replace('aguardando_aprovacao', 'aguardando')}`}>
                        {pinnedItem.status === 'FATURADA' ? 'AGUARDANDO PAGAMENTO' : pinnedItem.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      {/* Pinned item attachments */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {pinnedItem.anexos && pinnedItem.anexos.map((a) => (
                          <span key={a.id} onClick={(e) => handleOpenLightbox(e, a.filePath, a.fileType)} style={{ fontSize: '0.72rem', color: 'var(--primary-hover)', textDecoration: 'underline', fontWeight: 600, cursor: 'pointer' }}>
                            📎 {a.fileType.replace('PRINT_ORCAMENTO', 'PRINT').replace('CHAVE_PIX', 'PIX')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {/* Dropdown action button */}
                      <button className="btn btn-outline" style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); setActiveDropdownId(activeDropdownId === pinnedItem.id ? null : pinnedItem.id); }}>Ações ▾</button>
                    </td>
                  </tr>
                )}

                {currentItems.map((s) => {
                  const total = s.estimatedTotal || 0;
                  const canEdit = (s.status === 'ABERTA' || s.status === 'EM_COTACAO' || s.status === 'AGUARDANDO_APROVACAO') && (s.solicitanteId === user.id || user.role === 'TI' || user.role === 'GESTAO');
                  const canDelete = s.status !== 'PAGA' && (s.solicitanteId === user.id || user.role === 'TI' || user.role === 'GESTAO');
                  const pctExceeded = s.valorEstimado ? Math.round(((total - s.valorEstimado) / s.valorEstimado) * 100) : 0;
                  
                  // SLA Calculation (Gargalos)
                  const reqDate = new Date(s.createdAt || s.dataAplicacao);
                  const daysPending = Math.floor((new Date() - reqDate) / (1000 * 60 * 60 * 24));
                  const isGargalo = s.status !== 'PAGA' && s.status !== 'FATURADA' && s.status !== 'APROVADA' && daysPending >= 2;

                  return (
                    <tr key={s.id} className={`${s.tipo === 'Emergencial' ? 'pulse-emergencial' : ''}`} style={{ verticalAlign: 'middle' }}>
                      <td>{formatDate(s.dataAplicacao)}</td>
                      <td>{s.solicitante?.name}</td>
                      <td>
                        <span style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--primary-color)', fontWeight: 500 }} onClick={() => setFilterArea(s.area)}>
                          {s.area}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--primary-color)', textDecoration: 'underline' }} onClick={() => openDetail(s.id)}>{s.descResumida}</div>
                        <div style={{ fontSize: '0.8rem', color: (s.planoContas ? !s.planoContas.isActive : true) ? '#dc2626' : 'var(--text-muted)', fontWeight: (s.planoContas ? !s.planoContas.isActive : true) ? 'bold' : 'normal' }}>
                          Conta: <span style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleCategoryClick(s.planoContas ? `${s.planoContas.code} - ${s.planoContas.name}` : s.conta)}>{s.planoContas ? `${s.planoContas.code} - ${s.planoContas.name}` : s.conta} {(s.planoContas ? !s.planoContas.isActive : true) && '⚠️ (Inativo)'}</span>
                          {s.planoContas?.code?.startsWith('1.') || (s.conta && s.conta.startsWith('1.')) ? (
                            <span style={{ marginLeft: '8px', padding: '2px 6px', background: (s.planoContas ? !s.planoContas.isActive : true) ? '#dc2626' : '#10b981', color: 'white', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>RECEITA</span>
                          ) : (
                            <span style={{ marginLeft: '8px', padding: '2px 6px', background: (s.planoContas ? !s.planoContas.isActive : true) ? '#dc2626' : '#3b82f6', color: 'white', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>DESPESA</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 'bold' }}>{total > 0 ? formatCurrency(total) : 'Sob Cotação'}</div>
                        {s.valorEstimado ? (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Teto: {formatCurrency(s.valorEstimado)}
                          </div>
                        ) : null}
                        {total > 0 && s.valorEstimado && pctExceeded > 15 ? (
                          <div className="badge badge-urgente" style={{ display: 'inline-block', marginTop: '4px', fontSize: '0.65rem', padding: '2px 4px', background: '#dc2626', color: 'white' }}>
                            ⚠️ +{pctExceeded}% acima do teto
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                          <span className={`badge badge-${s.status.toLowerCase().replace('em_cotacao', 'cotacao').replace('aguardando_aprovacao', 'aguardando')}`}>
                            {s.status === 'FATURADA' ? 'AGUARDANDO PAGAMENTO' : s.status.replace(/_/g, ' ')}
                          </span>

                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {s.anexos && s.anexos.map((a) => {
                            const isBoleto = a.fileType === 'BOLETO' || a.fileType === 'CHAVE_PIX';
                            const isNF = a.fileType === 'NOTA_FISCAL';
                            const canDownload = 
                              user.role === 'TI' || 
                              (isBoleto && user.canDownloadBoleto) || 
                              (isNF && user.canDownloadNF) ||
                              (a.fileType === 'PRINT_ORCAMENTO');

                            return (
                              <span 
                                key={a.id} 
                                onClick={(e) => {
                                  if (!canDownload) {
                                    alert('Você não tem permissão para baixar ou visualizar este documento.');
                                    return;
                                  }
                                  handleOpenLightbox(e, a.filePath, a.fileType);
                                }}
                                style={{ 
                                  fontSize: '0.72rem', 
                                  color: canDownload ? 'var(--primary-hover)' : 'var(--text-muted)', 
                                  textDecoration: canDownload ? 'underline' : 'none', 
                                  fontWeight: 600,
                                  cursor: canDownload ? 'pointer' : 'not-allowed'
                                }}
                              >
                                📎 {a.fileType.replace('PRINT_ORCAMENTO', 'PRINT').replace('CHAVE_PIX', 'PIX')}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td>
                        {(() => {
                          const hasActions = canEdit || 
                                             (user.canRequest || user.role === 'TI') || 
                                             canDelete || 
                                             ((user.canEqualize || user.role === 'TI') && (s.status === 'ABERTA' || s.status === 'EM_COTACAO')) ||
                                             ((user.canApprove || user.role === 'TI') && s.status === 'AGUARDANDO_APROVACAO') ||
                                             ((user.canEqualize || user.role === 'TI') && s.status === 'APROVADA') ||
                                             ((user.role === 'FINANCEIRO' || user.role === 'TI') && s.status === 'FATURADA');

                          return hasActions ? (
                            <div className="actions-dropdown-container" onClick={(e) => e.stopPropagation()}>
                              <button 
                                className="btn btn-outline" 
                                style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDropdownId(activeDropdownId === s.id ? null : s.id);
                                }}
                              >
                                Ações ▾
                              </button>
                              {activeDropdownId === s.id && (
                                <div className="actions-dropdown-menu">
                                  {canEdit && (
                                    <button className="dropdown-item" onClick={() => { setActiveDropdownId(null); onNavigate('solicitacao-edit', s); }}>
                                      ✏️ Editar
                                    </button>
                                  )}
                                  {(user.canRequest || user.role === 'TI') && (
                                    <button className="dropdown-item" onClick={() => { setActiveDropdownId(null); onNavigate('solicitacao-form', s); }}>
                                      👯 Duplicar
                                    </button>
                                  )}
                                  {(user.canEqualize || user.role === 'TI') && (s.status === 'ABERTA' || s.status === 'EM_COTACAO') && (
                                    <button className="dropdown-item" onClick={() => { setActiveDropdownId(null); onNavigate('equalizacao-form', s); }}>
                                      📊 Cotar
                                    </button>
                                  )}
                                  {(user.canApprove || user.role === 'TI') && s.status === 'AGUARDANDO_APROVACAO' && (
                                    <button className="dropdown-item" onClick={() => { setActiveDropdownId(null); onNavigate('equalizacao-form', s); }}>
                                      🔍 Verificar e Aprovar
                                    </button>
                                  )}
                                  {(user.canEqualize || user.role === 'TI') && s.status === 'APROVADA' && (
                                    <button className="dropdown-item" onClick={() => { setActiveDropdownId(null); setUploadModalRequest(s); }}>
                                      📥 Anexar Boleto + NF
                                    </button>
                                  )}
                                  {(user.role === 'FINANCEIRO' || user.role === 'TI') && s.status === 'FATURADA' && (
                                    <button className="dropdown-item" onClick={() => { setActiveDropdownId(null); handleConfirmPayment(s.id, s.version); }}>
                                      💰 Confirmar Pagamento
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button className="dropdown-item dropdown-item-danger" onClick={() => { setActiveDropdownId(null); handleDeleteSolicitacao(s.id); }}>
                                      🗑️ Excluir
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem ações</span>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', marginTop: '1.5rem', flexWrap: 'wrap' }}>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                onClick={() => paginate(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(num => (
                <button
                  key={num}
                  className={`btn ${currentPage === num ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', minWidth: '32px' }}
                  onClick={() => paginate(num)}
                >
                  {num}
                </button>
              ))}
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                Próximo
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
