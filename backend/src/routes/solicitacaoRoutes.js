const express = require('express');
const router = Router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middlewares/auth');
const { Solicitacao, Item, Fornecedor, PrecoItem, Anexo, User, PlanoContas, Comentario } = require('../database/models');

// Configure upload folder
const uploadsDir = path.join(__dirname, '..', '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.xlsx', '.xls', '.docx', '.doc', '.txt', '.csv'];

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXTENSIONS.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não permitido. Apenas PDF, Imagens, Documentos do Office e Arquivos de Texto são aceitos.'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB file size limit
});

const { Op, literal } = require('sequelize');

// ── In-memory stats cache (3 min TTL) ──────────────────────────
let statsCache = null;
let statsCacheAt = 0;
const STATS_TTL_MS = 3 * 60 * 1000; // 3 minutes
const invalidateStatsCache = () => { statsCache = null; statsCacheAt = 0; };

// GET / — Ultra-fast raw SQL listing (no correlated subqueries)
router.get('/', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const isEventos = req.user.role === 'EVENTOS';
    
    // Build WHERE conditions dynamically
    const conditions = [];
    const replacements = {};
    
    if (isEventos) {
      conditions.push(`s."solicitanteId" = :userId`);
      replacements.userId = req.user.id;
    }
    if (startDate && endDate) {
      conditions.push(`s."dataAplicacao" BETWEEN :startDate AND :endDate`);
      replacements.startDate = startDate;
      replacements.endDate = endDate;
    } else if (startDate) {
      conditions.push(`s."dataAplicacao" >= :startDate`);
      replacements.startDate = startDate;
    } else if (endDate) {
      conditions.push(`s."dataAplicacao" <= :endDate`);
      replacements.endDate = endDate;
    }
    
    const whereSQL = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const { sequelize: db } = require('../database/models');

    // Single fast query with LEFT JOINs instead of correlated subqueries
    const [list, countResult] = await Promise.all([
      db.query(`
        SELECT 
          s.id, s.area, s.tipo, s."planoContasCode", s."dataAplicacao", s."descResumida",
          s.justificativa, s.prazo, s.status, s."approvedById", s."approvedAt",
          s."createdAt", s."solicitanteId",
          pc.name as "planoContas.name", pc.icon as "planoContas.icon", pc.color as "planoContas.color", pc."isActive" as "planoContas.isActive",
          u.name as "solicitante.name", u.email as "solicitante.email",
          a.name as "aprovador.name", a.email as "aprovador.email", a.role as "aprovador.role",
          COALESCE(totals."winnerTotal", 0) as "estimatedTotal"
        FROM "Solicitacaos" s
        LEFT JOIN "PlanoContas" pc ON pc.code = s."planoContasCode"
        LEFT JOIN "Users" u ON u.id = s."solicitanteId"
        LEFT JOIN "Users" a ON a.id = s."approvedById"
        LEFT JOIN (
          SELECT i."solicitacaoId", SUM(pi.price * i.quant) as "winnerTotal"
          FROM "Items" i
          INNER JOIN "PrecoItems" pi ON pi."itemId" = i.id AND pi."isWinner" = true
          GROUP BY i."solicitacaoId"
        ) totals ON totals."solicitacaoId" = s.id
        ${whereSQL}
        ORDER BY s."dataAplicacao" DESC, s."createdAt" DESC
      `, { replacements, type: db.QueryTypes.SELECT }),
      
      db.query(`
        SELECT COUNT(*) as cnt FROM "Solicitacaos" s ${whereSQL}
      `, { replacements, type: db.QueryTypes.SELECT })
    ]);

    // Transform flat rows into nested format the frontend expects
    const data = list.map(row => ({
      id: row.id,
      area: row.area,
      tipo: row.tipo,
      planoContasCode: row.planoContasCode,
      dataAplicacao: row.dataAplicacao,
      descResumida: row.descResumida,
      justificativa: row.justificativa,
      prazo: row.prazo,
      status: row.status,
      approvedById: row.approvedById,
      approvedAt: row.approvedAt,
      createdAt: row.createdAt,
      solicitanteId: row.solicitanteId,
      estimatedTotal: row.estimatedTotal,
      planoContas: row['planoContas.name'] ? { 
        code: row.planoContasCode, 
        name: row['planoContas.name'], 
        icon: row['planoContas.icon'], 
        color: row['planoContas.color'], 
        isActive: row['planoContas.isActive'] 
      } : null,
      solicitante: row['solicitante.name'] ? { name: row['solicitante.name'], email: row['solicitante.email'] } : null,
      aprovador: row['aprovador.name'] ? { name: row['aprovador.name'], email: row['aprovador.email'], role: row['aprovador.role'] } : null
    }));

    const total = parseInt(countResult[0]?.cnt) || 0;

    res.set('Cache-Control', 'private, max-age=10');
    res.json({ data, total });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao listar solicitações.' });
  }
});

