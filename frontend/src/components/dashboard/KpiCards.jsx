import React from 'react';

export default function KpiCards({
  stats,
  formatCurrency,
  filterStatusKpi,
  filterTipo,
  goToListWithFilter
}) {
  return (
    <div>
      {/* ── KPI Summary Row (always visible, all clickable) ── */}
      <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem', marginBottom: '1.2rem' }}>
        {[
          { label: 'RECEITAS', value: formatCurrency(stats.totalRevenues || 0), color: '#10b981', status: 'RECEITA', icon: '💰' },
          { label: 'PAGO (DESP.)', value: formatCurrency(stats.totalSpent), color: 'var(--accent-green)', status: 'PAGA', icon: '✅' },
          { label: 'SAVINGS ACUMULADO', value: formatCurrency(stats.savings || 0), color: '#ca8a04', status: 'SAVINGS', icon: '💎' },
          { label: 'APROVADA', value: formatCurrency(stats.previsibilidade.APROVADA), color: '#10b981', status: 'APROVADA', icon: '🟢' },
          { label: 'AGUARDANDO PAGAMENTO', value: formatCurrency(stats.previsibilidade.FATURADA), color: '#8b5cf6', status: 'FATURADA', icon: '🟣' },
          { label: 'PENDENTE APROV.', value: formatCurrency(stats.previsibilidade.AGUARDANDO_APROVACAO), color: 'var(--accent-yellow)', status: 'AGUARDANDO_APROVACAO', icon: '⏳' },
          { label: 'EM COTAÇÃO', value: formatCurrency(stats.previsibilidade.EM_COTACAO), color: 'var(--text-muted)', status: 'EM_COTACAO', icon: '📊' },
          { label: 'ABERTA', value: formatCurrency(stats.previsibilidade.ABERTA), color: 'var(--accent-color)', status: 'ABERTA', icon: '📥' },
        ].map(({ label, value, color, status, icon }) => (
          <div
            key={label}
            onClick={() => status === 'SAVINGS' ? goToListWithFilter({ statusKpi: 'PAGA' }) : goToListWithFilter({ statusKpi: filterStatusKpi === status ? '' : status })}
            style={{
              background: 'var(--container-bg)',
              border: `2px solid ${filterStatusKpi === status ? color : 'var(--border-color)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '0.75rem 1rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: filterStatusKpi === status ? `0 0 0 3px ${color}33` : 'var(--shadow-sm)',
              transform: filterStatusKpi === status ? 'translateY(-2px)' : 'none',
            }}
            title={status === 'SAVINGS' ? `Ver compras com Savings (Pagas)` : `Filtrar por ${label}`}
          >
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase' }}>{icon} {label}</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color, lineHeight: 1.2 }}>{value}</div>
          </div>
        ))}
      </div>

      {/* ── Urgency KPI Row ── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', alignSelf: 'center', marginRight: '4px' }}>URGÊNCIA:</span>
        {[
          { label: 'NORMAL', count: stats.urgency?.Normal || 0, color: 'var(--text-muted)', tipo: 'Normal' },
          { label: 'URGENTE', count: stats.urgency?.Urgente || 0, color: 'var(--accent-color)', tipo: 'Urgente' },
          { label: 'EMERGENCIAL', count: stats.urgency?.Emergencial || 0, color: '#dc2626', tipo: 'Emergencial' },
        ].map(({ label, count, color, tipo }) => (
          <div
            key={tipo}
            onClick={() => goToListWithFilter({ tipo: filterTipo === tipo ? '' : tipo })}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '0.45rem 1rem',
              borderRadius: '30px',
              border: `2px solid ${filterTipo === tipo ? color : 'var(--border-color)'}`,
              background: filterTipo === tipo ? `${color}22` : 'var(--container-bg)',
              cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: filterTipo === tipo ? `0 0 0 3px ${color}33` : 'none',
            }}
            title={`Filtrar por ${tipo}`}
          >
            <span style={{ fontWeight: 800, fontSize: '1.1rem', color }}>{count}</span>
            <span style={{ fontWeight: 700, fontSize: '0.75rem', color, textTransform: 'uppercase' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
