const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

let sequelize;

if (process.env.DB_DIALECT === 'postgres') {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'hamoa_compras',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASS || 'postgres',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: false,
      pool: {
        max: 20,
        min: 2,
        idle: 10000,
        acquire: 30000
      }
    }
  );
} else {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', '..', 'database.sqlite'),
    logging: false
  });

  // Optimize SQLite for concurrent multi-user environments (15+ machines)
  sequelize.query("PRAGMA journal_mode=WAL;").catch(err => console.error("Error setting WAL:", err));
  sequelize.query("PRAGMA synchronous=NORMAL;").catch(err => console.error("Error setting synchronous:", err));
  sequelize.query("PRAGMA busy_timeout=5000;").catch(err => console.error("Error setting busy_timeout:", err));
  sequelize.query("PRAGMA cache_size=-20000;").catch(err => console.error("Error setting cache_size:", err)); // 20MB cache
  sequelize.query("PRAGMA mmap_size=268435456;").catch(err => console.error("Error setting mmap_size:", err)); // 256MB mmap
  sequelize.query("PRAGMA temp_store=MEMORY;").catch(err => console.error("Error setting temp_store:", err));
}

module.exports = sequelize;

