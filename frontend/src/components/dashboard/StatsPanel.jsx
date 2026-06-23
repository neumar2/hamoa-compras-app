import React from 'react';
import { ComposedChart, Bar, Line, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function StatsPanel({
  stats,
  financeiroData,
  planoContas,
  simulatedValue,
  setSimulatedValue,
  simulatedCategory,
  setSimulatedCategory,
  simulatedMonth,
  setSimulatedMonth,
  simulatedInstallments,
  setSimulatedInstallments,
  isSimulating,
  setIsSimulating,
  formatCurrency,
  expandedCard,
  setExpandedCard,
  renderCategoryDonut,
  renderAreaChart,
  handleCategoryClick,
  goToListWithFilter
}) {
  return (
    <div>
      {/* 🎛️ Simulation Control Panel */}
      <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px dashed var(--border-color)', background: 'var(--input-bg)' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--primary-color)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🎛️ Simulador de Impacto Financeiro (Novos Projetos / CAPEX)
        </h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>
          Projete o impacto de manutenções extraordinárias ou aquisições futuras nos gráficos abaixo sem alterar as solicitações reais.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Valor Estimado (R$)</label>
            <input
              type="text"
              placeholder="Ex: 300.000,00"
              value={simulatedValue}
              onChange={(e) => {
                let val = e.target.value.replace(/\D/g, '');
                if (val) {
                  val = (Number(val) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
                }
                setSimulatedValue(val);
              }}
              style={{ padding: '8px', fontSize: '0.85rem', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Conta (Plano de Contas)</label>
            <select
              value={simulatedCategory}
              onChange={(e) => setSimulatedCategory(e.target.value)}
              style={{ padding: '8px', fontSize: '0.85rem', background: 'var(--container-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }}
            >
              <option value="">-- Selecione a Conta --</option>
              {planoContas.map(c => {
                const dotsCount = (c.code.match(/\./g) || []).length;
                const indent = '\u00A0\u00A0'.repeat(dotsCount);
                return (
                  <option key={c.code} value={`${c.code} - ${c.name}`}>
                    {indent}{c.code} - {c.name}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Mês de Início</label>
            <input
              type="month"
              value={simulatedMonth}
              onChange={(e) => setSimulatedMonth(e.target.value)}
              style={{ padding: '8px', fontSize: '0.85rem', width: '100%', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--container-bg)', color: 'var(--text-main)' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Parcelamento</label>
            <select
              value={simulatedInstallments}
              onChange={(e) => setSimulatedInstallments(Number(e.target.value))}
              style={{ padding: '8px', fontSize: '0.85rem', background: 'var(--container-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }}
            >
              <option value={1}>À Vista</option>
              <option value={2}>2x Sem Juros</option>
              <option value={3}>3x Sem Juros</option>
              <option value={4}>4x Sem Juros</option>
              <option value={5}>5x Sem Juros</option>
              <option value={6}>6x Sem Juros</option>
              <option value={10}>10x Sem Juros</option>
              <option value={12}>12x Sem Juros</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (!simulatedValue || !simulatedCategory || !simulatedMonth) {
                  alert('Por favor, preencha valor, conta e mês inicial para simular.');
                  return;
                }
                setIsSimulating(true);
              }}
              style={{ padding: '9px 15px', fontSize: '0.85rem', flex: 1 }}
            >
              Simular
            </button>
            {isSimulating && (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSimulatedValue('');
                  setSimulatedCategory('');
                  setSimulatedMonth('');
                  setSimulatedInstallments(1);
                  setIsSimulating(false);
                }}
                style={{ padding: '9px 12px', fontSize: '0.85rem' }}
              >
                Limpar
              </button>
            )}
          </div>
        </div>
        {isSimulating && (
          <div style={{ marginTop: '1rem', padding: '0.6rem 1rem', background: 'var(--primary-light)', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>💡</span>
            <span>
              <strong>Simulação Ativa:</strong> {simulatedValue ? `R$ ${simulatedValue}` : 'R$ 0,00'} na conta <strong>{simulatedCategory}</strong> iniciado em <strong>{simulatedMonth ? simulatedMonth.split('-').reverse().join('/') : ''}</strong> parcelado em <strong>{simulatedInstallments}x</strong> de {formatCurrency(parseFloat(simulatedValue.replace(/\./g, '').replace(',', '.')) / simulatedInstallments)}.
            </span>
          </div>
        )}
      </div>

      {/* Summary Cards (Realized vs Forecast) */}
      {financeiroData && financeiroData.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {(() => {
            const reais = financeiroData.filter(d => !d.isPrevisao);
            const receitasReais = reais.reduce((sum, d) => sum + d.receitas, 0);
            const opexReal = reais.reduce((sum, d) => sum + d.despesas_opex, 0);
            const capexReal = reais.reduce((sum, d) => sum + d.despesas_capex, 0);
            const resultadoReal = receitasReais - (opexReal + capexReal);

            return [
              { label: 'RECEITA (REALIZADA)', value: formatCurrency(receitasReais), color: '#10b981', border: '#10b981' },
              { label: 'OPEX (OPERAÇÃO)', value: formatCurrency(opexReal), color: '#f59e0b', border: '#f59e0b' },
              { label: 'CAPEX (INVESTIMENTO)', value: formatCurrency(capexReal), color: '#8b5cf6', border: '#8b5cf6' },
              { label: 'RESULTADO LÍQUIDO', value: formatCurrency(resultadoReal), color: resultadoReal >= 0 ? '#10b981' : '#dc2626', border: resultadoReal >= 0 ? '#10b981' : '#dc2626' },
              { label: 'CONTAS A PAGAR (FLUXO)', value: formatCurrency(stats.previsibilidade.APROVADA + stats.previsibilidade.FATURADA), color: 'var(--primary-color)', border: 'var(--primary-color)' },
              { label: 'A COTAR/APROVAR', value: formatCurrency(stats.previsibilidade.AGUARDANDO_APROVACAO + stats.previsibilidade.EM_COTACAO), color: 'var(--text-muted)', border: 'var(--text-muted)' },
            ].map(({ label, value, color, border }) => (
              <div
                key={label}
                className="card"
                style={{ padding: '1.25rem', marginBottom: 0, borderLeft: `5px solid ${border}`, transition: 'transform 0.2s, box-shadow 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${border}44`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color, marginTop: '4px' }}>{value}</div>
              </div>
            ));
          })()}
        </div>
      )}

      {/* Detailed Stats Row (Urgencies & Projections) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.25rem', marginBottom: 0 }}>
          <div className="card-title">🚨 Métricas de Urgência de Compras</div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '0.75rem' }}>Clique para filtrar a lista por nível de urgência</p>
          <div style={{ display: 'flex', justifyContent: 'space-around', gap: '1rem', marginTop: '0.5rem' }}>
            {[
              { label: 'NORMAL', count: stats.urgency?.Normal || 0, color: 'var(--text-muted)', tipo: 'Normal' },
              { label: 'URGENTE', count: stats.urgency?.Urgente || 0, color: 'var(--accent-color)', tipo: 'Urgente' },
              { label: 'EMERGENCIAL', count: stats.urgency?.Emergencial || 0, color: '#dc2626', tipo: 'Emergencial' },
            ].map(({ label, count, color, tipo }) => (
              <div
                key={tipo}
                onClick={() => goToListWithFilter({ tipo })}
                style={{
                  textAlign: 'center', cursor: 'pointer', padding: '0.75rem 1.25rem',
                  borderRadius: 'var(--radius-lg)',
                  border: `2px solid ${color}`,
                  background: `${color}15`,
                  transition: 'all 0.2s',
                  flex: 1,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = `0 4px 16px ${color}44`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                title={`Ver ${count} compras ${tipo.toLowerCase()}s`}
              >
                <div style={{ fontSize: '2rem', fontWeight: 800, color }}>{count}</div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color, marginTop: '2px' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', marginBottom: 0 }}>
          <div className="card-title">🔮 Previsões Financeiras & Tendências</div>
          <div style={{ marginTop: '0.8rem', fontSize: '0.85rem' }}>
            {(() => {
              const monthsSpent = Object.values(stats.byMonth || {}).map(v => typeof v === 'object' ? (v.despesas || 0) : (v || 0));
              const avgMonthly = monthsSpent.length > 0 ? (monthsSpent.reduce((sum, v) => sum + v, 0) / monthsSpent.length) : 0;
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Gasto Médio Mensal Histórico:</span>
                    <strong style={{ color: 'var(--primary-color)' }}>{formatCurrency(avgMonthly)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Projeção de Despesas (Próx. 3 meses):</span>
                    <strong style={{ color: 'var(--primary-color)' }}>{formatCurrency(avgMonthly * 3)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Pipeline Contas a Pagar (Aprovadas/Faturadas):</span>
                    <strong style={{ color: 'var(--accent-green)' }}>{formatCurrency(stats.previsibilidade.APROVADA + stats.previsibilidade.FATURADA)}</strong>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Monthly Bar (Recharts) - 100% Width */}
      <div className={`card ${expandedCard === 'previsao' ? 'card-fullscreen' : ''}`} style={{ marginBottom: '2rem', width: '100%', padding: expandedCard === 'previsao' ? '2rem' : '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div className="card-title">Previsão Financeira (Receitas vs OPEX vs CAPEX)</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Barras translúcidas indicam meses de simulação (Previsão).</span>
            <button className="btn btn-secondary no-print" style={{ padding: '4px 8px' }} onClick={() => setExpandedCard(expandedCard === 'previsao' ? null : 'previsao')}>
              {expandedCard === 'previsao' ? '↙️ Restaurar' : '↗️ Expandir'}
            </button>
          </div>
        </div>
        <div style={{ width: '100%', height: expandedCard === 'previsao' ? 'calc(100vh - 120px)' : '300px' }}>
          <ResponsiveContainer>
            {(() => {
              let chartData = financeiroData.map(d => ({ ...d, mes: d.mes.split('-').reverse().join('/'), simulacao_impacto: 0 }));
              
              if (isSimulating && simulatedValue && simulatedMonth) {
                const numVal = parseFloat(simulatedValue.replace(/\./g, '').replace(',', '.'));
                const parcela = numVal / simulatedInstallments;
                const [simYear, simMonth] = simulatedMonth.split('-');
                let startMonthIndex = chartData.findIndex(d => d.mes === `${simMonth}/${simYear}`);
                
                if (startMonthIndex !== -1) {
                  for (let i = 0; i < simulatedInstallments; i++) {
                    if (startMonthIndex + i < chartData.length) {
                      chartData[startMonthIndex + i].simulacao_impacto += parcela;
                      chartData[startMonthIndex + i].resultado -= parcela;
                    }
                  }
                }
              }

              return (
                <ComposedChart data={chartData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis 
                    yAxisId="left" 
                    tickFormatter={(val) => `R$ ${(val / 1000)}k`} 
                    tick={{ fontSize: 12, fill: 'var(--text-muted)' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <Tooltip 
                    formatter={(value) => formatCurrency(value)} 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)', background: 'var(--container-bg)', color: 'var(--text-main)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
                  <Bar yAxisId="left" dataKey="receitas" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-rec-${index}`} fill={entry.isPrevisao ? '#10b98188' : '#10b981'} />
                    ))}
                  </Bar>
                  <Bar yAxisId="left" dataKey="despesas_opex" name="OPEX (Operacional)" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-opex-${index}`} fill={entry.isPrevisao ? '#f59e0b88' : '#f59e0b'} />
                    ))}
                  </Bar>
                  <Bar yAxisId="left" dataKey="despesas_capex" name="CAPEX (Investimentos)" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-capex-${index}`} fill={entry.isPrevisao ? '#8b5cf688' : '#8b5cf6'} />
                    ))}
                  </Bar>
                  {isSimulating && (
                    <Bar yAxisId="left" dataKey="simulacao_impacto" name="Impacto Simulado" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  )}
                  <Line yAxisId="left" type="monotone" dataKey="resultado" name="Resultado Líquido" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                </ComposedChart>
              );
            })()}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Evolução Financeira LineChart */}
      {Object.keys(stats.byMonth || {}).length > 0 && (() => {
        const evolutionData = Object.entries(stats.byMonth)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([month, v]) => ({
            mes: month.split('-').reverse().join('/'),
            despesas: typeof v === 'object' ? (v.despesas || 0) : (v || 0),
            receitas: typeof v === 'object' ? (v.receitas || 0) : 0,
            resultado: (typeof v === 'object' ? (v.receitas || 0) : 0) - (typeof v === 'object' ? (v.despesas || 0) : (v || 0))
          }));

        return (
          <div className={`card ${expandedCard === 'evolucao' ? 'card-fullscreen' : ''}`} style={expandedCard === 'evolucao' ? { padding: '2rem' } : { marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div className="card-title">📈 Evolução Financeira — Receitas vs Despesas</div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Histórico completo por mês</span>
                <button className="btn btn-secondary no-print" style={{ padding: '4px 8px' }} onClick={() => setExpandedCard(expandedCard === 'evolucao' ? null : 'evolucao')}>
                  {expandedCard === 'evolucao' ? '↙️ Restaurar' : '↗️ Expandir'}
                </button>
              </div>
            </div>
            <div style={{ width: '100%', height: expandedCard === 'evolucao' ? 'calc(100vh - 120px)' : '280px' }}>
              <ResponsiveContainer>
                <ComposedChart data={evolutionData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <YAxis tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} labelStyle={{ color: 'var(--text-main)' }} contentStyle={{ background: 'var(--container-bg)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="receitas" name="Receitas" fill="#10b981" opacity={0.7} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="despesas" name="Despesas" fill="#f59e0b" opacity={0.7} radius={[3, 3, 0, 0]} />
                  <Line type="monotone" dataKey="resultado" name="Resultado Líquido" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      })()}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        {/* Category Donut */}
        <div className={`card ${expandedCard === 'donut' ? 'card-fullscreen' : ''}`} style={expandedCard === 'donut' ? { padding: '2rem' } : { marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title">Movimentação por Plano de Contas</div>
            <button className="btn btn-secondary no-print" style={{ padding: '4px 8px' }} onClick={() => setExpandedCard(expandedCard === 'donut' ? null : 'donut')}>
              {expandedCard === 'donut' ? '↙️ Restaurar' : '↗️ Expandir'}
            </button>
          </div>
          <div style={{ marginTop: '1.5rem', height: expandedCard === 'donut' ? 'calc(100vh - 100px)' : 'auto' }}>{renderCategoryDonut(expandedCard === 'donut')}</div>
        </div>

        {/* Pizza Chart */}
        <div className={`card ${expandedCard === 'pizza' ? 'card-fullscreen' : ''}`} style={expandedCard === 'pizza' ? { padding: '2rem' } : { marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title">Distribuição de Despesas por Área</div>
            <button className="btn btn-secondary no-print" style={{ padding: '4px 8px' }} onClick={() => setExpandedCard(expandedCard === 'pizza' ? null : 'pizza')}>
              {expandedCard === 'pizza' ? '↙️ Restaurar' : '↗️ Expandir'}
            </button>
          </div>
          <div style={{ marginTop: '1.5rem', height: expandedCard === 'pizza' ? 'calc(100vh - 100px)' : 'auto' }}>{renderAreaChart(expandedCard === 'pizza')}</div>
        </div>
      </div>

      {/* Full List of Expenditures per Account */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="card-title">📋 Demonstrativo de Movimentação Completa por Plano de Contas</div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Lista detalhada de movimentação consolidada por Categoria do Plano de Contas Hamoa (Clique em uma conta para filtrar as solicitações).</p>
        <div className="table-responsive" style={{ maxHeight: '350px', overflowY: 'auto' }}>
          <table>
            <thead>
              <tr style={{ background: 'var(--input-bg)' }}>
                <th>Plano de Contas</th>
                <th style={{ textAlign: 'right' }}>Total (Pago)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats.byCategory || {})
                .sort((a, b) => b[1] - a[1])
                .map(([name, value]) => (
                  <tr key={name} className="interactive-row-hover" style={{ cursor: 'pointer' }} onClick={() => handleCategoryClick(name)}>
                    <td style={{ fontWeight: 600 }}>
                      {name}
                      {name.startsWith('1.') ? (
                        <span style={{ marginLeft: '8px', padding: '2px 6px', background: '#10b981', color: 'white', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>RECEITA</span>
                      ) : (
                        <span style={{ marginLeft: '8px', padding: '2px 6px', background: '#3b82f6', color: 'white', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 'bold' }}>DESPESA</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, color: name.startsWith('1.') ? '#10b981' : 'var(--text-main)' }}>{formatCurrency(value)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
