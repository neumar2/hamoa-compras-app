const { DataTypes } = require('sequelize');
const sequelize = require('./connection');

// User model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('EVENTOS', 'SUPRIMENTOS', 'GESTAO', 'FINANCEIRO', 'TI'),
    allowNull: false,
  },
  // Granular Permissions
  canRequest: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  canEqualize: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  canApprove: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  canDownloadBoleto: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  canDownloadNF: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  canEditEqualization: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  canDeleteRequest: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  canAccessReceitas: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  canConfirmReceitas: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  canManageUsers: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  canAccessSettings: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  // Account Status and Email Verification / Recovery
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true, // Defaults to true for seeds, new users created via registration form can default to false
  },
  activationCode: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  resetPasswordToken: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  theme: {
    type: DataTypes.STRING,
    defaultValue: 'light',
  },
});

// Salao model
const Salao = sequelize.define('Salao', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  }
});

// Solicitacao model
const Solicitacao = sequelize.define('Solicitacao', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  area: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tipo: {
    type: DataTypes.ENUM('Normal', 'Urgente', 'Emergencial'),
    allowNull: false,
  },
  planoContasCode: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  dataAplicacao: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  descResumida: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  justificativa: {
    type: DataTypes.TEXT,
  },
  prazo: {
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.ENUM('ABERTA', 'EM_COTACAO', 'AGUARDANDO_APROVACAO', 'APROVADA', 'FATURADA', 'PAGA', 'RECUSADA'),
    defaultValue: 'ABERTA',
  },
  valorEstimado: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },

  approvedById: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  salaoId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  }
});

// LancamentoFinanceiro model (para Balancetes, OPEX, CAPEX e Previsões)
const LancamentoFinanceiro = sequelize.define('LancamentoFinanceiro', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  dataReferencia: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  planoContasCode: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  tipo: {
    type: DataTypes.ENUM('RECEITA', 'DESPESA'),
    allowNull: false,
  },
  classificacao: {
    type: DataTypes.ENUM('OPEX', 'CAPEX', 'NA'), // NA for receitas
    defaultValue: 'NA',
  },
  valor: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  isPrevisao: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  descricao: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  registradoPorId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('PENDENTE', 'CONFIRMADO'),
    defaultValue: 'PENDENTE',
  },
  salaoId: {
    type: DataTypes.UUID,
    allowNull: true,
  }
});

// Item model
const Item = sequelize.define('Item', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  unidade: {
    type: DataTypes.STRING,
    defaultValue: 'UND',
  },
  quant: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  desc: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

// Fornecedor model
const Fornecedor = sequelize.define('Fornecedor', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  discount: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  condPagto: {
    type: DataTypes.STRING,
  },
  prazoEntrega: {
    type: DataTypes.STRING,
  },
  frete: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
});

// PrecoItem model
const PrecoItem = sequelize.define('PrecoItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  price: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  isWinner: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

// Anexo model
const Anexo = sequelize.define('Anexo', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  filePath: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fileType: {
    type: DataTypes.ENUM('ORCAMENTO_PREVIO', 'PRINT_ORCAMENTO', 'BOLETO', 'CHAVE_PIX', 'NOTA_FISCAL'),
    allowNull: false,
  },
  fornecedorName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

// Comentario model
const Comentario = sequelize.define('Comentario', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

// PlanoContas model
const PlanoContas = sequelize.define('PlanoContas', {
  code: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true,
  }
});

// Setting model (para SMTP e configurações globais dinâmicas)
const Setting = sequelize.define('Setting', {
  key: {
    type: DataTypes.STRING,
    primaryKey: true,
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true,
  }
});

// Relations
User.hasMany(Solicitacao, { as: 'solicitacoes', foreignKey: 'solicitanteId' });
Solicitacao.belongsTo(User, { as: 'solicitante', foreignKey: 'solicitanteId' });
Solicitacao.belongsTo(User, { as: 'aprovador', foreignKey: 'approvedById' });

Solicitacao.hasMany(Item, { as: 'items', foreignKey: 'solicitacaoId', onDelete: 'CASCADE' });
Item.belongsTo(Solicitacao, { foreignKey: 'solicitacaoId' });

Solicitacao.hasMany(Fornecedor, { as: 'vendors', foreignKey: 'solicitacaoId', onDelete: 'CASCADE' });
Fornecedor.belongsTo(Solicitacao, { foreignKey: 'solicitacaoId' });

Item.hasMany(PrecoItem, { as: 'prices', foreignKey: 'itemId', onDelete: 'CASCADE' });
PrecoItem.belongsTo(Item, { foreignKey: 'itemId' });

Fornecedor.hasMany(PrecoItem, { as: 'prices', foreignKey: 'fornecedorId', onDelete: 'CASCADE' });
PrecoItem.belongsTo(Fornecedor, { as: 'fornecedor', foreignKey: 'fornecedorId' });

Solicitacao.hasMany(Anexo, { as: 'anexos', foreignKey: 'solicitacaoId', onDelete: 'CASCADE' });
Anexo.belongsTo(Solicitacao, { foreignKey: 'solicitacaoId' });

User.hasMany(Anexo, { foreignKey: 'uploadedById' });
Anexo.belongsTo(User, { as: 'uploadedBy', foreignKey: 'uploadedById' });

Solicitacao.hasMany(Comentario, { as: 'comentarios', foreignKey: 'solicitacaoId', onDelete: 'CASCADE' });
Comentario.belongsTo(Solicitacao, { foreignKey: 'solicitacaoId' });
User.hasMany(Comentario, { foreignKey: 'userId' });
Comentario.belongsTo(User, { as: 'user', foreignKey: 'userId' });

// Associações do Salão
Salao.hasMany(Solicitacao, { as: 'solicitacoes', foreignKey: 'salaoId' });
Solicitacao.belongsTo(Salao, { as: 'salao', foreignKey: 'salaoId' });

Salao.hasMany(LancamentoFinanceiro, { as: 'lancamentos', foreignKey: 'salaoId' });
LancamentoFinanceiro.belongsTo(Salao, { as: 'salao', foreignKey: 'salaoId' });

// Um lançamento financeiro pode ter sido registrado por um usuário
User.hasMany(LancamentoFinanceiro, { as: 'lancamentosFinanceiros', foreignKey: 'registradoPorId' });
LancamentoFinanceiro.belongsTo(User, { as: 'registradoPor', foreignKey: 'registradoPorId' });

Solicitacao.belongsTo(PlanoContas, { as: 'planoContas', foreignKey: 'planoContasCode' });
PlanoContas.hasMany(Solicitacao, { as: 'solicitacoes', foreignKey: 'planoContasCode' });

LancamentoFinanceiro.belongsTo(PlanoContas, { as: 'planoContas', foreignKey: 'planoContasCode' });
PlanoContas.hasMany(LancamentoFinanceiro, { as: 'lancamentos', foreignKey: 'planoContasCode' });

module.exports = {
  sequelize,
  User,
  Solicitacao,
  Item,
  Fornecedor,
  PrecoItem,
  Anexo,
  PlanoContas,
  LancamentoFinanceiro,
  Comentario,
  Salao,
  Setting
};
