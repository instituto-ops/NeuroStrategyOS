const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Necessário para Neon/Supabase em ambientes locais
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
