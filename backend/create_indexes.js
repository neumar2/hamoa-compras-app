const sequelize = require('./src/database/connection');

async function createIndexes() {
  try {
    console.log('Criando índices no SQLite para otimização de consultas...');
    
    // Create index on Solicitacaos
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_solicitacao_solicitante ON Solicitacaos (solicitanteId);');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_solicitacao_status ON Solicitacaos (status);');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_solicitacao_date ON Solicitacaos (dataAplicacao);');

    // Create index on Items
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_items_solicitacao ON Items (solicitacaoId);');

    // Create index on Fornecedors
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_fornecedors_solicitacao ON Fornecedors (solicitacaoId);');

    // Create index on PrecoItems
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_preco_item ON PrecoItems (itemId);');
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_preco_fornecedor ON PrecoItems (fornecedorId);');

    // Create index on Anexos
    await sequelize.query('CREATE INDEX IF NOT EXISTS idx_anexos_solicitacao ON Anexos (solicitacaoId);');

    console.log('Índices criados com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao criar índices:', error);
    process.exit(1);
  }
}

createIndexes();