// GET /plano-contas
router.get('/plano-contas', auth, async (req, res) => {
  try {
    const list = await PlanoContas.findAll({ order: [['code', 'ASC']] });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar plano de contas.' });
  }
});

// POST /plano-contas
router.post('/plano-contas', auth, async (req, res) => {
  try {
    const { code, name, icon, color } = req.body;
    if (!code || !name) {
      return res.status(400).json({ error: 'Código e Nome são obrigatórios.' });
    }
    const existing = await PlanoContas.findByPk(code);
    if (existing) {
      return res.status(400).json({ error: 'Já existe uma conta com este código.' });
    }
    const newAccount = await PlanoContas.create({ code, name, icon, color, isActive: true });
    res.status(201).json(newAccount);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar conta contábil.' });
  }
});

// PUT /plano-contas/:code
router.put('/plano-contas/:code', auth, async (req, res) => {
  try {
    const { name, icon, color, isActive } = req.body;
    const account = await PlanoContas.findByPk(req.params.code);
    if (!account) return res.status(404).json({ error: 'Conta contábil não encontrada.' });

    if (name !== undefined) account.name = name;
    if (icon !== undefined) account.icon = icon;
    if (color !== undefined) account.color = color;
    if (isActive !== undefined) account.isActive = !!isActive;

    await account.save();
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar conta contábil.' });
  }
});

