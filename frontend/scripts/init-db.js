/**
 * frontend/scripts/init-db.js
 * 
 * Script de inicialização do schema do banco de dados PostgreSQL para o Vórtex.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { query } = require('../shared/db');

async function initDb() {
  console.log('🌀 [DB] Inicializando tabelas do Vórtex...');
  
  try {
    // Extensão para UUID se não existir
    await query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // Limpeza (Opcional, mas útil para testes de regressão)
    if (process.env.RESET_DB === 'true') {
        console.log('⚠️ [DB] Resetando tabelas...');
        await query(`DROP TABLE IF EXISTS vortex_audit_log CASCADE;`);
        await query(`DROP TABLE IF EXISTS vortex_revisions CASCADE;`);
        await query(`DROP TABLE IF EXISTS vortex_pages CASCADE;`);
        await query(`DROP TABLE IF EXISTS vortex_assets CASCADE;`);
    }

    // Tabela de Assets
    await query(`
      CREATE TABLE IF NOT EXISTS vortex_assets (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        filename TEXT,
        mime_type TEXT,
        category TEXT DEFAULT 'general',
        metadata_json JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Tabela de Páginas (Estado Atual)
    await query(`
      CREATE TABLE IF NOT EXISTS vortex_pages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        filename TEXT UNIQUE NOT NULL,
        content TEXT NOT NULL,
        status TEXT DEFAULT 'published',
        current_revision_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Tabela de Revisões
    await query(`
      CREATE TABLE IF NOT EXISTS vortex_revisions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        page_id UUID REFERENCES vortex_pages(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        author TEXT,
        commit_sha TEXT,
        change_summary TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Tabela de Logs de Auditoria
    await query(`
      CREATE TABLE IF NOT EXISTS vortex_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        author TEXT,
        details JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    console.log('✅ [DB] Tabelas inicializadas com sucesso.');
  } catch (error) {
    console.error('❌ [DB] Erro ao inicializar tabelas:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  initDb();
}

module.exports = initDb;
