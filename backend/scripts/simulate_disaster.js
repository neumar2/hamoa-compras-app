const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { Sequelize } = require('sequelize');
require('dotenv').config();

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

async function simulateDisaster() {
  console.log('[DR] Iniciando Simulação de Desastre...');
  
  const dbName = process.env.DB_NAME || 'hamoa_compras';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || 5432;
  const dbPass = process.env.DB_PASS || 'hamoa123';

  console.log(`[DR] Conectando ao banco ${dbName}...`);
  const sequelize = new Sequelize(dbName, dbUser, dbPass, {
    host: dbHost,
    port: dbPort,
    dialect: 'postgres',
    logging: false
  });

  try {
    // Drop all data to simulate a disaster
    console.log('[DR] APAGANDO TODOS OS DADOS (Simulação de Desastre)...');
    await sequelize.query('DROP SCHEMA public CASCADE;');
    await sequelize.query('CREATE SCHEMA public;');
    await sequelize.query('GRANT ALL ON SCHEMA public TO postgres;');
    await sequelize.query('GRANT ALL ON SCHEMA public TO public;');
    console.log('[DR] Banco de dados limpo com sucesso.');

  } catch (err) {
    console.error('[DR] Erro ao limpar o banco:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }

  // Restore DB
  const backupFile = process.argv[2];
  if (!backupFile) {
    console.error('[DR] Forneça o caminho do arquivo de backup como argumento.');
    process.exit(1);
  }

  if (!fs.existsSync(backupFile)) {
    console.error('[DR] Arquivo de backup não encontrado:', backupFile);
    process.exit(1);
  }

  console.log(`[DR] Restaurando backup a partir de: ${backupFile}`);
  const psqlPath = getPsqlPath();
  const env = { ...process.env, PGPASSWORD: dbPass };
  
  const command = `"${psqlPath}" -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -f "${backupFile}"`;
  
  try {
    console.log(`[DR] Executando comando de restauração...`);
    execSync(command, { env, stdio: 'inherit' });
    console.log('[DR] Restauração concluída com sucesso!');
  } catch (err) {
    console.error('[DR] Erro durante a restauração do psql:', err.message);
  }
}

simulateDisaster();
