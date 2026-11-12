import { env } from './config/env.js';
import app from './app.js';
import { pool } from './config/database.js';
import { runMigrations } from './database/migrate.js';

const startServer = async () => {
  try {
    const client = await pool.connect();
    await runMigrations(client);
    console.log('✅ Conectado ao banco de dados PostgreSQL e schema de segurança verificado.');
    client.release();

    app.listen(env.PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${env.PORT} [${env.NODE_ENV}]`);
    });
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error.message);
    process.exit(1);
  }
};

startServer();