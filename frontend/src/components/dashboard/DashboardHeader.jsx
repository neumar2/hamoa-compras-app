import React from 'react';

const MONTH_NAMES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

export default function DashboardHeader({
  activeTab,
  setActiveTab,
  filteredSolicitacoes,
  totalGeral,
  solicitacoes,
  user,
  onNavigate,
  handleExportCSV,
  dateMode,
  setDateMode,
  viewYear,
  setViewYear,
  viewMonth,
  setViewMonth,
  showFullYear,
  setShowFullYear,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  goToPrevMonth,
  goToNextMonth,
  goToCurrentMonth,
  globalFilterSalao,
  setGlobalFilterSalao,
  saloes,
  fetchAssemblyData,
  today
}) {
  return (
    <div>
      {/* Tab Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className={`btn ${activeTab === 'list' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('list')}>
            📋 Solicitações ({filteredSolicitacoes.length}{totalGeral > 0 && solicitacoes.length < totalGeral ? ` / ${totalGeral} total` : ''})
          </button>
          {(user.role === 'GESTAO' || user.role === 'TI') && (
            <>
              <button className={`btn ${activeTab === 'stats' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('stats')}>
                📈 Estatísticas & Previsões
              </button>
              <button className={`btn ${activeTab === 'saloes' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setActiveTab('saloes'); fetchAssemblyData(globalFilterSalao); }}>
                🏛️ Salões
              </button>
              <button className={`btn ${activeTab === 'assembly' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setActiveTab('assembly'); fetchAssemblyData(''); }}>
                🤝 Relatório de Assembléia (Prestação de Contas)
              </button>
            </>
          )}
        </div>

        {/* Global Salao Filter */}
        {(user.role === 'GESTAO' || user.role === 'TI') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Filtrar por Salão:</span>
            <select
              value={globalFilterSalao}
              onChange={(e) => setGlobalFilterSalao(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--container-bg)',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="">-- Todos os Salões --</option>
              {saloes.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {activeTab === 'list' && (
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem', padding: 0, background: 'transparent', border: 'none' }}>
          <div>
            <h2 className="card-title" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Painel de Compras</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>Navegue pelos períodos abaixo ou utilize os filtros nas colunas.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={handleExportCSV}>
              📥 Exportar Planilha (CSV)
            </button>
            <button className="btn btn-secondary" onClick={() => window.print()} title="Imprimir Relatório ou Salvar em PDF">
              🖨️ Imprimir / PDF
            </button>
            {user.canRequest || user.role === 'TI' ? (
              <button className="btn btn-primary" onClick={() => onNavigate('solicitacao-form')}>
                + Abrir Solicitação
              </button>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Period Selector and Month Navigator ── */}
      {activeTab === 'list' && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.2rem',
          background: 'var(--input-bg)', borderRadius: 'var(--radius-lg)',
          padding: '0.6rem 1rem', border: '1px solid var(--border-color)', flexWrap: 'wrap'
        }}>
          <select
            value={dateMode}
            onChange={(e) => setDateMode(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--container-bg)', color: 'var(--text-main)', fontSize: '0.9rem', outline: 'none', cursor: 'pointer', fontWeight: 600, marginRight: '10px' }}
          >
            <option value="month">Mês / Ano</option>
            <option value="custom">Período Customizado</option>
          </select>

          {dateMode === 'month' ? (
            <>
              {/* Prev month */}
              <button
                className="btn btn-secondary"
                style={{ padding: '0.3rem 0.7rem', fontSize: '1rem', minWidth: '36px' }}
                onClick={goToPrevMonth}
                title="Mês anterior"
              >‹</button>

              {/* Year selector */}
              <select
                value={viewYear}
                onChange={e => { setViewYear(Number(e.target.value)); setShowFullYear(false); }}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--container-bg)', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.9rem' }}
              >
                {Array.from({ length: 5 }, (_, i) => today.getFullYear() - 4 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              {/* Month buttons */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {MONTH_NAMES.map((name, idx) => {
                  const m = idx + 1;
                  const isActive = !showFullYear && viewMonth === m;
                  return (
                    <button
                      key={m}
                      onClick={() => { setViewMonth(m); setShowFullYear(false); }}
                      style={{
                        padding: '3px 8px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                        fontSize: '0.78rem', fontWeight: isActive ? 700 : 500,
                        background: isActive ? 'var(--primary-color)' : 'var(--border-color)',
                        color: isActive ? '#fff' : 'var(--text-muted)',
                        transition: 'all 0.15s'
                      }}
                    >{name}</button>
                  );
                })}
              </div>

              {/* Next month */}
              <button
                className="btn btn-secondary"
                style={{ padding: '0.3rem 0.7rem', fontSize: '1rem', minWidth: '36px' }}
                onClick={goToNextMonth}
                title="Próximo mês"
              >›</button>

              {/* Full year toggle */}
              <button
                className={`btn ${showFullYear ? 'btn-primary' : 'btn-outline'}`}
                style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', marginLeft: 'auto' }}
                onClick={() => setShowFullYear(v => !v)}
              >📅 {showFullYear ? `Ano ${viewYear} completo` : `Ver ano ${viewYear}`}</button>

              {/* Back to today */}
              {(viewYear !== today.getFullYear() || viewMonth !== today.getMonth() + 1 || showFullYear) && (
                <button
                  className="btn btn-secondary"
                  style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem', marginLeft: '10px' }}
                  onClick={goToCurrentMonth}
                >⟳ Mês atual</button>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, flexWrap: 'wrap' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <input
                  type="date"
                  className="form-control"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ padding: '5px', fontSize: '0.9rem' }}
                />
              </div>
              <span style={{ fontWeight: 'bold' }}>Até</span>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <input
                  type="date"
                  className="form-control"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ padding: '5px', fontSize: '0.9rem' }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
