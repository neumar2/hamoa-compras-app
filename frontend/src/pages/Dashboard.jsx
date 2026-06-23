import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell, ComposedChart, Line, PieChart, Pie } from 'recharts';
import * as XLSX from 'xlsx';

import DashboardHeader from '../components/dashboard/DashboardHeader';
import KpiCards from '../components/dashboard/KpiCards';
import StatsPanel from '../components/dashboard/StatsPanel';
import SolicitacaoTable from '../components/dashboard/SolicitacaoTable';
import DetailModal from '../components/dashboard/DetailModal';
import AssemblyReportModal from '../components/dashboard/AssemblyReportModal';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return new Date(dateStr).toLocaleDateString('pt-BR');
};



// Helper to calculate sum of winning items in a request (defined outside component for performance)
const getRequestTotal = (s) => {
  let total = 0;
  let hasWinner = false;
  if (s.items) {
    s.items.forEach(it => {
      const prices = it.prices || [];
      const winner = prices.find(p => p.isWinner);
      if (winner) {
        total += (winner.price || 0) * (it.quant || 1);
        hasWinner = true;
      }
    });
  }

  if (!hasWinner && s.vendors && s.vendors.length > 0) {
    s.vendors.forEach(v => {
      let vTotal = 0;
      let vHasWinner = false;
      if (v.prices) {
        v.prices.forEach(p => {
          if (p.isWinner) {
            const item = s.items.find(it => it.id === p.itemId);
            vTotal += (p.price || 0) * (item ? item.quant : 1);
            vHasWinner = true;
          }
        });
      }
      if (vHasWinner) {
        total += Math.max(0, vTotal - (v.discount || 0)) + (v.frete || 0);
      }
    });
  }
  return total;
};

