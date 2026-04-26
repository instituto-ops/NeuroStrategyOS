const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const cloudinary = require('cloudinary').v2;
const { query } = require('../shared/db');


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function syncCloudinary() {
  console.log('🌀 [SYNC] Iniciando sincronização Cloudinary -> Postgres...');
  
  try {
    // 1. Buscar recursos do Cloudinary
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: '', // Buscar todos
      max_results: 500
    });

    console.log(`🌀 [SYNC] Encontrados ${result.resources.length} recursos.`);

    for (const resource of result.resources) {
      const { public_id, secure_url, format, resource_type, width, height, created_at, folder } = resource;
      
      // 2. Upsert no Postgres
      await query(`
        INSERT INTO vortex_assets (id, url, filename, mime_type, category, metadata_json)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          url = EXCLUDED.url,
          filename = EXCLUDED.filename,
          metadata_json = EXCLUDED.metadata_json,
          updated_at = NOW()
      `, [
        public_id, 
        secure_url, 
        public_id.split('/').pop(), 
        `${resource_type}/${format}`,
        folder || 'general',
        JSON.stringify({ width, height, created_at })
      ]);
    }

    console.log('✅ [SYNC] Sincronização concluída com sucesso.');
  } catch (error) {
    console.error('❌ [SYNC] Erro na sincronização:', error);
  }
}

if (require.main === module) {
  syncCloudinary();
}

module.exports = syncCloudinary;
