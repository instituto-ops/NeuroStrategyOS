-- Vórtex V7.5.2 — Migração Aditiva (PostgreSQL)
-- Destino: Neon/Supabase
-- Estratégia: CREATE IF NOT EXISTS + ALTER TABLE ADD COLUMN IF NOT EXISTS
-- NÃO destrói colunas existentes do schema V6.

-- ============================================================
-- TABELAS NOVAS (V7)
-- ============================================================

-- 1. Repositório de Prova Social (Social Proof)
CREATE TABLE IF NOT EXISTS abidos_social_proof (
    id SERIAL PRIMARY KEY,
    patient_name VARCHAR(255),
    demand_type VARCHAR(100),
    content TEXT NOT NULL,
    professional_response TEXT,
    source_date DATE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Índice de Assets (Cloudinary + Interno)
CREATE TABLE IF NOT EXISTS vortex_assets (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    filename TEXT,
    thumbnail_url TEXT,
    mime_type VARCHAR(50),
    category VARCHAR(100) DEFAULT 'general',
    metadata_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Metadados Abidos para Assets
CREATE TABLE IF NOT EXISTS neuro_asset_metadata (
    id SERIAL PRIMARY KEY,
    asset_id TEXT REFERENCES vortex_assets(id) ON DELETE CASCADE,
    alt_text TEXT,
    seo_role VARCHAR(100),
    is_approved_clinically BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABELAS EXISTENTES: criadas pelo V6 com schema parcial.
-- Mantemos as colunas originais e adicionamos as novas.
-- ============================================================

-- 4. vortex_drafts — colunas originais: id, title, path, page_type,
--    briefing_json, sections_json, seo_json, updated_at
CREATE TABLE IF NOT EXISTS vortex_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255),
    path TEXT,
    page_type VARCHAR(100),
    briefing_json JSONB,
    sections_json JSONB,
    seo_json JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Novas colunas V7 (aditivas)
ALTER TABLE vortex_drafts ADD COLUMN IF NOT EXISTS slug VARCHAR(255);
ALTER TABLE vortex_drafts ADD COLUMN IF NOT EXISTS generation_context_snapshot_json JSONB;
ALTER TABLE vortex_drafts ADD COLUMN IF NOT EXISTS abidos_review_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE vortex_drafts ADD COLUMN IF NOT EXISTS abidos_compliance_json JSONB;

-- 5. vortex_revisions — colunas originais: id, draft_id, title, path,
--    page_type, sections_json, seo_json, author_id, created_at
CREATE TABLE IF NOT EXISTS vortex_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    draft_id UUID,
    title VARCHAR(255),
    path TEXT,
    page_type VARCHAR(100),
    sections_json JSONB,
    seo_json JSONB,
    author_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Novas colunas V7 (aditivas)
ALTER TABLE vortex_revisions ADD COLUMN IF NOT EXISTS snapshot_json JSONB;
ALTER TABLE vortex_revisions ADD COLUMN IF NOT EXISTS abidos_review_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE vortex_revisions ADD COLUMN IF NOT EXISTS abidos_compliance_json JSONB;
ALTER TABLE vortex_revisions ADD COLUMN IF NOT EXISTS schema_version VARCHAR(20) DEFAULT '1.0';

-- 6. vortex_published_pages — colunas originais: path, draft_id, revision_id,
--    title, page_type, sections_json, seo_json, status, updated_at
CREATE TABLE IF NOT EXISTS vortex_published_pages (
    path TEXT UNIQUE NOT NULL,
    draft_id UUID,
    revision_id UUID,
    title VARCHAR(255),
    page_type VARCHAR(100),
    sections_json JSONB,
    seo_json JSONB,
    status VARCHAR(50) DEFAULT 'published',
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. vortex_publication_logs — colunas originais: id, path, revision_id,
--    author_id, status, created_at
CREATE TABLE IF NOT EXISTS vortex_publication_logs (
    id SERIAL PRIMARY KEY,
    path TEXT,
    revision_id UUID,
    author_id TEXT,
    status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
-- Nova coluna V7
ALTER TABLE vortex_publication_logs ADD COLUMN IF NOT EXISTS details TEXT;

-- ============================================================
-- AJUSTES PARA SCHEMA V7 REAL (tabelas criadas pelo primeiro migrate)
-- ============================================================

-- vortex_revisions: adicionar path (denormalizado) e title para query por caminho
ALTER TABLE vortex_revisions ADD COLUMN IF NOT EXISTS path TEXT;
ALTER TABLE vortex_revisions ADD COLUMN IF NOT EXISTS title VARCHAR(255);

-- neuro_asset_metadata: garantir existência
CREATE TABLE IF NOT EXISTS neuro_asset_metadata (
    id SERIAL PRIMARY KEY,
    asset_id TEXT REFERENCES vortex_assets(id) ON DELETE CASCADE,
    alt_text TEXT,
    seo_role VARCHAR(100),
    is_approved_clinically BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- vortex_publication_logs estava vazia; removemos e usamos vortex_publish_logs
DROP TABLE IF EXISTS vortex_publication_logs;

-- vortex_publish_logs: garantir existência (audit trail real)
CREATE TABLE IF NOT EXISTS vortex_publish_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    path TEXT,
    revision_id UUID,
    details TEXT,
    user_id TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_published_path ON vortex_published_pages(path);
CREATE INDEX IF NOT EXISTS idx_revision_page_id ON vortex_revisions(page_id);
CREATE INDEX IF NOT EXISTS idx_revision_path ON vortex_revisions(path);
CREATE INDEX IF NOT EXISTS idx_social_proof_demand ON abidos_social_proof(demand_type);
CREATE INDEX IF NOT EXISTS idx_drafts_updated ON vortex_drafts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_category ON vortex_assets(category);