// DELETE /plano-contas/:code
router.delete('/plano-contas/:code', auth, async (req, res) => {
  try {
    const { code } = req.params;
    const { LancamentoFinanceiro } = require('../database/models');
    const account = await PlanoContas.findByPk(code);
    if (!account) return res.status(404).json({ error: 'Conta contábil não encontrada.' });

    // Check if in use by Solicitacoes
    const inUseSolicitacao = await Solicitacao.findOne({ where: { planoContasCode: code } });
    // Check if in use by Lancamentos
    const inUseFinanceiro = await LancamentoFinanceiro.findOne({ where: { planoContasCode: code } });

    if (inUseSolicitacao || inUseFinanceiro) {
      // Soft Delete (Deactivate)
      account.isActive = false;
      await account.save();
      return res.json({ message: 'A conta está em uso no histórico e foi desativada.', type: 'soft' });
    }

    // Hard Delete
    await account.destroy();
    res.json({ message: 'Conta contábil excluída com sucesso.', type: 'hard' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao remover conta contábil.' });
  }
});

// GET /stats
router.get('/stats', auth, async (req, res) => {
  try {
    const { startDate, endDate, salaoId } = req.query;

    // Serve cached stats if fresh AND no date/salao filter is applied
    const now = Date.now();
    if (!startDate && !salaoId && statsCache && (now - statsCacheAt) < STATS_TTL_MS) {
      res.set('Cache-Control', 'private, max-age=180');
      return res.json(statsCache);
    }

    const { sequelize: db } = require('../database/models');
    
    // Helper para gerar clausulas WHERE
    const dateFilter = startDate && endDate ? 'AND s."dataAplicacao" >= :startDate AND s."dataAplicacao" <= :endDate' : '';
    const salaoFilter = salaoId ? 'AND s."salaoId" = :salaoId' : '';
    const filterSQL = `${dateFilter} ${salaoFilter}`;

    // Helper para gerar clausulas WHERE de finanças
    const financeDateFilter = startDate && endDate ? 'AND lf."dataReferencia" >= :startDate AND lf."dataReferencia" <= :endDate' : '';
    const financeSalaoFilter = salaoId ? 'AND lf."salaoId" = :salaoId' : '';
    const financeFilterSQL = `${financeDateFilter} ${financeSalaoFilter}`;

    // ── 1. Previsibilidade (total value per status) via SQL (Despesas apenas)
    const previsRows = await db.query(`
       SELECT s.status,
              SUM(
                CASE WHEN p."isWinner" = true
                     THEN p.price * i.quant
                     ELSE 0
               END
              ) as total
       FROM "Solicitacaos" s
       LEFT JOIN "Items" i ON i."solicitacaoId" = s.id
       LEFT JOIN "PrecoItems" p ON p."itemId" = i.id
       WHERE s."planoContasCode" NOT LIKE '1.%' AND s."planoContasCode" <> '1' ${filterSQL}
       GROUP BY s.status
    `, { replacements: { startDate, endDate, salaoId }, type: db.QueryTypes.SELECT });

    const previsibilidade = { ABERTA: 0, EM_COTACAO: 0, AGUARDANDO_APROVACAO: 0, APROVADA: 0, FATURADA: 0, PAGA: 0, RECUSADA: 0 };
    const previsibilidadeRevenues = { ABERTA: 0, EM_COTACAO: 0, AGUARDANDO_APROVACAO: 0, APROVADA: 0, FATURADA: 0, PAGA: 0, RECUSADA: 0 };
    let totalSpent = 0;

    previsRows.forEach(r => {
      const v = parseFloat(r.total) || 0;
      if (previsibilidade[r.status] !== undefined) previsibilidade[r.status] += v;
      if (r.status === 'PAGA') totalSpent += v;
    });

    // ── Query receitas de LancamentoFinanceiros
    const [revenueRows, totalRevRow, catRevRows, previsRevRows] = await Promise.all([
      db.query(`
        SELECT TO_CHAR(lf."dataReferencia"::date, 'YYYY-MM') as month,
               SUM(lf.valor) as total
        FROM "LancamentoFinanceiros" lf
        WHERE lf.tipo = 'RECEITA' AND lf.status = 'CONFIRMADO' ${financeFilterSQL}
        GROUP BY month
      `, { replacements: { startDate, endDate, salaoId }, type: db.QueryTypes.SELECT }),
      
      db.query(`
        SELECT SUM(lf.valor) as total
        FROM "LancamentoFinanceiros" lf
        WHERE lf.tipo = 'RECEITA' AND lf.status = 'CONFIRMADO' ${financeFilterSQL}
      `, { replacements: { startDate, endDate, salaoId }, type: db.QueryTypes.SELECT }),

      db.query(`
        SELECT lf."planoContasCode" as conta,
               pc.name as name,
               SUM(lf.valor) as total
        FROM "LancamentoFinanceiros" lf
        LEFT JOIN "PlanoContas" pc ON pc.code = lf."planoContasCode"
        WHERE lf.tipo = 'RECEITA' AND lf.status = 'CONFIRMADO' ${financeFilterSQL}
        GROUP BY lf."planoContasCode", pc.name
      `, { replacements: { startDate, endDate, salaoId }, type: db.QueryTypes.SELECT }),

      db.query(`
        SELECT lf.status, SUM(lf.valor) as total
        FROM "LancamentoFinanceiros" lf
        WHERE lf.tipo = 'RECEITA' ${financeFilterSQL}
        GROUP BY lf.status
      `, { replacements: { startDate, endDate, salaoId }, type: db.QueryTypes.SELECT })
    ]);

    const totalRevenues = parseFloat(totalRevRow[0]?.total) || 0;
    previsRevRows.forEach(r => {
      // Map CONFIRMADO -> PAGA (since stats KPI frontend expects PAGA for confirmed totals)
      const mappedStatus = r.status === 'CONFIRMADO' ? 'PAGA' : 'AGUARDANDO_APROVACAO';
      if (previsibilidadeRevenues[mappedStatus] !== undefined) {
        previsibilidadeRevenues[mappedStatus] += parseFloat(r.total) || 0;
      }
    });

    // ── 2. Urgency counts (Despesas apenas)
    const urgRows = await db.query(
      `SELECT tipo, COUNT(*) as cnt FROM "Solicitacaos" s WHERE s."planoContasCode" NOT LIKE '1.%' AND s."planoContasCode" <> '1' ${filterSQL} GROUP BY tipo`,
      { replacements: { startDate, endDate, salaoId }, type: db.QueryTypes.SELECT }
    );
    const urgency = { Normal: 0, Urgente: 0, Emergencial: 0 };
    urgRows.forEach(r => { if (urgency[r.tipo] !== undefined) urgency[r.tipo] = parseInt(r.cnt); });

    // ── 3. By Category (conta) - both revenues and expenses included
    const catRows = await db.query(`
       SELECT s."planoContasCode" as conta,
              pc.name as name,
              SUM(CASE WHEN p."isWinner" = true THEN p.price * i.quant ELSE 0 END) as total
       FROM "Solicitacaos" s
       LEFT JOIN "PlanoContas" pc ON pc.code = s."planoContasCode"
       LEFT JOIN "Items" i ON i."solicitacaoId" = s.id
       LEFT JOIN "PrecoItems" p ON p."itemId" = i.id
       WHERE s.status = 'PAGA' AND s."planoContasCode" NOT LIKE '1.%' AND s."planoContasCode" <> '1' ${filterSQL}
       GROUP BY s."planoContasCode", pc.name
    `, { replacements: { startDate, endDate, salaoId }, type: db.QueryTypes.SELECT });
    const byCategory = {};
    catRows.forEach(r => {
      const key = r.conta && r.name ? `${r.conta} - ${r.name}` : (r.conta || 'Não Categorizado');
      byCategory[key] = parseFloat(r.total) || 0;
    });
    catRevRows.forEach(r => {
      const key = r.conta && r.name ? `${r.conta} - ${r.name}` : (r.conta || 'Não Categorizado');
      byCategory[key] = (byCategory[key] || 0) + (parseFloat(r.total) || 0);
    });

    // ── 4. By Month (Despesas e Receitas)
    const monthRows = await db.query(`
       SELECT TO_CHAR(s."dataAplicacao"::date, 'YYYY-MM') as month,
              SUM(CASE WHEN p."isWinner" = true THEN p.price * i.quant ELSE 0 END) as despesas
       FROM "Solicitacaos" s
       LEFT JOIN "Items" i ON i."solicitacaoId" = s.id
       LEFT JOIN "PrecoItems" p ON p."itemId" = i.id
       WHERE s.status = 'PAGA' AND s."planoContasCode" NOT LIKE '1.%' AND s."planoContasCode" <> '1' ${filterSQL}
       GROUP BY month
       ORDER BY month
    `, { replacements: { startDate, endDate, salaoId }, type: db.QueryTypes.SELECT });
    
    const byMonth = {};
    monthRows.forEach(r => { 
      if (r.month) {
        byMonth[r.month] = {
          despesas: parseFloat(r.despesas) || 0,
          receitas: 0
        };
      }
    });

    revenueRows.forEach(r => {
      if (r.month) {
        if (!byMonth[r.month]) {
          byMonth[r.month] = { despesas: 0, receitas: 0 };
        }
        byMonth[r.month].receitas = parseFloat(r.total) || 0;
      }
    });

    // ── 5. By Area (Despesas apenas)
    const areaRows = await db.query(`
       SELECT s.area,
              SUM(CASE WHEN p."isWinner" = true THEN p.price * i.quant ELSE 0 END) as total
       FROM "Solicitacaos" s
       LEFT JOIN "Items" i ON i."solicitacaoId" = s.id
       LEFT JOIN "PrecoItems" p ON p."itemId" = i.id
       WHERE s."planoContasCode" NOT LIKE '1.%' ${filterSQL}
       GROUP BY s.area
    `, { replacements: { startDate, endDate, salaoId }, type: db.QueryTypes.SELECT });
    const byArea = {};
    areaRows.forEach(r => { byArea[r.area || 'Outro'] = parseFloat(r.total) || 0; });

    // ── 6. Savings and Top Suppliers (via SQL — avoids loading all records into memory)
    const savingsRows = await db.query(`
      SELECT SUM(("maxPrice" - "winnerPrice") * quant) as "totalSavings"
      FROM (
        SELECT i.quant,
               MAX(pi.price) as "maxPrice",
               MIN(CASE WHEN pi."isWinner" = true THEN pi.price ELSE NULL END) as "winnerPrice"
        FROM "Solicitacaos" s
        INNER JOIN "Items" i ON i."solicitacaoId" = s.id
        INNER JOIN "PrecoItems" pi ON pi."itemId" = i.id
        WHERE s.status = 'PAGA' AND s."planoContasCode" NOT LIKE '1.%' ${filterSQL}
        GROUP BY i.id, i.quant
        HAVING MIN(CASE WHEN pi."isWinner" = true THEN pi.price ELSE NULL END) IS NOT NULL
           AND MAX(pi.price) > MIN(CASE WHEN pi."isWinner" = true THEN pi.price ELSE NULL END)
      ) sub
    `, { replacements: { startDate, endDate, salaoId }, type: db.QueryTypes.SELECT });
    const savings = parseFloat(savingsRows[0]?.totalSavings) || 0;

    const topSuppRows = await db.query(`
      SELECT f.name, SUM(pi.price * i.quant) as total
      FROM "Solicitacaos" s
      INNER JOIN "Items" i ON i."solicitacaoId" = s.id
      INNER JOIN "PrecoItems" pi ON pi."itemId" = i.id AND pi."isWinner" = true
      INNER JOIN "Fornecedors" f ON f.id = pi."fornecedorId"
      WHERE s.status = 'PAGA' AND s."planoContasCode" NOT LIKE '1.%' ${filterSQL}
      GROUP BY f.name
      ORDER BY total DESC
      LIMIT 5
    `, { replacements: { startDate, endDate, salaoId }, type: db.QueryTypes.SELECT });
    const topSuppliers = topSuppRows.map(r => ({ name: r.name, total: parseFloat(r.total) || 0 }));

    const result = {
      totalSpent,
      totalRevenues,
      previsibilidade,
      previsibilidadeRevenues,
      urgency,
      byCategory,
      byMonth,
      byArea,
      savings,
      topSuppliers: topSuppRows.map(r => ({ name: r.name, value: parseFloat(r.total) || 0 }))
    };

    if (!startDate && !salaoId) {
      statsCache = result;
      statsCacheAt = now;
    }

    res.set('Cache-Control', 'private, max-age=180');
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao carregar estatísticas.' });
  }
});

// GET /:id — Full single record (with Items, Vendors, Prices)
router.get('/:id', auth, async (req, res) => {
  try {
    const sol = await Solicitacao.findByPk(req.params.id, {
      include: [
        { model: User, as: 'solicitante', attributes: ['name', 'email'] },
        { model: User, as: 'aprovador', attributes: ['name', 'email', 'role'] },
        { model: PlanoContas, as: 'planoContas' },
        { model: Item, as: 'items', include: [{ model: PrecoItem, as: 'prices' }] },
        { model: Fornecedor, as: 'vendors', include: [{ model: PrecoItem, as: 'prices' }] },
        { model: Anexo, as: 'anexos', include: [{ model: User, as: 'uploadedBy', attributes: ['name'] }] },
        { model: Comentario, as: 'comentarios', include: [{ model: User, as: 'user', attributes: ['name', 'role'] }] }
      ]
    });
    if (!sol) return res.status(404).json({ error: 'Solicitação não encontrada.' });
    res.json(sol);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar solicitação.' });
  }
});



// Create Request
router.post('/', auth, async (req, res) => {
  const { area, tipo, conta, planoContasCode, dataAplicacao, descResumida, justificativa, prazo, items, valorEstimado } = req.body;

  try {
    const pCode = planoContasCode || (conta ? conta.split(' - ')[0] : null);
    if (!pCode) {
      return res.status(400).json({ error: 'Conta contábil é obrigatória.' });
    }

    const request = await Solicitacao.create({
      solicitanteId: req.user.id,
      area,
      tipo,
      planoContasCode: pCode,
      dataAplicacao,
      descResumida,
      justificativa,
      prazo,
      status: 'ABERTA',
      valorEstimado: valorEstimado ? parseFloat(valorEstimado) : null
    });

    if (items && items.length > 0) {
      for (const item of items) {
        await Item.create({
          solicitacaoId: request.id,
          unidade: item.unidade || 'UND',
          quant: item.quant || 1,
          desc: item.desc
        });
      }
    }

    res.status(201).json(request);
  } catch (error) {
    console.error('Erro ao criar solicitação:', error);
    res.status(500).json({ error: 'Erro ao criar solicitação.', details: error.message });
  }
});

// Save Equalization
router.post('/:id/equalizacao', auth, upload.any(), async (req, res) => {
  const { id } = req.params;

  try {
    const request = await Solicitacao.findByPk(id);
    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada.' });

    const version = req.body.version !== undefined ? parseInt(req.body.version, 10) : null;
    if (version !== null && version !== request.version) {
      return res.status(409).json({ error: 'CONCURRENCY_CONFLICT', message: 'Esta solicitação foi alterada por outro usuário. Por favor, recarregue a página antes de continuar.' });
    }

    if (['APROVADA', 'FATURADA', 'PAGA'].includes(request.status)) {
      return res.status(400).json({ error: 'Não é possível alterar cotações de uma solicitação já aprovada ou finalizada.' });
    }

    const vendors = typeof req.body.vendors === 'string' ? JSON.parse(req.body.vendors) : req.body.vendors;
    const itemPrices = typeof req.body.itemPrices === 'string' ? JSON.parse(req.body.itemPrices) : req.body.itemPrices;
    const justificativaEscolha = req.body.justificativaEscolha;

    // Clean previous quotes
    await Fornecedor.destroy({ where: { solicitacaoId: id } });

    const createdVendors = {};
    for (const v of vendors) {
      const created = await Fornecedor.create({
        solicitacaoId: id,
        name: v.name,
        discount: v.discount || 0,
        condPagto: v.condPagto,
        prazoEntrega: v.prazoEntrega,
        frete: v.frete || 0
      });
      createdVendors[v.name] = created.id;
    }

    // Save item prices
    for (const priceObj of itemPrices) {
      const item = await Item.findOne({ where: { solicitacaoId: id, desc: priceObj.itemDesc } });
      if (item) {
        const vendorId = createdVendors[priceObj.vendorName];
        if (vendorId) {
          await PrecoItem.create({
            itemId: item.id,
            fornecedorId: vendorId,
            price: priceObj.price || 0,
            isWinner: priceObj.isWinner || false
          });
        }
      }
    }

    // Handle quote attachments
    const activeVendorNames = vendors.map(v => v.name);
    const keptAnexoIds = typeof req.body.keptAnexoIds === 'string' ? JSON.parse(req.body.keptAnexoIds) : (req.body.keptAnexoIds || []);

    // 1. Delete attachments that were explicitly removed or belong to removed vendors
    const whereClause = {
      solicitacaoId: id,
      fileType: 'PRINT_ORCAMENTO'
    };
    if (keptAnexoIds.length > 0) {
      whereClause.id = { [Op.notIn]: keptAnexoIds };
    }
    await Anexo.destroy({ where: whereClause });

    // 2. Process uploaded files
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const match = file.fieldname.match(/^quote_(\d+)$/);
        if (match) {
          const vendorIndex = parseInt(match[1]);
          const vendor = vendors[vendorIndex];
          if (vendor) {
            // Delete old attachment for this vendor name if any
            await Anexo.destroy({
              where: {
                solicitacaoId: id,
                fileType: 'PRINT_ORCAMENTO',
                fornecedorName: vendor.name
              }
            });

            // Create new attachment
            await Anexo.create({
              solicitacaoId: id,
              filePath: `/uploads/${file.filename}`,
              fileType: 'PRINT_ORCAMENTO',
              fornecedorName: vendor.name,
              uploadedById: req.user.id
            });
          }
        }
      }
    }

    if (req.body.approve === 'true') {
      request.status = 'APROVADA';
      request.approvedById = req.user.id;
      request.approvedAt = new Date();
    } else {
      request.status = 'AGUARDANDO_APROVACAO';
    }
    request.justificativa = (request.justificativa ? request.justificativa + "\n\n" : "") + "Escolha do fornecedor: " + justificativaEscolha;
    request.version += 1;
    await request.save();

    invalidateStatsCache();

    res.json({ message: 'Equalização salva com sucesso!' });
  } catch (error) {
    console.error('Erro ao salvar equalização:', error);
    res.status(500).json({ error: 'Erro ao salvar equalização.' });
  }
});

