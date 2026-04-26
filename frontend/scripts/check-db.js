const { query } = require('../shared/db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

async function check() {
  const res = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  console.log('Tables:', res.rows.map(r => r.table_name));
}

check();
