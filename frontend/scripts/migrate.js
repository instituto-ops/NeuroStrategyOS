const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env' });

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('🌀 [MIGRATE] Conectado ao Neon DB.');

    const sqlPath = path.join(__dirname, '..', '..', 'docs', '04_Arquivos_de_Referência', 'sql', 'vortex_v7_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🌀 [MIGRATE] Executando schema V7...');
    await client.query(sql);
    console.log('✅ [MIGRATE] Schema aplicado com sucesso.');

  } catch (err) {
    console.error('❌ [MIGRATE] Erro:', err.message);
  } finally {
    await client.end();
  }
}

migrate();
