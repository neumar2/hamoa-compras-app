import React from 'react';

export default function AssemblyReportModal({
  assemblyDetailModal,
  setAssemblyDetailModal,
  assemblyDetailData,
  formatCurrency,
  formatDate,
  openDetail,
  getRequestTotal
}) {
  if (!assemblyDetailModal.open) return null;

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
      zIndex: 1200,
      padding: '2rem'
    }} onClick={() => setAssemblyDetailModal({ open: false, planoCode: null, type: null })}>
      <div className="card" style={{
        width: '100%',
        maxWidth: '800px',
        maxHeight: '80vh',
        overflowY: 'auto',
        position: 'relative',
        boxShadow: 'var(--shadow-xl)',
        animation: 'fadeIn 0.2s ease-out'
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem', marginBottom: '1.2rem' }}>
          <h3 className="card-title" style={{ margin: 0, fontSize: '1.1rem' }}>
            Detalhamento: {assemblyDetailModal.planoCode}
          </h3>
          <button className="btn btn-secondary" onClick={() => setAssemblyDetailModal({ open: false, planoCode: null, type: null })}>✕ Fechar</button>
        </div>

        <div className="table-responsive" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
          <table>
            <thead>
              <tr style={{ background: 'var(--input-bg)' }}>
                <th>Data</th>
                <th>{assemblyDetailModal.type === 'RECEITA' ? 'Referência/Locatário' : 'Solicitante'}</th>
                <th>Descrição</th>
                <th>Valor</th>
                {assemblyDetailModal.type === 'DESPESA' && <th>Status</th>}
              </tr>
            </thead>
            <tbody>
              {assemblyDetailData.length === 0 ? (
                <tr>
                  <td colSpan={assemblyDetailModal.type === 'DESPESA' ? 5 : 4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                assemblyDetailData.map((item) => (
                  <tr key={item.id} className="interactive-row-hover" style={{ cursor: 'pointer' }} onClick={() => assemblyDetailModal.type === 'DESPESA' && openDetail(item.id)}>
                    <td style={{ fontWeight: 600 }}>{formatDate(item.dataAplicacao)}</td>
                    <td>{assemblyDetailModal.type === 'RECEITA' ? (item.registradoPor?.name || '—') : item.solicitante?.name}</td>
                    <td>{assemblyDetailModal.type === 'RECEITA' ? item.descricao : item.descResumida}</td>
                    <td style={{ fontWeight: 'bold', color: assemblyDetailModal.type === 'RECEITA' ? '#10b981' : '#dc2626' }}>
                      {formatCurrency(assemblyDetailModal.type === 'RECEITA' ? item.valor : (item.estimatedTotal || getRequestTotal(item)))}
                    </td>
                    {assemblyDetailModal.type === 'DESPESA' && (
                      <td>
                        <span className={`badge badge-${item.status.toLowerCase().replace('em_cotacao', 'cotacao').replace('aguardando_aprovacao', 'aguardando')}`}>
                          {item.status === 'FATURADA' ? 'AGUARDANDO PAGAMENTO' : item.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