// Approve Request
router.post('/:id/aprovar', auth, async (req, res) => {
  const { id } = req.params;

  try {
    const request = await Solicitacao.findByPk(id);
    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada.' });

    const version = req.body.version !== undefined ? parseInt(req.body.version, 10) : null;
    if (version !== null && version !== request.version) {
      return res.status(409).json({ error: 'CONCURRENCY_CONFLICT', message: 'Esta solicitação foi alterada por outro usuário. Por favor, recarregue a página antes de continuar.' });
    }

    if (req.user.role !== 'GESTAO' && req.user.role !== 'TI') {
      return res.status(403).json({ error: 'Permissão negada.' });
    }

    request.status = 'APROVADA';
    request.approvedById = req.user.id;
    request.approvedAt = new Date();
    request.version += 1;
    await request.save();
    invalidateStatsCache();

    res.json({ message: 'Solicitação aprovada!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao aprovar.' });
  }
});

// Upload Billing Invoice (Boleto/Pix) and Invoice (Nota Fiscal) together
router.post('/:id/faturar', auth, upload.fields([
  { name: 'boleto', maxCount: 1 },
  { name: 'nf', maxCount: 1 }
]), async (req, res) => {
  const { id } = req.params;
  const { type } = req.body;

  try {
    const request = await Solicitacao.findByPk(id);
    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada.' });

    const version = req.body.version !== undefined ? parseInt(req.body.version, 10) : null;
    if (version !== null && version !== request.version) {
      return res.status(409).json({ error: 'CONCURRENCY_CONFLICT', message: 'Esta solicitação foi alterada por outro usuário. Por favor, recarregue a página antes de continuar.' });
    }

    const boletoFile = req.files && req.files['boleto'] ? req.files['boleto'][0] : null;
    const nfFile = req.files && req.files['nf'] ? req.files['nf'][0] : null;

    if (!boletoFile || !nfFile) {
      return res.status(400).json({ error: 'Tanto o Boleto/Pix quanto a Nota Fiscal são obrigatórios para faturamento.' });
    }

    // Create Boleto/Pix attachment
    await Anexo.create({
      solicitacaoId: id,
      filePath: `/uploads/${boletoFile.filename}`,
      fileType: type || 'BOLETO',
      uploadedById: req.user.id
    });

    // Create Nota Fiscal attachment
    await Anexo.create({
      solicitacaoId: id,
      filePath: `/uploads/${nfFile.filename}`,
      fileType: 'NOTA_FISCAL',
      uploadedById: req.user.id
    });

    request.status = 'FATURADA';
    request.version += 1;
    await request.save();
    invalidateStatsCache();

    res.json({ message: 'Boleto e Nota Fiscal anexados com sucesso!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao faturar.' });
  }
});

