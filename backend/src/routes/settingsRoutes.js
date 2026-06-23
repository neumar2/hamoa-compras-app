const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const auth = require('../middlewares/auth');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { execSync } = require('child_process');
const { User, Salao, sequelize } = require('../database/models');

const upload = multer({ dest: path.join(__dirname, '..', '..', '..', 'backups', 'temp') });

const DB_PATH = path.join(__dirname, '..', '..', 'database.sqlite');
const BACKUPS_DIR = path.join(__dirname, '..', '..', '..', 'backups');
const LOGS_FILE = path.join(__dirname, '..', '..', 'audit_logs.json');

// Ensure backups directory exists
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// Ensure logs file exists
if (!fs.existsSync(LOGS_FILE)) {
  fs.writeFileSync(LOGS_FILE, JSON.stringify([], null, 2));
}

const getPgDumpPath = () => {
  if (process.platform === 'win32') {
    const pf = process.env.ProgramFiles || 'C:\\Program Files';
    const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const dirs = [pf, pf86];

    for (const baseDir of dirs) {
      const pgDir = path.join(baseDir, 'PostgreSQL');
      if (fs.existsSync(pgDir)) {
        try {
          const versions = fs.readdirSync(pgDir).sort((a, b) => parseFloat(b) - parseFloat(a));
          for (const ver of versions) {
            const binPath = path.join(pgDir, ver, 'bin', 'pg_dump.exe');
            if (fs.existsSync(binPath)) {
              return binPath;
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }
  return 'pg_dump';
};

const getPsqlPath = () => {
  if (process.platform === 'win32') {
    const pf = process.env.ProgramFiles || 'C:\\Program Files';
    const pf86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const dirs = [pf, pf86];

    for (const baseDir of dirs) {
      const pgDir = path.join(baseDir, 'PostgreSQL');
      if (fs.existsSync(pgDir)) {
        try {
          const versions = fs.readdirSync(pgDir).sort((a, b) => parseFloat(b) - parseFloat(a));
          for (const ver of versions) {
            const binPath = path.join(pgDir, ver, 'bin', 'psql.exe');
            if (fs.existsSync(binPath)) {
              return binPath;
            }
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }
  return 'psql';
};

// ─── Helper: Write Audit Log ───────────────────────────────────────────────
const writeLog = (user, action, details = '') => {
  try {
    const logs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf-8') || '[]');
    logs.unshift({
      id: Date.now(),
      timestamp: new Date().toISOString(),
      user: { id: user?.id, name: user?.name, role: user?.role },
      action,
      details
    });
    // Keep max 500 entries
    const trimmed = logs.slice(0, 500);
    fs.writeFileSync(LOGS_FILE, JSON.stringify(trimmed, null, 2));
  } catch (e) {
    console.error('Erro ao gravar log:', e.message);
  }
};

module.exports.writeLog = writeLog;

// ─── GET: List recent audit logs ──────────────────────────────────────────
router.get('/logs', auth, (req, res) => {
  try {
    if (!req.user.canAccessSettings && req.user.role !== 'TI' && req.user.role !== 'GESTAO') {
      return res.status(403).json({ error: 'Acesso negado.' });
    }
    const { limit = 100 } = req.query;
    const logs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf-8') || '[]');
    res.json(logs.slice(0, parseInt(limit)));
  } catch (e) {
    res.status(500).json({ error: 'Erro ao ler logs.' });
  }
});

// ─── GET: Download Database Backup ────────────────────────────────────────
router.get('/backup/download', auth, (req, res) => {
  try {
    if (!req.user.canAccessSettings && req.user.role !== 'TI') {
      return res.status(403).json({ error: 'Apenas Administradores TI podem baixar backups.' });
    }

    const dialect = process.env.DB_DIALECT || 'sqlite';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);

    if (dialect === 'postgres') {
      const sqlFileName = `hamoa_backup_${timestamp}.sql`;
      const sqlPath = path.join(BACKUPS_DIR, sqlFileName);
      const zipFileName = `hamoa_backup_${timestamp}.zip`;
      const zipPath = path.join(BACKUPS_DIR, zipFileName);
      
      const { exec } = require('child_process');
      const host = process.env.DB_HOST || 'localhost';
      const port = process.env.DB_PORT || '5432';
      const dbName = process.env.DB_NAME || 'hamoa_compras';
      const user = process.env.DB_USER || 'postgres';
      const pass = process.env.DB_PASS || 'hamoa123';

      // Execute pg_dump with password passed via env variable
      const cmd = `"${getPgDumpPath()}" -h ${host} -p ${port} -U ${user} -F p -b -v -f "${sqlPath}" ${dbName}`;

      exec(cmd, { env: { ...process.env, PGPASSWORD: pass } }, (error, stdout, stderr) => {
        if (error) {
          console.error('pg_dump error:', error);
          return res.status(500).json({ 
            error: 'Erro ao executar pg_dump. Verifique se as ferramentas do PostgreSQL estão no PATH do Windows.', 
            details: error.message 
          });
        }
        
        try {
          const AdmZip = require('adm-zip');
          const zip = new AdmZip();
          // Add the database dump to the root of the ZIP
          zip.addLocalFile(sqlPath);
          
          // Add the uploads folder as a subfolder 'uploads'
          const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
          if (fs.existsSync(uploadsDir)) {
            zip.addLocalFolder(uploadsDir, 'uploads');
          }
          
          // Write the ZIP file
          zip.writeZip(zipPath);
          
          // Clean up the temporary SQL dump
          fs.unlinkSync(sqlPath);

          writeLog(req.user, 'BACKUP_GERADO', `Arquivo ZIP (Banco + Anexos): ${zipFileName}`);
          
          res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
          res.setHeader('Content-Type', 'application/zip');
          res.sendFile(zipPath);
        } catch (err) {
          console.error('ZIP error:', err);
          return res.status(500).json({ error: 'Erro ao compactar arquivos de backup.', details: err.message });
        }
      });
    } else {
      if (!fs.existsSync(DB_PATH)) {
        return res.status(404).json({ error: 'Arquivo de banco de dados SQLite não encontrado.' });
      }
      const zipFileName = `hamoa_backup_${timestamp}.zip`;
      const zipPath = path.join(BACKUPS_DIR, zipFileName);
      const sqlFileName = `hamoa_backup_${timestamp}.sqlite`;
      
      try {
        const AdmZip = require('adm-zip');
        const zip = new AdmZip();
        // Add the SQLite DB as a file in the root
        zip.addLocalFile(DB_PATH, '', sqlFileName);
        
        // Add uploads
        const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
        if (fs.existsSync(uploadsDir)) {
          zip.addLocalFolder(uploadsDir, 'uploads');
        }
        
        zip.writeZip(zipPath);

        writeLog(req.user, 'BACKUP_GERADO', `Arquivo ZIP (SQLite + Anexos): ${zipFileName}`);

        res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
        res.setHeader('Content-Type', 'application/zip');
        res.sendFile(zipPath);
      } catch (err) {
        console.error('ZIP error:', err);
        return res.status(500).json({ error: 'Erro ao compactar arquivos de backup.', details: err.message });
      }
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao gerar backup.' });
  }
});

// ─── GET: List saved backups ──────────────────────────────────────────────
router.get('/backup/list', auth, (req, res) => {
  try {
    if (!req.user.canAccessSettings && req.user.role !== 'TI' && req.user.role !== 'GESTAO') {
      return res.status(403).json({ error: 'Acesso negado.' });
    }
    if (!fs.existsSync(BACKUPS_DIR)) return res.json([]);
    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.sqlite') || f.endsWith('.sql'))
      .map(f => {
        const stats = fs.statSync(path.join(BACKUPS_DIR, f));
        return { name: f, size: stats.size, createdAt: stats.birthtime };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(files);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao listar backups.' });
  }
});

// ─── POST: Import Database Backup ─────────────────────────────────────────
router.post('/backup/restore', auth, upload.single('backupFile'), async (req, res) => {
  try {
    if (req.user.role !== 'TI') {
      return res.status(403).json({ error: 'Apenas Administradores TI podem restaurar backups.' });
    }

    const { password, confirmationText } = req.body;
    
    if (confirmationText !== 'RESTAURAR-HAMOA') {
      return res.status(400).json({ error: 'Frase de segurança incorreta.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo de backup enviado.' });
    }

    // Valida a senha real do usuário
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Senha incorreta. Restauração bloqueada.' });
    }

    const dialect = process.env.DB_DIALECT || 'sqlite';
    if (dialect !== 'postgres') {
      return res.status(400).json({ error: 'A restauração via interface é suportada apenas para PostgreSQL no momento.' });
    }

    const filePath = req.file.path;
    const tempExtractDir = path.join(__dirname, '..', '..', '..', 'backups', 'temp', `extract_${Date.now()}`);

    let sqlFilePath = null;
    let hasUploads = false;

    // Descompacta o arquivo ZIP
    if (req.file.originalname.endsWith('.zip')) {
      const AdmZip = require('adm-zip');
      try {
        const zip = new AdmZip(filePath);
        zip.extractAllTo(tempExtractDir, true);

        // Procura pelo arquivo .sql ou .sqlite
        const files = fs.readdirSync(tempExtractDir);
        for (const file of files) {
          if (file.endsWith('.sql')) {
            sqlFilePath = path.join(tempExtractDir, file);
          } else if (file === 'uploads' && fs.statSync(path.join(tempExtractDir, file)).isDirectory()) {
            hasUploads = true;
          }
        }
      } catch (err) {
        return res.status(400).json({ error: 'Arquivo ZIP inválido ou corrompido.', details: err.message });
      }
    } else {
      // Suporte legado para upload direto de .sql (sem uploads)
      sqlFilePath = filePath;
    }

    if (!sqlFilePath) {
      // Limpa os arquivos caso falhe
      try { fs.unlinkSync(filePath); fs.rmSync(tempExtractDir, { recursive: true, force: true }); } catch(e){}
      return res.status(400).json({ error: 'Arquivo de banco de dados (.sql) não encontrado dentro do pacote.' });
    }

    // Dados de conexão
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'hamoa_compras';
    const dbUser = process.env.DB_USER || 'postgres';
    const pass = process.env.DB_PASS || 'hamoa123';
    
    // 1. Limpa o banco atual recriando o schema
    await sequelize.query('DROP SCHEMA public CASCADE;');
    await sequelize.query('CREATE SCHEMA public;');
    await sequelize.query('GRANT ALL ON SCHEMA public TO postgres;');
    await sequelize.query('GRANT ALL ON SCHEMA public TO public;');

    // 2. Executa o psql para injetar os dados
    const cmd = `"${getPsqlPath()}" -h ${host} -p ${port} -U ${dbUser} -d ${dbName} -f "${sqlFilePath}"`;
    execSync(cmd, { env: { ...process.env, PGPASSWORD: pass }, stdio: 'pipe' });

    // 3. Restaura os arquivos (Uploads)
    if (hasUploads) {
      const extractedUploadsDir = path.join(tempExtractDir, 'uploads');
      const targetUploadsDir = path.join(__dirname, '..', '..', 'uploads');
      
      // Cria a pasta de destino caso não exista
      if (!fs.existsSync(targetUploadsDir)) {
        fs.mkdirSync(targetUploadsDir, { recursive: true });
      }

      // Copia recursivamente do backup para a pasta oficial
      fs.cpSync(extractedUploadsDir, targetUploadsDir, { recursive: true, force: true });
    }

    // Limpa arquivos temporários
    try {
      fs.unlinkSync(filePath);
      if (fs.existsSync(tempExtractDir)) {
        fs.rmSync(tempExtractDir, { recursive: true, force: true });
      }
    } catch (e) {
      console.error('Erro ao limpar temporários:', e);
    }

    writeLog(req.user, 'RESTORE_BACKUP', `Restauração completa via interface. Arquivo: ${req.file.originalname}`);

    res.json({ message: 'Backup restaurado com sucesso! O sistema será recarregado.' });

  } catch (e) {
    console.error('Erro no restore:', e);
    writeLog(req.user, 'ERRO_RESTORE', `Falha ao restaurar banco: ${e.message}`);
    res.status(500).json({ error: 'Erro crítico ao restaurar backup.', details: e.message });
  }
});

// ==========================================
// SALÕES (CRUD)
// ==========================================

// GET /api/settings/saloes
router.get('/saloes', auth, async (req, res) => {
  try {
    const saloes = await Salao.findAll({ order: [['name', 'ASC']] });
    res.json(saloes);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar salões.' });
  }
});

// POST /api/settings/saloes
router.post('/saloes', auth, async (req, res) => {
  try {
    const { name, isActive } = req.body;
    if (!name) return res.status(400).json({ error: 'Nome do salão é obrigatório.' });

    const salao = await Salao.create({ name, isActive: isActive !== undefined ? isActive : true });
    writeLog(req.user, 'CREATE_SALAO', `Salão criado: ${name}`);
    res.status(201).json(salao);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Já existe um salão com este nome.' });
    }
    res.status(500).json({ error: 'Erro ao criar salão.' });
  }
});

// PUT /api/settings/saloes/:id
router.put('/saloes/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body;
    
    const salao = await Salao.findByPk(id);
    if (!salao) return res.status(404).json({ error: 'Salão não encontrado.' });

    if (name) salao.name = name;
    if (isActive !== undefined) salao.isActive = isActive;

    await salao.save();
    writeLog(req.user, 'EDIT_SALAO', `Salão atualizado: ${salao.name}`);
    res.json(salao);
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'Já existe um salão com este nome.' });
    }
    res.status(500).json({ error: 'Erro ao atualizar salão.' });
  }
});

// DELETE /api/settings/saloes/:id
router.delete('/saloes/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const salao = await Salao.findByPk(id);
    if (!salao) return res.status(404).json({ error: 'Salão não encontrado.' });

    // TODO: Verify if it's in use before hard delete or use soft delete (isActive = false)
    salao.isActive = false;
    await salao.save();

    writeLog(req.user, 'DELETE_SALAO', `Salão desativado (soft delete): ${salao.name}`);
    res.json({ message: 'Salão desativado com sucesso.', salao });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover salão.' });
  }
});

// ==========================================
// CONFIGURAÇÕES SMTP
// ==========================================

const { Setting } = require('../database/models');
const { testSmtpConnection, getSmtpConfig } = require('../utils/mailer');

// GET /api/settings/smtp
router.get('/smtp', auth, async (req, res) => {
  try {
    const keys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_SECURE', 'SMTP_FROM_NAME'];
    const settings = await Setting.findAll({ where: { key: keys } });
    
    let config = {
      host: '', port: '587', user: '', pass: '', secure: 'false', fromName: ''
    };
    
    settings.forEach(s => {
      if (s.key === 'SMTP_HOST') config.host = s.value;
      if (s.key === 'SMTP_PORT') config.port = s.value;
      if (s.key === 'SMTP_USER') config.user = s.value;
      if (s.key === 'SMTP_PASS') config.pass = s.value;
      if (s.key === 'SMTP_SECURE') config.secure = s.value;
      if (s.key === 'SMTP_FROM_NAME') config.fromName = s.value;
    });

    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar configurações SMTP', details: error.message });
  }
});

// POST /api/settings/smtp
router.post('/smtp', auth, async (req, res) => {
  try {
    const { host, port, user, pass, secure, fromName } = req.body;
    
    const saveSetting = async (k, v) => {
      const s = await Setting.findOne({ where: { key: k } });
      if (s) {
        s.value = v;
        await s.save();
      } else {
        await Setting.create({ key: k, value: v });
      }
    };

    await saveSetting('SMTP_HOST', host || '');
    await saveSetting('SMTP_PORT', port?.toString() || '587');
    await saveSetting('SMTP_USER', user || '');
    if (pass !== undefined) {
      // Only update password if it's provided (not masked)
      await saveSetting('SMTP_PASS', pass || '');
    }
    await saveSetting('SMTP_SECURE', secure?.toString() || 'false');
    await saveSetting('SMTP_FROM_NAME', fromName || '');

    writeLog(req.user, 'UPDATE_SMTP', 'Atualizou as configurações de Servidor de E-mail');
    res.json({ message: 'Configurações de SMTP salvas com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar configurações SMTP', details: error.message });
  }
});

// POST /api/settings/smtp/test
router.post('/smtp/test', auth, async (req, res) => {
  try {
    // Merge provided config with db config (to get the real password if it was masked in the UI)
    const { host, port, user, pass, secure, fromName } = req.body;
    let actualPass = pass;
    
    if (!pass || pass.includes('***')) {
      const passSetting = await Setting.findOne({ where: { key: 'SMTP_PASS' } });
      actualPass = passSetting ? passSetting.value : '';
    }

    const testConfig = {
      host,
      port: parseInt(port || '587'),
      secure: secure === 'true' || secure === true,
      user,
      pass: actualPass,
      fromName
    };

    await testSmtpConnection(testConfig);
    
    writeLog(req.user, 'TEST_SMTP', 'Testou conexão SMTP com sucesso');
    res.json({ message: 'Conexão estabelecida com sucesso. Um e-mail de teste foi enviado.' });
  } catch (error) {
    writeLog(req.user, 'TEST_SMTP_ERROR', `Falha ao testar SMTP: ${error.message}`);
    res.status(400).json({ error: 'Falha na conexão SMTP', details: error.message });
  }
});

module.exports = router;