const SaloesDashboard = ({ salaoId, startDate, endDate }) => {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!salaoId) {
      setData(null);
      setLoading(false);
      return;
    }
    const fetchSaloesData = async () => {
      setLoading(true);
      try {
        const res = await api.get('/solicitacoes/stats', {
          params: { startDate, endDate, salaoId }
        });
        setData(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSaloesData();
  }, [salaoId, startDate, endDate]);

  if (!salaoId) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
      <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>Selecione um salão no menu superior para visualizar os dados.</p>
    </div>;
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'spin 2s linear infinite' }}>⏳</div>
      <div>Carregando gráficos do salão...</div>
    </div>;
  }

  if (!data) return null;

  const chartData = Object.keys(data.byMonth || {}).map(m => ({
    name: m,
    Receitas: data.byMonth[m].receitas || 0,
    Despesas: data.byMonth[m].despesas || 0
  })).sort((a, b) => a.name.localeCompare(b.name));

  const pieData = [
    { name: 'Receitas', value: data.totalRevenues || 0, color: '#10b981' },
    { name: 'Despesas', value: data.totalSpent || 0, color: '#ef4444' }
  ];

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Receita x Despesa Mes a Mes */}
        <div className="card" style={{ boxShadow: 'none', border: '1px solid var(--border-color)' }}>
          <h3 className="card-title" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Receitas x Despesas (Mensal)</h3>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis tickFormatter={val => `R$ ${(val/1000).toFixed(0)}k`} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip formatter={val => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)} />
                <Legend />
                <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Proporcao Receitas x Despesas */}
        <div className="card" style={{ boxShadow: 'none', border: '1px solid var(--border-color)' }}>
          <h3 className="card-title" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Proporção Geral do Período</h3>
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={80} outerRadius={120} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(1)}%)`}>
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={val => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ textAlign: 'center', marginTop: '1rem', fontWeight: 600 }}>
            <p>Total Receitas: <span style={{color: '#10b981'}}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.totalRevenues || 0)}</span></p>
            <p>Total Despesas: <span style={{color: '#ef4444'}}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.totalSpent || 0)}</span></p>
            <p>Saldo do Salão: <span style={{color: (data.totalRevenues || 0) >= (data.totalSpent || 0) ? '#10b981' : '#ef4444'}}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((data.totalRevenues || 0) - (data.totalSpent || 0))}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Dashboard({ user, onNavigate, onNotificationsChange }) {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [assemblySolicitacoes, setAssemblySolicitacoes] = useState([]);
  const [assemblyLoading, setAssemblyLoading] = useState(false);
  const isFirstMount = useRef(true);
  const [totalGeral, setTotalGeral] = useState(0); // total across ALL periods
  const [stats, setStats] = useState({
    totalSpent: 0,
    totalRevenues: 0,
    previsibilidade: { ABERTA: 0, EM_COTACAO: 0, AGUARDANDO_APROVACAO: 0, APROVADA: 0, FATURADA: 0, PAGA: 0, RECUSADA: 0 },
    previsibilidadeRevenues: { ABERTA: 0, EM_COTACAO: 0, AGUARDANDO_APROVACAO: 0, APROVADA: 0, FATURADA: 0, PAGA: 0, RECUSADA: 0 },
    byCategory: {},
    byArea: {},
    byMonth: {},
    savings: 0,
    topSuppliers: []
  });
  const [loading, setLoading] = useState(true);
  const [planoContas, setPlanoContas] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeUploadId, setActiveUploadId] = useState(null);
  const [uploadType, setUploadType] = useState('BOLETO');
  const [selectedSolicitacao, setSelectedSolicitacao] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Custom States for dropdown menu and file uploads modal
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [uploadModalRequest, setUploadModalRequest] = useState(null);
  const [selectedBoletoFile, setSelectedBoletoFile] = useState(null);
  const [selectedNfFile, setSelectedNfFile] = useState(null);

  // Custom States for duplicate tracking, inline reject, comments and lightbox
  const [pinnedId, setPinnedId] = useState(() => localStorage.getItem('lastCreatedRequestId'));
  const [newComment, setNewComment] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [motivoRecusa, setMotivoRecusa] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState(null);
  const [lightboxType, setLightboxType] = useState(null);

  // Simulation State (CAPEX)
  const [simulatedValue, setSimulatedValue] = useState('');
  const [simulatedCategory, setSimulatedCategory] = useState('');
  const [simulatedMonth, setSimulatedMonth] = useState('');
  const [simulatedInstallments, setSimulatedInstallments] = useState(1);
  const [isSimulating, setIsSimulating] = useState(false);

  // Expanded Cards (Fullscreen)
  const [expandedCard, setExpandedCard] = useState(null);
  const [isAlertsExpanded, setIsAlertsExpanded] = useState(false);

  // Interactive Assembly Report Modal
  const [assemblyDetailModal, setAssemblyDetailModal] = useState({ open: false, planoCode: null, month: null });
  const [assemblyDetailData, setAssemblyDetailData] = useState([]);

  // Helper to calculate simulated value for a specific month
  const getSimulatedValueForMonth = (mStr) => {
    if (!isSimulating || !simulatedValue || !simulatedMonth || !simulatedInstallments) return 0;
    const simVal = parseFloat(simulatedValue) || 0;
    const installmentValue = simVal / simulatedInstallments;
    
    const [startY, startM] = simulatedMonth.split('-').map(Number);
    const [curY, curM] = mStr.split('-').map(Number);
    if (!startY || !startM || !curY || !curM) return 0;
    
    const diffMonths = (curY - startY) * 12 + (curM - startM);
    if (diffMonths >= 0 && diffMonths < simulatedInstallments) {
      return installmentValue;
    }
    return 0;
  };

  // Lazy-load full detail (Items/Vendors/Prices) only when opening modal
  const openDetail = async (id) => {
    setDetailLoading(true);
    setSelectedSolicitacao({ id }); // open modal immediately with spinner
    try {
      const res = await api.get(`/solicitacoes/${id}`);
      setSelectedSolicitacao(res.data);
    } catch (e) {
      console.error('Erro ao carregar detalhe:', e);
    } finally {
      setDetailLoading(false);
    }
  };

  // Month navigator: current period (year-month)
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1); // 1-12
  const [showFullYear, setShowFullYear] = useState(false);

  // Interactive Filters from Stats/Assembly
  const [filterArea, setFilterArea] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterTipo, setFilterTipo] = useState(''); // Normal | Urgente | Emergencial
  const [filterStatusKpi, setFilterStatusKpi] = useState(''); // filter by status from KPI cards

  // Global Filter: Salao
  const [globalFilterSalao, setGlobalFilterSalao] = useState('');
  const [saloes, setSaloes] = useState([]);

  // Table Column Filters (Data, Solicitante, Valor, Status)
  const [searchDate, setSearchDate] = useState('');
  const [searchSolicitante, setSearchSolicitante] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [searchValue, setSearchValue] = useState('');

  // Plano de Contas search filter in stats
  const [planoSearch, setPlanoSearch] = useState('');
  
  // Tabs State
  const [activeTab, setActiveTab] = useState('list'); // 'list', 'stats', 'assembly'
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Date filter for custom mode and assembly report
  const [dateMode, setDateMode] = useState('month'); // 'month' or 'custom'
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Compute API date range from viewYear/viewMonth or full-year mode
  const getPeriodRange = (year, month, fullYear) => {
    if (dateMode === 'custom') {
      return { start: startDate, end: endDate };
    }
    if (fullYear) {
      return { start: `${year}-01-01`, end: `${year}-12-31` };
    }
    const mm = String(month).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    return { start: `${year}-${mm}-01`, end: `${year}-${mm}-${lastDay}` };
  };

  const fetchListData = async (year, month, fullYear, salaoId = globalFilterSalao) => {
    const { start, end } = getPeriodRange(year, month, fullYear);
    const params = { startDate: start, endDate: end };
    if (salaoId) params.salaoId = salaoId;
    const resList = await api.get('/solicitacoes', { params });
    const { data, total } = resList.data;
    const enhancedList = (data || []).map(s => {
      const contaVal = s.planoContas ? `${s.planoContas.code} - ${s.planoContas.name}` : (s.conta || '');
      return {
        ...s,
        conta: contaVal,
        estimatedTotal: s.estimatedTotal !== undefined ? parseFloat(s.estimatedTotal) : getRequestTotal(s)
      };
    });
    setSolicitacoes(enhancedList);
    setTotalGeral(total || 0);
  };
  const [financeiroData, setFinanceiroData] = useState([]);

  // Fetch Dashboard Stats
  const fetchStats = async (year, month, fullYear, salaoId = globalFilterSalao) => {
    try {
      const { start, end } = getPeriodRange(year ?? viewYear, month ?? viewMonth, fullYear ?? showFullYear);
      const params = { startDate: start, endDate: end };
      if (salaoId) params.salaoId = salaoId;
      const { data } = await api.get('/solicitacoes/stats', { params });
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFinanceiro = async (year, month, fullYear, salaoId = globalFilterSalao) => {
    try {
      const { start, end } = getPeriodRange(year ?? viewYear, month ?? viewMonth, fullYear ?? showFullYear);
      const params = { startDate: start, endDate: end };
      if (salaoId) params.salaoId = salaoId;
      const { data } = await api.get('/financeiro/dashboard', { params });
      setFinanceiroData(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats(viewYear, viewMonth, showFullYear);
    fetchFinanceiro(viewYear, viewMonth, showFullYear);
    fetchListData(viewYear, viewMonth, showFullYear);
  }, []);

  const fetchAssemblyData = async (salaoId = globalFilterSalao) => {
    try {
      setAssemblyLoading(true);
      const params = { startDate, endDate };
      if (salaoId) params.salaoId = salaoId;
      
      const [resReqs, resRecs] = await Promise.all([
        api.get('/solicitacoes', { params }),
        api.get('/financeiro/receitas', { params: { startDate, endDate, salaoId } })
      ]);
      
      const reqsData = resReqs.data.data || [];
      const recsData = resRecs.data || [];
      
      const mappedReqs = reqsData.map(s => {
        const contaVal = s.planoContas ? `${s.planoContas.code} - ${s.planoContas.name}` : (s.conta || '');
        return {
          ...s,
          conta: contaVal,
          estimatedTotal: s.estimatedTotal !== undefined ? parseFloat(s.estimatedTotal) : getRequestTotal(s)
        };
      });
      
      const mappedRecs = recsData.map(r => {
        const contaVal = r.planoContas ? `${r.planoContas.code} - ${r.planoContas.name}` : (r.planoConta || '');
        return {
          ...r,
          tipo: 'RECEITA',
          conta: contaVal,
          dataAplicacao: r.dataReferencia,
          estimatedTotal: parseFloat(r.valor || 0)
        };
      });
      
      setAssemblySolicitacoes([...mappedReqs, ...mappedRecs]);
    } catch (e) {
      console.error('Erro ao carregar dados de assembléia:', e);
    } finally {
      setAssemblyLoading(false);
    }
  };

  const fetchDashboardData = async (year, month, fullYear, salaoId = globalFilterSalao) => {
    try {
      setLoading(true);
      await Promise.all([
        fetchListData(year ?? viewYear, month ?? viewMonth, fullYear ?? showFullYear, salaoId),
        fetchStats(year ?? viewYear, month ?? viewMonth, fullYear ?? showFullYear, salaoId),
        fetchFinanceiro(year ?? viewYear, month ?? viewMonth, fullYear ?? showFullYear, salaoId),
        activeTab === 'assembly' ? fetchAssemblyData(salaoId) : Promise.resolve()
      ]);
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  // Performance Optimization: Only fetch stats/assembly once on mount.
  // When year/month navigation happens, only fetch the slim list data.
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      fetchDashboardData(viewYear, viewMonth, showFullYear, globalFilterSalao);
    } else {
      const loadData = async () => {
        try {
          setLoading(true);
          await Promise.all([
            fetchListData(viewYear, viewMonth, showFullYear, globalFilterSalao),
            fetchStats(viewYear, viewMonth, showFullYear, globalFilterSalao),
            fetchFinanceiro(viewYear, viewMonth, showFullYear, globalFilterSalao)
          ]);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYear, viewMonth, showFullYear, globalFilterSalao, dateMode, startDate, endDate]);

  useEffect(() => {
    if (activeTab === 'assembly') {
      fetchAssemblyData(globalFilterSalao);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, startDate, endDate, globalFilterSalao, dateMode]);

  // Load planoContas on mount for the simulation category selector
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

  // Close actions dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveDropdownId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  // Month navigation helpers
  const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const goToPrevMonth = () => {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
    setShowFullYear(false);
  };
  const goToNextMonth = () => {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
    setShowFullYear(false);
  };
  const goToCurrentMonth = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth() + 1);
    setShowFullYear(false);
  };

  const handleApprove = async (id, version) => {
    if (window.confirm('Tem certeza que deseja aprovar e assinar esta solicitação?')) {
      try {
        await api.post(`/solicitacoes/${id}/aprovar`, { version });
        alert('Solicitação aprovada com sucesso!');
        fetchDashboardData();
      } catch (err) {
        alert(err.response?.data?.error || 'Erro ao aprovar solicitação.');
      }
    }
  };

  const handleApproveFromModal = async (id, version) => {
    await handleApprove(id, version);
    setSelectedSolicitacao(null);
  };


  const handleUploadFile = async (e, id) => {
    e.preventDefault();
    if (!selectedFile) return alert('Selecione um arquivo primeiro.');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('type', uploadType);

    const url = user.role === 'FINANCEIRO' ? `/solicitacoes/${id}/pagar` : `/solicitacoes/${id}/faturar`;

    try {
      await api.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert('Arquivo anexado com sucesso!');
      setSelectedFile(null);
      setActiveUploadId(null);
      fetchDashboardData();
    } catch (err) {
      alert('Erro ao fazer upload do arquivo.');
    }
  };

  const handleDeleteSolicitacao = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta solicitação de compra? Esta ação não pode ser desfeita.')) return;

    try {
      await api.delete(`/solicitacoes/${id}`);
      alert('Solicitação excluída com sucesso!');
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir solicitação.');
    }
  };

  const handleConfirmPayment = async (id, version) => {
    if (!window.confirm('Confirmar a baixa de pagamento desta solicitação? O financeiro deve baixar e validar o Boleto e a Nota Fiscal antes de confirmar.')) return;
    try {
      await api.post(`/solicitacoes/${id}/pagar`, { version });
      alert('Pagamento confirmado com sucesso!');
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao confirmar pagamento.');
    }
  };

  const formatCurrency = (val) => {
    return currencyFormatter.format(val || 0);
  };

  // Unique lists for Excel-style dropdown filters
  const uniqueDates = useMemo(() => {
    const dates = new Set();
    solicitacoes.forEach(s => {
      if (s.dataAplicacao) {
        dates.add(formatDate(s.dataAplicacao));
      }
    });
    return Array.from(dates).sort((a, b) => {
      const [da, ma, ya] = a.split('/').map(Number);
      const [db, mb, yb] = b.split('/').map(Number);
      return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
    });
  }, [solicitacoes]);

  const uniqueSolicitantes = useMemo(() => {
    const names = new Set();
    solicitacoes.forEach(s => {
      if (s.solicitante?.name) {
        names.add(s.solicitante.name);
      }
    });
    return Array.from(names).sort();
  }, [solicitacoes]);

  const uniqueValues = useMemo(() => {
    const vals = new Set();
    solicitacoes.forEach(s => {
      const total = s.estimatedTotal || 0;
      if (total > 0) {
        vals.add(formatCurrency(total));
      } else {
        vals.add('Sob Cotação');
      }
    });
    return Array.from(vals).sort((a, b) => {
      if (a === 'Sob Cotação') return -1;
      if (b === 'Sob Cotação') return 1;
      const numA = parseFloat(a.replace(/[^\d,-]/g, '').replace(',', '.'));
      const numB = parseFloat(b.replace(/[^\d,-]/g, '').replace(',', '.'));
      return numA - numB;
    });
  }, [solicitacoes]);

  // Enforce Pinning of lastCreatedRequestId at the top of the list and bypass normal filters for it
  const filteredSolicitacoes = useMemo(() => {
    let list = solicitacoes.filter(s => {
      if (pinnedId && s.id === pinnedId) return false; // exclude from normal list, we prepend it

      if (filterArea && s.area !== filterArea) return false;
      if (filterCategory) {
        if (!s.conta || !s.conta.toUpperCase().includes(filterCategory.toUpperCase())) return false;
      }
      if (filterTipo && s.tipo !== filterTipo) return false;
      if (filterStatusKpi) {
        if (filterStatusKpi === 'RECEITA') {
          if (!s.conta || !s.conta.startsWith('1.')) return false;
        } else if (filterStatusKpi === 'SALDO') {
          // do not filter by type/status, show everything
        } else {
          // Standard status filter (applies only to Despesas)
          if (s.status !== filterStatusKpi) return false;
          if (s.conta && s.conta.startsWith('1.')) return false;
        }
      }
      // Column-level filters (Excel-style exact matching)
      if (searchDate && (!s.dataAplicacao || s.dataAplicacao.split('T')[0] !== searchDate)) return false;
      if (searchSolicitante && (!s.solicitante?.name || s.solicitante.name !== searchSolicitante)) return false;
      if (searchStatus && s.status !== searchStatus) return false;
      if (searchValue) {
        const total = s.estimatedTotal || 0;
        const totalStr = total > 0 ? formatCurrency(total) : 'Sob Cotação';
        if (totalStr !== searchValue) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.dataAplicacao || b.createdAt) - new Date(a.dataAplicacao || a.createdAt));

    if (pinnedId) {
      const pinnedItem = solicitacoes.find(s => s.id === pinnedId);
      if (pinnedItem) {
        list = [pinnedItem, ...list];
      }
    }
    return list;
  }, [solicitacoes, pinnedId, filterArea, filterCategory, filterTipo, filterStatusKpi, searchDate, searchSolicitante, searchStatus, searchValue]);

  // Clear pin handler
  const handleClearPin = (e, id) => {
    e.stopPropagation();
    localStorage.removeItem('lastCreatedRequestId');
    setPinnedId(null);
  };

  // Lightbox preview handler
  const handleOpenLightbox = async (e, filePath, fileType) => {
    e.preventDefault();
    try {
      const filename = filePath.split('/').pop();
      // Usa api.get com responseType blob para enviar o JWT Auth Token automaticamente
      const res = await api.get(`/downloads/${filename}`, { responseType: 'blob' });
      const fullUrl = URL.createObjectURL(res.data);
      setLightboxUrl(fullUrl);
      
      const ext = filename.split('.').pop().toLowerCase();
      if (ext === 'pdf') {
        setLightboxType('pdf');
      } else {
        setLightboxType('image');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao abrir anexo. Verifique se você tem permissão e se o arquivo existe.');
    }
  };

  // Add Comment handler
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const res = await api.post(`/solicitacoes/${selectedSolicitacao.id}/comentarios`, { content: newComment });
      setSelectedSolicitacao(prev => ({
        ...prev,
        comentarios: [...(prev.comentarios || []), res.data]
      }));
      setNewComment('');
    } catch (err) {
      alert('Erro ao enviar comentário.');
    }
  };

  // Reject Request handler
  const handleRecusar = async () => {
    if (!motivoRecusa.trim()) {
      alert('Por favor, informe a justificativa de recusa.');
      return;
    }

    try {
      await api.post(`/solicitacoes/${selectedSolicitacao.id}/recusar`, { motivo: motivoRecusa, version: selectedSolicitacao.version });
      alert('Solicitação recusada!');
      setSelectedSolicitacao(null);
      setRejecting(false);
      setMotivoRecusa('');
      fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao recusar solicitação.');
    }
  };

  // CSV Export handler
  const handleExportCSV = () => {
    if (filteredSolicitacoes.length === 0) {
      alert('Nenhuma solicitação para exportar.');
      return;
    }

    const headers = ['Data', 'Solicitante', 'Area', 'Descricao/Resumo', 'Conta', 'Valor Estimado (Teto)', 'Valor Real (Cotado)', 'Status'];
    const rows = filteredSolicitacoes.map(s => {
      const total = getRequestTotal(s);
      return [
        formatDate(s.dataAplicacao),
        s.solicitante?.name || '',
        s.area,
        s.descResumida.replace(/"/g, '""'),
        s.conta,
        s.valorEstimado || 0,
        total || 0,
        s.status
      ];
    });

    const csvContent = "\uFEFF"
      + [headers.join(';'), ...rows.map(r => r.map(val => `"${val}"`).join(';'))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `hamoa_compras_${viewYear}_${viewMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Role-based Action/Alert Notifications
  const notifications = useMemo(() => {
    const list = [];
    solicitacoes.forEach(s => {
      const isMyRequest = s.solicitanteId === user.id || user.role === 'TI';
      if ((user.role === 'SUPRIMENTOS' || user.role === 'TI') && s.status === 'ABERTA') {
        list.push({
          id: s.id,
          text: `Cotacao Pendente: "${s.descResumida.substring(0, 30)}..." aguarda cotacoes.`,
          type: 'warning',
          action: () => openDetail(s.id)
        });
      }
      if ((user.role === 'GESTAO' || user.role === 'TI') && s.status === 'AGUARDANDO_APROVACAO') {
        list.push({
          id: s.id,
          text: `Aprovacao Necessaria: "${s.descResumida.substring(0, 30)}..." aguarda assinatura.`,
          type: 'info',
          action: () => openDetail(s.id)
        });
      }
      if ((user.role === 'FINANCEIRO' || user.role === 'TI') && s.status === 'APROVADA') {
        list.push({
          id: s.id,
          text: `Faturamento Pendente: "${s.descResumida.substring(0, 30)}..." precisa de boleto/chave PIX.`,
          type: 'success',
          action: () => openDetail(s.id)
        });
      }
      if ((user.role === 'FINANCEIRO' || user.role === 'TI') && s.status === 'FATURADA') {
        list.push({
          id: s.id,
          text: `Pagamento Pendente: "${s.descResumida.substring(0, 30)}..." aguarda comprovante de pagamento.`,
          type: 'success',
          action: () => openDetail(s.id)
        });
      }
      if (s.status === 'RECUSADA' && (isMyRequest || user.role === 'TI')) {
        list.push({
          id: s.id,
          text: `Solicitacao Recusada: "${s.descResumida.substring(0, 30)}..." foi recusada. Verifique o motivo.`,
          type: 'danger',
          action: () => openDetail(s.id)
        });
      }
    });
    return list;
  }, [solicitacoes, user]);

  // Emit notifications up to App.jsx for the Navbar bell
  useEffect(() => {
    if (onNotificationsChange) {
      onNotificationsChange(notifications);
    }
  }, [notifications]);

  // Statistics Area Donut Render helper
  const renderAreaChart = (isExpanded = false) => {
    const areas = Object.entries(stats.byArea || {});
    if (areas.length === 0) return <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sem dados de despesas por area.</p>;

    const chartData = areas.map(([name, value]) => ({ name, value }));
    const colors = ['#ca8a04', '#8b5cf6', '#3b82f6', '#10b981', '#ef4444', '#06b6d4', '#ec4899', '#f59e0b'];

    return (
      <div style={{ width: '100%', height: isExpanded ? 'calc(100vh - 200px)' : '240px' }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-area-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', border: 'none', background: 'var(--container-bg)', color: 'var(--text-main)' }} />
            <Legend layout="horizontal" align="center" verticalAlign="bottom" iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  // Top Suppliers List Helper
  const renderTopSuppliers = () => {
    const suppliers = stats.topSuppliers || [];
    if (suppliers.length === 0) return <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sem fornecedores cadastrados.</p>;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {suppliers.map((s, idx) => {
          const maxVal = suppliers[0]?.total || 1;
          const pct = Math.max(10, (s.total / maxVal) * 100);
          
          return (
            <div key={s.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600 }}>{idx + 1}. {s.name}</span>
                <strong style={{ color: 'var(--accent-green)' }}>{formatCurrency(s.total)}</strong>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary-color), var(--accent-green))', borderRadius: '4px' }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Lifecycle Audit Timeline Helper
  const renderTimeline = (status) => {
    const steps = [
      { key: 'ABERTA', label: 'Abertura', desc: 'Solicitacao registrada' },
      { key: 'EM_COTACAO', label: 'Cotacao', desc: 'Pesquisa de precos' },
      { key: 'AGUARDANDO_APROVACAO', label: 'Equalizacao', desc: 'Escolha do fornecedor' },
      { key: 'APROVADA', label: 'Em Orçamento', desc: 'Falta nf/boleto' },
      { key: 'FATURADA', label: 'Aguardando Pagamento', desc: 'Boleto/Pix anexado' },
      { key: 'PAGA', label: 'Pago', desc: 'Comprovante anexado' }
    ];

    if (status === 'RECUSADA') {
      steps.push({ key: 'RECUSADA', label: 'Recusada', desc: 'Solicitacao Recusada' });
    }

    const currentIdx = steps.findIndex(s => s.key === status);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', position: 'relative', paddingLeft: '20px', borderLeft: '2px solid var(--border-color)', margin: '1rem 0' }}>
        {steps.map((step, idx) => {
          const isCompleted = idx <= currentIdx && status !== 'RECUSADA';
          const isActive = step.key === status;
          const isRecused = status === 'RECUSADA' && step.key === 'RECUSADA';

          let dotColor = 'var(--border-color)';
          if (isCompleted) dotColor = 'var(--accent-green)';
          if (isActive) dotColor = 'var(--primary-color)';
          if (isRecused) dotColor = '#dc2626';

          return (
            <div key={step.key} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{
                position: 'absolute',
                left: '-27px',
                top: '4px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: dotColor,
                border: isActive || isRecused ? '3px solid var(--container-bg)' : 'none',
                boxShadow: isActive || isRecused ? `0 0 0 3px ${dotColor}` : 'none',
                transition: 'all 0.3s'
              }} />
              <strong style={{ fontSize: '0.8rem', color: isActive || isRecused ? dotColor : 'var(--text-main)' }}>
                {step.label} {isActive && '📍'} {isRecused && '❌'}
              </strong>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{step.desc}</span>
            </div>
          );
        })}
      </div>
    );
  };

  // Helper: navigate to list tab with a set of quick filters
  const goToListWithFilter = ({ tipo, statusKpi, category, area } = {}) => {
    if (tipo !== undefined) setFilterTipo(tipo);
    if (statusKpi !== undefined) setFilterStatusKpi(statusKpi);
    if (category !== undefined) setFilterCategory(category);
    if (area !== undefined) setFilterArea(area);
    setShowFullYear(true); // show full year so you see all matching records
    setActiveTab('list');
  };


  // Filter solicitations for assembly report (paid and confirmed)
  const filteredForAssembly = useMemo(() => {
    return assemblySolicitacoes.filter(s => {
      const code = s.planoContasCode || (s.planoContas ? s.planoContas.code : null) || (s.conta ? s.conta.split(' - ')[0] : '');
      const isRevenue = s.tipo === 'RECEITA' || code === '1' || code.startsWith('1.');
      
      // Receitas
      if (isRevenue) {
        return s.status === 'CONFIRMADO';
      }
      // Despesas
      return s.status === 'PAGA';
    });
  }, [assemblySolicitacoes]);

  // Interactive filter helpers
  const handleCategoryClick = (catName) => {
    const codeMatch = catName.match(/^([\d.]+)/);
    if (codeMatch) {
      setFilterCategory(codeMatch[1]);
    } else {
      setFilterCategory(catName);
    }
    setActiveTab('list');
  };

  const handleMonthClick = (monthName) => {
    // monthName is YYYY-MM — navigate the month navigator
    if (monthName && monthName.length >= 7) {
      const [y, m] = monthName.split('-').map(Number);
      if (y && m) {
        setViewYear(y);
        setViewMonth(m);
        setShowFullYear(false);
        setActiveTab('list');
      }
    }
  };

  // Generate Matrix for Assembly (igual prestação de contas)
  const matrixData = useMemo(() => {
    const startYear = parseInt(startDate.substring(0, 4));
    const startMonth = parseInt(startDate.substring(5, 7));
    const endYear = parseInt(endDate.substring(0, 4));
    const endMonth = parseInt(endDate.substring(5, 7));

    const months = [];
    if (isNaN(startYear) || isNaN(startMonth) || isNaN(endYear) || isNaN(endMonth)) {
      return { months: [], matrix: {}, categoryTotals: {}, monthTotalsDespesas: {}, monthTotalsReceitas: {} };
    }

    let curYear = startYear;
    let curMonth = startMonth;

    let iterations = 0;
    while ((curYear < endYear || (curYear === endYear && curMonth <= endMonth)) && iterations < 100) {
      iterations++;
      const mStr = `${curYear}-${String(curMonth).padStart(2, '0')}`;
      months.push(mStr);
      curMonth++;
      if (curMonth > 12) {
        curMonth = 1;
        curYear++;
      }
    }

    const matrix = {}; // conta -> { month -> total }
    const categoryTotals = {}; // conta -> total
    const monthTotalsDespesas = {}; // month -> total despesas
    const monthTotalsReceitas = {}; // month -> total receitas
    months.forEach(m => { 
      monthTotalsDespesas[m] = 0; 
      monthTotalsReceitas[m] = 0; 
    });

    const inactiveCategories = new Set();
    filteredForAssembly.forEach(s => {
      const sTotal = s.estimatedTotal || 0;
      const sDate = s.dataAplicacao || s.createdAt.substring(0, 10);
      const sMonth = sDate.substring(0, 7);

      if (months.includes(sMonth)) {
        const cat = s.planoContas ? `${s.planoContas.code} - ${s.planoContas.name}` : (s.conta || 'Não Categorizado');
        if (!matrix[cat]) {
          matrix[cat] = {};
          months.forEach(m => { matrix[cat][m] = 0; });
        }
        matrix[cat][sMonth] += sTotal;
        categoryTotals[cat] = (categoryTotals[cat] || 0) + sTotal;
        
        if (s.planoContas ? !s.planoContas.isActive : true) {
          inactiveCategories.add(cat);
        }
        
        const code = s.planoContasCode || (s.planoContas ? s.planoContas.code : null) || cat.split(' - ')[0];
        const isRevenue = s.tipo === 'RECEITA' || code === '1' || code.startsWith('1.');
        
        if (isRevenue) {
          monthTotalsReceitas[sMonth] += sTotal;
        } else {
          monthTotalsDespesas[sMonth] += sTotal;
        }
      }
    });

    return { months, matrix, categoryTotals, monthTotalsDespesas, monthTotalsReceitas, inactiveCategories };
  }, [filteredForAssembly, startDate, endDate]);


  // Render SVG Donut Chart for Categories
  const renderCategoryDonut = (isExpanded = false) => {
    let computedCategories = { ...(stats.byCategory || {}) };
    if (isSimulating && simulatedValue && simulatedCategory) {
      const simVal = parseFloat(simulatedValue) || 0;
      computedCategories[simulatedCategory] = (computedCategories[simulatedCategory] || 0) + simVal;
    }

    const categories = Object.entries(computedCategories)
      .filter(([_, value]) => value > 0)
      .sort((a, b) => b[1] - a[1]);

    if (categories.length === 0) return <p>Sem dados de gastos por categoria.</p>;

    const total = categories.reduce((sum, [_, v]) => sum + v, 0);
    let cumulativePercent = 0;
    const colors = [
      'var(--primary-color)', 'var(--accent-color)', 'var(--accent-green)', 
      'var(--accent-yellow)', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'
    ];

    // Filter categories by search keyword
    const filteredCategories = categories.filter(([name]) => 
      name.toUpperCase().includes(planoSearch.toUpperCase())
    );

    return (
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', height: isExpanded ? 'calc(100vh - 200px)' : 'auto' }}>
        <svg width={isExpanded ? "60vh" : "180"} height={isExpanded ? "60vh" : "180"} viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', borderRadius: '50%', flexShrink: 0 }}>
          <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="rgba(0,0,0,0.05)" strokeWidth="4" />
          {categories.map(([name, val], idx) => {
            const percent = (val / total) * 100;
            const dashArray = `${percent} ${100 - percent}`;
            const dashOffset = 100 - cumulativePercent;
            cumulativePercent += percent;
            return (
              <circle
                key={name}
                cx="18"
                cy="18"
                r="15.915"
                fill="transparent"
                stroke={colors[idx % colors.length]}
                strokeWidth="4"
                strokeDasharray={dashArray}
                strokeDashoffset={dashOffset}
                onClick={() => handleCategoryClick(name)}
                style={{ cursor: 'pointer', transition: 'stroke-width 0.2s' }}
                title={`${name}: ${formatCurrency(val)}`}
              />
            );
          })}
        </svg>

        <div style={{ flex: 1, minWidth: '240px' }}>
          {/* Search input to verify spend by category */}
          <div className="form-group" style={{ marginBottom: '0.8rem' }}>
            <input 
              type="text" 
              placeholder="🔍 Buscar por Plano de Contas..." 
              value={planoSearch}
              onChange={(e) => setPlanoSearch(e.target.value)}
              style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            />
          </div>

          <div style={{ maxHeight: '180px', overflowY: 'auto', paddingRight: '5px' }}>
            {filteredCategories.map(([name, val], idx) => {
              const originalIdx = categories.findIndex(([n]) => n === name);
              return (
                <div 
                  key={name} 
                  onClick={() => handleCategoryClick(name)}
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    margin: '5px 0', 
                    fontSize: '0.8rem', 
                    cursor: 'pointer',
                    padding: '5px',
                    borderRadius: '4px',
                    transition: 'background 0.2s'
                  }}
                  className="interactive-row-hover"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2.5px', background: colors[originalIdx % colors.length], flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                  </div>
                  <span style={{ fontWeight: 'bold' }}>{formatCurrency(val)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Render SVG Bar Chart
  const renderMonthlyBars = () => {
    // Normalize byMonth: backend now returns {despesas, receitas} objects
    const rawByMonth = stats.byMonth || {};
    let monthlyMap = {};
    Object.entries(rawByMonth).forEach(([k, v]) => {
      monthlyMap[k] = typeof v === 'object' ? (v.despesas || 0) : (v || 0);
    });
    
    // If simulating, insert simulated months into the map
    if (isSimulating && simulatedValue && simulatedMonth && simulatedInstallments) {
      const [startY, startM] = simulatedMonth.split('-').map(Number);
      for (let i = 0; i < simulatedInstallments; i++) {
        let m = startM + i;
        let y = startY;
        while (m > 12) {
          m -= 12;
          y += 1;
        }
        const mStr = `${y}-${String(m).padStart(2, '0')}`;
        if (monthlyMap[mStr] === undefined) {
          monthlyMap[mStr] = 0;
        }
      }
    }

    const months = Object.entries(monthlyMap).sort((a, b) => a[0].localeCompare(b[0]));
    if (months.length === 0) return <p>Sem dados de gastos mensais.</p>;

    const maxVal = Math.max(...months.map(([m, v]) => v + getSimulatedValueForMonth(m)), 1);

    return (
      <div style={{ display: 'flex', height: '220px', alignItems: 'flex-end', gap: '1rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '10px', marginTop: '1.5rem', overflowX: 'auto' }}>
        {months.map(([month, val]) => {
          const simVal = getSimulatedValueForMonth(month);
          const totalVal = val + simVal;
          const realHeightPercent = (val / maxVal) * 100;
          const simHeightPercent = (simVal / maxVal) * 100;

          return (
            <div key={month} onClick={() => handleMonthClick(month)} style={{ flex: 1, minWidth: '45px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }} className="bar-hover-effect">
              <div style={{ fontSize: '0.68rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                {formatCurrency(totalVal).replace(',00', '').replace('R$', '')}
              </div>
              <div 
                style={{ 
                  width: '100%', 
                  height: `${Math.max(5, (totalVal / maxVal) * 140)}px`, 
                  maxHeight: '140px',
                  display: 'flex',
                  flexDirection: 'column-reverse',
                  borderRadius: '4px 4px 0 0',
                  overflow: 'hidden',
                  transition: 'height 0.5s ease',
                }} 
                title={`${month} - Real: ${formatCurrency(val)} | Simulado: ${formatCurrency(simVal)} | Total: ${formatCurrency(totalVal)}`}
              >
                {/* Real portion */}
                {val > 0 && (
                  <div style={{
                    height: `${(val / totalVal) * 100}%`,
                    background: 'linear-gradient(to top, var(--primary-color), var(--primary-hover))'
                  }} />
                )}
                {/* Simulated portion */}
                {simVal > 0 && (
                  <div style={{
                    height: `${(simVal / totalVal) * 100}%`,
                    background: 'repeating-linear-gradient(45deg, #f97316, #f97316 8px, #ea580c 8px, #ea580c 16px)',
                    borderTop: '2px dashed #ffedd5'
                  }} />
                )}
              </div>
              <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                {month}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const clearAllFilters = () => {
    setFilterArea('');
    setFilterCategory('');
    setFilterTipo('');
    setFilterStatusKpi('');
    setSearchDate('');
    setSearchSolicitante('');
    setSearchStatus('');
    setSearchValue('');
  };

  const handleExportExcel = () => {
    const dataToExport = filteredSolicitacoes.map(req => ({
      'ID': req.id,
      'Data Aplicação': formatDate(req.dataAplicacao),
      'Conta': req.conta,
      'Área': req.area,
      'Tipo': req.tipo,
      'Descrição': req.descResumida,
      'Status': req.status,
      'Solicitante': req.solicitante ? req.solicitante.name : 'N/A',
      'Aprovador': req.approvedBy ? req.approvedBy.name : 'N/A',
      'Valor Total': getRequestTotal(req)
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Solicitações');
    XLSX.writeFile(workbook, 'Relatorio_Compras_Hamoa.xlsx');
  };

  const handleExportAssemblyExcel = () => {
    const { months, matrix, categoryTotals, monthTotalsReceitas, monthTotalsDespesas } = matrixData;
    
    // Header row
    const headers = ['Plano de Contas (Categoria)', ...months, 'TOTAL'];
    const dataToExport = [];
    
    // Add Receitas
    const receitasKeys = Object.keys(matrix).filter(cat => cat.startsWith('1.')).sort((a, b) => a.localeCompare(b));
    receitasKeys.forEach(cat => {
      const row = { 'Plano de Contas (Categoria)': `Receita: ${cat}` };
      months.forEach(m => {
        row[m] = matrix[cat][m] || 0;
      });
      row['TOTAL'] = categoryTotals[cat] || 0;
      dataToExport.push(row);
    });

    // Subtotal Receitas
    const totalReceitasRow = { 'Plano de Contas (Categoria)': 'TOTAL DE RECEITAS' };
    let superTotalReceitas = 0;
    months.forEach(m => {
      totalReceitasRow[m] = monthTotalsReceitas[m] || 0;
      superTotalReceitas += monthTotalsReceitas[m] || 0;
    });
    totalReceitasRow['TOTAL'] = superTotalReceitas;
    dataToExport.push(totalReceitasRow);

    dataToExport.push({}); // blank line

    // Add Despesas
    const despesasKeys = Object.keys(matrix).filter(cat => !cat.startsWith('1.')).sort((a, b) => a.localeCompare(b));
    despesasKeys.forEach(cat => {
      const row = { 'Plano de Contas (Categoria)': `Despesa: ${cat}` };
      months.forEach(m => {
        row[m] = matrix[cat][m] || 0;
      });
      row['TOTAL'] = categoryTotals[cat] || 0;
      dataToExport.push(row);
    });

    // Subtotal Despesas
    const totalDespesasRow = { 'Plano de Contas (Categoria)': 'TOTAL DE DESPESAS' };
    let superTotalDespesas = 0;
    months.forEach(m => {
      totalDespesasRow[m] = monthTotalsDespesas[m] || 0;
      superTotalDespesas += monthTotalsDespesas[m] || 0;
    });
    totalDespesasRow['TOTAL'] = superTotalDespesas;
    dataToExport.push(totalDespesasRow);

    dataToExport.push({}); // blank line

    // Saldo / Resultado Liquido
    const saldoRow = { 'Plano de Contas (Categoria)': 'SALDO / RESULTADO LÍQUIDO' };
    let finalSaldo = 0;
    months.forEach(m => {
      saldoRow[m] = (monthTotalsReceitas[m] || 0) - (monthTotalsDespesas[m] || 0);
      finalSaldo += saldoRow[m];
    });
        const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Prestação de Contas');
    XLSX.writeFile(workbook, 'Relatorio_Prestacao_Contas_Hamoa.xlsx');
  };

  return (
    <div>
      {/* ── Central de Alertas e Ações Pendentes ── */}
      {notifications.length > 0 && (
        <div className="no-print" style={{
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          boxShadow: 'var(--shadow-md)',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🔔 Central de Alertas & Ações Pendentes
            </h4>
            <button className="btn btn-secondary no-print" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => setIsAlertsExpanded(!isAlertsExpanded)}>
              {isAlertsExpanded ? 'Retrair ⬆' : 'Expandir ⬇'}
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: isAlertsExpanded ? '600px' : '150px', overflowY: 'auto', transition: 'max-height 0.3s ease' }}>
            {notifications.map((n, idx) => (
              <div
                key={idx}
                onClick={n.action}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.8rem',
                  borderRadius: '6px',
                  background: n.type === 'warning' ? 'rgba(245, 158, 11, 0.08)' :
                              n.type === 'info' ? 'rgba(59, 130, 246, 0.08)' :
                              n.type === 'success' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(220, 38, 38, 0.08)',
                  borderLeft: `4px solid ${
                              n.type === 'warning' ? '#f59e0b' :
                              n.type === 'info' ? '#3b82f6' :
                              n.type === 'success' ? '#10b981' : '#dc2626'
                  }`,
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  transition: 'transform 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
              >
                <span style={{ color: 'var(--text-main)' }}>{n.text}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-color)' }}>Verificar →</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dashboard Header, Navigation Tabs, period filters */}
      <DashboardHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        filteredSolicitacoes={filteredSolicitacoes}
        totalGeral={totalGeral}
        solicitacoes={solicitacoes}
        user={user}
        onNavigate={onNavigate}
        handleExportCSV={handleExportCSV}
        dateMode={dateMode}
        setDateMode={setDateMode}
        viewYear={viewYear}
        setViewYear={setViewYear}
        viewMonth={viewMonth}
        setViewMonth={setViewMonth}
        showFullYear={showFullYear}
        setShowFullYear={setShowFullYear}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        goToPrevMonth={goToPrevMonth}
        goToNextMonth={goToNextMonth}
        goToCurrentMonth={goToCurrentMonth}
        globalFilterSalao={globalFilterSalao}
        setGlobalFilterSalao={setGlobalFilterSalao}
        saloes={saloes}
        fetchAssemblyData={fetchAssemblyData}
        today={today}
      />

      {activeTab === 'list' && (
        <div>
          {/* KPI Cards & Urgency summary */}
          <KpiCards
            stats={stats}
            formatCurrency={formatCurrency}
            filterStatusKpi={filterStatusKpi}
            filterTipo={filterTipo}
            goToListWithFilter={goToListWithFilter}
          />

          {/* Active Filter Indicators */}
          {(filterArea || filterCategory || filterTipo || filterStatusKpi || searchDate || searchSolicitante || searchStatus || searchValue) && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'var(--primary-light)', padding: '0.6rem 1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Filtros Ativos:</span>
              {filterArea && <span className="badge badge-cotacao">Área: {filterArea}</span>}
              {filterCategory && <span className="badge badge-cotacao">Conta: {filterCategory}</span>}
              {filterTipo && <span className="badge badge-aguardando">Urgência: {filterTipo}</span>}
              {filterStatusKpi && <span className="badge badge-aprovada">Status: {filterStatusKpi.replace(/_/g, ' ')}</span>}
              {searchDate && <span className="badge badge-cotacao">Data: {formatDate(searchDate)}</span>}
              {searchSolicitante && <span className="badge badge-cotacao">Solicitante: {searchSolicitante}</span>}
              {searchStatus && <span className="badge badge-cotacao">Status Col.: {searchStatus}</span>}
              {searchValue && <span className="badge badge-cotacao">Valor: {searchValue}</span>}
              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }} onClick={clearAllFilters}>
                Limpar Todos
              </button>
            </div>
          )}

          {/* Solicitacoes Table with sorting and pagination */}
          <SolicitacaoTable
            filteredSolicitacoes={filteredSolicitacoes}
            solicitacoes={solicitacoes}
            totalGeral={totalGeral}
            loading={loading}
            user={user}
            pinnedId={pinnedId}
            handleClearPin={handleClearPin}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
            openDetail={openDetail}
            handleCategoryClick={handleCategoryClick}
            setFilterArea={setFilterArea}
            handleOpenLightbox={handleOpenLightbox}
            activeDropdownId={activeDropdownId}
            setActiveDropdownId={setActiveDropdownId}
            onNavigate={onNavigate}
            setUploadModalRequest={setUploadModalRequest}
            handleConfirmPayment={handleConfirmPayment}
            handleDeleteSolicitacao={handleDeleteSolicitacao}
            handleExportExcel={handleExportExcel}
            searchDate={searchDate}
            setSearchDate={setSearchDate}
            searchSolicitante={searchSolicitante}
            setSearchSolicitante={setSearchSolicitante}
            searchStatus={searchStatus}
            setSearchStatus={setSearchStatus}
            searchValue={searchValue}
            setSearchValue={setSearchValue}
            uniqueSolicitantes={uniqueSolicitantes}
            uniqueValues={uniqueValues}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
          />
        </div>
      )}

      {activeTab === 'stats' && (
        <StatsPanel
          stats={stats}
          financeiroData={financeiroData}
          planoContas={planoContas}
          simulatedValue={simulatedValue}
          setSimulatedValue={setSimulatedValue}
          simulatedCategory={simulatedCategory}
          setSimulatedCategory={setSimulatedCategory}
          simulatedMonth={simulatedMonth}
          setSimulatedMonth={setSimulatedMonth}
          simulatedInstallments={simulatedInstallments}
          setSimulatedInstallments={setSimulatedInstallments}
          isSimulating={isSimulating}
          setIsSimulating={setIsSimulating}
          formatCurrency={formatCurrency}
          expandedCard={expandedCard}
          setExpandedCard={setExpandedCard}
          renderCategoryDonut={renderCategoryDonut}
          renderAreaChart={renderAreaChart}
          handleCategoryClick={handleCategoryClick}
          goToListWithFilter={goToListWithFilter}
        />
      )}

      {(activeTab === 'assembly' || activeTab === 'saloes') && (
        <div className="card">
          <div className="card-header no-print">
            <div>
              <h2 className="card-title">
                {activeTab === 'assembly' ? 'Demonstrativo de Prestação de Contas (Assembléia)' : 'Dashboard de Salões'}
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {activeTab === 'assembly' 
                  ? 'Matriz comparativa de despesas mensais por Plano de Contas, igual ao modelo da planilha oficial.'
                  : 'Acompanhamento de Receitas e Despesas vinculadas a cada Salão.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {activeTab === 'saloes' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '1rem', background: 'var(--primary-light)', padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--primary-color)' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-hover)' }}>🏛️ Salão:</span>
                  <select 
                    value={globalFilterSalao} 
                    onChange={e => { setGlobalFilterSalao(e.target.value); fetchAssemblyData(e.target.value); }}
                    style={{ background: 'transparent', border: 'none', outline: 'none', fontWeight: 'bold', color: 'var(--primary-hover)', cursor: 'pointer' }}
                  >
                    <option value="">Selecione um Salão...</option>
                    {saloes.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              <span style={{ fontSize: '0.85rem' }}>até</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ padding: '6px', borderRadius: '4px', border: '1px solid var(--border-color)' }} />
              <button className="btn btn-secondary" onClick={handleExportAssemblyExcel}>
                📥 Exportar Excel
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                🖨️ Imprimir A4
              </button>
            </div>
          </div>

          {/* Printable Area */}
          <div className="print-area" style={{ padding: '1rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h1 style={{ fontFamily: 'Outfit', fontSize: '1.8rem', color: 'var(--secondary-color)', fontWeight: 800 }}>
                HAMOA RESIDENCIAL RESORT
              </h1>
              <h2 style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginTop: '5px' }}>
                Demonstrativo de Prestação de Contas Mensal (Despesas de Compras)
              </h2>
              <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Período de Referência: {startDate} a {endDate}</p>
            </div>

            {activeTab === 'saloes' ? (
              <SaloesDashboard salaoId={globalFilterSalao} startDate={startDate} endDate={endDate} />
            ) : assemblyLoading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'spin 2s linear infinite' }}>⏳</div>
                <div>Carregando demonstrativo consolidado...</div>
              </div>
            ) : Object.keys(matrixData.matrix).length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Nenhum gasto registrado/aprovado no período selecionado.</p>
            ) : (
              <div>
                <div className="table-responsive" style={{ border: '2px solid black' }}>
                  <table style={{ fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--input-bg)' }}>
                        <th style={{ border: '1px solid black', padding: '8px', fontWeight: 'bold' }}>Plano de Contas (Categoria)</th>
                        {matrixData.months.map(m => (
                          <th key={m} style={{ border: '1px solid black', padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{m}</th>
                        ))}
                        <th style={{ border: '1px solid black', padding: '8px', textAlign: 'right', fontWeight: 'bold', background: 'var(--bg-color)' }}>TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Receitas Header Row */}
                      <tr style={{ background: 'var(--border-color)', color: 'var(--text-main)', fontWeight: 'bold', pageBreakInside: 'avoid' }}>
                        <td colSpan={matrixData.months.length + 2} style={{ border: '1px solid black', padding: '6px', fontSize: '0.85rem' }}>1. RECEITAS</td>
                      </tr>
                      {Object.keys(matrixData.matrix)
                        .filter(cat => cat.startsWith('1.'))
                        .sort((a, b) => a.localeCompare(b))
                        .map(cat => (
                          <tr 
                            key={cat} 
                            style={{ pageBreakInside: 'avoid', cursor: 'pointer' }}
                            className="interactive-row-hover"
                            onClick={() => {
                              const receitas = filteredForAssembly.filter(r => {
                                const sc = r.planoContas ? `${r.planoContas.code} - ${r.planoContas.name}` : (r.conta || '');
                                return sc.startsWith(cat) || r.planoContasCode === cat.split(' - ')[0];
                              });
                              setAssemblyDetailData(receitas);
                              setAssemblyDetailModal({ open: true, planoCode: cat, type: 'RECEITA' });
                            }}
                          >
                            <td style={{ border: '1px solid black', padding: '6px', fontWeight: 500, paddingLeft: '20px', color: matrixData.inactiveCategories?.has(cat) ? '#dc2626' : 'inherit', fontWeight: matrixData.inactiveCategories?.has(cat) ? 'bold' : 'normal' }} title="Clique para ver os detalhes das Receitas">
                              🔍 {cat} {matrixData.inactiveCategories?.has(cat) && '⚠️ (Inativo)'}
                            </td>
                            {matrixData.months.map(m => {
                              const val = matrixData.matrix[cat][m] || 0;
                              return (
                                <td key={m} style={{ border: '1px solid black', padding: '6px', textAlign: 'right' }}>
                                  {val > 0 ? formatCurrency(val).replace('R$', '') : '-'}
                                </td>
                              );
                            })}
                            <td style={{ border: '1px solid black', padding: '6px', textAlign: 'right', fontWeight: 'bold', background: 'var(--input-bg)' }}>
                              {formatCurrency(matrixData.categoryTotals[cat] || 0).replace('R$', '')}
                            </td>
                          </tr>
                        ))}
                      
                      {/* Total Receitas row */}
                      <tr style={{ background: 'var(--input-bg)', fontWeight: 'bold', pageBreakInside: 'avoid', color: '#10b981' }}>
                        <td style={{ border: '1px solid black', padding: '8px' }}>TOTAL DE RECEITAS</td>
                        {matrixData.months.map(m => (
                          <td key={m} style={{ border: '1px solid black', padding: '8px', textAlign: 'right' }}>
                            {formatCurrency(matrixData.monthTotalsReceitas[m] || 0).replace('R$', '')}
                          </td>
                        ))}
                        <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right', background: 'var(--bg-color)' }}>
                          {formatCurrency(Object.keys(matrixData.categoryTotals).filter(cat => cat.startsWith('1.')).reduce((sum, cat) => sum + (matrixData.categoryTotals[cat] || 0), 0))}
                        </td>
                      </tr>

                      {/* Spacer row */}
                      <tr style={{ height: '15px' }}><td colSpan={matrixData.months.length + 2} style={{ border: '1px solid black' }}></td></tr>

                      {/* Despesas Header Row */}
                      <tr style={{ background: 'var(--border-color)', color: 'var(--text-main)', fontWeight: 'bold', pageBreakInside: 'avoid' }}>
                        <td colSpan={matrixData.months.length + 2} style={{ border: '1px solid black', padding: '6px', fontSize: '0.85rem' }}>2. DESPESAS</td>
                      </tr>
                      {Object.keys(matrixData.matrix)
                        .filter(cat => !cat.startsWith('1.'))
                        .sort((a, b) => a.localeCompare(b))
                        .map(cat => (
                          <tr 
                            key={cat} 
                            style={{ pageBreakInside: 'avoid', cursor: 'pointer' }}
                            className="interactive-row-hover"
                            onClick={() => {
                              const reqs = filteredForAssembly.filter(s => {
                                const sc = s.planoContas ? `${s.planoContas.code} - ${s.planoContas.name}` : (s.conta || '');
                                return sc === cat || sc.startsWith(cat.split(' - ')[0]);
                              });
                              setAssemblyDetailData(reqs);
                              setAssemblyDetailModal({ open: true, planoCode: cat, type: 'DESPESA' });
                            }}
                          >
                            <td style={{ border: '1px solid black', padding: '6px', fontWeight: 500, paddingLeft: '20px', color: matrixData.inactiveCategories?.has(cat) ? '#dc2626' : 'inherit', fontWeight: matrixData.inactiveCategories?.has(cat) ? 'bold' : 'normal' }} title="Clique para ver os detalhes das Despesas">
                              🔍 {cat} {matrixData.inactiveCategories?.has(cat) && '⚠️ (Inativo)'}
                            </td>
                            {matrixData.months.map(m => {
                              const val = matrixData.matrix[cat][m] || 0;
                              return (
                                <td key={m} style={{ border: '1px solid black', padding: '6px', textAlign: 'right' }}>
                                  {val > 0 ? formatCurrency(val).replace('R$', '') : '-'}
                                </td>
                              );
                            })}
                            <td style={{ border: '1px solid black', padding: '6px', textAlign: 'right', fontWeight: 'bold', background: 'var(--input-bg)' }}>
                              {formatCurrency(matrixData.categoryTotals[cat] || 0).replace('R$', '')}
                            </td>
                          </tr>
                        ))}
                      
                      {/* Total Despesas row */}
                      <tr style={{ background: 'var(--input-bg)', fontWeight: 'bold', pageBreakInside: 'avoid', color: '#dc2626' }}>
                        <td style={{ border: '1px solid black', padding: '8px' }}>TOTAL DE DESPESAS</td>
                        {matrixData.months.map(m => (
                          <td key={m} style={{ border: '1px solid black', padding: '8px', textAlign: 'right' }}>
                            {formatCurrency(matrixData.monthTotalsDespesas[m] || 0).replace('R$', '')}
                          </td>
                        ))}
                        <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right', background: 'var(--bg-color)' }}>
                          {formatCurrency(Object.keys(matrixData.categoryTotals).filter(cat => !cat.startsWith('1.')).reduce((sum, cat) => sum + (matrixData.categoryTotals[cat] || 0), 0))}
                        </td>
                      </tr>

                      {/* Saldo / Resultado Líquido row */}
                      <tr style={{ background: 'var(--border-color)', fontWeight: 'bold', pageBreakInside: 'avoid', color: '#3b82f6' }}>
                        <td style={{ border: '1px solid black', padding: '8px' }}>SALDO / RESULTADO LÍQUIDO</td>
                        {matrixData.months.map(m => {
                          const saldo = (matrixData.monthTotalsReceitas[m] || 0) - (matrixData.monthTotalsDespesas[m] || 0);
                          return (
                            <td key={m} style={{ border: '1px solid black', padding: '8px', textAlign: 'right', color: saldo >= 0 ? '#10b981' : '#dc2626' }}>
                              {formatCurrency(saldo).replace('R$', '')}
                            </td>
                          );
                        })}
                        <td style={{ border: '1px solid black', padding: '8px', textAlign: 'right', background: 'var(--bg-color)' }}>
                          {(() => {
                            const totReceitas = Object.keys(matrixData.categoryTotals).filter(cat => cat.startsWith('1.')).reduce((sum, cat) => sum + (matrixData.categoryTotals[cat] || 0), 0);
                            const totDespesas = Object.keys(matrixData.categoryTotals).filter(cat => !cat.startsWith('1.')).reduce((sum, cat) => sum + (matrixData.categoryTotals[cat] || 0), 0);
                            const finalSaldo = totReceitas - totDespesas;
                            return (
                              <span style={{ color: finalSaldo >= 0 ? '#10b981' : '#dc2626', fontWeight: 'bold' }}>
                                {formatCurrency(finalSaldo)}
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: '2rem', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right', pageBreakInside: 'avoid' }}>
                  Relatório compilado de forma automática a partir das cotações integradas em: {new Date().toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detailed Solicitation Modal */}
      <DetailModal
        selectedSolicitacao={selectedSolicitacao}
        setSelectedSolicitacao={setSelectedSolicitacao}
        detailLoading={detailLoading}
        formatDate={formatDate}
        formatCurrency={formatCurrency}
        renderTimeline={renderTimeline}
        user={user}
        handleOpenLightbox={handleOpenLightbox}
        rejecting={rejecting}
        setRejecting={setRejecting}
        motivoRecusa={motivoRecusa}
        setMotivoRecusa={setMotivoRecusa}
        handleRecusar={handleRecusar}
        newComment={newComment}
        setNewComment={setNewComment}
        handleAddComment={handleAddComment}
        fetchDashboardData={fetchDashboardData}
      />

      {/* Lightbox Preview Modal */}
      {lightboxUrl && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1200,
          padding: '2rem'
        }} onClick={() => { setLightboxUrl(null); setLightboxType(null); }}>
          <div style={{
            position: 'relative',
            width: '90%',
            maxWidth: '1000px',
            height: '80vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'var(--container-bg)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem',
            boxShadow: 'var(--shadow-xl)'
          }} onClick={e => e.stopPropagation()}>
            <button className="btn btn-secondary" style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              zIndex: 10,
              fontSize: '1.2rem',
              fontWeight: 'bold',
              minWidth: '40px'
            }} onClick={() => { setLightboxUrl(null); setLightboxType(null); }}>
              ✕
            </button>
            {lightboxType === 'pdf' ? (
              <iframe
                src={lightboxUrl}
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: '4px' }}
                title="Visualizador de PDF"
              />
            ) : (
              <img
                src={lightboxUrl}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px' }}
                alt="Visualização do Documento"
              />
            )}
          </div>
        </div>
      )}

      {/* Dual Upload Modal (Boleto/Pix + Nota Fiscal) */}
      {uploadModalRequest && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1100,
          padding: '2rem'
        }}>
          <div style={{
            background: 'var(--container-bg)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem',
            width: '100%',
            maxWidth: '500px',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--border-color)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📥 Anexar Boleto e Nota Fiscal
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Solicitação: <strong>{uploadModalRequest.descResumida}</strong> ({formatCurrency(uploadModalRequest.estimatedTotal)})
            </p>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!selectedBoletoFile || !selectedNfFile) {
                alert('Tanto o Boleto/Pix quanto a Nota Fiscal são obrigatórios.');
                return;
              }
              const formData = new FormData();
              formData.append('boleto', selectedBoletoFile);
              formData.append('nf', selectedNfFile);
              formData.append('type', uploadType);
              formData.append('version', uploadModalRequest.version);

              try {
                await api.post(`/solicitacoes/${uploadModalRequest.id}/faturar`, formData, {
                  headers: { 'Content-Type': 'multipart/form-data' }
                });
                alert('Boleto e Nota Fiscal anexados com sucesso!');
                setSelectedBoletoFile(null);
                setSelectedNfFile(null);
                setUploadModalRequest(null);
                fetchDashboardData();
              } catch (err) {
                alert(err.response?.data?.error || 'Erro ao anexar os documentos.');
              }
            }}>
              
              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>
                  Tipo de Cobrança (Boleto ou Pix)
                </label>
                <select 
                  value={uploadType} 
                  onChange={(e) => setUploadType(e.target.value)} 
                  style={{ padding: '8px', fontSize: '0.85rem', width: '100%', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--container-bg)', color: 'var(--text-main)' }}
                >
                  <option value="BOLETO">Boleto Bancário (PDF)</option>
                  <option value="CHAVE_PIX">Chave Pix (Imagem/PDF)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>
                  Arquivo do Boleto ou Pix (PDF/Imagem)
                </label>
                <input 
                  type="file" 
                  required 
                  onChange={(e) => setSelectedBoletoFile(e.target.files[0])} 
                  style={{ width: '100%', padding: '6px', fontSize: '0.85rem', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--input-bg)' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>
                  Arquivo da Nota Fiscal (PDF/Imagem)
                </label>
                <input 
                  type="file" 
                  required 
                  onChange={(e) => setSelectedNfFile(e.target.files[0])} 
                  style={{ width: '100%', padding: '6px', fontSize: '0.85rem', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--input-bg)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => { 
                    setUploadModalRequest(null); 
                    setSelectedBoletoFile(null); 
                    setSelectedNfFile(null); 
                  }}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Enviar Documentos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assembly Detail Modal */}
      <AssemblyReportModal
        assemblyDetailModal={assemblyDetailModal}
        setAssemblyDetailModal={setAssemblyDetailModal}
        assemblyDetailData={assemblyDetailData}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        openDetail={openDetail}
        getRequestTotal={getRequestTotal}
      />

      <style>{`
        .interactive-row-hover:hover {
          background-color: var(--primary-light) !important;
        }
        .bar-hover-effect:hover div {
          transform: scale(1.05);
          filter: brightness(1.1);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .no-print, header, .btn, nav, .tab-navigation, .card-header, select, input {
            display: none !important;
          }
          .card {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          table {
            border: 1px solid #000 !important;
            width: 100% !important;
          }
          th, td {
            border: 1px solid #000 !important;
            padding: 6px !important;
          }
          .print-area {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );

}