// Confirm Payment (with NF and Boleto check)
router.post('/:id/pagar', auth, async (req, res) => {
  const { id } = req.params;

  try {
    const request = await Solicitacao.findByPk(id);
    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada.' });

    const version = req.body.version !== undefined ? parseInt(req.body.version, 10) : null;
    if (version !== null && version !== request.version) {
      return res.status(409).json({ error: 'CONCURRENCY_CONFLICT', message: 'Esta solicitação foi alterada por outro usuário. Por favor, recarregue a página antes de continuar.' });
    }

    if (req.user.role !== 'FINANCEIRO' && req.user.role !== 'TI') {
      return res.status(403).json({ error: 'Permissão negada.' });
    }

    // Check if there is an existing NOTA_FISCAL in the database
    const existingNf = await Anexo.findOne({
      where: { solicitacaoId: id, fileType: 'NOTA_FISCAL' }
    });

    // Check if there is an existing BOLETO/CHAVE_PIX in the database
    const existingBoleto = await Anexo.findOne({
      where: { solicitacaoId: id, fileType: { [Op.in]: ['BOLETO', 'CHAVE_PIX'] } }
    });

    if (!existingNf || !existingBoleto) {
      return res.status(400).json({ error: 'Bloqueio de Segurança: A solicitação deve conter a Nota Fiscal e o Boleto/Pix para efetuar o pagamento.' });
    }

    request.status = 'PAGA';
    request.version += 1;
    await request.save();
    invalidateStatsCache();

    res.json({ message: 'Pagamento efetuado!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao registrar pagamento.' });
  }
});

