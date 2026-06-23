import React from 'react';
import api from '../../api';

export default function DetailModal({
  selectedSolicitacao,
  setSelectedSolicitacao,
  detailLoading,
  formatDate,
  formatCurrency,
  renderTimeline,
  user,
  handleOpenLightbox,
  rejecting,
  setRejecting,
  motivoRecusa,
  setMotivoRecusa,
  handleRecusar,
  newComment,
  setNewComment,
  handleAddComment,
  fetchDashboardData
}) {
  if (!selectedSolicitacao) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1100,
      padding: '2rem'
    }}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '1000px',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
        animation: 'fadeIn 0.2s ease-out'
      }}>
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1.5rem', animation: 'spin 2s linear infinite' }}>⏳</div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Carregando detalhes...</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Buscando itens, fornecedores e equalizações no servidor.</p>
            <button className="btn btn-secondary" style={{ marginTop: '1.5rem' }} onClick={() => setSelectedSolicitacao(null)}>
              Fechar
            </button>
          </div>
        ) : (
          <>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <span className={`badge badge-${selectedSolicitacao.status.toLowerCase().replace('em_cotacao', 'cotacao').replace('aguardando_aprovacao', 'aguardando')}`} style={{ marginBottom: '0.5rem', display: 'inline-block' }}>
                  {selectedSolicitacao.status}
                </span>
                <h2 className="card-title" style={{ margin: 0 }}>
                  Solicitação #{selectedSolicitacao.id.substring(0, 8).toUpperCase()} - {selectedSolicitacao.descResumida}
                </h2>
              </div>
              <button className="btn btn-secondary" style={{ minWidth: '40px', padding: '0.5rem 0.8rem', fontSize: '1.2rem', fontWeight: 'bold' }} onClick={() => setSelectedSolicitacao(null)}>
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              {/* Left Column: General Info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                  ℹ️ Informações Gerais
                </h3>
                <div style={{ fontSize: '0.85rem' }}>
                  <strong>Solicitante:</strong> {selectedSolicitacao.solicitante?.name} ({selectedSolicitacao.solicitante?.email})
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                  <strong>Setor / Área Beneficiada:</strong> {selectedSolicitacao.area}
                </div>
                <div style={{ fontSize: '0.85rem', color: (selectedSolicitacao.planoContas ? !selectedSolicitacao.planoContas.isActive : true) ? '#dc2626' : 'inherit', fontWeight: (selectedSolicitacao.planoContas ? !selectedSolicitacao.planoContas.isActive : true) ? 'bold' : 'normal' }}>
                  <strong>Conta (Plano de Contas):</strong> {selectedSolicitacao.planoContas ? `${selectedSolicitacao.planoContas.code} - ${selectedSolicitacao.planoContas.name}` : selectedSolicitacao.conta} {(selectedSolicitacao.planoContas ? !selectedSolicitacao.planoContas.isActive : true) && '⚠️ (Inativo)'}
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                  <strong>Data de Aplicação:</strong> {formatDate(selectedSolicitacao.dataAplicacao)}
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                  <strong>Prazo Necessário:</strong> {selectedSolicitacao.prazo}
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                  <strong>Tipo de Solicitação:</strong> <span style={{ fontWeight: 600, color: selectedSolicitacao.tipo === 'Normal' ? 'inherit' : '#b91c1c' }}>{selectedSolicitacao.tipo}</span>
                </div>
                {selectedSolicitacao.justificativa && (
                  <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', padding: '0.75rem', background: 'var(--input-bg)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--primary-color)' }}>
                    <strong>Justificativa Técnica:</strong>
                    <div style={{ whiteSpace: 'pre-wrap', marginTop: '4px', fontStyle: 'italic' }}>{selectedSolicitacao.justificativa}</div>
                  </div>
                )}

                {(selectedSolicitacao.status === 'APROVADA' || selectedSolicitacao.status === 'FATURADA' || selectedSolicitacao.status === 'PAGA') && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    border: '2px dashed #10b981',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute',
                      right: '-10px',
                      bottom: '-10px',
                      fontSize: '4.5rem',
                      opacity: 0.08,
                      transform: 'rotate(-15deg)',
                      pointerEvents: 'none',
                      color: '#10b981'
                    }}>
                      APPROVED
                    </div>
                    <div style={{
                      fontSize: '1.8rem',
                      color: '#10b981',
                      border: '2px solid #10b981',
                      borderRadius: '50%',
                      width: '45px',
                      height: '45px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      flexShrink: 0
                    }}>
                      ✓
                    </div>
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Assinatura Digital Resort Hamoa
                      </div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
                        Documento Assinado por: {selectedSolicitacao.aprovador?.name} ({selectedSolicitacao.aprovador?.role})
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                        HASH: SHA-256 / {selectedSolicitacao.id.substring(0, 16).toUpperCase()}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        Data: {selectedSolicitacao.approvedAt ? new Date(selectedSolicitacao.approvedAt).toLocaleString('pt-BR') : 'N/A'}
                      </div>
                    </div>
                  </div>
                )}

                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginTop: '1.5rem' }}>
                  🕒 Linha do Tempo de Auditoria
                </h3>
                {renderTimeline(selectedSolicitacao.status)}
              </div>

              {/* Right Column: Items List */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginBottom: '0.8rem' }}>
                  📦 Itens da Solicitação
                </h3>
                <div className="table-responsive" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  <table style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '50px', textAlign: 'right' }}>Qtd</th>
                        <th style={{ width: '60px', textAlign: 'center' }}>Unid</th>
                        <th>Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSolicitacao.items && selectedSolicitacao.items.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{item.quant}</td>
                          <td style={{ textAlign: 'center' }}>{item.unidade}</td>
                          <td>{item.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selectedSolicitacao.anexos && selectedSolicitacao.anexos.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>📎 Anexos (Orçamentos / Boletos / Notas Fiscais)</h4>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {selectedSolicitacao.anexos.map((a) => {
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
                            className="badge badge-aberta"
                            style={{ 
                              textDecoration: 'none', 
                              padding: '0.4rem 0.6rem', 
                              fontSize: '0.75rem', 
                              fontWeight: 600,
                              background: canDownload ? undefined : 'var(--border-color)',
                              color: canDownload ? undefined : 'var(--text-muted)',
                              cursor: canDownload ? 'pointer' : 'not-allowed'
                            }}
                          >
                            📎 {a.fileType.replace('PRINT_ORCAMENTO', 'PRINT').replace('CHAVE_PIX', 'PIX')}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Equalization Section */}
            {selectedSolicitacao.vendors && selectedSolicitacao.vendors.length > 0 && (
              <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '1rem' }}>
                  📊 Mapa de Equalização de Cotações
                </h3>
                <div className="table-responsive">
                  <table style={{ fontSize: '0.8rem' }}>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Descrição</th>
                        <th style={{ textAlign: 'right' }}>Quant</th>
                        {selectedSolicitacao.vendors.map((v) => (
                          <th key={v.id} colSpan="2" style={{ textAlign: 'center', background: 'var(--input-bg)' }}>
                            {v.name}
                          </th>
                        ))}
                      </tr>
                      <tr>
                        <th colSpan="3"></th>
                        {selectedSolicitacao.vendors.map((v) => (
                          <React.Fragment key={`sub-${v.id}`}>
                            <th style={{ textAlign: 'right', fontSize: '0.7rem' }}>Unit (R$)</th>
                            <th style={{ textAlign: 'right', fontSize: '0.7rem' }}>Total (R$)</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSolicitacao.items && selectedSolicitacao.items.map((item, idx) => (
                        <tr key={item.id}>
                          <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{idx + 1}</td>
                          <td>{item.desc}</td>
                          <td style={{ textAlign: 'right' }}>{item.quant}</td>
                          {selectedSolicitacao.vendors.map((v) => {
                            const pObj = v.prices ? v.prices.find(p => p.itemId === item.id) : null;
                            const price = pObj ? pObj.price : 0;
                            const total = item.quant * price;
                            const isWinner = pObj ? pObj.isWinner : false;
                            return (
                              <React.Fragment key={`${v.id}-${item.id}`}>
                                <td style={{ textAlign: 'right', backgroundColor: isWinner ? 'rgba(34, 197, 94, 0.15)' : 'transparent', fontWeight: isWinner ? 'bold' : 'normal' }}>
                                  {price > 0 ? formatCurrency(price).replace('R$', '') : '-'}
                                </td>
                                <td style={{ textAlign: 'right', backgroundColor: isWinner ? 'rgba(34, 197, 94, 0.15)' : 'transparent', fontWeight: isWinner ? 'bold' : 'normal' }}>
                                  {price > 0 ? formatCurrency(total).replace('R$', '') : '-'}
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      ))}

                      {/* Totals Row */}
                      <tr style={{ fontWeight: 'bold', background: 'var(--input-bg)' }}>
                        <td colSpan="3" style={{ textAlign: 'right' }}>Total Bruto:</td>
                        {selectedSolicitacao.vendors.map((v) => {
                          let gross = 0;
                          selectedSolicitacao.items.forEach(item => {
                            const pObj = v.prices ? v.prices.find(p => p.itemId === item.id) : null;
                            gross += item.quant * (pObj ? pObj.price : 0);
                          });
                          return (
                            <td key={`gross-${v.id}`} colSpan="2" style={{ textAlign: 'right' }}>
                              {formatCurrency(gross)}
                            </td>
                          );
                        })}
                      </tr>

                      <tr style={{ fontStyle: 'italic' }}>
                        <td colSpan="3" style={{ textAlign: 'right' }}>Desconto (R$):</td>
                        {selectedSolicitacao.vendors.map((v) => (
                          <td key={`disc-${v.id}`} colSpan="2" style={{ textAlign: 'right', color: '#b91c1c' }}>
                            {v.discount > 0 ? `- ${formatCurrency(v.discount)}` : '-'}
                          </td>
                        ))}
                      </tr>

                      <tr style={{ fontStyle: 'italic' }}>
                        <td colSpan="3" style={{ textAlign: 'right' }}>Frete (R$):</td>
                        {selectedSolicitacao.vendors.map((v) => (
                          <td key={`frete-${v.id}`} colSpan="2" style={{ textAlign: 'right' }}>
                            {v.frete > 0 ? `+ ${formatCurrency(v.frete)}` : '-'}
                          </td>
                        ))}
                      </tr>

                      <tr style={{ fontWeight: '800', backgroundColor: 'var(--primary-light)' }}>
                        <td colSpan="3" style={{ textAlign: 'right' }}>Total Líquido Único:</td>
                        {selectedSolicitacao.vendors.map((v) => {
                          let gross = 0;
                          selectedSolicitacao.items.forEach(item => {
                            const pObj = v.prices ? v.prices.find(p => p.itemId === item.id) : null;
                            gross += item.quant * (pObj ? pObj.price : 0);
                          });
                          const net = Math.max(0, gross - (v.discount || 0)) + (v.frete || 0);
                          return (
                            <td key={`net-${v.id}`} colSpan="2" style={{ textAlign: 'right', color: 'var(--primary-color)' }}>
                              {formatCurrency(net)}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Resumo do Pedido Sugerido (Split Purchases) */}
                {(() => {
                  const localAllocatedSums = Array(selectedSolicitacao.vendors.length).fill(0);
                  const localAllocatedItems = Array(selectedSolicitacao.vendors.length).fill(null).map(() => []);

                  selectedSolicitacao.items.forEach((item) => {
                    let winnerVendorIdx = -1;
                    let winnerPrice = 0;
                    selectedSolicitacao.vendors.forEach((v, vIdx) => {
                      const pObj = v.prices ? v.prices.find(p => p.itemId === item.id) : null;
                      if (pObj && pObj.isWinner) {
                        winnerVendorIdx = vIdx;
                        winnerPrice = pObj.price;
                      }
                    });

                    if (winnerVendorIdx !== -1) {
                      const itemTotal = item.quant * winnerPrice;
                      localAllocatedSums[winnerVendorIdx] += itemTotal;
                      localAllocatedItems[winnerVendorIdx].push({
                        desc: item.desc,
                        quant: item.quant,
                        unidade: item.unidade,
                        total: itemTotal
                      });
                    }
                  });

                  let totalSplit = 0;
                  const hasAllocations = selectedSolicitacao.vendors.some((_, i) => localAllocatedItems[i].length > 0);

                  if (!hasAllocations) return null;

                  return (
                    <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--input-bg)', border: '1px solid var(--border-color)' }}>
                      <h4 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.6rem', color: 'var(--primary-color)' }}>
                        📋 Resumo do Pedido Sugerido (Mix / Menor Preço por Item)
                      </h4>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                        {selectedSolicitacao.vendors.map((v, i) => {
                          const itemsAllocated = localAllocatedItems[i];
                          if (itemsAllocated.length === 0) return null;

                          const subtotal = localAllocatedSums[i];
                          const final = Math.max(0, subtotal - (v.discount || 0)) + (v.frete || 0);
                          totalSplit += final;

                          return (
                            <div key={v.id} style={{ flex: 1, minWidth: '220px', background: 'var(--container-bg)', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                              <strong style={{ fontSize: '0.8rem', color: 'var(--primary-color)' }}>{v.name}</strong>
                              <ul style={{ listStyle: 'none', paddingLeft: 0, fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                {itemsAllocated.map((it, idx) => (
                                  <li key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{it.quant} {it.unidade} - {it.desc.substring(0, 15)}...</span>
                                    <span>{formatCurrency(it.total)}</span>
                                  </li>
                                ))}
                              </ul>
                              <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '6px', paddingTop: '4px', fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                <span>Subtotal:</span>
                                <span>{formatCurrency(final)}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.85rem', color: 'var(--primary-color)' }}>
                        <span>TOTAL DA COMPRA FRACIONADA:</span>
                        <span>{formatCurrency(totalSplit)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Comments Feed */}
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '0.8rem' }}>
                💬 Histórico & Comentários
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', marginBottom: '1rem', paddingRight: '5px' }}>
                {selectedSolicitacao.comentarios && selectedSolicitacao.comentarios.length > 0 ? (
                  selectedSolicitacao.comentarios.map((c) => (
                    <div key={c.id} style={{ background: 'var(--input-bg)', padding: '0.6rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <strong style={{ color: 'var(--primary-color)' }}>{c.user?.name} ({c.user?.role})</strong>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleString('pt-BR')}</span>
                      </div>
                      <div style={{ color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>{c.content}</div>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum comentário registrado.</p>
                )}
              </div>

              <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Escreva um comentário ou anotação..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  style={{ flex: 1, padding: '8px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--input-bg)', color: 'var(--text-main)' }}
                />
                <button type="submit" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  Enviar
                </button>
              </form>
            </div>

            {/* Modal Footer (Actions) */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
              {rejecting ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    placeholder="Justificativa de recusa obrigatória..."
                    value={motivoRecusa}
                    onChange={(e) => setMotivoRecusa(e.target.value)}
                    style={{ flex: 1, minWidth: '200px', padding: '8px', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #ef4444', background: 'var(--input-bg)', color: 'var(--text-main)' }}
                  />
                  <button className="btn btn-danger" onClick={handleRecusar}>
                    Confirmar Recusa
                  </button>
                  <button className="btn btn-secondary" onClick={() => { setRejecting(false); setMotivoRecusa(''); }}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%', flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary" onClick={() => { setSelectedSolicitacao(null); setRejecting(false); setMotivoRecusa(''); }}>
                    Fechar
                  </button>

                  {(user.role === 'GESTAO' || user.role === 'TI') && selectedSolicitacao.status === 'AGUARDANDO_APROVACAO' && (
                    <>
                      <button className="btn btn-danger" onClick={() => setRejecting(true)}>
                        ❌ Recusar Solicitação
                      </button>
                      <button className="btn btn-primary" onClick={async () => {
                        if (window.confirm('Tem certeza que deseja aprovar e assinar digitalmente esta solicitação?')) {
                          try {
                            await api.post(`/solicitacoes/${selectedSolicitacao.id}/aprovar`, { version: selectedSolicitacao.version });
                            alert('Solicitação aprovada e assinada digitalmente com sucesso!');
                            setSelectedSolicitacao(null);
                            fetchDashboardData();
                          } catch (err) {
                            alert(err.response?.data?.error || 'Erro ao aprovar solicitação.');
                          }
                        }
                      }}>
                        ✍️ Aprovar e Assinar
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
