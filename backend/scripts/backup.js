const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const zlib = require('zlib');
require('dotenv').config();

// Define backup directories
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', '..', 'backups');
const RETENTION_DAYS = 30;

// Create backup directory if it does not exist
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const getTimestamp = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
};

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

const runPostgresBackup = (timestamp) => {
  const dbName = process.env.DB_NAME || 'hamoa_compras';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || 5432;
  const dbPass = process.env.DB_PASS || 'postgres';

  const sqlFilename = `backup_hamoa_${timestamp}.sql`;
  const sqlFilePath = path.join(BACKUP_DIR, sqlFilename);
  const gzFilePath = `${sqlFilePath}.gz`;

  console.log(`[BACKUP] Iniciando backup do PostgreSQL para: ${dbName}...`);

  // Setup PG password for pg_dump execution
  const env = { ...process.env, PGPASSWORD: dbPass };
  const command = `"${getPgDumpPath()}" -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -F p -f "${sqlFilePath}"`;

  exec(command, { env }, (error, stdout, stderr) => {
    if (error) {
      console.error(`[BACKUP ERROR] pg_dump falhou: ${error.message}`);
      return;
    }
    if (stderr && !fs.existsSync(sqlFilePath)) {
      console.warn(`[BACKUP WARNING] pg_dump stderr: ${stderr}`);
    }

    // Compress the dump file using gzip
    try {
      console.log(`[BACKUP] Compactando backup em ${gzFilePath}...`);
      const fileContents = fs.createReadStream(sqlFilePath);
      const writeStream = fs.createWriteStream(gzFilePath);
      const zip = zlib.createGzip();

      fileContents
        .pipe(zip)
        .pipe(writeStream)
        .on('finish', () => {
          console.log(`[BACKUP SUCCESS] Backup compactado com sucesso: ${gzFilePath}`);
          // Remove the uncompressed SQL file
          fs.unlinkSync(sqlFilePath);
          cleanOldBackups();
        });
    } catch (zipErr) {
      console.error(`[BACKUP ERROR] Falha ao compactar dump SQL: ${zipErr.message}`);
    }
  });
};

const runSqliteBackup = (timestamp) => {
  const sqlitePath = path.join(__dirname, '..', 'database.sqlite');
  const backupFilename = `backup_hamoa_${timestamp}.sqlite`;
  const backupFilePath = path.join(BACKUP_DIR, backupFilename);
  const gzFilePath = `${backupFilePath}.gz`;

  console.log(`[BACKUP] Iniciando backup do SQLite...`);

  if (!fs.existsSync(sqlitePath)) {
    console.error(`[BACKUP ERROR] Arquivo de banco SQLite não encontrado em: ${sqlitePath}`);
    return;
  }

  try {
    // Read SQLite and gzip it directly to destination
    const readStream = fs.createReadStream(sqlitePath);
    const writeStream = fs.createWriteStream(gzFilePath);
    const gzip = zlib.createGzip();

    readStream
      .pipe(gzip)
      .pipe(writeStream)
      .on('finish', () => {
        console.log(`[BACKUP SUCCESS] Backup compactado SQLite criado com sucesso: ${gzFilePath}`);
        cleanOldBackups();
      })
      .on('error', (err) => {
        console.error(`[BACKUP ERROR] Falha na gravação do backup do SQLite: ${err.message}`);
      });
  } catch (err) {
    console.error(`[BACKUP ERROR] Falha no fluxo do backup SQLite: ${err.message}`);
  }
};

const cleanOldBackups = () => {
  console.log(`[BACKUP] Verificando retenção de backups (limite: ${RETENTION_DAYS} dias)...`);
  fs.readdir(BACKUP_DIR, (err, files) => {
    if (err) {
      console.error(`[BACKUP ERROR] Erro ao ler diretório de backups: ${err.message}`);
      return;
    }

    const now = Date.now();
    const retentionMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;

    files.forEach((file) => {
      const filePath = path.join(BACKUP_DIR, file);
      fs.stat(filePath, (statErr, stats) => {
        if (statErr) {
          console.error(`[BACKUP ERROR] Erro ao obter dados do arquivo ${file}: ${statErr.message}`);
          return;
        }

        const ageMs = now - stats.mtimeMs;
        if (ageMs > retentionMs) {
          console.log(`[BACKUP CLEANUP] Excluindo backup antigo: ${file}`);
          fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) {
              console.error(`[BACKUP ERROR] Erro ao deletar ${file}: ${unlinkErr.message}`);
            }
          });
        }
      });
    });
  });
};

// Main execution switch
const timestamp = getTimestamp();
if (process.env.DB_DIALECT === 'postgres') {
  runPostgresBackup(timestamp);
} else {
  runSqliteBackup(timestamp);
}