// GET /:id/comentarios - Get comments for request
router.get('/:id/comentarios', auth, async (req, res) => {
  try {
    const comentarios = await Comentario.findAll({
      where: { solicitacaoId: req.params.id },
      include: [{ model: User, as: 'user', attributes: ['name', 'role'] }],
      order: [['createdAt', 'ASC']]
    });
    res.json(comentarios);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar comentários.' });
  }
});

// POST /:id/comentarios - Add comment
router.post('/:id/comentarios', auth, async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comentário não pode ser vazio.' });
  }

  try {
    const comentario = await Comentario.create({
      solicitacaoId: req.params.id,
      userId: req.user.id,
      content: content.trim()
    });

    const fullComment = await Comentario.findByPk(comentario.id, {
      include: [{ model: User, as: 'user', attributes: ['name', 'role'] }]
    });

    res.status(201).json(fullComment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar comentário.' });
  }
});

// POST /:id/recusar - Reject request with reason
router.post('/:id/recusar', auth, async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body;

  try {
    const request = await Solicitacao.findByPk(id);
    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada.' });

    const version = req.body.version !== undefined ? parseInt(req.body.version, 10) : null;
    if (version !== null && version !== request.version) {
      return res.status(409).json({ error: 'CONCURRENCY_CONFLICT', message: 'Esta solicitação foi alterada por outro usuário. Por favor, recarregue a página antes de continuar.' });
    }

    if (req.user.role !== 'GESTAO' && req.user.role !== 'TI') {
      return res.status(403).json({ error: 'Permissão negada para recusar esta solicitação.' });
    }

    request.status = 'RECUSADA';
    request.version += 1;
    await request.save();

    await Comentario.create({
      solicitacaoId: id,
      userId: req.user.id,
      content: `Solicitação RECUSADA. Motivo: ${motivo || 'Nenhum motivo fornecido.'}`
    });

    invalidateStatsCache();
    res.json({ message: 'Solicitação recusada com sucesso!', request });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao recusar solicitação.' });
  }
});



