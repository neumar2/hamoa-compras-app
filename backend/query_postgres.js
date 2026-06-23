const { sequelize, Solicitacao, Item, Fornecedor, User } = require('./src/database/models');

async function run() {
  try {
    const { QueryTypes } = require('sequelize');
    const start = '2026-06-01';
    const end = '2026-06-30';
    const list = await sequelize.query(`
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
        WHERE s."dataAplicacao" BETWEEN :startDate AND :endDate
        ORDER BY s."dataAplicacao" DESC, s."createdAt" DESC
    `, {
      replacements: { startDate: start, endDate: end },
      type: QueryTypes.SELECT
    });
    console.log('--- RAW QUERY RESULTS ---');
    console.log(list);
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}

run();
