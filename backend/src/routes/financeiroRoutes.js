const express = require('express');
const router = express.Router();
const { LancamentoFinanceiro, User, PlanoContas } = require('../database/models');
const { Op } = require('sequelize');
const auth = require('../middlewares/auth');

// ── DASHBOARD ──

// GET consolidated dashboard data (OPEX / CAPEX / Receitas & Previsões)
router.get('/dashboard', async (req, res) => {
  try {
    const { startDate, endDate, salaoId } = req.query;
    const where = {};
    if (startDate && endDate) {
      where.dataReferencia = {
        [Op.between]: [startDate, endDate]
      };
    }
    if (salaoId) {
      where.salaoId = salaoId;
    }

    const lancamentos = await LancamentoFinanceiro.findAll({
      where,
      order: [['dataReferencia', 'ASC']]
    });

    const resumo = {};

    lancamentos.forEach(l => {
      const mes = l.dataReferencia.substring(0, 7);
      if (!resumo[mes]) {
        resumo[mes] = { mes, receitas: 0, despesas_opex: 0, despesas_capex: 0, total_despesas: 0, resultado: 0, isPrevisao: l.isPrevisao };
      }
      const val = parseFloat(l.valor);
      if (l.tipo === 'RECEITA') {
        resumo[mes].receitas += val;
      } else if (l.tipo === 'DESPESA') {
        resumo[mes].total_despesas += val;
        if (l.classificacao === 'CAPEX') resumo[mes].despesas_capex += val;
        else resumo[mes].despesas_opex += val;
      }
    });

    const dados = Object.values(resumo).map(m => {
      m.resultado = m.receitas - m.total_despesas;
      return m;
    });

    res.json(dados);
  } catch (error) {
    console.error('Erro ao buscar dados financeiros:', error);
    res.status(500).json({ error: 'Erro ao buscar dados financeiros' });
  }
});

// ── RECEITAS CRUD ──

// GET all receitas (with optional ?mes=YYYY-MM filter or ?startDate & ?endDate)
router.get('/receitas', auth, async (req, res) => {
  try {
    const { mes, salaoId, startDate, endDate } = req.query;
    const where = { tipo: 'RECEITA' };
    
    if (mes) {
      const [year, month] = mes.split('-').map(Number);
      const start = `${year}-${String(month).padStart(2, '0')}-01`;
      const end = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
      where.dataReferencia = {
        [Op.between]: [start, end]
      };
    } else if (startDate && endDate) {
      where.dataReferencia = {
        [Op.between]: [startDate, endDate]
      };
    }
    
    if (salaoId) {
      where.salaoId = salaoId;
    }
    const receitas = await LancamentoFinanceiro.findAll({
      where,
      include: [
        { model: User, as: 'registradoPor', attributes: ['id', 'name'] },
        { model: PlanoContas, as: 'planoContas' }
      ],
      order: [['dataReferencia', 'DESC']]
    });
    res.json(receitas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao listar receitas.' });
  }
});

// POST create receita
router.post('/receitas', auth, async (req, res) => {
  try {
    const { dataReferencia, planoConta, planoContasCode, valor, descricao, isPrevisao } = req.body;
    if (!dataReferencia || (!planoConta && !planoContasCode) || valor === undefined) {
      return res.status(400).json({ error: 'Data, Plano de Conta e Valor são obrigatórios.' });
    }
    const pCode = planoContasCode || (planoConta ? planoConta.split(' ')[0] : null);
    const receita = await LancamentoFinanceiro.create({
      dataReferencia,
      planoContasCode: pCode,
      tipo: 'RECEITA',
      classificacao: 'NA',
      valor: parseFloat(valor),
      descricao: descricao || '',
      isPrevisao: !!isPrevisao,
      status: 'PENDENTE',
      registradoPorId: req.user.id,
      salaoId: req.body.salaoId || null
    });
    res.status(201).json(receita);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar receita.' });
  }
});

// PUT update/confirm receita
router.put('/receitas/:id', auth, async (req, res) => {
  try {
    const receita = await LancamentoFinanceiro.findOne({ where: { id: req.params.id, tipo: 'RECEITA' } });
    if (!receita) return res.status(404).json({ error: 'Receita não encontrada.' });

    const { dataReferencia, planoConta, planoContasCode, valor, descricao, isPrevisao, status, salaoId } = req.body;
    if (dataReferencia) receita.dataReferencia = dataReferencia;
    
    const pCode = planoContasCode || (planoConta ? planoConta.split(' ')[0] : null);
    if (pCode) receita.planoContasCode = pCode;
    
    if (valor !== undefined) receita.valor = parseFloat(valor);
    if (descricao !== undefined) receita.descricao = descricao;
    if (isPrevisao !== undefined) receita.isPrevisao = !!isPrevisao;
    if (status) receita.status = status;
    if (salaoId !== undefined) receita.salaoId = salaoId || null;

    await receita.save();
    res.json(receita);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar receita.' });
  }
});

// DELETE receita
router.delete('/receitas/:id', auth, async (req, res) => {
  try {
    const receita = await LancamentoFinanceiro.findOne({ where: { id: req.params.id, tipo: 'RECEITA' } });
    if (!receita) return res.status(404).json({ error: 'Receita não encontrada.' });
    await receita.destroy();
    res.json({ message: 'Receita excluída com sucesso.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao excluir receita.' });
  }
});

module.exports = router;