// PUT /:id - Edit Request
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { area, tipo, conta, planoContasCode, dataAplicacao, descResumida, justificativa, prazo, items, status, valorEstimado } = req.body;

  try {
    const request = await Solicitacao.findByPk(id, {
      include: [{ model: Item, as: 'items' }]
    });

    if (!request) {
      return res.status(404).json({ error: 'Solicitação não encontrada.' });
    }

    const version = req.body.version !== undefined ? parseInt(req.body.version, 10) : null;
    if (version !== null && version !== request.version) {
      return res.status(409).json({ error: 'CONCURRENCY_CONFLICT', message: 'Esta solicitação foi alterada por outro usuário. Por favor, recarregue a página antes de continuar.' });
    }

    if (['APROVADA', 'FATURADA', 'PAGA'].includes(request.status)) {
      return res.status(400).json({ error: 'Não é possível editar uma solicitação já aprovada ou finalizada.' });
    }


    if (request.solicitanteId !== req.user.id && req.user.role !== 'TI' && req.user.role !== 'GESTAO') {
      return res.status(403).json({ error: 'Permissão negada para editar esta solicitação.' });
    }

    const pCode = planoContasCode || (conta ? conta.split(' - ')[0] : null);

    if (area) request.area = area;
    if (tipo) request.tipo = tipo;
    if (pCode) request.planoContasCode = pCode;
    if (dataAplicacao) request.dataAplicacao = dataAplicacao;
    if (descResumida) request.descResumida = descResumida;
    if (justificativa !== undefined) request.justificativa = justificativa;
    if (prazo !== undefined) request.prazo = prazo;
    if (status) request.status = status;
    if (valorEstimado !== undefined) request.valorEstimado = valorEstimado ? parseFloat(valorEstimado) : null;

    request.version += 1;
    await request.save();

    if (items) {
      await Item.destroy({ where: { solicitacaoId: id } });
      for (const item of items) {
        await Item.create({
          solicitacaoId: id,
          unidade: item.unidade || 'UND',
          quant: item.quant || 1,
          desc: item.desc
        });
      }
    }

    res.json({ message: 'Solicitação atualizada com sucesso!', request });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar solicitação.' });
  }
});

