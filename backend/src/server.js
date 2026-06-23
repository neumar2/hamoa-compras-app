const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
const { sequelize } = require('./database/models');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// ── GZIP compression for all responses (huge win for JSON payloads)
app.use(compression());

const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173', 'http://127.0.0.1:5173'];
app.use(cors({
  origin: function(origin, callback) {
    // Permite requests sem origin (ex: mobile apps, curl) ou se a origem estiver permitida
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));

// Increase JSON body limit for large equalization payloads
app.use(express.json({ limit: '5mb' }));

// Arquivos (Uploads) agora são protegidos por rotas autenticadas em /api/downloads
const downloadRoutes = require('./routes/downloadRoutes');
app.use('/api/downloads', downloadRoutes);

// Serve compiled React frontend files
const frontendBuildPath = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendBuildPath));

// Routes
const authRoutes = require('./routes/authRoutes');
const solicitacaoRoutes = require('./routes/solicitacaoRoutes');
const userRoutes = require('./routes/userRoutes');
const financeiroRoutes = require('./routes/financeiroRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/solicitacoes', solicitacaoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/financeiro', financeiroRoutes);
app.use('/api/settings', settingsRoutes);

app.get('/api/health', (req, res) => res.send('Hamoa Compras API is Running'));

// Redirect all non-API paths to React SPA index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error]', err.stack || err);
  res.status(err.status || 500).json({ error: err.message || 'Erro interno no servidor' });
});

sequelize.authenticate()
  .then(async () => {
    console.log('Banco de dados conectado...');
    await sequelize.sync();

    // ── Add database indexes on first boot (idempotent)
    try {
      const qi = sequelize.getQueryInterface();
      // Solicitacaos indexes
      await qi.addIndex('Solicitacaos', ['dataAplicacao'], { name: 'idx_sol_dataAplicacao' }).catch(() => {});
      await qi.addIndex('Solicitacaos', ['status'],        { name: 'idx_sol_status' }).catch(() => {});
      await qi.addIndex('Solicitacaos', ['tipo'],          { name: 'idx_sol_tipo' }).catch(() => {});
      await qi.addIndex('Solicitacaos', ['solicitanteId'], { name: 'idx_sol_solicitanteId' }).catch(() => {});
      await qi.addIndex('Solicitacaos', ['conta'],         { name: 'idx_sol_conta' }).catch(() => {});
      // Items indexes (critical for subquery performance)
      await qi.addIndex('Items', ['solicitacaoId'], { name: 'idx_items_solicitacaoId' }).catch(() => {});
      // PrecoItems indexes
      await qi.addIndex('PrecoItems', ['itemId'], { name: 'idx_precoitems_itemId' }).catch(() => {});
      await qi.addIndex('PrecoItems', ['fornecedorId'], { name: 'idx_precoitems_fornecedorId' }).catch(() => {});
      await qi.addIndex('PrecoItems', ['isWinner'], { name: 'idx_precoitems_isWinner' }).catch(() => {});
      // Anexos indexes
      await qi.addIndex('Anexos', ['solicitacaoId'], { name: 'idx_anexos_solicitacaoId' }).catch(() => {});
      await qi.addIndex('Anexos', ['fileType'], { name: 'idx_anexos_fileType' }).catch(() => {});
      // Fornecedors indexes
      await qi.addIndex('Fornecedors', ['solicitacaoId'], { name: 'idx_fornecedors_solicitacaoId' }).catch(() => {});
      console.log('Índices de banco verificados/criados.');
    } catch (e) {
      console.warn('Aviso ao criar índices:', e.message);
    }

    app.listen(PORT, '0.0.0.0', () => console.log(`Servidor rodando na porta ${PORT}`));
  })
  .catch(err => console.error('Erro de conexão com o banco:', err));