// Upload Multiple Quotes Screenshots/Files
router.post('/:id/anexos', auth, upload.array('files', 10), async (req, res) => {
  const { id } = req.params;
  const { type } = req.body;

  try {
    const request = await Solicitacao.findByPk(id);
    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada.' });

    const version = req.body.version !== undefined ? parseInt(req.body.version, 10) : null;
    if (version !== null && version !== request.version) {
      return res.status(409).json({ error: 'CONCURRENCY_CONFLICT', message: 'Esta solicitação foi alterada por outro usuário. Por favor, recarregue a página antes de continuar.' });
    }

    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const anexos = [];
    for (const file of req.files) {
      const anexo = await Anexo.create({
        solicitacaoId: id,
        filePath: `/uploads/${file.filename}`,
        fileType: type || 'PRINT_ORCAMENTO',
        uploadedById: req.user.id
      });
      anexos.push(anexo);
    }

    request.version += 1;
    await request.save();

    res.json({ message: 'Anexos adicionados com sucesso!', anexos });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar anexos.' });
  }
});

// DELETE /:id - Delete Request
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    const request = await Solicitacao.findByPk(id);
    if (!request) {
      return res.status(404).json({ error: 'Solicitação não encontrada.' });
    }

    // Block deletion for paid status
    if (request.status === 'PAGA') {
      return res.status(400).json({ error: 'Não é possível excluir solicitações que já foram pagas.' });
    }

    // Security check: only creator, GESTAO, or TI
    if (request.solicitanteId !== req.user.id && req.user.role !== 'TI' && req.user.role !== 'GESTAO') {
      return res.status(403).json({ error: 'Permissão negada para excluir esta solicitação.' });
    }

    // Destroy the solicitation (cascades to items, vendors, prices, anexos)
    await request.destroy();

    // Invalidate stats cache so the dashboard updates
    invalidateStatsCache();

    res.json({ message: 'Solicitação excluída com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir solicitação:', error);
    res.status(500).json({ error: 'Erro ao excluir solicitação.' });
  }
});

module.exports = router;
